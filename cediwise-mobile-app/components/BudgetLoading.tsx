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

/**
 * Content-aware skeleton for budget screen.
 * Mirrors BudgetOverviewCard layout: title, progress bars (Needs/Wants/Savings), footer.
 */
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
        {/* Card: Budget Overview layout */}
        <View className="rounded-2xl overflow-hidden border border-slate-400/20 bg-slate-500/10 p-5 gap-3">
          <View className="flex-row justify-between items-start gap-3">
            <View className="flex-1 gap-2">
              <SkeletonBlock height={20} width="50%" radius={8} />
              <SkeletonBlock height={12} width="75%" radius={6} />
            </View>
            <SkeletonBlock height={44} width={56} radius={12} />
          </View>
          <View className="gap-3 pt-1">
            {[1, 2, 3].map((i) => (
              <View key={i} className="gap-1.5">
                <View className="flex-row justify-between">
                  <SkeletonBlock height={12} width={60} radius={6} />
                  <SkeletonBlock height={12} width={80} radius={6} />
                </View>
                <SkeletonBlock height={8} width="100%" radius={4} />
              </View>
            ))}
          </View>
          <View className="pt-3 border-t border-slate-400/20 flex-row justify-between">
            <SkeletonBlock height={14} width={100} radius={6} />
            <SkeletonBlock height={16} width={70} radius={6} />
          </View>
        </View>
        {/* Quick actions / categories area */}
        <SkeletonBlock height={80} width="100%" radius={16} />
        <View className="gap-2">
          <SkeletonBlock height={18} width="35%" radius={8} />
          <SkeletonBlock height={120} width="100%" radius={16} />
        </View>
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

