import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { AlertCircle, Plus } from 'lucide-react-native';
import { memo, useCallback } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import type { BudgetCategory, BudgetState, BudgetTransaction } from '../../../types/budget';
import { formatCurrency } from '../../../utils/formatCurrency';
import { BudgetTransactionModal } from '../../BudgetTransactionModal';
import { Card } from '../../Card';
import { PrimaryButton } from '../../PrimaryButton';

export interface RecentExpensesSectionProps {
  activeCycleId: string | null;
  cycleCategories: BudgetCategory[];
  recentExpenses: BudgetTransaction[];
  budgetState: BudgetState | null;
  onLogExpensePress: () => void;
  onAddTransaction: (params: {
    amount: number;
    note?: string;
    bucket: 'needs' | 'wants' | 'savings';
    categoryId?: string | null;
  }) => Promise<{ wouldExceedNeeds?: boolean }>;
  showExpenseModal: boolean;
  onCloseExpenseModal: () => void;
  animatedStyle?: StyleProp<ViewStyle>;
}

const AnimatedView = Animated.createAnimatedComponent(View);

function formatExpenseDate(occurredAt: string): string {
  try {
    return new Date(occurredAt).toLocaleDateString('en-GB', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

function RecentExpensesSectionInner({
  activeCycleId,
  cycleCategories,
  recentExpenses,
  budgetState,
  onLogExpensePress,
  onAddTransaction,
  showExpenseModal,
  onCloseExpenseModal,
  animatedStyle,
}: RecentExpensesSectionProps) {
  const router = useRouter();

  const handleLogExpense = useCallback(async () => {
    try {
      await Haptics.selectionAsync();
    } catch {
      // ignore
    }
    onLogExpensePress();
  }, [onLogExpensePress]);

  return (
    <>
      <AnimatedView style={animatedStyle} className="mb-32">
        <View className="mb-4">
          <Text className="text-white text-lg font-semibold mb-1">Recent expenses</Text>
          <Text className="text-muted-foreground text-sm">From your current budget cycle.</Text>
          <Text className="text-slate-400 text-xs mt-1">
            Log an expense here, or open Budget for full details.
          </Text>
        </View>

        <View className="flex-row gap-2.5 mb-3">
          <PrimaryButton
            onPress={handleLogExpense}
            className="flex-1 min-h-[52px]"
            disabled={!activeCycleId || cycleCategories.length === 0}
          >
            <Plus size={18} color="#020617" />
            <Text className="text-slate-900 font-semibold text-base">Log expense</Text>
          </PrimaryButton>
          <Pressable
            onPress={() => router.push('/budget')}
            className="px-3 py-2 rounded-full bg-white/10 border border-white/10 justify-center min-h-[52px] items-center"
          >
            <Text className="text-slate-200 font-medium text-xs">Open Budget</Text>
          </Pressable>
        </View>

        {!activeCycleId ? (
          <Card className="items-center bg-white/5 space-y-3">
            <AlertCircle color="#9CA3AF" size={32} />
            <Text className="text-muted-foreground text-sm text-center px-4">
              Set up your budget cycle to start tracking expenses.
            </Text>
          </Card>
        ) : recentExpenses.length === 0 ? (
          <Card className="items-center bg-white/5 space-y-3">
            <AlertCircle color="#9CA3AF" size={32} />
            <Text className="text-muted-foreground text-sm text-center px-4">
              No expenses yet. Log your first one above.
            </Text>
          </Card>
        ) : (
          <Card>
            <View className="gap-3">
              {recentExpenses.map((t) => {
                const cat = budgetState?.categories.find((c) => c.id === t.categoryId);
                const when = formatExpenseDate(t.occurredAt);
                return (
                  <View key={t.id} className="flex-row justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-slate-200 font-medium">
                        {cat?.name ?? 'Uncategorized'}
                      </Text>
                      <Text className="text-slate-500 text-xs">
                        {t.bucket} • {when}
                      </Text>
                    </View>
                    <Text className="text-red-300 font-bold">-₵{formatCurrency(t.amount)}</Text>
                  </View>
                );
              })}
            </View>
          </Card>
        )}
      </AnimatedView>

      <BudgetTransactionModal
        visible={showExpenseModal}
        categories={cycleCategories}
        onClose={onCloseExpenseModal}
        onSubmit={async ({ amount, note, bucket, categoryId }) => {
          await onAddTransaction({ amount, note, bucket, categoryId });
        }}
      />
    </>
  );
}

export const RecentExpensesSection = memo(RecentExpensesSectionInner);
