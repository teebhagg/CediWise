import { authTokens } from '@/constants/authTokens';
import { useAuth } from '@/hooks/useAuth';
import {
  extractUserData,
  handleOAuthCallbackFromUrl,
  persistAuthAndVerify,
} from '@/utils/auth';
import { onLoginSuccess } from '@/utils/authRouting';
import { log } from '@/utils/logger';
import { supabase } from '@/utils/supabase';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MAX_RETRIES = 2;

/**
 * OAuth callback handler for Google sign-in.
 * On Android, the deep link often opens the app before WebBrowser returns, so we parse tokens here.
 */
export default function AuthCallback() {
  const router = useRouter();
  const handled = useRef(false);
  const { refreshAuth } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const linkingSubRef = useRef<{ remove: () => void } | undefined>();

  const finishWithStored = useCallback(
    async (stored: { user: { id: string } } | null) => {
      if (!stored?.user?.id) {
        log.error('OAuth: auth not persisted to storage');
        setError("We couldn't save your sign-in on this device.");
        return false;
      }
      await refreshAuth();
      await onLoginSuccess(stored.user.id);
      return true;
    },
    [refreshAuth],
  );

  const processUrl = useCallback(
    async (url: string | null) => {
      if (!url || !(url.includes('access_token=') || url.includes('#')))
        return false;
      const result = await handleOAuthCallbackFromUrl(url);
      if (result.success && result.stored) {
        return finishWithStored(result.stored);
      }
      return false;
    },
    [finishWithStored],
  );

  const runCallback = useCallback(async () => {
    if (handled.current) return;
    handled.current = true;
    setError(null);

    let sub: { remove: () => void } | undefined;

    try {
      const initialUrl = await Linking.getInitialURL();
      if (await processUrl(initialUrl)) return;

      linkingSubRef.current = Linking.addEventListener('url', async ({ url }) => {
        if (handled.current) return;
        await processUrl(url);
      });
      sub = linkingSubRef.current;

      if (!supabase) {
        router.replace('/auth');
        return;
      }

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !data.session?.user) {
          if (attempt === MAX_RETRIES) {
            log.error('OAuth callback error:', sessionError);
            setError("Sign-in didn't complete.");
            handled.current = false;
            return;
          }
          await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
          continue;
        }

        const userData = extractUserData(data.session.user);
        const expiresIn = data.session.expires_in ?? 3600;
        const expiresAt =
          typeof (data.session as { expires_at?: number }).expires_at === 'number'
            ? (data.session as { expires_at: number }).expires_at * 1000
            : Date.now() + expiresIn * 1000;
        const authData = {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token ?? '',
          expiresIn,
          expiresAt,
          user: userData,
        };

        const stored = await persistAuthAndVerify(authData);
        if (await finishWithStored(stored)) return;

        if (attempt === MAX_RETRIES) {
          setError("We couldn't save your sign-in on this device.");
          handled.current = false;
          return;
        }
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    } catch (e) {
      log.error('Error handling OAuth callback:', e);
      setError("Sign-in didn't complete.");
      handled.current = false;
    } finally {
      sub?.remove?.();
    }
  }, [processUrl, finishWithStored]);

  const onRetry = useCallback(() => {
    setRetrying(true);
    handled.current = false;
    runCallback().finally(() => setRetrying(false));
  }, [runCallback]);

  useEffect(() => {
    runCallback();
    return () => linkingSubRef.current?.remove?.();
  }, [runCallback]);

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: authTokens.background }} className="flex-1 bg-background justify-center items-center px-6">
        <Text style={{ color: authTokens.textError, fontFamily: 'Figtree-Regular', fontSize: 15, textAlign: 'center' }}>
          {error}
        </Text>
        <Pressable
          onPress={onRetry}
          disabled={retrying}
          style={{ marginTop: 20, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: authTokens.buttonPrimary, borderRadius: 24 }}
        >
          <Text style={{ color: authTokens.buttonPrimaryText, fontFamily: 'Figtree-SemiBold', fontSize: 15 }}>
            {retrying ? 'Retrying…' : 'Try again'}
          </Text>
        </Pressable>
        <Pressable onPress={() => router.replace('/auth')} style={{ marginTop: 12 }}>
          <Text style={{ color: authTokens.borderMuted, fontFamily: 'Figtree-Medium', fontSize: 14 }}>Back to sign in</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: authTokens.background }} className="flex-1 bg-background justify-center items-center">
      <ActivityIndicator size="large" color={authTokens.spinner} />
      <Text style={{ color: authTokens.textMuted, marginTop: 12, fontFamily: 'Figtree-Regular' }}>
        Completing sign-in...
      </Text>
    </SafeAreaView>
  );
}

