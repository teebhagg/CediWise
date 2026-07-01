import { Card } from '@/components/Card';
import type { BudgetBucket, BudgetTransaction } from '@/types/budget';
import { bucketLabel } from '@/utils/budgetHelpers';
import { formatCurrency } from '@/utils/formatCurrency';
import * as Haptics from 'expo-haptics';
import { Button } from 'heroui-native';
import { ChevronRight, Plus } from 'lucide-react-native';
import { memo, useCallback, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { BucketChip } from './BucketChip';

type ExpenseFilter = 'all' | BudgetBucket;

interface BudgetExpensesCardProps {
  visible: boolean;
  activeCycleId: string | null;
  transactions: BudgetTransaction[];
  categories: { id: string; name: string }[];
  onLogExpense: () => void;
  onSeeAllPress: () => void;
  /** Max transactions to show in preview (default 3) */
  previewCount?: number;
}

function BudgetExpensesCardInner({
  visible,
  activeCycleId,
  transactions,
  categories,
  onLogExpense,
  onSeeAllPress,
  previewCount = 3,
}: BudgetExpensesCardProps) {
  const [filter, setFilter] = useState<ExpenseFilter>('all');

  const categoryNameById = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  const filteredTransactions = useMemo(() => {
    if (filter === 'all') return transactions;
    return transactions.filter((t) => t.bucket === filter);
  }, [filter, transactions]);

  const preview = useMemo(
    () => filteredTransactions.slice(0, previewCount),
    [filteredTransactions, previewCount],
  );

  const handleFilterPress = useCallback((next: ExpenseFilter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setFilter((current) => (current === next ? current : next));
  }, []);

  if (!visible) return null;

  return (
    <Card className="">
      <View className="flex-row items-center justify-between">
        <Text className="text-white text-lg font-semibold">Expenses</Text>
        <Button
          onPress={onSeeAllPress}
          variant="ghost"
          className="flex-row items-center gap-0.5 py-2 px-1 min-h-[44px] justify-center"
          accessibilityRole="button"
          accessibilityLabel="See all expenses"
        >
          <Text className="text-slate-400 text-sm">See all</Text>
          <ChevronRight size={16} color="#94A3B8" />
        </Button>
      </View>

      <Button
        onPress={onLogExpense}
        isDisabled={!activeCycleId}
        className="mt-3 flex-row gap-2"
      >
        <Plus size={16} color="#020617" />
        <Text className="text-slate-900 font-semibold text-base">Add expense</Text>
      </Button>

      <View className="mt-3 flex-row flex-wrap gap-2.5">
        <BucketChip label="All" active={filter === 'all'} onPress={() => handleFilterPress('all')} />
        <BucketChip label="Needs" active={filter === 'needs'} onPress={() => handleFilterPress('needs')} />
        <BucketChip label="Wants" active={filter === 'wants'} onPress={() => handleFilterPress('wants')} />
        <BucketChip label="Savings" active={filter === 'savings'} onPress={() => handleFilterPress('savings')} />
      </View>

      <View className="mt-3.5">
        {preview.length === 0 ? (
          <View className="flex-col items-center justify-center gap-2 p-4 rounded-sm bg-white/5 border border-white/5">
            <Text className="text-slate-500 text-sm text-center">
              {filter === 'all'
                ? 'No expenses this month yet.'
                : `No ${bucketLabel(filter).toLowerCase()} expenses yet.`}
            </Text>
            <Text className="text-slate-400 font-medium text-sm text-center">
              Tap above to add one.
            </Text>
          </View>
        ) : (
          preview.map((t, index) => {
            const title = t.debtId
              ? 'Debt Payment'
              : (categoryNameById.get(t.categoryId ?? '') ?? 'Uncategorized');
            return (
              <View key={t.id} className="py-2.5">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 min-w-0 mr-3">
                    <View className="flex-row items-center gap-2 flex-wrap">
                      <Text className="text-slate-200 font-medium" numberOfLines={1} ellipsizeMode="tail">
                        {title}
                      </Text>
                      <View className="bg-slate-500/25 px-2 py-0.5 rounded">
                        <Text className="text-slate-300 text-xs font-medium">
                          {bucketLabel(t.bucket)}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-slate-500 text-xs mt-0.5" numberOfLines={1} ellipsizeMode="tail">
                      {new Date(t.occurredAt).toLocaleDateString('en-GB', {
                        month: 'short',
                        day: 'numeric',
                      })}
                      {t.note?.trim() ? ` • ${t.note.trim()}` : ''}
                    </Text>
                  </View>
                  <Text className="text-red-300 font-bold">-₵{formatCurrency(t.amount)}</Text>
                </View>
                {index < preview.length - 1 ? (
                  <View className="h-px bg-slate-400/20 mt-2.5" />
                ) : null}
              </View>
            );
          })
        )}
      </View>
    </Card>
  );
}

export const BudgetExpensesCard = memo(BudgetExpensesCardInner);
