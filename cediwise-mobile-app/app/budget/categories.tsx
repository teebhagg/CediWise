import { BackButton } from '@/components/BackButton';
import { BudgetCategoriesCard } from '@/components/features/budget/BudgetCategoriesCard';
import { BudgetModals } from '@/components/features/budget/BudgetModals';
import { useBudgetScreenState } from '@/components/features/budget/useBudgetScreenState';
import { useAuth } from '@/hooks/useAuth';
import type { BudgetBucket } from '@/types/budget';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BudgetCategoriesScreen() {
  const { user } = useAuth();
  const { modals, derived, budget } = useBudgetScreenState();
  const [categoriesOpen, setCategoriesOpen] = useState(true);
  const [bucketOpen, setBucketOpen] = useState<Record<BudgetBucket, boolean>>({
    needs: true,
    wants: false,
    savings: false,
  });

  const showAddModal = modals.showAddCustomCategoryModal;
  const setShowAddModal = modals.setShowAddCustomCategoryModal;

  if (!user?.id) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
        <View className="px-5 py-4">
          <BackButton />
          <Text className="text-slate-400 mt-8 text-center">Sign in to manage categories.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!derived.activeCycleId || derived.cycleCategories.length === 0) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
        <View className="px-5 py-4">
          <BackButton />
          <Text className="text-slate-400 mt-8 text-center">
            Set up your budget and add income sources first.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
      <View className="px-5 pt-2 pb-4">
        <BackButton />
        <Text className="text-white text-2xl font-bold mt-2">Categories</Text>
        <Text className="text-slate-400 text-sm mt-1">
          Spent vs remaining, grouped by Needs, Wants, Savings.
        </Text>
      </View>

      <ScrollView
        className="px-5"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <BudgetCategoriesCard
          visible
          categoriesOpen={categoriesOpen}
          onToggleCategories={() => setCategoriesOpen((v) => !v)}
          bucketOpen={bucketOpen}
          setBucketOpen={setBucketOpen}
          categoriesByBucket={derived.categoriesByBucket}
          activeCycleId={derived.activeCycleId}
          transactions={budget.state?.transactions ?? []}
          totals={budget.totals}
          onEditLimit={(cat) => {
            modals.setEditingLimit(cat);
            modals.setShowEditLimitModal(true);
          }}
          onDeleteCategory={(cat) => {
            modals.setCategoryToDelete(cat);
            modals.setShowDeleteCategoryConfirm(true);
          }}
          onAddCustomCategory={() => modals.setShowAddCustomCategoryModal(true)}
        />
      </ScrollView>

      <BudgetModals
        showAddCustomCategoryModal={showAddModal}
        setShowAddCustomCategoryModal={setShowAddModal}
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
    </SafeAreaView>
  );
}
