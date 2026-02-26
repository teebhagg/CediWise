import { FlashList } from "@shopify/flash-list";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import { Select } from "heroui-native";
import { Calendar, Pencil, Plus, Trash2 } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackButton } from "@/components/BackButton";
import { BudgetTransactionModal } from "@/components/BudgetTransactionModal";
import { Card } from "@/components/Card";
import { StandardHeader } from "@/components/CediWiseHeader";
import { ConfirmModal } from "@/components/ConfirmModal";
import { GlassView } from "@/components/GlassView";
import { useAuth } from "@/hooks/useAuth";
import { useBudget } from "@/hooks/useBudget";
import type { BudgetBucket, BudgetTransaction } from "@/types/budget";
import { bucketLabel } from "@/utils/budgetHelpers";
import { formatCurrency } from "@/utils/formatCurrency";

export default function ExpensesScreen() {
  const { user } = useAuth();
  const {
    state,
    activeCycle,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  } = useBudget(user?.id);

  const [filter, setFilter] = useState<"all" | BudgetBucket>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTx, setEditingTx] = useState<BudgetTransaction | null>(null);
  const [txToDelete, setTxToDelete] = useState<BudgetTransaction | null>(null);
  const [selectedMonthAndYear, setSelectedMonthAndYear] = useState<
    string | null
  >(null);
  const [showMonthAndYearPopover, setShowMonthAndYearPopover] = useState(false);
  const [monthAndYearOptions, setMonthAndYearOptions] = useState<string[]>([]);
  const insets = useSafeAreaInsets();

  const activeCycleId = activeCycle?.id ?? null;
  const cycleCategories = useMemo(() => {
    if (!state || !activeCycleId) return [];
    return state.categories.filter((c) => c.cycleId === activeCycleId);
  }, [state, activeCycleId]);

  const cycleTransactions = useMemo(() => {
    if (!state || !activeCycleId) return [];
    const list = state.transactions.filter((t) => t.cycleId === activeCycleId);
    if (filter === "all") return list;
    return list.filter((t) => t.bucket === filter);
  }, [state, activeCycleId, filter]);

  const txModalVisible = showAddModal || !!editingTx;

  const handleCloseTxModal = useCallback(() => {
    setShowAddModal(false);
    setEditingTx(null);
  }, []);

  const handleAddSubmit = useCallback(
    async (payload: {
      amount: number;
      note?: string;
      bucket: BudgetBucket;
      categoryId?: string | null;
    }) => {
      await addTransaction({
        ...payload,
        occurredAt: new Date(),
      });
      handleCloseTxModal();
    },
    [addTransaction, handleCloseTxModal],
  );

  const handleUpdateSubmit = useCallback(
    async (
      id: string,
      payload: {
        amount: number;
        note?: string;
        bucket: BudgetBucket;
        categoryId?: string | null;
        occurredAt: string;
      },
    ) => {
      await updateTransaction(id, payload);
      handleCloseTxModal();
    },
    [updateTransaction, handleCloseTxModal],
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!txToDelete) return;
    await deleteTransaction(txToDelete.id);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // ignore
    }
    setTxToDelete(null);
  }, [deleteTransaction, txToDelete]);

  useEffect(() => {
    setMonthAndYearOptions(getMonthsAndYearsFromExpenses(cycleTransactions));
  }, [cycleTransactions]);

  const handleMonthAndYearPress = useCallback(() => {
    setShowMonthAndYearPopover(true);
  }, []);

  const handleMonthAndYearSelect = useCallback((item: string) => {
    setSelectedMonthAndYear(item);
    setShowMonthAndYearPopover(false);
  }, []);

  const handleMonthAndYearClose = useCallback(() => {
    setShowMonthAndYearPopover(false);
  }, []);

  const handleMonthAndYearClear = useCallback(() => {
    setSelectedMonthAndYear(null);
  }, []);

  const categoryName = (categoryId: string | null | undefined) => {
    if (!categoryId) return "Uncategorized";
    const c = cycleCategories.find((x) => x.id === categoryId);
    return c?.name ?? "Uncategorized";
  };

  if (!activeCycleId) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View
          style={{ flex: 1, backgroundColor: "black" }}
          className="flex-1 bg-[#0A0A0A]">
          <StandardHeader title="Expenses" leading={<BackButton />} centered />
          <View className="px-5 py-4" style={{ paddingTop: 64 + insets.top }}>
            <Text className="text-slate-400 mt-8 text-center">
              No budget cycle set. Set up your budget first.
            </Text>
          </View>
        </View>
      </>
    );
  }

  const categoryFilter = (<View className="px-5" style={{ marginTop: -30 }}>
    <View className="mt-4 flex-row flex-wrap gap-2">
      {(["all", "needs", "wants", "savings"] as const).map((f) => (
        <Pressable
          key={f}
          onPress={() => setFilter(f)}
          className={`px-3 py-2 rounded-full border ${filter === f
            ? "bg-emerald-500/20 border-emerald-500/45"
            : "bg-slate-400/15 border-slate-400/25"
            }`}>
          <Text
            className={`text-sm ${filter === f ? "text-slate-50 font-medium" : "text-slate-300"}`}>
            {f === "all" ? "All" : bucketLabel(f)}
          </Text>
        </Pressable>
      ))}
    </View>
  </View>);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={{ flex: 1, backgroundColor: "black" }}
        className="flex-1 bg-[#0A0A0A]">
        <StandardHeader
          title="Expenses"
          centered={true}
          leading={<BackButton />}
          actions={[
            <Select key="month-select">
              <Select.Trigger asChild>
                <Pressable
                  style={expensesHeaderStyles.actionTrigger}
                  onPress={() => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch {
                      /* ignore */
                    }
                  }}
                  accessibilityLabel="Select month"
                  accessibilityRole="button">
                  <Calendar size={20} color="#22c55e" />
                </Pressable>
              </Select.Trigger>
              <Select.Portal>
                <GlassView
                  intensity={7}
                  tint="dark"
                  className="absolute inset-0"
                />
                <Select.Overlay className="bg-black/30" />
                <Select.Content
                  presentation="popover"
                  className="w-[250px] rounded-md">
                  {monthAndYearOptions.map((option) => (
                    <Select.Item key={option} value={option} label={option} />
                  ))}
                </Select.Content>
              </Select.Portal>
            </Select>,
            <Pressable
              key="add-btn"
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {
                  /* ignore */
                }
                setShowAddModal(true);
              }}
              style={expensesHeaderStyles.actionTrigger}
              className="rounded-full bg-emerald-500"
              accessibilityLabel="Add expense"
              accessibilityRole="button">
              <Plus size={22} color="#020617" />
            </Pressable>,
          ]}
          bottom={categoryFilter}
        />

        {/* <View className="px-5 pb-4" style={{ paddingTop: 64 + insets.top }}>
          <View className="mt-4 flex-row flex-wrap gap-2">
            {(["all", "needs", "wants", "savings"] as const).map((f) => (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                className={`px-3 py-2 rounded-full border ${
                  filter === f
                    ? "bg-emerald-500/20 border-emerald-500/45"
                    : "bg-slate-400/15 border-slate-400/25"
                }`}>
                <Text
                  className={`text-sm ${filter === f ? "text-slate-50 font-medium" : "text-slate-300"}`}>
                  {f === "all" ? "All" : bucketLabel(f)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View> */}

        <View className="flex-1 px-5">
          <FlashList
            data={cycleTransactions}
            keyExtractor={(t) => t.id}
            contentContainerStyle={{ paddingBottom: 100 }}
            ListEmptyComponent={
              <Card>
                <Text className="text-slate-400 py-4">
                  No expenses in this cycle.
                </Text>
              </Card>
            }
            className="mt-[170px] pt-5"
            renderItem={({ item: t }) => (
              <Card className="mb-3">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 min-w-0 mr-3">
                    <View className="flex-row items-center gap-2 flex-wrap">
                      <Text
                        className="text-slate-200 font-medium"
                        numberOfLines={1}
                        ellipsizeMode="tail">
                        {categoryName(t.categoryId)}
                      </Text>
                      <View className="bg-slate-500/25 px-2 py-0.5 rounded">
                        <Text className="text-slate-300 text-xs font-medium">
                          {bucketLabel(t.bucket)}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-slate-500 text-xs mt-0.5">
                      {new Date(t.occurredAt).toLocaleDateString("en-GB", {
                        month: "short",
                        day: "numeric",
                      })}
                      {t.note?.trim() ? ` • ${t.note.trim()}` : ""}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-red-300 font-bold">
                      -₵{formatCurrency(t.amount)}
                    </Text>
                    <Pressable
                      onPress={() => {
                        try {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light,
                          );
                        } catch {
                          // ignore
                        }
                        setEditingTx(t);
                      }}
                      className="p-2 rounded-full bg-slate-500/20">
                      <Pencil size={16} color="#94a3b8" />
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        try {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Medium,
                          );
                        } catch {
                          // ignore
                        }
                        setTxToDelete(t);
                      }}
                      className="p-2 rounded-full bg-red-500/20">
                      <Trash2 size={16} color="#f87171" />
                    </Pressable>
                  </View>
                </View>
              </Card>
            )}
          />
        </View>
      </View>

      <BudgetTransactionModal
        visible={txModalVisible}
        categories={cycleCategories}
        initialTransaction={editingTx}
        onClose={handleCloseTxModal}
        onSubmit={handleAddSubmit}
        onUpdate={handleUpdateSubmit}
      />

      <ConfirmModal
        visible={!!txToDelete}
        title="Delete expense?"
        description={
          txToDelete
            ? `Remove this expense of ₵${formatCurrency(txToDelete.amount)}? This cannot be undone.`
            : "Remove this expense?"
        }
        confirmLabel="Delete"
        onClose={() => setTxToDelete(null)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}

// Header action buttons: min 44px touch target (mobile-design)
const expensesHeaderStyles = StyleSheet.create({
  actionTrigger: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});

// Get months from expenses
const getMonthsAndYearsFromExpenses = (expenses: BudgetTransaction[]) => {
  const monthsAndYears = new Set<string>();
  expenses.forEach((expense) => {
    const date = new Date(expense.occurredAt);
    // Format to be human readable
    const month = date.toLocaleString("default", { month: "long" });
    const year = date.getFullYear();
    monthsAndYears.add(`${month} ${year}`);
  });
  return Array.from(monthsAndYears);
};
