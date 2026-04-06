import { Card } from '@/components/Card';
import PhonenNumberInput from '@/components/common/PhonenNumberInput';
import { Apple } from '@/components/icons/AppleIcon';
import { Google } from '@/components/icons/GoogleIcon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAppToast } from '@/hooks/useAppToast';
import { useAuth } from '@/hooks/useAuth';
import {
    getStoredAuthData,
    isAppleSignInEnvironmentSupported,
    requestOtp,
    signInWithApple,
    signInWithGoogle,
} from '@/utils/auth';
import { onLoginSuccess } from '@/utils/authRouting';
import { log } from '@/utils/logger';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StatusBar, Text, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
export default function AuthLandingScreen() {
    const appleSignInSupported = isAppleSignInEnvironmentSupported();
    const [phone, setPhone] = useState('');
    const [error, setError] = useState<string | undefined>();
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [appleLoading, setAppleLoading] = useState(false);
    const { showError } = useAppToast();
    const { refreshAuth } = useAuth();

    const cardOpacity = useSharedValue(0);
    const cardTranslateY = useSharedValue(20);
    const titleOpacity = useSharedValue(0);
    const inputsOpacity = useSharedValue(0);
    const buttonsOpacity = useSharedValue(0);

    useEffect(() => {
        cardOpacity.value = withTiming(1, { duration: 220 });
        cardTranslateY.value = withTiming(0, { duration: 220 });
        titleOpacity.value = withDelay(80, withTiming(1, { duration: 200 }));
        inputsOpacity.value = withDelay(120, withTiming(1, { duration: 200 }));
        buttonsOpacity.value = withDelay(160, withTiming(1, { duration: 200 }));
    }, [cardOpacity, cardTranslateY, titleOpacity, inputsOpacity, buttonsOpacity]);

    const cardStyle = useAnimatedStyle(() => ({
        opacity: cardOpacity.value,
        transform: [{ translateY: cardTranslateY.value }],
    }));

    const titleStyle = useAnimatedStyle(() => ({
        opacity: titleOpacity.value,
    }));

    const inputsStyle = useAnimatedStyle(() => ({
        opacity: inputsOpacity.value,
        marginBottom: 8,
    }));

    const buttonsStyle = useAnimatedStyle(() => ({
        opacity: buttonsOpacity.value,
    }));

    const onSendCode = async () => {
        setError(undefined);
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length < 9) {
            setError('Enter a valid phone number');
            return;
        }
        setLoading(true);
        const result = await requestOtp(phone);
        setLoading(false);
        if (!result.success) {
            showError('Error', result.error);
            return;
        }
        router.push({ pathname: '/auth/otp', params: { phone } });
    };

    const onGoogle = async () => {
        setError(undefined);
        setGoogleLoading(true);
        log.debug('Signing in with Google');
        const result = await signInWithGoogle();
        log.debug('Result: ', result);
        setGoogleLoading(false);
        if (!result.success) {
            showError('Error', result.error);
            return;
        }
        const stored = await getStoredAuthData();
        if (!stored?.user?.id) {
            showError('Error', "We couldn't save your sign-in on this device. Tap to try again.");
            return;
        }
        await refreshAuth();
        await onLoginSuccess(stored.user.id);
    };

    const onApple = async () => {
        setError(undefined);
        setAppleLoading(true);
        log.debug('Signing in with Apple');
        const result = await signInWithApple();
        log.debug('Apple result: ', result);
        setAppleLoading(false);
        if (!result.success) {
            showError('Error', result.error);
            return;
        }
        const stored = await getStoredAuthData();
        if (!stored?.user?.id) {
            showError('Error', "We couldn't save your sign-in on this device. Tap to try again.");
            return;
        }
        await refreshAuth();
        await onLoginSuccess(stored.user.id);
    };

    return (
        <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: 'black' }}>
            <StatusBar backgroundColor="black" barStyle="light-content" translucent={true} animated={true} />
            <KeyboardAvoidingView
                behavior="padding"
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 80}
            >
                <ScrollView
                    className="px-5 py-4 bg-background"
                    contentContainerStyle={{ flexGrow: 1 }}
                    scrollEnabled
                    keyboardShouldPersistTaps="handled"
                >
                    <View className="flex-1 justify-center">
                        <Animated.View style={cardStyle}>
                            <Card className="w-full rounded-sm">
                                <Animated.View style={titleStyle} className="mb-2">
                                    <View className="flex-row items-center justify-center mb-4">
                                        <Text className="text-white text-2xl font-bold text-center mr-1.5">
                                            Welcome to
                                        </Text>
                                        <Text className="text-emerald-500 text-2xl font-bold text-center">
                                            CediWise
                                        </Text>
                                    </View>
                                    <Text className="text-muted-foreground text-sm mb-3 text-center">
                                        {Platform.OS === 'ios'
                                            ? appleSignInSupported
                                                ? 'Sign in with your phone number or continue with Google or Apple.'
                                                : 'Sign in with your phone number or continue with Google (Apple needs a real device).'
                                            : 'Sign in with your phone number or continue with Google.'}
                                    </Text>
                                </Animated.View>

                                <Text className="text-muted-foreground mb-2 text-sm">Phone number</Text>

                                <Animated.View style={inputsStyle}>
                                    <PhonenNumberInput 
                                        phoneNumber={phone} 
                                        setPhoneNumber={(val) => {
                                            setPhone(val);
                                            if (error) setError(undefined);
                                        }} 
                                        error={error}
                                    />
                                </Animated.View>

                                <Animated.View style={buttonsStyle} className="mt-2">
                                    <PrimaryButton loading={loading} onPress={onSendCode} className="mt-2">
                                        Continue with phone
                                    </PrimaryButton>

                                    <View className="flex-row items-center my-4">
                                        <View className="flex-1 h-px bg-slate-700" />
                                        <Text className="text-xs text-slate-400 mx-3">or</Text>
                                        <View className="flex-1 h-px bg-slate-700" />
                                    </View>

                                    <PrimaryButton
                                        loading={googleLoading}
                                        onPress={onGoogle}
                                        style={{ backgroundColor: '#FFFFFF' }}
                                        className="mt-2"
                                        accessibilityLabel="Continue with Google"
                                    >
                                        <View className="flex-row items-center justify-center gap-3">
                                            <Google.Color size={22} />
                                            <Text className="text-slate-900 font-semibold text-base">Continue with Google</Text>
                                        </View>
                                    </PrimaryButton>

                                    {Platform.OS === 'ios' && (
                                        <View className="mt-2">
                                            <PrimaryButton
                                                loading={appleLoading}
                                                onPress={onApple}
                                                disabled={!appleSignInSupported}
                                                style={{ backgroundColor: '#000000' }}
                                                className="border border-white/30"
                                                activityIndicatorColor="#FFFFFF"
                                                accessibilityLabel="Continue with Apple"
                                            >
                                                <View className="flex-row items-center justify-center gap-3">
                                                    <Apple.Logo
                                                        size={22}
                                                        color={appleSignInSupported ? '#FFFFFF' : '#94a3b8'}
                                                    />
                                                    <Text
                                                        className={`font-semibold text-base ${appleSignInSupported ? 'text-white' : 'text-slate-400'}`}
                                                    >
                                                        Continue with Apple
                                                    </Text>
                                                </View>
                                            </PrimaryButton>
                                            {!appleSignInSupported && (
                                                <Text className="text-xs text-slate-500 text-center mt-2 px-1">
                                                    Apple sign-in doesn’t work in the Simulator. Run on an iPhone or iPad to
                                                    use it.
                                                </Text>
                                            )}
                                        </View>
                                    )}
                                </Animated.View>
                            </Card>
                        </Animated.View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}


