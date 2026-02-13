import { AppTextField } from '@/components/AppTextField';
import { BackButton } from '@/components/BackButton';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import {
  getStoredAuthData,
  updateUserProfileName,
} from '@/utils/auth';
import { getPostAuthRoute } from '@/utils/profileVitals';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
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

  useEffect(() => {
    getStoredAuthData().then(async (auth) => {
      if (auth?.user?.name?.trim() && auth?.user?.id) {
        const route = await getPostAuthRoute(auth.user.id);
        router.replace(route);
      }
    });
  }, []);

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
    const auth = await getStoredAuthData();
    const route =
      auth?.user?.id ? await getPostAuthRoute(auth.user.id) : '/(tabs)';
    router.replace(route);
  };

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
