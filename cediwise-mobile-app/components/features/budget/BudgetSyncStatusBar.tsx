import { PULL_REFRESH_EMERALD } from "@/constants/pullToRefresh";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

type BudgetSyncStatusBarProps = {
  visible: boolean;
  label: string;
  top: number;
};

function SyncOrbitDot({ index, spin }: { index: number; spin: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const angle = spin.value * Math.PI * 2 + (index * Math.PI * 2) / 3;
    const radius = 7;
    return {
      opacity: interpolate(
        (Math.sin(angle) + 1) / 2,
        [0, 1],
        [0.35, 1],
      ),
      transform: [
        { translateX: Math.cos(angle) * radius },
        { translateY: Math.sin(angle) * radius * 0.55 },
        {
          scale: interpolate(
            (Math.sin(angle) + 1) / 2,
            [0, 1],
            [0.75, 1.1],
          ),
        },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: 5,
          height: 5,
          borderRadius: 2.5,
          backgroundColor: PULL_REFRESH_EMERALD,
        },
        style,
      ]}
    />
  );
}

/**
 * Subtle sync banner below the header — orbiting dots + shimmer sweep.
 */
export function BudgetSyncStatusBar({
  visible,
  label,
  top,
}: BudgetSyncStatusBarProps) {
  const [mounted, setMounted] = useState(false);
  const enter = useSharedValue(0);
  const spin = useSharedValue(0);
  const shimmer = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      enter.value = withTiming(1, {
        duration: 280,
        easing: Easing.out(Easing.cubic),
      });
      spin.value = withRepeat(
        withTiming(1, { duration: 1400, easing: Easing.linear }),
        -1,
        false,
      );
      shimmer.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
        false,
      );
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
      );
      return;
    }

    enter.value = withTiming(0, { duration: 240 }, (finished) => {
      if (finished) runOnJS(setMounted)(false);
    });
  }, [enter, pulse, shimmer, spin, visible]);

  const barStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [
      {
        translateY: interpolate(enter.value, [0, 1], [-10, 0]),
      },
    ],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(shimmer.value, [0, 1], [-120, 280]),
      },
    ],
    opacity: interpolate(pulse.value, [0, 1], [0.15, 0.45]),
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));

  if (!mounted) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          top,
          left: 16,
          right: 16,
          zIndex: 25,
        },
        barStyle,
      ]}>
      <View
        className="overflow-hidden rounded-2xl border border-emerald-500/25 bg-emerald-950/75"
        style={{ paddingVertical: 10, paddingHorizontal: 14 }}>
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              top: 0,
              bottom: 0,
              width: 72,
              backgroundColor: "rgba(110, 231, 183, 0.18)",
            },
            shimmerStyle,
          ]}
        />
        <View className="flex-row items-center gap-3">
          <View
            style={{ width: 22, height: 22, alignItems: "center", justifyContent: "center" }}>
            <Animated.View
              style={[
                {
                  position: "absolute",
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  borderWidth: 1.5,
                  borderColor: "rgba(110, 231, 183, 0.25)",
                  borderTopColor: "rgba(110, 231, 183, 0.85)",
                },
                ringStyle,
              ]}
            />
            {[0, 1, 2].map((i) => (
              <SyncOrbitDot key={i} index={i} spin={spin} />
            ))}
          </View>
          <Text className="text-emerald-50 text-xs font-medium flex-1" numberOfLines={1}>
            {label}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}
