import { ChevronDown } from "lucide-react-native";
import {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withTiming,
} from "react-native-reanimated";
import { isValidPhoneNumber } from "react-phone-number-input";
import PhoneInput from "react-phone-number-input/react-native-input";

interface PhoneInputProps {
    value: string;
    onChange: (value: string) => void;
    error?: boolean;
    disabled?: boolean;
    placeholder?: string;
    country?: string;
}

interface CountryOption {
    code: string;
    name: string;
    flag: string;
}

// Country options for dropdown
const COUNTRY_OPTIONS: CountryOption[] = [
    { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
    { code: "US", name: "United States", flag: "🇺🇸" },
    { code: "GH", name: "Ghana", flag: "🇬🇭" },
];

// Country calling codes
const COUNTRY_CODES: Record<string, string> = {
    GB: "+44",
    GH: "+233",
    US: "+1",
    CA: "+1",
    AU: "+61",
    DE: "+49",
    FR: "+33",
    ES: "+34",
    IT: "+39",
    NL: "+31",
    BE: "+32",
};

export interface PhoneInputRef {
    focus: () => void;
    blur: () => void;
    clear: () => void;
}

const AnimatedPhoneNumberInput = forwardRef<PhoneInputRef, PhoneInputProps>(
    (
        {
            value,
            onChange,
            error = false,
            disabled = false,
            placeholder = "Enter phone number",
            country = "GH",
        },
        ref
    ) => {
        const inputRef = useRef<TextInput>(null);
        const shakeAnimation = useSharedValue(0);
        const [isFocused, setIsFocused] = useState(false);
        const [selectedCountry, setSelectedCountry] = useState(country);
        const [showDropdown, setShowDropdown] = useState(false);

        useImperativeHandle(ref, () => ({
            focus: () => {
                inputRef.current?.focus();
            },
            blur: () => {
                inputRef.current?.blur();
            },
            clear: () => {
                onChange("");
            },
        }));

        // Trigger shake animation on error
        useEffect(() => {
            if (error) {
                shakeAnimation.value = withSequence(
                    withTiming(10, { duration: 100 }),
                    withTiming(-10, { duration: 100 }),
                    withTiming(10, { duration: 100 }),
                    withTiming(0, { duration: 100 })
                );
            }
        }, [error, shakeAnimation]);

        const animatedStyle = useAnimatedStyle(() => ({
            transform: [{ translateX: shakeAnimation.value }],
        }));

        const handleFocus = () => {
            setIsFocused(true);
        };

        const handleBlur = () => {
            setIsFocused(false);
        };

        const handleChange = (newValue: string | undefined) => {
            if (!newValue) {
                onChange("");
                return;
            }
            // The library handles formatting automatically, just pass the value
            onChange(newValue);
        };

        // Get country code for the current country
        const countryCode = selectedCountry
            ? COUNTRY_CODES[selectedCountry] || "+44"
            : "+44";

        // Get current country option
        const currentCountry =
            COUNTRY_OPTIONS.find((option) => option.code === selectedCountry) ||
            COUNTRY_OPTIONS[0];

        const handleCountrySelect = (countryCode: string) => {
            setSelectedCountry(countryCode);
            setShowDropdown(false);
        };

        const isValidPhone = (phone: string) => {
            if (!phone) return false;
            // Since we're using national format, we need to check if it's a valid number
            // by adding the country code for validation
            const fullNumber = phone.startsWith(countryCode)
                ? phone
                : `${countryCode}${phone.replace(/\s/g, "")}`;
            return isValidPhoneNumber(fullNumber);
        };

        const isFilled = value && value.length > 0;
        // Validate on the fly but only show validation when not focused and not empty
        const isValid = isFilled && isValidPhone(value);
        const showValidation = isFilled && !isFocused;

        return (
            <Animated.View style={animatedStyle}>
                <View style={{ maxWidth: 400, minWidth: 200 }}>
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            borderRadius: 999,
                            borderWidth: 2,
                            backgroundColor:
                                error
                                    ? '#FEE2E2'
                                    : isValid && !error
                                        ? '#DCFCE7'
                                        : isFilled && !error && !isValid
                                            ? '#FEF08A'
                                            : isFocused && !error && !isFilled
                                                ? '#FFFFFF'
                                                : '#FFFFFF',
                            borderColor:
                                error
                                    ? '#F87171'
                                    : isValid && !error
                                        ? '#4ADE80'
                                        : isFilled && !error && !isValid
                                            ? '#FACC15'
                                            : isFocused && !error && !isFilled
                                                ? '#2563EB'
                                                : '#E5E7EB',
                            paddingHorizontal: 24,
                            paddingVertical: 12,
                            minHeight: 56,
                            opacity: disabled ? 0.5 : 1,
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: isFilled ? 0.3 : 0.1,
                            shadowRadius: isFilled ? 6 : 4,
                            elevation: isFilled ? 4 : 2,
                        }}>
                        {/* Country Code Dropdown */}
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Pressable
                                onPress={() => setShowDropdown(!showDropdown)}
                                disabled={disabled}
                                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', marginRight: 8, opacity: pressed ? 0.8 : 1 })}>
                                <Text style={{ color: '#111827', fontWeight: '500', fontSize: 16, marginRight: 4 }}>
                                    {currentCountry.flag}
                                </Text>
                                <Text style={{ color: '#111827', fontWeight: '500', fontSize: 16, marginRight: 4 }}>
                                    {countryCode}
                                </Text>
                                <ChevronDown size={16} color="#6B7280" />
                            </Pressable>
                            <View style={{ width: 1, height: 22, backgroundColor: '#9CA3AF', marginRight: 12 }} />
                        </View>

                        <PhoneInput
                            ref={inputRef}
                            value={value}
                            onChange={handleChange}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                            placeholder={
                                selectedCountry === "GH"
                                    ? "24 123 4567"
                                    : selectedCountry === "US"
                                        ? "(555) 123-4567"
                                        : "7123 456789"
                            }
                            disabled={disabled}
                            country={selectedCountry as any}
                            international={false}
                            countryCallingCodeEditable={false}
                            useNationalFormatForDefaultCountryValue={true}
                            smartCaret={false}
                            returnKeyType="Done"
                            style={{
                                flex: 1,
                                fontSize: 16,
                                color: "#1A1A1A",
                                fontWeight: "500",
                                textAlign: "left",
                                letterSpacing: 0.5,
                                paddingVertical: 0,
                            }}
                            textInputStyle={{
                                fontSize: 16,
                                color: "#1A1A1A",
                                fontWeight: "500",
                                textAlign: "left",
                                letterSpacing: 0.5,
                            }}
                        />
                    </View>

                    {/* Validation indicator - only show when not focused and not empty */}
                    {showValidation && !error && (
                        <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                            {isValid ? (
                                <Text style={{ color: '#16A34A', fontSize: 14 }}>
                                    ✓ Valid {selectedCountry} number
                                </Text>
                            ) : (
                                <Text style={{ color: '#DC2626', fontSize: 14 }}>
                                    ⚠ Please enter a valid {selectedCountry} number
                                </Text>
                            )}
                        </View>
                    )}

                    {/* Country Dropdown Modal */}
                    <Modal
                        visible={showDropdown}
                        transparent
                        animationType="fade"
                        onRequestClose={() => setShowDropdown(false)}>
                        <Pressable
                            style={({ pressed }) => ({ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', opacity: pressed ? 0.9 : 1 })}
                            onPress={() => setShowDropdown(false)}>
                            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginHorizontal: 32, width: 320, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 }}>
                                <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 16, textAlign: 'center' }}>
                                    Select Country
                                </Text>
                                {COUNTRY_OPTIONS.map((option) => (
                                    <Pressable
                                        key={option.code}
                                        onPress={() => handleCountrySelect(option.code)}
                                        style={({ pressed }) => ({
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            paddingVertical: 16,
                                            paddingHorizontal: 16,
                                            borderRadius: 12,
                                            marginBottom: 8,
                                            backgroundColor: selectedCountry === option.code ? '#EFF6FF' : '#F3F4F6',
                                            opacity: pressed ? 0.8 : 1,
                                        })}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={{ fontSize: 24, marginRight: 12 }}>{option.flag}</Text>
                                            <Text style={{ fontSize: 16, fontWeight: '500', color: '#111827' }}>
                                                {option.name}
                                            </Text>
                                        </View>
                                        <Text style={{ fontSize: 16, fontWeight: '500', color: '#4B5563' }}>
                                            {COUNTRY_CODES[option.code]}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </Pressable>
                    </Modal>
                </View>
            </Animated.View>
        );
    }
);

AnimatedPhoneNumberInput.displayName = "AnimatedPhoneNumberInput";

export default AnimatedPhoneNumberInput;
