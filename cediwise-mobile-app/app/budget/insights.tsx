import { BackButton } from '@/components/BackButton';
import { DEFAULT_STANDARD_HEIGHT, StandardHeader } from '@/components/CediWiseHeader';
import { BudgetModals } from '@/components/features/budget/BudgetModals';
import {
  BudgetSpendingInsightsCard,
  type AdvisorRecommendation,
} from '@/components/features/budget/BudgetSpendingInsightsCard';
import { useBudgetScreenState } from '@/components/features/budget/useBudgetScreenState';
import { useAuth } from '@/hooks/useAuth';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BudgetInsightsScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { derived, budget, modals, ui } = useBudgetScreenState();
  const headerPadding = DEFAULT_STANDARD_HEIGHT + insets.top;

  const handleApplyLimitAdjustment = (rec: AdvisorRecommendation) => {
    if (rec.categoryId && rec.context != null && rec.currentLimit != null) {
      modals.setEditingLimit({
        id: rec.categoryId,
        name: rec.context,
        current: rec.currentLimit,
        suggestedLimit: rec.suggestedLimit,
      });
      modals.setShowEditLimitModal(true);
    }
  };

  if (!user?.id) {
    return (
      <View style={{ flex: 1, backgroundColor: 'black' }}>
        <StandardHeader title="Spending Insights" leading={<BackButton />} centered />
        <View className="px-5 py-4" style={{ paddingTop: headerPadding }}>
          <Text className="text-slate-400 mt-8 text-center">Sign in to view insights.</Text>
        </View>
      </View>
    );
  }

  if (!derived.activeCycleId || derived.cycleCategories.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: 'black' }}>
        <StandardHeader title="Spending Insights" leading={<BackButton />} centered />
        <View className="px-5 py-4" style={{ paddingTop: headerPadding }}>
          <Text className="text-slate-400 mt-8 text-center">
            Add categories and log expenses to see insights.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <StandardHeader title="Spending Insights" leading={<BackButton />} centered />
      <View className="px-5 pt-2 pb-4" style={{ paddingTop: headerPadding }}>
        <Text className="text-slate-400 text-sm mt-1">
          AI-powered recommendations and category analysis.
        </Text>
      </View>

      <ScrollView
        className="px-5"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <BudgetSpendingInsightsCard
          visible
          loading={ui.spendingInsightsLoading}
          insights={ui.spendingInsights}
          advisorRecommendations={ui.advisorRecommendations}
          onApplyLimitAdjustment={handleApplyLimitAdjustment}
          maxRecommendations={Infinity}
          maxInsights={Infinity}
        />
      </ScrollView>

      <BudgetModals
        showAddCustomCategoryModal={false}
        setShowAddCustomCategoryModal={() => { }}
        onAddCategory={async () => { }}
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
        categoryToDelete={null}
        setCategoryToDelete={() => { }}
        showDeleteCategoryConfirm={false}
        setShowDeleteCategoryConfirm={() => { }}
        onDeleteCategory={async () => { }}
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
        spendingInsights={ui.spendingInsights}
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
