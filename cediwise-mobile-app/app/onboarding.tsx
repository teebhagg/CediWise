import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect } from "react";
import { Dimensions, StatusBar, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PrimaryButton } from "../components/PrimaryButton";

const HERO_IMAGE = require("../assets/images/onboarding-hero.jpg");

const { height } = Dimensions.get("window");

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  const statusBarHeight = StatusBar.currentHeight;

  useEffect(() => {
    opacity.value = withDelay(100, withTiming(1, { duration: 600 }));
    translateY.value = withDelay(100, withTiming(0, { duration: 600 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      {/* <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      /> */}
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
      <View style={{ height: height * 0.55 }}>
        <Image
          source={HERO_IMAGE}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
        />
      </View>

      {/* Content Section with Glassmorphic Card */}
      <View
        style={{
          flex: 1,
          //   marginTop: -48,
          paddingBottom: 16,
          //   paddingHorizontal: 8,
          backgroundColor: "transparent",
        }}>
        <Animated.View style={[{ flex: 1 }, animatedStyle]}>
          <View className="flex-1 justify-between p-8 border-white/5">
            <View>
              <View className="flex-row gap-2">
                <Text className="text-white text-2xl font-medium leading-[44px]">
                  Master Your Cedi
                </Text>
              </View>
              <View className="flex-row gap-2">
                <Text className="text-white text-4xl font-bold leading-[44px]">
                  with
                </Text>
                <Text
                  className="text-emerald-500 text-4xl font-bold leading-[44px]"
                  style={{ fontFamily: "Figtree-Bold" }}>
                  CediWise
                </Text>
              </View>

              <Text
                className="text-slate-300 text-lg leading-7"
                style={{ fontFamily: "Figtree-Regular" }}>
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
                className="text-slate-500 text-center mt-4 text-xs"
                style={{ fontFamily: "Figtree-Medium" }}>
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
