import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  withSequence,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight } from "lucide-react-native";

import { ONBOARDING_DEMO_SLIDES } from "@/constants/onboardingDemos";
import { VideoSlide } from "./VideoSlide";
import { PrimaryButton } from "../PrimaryButton";
import { SecondaryButton } from "../SecondaryButton";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const SLIDE_COUNT = ONBOARDING_DEMO_SLIDES.length;
const TOP_BAR_SIDE_WIDTH = 88;

const slideEasing = Easing.out(Easing.cubic);

export function VideoDemoCarousel() {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const translateX = useSharedValue(0);

  const videoHeight = useMemo(
    () => (SCREEN_HEIGHT < 700 ? SCREEN_WIDTH * 0.95 : SCREEN_WIDTH * 1.1),
    []
  );

  const textOpacity = useSharedValue(1);
  const iconScale = useSharedValue(1);

  const currentSlide = ONBOARDING_DEMO_SLIDES[currentIndex];
  const SlideIcon = currentSlide.icon;

  const scrollTo = useCallback(
    (index: number) => {
      const clampedIndex = Math.max(0, Math.min(index, SLIDE_COUNT - 1));
      if (clampedIndex === currentIndex) return;

      textOpacity.value = withTiming(0, { duration: 100 }, () => {
        translateX.value = withTiming(-clampedIndex * SCREEN_WIDTH, {
          duration: 350,
          easing: slideEasing,
        });
        textOpacity.value = withTiming(1, { duration: 250 });
      });
      setCurrentIndex(clampedIndex);
    },
    [currentIndex, translateX, textOpacity]
  );

  const goToNext = useCallback(() => {
    if (currentIndex === SLIDE_COUNT - 1) {
      router.replace("/auth");
      return;
    }
    scrollTo(currentIndex + 1);
  }, [currentIndex, scrollTo]);

  const goToPrev = useCallback(() => {
    scrollTo(currentIndex - 1);
  }, [currentIndex, scrollTo]);

  const handleSkip = useCallback(() => {
    router.replace("/auth");
  }, []);

  const isLastSlide = currentIndex === SLIDE_COUNT - 1;
  const isFirstSlide = currentIndex === 0;

  const animatedRowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  useEffect(() => {
    iconScale.value = withSequence(
      withTiming(0.92, { duration: 80 }),
      withSpring(1, { damping: 14, stiffness: 180 })
    );
  }, [currentIndex, iconScale]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View style={styles.topBarSide} />
        <View style={styles.topBarCenter} pointerEvents="box-none">
          {ONBOARDING_DEMO_SLIDES.map((_, i) => (
            <Dot
              key={`top-dot-${i}`}
              index={i}
              isActive={i === currentIndex}
              onPress={() => scrollTo(i)}
            />
          ))}
        </View>
        <View style={[styles.topBarSide, styles.topBarSideRight]}>
          <SecondaryButton
            onPress={handleSkip}
            className="h-10 min-h-[40px] px-4 rounded-full"
            accessibilityLabel="Skip onboarding demos"
            accessibilityRole="button"
          >
            Skip
          </SecondaryButton>
        </View>
      </View>

      <View style={[styles.videoContainer, { height: videoHeight }]}>
        <Animated.View
          style={[
            styles.slidesRow,
            { width: SLIDE_COUNT * SCREEN_WIDTH },
            animatedRowStyle,
          ]}
        >
          {ONBOARDING_DEMO_SLIDES.map((slide, i) => {
            const isActive = i === currentIndex;
            const shouldMountVideo = Math.abs(i - currentIndex) <= 1;

            return (
              <View key={slide.title} style={styles.slideWrapper}>
                {shouldMountVideo ? (
                  <VideoSlide source={slide.source} isActive={isActive} />
                ) : (
                  <View style={styles.slidePlaceholder} />
                )}
              </View>
            );
          })}
        </Animated.View>
      </View>

      <Animated.View style={[styles.contentContainer, animatedTextStyle]}>
        <Animated.View style={[styles.iconBadge, animatedIconStyle]}>
          <SlideIcon size={24} color="#10b981" strokeWidth={2.2} />
        </Animated.View>
        <Text style={styles.title}>{currentSlide.title}</Text>
        <Text style={styles.caption}>{currentSlide.caption}</Text>
      </Animated.View>

      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 24) },
        ]}
      >
        <View style={styles.bottomBarLeft}>
          {!isFirstSlide ? (
            <NavIconButton
              onPress={goToPrev}
              accessibilityLabel="Previous slide"
            >
              <ChevronLeft size={20} color="#10b981" strokeWidth={2.5} />
            </NavIconButton>
          ) : (
            <View style={styles.navButtonSpacer} />
          )}
        </View>

        <View style={styles.bottomBarRight}>
          {isLastSlide ? (
            <PrimaryButton
              onPress={goToNext}
              accessibilityRole="button"
              accessibilityLabel="Get Started"
            >
              Get Started
            </PrimaryButton>
          ) : (
            <NavIconButton onPress={goToNext} accessibilityLabel="Next slide">
              <ChevronRight size={20} color="#10b981" strokeWidth={2.5} />
            </NavIconButton>
          )}
        </View>
      </View>
    </View>
  );
}

function NavIconButton({
  onPress,
  accessibilityLabel,
  children,
}: {
  onPress: () => void;
  accessibilityLabel: string;
  children: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.navButton,
        pressed && styles.navButtonPressedScale,
        pressed && styles.navButtonPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </Pressable>
  );
}

function Dot({
  index,
  isActive,
  onPress,
}: {
  index: number;
  isActive: boolean;
  onPress: () => void;
}) {
  const widthVal = useSharedValue(isActive ? 24 : 8);

  useEffect(() => {
    widthVal.value = withSpring(isActive ? 24 : 8, {
      damping: 15,
      stiffness: 150,
    });
  }, [isActive, widthVal]);

  const animatedDotStyle = useAnimatedStyle(() => ({
    width: widthVal.value,
    backgroundColor: isActive ? "#10b981" : "#334155",
  }));

  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={`Go to slide ${index + 1} of ${SLIDE_COUNT}`}
      accessibilityState={{ selected: isActive }}
    >
      <Animated.View style={[styles.dot, animatedDotStyle]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  topBar: {
    position: "relative",
    minHeight: 44,
    marginTop: 8,
    marginBottom: 10,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  topBarSide: {
    width: TOP_BAR_SIDE_WIDTH,
    zIndex: 2,
  },
  topBarSideRight: {
    position: "absolute",
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  topBarCenter: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: TOP_BAR_SIDE_WIDTH,
  },
  videoContainer: {
    overflow: "hidden",
    borderRadius: 32,
    marginHorizontal: 16,
  },
  slidesRow: {
    flexDirection: "row",
    flex: 1,
  },
  slideWrapper: {
    width: SCREEN_WIDTH - 32,
    marginRight: 32,
    height: "100%",
  },
  slidePlaceholder: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "#0f172a",
  },
  contentContainer: {
    alignItems: "center",
    paddingHorizontal: 32,
    marginTop: 24,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#052e1f",
    borderWidth: 1,
    borderColor: "#065f46",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    color: "white",
    fontFamily: "Figtree-Bold",
    fontSize: 22,
    marginBottom: 8,
    textAlign: "center",
  },
  caption: {
    color: "#e2e8f0",
    fontFamily: "Figtree-Regular",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginTop: "auto",
    minHeight: 60,
    gap: 12,
  },
  bottomBarLeft: {
    minWidth: 44,
    alignItems: "flex-start",
  },
  bottomBarRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#14532d",
    backgroundColor: "#04110b",
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  navButtonSpacer: {
    width: 44,
    height: 44,
  },
  navButtonPressedScale: {
    transform: [{ scale: 0.96 }],
  },
  navButtonPressed: {
    opacity: 0.82,
  },
});
