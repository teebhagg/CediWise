import { useRouter } from 'expo-router';
import { ChevronRight, RefreshCcw } from 'lucide-react-native';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Card } from '@/components/Card';

interface BudgetPendingSyncCardProps {
  /** Shown when there are pending items or a sync run is in progress (updates only on run start/end). */
  visible: boolean;
  /** When true, show "Syncing…" and disable retry; UI only updates when this becomes false. */
  isSyncing?: boolean;
  onRetry: () => Promise<void>;
}

const AMBER_ICON = '#FCD34D';
const AMBER_SOFT_FG = '#FDE68A';

export function BudgetPendingSyncCard({ visible, isSyncing, onRetry }: BudgetPendingSyncCardProps) {
  const router = useRouter();

  if (!visible) return null;

  return (
    <Card
      className="p-4! gap-3.5 border border-amber-500/25 bg-amber-500/10"
      blurred
    >
      <View className="flex-row items-start gap-3">
        <View className="rounded-2xl bg-amber-500/15 border border-amber-400/25 p-2.5">
          {isSyncing ? (
            <ActivityIndicator size="small" color={AMBER_ICON} />
          ) : (
            <RefreshCcw size={20} color={AMBER_ICON} strokeWidth={2.25} />
          )}
        </View>
        <View className="flex-1 min-w-0 pt-0.5">
          <Text className="text-white text-base font-semibold leading-snug">
            {isSyncing ? 'Syncing…' : "Some updates haven't synced yet"}
          </Text>
          <Text className="text-slate-400 text-xs mt-1.5 leading-[18px]">
            {isSyncing
              ? 'Sync run in progress — status updates when it finishes.'
              : 'We will keep trying. Open the queue for details or retry everything now.'}
          </Text>
        </View>
      </View>

      <View className="flex-row flex-wrap gap-2.5">
        <Pressable
          onPress={isSyncing ? undefined : onRetry}
          disabled={isSyncing}
          accessibilityRole="button"
          accessibilityLabel={isSyncing ? 'Sync in progress' : 'Retry all pending changes'}
          accessibilityState={{ busy: !!isSyncing, disabled: !!isSyncing }}
          className={`min-h-[44px] px-4 rounded-full flex-row items-center justify-center gap-2 border ${
            isSyncing
              ? 'border-amber-500/25 bg-amber-500/10 opacity-80'
              : 'border-amber-400/40 bg-amber-500/15 active:bg-amber-500/25'
          }`}
        >
          {!isSyncing ? <RefreshCcw size={17} color={AMBER_SOFT_FG} /> : null}
          <Text className="text-amber-100 font-semibold text-sm">
            {isSyncing ? 'Syncing…' : 'Retry all'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/queue')}
          disabled={isSyncing}
          accessibilityRole="button"
          accessibilityLabel="Open sync queue"
          className={`min-h-[44px] px-3 flex-row items-center gap-0.5 ${isSyncing ? 'opacity-50' : 'active:opacity-80'}`}
        >
          <Text className="text-amber-200/90 font-medium text-sm">View sync queue</Text>
          <ChevronRight size={18} color="rgba(253, 230, 138, 0.85)" />
        </Pressable>
      </View>
    </Card>
  );
}
