import { FlashList } from "@shopify/flash-list";
import * as Haptics from "expo-haptics";
import { Calendar, DollarSign, Edit2, Plus, Trash2, TrendingDown } from "lucide-react-native";
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

import { AddDebtModal } from "@/components/AddDebtModal";
import { BackButton } from "@/components/BackButton";
import { Card } from "@/components/Card";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useAppToast } from "@/hooks/useAppToast";
import { useAuth } from "@/hooks/useAuth";
import { useBudget } from "@/hooks/useBudget";
import { useDebts } from "@/hooks/useDebts";
import type { Debt } from "@/types/budget";

export default function DebtDashboardScreen() {
  const { user } = useAuth();
  const { showSuccess, showError, showInfo } = useAppToast();
  const budget = useBudget(user?.id);
  const monthlyIncome = budget.totals?.monthlyNetIncome || 0;

  const {
    debts,
    isLoading,
    insights,
    addDebt,
    deleteDebt,
    recordPayment,
    calculatePayoffDate,
    getActiveDebts,
    refresh,
  } = useDebts(monthlyIncome);

  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleDelete = useCallback(
    (debt: Debt) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Alert.alert(
        "Delete Debt",
        `Are you sure you want to delete "${debt.name}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              await deleteDebt(debt.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              showSuccess("Deleted", "Debt removed successfully");
            },
          },
        ]
      );
    },
    [deleteDebt, showSuccess]
  );

  const handleEdit = useCallback(
    (debt: Debt) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      showInfo("Edit", "Edit debt coming in a future update.");
    },
    [showInfo]
  );

  const handleAddSubmit = useCallback(
    async (payload: {
      name: string;
      totalAmount: number;
      remainingAmount: number;
      monthlyPayment: number;
      interestRate?: number | null;
    }) => {
      await addDebt({
        name: payload.name,
        totalAmount: payload.totalAmount,
        remainingAmount: payload.remainingAmount,
        monthlyPayment: payload.monthlyPayment,
        interestRate: payload.interestRate,
      });
      setShowAddModal(false);
      showSuccess("Debt added", "Your debt has been added successfully");
    },
    [addDebt, showSuccess]
  );

  const handleRecordPayment = useCallback(
    (debt: Debt) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Alert.prompt(
        "Record Payment",
        `Enter payment amount for ${debt.name}`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Record",
            onPress: async (value: any) => {
              const amount = parseFloat(value || "0");
              if (amount > 0 && amount <= debt.remainingAmount) {
                await recordPayment(debt.id, amount);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                showSuccess("Payment recorded", "Debt updated successfully");
              } else {
                showError("Invalid Amount", "Please enter a valid payment amount.");
              }
            },
          },
        ],
        "plain-text",
        "",
        "numeric"
      );
    },
    [recordPayment, showSuccess, showError]
  );

  const activeDebts = getActiveDebts();
  const hasDebts = activeDebts.length > 0;

  const renderItem = useCallback(
    ({ item }: { item: Debt }) => (
      <DebtItem
        debt={item}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRecordPayment={handleRecordPayment}
        calculatePayoffDate={calculatePayoffDate}
        delay={0}
      />
    ),
    [handleEdit, handleDelete, handleRecordPayment, calculatePayoffDate]
  );

  const keyExtractor = useCallback((item: Debt) => item.id, []);

  const listHeader = useMemo(
    () => (
      <>
        {hasDebts && (
          <>
            <Animated.View entering={FadeInDown.duration(300).delay(0)}>
              <Card style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <DollarSign size={24} color="#ef4444" />
                  <Text style={styles.summaryLabel}>Total Debt</Text>
                </View>
                <Text style={styles.summaryAmount}>
                  ₵{insights.totalDebt.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                </Text>
              </Card>
            </Animated.View>

            <View style={styles.insightsRow}>
              <Animated.View
                entering={FadeInDown.duration(300).delay(50)}
                style={styles.insightCardContainer}
              >
                <Card style={styles.insightCard}>
                  <TrendingDown size={20} color="#f59e0b" />
                  <Text style={styles.insightLabel}>Monthly Payment</Text>
                  <Text style={styles.insightValue}>
                    ₵{insights.totalMonthlyPayment.toLocaleString("en-GB")}
                  </Text>
                </Card>
              </Animated.View>

              <Animated.View
                entering={FadeInDown.duration(300).delay(100)}
                style={styles.insightCardContainer}
              >
                <Card style={styles.insightCard}>
                  <Calendar size={20} color="#10b981" />
                  <Text style={styles.insightLabel}>Payoff Time</Text>
                  <Text style={styles.insightValue}>
                    {insights.projectedPayoffMonths} months
                  </Text>
                </Card>
              </Animated.View>
            </View>

            {insights.debtToIncomeRatio !== null && (
              <Animated.View entering={FadeInDown.duration(300).delay(150)}>
                <Card style={styles.ratioCard}>
                  <Text style={styles.ratioLabel}>Debt-to-Income Ratio</Text>
                  <View style={styles.ratioContent}>
                    <Text style={[
                      styles.ratioValue,
                      insights.debtToIncomeRatio > 0.36 && styles.ratioWarning,
                    ]}>
                      {(insights.debtToIncomeRatio * 100).toFixed(1)}%
                    </Text>
                    {insights.debtToIncomeRatio > 0.36 && (
                      <Text style={styles.ratioWarningText}>
                        ⚠️ Above recommended 36%
                      </Text>
                    )}
                  </View>
                </Card>
              </Animated.View>
            )}
          </>
        )}

        {!hasDebts && !isLoading && (
          <Animated.View entering={FadeInDown.duration(300).delay(0)}>
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No Active Debts</Text>
              <Text style={styles.emptyText}>
                Track your loans, credit cards, and other debts to stay on top of your payments.
              </Text>
            </Card>
          </Animated.View>
        )}
      </>
    ),
    [hasDebts, isLoading, insights]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.title}>Debt Dashboard</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <FlashList
        data={activeDebts}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
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
          <Text className="text-base font-semibold">Add Debt</Text>
        </PrimaryButton>
      </View>

      <AddDebtModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddSubmit}
      />
    </SafeAreaView>
  );
}

// Memoized Debt Item Component
const DebtItem = React.memo(function DebtItem({
  debt,
  onEdit,
  onDelete,
  onRecordPayment,
  calculatePayoffDate,
  delay,
}: {
  debt: Debt;
  onEdit: (debt: Debt) => void;
  onDelete: (debt: Debt) => void;
  onRecordPayment: (debt: Debt) => void;
  calculatePayoffDate: (debt: Debt) => string | null;
  delay: number;
}) {
  const progress = debt.totalAmount > 0
    ? ((debt.totalAmount - debt.remainingAmount) / debt.totalAmount) * 100
    : 0;

  const payoffDate = calculatePayoffDate(debt);

  return (
    <Animated.View entering={FadeInDown.duration(300).delay(delay)}>
      <Card style={styles.debtCard}>
        {/* Header */}
        <View style={styles.debtHeader}>
          <View style={styles.debtInfo}>
            <Text style={styles.debtName} numberOfLines={1}>
              {debt.name}
            </Text>
            {debt.interestRate && (
              <Text style={styles.debtInterest}>
                {debt.interestRate.toFixed(1)}% APR
              </Text>
            )}
          </View>
          <View style={styles.debtAmountContainer}>
            <Text style={styles.debtRemaining}>
              ₵{debt.remainingAmount.toLocaleString("en-GB")}
            </Text>
            <Text style={styles.debtTotal}>
              of ₵{debt.totalAmount.toLocaleString("en-GB")}
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{progress.toFixed(0)}% paid</Text>
        </View>

        {/* Payment Info */}
        <View style={styles.paymentInfo}>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Monthly Payment</Text>
            <Text style={styles.paymentValue}>
              ₵{debt.monthlyPayment.toLocaleString("en-GB")}
            </Text>
          </View>
          {payoffDate && (
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Projected Payoff</Text>
              <Text style={styles.paymentValue}>
                {new Date(payoffDate).toLocaleDateString("en-GB", {
                  month: "short",
                  year: "numeric"
                })}
              </Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            onPress={() => onRecordPayment(debt)}
            style={({ pressed }) => [
              styles.actionButtonPrimary,
              pressed && styles.actionPressed,
            ]}
          >
            <DollarSign size={18} color="#FFFFFF" />
            <Text style={styles.actionTextPrimary}>Record Payment</Text>
          </Pressable>

          <View style={styles.secondaryActions}>
            <Pressable
              onPress={() => onEdit(debt)}
              style={({ pressed }) => [
                styles.actionButton,
                pressed && styles.actionPressed,
              ]}
            >
              <Edit2 size={18} color="#64748B" />
            </Pressable>

            <Pressable
              onPress={() => onDelete(debt)}
              style={({ pressed }) => [
                styles.actionButton,
                pressed && styles.actionPressed,
              ]}
            >
              <Trash2 size={18} color="#ef4444" />
            </Pressable>
          </View>
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
    paddingVertical: 24,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  summaryLabel: {
    color: "#94A3B8",
    fontFamily: "Figtree-Medium",
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  summaryAmount: {
    color: "#ef4444",
    fontFamily: "Figtree-Bold",
    fontSize: 36,
    letterSpacing: -1,
  },
  insightsRow: {
    flexDirection: "row",
    gap: 12,
  },
  insightCardContainer: {
    flex: 1,
  },
  insightCard: {
    padding: 16,
    gap: 8,
  },
  insightLabel: {
    color: "#94A3B8",
    fontFamily: "Figtree-Medium",
    fontSize: 12,
  },
  insightValue: {
    color: "#FFFFFF",
    fontFamily: "Figtree-Bold",
    fontSize: 20,
    letterSpacing: -0.5,
  },
  ratioCard: {
    padding: 20,
  },
  ratioLabel: {
    color: "#94A3B8",
    fontFamily: "Figtree-Medium",
    fontSize: 14,
    marginBottom: 12,
  },
  ratioContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ratioValue: {
    color: "#10b981",
    fontFamily: "Figtree-Bold",
    fontSize: 32,
    letterSpacing: -1,
  },
  ratioWarning: {
    color: "#f59e0b",
  },
  ratioWarningText: {
    color: "#f59e0b",
    fontFamily: "Figtree-Medium",
    fontSize: 13,
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
  debtCard: {
    padding: 20,
    gap: 16,
  },
  debtHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  debtInfo: {
    flex: 1,
    marginRight: 12,
  },
  debtName: {
    color: "#FFFFFF",
    fontFamily: "Figtree-Bold",
    fontSize: 18,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  debtInterest: {
    color: "#f59e0b",
    fontFamily: "Figtree-Medium",
    fontSize: 13,
  },
  debtAmountContainer: {
    alignItems: "flex-end",
  },
  debtRemaining: {
    color: "#ef4444",
    fontFamily: "Figtree-Bold",
    fontSize: 20,
    letterSpacing: -0.5,
  },
  debtTotal: {
    color: "#64748B",
    fontFamily: "Figtree-Regular",
    fontSize: 12,
  },
  progressContainer: {
    gap: 8,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: "rgba(148, 163, 184, 0.1)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#10b981",
    borderRadius: 4,
  },
  progressText: {
    color: "#94A3B8",
    fontFamily: "Figtree-Medium",
    fontSize: 12,
    textAlign: "right",
  },
  paymentInfo: {
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.1)",
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentLabel: {
    color: "#94A3B8",
    fontFamily: "Figtree-Regular",
    fontSize: 13,
  },
  paymentValue: {
    color: "#E2E8F0",
    fontFamily: "Figtree-SemiBold",
    fontSize: 14,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 8,
  },
  actionButtonPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#10b981",
  },
  actionTextPrimary: {
    color: "#FFFFFF",
    fontFamily: "Figtree-SemiBold",
    fontSize: 14,
  },
  secondaryActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    minWidth: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "rgba(148, 163, 184, 0.05)",
  },
  actionPressed: {
    opacity: 0.6,
  },
  footer: {
    padding: 20,
    paddingBottom: 32,
    backgroundColor: "#0A0A0A",
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.1)",
  },
});
