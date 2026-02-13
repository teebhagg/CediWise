import { useRouter } from 'expo-router';
import { RefreshCcw } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { Card } from '../../Card';

interface BudgetPendingSyncCardProps {
  visible: boolean;
  onRetry: () => Promise<void>;
}

export function BudgetPendingSyncCard({ visible, onRetry }: BudgetPendingSyncCardProps) {
  const router = useRouter();

  if (!visible) return null;

  return (
    <Card className="">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-white text-base font-semibold">
            Some updates haven&apos;t synced yet
          </Text>
          <Text className="text-muted-foreground text-xs mt-1">
            Tap to view details or retry now.
          </Text>
        </View>
        <Pressable
          onPress={onRetry}
          className="h-11 px-3.5 rounded-2xl justify-center flex-row items-center gap-2 border border-emerald-500/35 bg-emerald-500/20 active:bg-emerald-500/30"
        >
          <RefreshCcw size={16} color="#E2E8F0" />
          <Text className="text-slate-200 font-medium">Retry all</Text>
        </Pressable>
      </View>
      <Pressable onPress={() => router.push('/queue')} className="mt-3">
        <Text className="text-slate-400 text-xs">View sync queue →</Text>
      </Pressable>
    </Card>
  );
}
