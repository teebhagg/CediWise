import { useRouter } from 'expo-router';
import { RotateCw } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { InlineSyncPill } from '../../BudgetLoading';

interface BudgetScreenHeaderProps {
  syncPillVisible: boolean;
  syncPillLabel: string;
  pendingCount: number;
  showResetButton: boolean;
  onResetPress: () => void;
}

export function BudgetScreenHeader({
  syncPillVisible,
  syncPillLabel,
  pendingCount,
  showResetButton,
  onResetPress,
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
      <View className="flex flex-col items-center gap-2">
        <InlineSyncPill className="right-8" visible={syncPillVisible} label={syncPillLabel} />
        {pendingCount > 0 ? (
          <Pressable
            onPress={() => router.push('/queue')}
            className="px-3 py-2 rounded-full bg-rose-500/15 border border-rose-500/30 right-16"
          >
            <Text className="text-red-300 font-medium text-xs">Sync pending: {pendingCount}</Text>
          </Pressable>
        ) : null}
        {showResetButton && (
          <Pressable
            onPress={onResetPress}
            className="flex-row gap-2 py-3 items-center justify-between border border-orange-500/30 rounded-full px-4 active:opacity-70 right-16"
          >
            <RotateCw size={16} color="#FFA500" />
            <Text className="text-orange-400 font-medium">Reset Budget</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
