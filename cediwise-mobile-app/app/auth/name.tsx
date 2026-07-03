import { AppTextField } from '@/components/AppTextField';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { ANALYTICS_EVENTS } from '@/constants/analyticsEvents';
import { authTokens } from '@/constants/authTokens';
import { useAuth } from '@/hooks/useAuth';
import { getPostHogOptional } from '@/utils/analytics/posthogClientRef';
import { getStoredAuthData, updateUserProfileName } from '@/utils/auth';
import { onLoginSuccess } from '@/utils/authRouting';
import { recordNamePromptDismissed } from '@/utils/namePrompt';
import { reportError } from '@/utils/telemetry';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AuthNameScreen() {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [skipLoading, setSkipLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const promptTrackedRef = useRef(false);
  const { refreshAuth } = useAuth();

  useEffect(() => {
    getStoredAuthData()
      .then(async (auth) => {
        if (auth?.user?.name?.trim() && auth?.user?.id) {
          await refreshAuth();
          await onLoginSuccess(auth.user.id);
          return;
        }
        if (auth?.user?.id) {
          setUserId(auth.user.id);
          if (!promptTrackedRef.current) {
            promptTrackedRef.current = true;
            getPostHogOptional()?.capture(ANALYTICS_EVENTS.namePromptShown, {
              source: 'auth_name_screen',
            });
          }
        }
      })
      .catch((e) => {
        reportError(e, {
          feature: 'auth',
          operation: 'name_prefill_load',
          screen: '/auth/name',
        });
      })
      .finally(() => setCheckingAuth(false));
  }, [refreshAuth]);

  const onSubmit = async () => {
    setError(undefined);
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    setLoading(true);
    const result = await updateUserProfileName(name);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    const stored = result.stored;
    if (!stored?.user?.id) {
      setError("We couldn't save your sign-in on this device. Tap to try again.");
      return;
    }
    getPostHogOptional()?.capture(ANALYTICS_EVENTS.namePromptCompleted, {
      source: 'auth_name_screen',
    });
    getPostHogOptional()?.capture(ANALYTICS_EVENTS.nameSaved, {
      source: 'auth_name_screen',
    });
    await refreshAuth();
    await onLoginSuccess(stored.user.id);
  };

  const onSkip = async () => {
    if (!userId || skipLoading || loading) return;
    setSkipLoading(true);
    try {
      await recordNamePromptDismissed(userId);
      getPostHogOptional()?.capture(ANALYTICS_EVENTS.namePromptSkipped, {
        source: 'auth_name_screen',
      });
      await refreshAuth();
      await onLoginSuccess(userId);
    } catch (e) {
      reportError(e, {
        feature: 'auth',
        operation: 'name_prompt_skip',
        screen: '/auth/name',
      });
      setError("Something went wrong. Tap 'Skip for now' to try again.");
    } finally {
      setSkipLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: authTokens.background }} className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color={authTokens.spinner} />
        <Text style={{ color: authTokens.textMuted, marginTop: 12, fontFamily: 'Figtree-Regular', fontSize: 15 }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: 'black' }}
      className="flex-1 bg-background"
    >
      <KeyboardAvoidingView
        behavior="padding"
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 80}
      >
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingTop: 16 }}
          scrollEnabled
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <Card className="space-y-4 gap-4">
            <View>
              <Text className="text-white text-2xl font-bold mb-1">
                What should we call you?
              </Text>
              <Text className="text-muted-foreground mb-4 text-sm">
                We&apos;ll use this to personalize your experience.
              </Text>
            </View>

            <AppTextField
              label="Full name"
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              error={error}
              onSubmitEditing={onSubmit}
            />

            <PrimaryButton loading={loading} onPress={onSubmit} disabled={skipLoading}>
              Continue
            </PrimaryButton>

            <SecondaryButton
              onPress={onSkip}
              disabled={loading || skipLoading || !userId}
              accessibilityLabel="Skip for now"
            >
              {skipLoading ? 'Skipping…' : 'Skip for now'}
            </SecondaryButton>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
