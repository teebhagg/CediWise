import { BackButton } from '@/components/BackButton';
import { DEFAULT_STANDARD_HEIGHT, StandardHeader } from '@/components/CediWiseHeader';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { BudgetModals } from '@/components/features/budget/BudgetModals';
import { useBudgetScreenState } from '@/components/features/budget/useBudgetScreenState';
import { useAuth } from '@/hooks/useAuth';
import type { BudgetBucket } from '@/types/budget';
import { formatCurrency } from '@/utils/formatCurrency';
import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FILTERS: { key: 'all' | BudgetBucket; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'needs', label: 'Needs' },
  { key: 'wants', label: 'Wants' },
  { key: 'savings', label: 'Savings' },
];

export default function BudgetCategoriesScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { modals, derived, budget } = useBudgetScreenState();
  const [filter, setFilter] = useState<'all' | BudgetBucket>('all');

  const headerPadding = DEFAULT_STANDARD_HEIGHT + insets.top;

  const flatCategories = useMemo(
    () => [
      ...derived.categoriesByBucket.needs,
      ...derived.categoriesByBucket.wants,
      ...derived.categoriesByBucket.savings,
    ],
    [derived.categoriesByBucket],
  );

  const visibleCategories = useMemo(() => {
    if (filter === 'all') return flatCategories;
    return flatCategories.filter((c) => c.bucket === filter);
  }, [filter, flatCategories]);

  if (!user?.id) {
    return (
      <View style={{ flex: 1, backgroundColor: 'black' }}>
        <StandardHeader title="Categories" leading={<BackButton />} centered />
        <View className="px-5 py-4" style={{ paddingTop: headerPadding }}>
          <Text className="text-slate-400 mt-8 text-center">Sign in to manage categories.</Text>
        </View>
      </View>
    );
  }

  if (!derived.activeCycleId) {
    return (
      <View style={{ flex: 1, backgroundColor: 'black' }}>
        <StandardHeader title="Categories" leading={<BackButton />} centered />
        <View className="px-5 py-4" style={{ paddingTop: headerPadding }}>
          <Text className="text-slate-400 mt-8 text-center">
            Set up your budget cycle first.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <StandardHeader title="Categories" leading={<BackButton />} centered />
      <ScrollView
        className="px-5"
        contentContainerStyle={{ paddingTop: headerPadding + 10, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-5">
          <View>
            <Text className="text-white text-2xl font-bold">Budget Categories</Text>
            <Text className="text-slate-400 text-sm mt-2">
              Keep this simple: pick a bucket filter, then add or edit limits.
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-2">
            {FILTERS.map((item) => {
              const selected = filter === item.key;
              return (
                <SecondaryButton
                  key={item.key}
                  onPress={() => setFilter(item.key)}
                  className={selected ? 'bg-emerald-500/20 border border-emerald-400/50' : ''}
                >
                  {item.label}
                </SecondaryButton>
              );
            })}
          </View>

          <Card>
            <PrimaryButton
              onPress={() => modals.setShowAddCustomCategoryModal(true)}
              className="justify-center"
            >
              Add category
            </PrimaryButton>
          </Card>

          {visibleCategories.length === 0 ? (
            <Card>
              <Text className="text-white text-base font-semibold">No categories yet</Text>
              <Text className="text-slate-400 text-sm mt-2">
                Add your first category to start tracking this cycle.
              </Text>
            </Card>
          ) : (
            <View className="gap-3">
              {visibleCategories.map((cat) => (
                <Card key={cat.id}>
                  <View className="flex-row items-center justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-white text-base font-semibold" numberOfLines={1}>
                        {cat.name}
                      </Text>
                      <Text className="text-slate-400 text-xs mt-1 capitalize">{cat.bucket}</Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-emerald-300 text-base font-bold">
                        ₵{formatCurrency(cat.limitAmount)}
                      </Text>
                      <SecondaryButton
                        onPress={() => {
                          modals.setEditingLimit({
                            id: cat.id,
                            name: cat.name,
                            current: cat.limitAmount,
                          });
                          modals.setShowEditLimitModal(true);
                        }}
                        className="mt-2"
                      >
                        Edit
                      </SecondaryButton>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <BudgetModals
        showAddCustomCategoryModal={modals.showAddCustomCategoryModal}
        setShowAddCustomCategoryModal={modals.setShowAddCustomCategoryModal}
        onAddCategory={modals.handleAddCategory}
        showTxModal={false}
        setShowTxModal={() => { }}
        cycleCategories={derived.cycleCategories}
        needsOverLimitFor={derived.needsOverLimitFor}
        onAddTransaction={async () => { }}
        pendingConfirm={null}
        setPendingConfirm={() => { }}
        showNeedsOverModal={false}
        setShowNeedsOverModal={() => { }}
        showResetConfirm={false}
        setShowResetConfirm={() => { }}
        onResetBudget={async () => { }}
        categoryToDelete={modals.categoryToDelete}
        setCategoryToDelete={modals.setCategoryToDelete}
        showDeleteCategoryConfirm={modals.showDeleteCategoryConfirm}
        setShowDeleteCategoryConfirm={modals.setShowDeleteCategoryConfirm}
        onDeleteCategory={async (id) => {
          await budget.deleteCategory(id);
          await budget.reload();
        }}
        incomeToDelete={null}
        setIncomeToDelete={() => { }}
        showDeleteIncomeConfirm={false}
        setShowDeleteIncomeConfirm={() => { }}
        onDeleteIncomeSource={async () => { }}
        incomeToEdit={null}
        setIncomeToEdit={() => { }}
        showEditIncomeModal={false}
        setShowEditIncomeModal={() => { }}
        onUpdateIncomeSource={async () => { }}
        editingLimit={modals.editingLimit}
        setEditingLimit={modals.setEditingLimit}
        showEditLimitModal={modals.showEditLimitModal}
        setShowEditLimitModal={modals.setShowEditLimitModal}
        onUpdateCategoryLimit={modals.handleUpdateCategoryLimit}
        spendingInsights={null}
        allocationExceededResult={modals.allocationExceededResult}
        showAllocationExceededModal={modals.showAllocationExceededModal}
        setShowAllocationExceededModal={modals.setShowAllocationExceededModal}
        onConfirmAllocationExceeded={modals.onConfirmAllocationExceeded}
        onCloseAllocationExceeded={modals.handleCloseAllocationExceeded}
        showEditCycleModal={false}
        setShowEditCycleModal={() => { }}
        activeCyclePaydayDay={derived.activeCycle?.paydayDay ?? 1}
        onUpdateCycleDay={async () => { }}
      />
    </View>
  );
}
