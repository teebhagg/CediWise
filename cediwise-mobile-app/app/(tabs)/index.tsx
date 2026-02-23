import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import {
  type StyleProp,
  type ViewStyle,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BudgetTransactionModal } from '@/components/BudgetTransactionModal';
import { DiscoveryHeroCard } from '@/components/features/home/DiscoveryHeroCard';
import { HomeScreenHeader } from '@/components/features/home/HomeScreenHeader';
import { MonthlyActivitiesCard } from '@/components/features/home/MonthlyActivitiesCard';
import { VitalHeroCard } from '@/components/features/home/VitalHeroCard';
import { VitalHeroSkeleton } from '@/components/features/home/VitalHeroSkeleton';
import { useHomeScreenState } from '@/components/features/home/useHomeScreenState';
import { useUpdateCheckContext } from '@/contexts/UpdateCheckContext';
import { StoredUserData } from '@/utils/auth';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { check: checkForUpdate } = useUpdateCheckContext();
  const {
    user,
    headerTitle,
    headerSubtitle,
    authLoading,
    isHomeLoading,
    setupCompleted,
    handleProfilePress,
    budgetState,
    budgetTotals,
    activeCycleId,
    cycleCategories,
    recentExpenses,
    addTransaction,
    incomeTaxSummary,
    refreshing,
    handleRefresh,
    showExpenseModal,
    setShowExpenseModal,
    overviewAnimStyle,
  } = useHomeScreenState();

  const handleRefreshWithUpdateCheck = useCallback(async () => {
    await handleRefresh();
    void checkForUpdate();
  }, [handleRefresh, checkForUpdate]);

  const handleSeeAllPress = useCallback(() => {
    router.push('/expenses');
  }, [router]);

  return (
    <SafeAreaView edges={['top']} style={styles.container} className="flex-1 bg-background">
      <HomeScreenHeader
        user={user as StoredUserData}
        title={headerTitle}
        subtitle={headerSubtitle}
        onProfilePress={handleProfilePress}
        showProfileButton={!authLoading}
      />

      <ScrollView
        className="px-5 py-3"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefreshWithUpdateCheck}
            tintColor="#22C55E"
            colors={['#22C55E']}
            progressViewOffset={Platform.OS === 'android' ? 60 : undefined}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-background">
          {isHomeLoading ? (
            <VitalHeroSkeleton />
          ) : !setupCompleted ? (
            <DiscoveryHeroCard />
          ) : (
            <>
              <VitalHeroCard
                incomeTaxSummary={incomeTaxSummary}
                budgetTotals={budgetTotals}
                animatedStyle={overviewAnimStyle as StyleProp<ViewStyle>}
              />
              <MonthlyActivitiesCard
                recentExpenses={recentExpenses}
                budgetState={budgetState}
                hasActiveCycle={!!activeCycleId}
                onRecordExpensePress={() => setShowExpenseModal(true)}
                onSeeAllPress={handleSeeAllPress}
                animatedStyle={overviewAnimStyle as StyleProp<ViewStyle>}
              />
              <BudgetTransactionModal
                visible={showExpenseModal}
                categories={cycleCategories}
                onClose={() => setShowExpenseModal(false)}
                onSubmit={async ({ amount, note, bucket, categoryId }) => {
                  await addTransaction({ amount, note, bucket, categoryId });
                }}
              />
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
