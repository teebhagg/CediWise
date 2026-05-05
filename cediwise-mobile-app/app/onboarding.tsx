import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect } from "react";
import { Dimensions, PixelRatio, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PrimaryButton } from "../components/PrimaryButton";

const HERO_IMAGE = require("../assets/images/onboarding-hero.jpg");

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Base width for scaling (iPhone 11/12 standard)
const BASE_WIDTH = 375;

/**
 * Scales font size based on screen width with a moderate factor
 * to prevent text from getting too small on tiny devices.
 */
const scaleFont = (size: number) => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withDelay(100, withTiming(1, { duration: 600 }));
    translateY.value = withDelay(100, withTiming(0, { duration: 600 }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- mount-only entrance; Reanimated shared values

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  // Responsive sizes
  const titleSize = scaleFont(24);
  const brandSize = scaleFont(40);
  const descSize = scaleFont(17);
  const footerSize = scaleFont(11);
  const lineHeightLarge = scaleFont(44);
  const lineHeightDesc = scaleFont(26);

  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0.8)", "transparent"]}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: insets.top + 30,
          zIndex: 10,
        }}
      />

      {/* Hero Image Section */}
      <View style={{ height: SCREEN_HEIGHT * 0.55 }}>
        <Image
          source={HERO_IMAGE}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
        />
      </View>

      {/* Content Section with Responsive Typography */}
      <View
        style={{
          flex: 1,
          paddingBottom: Math.max(insets.bottom, 16),
          backgroundColor: "transparent",
        }}>
        <Animated.View style={[{ flex: 1 }, animatedStyle]}>
          <View className="flex-1 justify-between p-8 border-white/5">
            <View>
              <View className="flex-row gap-2">
                <Text
                  className="text-white font-medium"
                  style={{
                    fontSize: titleSize,
                    lineHeight: lineHeightLarge,
                  }}>
                  Master Your Cedi
                </Text>
              </View>
              <View className="flex-row gap-2">
                <Text
                  className="text-white font-bold"
                  style={{
                    fontSize: brandSize,
                    lineHeight: lineHeightLarge,
                  }}>
                  with
                </Text>
                <Text
                  className="text-emerald-500 font-bold"
                  style={{
                    fontFamily: "Figtree-Bold",
                    fontSize: brandSize,
                    lineHeight: lineHeightLarge,
                  }}>
                  CediWise
                </Text>
              </View>

              <Text
                className="text-slate-300 mt-2"
                style={{
                  fontFamily: "Figtree-Regular",
                  fontSize: descSize,
                  lineHeight: lineHeightDesc,
                }}>
                Intelligent budgeting for the Ghanaian lifestyle—from ECG units
                to Susu goals.
              </Text>
            </View>

            <View className="gap-2">
              <PrimaryButton
                onPress={() => router.replace("/auth")}
                className="w-full h-14">
                Get Started
              </PrimaryButton>

              <Text
                className="text-slate-500 text-center mt-4"
                style={{
                  fontFamily: "Figtree-Medium",
                  fontSize: footerSize,
                }}>
                By continuing, you agree to our{" "}
                <Text
                  onPress={() => router.push("/terms")}
                  className="text-emerald-500 underline">
                  Terms
                </Text>{" "}
                and{" "}
                <Text
                  onPress={() => router.push("/privacy")}
                  className="text-emerald-500 underline">
                  Privacy Policy
                </Text>
              </Text>
            </View>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}
