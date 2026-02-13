import { FlashList } from "@shopify/flash-list";
import * as Haptics from "expo-haptics";
import { Edit2, Plus, Trash2 } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { AddRecurringExpenseModal } from "@/components/AddRecurringExpenseModal";
import { BackButton } from "@/components/BackButton";
import { Card } from "@/components/Card";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useAppToast } from "@/hooks/useAppToast";
import { useRecurringExpenses } from "@/hooks/useRecurringExpenses";
import type { BudgetBucket, RecurringExpense, RecurringExpenseFrequency } from "@/types/budget";

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

export default function RecurringExpensesScreen() {
  const { showSuccess, showInfo } = useAppToast();
  const {
    recurringExpenses,
    isLoading,
    addRecurringExpense,
    deleteRecurringExpense,
    getMonthlyTotal,
    getActiveExpenses,
    refresh,
  } = useRecurringExpenses();

  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
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
              await deleteRecurringExpense(expense.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              showSuccess("Deleted", "Recurring expense removed successfully");
            },
          },
        ]
      );
    },
    [deleteRecurringExpense, showSuccess]
  );

  const handleEdit = useCallback(
    (expense: RecurringExpense) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      showInfo("Edit", "Edit recurring expense coming in a future update.");
    },
    [showInfo]
  );

  const handleAddSubmit = useCallback(
    async (payload: {
      name: string;
      amount: number;
      frequency: RecurringExpenseFrequency;
      bucket: BudgetBucket;
      autoAllocate?: boolean;
    }) => {
      await addRecurringExpense({
        name: payload.name,
        amount: payload.amount,
        frequency: payload.frequency,
        bucket: payload.bucket,
        autoAllocate: payload.autoAllocate,
      });
      setShowAddModal(false);
      showSuccess("Expense added", "Recurring expense added successfully");
    },
    [addRecurringExpense, showSuccess]
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
  }, [recurringExpenses, getActiveExpenses]);

  const totalMonthly = getMonthlyTotal();

  type ListItem =
    | { type: "header"; id: string; bucket: BudgetBucket; bucketTotal: number }
    | { type: "row"; id: string; expense: RecurringExpense; bucket: BudgetBucket };

  const listData = useMemo((): ListItem[] => {
    const items: ListItem[] = [];
    (["needs", "wants", "savings"] as BudgetBucket[]).forEach((bucket) => {
      const expenses = expensesByBucket[bucket];
      if (expenses.length === 0) return;

      const bucketTotal = expenses.reduce((sum, exp) => {
        let monthly = exp.amount;
        if (exp.frequency === "weekly") monthly = exp.amount * 4.33;
        else if (exp.frequency === "bi_weekly") monthly = exp.amount * 2.165;
        else if (exp.frequency === "quarterly") monthly = exp.amount / 3;
        else if (exp.frequency === "annually") monthly = exp.amount / 12;
        return sum + monthly;
      }, 0);

      items.push({ type: "header", id: `h-${bucket}`, bucket, bucketTotal });
      expenses.forEach((expense) => {
        items.push({ type: "row", id: expense.id, expense, bucket });
      });
    });
    return items;
  }, [expensesByBucket]);

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === "header") {
        return (
          <View style={[styles.bucketSection, styles.bucketHeaderWrap]}>
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
                ₵{item.bucketTotal.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo
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
          delay={0}
        />
      );
    },
    [handleEdit, handleDelete]
  );

  const keyExtractor = useCallback((item: ListItem) => item.id, []);

  const getItemType = useCallback((item: ListItem) => item.type, []);

  const listHeader = useMemo(
    () => (
      <>
        <Animated.View entering={FadeInDown.duration(300).delay(0)}>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Monthly</Text>
            <Text style={styles.summaryAmount}>
              ₵{totalMonthly.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                Add subscriptions, memberships, or regular payments to track them automatically.
              </Text>
            </Card>
          </Animated.View>
        )}
      </>
    ),
    [totalMonthly, recurringExpenses.length, isLoading, getActiveExpenses]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.title}>Recurring Expenses</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <FlashList
        data={listData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemType={getItemType}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListFooterComponent={<View style={styles.listFooter} />}
      />

      {/* Add Button */}
      <View style={styles.footer}>
        <PrimaryButton
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowAddModal(true);
          }}
        >
          <Plus size={20} />
          <Text className="text-base font-semibold">Add Recurring Expense</Text>
        </PrimaryButton>
      </View>

      <AddRecurringExpenseModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddSubmit}
      />
    </SafeAreaView>
  );
}

// Memoized Expense Item Component
const ExpenseItem = React.memo(function ExpenseItem({
  expense,
  onEdit,
  onDelete,
  delay,
}: {
  expense: RecurringExpense;
  onEdit: (expense: RecurringExpense) => void;
  onDelete: (expense: RecurringExpense) => void;
  delay: number;
}) {
  // Calculate monthly amount
  let monthlyAmount = expense.amount;
  if (expense.frequency === "weekly") monthlyAmount = expense.amount * 4.33;
  else if (expense.frequency === "bi_weekly") monthlyAmount = expense.amount * 2.165;
  else if (expense.frequency === "quarterly") monthlyAmount = expense.amount / 3;
  else if (expense.frequency === "annually") monthlyAmount = expense.amount / 12;

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
              ₵{monthlyAmount.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
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
              styles.actionButton,
              pressed && styles.actionPressed,
            ]}
          >
            <Edit2 size={18} color="#64748B" />
            <Text style={styles.actionText}>Edit</Text>
          </Pressable>

          <Pressable
            onPress={() => onDelete(expense)}
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.actionPressed,
            ]}
          >
            <Trash2 size={18} color="#ef4444" />
            <Text style={[styles.actionText, { color: "#ef4444" }]}>Delete</Text>
          </Pressable>
        </View>
      </Card>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
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
    padding: 20,
    gap: 16,
  },
  headerPlaceholder: {
    width: 60,
  },
  listFooter: {
    height: 100,
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
  bucketSection: {
    gap: 12,
  },
  bucketHeaderWrap: {
    marginBottom: 4,
  },
  bucketHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
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
    padding: 16,
    gap: 12,
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
    marginBottom: 4,
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
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.1)",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "rgba(148, 163, 184, 0.05)",
  },
  actionPressed: {
    opacity: 0.6,
  },
  actionText: {
    color: "#64748B",
    fontFamily: "Figtree-Medium",
    fontSize: 13,
  },
  footer: {
    padding: 20,
    paddingBottom: 32,
    backgroundColor: "#0A0A0A",
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.1)",
  },
});
