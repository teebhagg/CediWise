import {
    type StyleProp,
    type ViewStyle,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BudgetSnapshotSection } from '@/components/features/home/BudgetSnapshotSection';
import { HomeOverviewSection } from '@/components/features/home/HomeOverviewSection';
import { HomeScreenHeader } from '@/components/features/home/HomeScreenHeader';
import { RecentExpensesSection } from '@/components/features/home/RecentExpensesSection';
import { SalaryDashboardSection } from '@/components/features/home/SalaryDashboardSection';
import { useHomeScreenState } from '@/components/features/home/useHomeScreenState';
import { StoredUserData } from '@/utils/auth';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
});

export default function DashboardScreen() {
    const insets = useSafeAreaInsets();
    const {
        user,
        headerTitle,
        headerSubtitle,
        authLoading,
        handleProfilePress,
        budgetState,
        budgetTotals,
        showBudgetSnapshot,
        activeCycleId,
        cycleCategories,
        recentExpenses,
        addTransaction,
        incomeTaxSummary,
        salary,
        setSalary,
        estimateTaxEnabled,
        setEstimateTaxEnabled,
        vitalsSnapshot,
        refreshing,
        handleRefresh,
        showExpenseModal,
        setShowExpenseModal,
        overviewAnimStyle,
        salaryAnimStyle,
        ledgerAnimStyle,
    } = useHomeScreenState();

    return (
        <SafeAreaView edges={['top']} style={styles.container} className="flex-1 bg-background">
            {/* <StatusBar barStyle="light-content" translucent animated /> */}

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
                        onRefresh={handleRefresh}
                        tintColor="#22C55E"
                        colors={['#22C55E']}
                        progressViewOffset={Platform.OS === 'android' ? 60 : undefined}
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                <View className="bg-background">
                    <HomeOverviewSection
                        incomeTaxSummary={incomeTaxSummary}
                        animatedStyle={overviewAnimStyle as StyleProp<ViewStyle>}
                    />

                    {showBudgetSnapshot && budgetTotals && (
                        <BudgetSnapshotSection
                            budgetTotals={budgetTotals}
                            animatedStyle={salaryAnimStyle as StyleProp<ViewStyle>}
                        />
                    )}

                    <SalaryDashboardSection
                        incomeTaxSummary={incomeTaxSummary}
                        salary={salary}
                        onSalaryChange={setSalary}
                        estimateTaxEnabled={estimateTaxEnabled}
                        onToggleTaxEstimate={() => setEstimateTaxEnabled((v) => !v)}
                        vitals={vitalsSnapshot}
                        animatedStyle={salaryAnimStyle as StyleProp<ViewStyle>}
                    />

                    <RecentExpensesSection
                        activeCycleId={activeCycleId}
                        cycleCategories={cycleCategories}
                        recentExpenses={recentExpenses}
                        budgetState={budgetState}
                        onLogExpensePress={() => setShowExpenseModal(true)}
                        onAddTransaction={addTransaction}
                        showExpenseModal={showExpenseModal}
                        onCloseExpenseModal={() => setShowExpenseModal(false)}
                        animatedStyle={ledgerAnimStyle as StyleProp<ViewStyle>}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
