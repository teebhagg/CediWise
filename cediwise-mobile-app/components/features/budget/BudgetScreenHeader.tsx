import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Settings } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { InlineSyncPill } from '../../BudgetLoading';

interface BudgetScreenHeaderProps {
  syncPillVisible: boolean;
  syncPillLabel: string;
  pendingCount: number;
  showSettingsButton?: boolean;
}

export function BudgetScreenHeader({
  syncPillVisible,
  syncPillLabel,
  pendingCount,
  showSettingsButton = true,
}: BudgetScreenHeaderProps) {
  const router = useRouter();

  return (
    <View className="px-5 pt-3 mb-6 flex flex-row items-start justify-between">
      <View className="gap-3">
        <Text className="text-white text-[28px] font-bold">Budget</Text>
        <Text className="text-muted-foreground text-sm mt-1">
          Needs / Wants / Savings — payday-based.
        </Text>
      </View>
      <View className="flex flex-row items-center gap-2">
        <InlineSyncPill className="right-8" visible={syncPillVisible} label={syncPillLabel} />
        {pendingCount > 0 ? (
          <Pressable
            onPress={() => router.push('/queue')}
            className="px-3 py-2 rounded-full bg-rose-500/15 border border-rose-500/30"
          >
            <Text className="text-red-300 font-medium text-xs">Sync: {pendingCount}</Text>
          </Pressable>
        ) : null}
        {showSettingsButton && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
              router.push('/budget/settings');
            }}
            accessibilityRole="button"
            accessibilityLabel="Budget settings"
            className="w-10 h-10 rounded-full justify-center items-center bg-slate-500/20 border border-slate-400/25 active:bg-slate-500/30"
          >
            <Settings size={20} color="#94A3B8" />
          </Pressable>
        )}
      </View>
    </View>
  );
}
