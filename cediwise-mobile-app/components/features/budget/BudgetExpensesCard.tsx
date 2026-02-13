import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import type { BudgetBucket, BudgetTransaction } from '@/types/budget';
import { bucketLabel } from '@/utils/budgetHelpers';
import { formatCurrency } from '@/utils/formatCurrency';
import { Button } from 'heroui-native';
import { ChevronRight, Plus } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { BucketChip } from './BucketChip';

const BUDGET_EXPENSES_PREVIEW_COUNT = 5;

interface BudgetExpensesCardProps {
  visible: boolean;
  activeCycleId: string | null;
  filter: 'all' | BudgetBucket;
  setFilter: (f: 'all' | BudgetBucket) => void;
  transactions: BudgetTransaction[];
  categories: { id: string; name: string }[];
  onLogExpense: () => void;
  onShowMore?: () => void;
}

export function BudgetExpensesCard({
  visible,
  activeCycleId,
  filter,
  setFilter,
  transactions,
  categories,
  onLogExpense,
  onShowMore,
}: BudgetExpensesCardProps) {
  if (!visible) return null;

  const preview = transactions.slice(0, BUDGET_EXPENSES_PREVIEW_COUNT);
  const hasMore = transactions.length > BUDGET_EXPENSES_PREVIEW_COUNT;

  return (
    <Card className="">
      <View className="flex-row items-center justify-between">
        <Text className="text-white text-lg font-semibold">Expenses</Text>
        <PrimaryButton
          onPress={onLogExpense}
          disabled={!activeCycleId}
          className="flex-row gap-2"
        >
          <Plus size={16} color="#020617" />
          Log
        </PrimaryButton>
      </View>

      <View className="mt-3 flex-row flex-wrap gap-2.5">
        <BucketChip label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
        <BucketChip label="Needs" active={filter === 'needs'} onPress={() => setFilter('needs')} />
        <BucketChip label="Wants" active={filter === 'wants'} onPress={() => setFilter('wants')} />
        <BucketChip label="Savings" active={filter === 'savings'} onPress={() => setFilter('savings')} />
      </View>

      <View className="mt-3.5">
        {preview.length === 0 ? (
          <Text className="text-slate-400">No expenses yet.</Text>
        ) : (
          <>
            {preview.map((t) => {
              const cat = categories.find((c) => c.id === t.categoryId);
              return (
                <View key={t.id} className="py-2.5">
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1 min-w-0 mr-3">
                      <View className="flex-row items-center gap-2 flex-wrap">
                        <Text className="text-slate-200 font-medium" numberOfLines={1} ellipsizeMode="tail">
                          {cat?.name ?? 'Uncategorized'}
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
                  {preview.indexOf(t) < preview.length - 1 ? (
                    <View className="h-px bg-slate-400/20 mt-2.5" />
                  ) : null}
                </View>
              );
            })}
            {hasMore && onShowMore ? (
              <View className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onPress={onShowMore}
                  className="rounded-full border border-slate-400/30"
                >
                  <Button.Label className="text-slate-300 text-sm">Show more</Button.Label>
                  <ChevronRight size={14} color="#94a3b8" />
                </Button>
              </View>
            ) : null}
          </>
        )}
      </View>
    </Card>
  );
}
