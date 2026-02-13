import {
  extractUserData,
  getStoredAuthData,
  handleOAuthCallbackFromUrl,
  storeAuthData,
} from '@/utils/auth';
import { log } from '@/utils/logger';
import { getPostAuthRoute } from '@/utils/profileVitals';
import { supabase } from '@/utils/supabase';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * OAuth callback handler for Google sign-in
 * Handles redirect after user authenticates with Google.
 * On Android, the deep link often opens the app before WebBrowser.openAuthSessionAsync
 * returns, so we must parse tokens from the URL here.
 */
export default function AuthCallback() {
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    let sub: { remove: () => void } | undefined;

    const processUrl = async (url: string | null) => {
      if (!url || !(url.includes('access_token=') || url.includes('#')))
        return false;
      const result = await handleOAuthCallbackFromUrl(url);
      if (result.success) {
        const auth = await getStoredAuthData();
        const route = auth?.user?.id ? await getPostAuthRoute(auth.user.id) : '/(tabs)';
        setTimeout(() => router.replace(route), 300);
        return true;
      }
      return false;
    };

    const handleCallback = async () => {
      if (handled.current) return;
      handled.current = true;

      try {
        // 1. URL that opened the app (cold start from deep link - common on Android)
        const initialUrl = await Linking.getInitialURL();
        if (await processUrl(initialUrl)) return;

        // 2. Listen for URL when app is brought back from browser (Android resume)
        sub = Linking.addEventListener('url', async ({ url }) => {
          if (handled.current) return;
          await processUrl(url);
        });

        // 3. Fallback: session may already be set (e.g. iOS where WebBrowser returns first)
        if (!supabase) {
          router.replace('/auth');
          return;
        }
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) {
          log.error('OAuth callback error:', error);
          router.replace('/auth');
          return;
        }

        if (data.session && data.session.user) {
          const userData = extractUserData(data.session.user);
          const expiresIn = data.session.expires_in || 3600;
          const expiresAt =
            typeof (data.session as any).expires_at === 'number'
              ? (data.session as any).expires_at * 1000
              : Date.now() + expiresIn * 1000;
          const authData = {
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token || '',
            expiresIn,
            expiresAt,
            user: userData,
          };

          await storeAuthData(authData);
          const route = await getPostAuthRoute(userData.id);
          setTimeout(() => router.replace(route), 300);
        } else {
          router.replace('/auth');
        }
      } catch (e) {
        log.error('Error handling OAuth callback:', e);
        router.replace('/auth');
      }
    };

    handleCallback();
    return () => sub?.remove?.();
  }, [router]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }} className="flex-1 bg-background justify-center items-center">
      <ActivityIndicator size="large" color="#E5E7EB" />
      <Text style={{ color: '#9CA3AF', marginTop: 12, fontFamily: 'Figtree-Regular' }}>
        Completing sign-in...
      </Text>
    </SafeAreaView>
  );
}

