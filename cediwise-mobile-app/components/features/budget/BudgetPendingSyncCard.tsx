import { useRouter } from 'expo-router';
import { RefreshCcw } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

interface BudgetPendingSyncCardProps {
  /** Shown when there are pending items or a sync run is in progress (updates only on run start/end). */
  visible: boolean;
  /** When true, show "Syncing…" and disable retry; UI only updates when this becomes false. */
  isSyncing?: boolean;
  onRetry: () => Promise<void>;
}

export function BudgetPendingSyncCard({ visible, isSyncing, onRetry }: BudgetPendingSyncCardProps) {
  const router = useRouter();

  if (!visible) return null;

  return (
    <View className="rounded-xl border-l-4 border-l-orange-500 bg-orange-500/10 px-4 py-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-white text-base font-semibold">
            {isSyncing ? 'Syncing…' : "Some updates haven't synced yet"}
          </Text>
          <Text className="text-muted-foreground text-xs mt-1">
            {isSyncing
              ? 'Sync run in progress — status updates when it finishes.'
              : 'Tap to view details or retry now.'}
          </Text>
        </View>
        <Pressable
          onPress={isSyncing ? undefined : onRetry}
          disabled={isSyncing}
          className={`h-11 px-3.5 rounded-2xl justify-center flex-row items-center gap-2 border border-orange-500/35 ${isSyncing ? 'opacity-70 bg-orange-500/10' : 'bg-orange-500/20 active:bg-orange-500/30'}`}
        >
          <RefreshCcw size={16} color="#E2E8F0" />
          <Text className="text-slate-200 font-medium">{isSyncing ? 'Syncing…' : 'Retry all'}</Text>
        </Pressable>
      </View>
      <Pressable onPress={() => router.push('/queue')} className="mt-3" disabled={isSyncing}>
        <Text className="text-slate-400 text-xs">View sync queue →</Text>
      </Pressable>
    </View>
  );
}
