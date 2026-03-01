import { AppTextField } from '@/components/AppTextField';
import { BackButton } from '@/components/BackButton';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { authTokens } from '@/constants/authTokens';
import { useAuth } from '@/hooks/useAuth';
import { getStoredAuthData, updateUserProfileName } from '@/utils/auth';
import { onLoginSuccess } from '@/utils/authRouting';
import { useEffect, useState } from 'react';
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
  const [checkingAuth, setCheckingAuth] = useState(true);
  const { refreshAuth } = useAuth();

  useEffect(() => {
    getStoredAuthData()
      .then(async (auth) => {
        if (auth?.user?.name?.trim() && auth?.user?.id) {
          await refreshAuth();
          await onLoginSuccess(auth.user.id);
        }
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
    await refreshAuth();
    await onLoginSuccess(stored.user.id);
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
        <View className="mb-4">
          <BackButton />
        </View>
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          scrollEnabled
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <Card className="space-y-4 gap-4">
            <View>
              <Text className="text-white text-2xl font-bold mb-1">
                What&apos;s your name?
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
            />

            <PrimaryButton loading={loading} onPress={onSubmit}>
              Continue
            </PrimaryButton>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
