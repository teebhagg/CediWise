import { BudgetLoadingSkeleton } from '@/components/BudgetLoading';
import { Card } from '@/components/Card';
import { ApplyVitalsCard } from '@/components/features/budget/ApplyVitalsCard';
import { BudgetAllocationCard } from '@/components/features/budget/BudgetAllocationCard';
import { BudgetCategoriesCard } from '@/components/features/budget/BudgetCategoriesCard';
import { BudgetCurrentCycleCard } from '@/components/features/budget/BudgetCurrentCycleCard';
import { BudgetExpensesCard } from '@/components/features/budget/BudgetExpensesCard';
import { BudgetHealthScoreCard } from '@/components/features/budget/BudgetHealthScoreCard';
import { BudgetIncomeSourcesCard } from '@/components/features/budget/BudgetIncomeSourcesCard';
import { BudgetModals } from '@/components/features/budget/BudgetModals';
import { BudgetPendingSyncCard } from '@/components/features/budget/BudgetPendingSyncCard';
import { BudgetPersonalizationCard } from '@/components/features/budget/BudgetPersonalizationCard';
import { BudgetScreenHeader } from '@/components/features/budget/BudgetScreenHeader';
import { BudgetSetupCycleCard } from '@/components/features/budget/BudgetSetupCycleCard';
import { BudgetSpendingInsightsCard } from '@/components/features/budget/BudgetSpendingInsightsCard';
import { BudgetToolsCard } from '@/components/features/budget/BudgetToolsCard';
import { useBudgetScreenState } from '@/components/features/budget/useBudgetScreenState';
import { useAppToast } from '@/hooks/useAppToast';
import { useRouter } from 'expo-router';
import { Platform, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BudgetScreen() {
  const router = useRouter();
  const {
    user,
    personalization,
    budget,
    refreshing,
    onRefresh,
    form,
    derived,
    ui,
    modals,
  } = useBudgetScreenState();
  const { showSuccess, showError } = useAppToast();

  const handleApplyVitals = async () => {
    const v = derived.vitalsSummary?.v;
    if (!v) return;
    const payday = v.payday_day ?? 25;
    const needsPct = typeof v.needs_pct === 'number' ? v.needs_pct : 0.5;
    const wantsPct = typeof v.wants_pct === 'number' ? v.wants_pct : 0.3;
    const savingsPct = typeof v.savings_pct === 'number' ? v.savings_pct : 0.2;

    const fixedAmountsByCategory: Record<string, number> = {};
    if (v.rent > 0) fixedAmountsByCategory['Rent'] = v.rent;
    if (v.tithe_remittance > 0) fixedAmountsByCategory['Tithes/Church'] = v.tithe_remittance;
    if (v.debt_obligations > 0) fixedAmountsByCategory['Debt Payments'] = v.debt_obligations;
    if (v.utilities_total > 0) {
      if (v.utilities_mode === 'precise') {
        if (v.utilities_ecg > 0) fixedAmountsByCategory['ECG'] = v.utilities_ecg;
        if (v.utilities_water > 0) fixedAmountsByCategory['Ghana Water'] = v.utilities_water;
      } else {
        fixedAmountsByCategory['ECG'] = Math.round(v.utilities_total * 0.6);
        fixedAmountsByCategory['Ghana Water'] = Math.round(v.utilities_total * 0.4);
      }
    }

    await budget.setupBudget({
      paydayDay: payday,
      needsPct,
      wantsPct,
      savingsPct,
      interests: v.interests ?? [],
      fixedAmountsByCategory: Object.keys(fixedAmountsByCategory).length > 0 ? fixedAmountsByCategory : undefined,
    });

    if (v.stable_salary > 0) {
      await budget.addIncomeSource({
        name: 'Monthly Basic Salary',
        type: 'primary',
        amount: v.stable_salary,
        applyDeductions: v.auto_tax,
      });
    }
    if (v.side_income > 0) {
      await budget.addIncomeSource({
        name: 'Side Hustle',
        type: 'side',
        amount: v.side_income,
        applyDeductions: false,
      });
    }

    await budget.reload();
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: 'black' }} className="flex-1 bg-background">
      <BudgetScreenHeader
        syncPillVisible={budget.isSyncing || refreshing || budget.retryIn !== null}
        syncPillLabel={derived.syncPillLabel}
        pendingCount={budget.pendingCount}
        showResetButton={!!user && !(budget.isSyncing || refreshing)}
        onResetPress={() => modals.setShowResetConfirm(true)}
      />

      <ScrollView
        className="px-5 py-3"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              onRefresh().then(() => {
                showSuccess('Sync successful', 'Your budget has been synced successfully');
              }).catch(() => {
                showError('Error', 'Failed to sync budget');
              });
            }}
            tintColor="#22C55E"
            colors={['#22C55E']}
            progressViewOffset={Platform.OS === 'android' ? 60 : undefined}
          />
        }
      >
        <View className="gap-4 mb-6">
          <BudgetPersonalizationCard
            showCta={!!user && !personalization.isLoading && !personalization.setupCompleted}
            showSummary={!!user && !!derived.vitalsSummary}
            vitalsSummary={derived.vitalsSummary}
          />

          <BudgetToolsCard visible={!!user && derived.cycleIsSet} />

          <ApplyVitalsCard
            visible={
              !!user &&
              !!derived.vitalsSummary &&
              (!derived.cycleIsSet || !derived.hasIncomeSources)
            }
            onApply={handleApplyVitals}
          />

          <BudgetPendingSyncCard
            visible={budget.pendingCount > 0}
            onRetry={async () => budget.syncNow()}
          />

          {!user ? (
            <Card>
              <Text className="text-white text-lg font-semibold">Sign in to use Budget</Text>
              <Text className="text-muted-foreground text-sm mt-2">
                Budget data is tied to your account for syncing.
              </Text>
            </Card>
          ) : budget.isLoading ? (
            <BudgetLoadingSkeleton />
          ) : (
            <>
              {!budget.state?.prefs?.paydayDay ? (
                <BudgetSetupCycleCard
                  paydayDay={form.paydayDay}
                  cycleDayError={form.cycleDayError}
                  onPaydayChange={form.handlePaydayChange}
                  onCreateBudget={async () => {
                    const day = Math.max(
                      1,
                      Math.min(31, parseInt(form.paydayDay || '25', 10))
                    );
                    await budget.setupBudget({ paydayDay: day });
                  }}
                />
              ) : null}

              <BudgetCurrentCycleCard
                cycle={derived.activeCycle}
                cycleIsSet={derived.cycleIsSet}
                onEditCycle={() => modals.setShowEditCycleModal(true)}
              />

              <BudgetHealthScoreCard
                visible={
                  !!ui.budgetHealthScore &&
                  derived.cycleIsSet &&
                  derived.hasIncomeSources
                }
                score={ui.budgetHealthScore?.score ?? 0}
                label={
                  (ui.budgetHealthScore?.score ?? 0) >= 75
                    ? 'On track'
                    : (ui.budgetHealthScore?.score ?? 0) >= 50
                      ? 'Needs attention'
                      : 'At risk'
                }
                summary={ui.budgetHealthScore?.summary}
              />
              <BudgetSpendingInsightsCard
                visible={
                  derived.cycleIsSet &&
                  !!derived.activeCycleId &&
                  derived.cycleCategories.length > 0
                }
                loading={ui.spendingInsightsLoading}
                insights={ui.spendingInsights}
                advisorRecommendations={ui.advisorRecommendations}
              />

              <BudgetIncomeSourcesCard
                cycleIsSet={derived.cycleIsSet}
                showIncomeForm={ui.showIncomeForm}
                incomeToggleChevronStyle={derived.incomeToggleChevronStyle}
                onToggleIncomeForm={ui.toggleIncomeForm}
                incomeName={form.incomeName}
                setIncomeName={form.setIncomeName}
                incomeType={form.incomeType}
                setIncomeType={form.setIncomeType}
                incomeAmount={form.incomeAmount}
                setIncomeAmount={form.setIncomeAmount}
                applyDeductions={form.applyDeductions}
                setApplyDeductions={form.setApplyDeductions}
                incomeSources={budget.state?.incomeSources ?? []}
                incomeAccentColors={derived.incomeAccentColors}
                onAddIncome={async () => {
                  const amt = parseFloat(form.incomeAmount) || 0;
                  await budget.addIncomeSource({
                    name: form.incomeName,
                    type: form.incomeType,
                    amount: amt,
                    applyDeductions: form.applyDeductions,
                  });
                  form.setIncomeAmount('');
                }}
                onEditIncome={(src) => {
                  modals.setIncomeToEdit({
                    id: src.id,
                    name: src.name,
                    type: src.type,
                    amount: src.amount,
                    applyDeductions: src.applyDeductions,
                  });
                  modals.setShowEditIncomeModal(true);
                }}
                onDeleteIncome={(src) => {
                  modals.setIncomeToDelete(src);
                  modals.setShowDeleteIncomeConfirm(true);
                }}
              />

              <BudgetAllocationCard
                visible={!!budget.totals && derived.hasIncomeSources}
                allocationTitle={derived.allocationTitle}
                totals={budget.totals}
              />

              <BudgetCategoriesCard
                visible={derived.cycleCategories.length > 0 && derived.hasIncomeSources}
                categoriesOpen={ui.categoriesOpen}
                onToggleCategories={() => ui.setCategoriesOpen((v) => !v)}
                bucketOpen={ui.bucketOpen}
                setBucketOpen={ui.setBucketOpen}
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

              <BudgetExpensesCard
                visible={derived.cycleIsSet}
                activeCycleId={derived.activeCycleId}
                filter={ui.filter}
                setFilter={ui.setFilter}
                transactions={derived.cycleTransactions}
                categories={derived.cycleCategories.map((c) => ({ id: c.id, name: c.name }))}
                onLogExpense={() => modals.setShowTxModal(true)}
                onShowMore={() => router.push('/expenses')}
              />
            </>
          )}
        </View>
      </ScrollView>

      <BudgetModals
        showAddCustomCategoryModal={modals.showAddCustomCategoryModal}
        setShowAddCustomCategoryModal={modals.setShowAddCustomCategoryModal}
        onAddCategory={modals.handleAddCategory}
        showTxModal={modals.showTxModal}
        setShowTxModal={modals.setShowTxModal}
        cycleCategories={derived.cycleCategories}
        needsOverLimitFor={derived.needsOverLimitFor}
        onAddTransaction={async (params) => {
          await budget.addTransaction(params);
        }}
        pendingConfirm={modals.pendingConfirm}
        setPendingConfirm={modals.setPendingConfirm}
        showNeedsOverModal={modals.showNeedsOverModal}
        setShowNeedsOverModal={modals.setShowNeedsOverModal}
        showResetConfirm={modals.showResetConfirm}
        setShowResetConfirm={modals.setShowResetConfirm}
        onResetBudget={async () => {
          modals.setShowResetConfirm(false);
          await budget.resetBudget();
          await budget.reload();
        }}
        categoryToDelete={modals.categoryToDelete}
        setCategoryToDelete={modals.setCategoryToDelete}
        showDeleteCategoryConfirm={modals.showDeleteCategoryConfirm}
        setShowDeleteCategoryConfirm={modals.setShowDeleteCategoryConfirm}
        onDeleteCategory={async (id) => {
          await budget.deleteCategory(id);
          await budget.reload();
        }}
        incomeToDelete={modals.incomeToDelete}
        setIncomeToDelete={modals.setIncomeToDelete}
        showDeleteIncomeConfirm={modals.showDeleteIncomeConfirm}
        setShowDeleteIncomeConfirm={modals.setShowDeleteIncomeConfirm}
        onDeleteIncomeSource={async (id) => {
          await budget.deleteIncomeSource(id);
          await budget.reload();
        }}
        incomeToEdit={modals.incomeToEdit}
        setIncomeToEdit={modals.setIncomeToEdit}
        showEditIncomeModal={modals.showEditIncomeModal}
        setShowEditIncomeModal={modals.setShowEditIncomeModal}
        onUpdateIncomeSource={async (id, next) => {
          if (!modals.incomeToEdit) return;
          await budget.updateIncomeSource(id, {
            name: next.name ?? modals.incomeToEdit.name,
            type: next.type ?? modals.incomeToEdit.type,
            amount: next.amount ?? modals.incomeToEdit.amount,
            applyDeductions: next.applyDeductions ?? modals.incomeToEdit.applyDeductions,
          });
          await budget.reload();
        }}
        editingLimit={modals.editingLimit}
        setEditingLimit={modals.setEditingLimit}
        showEditLimitModal={modals.showEditLimitModal}
        setShowEditLimitModal={modals.setShowEditLimitModal}
        onUpdateCategoryLimit={modals.handleUpdateCategoryLimit}
        allocationExceededResult={modals.allocationExceededResult}
        showAllocationExceededModal={modals.showAllocationExceededModal}
        setShowAllocationExceededModal={modals.setShowAllocationExceededModal}
        onConfirmAllocationExceeded={modals.onConfirmAllocationExceeded}
        onCloseAllocationExceeded={modals.handleCloseAllocationExceeded}
        showEditCycleModal={modals.showEditCycleModal}
        setShowEditCycleModal={modals.setShowEditCycleModal}
        activeCyclePaydayDay={derived.activeCycle?.paydayDay ?? 1}
        onUpdateCycleDay={async (nextDay) => {
          await budget.updateCycleDay(nextDay);
          await budget.reload();
        }}
      />
    </SafeAreaView>
  );
}
