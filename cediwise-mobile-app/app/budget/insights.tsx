import { BackButton } from '@/components/BackButton';
import {
  DEFAULT_STANDARD_HEIGHT,
  ExpandedHeader,
} from '@/components/CediWiseHeader';
import { BudgetModals } from '@/components/features/budget/BudgetModals';
import { useBudgetScreenState } from '@/components/features/budget/useBudgetScreenState';
import { CategoryBreakdownRow } from '@/components/features/budget/insights/CategoryBreakdownRow';
import { InsightsChartToggle } from '@/components/features/budget/insights/InsightsChartToggle';
import { InsightsRangeSelector } from '@/components/features/budget/insights/InsightsRangeSelector';
import {
  buildInsightsRangeData,
  buildRecurringCommitmentInsights,
  type InsightsRangeKey,
  type RecurringCommitmentInsight,
} from '@/components/features/budget/insights/insightsData';
import { SpendingInsightsChart } from '@/components/features/budget/insights/SpendingInsightsCharts';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/utils/formatCurrency';
import { FlashList } from '@shopify/flash-list';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Receipt } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useTierContext } from '@/contexts/TierContext';
import {
  getExpandedHeaderScrollPaddingTop,
  INSIGHTS_EXPANDED_HEADER_HEIGHT,
} from '@/utils/screenHeaderInsets';

export default function BudgetInsightsScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { canAccessBudget } = useTierContext();
  const { derived, budget, modals, ui, router } = useBudgetScreenState();

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const [chartType, setChartType] = useState<'bar' | 'line' | 'donut'>('bar');
  const [range, setRange] = useState<InsightsRangeKey>('6M');

  const flashListRef = useRef<FlashList>(null);

  useEffect(() => {
    flashListRef.current?.scrollToOffset({
      offset: 0,
      animated: true,
    });
  }, [range, chartType]);

  const insightsData = useMemo(
    () =>
      buildInsightsRangeData({
        range,
        cycles: budget.state?.cycles ?? [],
        transactions: budget.state?.transactions ?? [],
        categories: budget.state?.categories ?? [],
      }),
    [
      range,
      budget.state?.cycles,
      budget.state?.transactions,
      budget.state?.categories,
    ],
  );

  const recurringInsights = useMemo(
    () =>
      budget.totals
        ? buildRecurringCommitmentInsights({
            monthlyNetIncome: budget.totals.monthlyNetIncome,
            totalRecurringMonthly: budget.totals.totalRecurringMonthly,
            disposableIncome: budget.totals.disposableIncome,
            totalSpentInRange: insightsData.totalSpent,
            spentWindowSpanDays: insightsData.spentWindowSpanDays,
          })
        : [],
    [budget.totals, insightsData.totalSpent, insightsData.spentWindowSpanDays],
  );

  const renderRecurringInsight = useCallback(
    ({ item: ins }: { item: RecurringCommitmentInsight }) => (
      <View
        className={`rounded-2xl border px-4 py-3 ${
          ins.variant === 'warning'
            ? 'border-amber-500/40 bg-amber-500/10'
            : 'border-white/10 bg-white/5'
        }`}>
        <Text className="text-white font-semibold text-sm">{ins.title}</Text>
        <Text className="text-white/70 text-xs mt-2 leading-5">{ins.body}</Text>
      </View>
    ),
    [],
  );

  const recurringInsightSeparator = useCallback(
    () => <View style={{ height: 12 }} />,
    [],
  );

  const renderCategoryBreakdownRow = useCallback(
    ({ item }: { item: (typeof insightsData.categoryBreakdown)[number] }) => (
      <View className="px-5 mt-3">
        <CategoryBreakdownRow item={item} />
      </View>
    ),
    [insightsData.categoryBreakdown],
  );

  useEffect(() => {
    if (!canAccessBudget) {
      router.replace("/(tabs)/budget");
    }
  }, [canAccessBudget, router]);

  if (!canAccessBudget) {
    return null;
  }

  if (!user?.id) {
    return (
      <View style={{ flex: 1, backgroundColor: 'black' }}>
        <ExpandedHeader scrollY={scrollY} title="Spending Insights" leading={<BackButton />} />
        <View
          className="px-5 py-4"
          style={{
            paddingTop: getExpandedHeaderScrollPaddingTop(insets.top, {
              expandedHeight: INSIGHTS_EXPANDED_HEADER_HEIGHT,
            }),
          }}>
          <Text className="text-white mt-8 text-center">Sign in to view insights.</Text>
        </View>
      </View>
    );
  }

  if (!derived.activeCycleId || derived.cycleCategories.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: 'black' }}>
        <ExpandedHeader scrollY={scrollY} title="Spending Insights" leading={<BackButton />} />
        <View
          className="px-5 py-4"
          style={{
            paddingTop: getExpandedHeaderScrollPaddingTop(insets.top, {
              expandedHeight: INSIGHTS_EXPANDED_HEADER_HEIGHT,
            }),
          }}>
          <Text className="text-white mt-8 text-center">
            Add categories and log expenses to see insights.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <ExpandedHeader
        scrollY={scrollY}
        title="Spending Insights"
        collapsedTitle="Insights"
        expandedHeight={INSIGHTS_EXPANDED_HEADER_HEIGHT}
        leading={<BackButton />}
        actions={[
          <InsightsChartToggle key="toggle" value={chartType} onChange={setChartType} />,
        ]}
      />

      <AnimatedFlashList
        ref={flashListRef}
        data={insightsData.categoryBreakdown}
        keyExtractor={(item) => item.categoryId}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        snapToOffsets={[
          0,
          INSIGHTS_EXPANDED_HEADER_HEIGHT - DEFAULT_STANDARD_HEIGHT,
        ]}
        snapToEnd={false}
        decelerationRate="fast"
        estimatedItemSize={76}
        contentContainerStyle={{
          paddingBottom: 120,
          paddingTop: getExpandedHeaderScrollPaddingTop(insets.top, {
            expandedHeight: INSIGHTS_EXPANDED_HEADER_HEIGHT,
          }),
        }}
        ListHeaderComponent={
          <View className="px-5">
            <View className="mt-2">
              <Text className="text-white text-sm">Total spent</Text>
              <Text className="text-white text-4xl font-semibold mt-1">
                ₵{formatCurrency(insightsData.totalSpent)}
              </Text>
              <Text className="text-emerald-500 text-sm mt-2">
                ₵{formatCurrency(insightsData.series.avgValue)} {insightsData.averageLabel}
                {insightsData.dateRangeLabel ? ` · ${insightsData.dateRangeLabel}` : ''}
              </Text>
            </View>

            <View className="mt-6">
              <SpendingInsightsChart
                type={chartType}
                series={insightsData.series}
                categories={insightsData.categoryBreakdown}
                totalSpent={insightsData.totalSpent}
                dateRangeLabel={insightsData.dateRangeLabel}
              />
              {chartType === 'bar' ? (
                <Text className="text-white/40 text-xs mt-2">
                  Green dashed line = average per period
                </Text>
              ) : chartType === 'line' ? (
                <Text className="text-white/40 text-xs mt-2">
                  Area under line = total spend over time
                </Text>
              ) : (
                <Text className="text-white/40 text-xs mt-2">
                  Segments show share by category
                </Text>
              )}
            </View>

            <View className="mt-6">
              <InsightsRangeSelector
                value={range}
                onChange={setRange}
                onMorePress={() => {}}
              />
            </View>

            {recurringInsights.length > 0 ? (
              <View className="mt-6">
                <FlashList
                  data={recurringInsights}
                  scrollEnabled={false}
                  nestedScrollEnabled
                  keyExtractor={(ins) => ins.id}
                  estimatedItemSize={92}
                  ItemSeparatorComponent={recurringInsightSeparator}
                  renderItem={renderRecurringInsight}
                />
              </View>
            ) : null}

            <View className="mt-8 flex-row items-center justify-between">
              <Text className="text-white text-base font-semibold">Categories</Text>
              <Pressable onPress={() => router.push('/budget/categories')}>
                <Text className="text-white text-sm font-medium">Manage</Text>
              </Pressable>
            </View>

            {insightsData.categoryBreakdown.length === 0 ? (
              <View className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-5 py-8 items-center">
                <Receipt size={40} color="rgba(255,255,255,0.4)" strokeWidth={1.5} />
                <Text className="text-white/70 text-sm mt-4 text-center">
                  No recorded expenses yet
                </Text>
                <Text className="text-white/50 text-xs mt-2 text-center">
                  Log transactions in this period to see a breakdown by category
                </Text>
              </View>
            ) : null}
          </View>
        }
        renderItem={renderCategoryBreakdownRow}
      />

      <BudgetModals
        showAddCustomCategoryModal={false}
        setShowAddCustomCategoryModal={() => {}}
        onAddCategory={async () => {}}
        showTxModal={false}
        setShowTxModal={() => {}}
        cycleCategories={derived.cycleCategories}
        needsOverLimitFor={derived.needsOverLimitFor}
        onAddTransaction={async () => {}}
        onSubmitBatch={async () => ({ count: 0 })}
        onReloadBudget={async () => {}}
        pendingConfirm={null}
        setPendingConfirm={() => {}}
        showNeedsOverModal={false}
        setShowNeedsOverModal={() => {}}
        showResetConfirm={false}
        setShowResetConfirm={() => {}}
        onResetBudget={async () => {}}
        categoryToDelete={null}
        setCategoryToDelete={() => {}}
        showDeleteCategoryConfirm={false}
        setShowDeleteCategoryConfirm={() => {}}
        onDeleteCategory={async () => {}}
        incomeToDelete={null}
        setIncomeToDelete={() => {}}
        showDeleteIncomeConfirm={false}
        setShowDeleteIncomeConfirm={() => {}}
        onDeleteIncomeSource={async () => {}}
        incomeToEdit={null}
        setIncomeToEdit={() => {}}
        showEditIncomeModal={false}
        setShowEditIncomeModal={() => {}}
        onUpdateIncomeSource={async () => {}}
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
        setShowEditCycleModal={() => {}}
        activeCyclePaydayDay={derived.activeCycle?.paydayDay ?? 1}
        onUpdateCycleDay={async () => {}}
      />
    </View>
  );
}

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList) as typeof FlashList;
