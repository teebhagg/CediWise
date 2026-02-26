import { BackButton } from '@/components/BackButton';
import { DEFAULT_STANDARD_HEIGHT, StandardHeader } from '@/components/CediWiseHeader';
import { BudgetIncomeSourcesCard } from '@/components/features/budget/BudgetIncomeSourcesCard';
import { BudgetModals } from '@/components/features/budget/BudgetModals';
import { useBudgetScreenState } from '@/components/features/budget/useBudgetScreenState';
import { useAuth } from '@/hooks/useAuth';
import { useLayoutEffect, useState } from 'react';
import { LayoutAnimation, Platform, ScrollView, Text, UIManager, View } from 'react-native';
import {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BudgetIncomeScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { form, derived, budget, modals } = useBudgetScreenState();
  const [showIncomeForm, setShowIncomeForm] = useState(false);

  useLayoutEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const toggleIncomeForm = () => {
    LayoutAnimation.configureNext({
      duration: 260,
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    });
    setShowIncomeForm((prev) => !prev);
  };

  const incomeToggleAnim = useSharedValue(showIncomeForm ? 1 : 0);
  useLayoutEffect(() => {
    incomeToggleAnim.value = withTiming(showIncomeForm ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [showIncomeForm, incomeToggleAnim]);

  const incomeToggleChevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(incomeToggleAnim.value, [0, 1], [0, 45])}deg` }],
  }));

  const headerPadding = DEFAULT_STANDARD_HEIGHT + insets.top;

  if (!user?.id) {
    return (
      <View style={{ flex: 1, backgroundColor: 'black' }}>
        <StandardHeader title="Income Sources" leading={<BackButton />} centered />
        <View className="px-5 py-4" style={{ paddingTop: headerPadding }}>
          <Text className="text-slate-400 mt-8 text-center">Sign in to manage income sources.</Text>
        </View>
      </View>
    );
  }

  if (!derived.cycleIsSet) {
    return (
      <View style={{ flex: 1, backgroundColor: 'black' }}>
        <StandardHeader title="Income Sources" leading={<BackButton />} centered />
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
      <StandardHeader title="Income Sources" leading={<BackButton />} centered />
      <View className="px-5 pt-2 pb-4" style={{ paddingTop: headerPadding }}>
        <Text className="text-slate-400 text-sm mt-1">
          Add salary and side hustles so allocations stay realistic.
        </Text>
      </View>

      <ScrollView
        className="px-5"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <BudgetIncomeSourcesCard
          cycleIsSet={derived.cycleIsSet}
          showIncomeForm={showIncomeForm}
          incomeToggleChevronStyle={incomeToggleChevronStyle}
          onToggleIncomeForm={toggleIncomeForm}
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
        editingLimit={null}
        setEditingLimit={() => { }}
        showEditLimitModal={false}
        setShowEditLimitModal={() => { }}
        onUpdateCategoryLimit={async () => { }}
        spendingInsights={null}
        allocationExceededResult={null}
        showAllocationExceededModal={false}
        setShowAllocationExceededModal={() => { }}
        onConfirmAllocationExceeded={async () => { }}
        onCloseAllocationExceeded={() => { }}
        showEditCycleModal={false}
        setShowEditCycleModal={() => { }}
        activeCyclePaydayDay={derived.activeCycle?.paydayDay ?? 1}
        onUpdateCycleDay={async () => { }}
      />
    </View>
  );
}
