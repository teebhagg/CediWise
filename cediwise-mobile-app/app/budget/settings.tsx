import { BackButton } from '@/components/BackButton';
import { DEFAULT_STANDARD_HEIGHT, StandardHeader } from '@/components/CediWiseHeader';
import { BudgetModals } from '@/components/features/budget/BudgetModals';
import { BudgetPersonalizationCard } from '@/components/features/budget/BudgetPersonalizationCard';
import { useBudgetScreenState } from '@/components/features/budget/useBudgetScreenState';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'expo-router';
import { RotateCcw, Settings } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BudgetSettingsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { personalization, derived, budget, modals } = useBudgetScreenState();
  const headerPadding = DEFAULT_STANDARD_HEIGHT + insets.top;

  if (!user?.id) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
        <StandardHeader title="Budget Settings" leading={<BackButton />} centered />
        <View className="px-5 py-4" style={{ paddingTop: headerPadding }}>
          <Text className="text-slate-400 mt-8 text-center">Sign in to manage budget settings.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
      <StandardHeader title="Budget Settings" leading={<BackButton />} centered />
      <View className="px-5 pt-2 pb-4" style={{ paddingTop: headerPadding }}>
        <Text className="text-slate-400 text-sm mt-1">
          Personalization, cycle, and reset options.
        </Text>
      </View>

      <ScrollView
        className="px-5"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-4">
          <BudgetPersonalizationCard
            showCta={!personalization.isLoading && !personalization.setupCompleted}
            showSummary={!!derived.vitalsSummary}
            vitalsSummary={derived.vitalsSummary}
          />

          {derived.cycleIsSet && derived.activeCycle && (
            <Pressable
              onPress={() => modals.setShowEditCycleModal(true)}
              className="flex-row items-center justify-between py-4 px-4 rounded-xl bg-slate-500/10 border border-slate-400/20 active:bg-slate-500/20"
            >
              <View>
                <Text className="text-white font-semibold">Edit payday day</Text>
                <Text className="text-slate-400 text-sm mt-0.5">
                  Current: Day {derived.activeCycle.paydayDay}
                </Text>
              </View>
              <Settings size={18} color="#94A3B8" />
            </Pressable>
          )}

          <Pressable
            onPress={() => modals.setShowResetConfirm(true)}
            className="flex-row items-center justify-between py-4 px-4 rounded-xl bg-orange-500/10 border border-orange-500/20 active:bg-orange-500/20"
          >
            <View className="flex-row items-center gap-2">
              <RotateCcw size={18} color="#F97316" />
              <Text className="text-orange-400 font-semibold">Reset Budget</Text>
            </View>
            <Text className="text-slate-400 text-sm">
              Clears all budget data
            </Text>
          </Pressable>
        </View>
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
        showResetConfirm={modals.showResetConfirm}
        setShowResetConfirm={modals.setShowResetConfirm}
        onResetBudget={async () => {
          modals.setShowResetConfirm(false);
          await budget.resetBudget();
          await budget.reload();
        }}
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
        showEditCycleModal={modals.showEditCycleModal}
        setShowEditCycleModal={modals.setShowEditCycleModal}
        activeCyclePaydayDay={derived.activeCycle?.paydayDay ?? 1}
        onUpdateCycleDay={async (nextDay) => {
          await budget.updateCycleDay(nextDay);
          await budget.reload();
        }}
      />
    </View>
  );
}
