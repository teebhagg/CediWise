import { FlashList } from "@shopify/flash-list";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Edit2, Pause, Play, Plus, Trash2 } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AddRecurringExpenseModal } from "@/components/AddRecurringExpenseModal";
import { BackButton } from "@/components/BackButton";
import { Card } from "@/components/Card";
import { StandardHeader } from "@/components/CediWiseHeader";
import { useTierContext } from "@/contexts/TierContext";
import { useAppToast } from "@/hooks/useAppToast";
import { useAuth } from "@/hooks/useAuth";
import { useBudget } from "@/hooks/useBudget";
import { PULL_REFRESH_EMERALD } from "@/constants/pullToRefresh";
import { useRecurringExpenses } from "@/hooks/useRecurringExpenses";
import type {
  BudgetBucket,
  RecurringExpense,
  RecurringExpenseFrequency,
} from "@/types/budget";
import { log } from "@/utils/logger";
import { toMonthlyEquivalentAmount } from "@/utils/recurringHelpers";
import { Button } from "heroui-native";

// Frequency display mapping
const FREQUENCY_LABELS: Record<RecurringExpenseFrequency, string> = {
  weekly: "Weekly",
  bi_weekly: "Bi-weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annually: "Annually",
};

// Bucket color mapping
const BUCKET_COLORS: Record<BudgetBucket, string> = {
  needs: "#ef4444",
  wants: "#f59e0b",
  savings: "#10b981",
};

/** Vertical rhythm between FlashList rows (gap in contentContainerStyle does not space cells). */
const LIST_GAP_AFTER_BUCKET_HEADER = 10;
const LIST_GAP_BETWEEN_EXPENSE_CARDS = 12;
const LIST_GAP_BEFORE_NEXT_BUCKET = 20;

const ACTION_EDIT_FG = "#93c5fd";
const ACTION_PAUSE_FG = "#fcd34d";
const ACTION_DELETE_FG = "#fca5a5";
const ACTION_RESUME_FG = "#6ee7b7";

type RecurringListItem =
  | { type: "header"; id: string; bucket: BudgetBucket; bucketTotal: number }
  | {
      type: "row";
      id: string;
      expense: RecurringExpense;
      bucket: BudgetBucket;
    };

function RecurringListSeparator({
  leadingItem,
  trailingItem,
}: {
  leadingItem: RecurringListItem;
  trailingItem: RecurringListItem;
}) {
  let height = LIST_GAP_BETWEEN_EXPENSE_CARDS;
  if (leadingItem.type === "header" && trailingItem.type === "row") {
    height = LIST_GAP_AFTER_BUCKET_HEADER;
  } else if (leadingItem.type === "row" && trailingItem.type === "header") {
    height = LIST_GAP_BEFORE_NEXT_BUCKET;
  } else if (leadingItem.type === "row" && trailingItem.type === "row") {
    height = LIST_GAP_BETWEEN_EXPENSE_CARDS;
  }
  return <View style={{ height }} />;
}

export default function RecurringExpensesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { canAccessBudget } = useTierContext();

  const { user } = useAuth();
  const budget = useBudget(user?.id);
  const { showSuccess, showError } = useAppToast();
  const {
    recurringExpenses,
    isLoading,
    budgetQueueFlushError,
    clearBudgetQueueFlushError,
    addRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
    getMonthlyTotal,
    getActiveExpenses,
    refresh,
  } = useRecurringExpenses();

  useEffect(() => {
    if (!budgetQueueFlushError) return;
    showError("Sync issue", budgetQueueFlushError);
    clearBudgetQueueFlushError();
  }, [
    budgetQueueFlushError,
    clearBudgetQueueFlushError,
    showError,
  ]);

  useEffect(() => {
    if (!canAccessBudget) {
      router.replace("/(tabs)/budget");
    }
  }, [canAccessBudget, router]);

  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editing, setEditing] = useState<RecurringExpense | null>(null);

  const activeCycleId = useMemo(() => {
    if (!budget.state?.cycles.length) return null;
    const sorted = [...budget.state.cycles].sort(
      (a, b) =>
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
    );
    return sorted[0]?.id ?? null;
  }, [budget.state?.cycles]);

  const cycleCategories = useMemo(() => {
    if (!budget.state || !activeCycleId) return [];
    return budget.state.categories.filter((c) => c.cycleId === activeCycleId);
  }, [budget.state, activeCycleId]);

  const pausedExpenses = useMemo(
    () => recurringExpenses.filter((e) => !e.isActive),
    [recurringExpenses],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const start = Date.now();
    try {
      await refresh();
    } finally {
      const elapsed = Date.now() - start;
      if (elapsed < 500) {
        await new Promise<void>((r) => setTimeout(r, 500 - elapsed));
      }
      setRefreshing(false);
    }
  }, [refresh]);

  const handleDelete = useCallback(
    (expense: RecurringExpense) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Alert.alert(
        "Delete Recurring Expense",
        `Are you sure you want to delete "${expense.name}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                await deleteRecurringExpense(expense.id);
                await budget.recalculateBudget();
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success,
                );
                showSuccess("Deleted", "Recurring expense removed successfully");
              } catch (err) {
                log.error(
                  "[recurring-expenses] delete + recalculateBudget failed",
                  err,
                );
                showError(
                  "Could not finish update",
                  "Expense may be removed locally; open Budget to refresh totals.",
                );
              }
            },
          },
        ],
      );
    },
    [budget, deleteRecurringExpense, showError, showSuccess],
  );

  const handleEdit = useCallback((expense: RecurringExpense) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditing(expense);
    setShowAddModal(true);
  }, []);

  const handlePause = useCallback(
    async (expense: RecurringExpense) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      try {
        await updateRecurringExpense(expense.id, { isActive: false });
        await budget.recalculateBudget();
        showSuccess("Paused", `${expense.name} is paused`);
      } catch (err) {
        log.error("[recurring-expenses] pause", err);
        showError(
          "Could not pause",
          "Update or budget refresh failed. Check your connection and try again.",
        );
      }
    },
    [budget, showError, showSuccess, updateRecurringExpense],
  );

  const handleResume = useCallback(
    async (expense: RecurringExpense) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      try {
        await updateRecurringExpense(expense.id, { isActive: true });
        await budget.recalculateBudget();
        showSuccess("Resumed", `${expense.name} is active again`);
      } catch (err) {
        log.error("[recurring-expenses] resume", err);
        showError(
          "Could not resume",
          "Update or budget refresh failed. Check your connection and try again.",
        );
      }
    },
    [budget, showError, showSuccess, updateRecurringExpense],
  );

  const handleModalClose = useCallback(() => {
    setShowAddModal(false);
    setEditing(null);
  }, []);

  const handleAddSubmit = useCallback(
    async (payload: {
      name: string;
      amount: number;
      frequency: RecurringExpenseFrequency;
      bucket: BudgetBucket;
      autoAllocate?: boolean;
      categoryId?: string | null;
      endDate?: string | null;
    }) => {
      const wasEditing = Boolean(editing);
      try {
        if (editing) {
          await updateRecurringExpense(editing.id, {
            name: payload.name,
            amount: payload.amount,
            frequency: payload.frequency,
            bucket: payload.bucket,
            autoAllocate: payload.autoAllocate,
            categoryId: payload.categoryId,
            endDate: payload.endDate,
          });
        } else {
          await addRecurringExpense({
            name: payload.name,
            amount: payload.amount,
            frequency: payload.frequency,
            bucket: payload.bucket,
            autoAllocate: payload.autoAllocate,
            categoryId: payload.categoryId,
            endDate: payload.endDate,
          });
        }
        await budget.recalculateBudget();
        setEditing(null);
        if (wasEditing) {
          showSuccess("Saved", "Recurring expense updated");
        } else {
          showSuccess("Expense added", "Recurring expense added successfully");
        }
      } catch (err) {
        log.error(
          "[recurring-expenses] save recurring + recalculateBudget failed",
          err,
        );
        showError(
          "Could not update budget",
          "Check your connection and try again, or open Budget to refresh.",
        );
        throw err;
      }
    },
    [
      addRecurringExpense,
      budget,
      editing,
      showError,
      showSuccess,
      updateRecurringExpense,
    ],
  );

  // Group by bucket
  const expensesByBucket = useMemo(() => {
    const grouped: Record<BudgetBucket, RecurringExpense[]> = {
      needs: [],
      wants: [],
      savings: [],
    };

    getActiveExpenses().forEach((expense) => {
      grouped[expense.bucket].push(expense);
    });

    return grouped;
  }, [getActiveExpenses]);

  const totalMonthly = getMonthlyTotal();

  const listData = useMemo((): RecurringListItem[] => {
    const items: RecurringListItem[] = [];
    (["needs", "wants", "savings"] as BudgetBucket[]).forEach((bucket) => {
      const expenses = expensesByBucket[bucket];
      if (expenses.length === 0) return;

      const bucketTotal = expenses.reduce(
        (sum, exp) =>
          sum + toMonthlyEquivalentAmount(exp.amount, exp.frequency),
        0,
      );

      items.push({ type: "header", id: `h-${bucket}`, bucket, bucketTotal });
      expenses.forEach((expense) => {
        items.push({ type: "row", id: expense.id, expense, bucket });
      });
    });
    return items;
  }, [expensesByBucket]);

  const renderItem = useCallback(
    ({ item }: { item: RecurringListItem }) => {
      if (item.type === "header") {
        return (
          <View>
            <View style={styles.bucketHeader}>
              <View style={styles.bucketTitleRow}>
                <View
                  style={[
                    styles.bucketDot,
                    { backgroundColor: BUCKET_COLORS[item.bucket] },
                  ]}
                />
                <Text style={styles.bucketTitle}>
                  {item.bucket.charAt(0).toUpperCase() + item.bucket.slice(1)}
                </Text>
              </View>
              <Text style={styles.bucketTotal}>
                ₵
                {item.bucketTotal.toLocaleString("en-GB", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                /mo
              </Text>
            </View>
          </View>
        );
      }
        return (
        <ExpenseItem
          expense={item.expense}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onPause={handlePause}
          delay={0}
        />
      );
    },
    [handleEdit, handleDelete, handlePause],
  );

  const keyExtractor = useCallback((item: RecurringListItem) => item.id, []);

  const getItemType = useCallback((item: RecurringListItem) => item.type, []);

  const listHeader = useMemo(
    () => (
      <View className="gap-3 pt-1 pb-4">
        <Animated.View entering={FadeInDown.duration(300).delay(0)}>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Monthly</Text>
            <Text style={styles.summaryAmount}>
              ₵
              {totalMonthly.toLocaleString("en-GB", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
            <Text style={styles.summarySubtext}>
              From {getActiveExpenses().length} recurring expense(s)
            </Text>
          </Card>
        </Animated.View>

        {recurringExpenses.length === 0 && !isLoading && (
          <Animated.View entering={FadeInDown.duration(300).delay(100)}>
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No Recurring Expenses</Text>
              <Text style={styles.emptyText}>
                Add subscriptions, memberships, or regular payments to track
                them automatically.
              </Text>
            </Card>
          </Animated.View>
        )}
      </View>
    ),
    [totalMonthly, recurringExpenses.length, isLoading, getActiveExpenses],
  );

  if (!canAccessBudget) {
    return null;
  }

  return (
    <View style={styles.container}>
      <StandardHeader title="Recurring Expenses" leading={<BackButton />} centered />

      <FlashList
        data={listData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemType={getItemType}
        ItemSeparatorComponent={RecurringListSeparator}
        ListHeaderComponent={listHeader}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: 64 + insets.top },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PULL_REFRESH_EMERALD}
            colors={[PULL_REFRESH_EMERALD]}
          />
        }
        ListFooterComponent={
          <View style={styles.listFooter}>
            {pausedExpenses.length > 0 ? (
              <View style={styles.pausedSection}>
                <Text style={styles.pausedSectionTitle}>Paused</Text>
                {pausedExpenses.map((exp) => (
                  <Card key={exp.id} style={styles.pausedCard}>
                    <View style={styles.pausedRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.expenseName} numberOfLines={1}>
                          {exp.name}
                        </Text>
                        <Text style={styles.pausedHint}>
                          Not counted in your budget until resumed
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => handleResume(exp)}
                        style={({ pressed }) => [
                          styles.resumeBtn,
                          pressed && styles.actionPressed,
                        ]}>
                        <Play size={18} color={ACTION_RESUME_FG} />
                        <Text style={styles.resumeBtnText}>Resume</Text>
                      </Pressable>
                    </View>
                  </Card>
                ))}
              </View>
            ) : null}
          </View>
        }
      />

      {/* Add Button */}
      <View style={styles.footer}>
        <Button
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setEditing(null);
            setShowAddModal(true);
          }}>
          <Plus size={20} />
          <Text className="text-base font-semibold">Add Recurring Expense</Text>
        </Button>
      </View>

      <AddRecurringExpenseModal
        visible={showAddModal}
        onClose={handleModalClose}
        onSubmit={handleAddSubmit}
        editing={editing}
        cycleCategories={cycleCategories}
        peerRecurring={recurringExpenses}
        netIncomeMonthly={budget.totals?.monthlyNetIncome}
      />
    </View>
  );
}

// Memoized Expense Item Component
const ExpenseItem = React.memo(function ExpenseItem({
  expense,
  onEdit,
  onDelete,
  onPause,
  delay,
}: {
  expense: RecurringExpense;
  onEdit: (expense: RecurringExpense) => void;
  onDelete: (expense: RecurringExpense) => void;
  onPause: (expense: RecurringExpense) => void;
  delay: number;
}) {
  const monthlyAmount = toMonthlyEquivalentAmount(
    expense.amount,
    expense.frequency,
  );

  return (
    <Animated.View entering={FadeInDown.duration(300).delay(delay)}>
      <Card style={styles.expenseCard}>
        <View style={styles.expenseHeader}>
          <View style={styles.expenseInfo}>
            <Text style={styles.expenseName} numberOfLines={1}>
              {expense.name}
            </Text>
            <Text style={styles.expenseFrequency}>
              {FREQUENCY_LABELS[expense.frequency]}
            </Text>
          </View>
          <View style={styles.expenseAmountContainer}>
            <Text style={styles.expenseAmount}>
              ₵
              {monthlyAmount.toLocaleString("en-GB", {
                minimumFractionDigits: 2,
              })}
            </Text>
            <Text style={styles.expenseAmountLabel}>/month</Text>
          </View>
        </View>

        {/* Auto-allocate badge */}
        {expense.autoAllocate && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Auto-allocate</Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            onPress={() => onEdit(expense)}
            style={({ pressed }) => [
              styles.actionButtonBase,
              styles.actionButtonEdit,
              pressed && styles.actionPressed,
            ]}>
            <Edit2 size={18} color={ACTION_EDIT_FG} />
            <Text style={styles.actionTextEdit}>Edit</Text>
          </Pressable>

          <Pressable
            onPress={() => onPause(expense)}
            style={({ pressed }) => [
              styles.actionButtonBase,
              styles.actionButtonPause,
              pressed && styles.actionPressed,
            ]}>
            <Pause size={18} color={ACTION_PAUSE_FG} />
            <Text style={styles.actionTextPause}>Pause</Text>
          </Pressable>

          <Pressable
            onPress={() => onDelete(expense)}
            style={({ pressed }) => [
              styles.actionButtonBase,
              styles.actionButtonDelete,
              pressed && styles.actionPressed,
            ]}>
            <Trash2 size={18} color={ACTION_DELETE_FG} />
            <Text style={styles.actionTextDelete}>Delete</Text>
          </Pressable>
        </View>
      </Card>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    color: "#FFFFFF",
    fontFamily: "Figtree-Bold",
    fontSize: 20,
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerPlaceholder: {
    width: 60,
  },
  listFooter: {
    paddingTop: 8,
    paddingBottom: 28,
    gap: LIST_GAP_BETWEEN_EXPENSE_CARDS,
  },
  pausedSection: {
    gap: LIST_GAP_BETWEEN_EXPENSE_CARDS,
    marginTop: LIST_GAP_BEFORE_NEXT_BUCKET,
  },
  pausedSectionTitle: {
    color: "#64748B",
    fontFamily: "Figtree-SemiBold",
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  pausedCard: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    opacity: 0.85,
  },
  pausedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pausedHint: {
    color: "#64748B",
    fontFamily: "Figtree-Regular",
    fontSize: 12,
    marginTop: 4,
  },
  resumeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: "rgba(16, 185, 129, 0.14)",
    borderColor: "rgba(52, 211, 153, 0.38)",
  },
  resumeBtnText: {
    color: ACTION_RESUME_FG,
    fontFamily: "Figtree-SemiBold",
    fontSize: 13,
  },
  summaryCard: {
    alignItems: "center",
    paddingVertical: 24,
  },
  summaryLabel: {
    color: "#94A3B8",
    fontFamily: "Figtree-Medium",
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  summaryAmount: {
    color: "#10b981",
    fontFamily: "Figtree-Bold",
    fontSize: 36,
    marginTop: 8,
    letterSpacing: -1,
  },
  summarySubtext: {
    color: "#64748B",
    fontFamily: "Figtree-Regular",
    fontSize: 13,
    marginTop: 4,
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    color: "#E2E8F0",
    fontFamily: "Figtree-SemiBold",
    fontSize: 18,
    marginBottom: 8,
  },
  emptyText: {
    color: "#64748B",
    fontFamily: "Figtree-Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
  bucketHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 28,
  },
  bucketTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bucketDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bucketTitle: {
    color: "#E2E8F0",
    fontFamily: "Figtree-SemiBold",
    fontSize: 16,
  },
  bucketTotal: {
    color: "#94A3B8",
    fontFamily: "Figtree-Medium",
    fontSize: 14,
  },
  expenseCard: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
  },
  expenseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  expenseInfo: {
    flex: 1,
    marginRight: 12,
  },
  expenseName: {
    color: "#FFFFFF",
    fontFamily: "Figtree-SemiBold",
    fontSize: 16,
    marginBottom: 6,
  },
  expenseFrequency: {
    color: "#64748B",
    fontFamily: "Figtree-Regular",
    fontSize: 13,
  },
  expenseAmountContainer: {
    alignItems: "flex-end",
  },
  expenseAmount: {
    color: "#10b981",
    fontFamily: "Figtree-Bold",
    fontSize: 18,
    letterSpacing: -0.5,
  },
  expenseAmountLabel: {
    color: "#64748B",
    fontFamily: "Figtree-Regular",
    fontSize: 12,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  badgeText: {
    color: "#10b981",
    fontFamily: "Figtree-Medium",
    fontSize: 12,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingTop: 12,
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.1)",
  },
  actionButtonBase: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 16,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
  },
  actionButtonEdit: {
    backgroundColor: "rgba(59, 130, 246, 0.14)",
    borderColor: "rgba(96, 165, 250, 0.35)",
  },
  actionButtonPause: {
    backgroundColor: "rgba(245, 158, 11, 0.14)",
    borderColor: "rgba(251, 191, 36, 0.38)",
  },
  actionButtonDelete: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderColor: "rgba(248, 113, 113, 0.38)",
  },
  actionPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  actionTextEdit: {
    color: ACTION_EDIT_FG,
    fontFamily: "Figtree-SemiBold",
    fontSize: 13,
  },
  actionTextPause: {
    color: ACTION_PAUSE_FG,
    fontFamily: "Figtree-SemiBold",
    fontSize: 13,
  },
  actionTextDelete: {
    color: ACTION_DELETE_FG,
    fontFamily: "Figtree-SemiBold",
    fontSize: 13,
  },
  footer: {
    padding: 20,
    paddingBottom: 32,
    backgroundColor: "black",
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.1)",
  },
});
