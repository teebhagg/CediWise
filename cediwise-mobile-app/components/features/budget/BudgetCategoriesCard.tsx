import * as Haptics from 'expo-haptics';
import { ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import type { BudgetBucket } from '../../../types/budget';
import { formatCurrency } from '../../../utils/formatCurrency';
import { Card } from '../../Card';
import { ProgressBar } from './ProgressBar';

interface BudgetCategory {
  id: string;
  name: string;
  bucket: BudgetBucket;
  limitAmount: number;
}

interface BudgetCategoriesCardProps {
  visible: boolean;
  categoriesOpen: boolean;
  onToggleCategories: () => void;
  bucketOpen: Record<BudgetBucket, boolean>;
  setBucketOpen: (fn: (prev: Record<BudgetBucket, boolean>) => Record<BudgetBucket, boolean>) => void;
  categoriesByBucket: Record<BudgetBucket, BudgetCategory[]>;
  activeCycleId: string | null;
  transactions: { cycleId: string; bucket: BudgetBucket; categoryId?: string | null; amount: number }[];
  totals: { needsLimit: number; wantsLimit: number; savingsLimit: number } | null;
  onEditLimit: (cat: { id: string; name: string; current: number }) => void;
  onDeleteCategory: (cat: { id: string; name: string }) => void;
  onAddCustomCategory: () => void;
}

const BUCKETS: { bucket: BudgetBucket; title: string }[] = [
  { bucket: 'needs', title: 'Needs' },
  { bucket: 'wants', title: 'Wants' },
  { bucket: 'savings', title: 'Savings' },
];

export function BudgetCategoriesCard({
  visible,
  categoriesOpen,
  onToggleCategories,
  bucketOpen,
  setBucketOpen,
  categoriesByBucket,
  activeCycleId,
  transactions,
  totals,
  onEditLimit,
  onDeleteCategory,
  onAddCustomCategory,
}: BudgetCategoriesCardProps) {
  if (!visible) return null;

  const bucketSpent = (bucket: BudgetBucket) =>
    activeCycleId
      ? transactions
        .filter((t) => t.cycleId === activeCycleId && t.bucket === bucket)
        .reduce((s, t) => s + t.amount, 0)
      : 0;

  const bucketLimit = (bucket: BudgetBucket) =>
    bucket === 'needs'
      ? totals?.needsLimit ?? 0
      : bucket === 'wants'
        ? totals?.wantsLimit ?? 0
        : totals?.savingsLimit ?? 0;

  const categorySpent = (categoryId: string) =>
    activeCycleId
      ? transactions
        .filter((t) => t.cycleId === activeCycleId && t.categoryId === categoryId)
        .reduce((s, t) => s + t.amount, 0)
      : 0;

  return (
    <Card className="">
      <Pressable
        onPress={async () => {
          try { await Haptics.selectionAsync(); } catch { /* ignore */ }
          onToggleCategories();
        }}
        accessibilityRole="button"
        accessibilityLabel="Toggle categories"
        className="min-h-[44px] flex-row justify-between items-center gap-2.5"
      >
        <View className="flex-1">
          <Text className="text-white text-lg font-semibold">Categories</Text>
          <Text className="text-muted-foreground text-sm mt-1">
            Spent vs remaining (grouped).
          </Text>
        </View>
        <View
          className="w-9 h-9 rounded-full justify-center items-center bg-slate-400/10 border border-slate-400/25"
          style={{ transform: [{ rotate: categoriesOpen ? '0deg' : '-90deg' }] }}
        >
          <ChevronDown size={16} color="#CBD5F5" />
        </View>
      </Pressable>

      {categoriesOpen ? (
        <View className="mt-3.5 gap-3.5">
          {BUCKETS.map(({ bucket, title }) => {
            const items = categoriesByBucket[bucket];
            if (!items.length) return null;

            const spent = bucketSpent(bucket);
            const limit = bucketLimit(bucket);
            const pct = limit > 0 ? spent / limit : 0;
            const open = bucketOpen[bucket];

            return (
              <View key={bucket} className="gap-2.5">
                <Pressable
                  onPress={async () => {
                    try { await Haptics.selectionAsync(); } catch { /* ignore */ }
                    setBucketOpen((prev) => ({ ...prev, [bucket]: !prev[bucket] }));
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Toggle ${title} categories`}
                  className="min-h-[44px] px-3 py-2.5 rounded-[18px] bg-slate-950/30 border border-white/10 flex-row justify-between items-center gap-2.5"
                >
                  <View className="flex-1">
                    <Text className="text-slate-200 font-medium text-sm">{title}</Text>
                    <Text className="text-slate-500 text-xs mt-0.5">
                      ₵{formatCurrency(spent)} / ₵{formatCurrency(limit)} • {items.length} categories
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2.5">
                    <View className="w-[90px]">
                      <ProgressBar value={pct} />
                    </View>
                    <View
                      className="w-9 h-9 rounded-full justify-center items-center bg-slate-400/10 border border-slate-400/25"
                      style={{ transform: [{ rotate: open ? '0deg' : '-90deg' }] }}
                    >
                      <ChevronDown size={16} color="#CBD5F5" />
                    </View>
                  </View>
                </Pressable>

                {open ? (
                  <View className="gap-3">
                    {items.map((cat) => {
                      const spentCat = categorySpent(cat.id);
                      const pctCat = cat.limitAmount > 0 ? spentCat / cat.limitAmount : 0;
                      return (
                        <View key={cat.id}>
                          <View className="flex-row justify-between">
                            <View className="flex-row items-center gap-2.5 flex-1 pr-2.5">
                              <Text className="text-slate-200 flex-1">{cat.name}</Text>
                              <Pressable
                                onPress={async () => {
                                  try { await Haptics.selectionAsync(); } catch { /* ignore */ }
                                  onEditLimit({
                                    id: cat.id,
                                    name: cat.name,
                                    current: cat.limitAmount,
                                  });
                                }}
                                accessibilityRole="button"
                                accessibilityLabel={`Edit limit for ${cat.name}`}
                                className="w-9 h-9 rounded-full justify-center items-center bg-slate-400/20 border border-slate-400/25 active:bg-slate-400/30"
                              >
                                <Pencil size={16} color="#CBD5F5" />
                              </Pressable>
                              <Pressable
                                onPress={async () => {
                                  try { await Haptics.selectionAsync(); } catch { /* ignore */ }
                                  onDeleteCategory({ id: cat.id, name: cat.name });
                                }}
                                className="w-9 h-9 rounded-full justify-center items-center bg-red-500/20 border border-red-500/25 active:bg-red-500/30"
                              >
                                <Trash2 size={16} color="#FCA5A5" />
                              </Pressable>
                            </View>
                            <Text className="text-slate-400 font-medium">
                              ₵{formatCurrency(spentCat)} / ₵{formatCurrency(cat.limitAmount)}
                            </Text>
                          </View>
                          <View className="mt-2">
                            <ProgressBar value={pctCat} />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          })}
          <Pressable
            onPress={async () => {
              try { await Haptics.selectionAsync(); } catch { /* ignore */ }
              onAddCustomCategory();
            }}
            className="mt-3 flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-slate-500/40 bg-slate-500/5 py-3 active:opacity-70"
          >
            <Plus size={16} color="#94A3B8" />
            <Text className="text-slate-400 font-medium text-sm">Add custom category</Text>
          </Pressable>
        </View>
      ) : null}
    </Card>
  );
}
