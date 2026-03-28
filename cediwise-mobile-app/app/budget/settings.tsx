import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackButton } from '@/components/BackButton';
import { DEFAULT_STANDARD_HEIGHT, StandardHeader } from '@/components/CediWiseHeader';
import { BudgetModals } from '@/components/features/budget/BudgetModals';
import { BudgetPersonalizationCard } from '@/components/features/budget/BudgetPersonalizationCard';
import { DeleteAllBudgetDataModal } from '@/components/features/budget/DeleteAllBudgetDataModal';
import { useBudgetScreenState } from '@/components/features/budget/useBudgetScreenState';
import { useTourContext } from '@/contexts/TourContext';
import { useAppToast } from '@/hooks/useAppToast';
import { useAuth } from '@/hooks/useAuth';
import { clearOnboardingLocalCache } from '@/utils/onboardingState';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Settings, Sparkles, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AUTH_STORAGE_KEYS = [
  "sb-access-token",
  "sb-refresh-token",
  "supabase.auth.token",
] as const;

function authStorageKeyMatches(key: string): boolean {
  return AUTH_STORAGE_KEYS.some((prefix) => key.includes(prefix));
}

export default function BudgetSettingsScreen() {
  const { user } = useAuth();
  const { resetTourSeen } = useTourContext();
  const { showSuccess, showError } = useAppToast();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { personalization, derived, budget, modals } = useBudgetScreenState();
  const [showDeleteAllBudgetModal, setShowDeleteAllBudgetModal] = useState(false);
  const headerPadding = DEFAULT_STANDARD_HEIGHT + insets.top;

  const handleClearAllLocalStorage = async () => {
    if (!user?.id) return;
    try {
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Warning,
      ).catch(() => {});
      const allKeys = await AsyncStorage.getAllKeys();
      const keysToRemove = allKeys.filter((key) => !authStorageKeyMatches(key));
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }
      await clearOnboardingLocalCache(user.id);
      router.replace("/(tabs)");
      showSuccess(
        "Cleared",
        "App caches were cleared on this device while preserving auth state. Dev testing state is now clean.",
      );
    } catch {
      showError("Error", "Could not clear local storage");
    }
  };

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
            userId={user.id}
            showCta={!personalization.isLoading && !personalization.setupCompleted}
            showSummary={!!derived.vitalsSummary}
            vitalsSummary={derived.vitalsSummary}
          />

          {derived.cycleIsSet && derived.activeCycle && (
            <Pressable
              onPress={() => modals.setShowEditCycleModal(true)}
              className="flex-row items-center justify-between py-4 px-4 rounded-sm bg-slate-500/10 border border-slate-400/20 active:bg-slate-500/20"
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
            onPress={() => setShowDeleteAllBudgetModal(true)}
            className="flex-row items-center justify-between py-4 px-4 rounded-md bg-orange-500/10 border border-orange-500/20 active:bg-orange-500/20"
          >
            <View className="flex-row items-center gap-2">
              <Trash2 size={18} color="#F97316" />
              <Text className="text-orange-400 font-semibold">
                Delete all budget data
              </Text>
            </View>
          </Pressable>

          {__DEV__ ? (
            <>
              <Pressable
                onPress={async () => {
                  try {
                    await Haptics.notificationAsync(
                      Haptics.NotificationFeedbackType.Success,
                    ).catch(() => { });
                    await resetTourSeen();
                    router.replace("/(tabs)");
                    showSuccess(
                      "Reset",
                      "Onboarding state cleared locally and in your account. Home will reopen for fresh testing.",
                    );
                  } catch {
                    showError("Error", "Could not reset tour");
                  }
                }}
                className="flex-row items-center justify-between py-4 px-4 rounded-xl bg-amber-500/10 border border-amber-500/30 active:bg-amber-500/20"
              >
                <View className="flex-row items-center gap-2">
                  <Sparkles size={18} color="#F59E0B" />
                  <Text className="text-amber-400 font-semibold">Reset tour seen</Text>
                </View>
                <Text className="text-slate-400 text-sm">
                  Dev only
                </Text>
              </Pressable>
              <Pressable
                onPress={handleClearAllLocalStorage}
                className="flex-row items-center justify-between py-4 px-4 rounded-xl bg-orange-500/10 border border-orange-500/30 active:bg-orange-500/20"
              >
                <View className="flex-row items-center gap-2">
                  <Trash2 size={18} color="#F97316" />
                  <Text className="text-orange-400 font-semibold">Clear all local storage</Text>
                </View>
                <Text className="text-slate-400 text-sm">
                  Dev only
                </Text>
              </Pressable>
            </>
          ) : null}
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
        showResetConfirm={false}
        setShowResetConfirm={() => {}}
        onResetBudget={async () => {}}
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

      <DeleteAllBudgetDataModal
        visible={showDeleteAllBudgetModal}
        onClose={() => setShowDeleteAllBudgetModal(false)}
        onConfirm={async (removeProfile) => {
          try {
            await budget.deleteAllBudgetData(removeProfile);
          } catch (e) {
            setShowDeleteAllBudgetModal(false);
            showError(
              'Error',
              e instanceof Error ? e.message : 'Failed to delete budget data'
            );
            throw e;
          }
        }}
        onComplete={() => {
          setShowDeleteAllBudgetModal(false);
          setTimeout(() => router.replace('/(tabs)/budget'), 100);
        }}
      />
    </View>
  );
}
