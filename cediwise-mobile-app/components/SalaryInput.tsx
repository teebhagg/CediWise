import { Pencil, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, TextInputProps, View } from 'react-native';
import Animated, {
    Extrapolate,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { formatCurrency } from '../utils/formatCurrency';
import { Card } from './Card';

const stripFormatting = (text: string) => text.replace(/[,₵\s]/g, '');
const formatDisplayValue = (text?: string) => {
    const numeric = stripFormatting(text ?? '');
    return numeric ? formatCurrency(numeric) : '';
};

const AnimatedText = Animated.createAnimatedComponent(Text);
const AnimatedView = Animated.createAnimatedComponent(View);

type SalaryInputProps = TextInputProps & {
    label?: string;
};

export function SalaryInput({ label = 'Monthly Salary', value, onChangeText, onFocus, onBlur, ...rest }: SalaryInputProps) {
    const focusAnim = useSharedValue(0);
    const scaleAnim = useSharedValue(1);
    const inputRef = useRef<TextInput>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [displayValue, setDisplayValue] = useState(value ?? '');
    useEffect(() => {
        if (!isEditing) {
            setDisplayValue(formatDisplayValue(value));
        }
    }, [value, isEditing]);

    const handleFocus = (e: any) => {
        focusAnim.value = withTiming(1, { duration: 300 });
        scaleAnim.value = withTiming(1.02, { duration: 300 });
        onFocus?.(e);
        setIsEditing(true);
        setDisplayValue(stripFormatting(value ?? ''));
    };

    const handleBlur = (e: any) => {
        focusAnim.value = withTiming(0, { duration: 300 });
        scaleAnim.value = withTiming(1, { duration: 300 });
        onBlur?.(e);
        setIsEditing(false);
        setDisplayValue(formatDisplayValue(value));
    };

    const labelAnimatedStyle = useAnimatedStyle(() => ({
        transform: [
            {
                translateY: interpolate(
                    focusAnim.value,
                    [0, 1],
                    [0, -12],
                    Extrapolate.CLAMP
                ),
            },
            {
                scale: interpolate(
                    focusAnim.value,
                    [0, 1],
                    [1, 0.85],
                    Extrapolate.CLAMP
                ),
            },
        ],
        opacity: interpolate(
            focusAnim.value,
            [0, 1],
            [1, 0.8],
            Extrapolate.CLAMP
        ),
    }));

    const cardAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scaleAnim.value }],
    }));

    return (
        <AnimatedView style={[cardAnimatedStyle]} className="w-full">
            <Card
                blurred={true}
                className="relative bg-[rgba(18,22,33,0.9)] rounded-lg border border-white/10 pt-10 pb-5 px-5"
            >
                <AnimatedText
                    // style={labelAnimatedStyle}
                    className="absolute top-3 left-5 text-slate-400 text-sm z-10"
                >
                    {label}
                </AnimatedText>
                <View className="flex-row items-center">
                    <Text className="text-slate-200 text-lg mr-1">₵</Text>
                    <TextInput
                        ref={inputRef}
                        value={displayValue}
                        onChangeText={(text) => {
                            const sanitized = stripFormatting(text);
                            setDisplayValue(sanitized);
                            onChangeText?.(sanitized);
                        }}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        returnKeyType="done"
                        placeholderTextColor="rgba(229,231,235,0.3)"
                        className="flex-1 text-slate-200 text-xl p-0 mb-1.5"
                        {...rest}
                    />
                    <Pressable
                        onPress={() => {
                            if (value && value.length > 0) {
                                onChangeText?.('');
                                setDisplayValue('');
                                setIsEditing(true);
                                inputRef.current?.focus();
                            } else {
                                inputRef.current?.focus();
                            }
                        }}
                        className="w-8 h-8 rounded-sm justify-center items-center ml-3 bg-slate-400/15"
                        hitSlop={8}
                    >
                        {value && value.length > 0 ? (
                            <X color="#E5E7EB" size={18} />
                        ) : (
                            <Pencil color="#CBD5F5" size={18} />
                        )}
                    </Pressable>
                </View>
            </Card>
        </AnimatedView>
    );
}

