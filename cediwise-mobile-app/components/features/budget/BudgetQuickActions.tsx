import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { LayoutGrid, Lightbulb, Plus, Wallet } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

export interface BudgetQuickActionsProps {
  visible: boolean;
  onLogExpense: () => void;
  disabledLogExpense?: boolean;
}

export function BudgetQuickActions({
  visible,
  onLogExpense,
  disabledLogExpense,
}: BudgetQuickActionsProps) {
  const router = useRouter();

  if (!visible) return null;

  const handlePress = (action: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    action();
  };

  return (
    <View className="gap-3">
      <View className="flex-row gap-2.5">
        <Pressable
          onPress={() => handlePress(onLogExpense)}
          disabled={disabledLogExpense}
          accessibilityRole="button"
          accessibilityLabel="Log expense"
          className={`flex-1 flex-row items-center justify-center gap-2 py-3.5 rounded-xl ${disabledLogExpense
              ? 'bg-slate-500/20 border border-slate-500/30 opacity-60'
              : 'bg-emerald-500 border border-emerald-400/50 active:bg-emerald-600'
            }`}
        >
          <Plus size={18} color={disabledLogExpense ? '#94A3B8' : '#020617'} />
          <Text
            className={`font-semibold text-sm ${disabledLogExpense ? 'text-slate-400' : 'text-slate-900'
              }`}
          >
            Log Expense
          </Text>
        </Pressable>
      </View>
      <View className="flex-row gap-2">
        <Pressable
          onPress={() => handlePress(() => router.push('/budget/categories'))}
          accessibilityRole="button"
          accessibilityLabel="View categories"
          className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl bg-slate-500/15 border border-slate-400/25 active:bg-slate-500/25"
        >
          <LayoutGrid size={16} color="#94A3B8" />
          <Text className="text-slate-200 font-medium text-sm">Categories</Text>
        </Pressable>
        <Pressable
          onPress={() => handlePress(() => router.push('/budget/income'))}
          accessibilityRole="button"
          accessibilityLabel="Manage income"
          className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl bg-slate-500/15 border border-slate-400/25 active:bg-slate-500/25"
        >
          <Wallet size={16} color="#94A3B8" />
          <Text className="text-slate-200 font-medium text-sm">Income</Text>
        </Pressable>
        <Pressable
          onPress={() => handlePress(() => router.push('/budget/insights'))}
          accessibilityRole="button"
          accessibilityLabel="View insights"
          className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl bg-slate-500/15 border border-slate-400/25 active:bg-slate-500/25"
        >
          <Lightbulb size={16} color="#94A3B8" />
          <Text className="text-slate-200 font-medium text-sm">Insights</Text>
        </Pressable>
      </View>
    </View>
  );
}
