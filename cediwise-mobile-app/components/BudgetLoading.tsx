import { useEffect } from 'react';
import { Text, View } from 'react-native';
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
      className="overflow-hidden bg-slate-400/20 border border-slate-400/20"
      style={{ height, width, borderRadius: radius }}
    />
  );
}

export function BudgetLoadingSkeleton() {
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
      <View className="gap-4">
        <View className="gap-2.5">
          <SkeletonBlock height={28} width="42%" radius={12} />
          <SkeletonBlock height={14} width="68%" radius={10} />
        </View>
        <SkeletonBlock height={110} width="100%" radius={22} />
        <SkeletonBlock height={170} width="100%" radius={22} />
        <SkeletonBlock height={220} width="100%" radius={22} />
      </View>
    </Animated.View>
  );
}

export function InlineSyncPill({ visible, label, className }: { visible: boolean; label: string; className?: string }) {
  const spin = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    spin.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.linear }), -1, false);
  }, [spin, visible]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));

  if (!visible) return null;

  return (
    <View className={`flex-row items-center gap-2.5 px-3 py-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 ${className}`}>
      <Animated.View
        style={[
          {
            width: 14,
            height: 14,
            borderRadius: 7,
            borderWidth: 2,
            borderTopColor: 'rgba(226,232,240,0.95)',
            borderRightColor: 'rgba(226,232,240,0.35)',
            borderBottomColor: 'rgba(226,232,240,0.35)',
            borderLeftColor: 'rgba(226,232,240,0.35)',
          },
          spinStyle,
        ]}
      />
      <Text className="text-slate-200 font-medium text-xs">{label}</Text>
    </View>
  );
}

