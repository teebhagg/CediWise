import { BackButton } from '@/components/BackButton';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { getStoredAuthData, requestOtp, verifyOtp } from '@/utils/auth';
import { getPostAuthRoute } from '@/utils/profileVitals';
import { router, useLocalSearchParams } from 'expo-router';
import { InputOTP, REGEXP_ONLY_DIGITS } from 'heroui-native';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const RESEND_COOLDOWN_SEC = 60;

export default function OtpScreen() {
  const params = useLocalSearchParams<{ phone?: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN_SEC);

  useEffect(() => {
    if (countdown <= 0) return;
    const id = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [countdown]);

  const onVerify = async () => {
    setError(undefined);
    if (!params.phone) {
      setError('Missing phone number');
      return;
    }
    if (code.length < 6) {
      setError('Enter all 6 digits');
      return;
    }
    setLoading(true);
    const result = await verifyOtp(params.phone, code);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    const auth = await getStoredAuthData();
    const hasName = auth?.user?.name?.trim();
    if (!hasName) {
      router.replace('/auth/name');
      return;
    }
    const route = auth?.user?.id ? await getPostAuthRoute(auth.user.id) : '/(tabs)';
    router.replace(route);
  };

  const onResend = async () => {
    if (!params.phone || countdown > 0 || resendLoading) return;
    setError(undefined);
    setResendLoading(true);
    const result = await requestOtp(params.phone);
    setResendLoading(false);
    if (result.success) {
      setCountdown(RESEND_COOLDOWN_SEC);
      setCode('');
    } else {
      setError(result.error);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }} className="flex-1 bg-background">
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

          <Card className="space-y-4">
            <Text className="text-white text-2xl font-bold mb-1">Enter your code</Text>
            <Text className="text-muted-foreground mb-4 text-sm">
              We sent a one-time code to {params.phone ?? 'your phone'}.
            </Text>

            <InputOTP
              maxLength={6}
              value={code}
              onChange={setCode}
              isInvalid={!!error}
              pattern={REGEXP_ONLY_DIGITS}
              inputMode="numeric"
              variant="secondary"
              placeholderTextColor="rgba(148, 163, 184, 0.5)"
              placeholderTextClassName="text-slate-400"
              className="mb-3 py-5"
            >
              <InputOTP.Group className="flex-row justify-center">
                <InputOTP.Slot index={0} className="w-11 h-14 rounded-[20px]" />
                <InputOTP.Slot index={1} className="w-11 h-14 rounded-[20px]" />
                <InputOTP.Slot index={2} className="w-11 h-14 rounded-[20px]" />
                <InputOTP.Separator className="h-1 w-2 rounded-full bg-slate-500/50 self-center" />
                <InputOTP.Slot index={3} className="w-11 h-14 rounded-[20px]" />
                <InputOTP.Slot index={4} className="w-11 h-14 rounded-[20px]" />
                <InputOTP.Slot index={5} className="w-11 h-14 rounded-[20px]" />
              </InputOTP.Group>
            </InputOTP>

            {error ? (
              <Text className="text-red-400 text-xs mb-2">{error}</Text>
            ) : null}

            <PrimaryButton loading={loading} onPress={onVerify}>
              Verify code
            </PrimaryButton>

            <View className="pt-5 items-center">
              {countdown > 0 ? (
                <Text className="text-slate-400 text-sm">
                  Resend code in <Text className="text-emerald-500 font-semibold">{countdown}s</Text>
                </Text>
              ) : (
                <Pressable
                  onPress={onResend}
                  disabled={resendLoading}
                  style={({ pressed }) => ({ opacity: pressed || resendLoading ? 0.7 : 1 })}
                >
                  <Text className="text-emerald-500 text-sm font-medium">
                    {resendLoading ? 'Sending…' : 'Resend code'}
                  </Text>
                </Pressable>
              )}
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


