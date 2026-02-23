import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

function SkeletonBlock({
  height,
  width,
  radius = 16,
}: {
  height: number;
  width: number | `${number}%`;
  radius?: number;
}) {
  return (
    <View
      className="overflow-hidden bg-slate-400/20 border border-white/10"
      style={{ height, width, borderRadius: radius }}
    />
  );
}

/** Shimmer skeleton matching VitalHeroCard layout (glassmorphic card with headline, bar, list). */
export function VitalHeroSkeleton() {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + 0.5 * pulse.value,
  }));

  return (
    <Animated.View style={pulseStyle}>
      <View className="rounded-2xl overflow-hidden border border-white/10 bg-white/5 p-5 gap-4">
        <SkeletonBlock height={32} width="55%" radius={10} />
        <SkeletonBlock height={12} width="100%" radius={6} />
        <View className="gap-2">
          <SkeletonBlock height={10} width="100%" radius={5} />
          <SkeletonBlock height={12} width="70%" radius={6} />
        </View>
        <View className="gap-3 mt-2">
          <SkeletonBlock height={40} width="100%" radius={10} />
          <SkeletonBlock height={40} width="100%" radius={10} />
          <SkeletonBlock height={40} width="85%" radius={10} />
        </View>
      </View>
    </Animated.View>
  );
}
