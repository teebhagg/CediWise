import AnimatedPhoneNumberInput from '@/components/AnimatedPhoneNumberInput';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { requestOtp, signInWithGoogle } from '@/utils/auth';
import { log } from '@/utils/logger';
import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StatusBar, Text, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppToast } from '@/hooks/useAppToast';
export default function AuthLandingScreen() {
    const [phone, setPhone] = useState('');
    const [error, setError] = useState<string | undefined>();
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const { showError } = useAppToast();

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
        if (!phone.startsWith('+233') && !phone.startsWith('0')) {
            // setError('Enter a valid Ghanaian number');
            showError('Error', 'Enter a valid Ghanaian number');
            return;
        }
        setLoading(true);
        const result = await requestOtp(phone);
        setLoading(false);
        if (!result.success) {
            // setError(result.error);
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
            // setError(result.error);
            showError('Error', result.error);
        } else {
            setTimeout(() => {
                router.replace('/(tabs)');
            }, 1000);
        }
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
                                        Sign in with your phone number or continue with Google.
                                    </Text>

                                    {error && (
                                        <Text className="text-red-400 text-sm mb-4 text-center">
                                            {error}
                                        </Text>
                                    )}
                                </Animated.View>

                                <Text className="text-muted-foreground mb-2 text-sm">Phone number</Text>

                                <Animated.View style={inputsStyle}>
                                    <AnimatedPhoneNumberInput value={phone} onChange={setPhone} />
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
                                    >
                                        Continue with Google
                                    </PrimaryButton>

                                    <Link href="/auth/otp" className="mt-4 self-center">
                                        <Text className="text-muted-foreground text-xs">
                                            Already have a code?
                                        </Text>
                                    </Link>
                                </Animated.View>
                            </Card>
                        </Animated.View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}


