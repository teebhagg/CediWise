import { PULL_REFRESH_EMERALD } from "@/constants/pullToRefresh";
import { ChevronDown } from "lucide-react-native";
import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

type BudgetPullSyncHintProps = {
  /** When true, plays the peek sequence and shows the hint. */
  active: boolean;
  /** Drives a subtle content nudge on the scroll body (pass to content wrapper). */
  peekOffset: SharedValue<number>;
  topInset: number;
  onFinished?: () => void;
};

/** Max downward nudge applied to scroll content during the peek. */
const PEEK_TRANSLATE_MAX = 32;
/** Extra gap below the hint before body content (paddingTop on content). */
const PEEK_TOP_GAP_MAX = 16;

const EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1);

/** End-to-end hint duration (fade in → hold → fade out). */
const HINT_TOTAL_MS = 6000;

const FADE_IN_DELAY = 400;
const FADE_IN_DURATION = 450;
const FADE_OUT_DURATION = 500;
const DISPLAY_BEFORE_FADE_OUT =
  HINT_TOTAL_MS - FADE_IN_DELAY - FADE_IN_DURATION - FADE_OUT_DURATION;

const ARROW_BOUNCE_PX = 5;
const ARROW_BOUNCE_HALF_MS = 900;

/** Single slow peek down, then ease back. */
const PEEK_SEQUENCE = withSequence(
  withTiming(PEEK_TRANSLATE_MAX, { duration: 900, easing: EASE_OUT }),
  withTiming(0, { duration: 1000, easing: EASE_OUT }),
);

/**
 * Pull-to-sync affordance: emerald label + gently bouncing down arrow.
 */
export function BudgetPullSyncHint({
  active,
  peekOffset,
  topInset,
  onFinished,
}: BudgetPullSyncHintProps) {
  const reduceMotion = useReducedMotion();
  const hintOpacity = useSharedValue(0);
  const arrowY = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      peekOffset.value = 0;
      hintOpacity.value = 0;
      arrowY.value = 0;
      return;
    }

    hintOpacity.value = withDelay(
      FADE_IN_DELAY,
      withSequence(
        withTiming(1, { duration: FADE_IN_DURATION, easing: EASE_OUT }),
        withDelay(
          DISPLAY_BEFORE_FADE_OUT,
          withTiming(0, { duration: FADE_OUT_DURATION, easing: EASE_OUT }),
        ),
      ),
    );

    if (!reduceMotion) {
      arrowY.value = withDelay(
        FADE_IN_DELAY + FADE_IN_DURATION,
        withRepeat(
          withSequence(
            withTiming(ARROW_BOUNCE_PX, {
              duration: ARROW_BOUNCE_HALF_MS,
              easing: EASE_OUT,
            }),
            withTiming(0, {
              duration: ARROW_BOUNCE_HALF_MS,
              easing: EASE_OUT,
            }),
          ),
          -1,
          false,
        ),
      );
    }

    peekOffset.value = withDelay(550, PEEK_SEQUENCE);

    const timer = setTimeout(() => onFinished?.(), HINT_TOTAL_MS);
    return () => clearTimeout(timer);
  }, [active, arrowY, hintOpacity, onFinished, peekOffset, reduceMotion]);

  const hintStyle = useAnimatedStyle(() => ({
    opacity: hintOpacity.value,
  }));

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: arrowY.value }],
  }));

  if (!active) return null;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          position: "absolute",
          top: topInset + 8,
          left: 0,
          right: 0,
          zIndex: 20,
          alignItems: "center",
        },
        hintStyle,
      ]}>
      <View className="flex-row items-center gap-1.5">
        <Animated.View style={arrowStyle}>
          <ChevronDown
            size={16}
            color={PULL_REFRESH_EMERALD}
            strokeWidth={2.25}
          />
        </Animated.View>
        <Text
          className="text-xs font-medium tracking-wide"
          style={{ color: PULL_REFRESH_EMERALD }}>
          Pull down to sync
        </Text>
      </View>
    </Animated.View>
  );
}

/** Apply to ScrollView content wrapper for the peek nudge. */
export function useBudgetPeekContentStyle(peekOffset: SharedValue<number>) {
  return useAnimatedStyle(() => ({
    transform: [{ translateY: peekOffset.value }],
    paddingTop: interpolate(
      peekOffset.value,
      [0, PEEK_TRANSLATE_MAX],
      [0, PEEK_TOP_GAP_MAX],
      Extrapolation.CLAMP,
    ),
  }));
}
