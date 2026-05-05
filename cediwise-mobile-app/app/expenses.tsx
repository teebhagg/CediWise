import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import { Menu } from "heroui-native";
import { Calendar, ListPlus, Pencil, Plus, Trash2 } from "lucide-react-native";
import moment, { type Moment } from "moment";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, SectionList, StyleSheet, Text, View } from "react-native";
import CalendarPicker from "react-native-calendar-datepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackButton } from "@/components/BackButton";
import { BatchTransactionModal } from "@/components/BatchTransactionModal";
import { BudgetTransactionModal } from "@/components/BudgetTransactionModal";
import { Card } from "@/components/Card";
import {
  CediCalendarPickerModal,
  cediCalendarPickerStyles,
} from "@/components/CediCalendarPickerModal";
import { StandardHeader } from "@/components/CediWiseHeader";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useAppToast } from "@/hooks/useAppToast";
import { useAuth } from "@/hooks/useAuth";
import { useBudget } from "@/hooks/useBudget";
import type { BudgetBucket, BudgetTransaction } from "@/types/budget";
import { bucketLabel } from "@/utils/budgetHelpers";
import { formatCurrency } from "@/utils/formatCurrency";
import { getStandardHeaderWithBottomBodyOffsetTop } from "@/utils/screenHeaderInsets";

type ExpenseSection = {
  monthKey: string;
  title: string;
  subtotal: number;
  data: BudgetTransaction[];
};

function monthYearKey(iso: string | Date): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

function formatMonthYearTitle(key: string): string {
  const [ys, ms] = key.split("-");
  const y = Number(ys);
  const mo = Number(ms);
  if (!y || !mo) return key;
  return new Date(y, mo - 1, 1).toLocaleString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function getMonthYearKeysFromExpenses(expenses: BudgetTransaction[]) {
  const keys = new Set<string>();
  expenses.forEach((e) => keys.add(monthYearKey(e.occurredAt)));
  return Array.from(keys).sort((a, b) => b.localeCompare(a));
}

export default function ExpensesScreen() {
  const { user } = useAuth();
  const {
    state,
    activeCycle,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    submitBatchTransactions,
    syncBatch,
  } = useBudget(user?.id);

  const [filter, setFilter] = useState<"all" | BudgetBucket>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editingTx, setEditingTx] = useState<BudgetTransaction | null>(null);
  const [txToDelete, setTxToDelete] = useState<BudgetTransaction | null>(null);
  const [selectedMonthAndYear, setSelectedMonthAndYear] = useState<
    string | null
  >(null);
  const [tempSelectedMonthAndYear, setTempSelectedMonthAndYear] = useState<
    string | null
  >(null);
  const [monthAndYearOptions, setMonthAndYearOptions] = useState<string[]>([]);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const insets = useSafeAreaInsets();
  const { showError, showInfo, showSuccess } = useAppToast();

  const activeCycleId = activeCycle?.id ?? null;
  const cycleCategories = useMemo(() => {
    if (!state || !activeCycleId) return [];
    return state.categories.filter((c) => c.cycleId === activeCycleId);
  }, [state, activeCycleId]);

  const allTransactions = useMemo(() => {
    if (!state) return [];
    return state.transactions;
  }, [state]);

  const displayedTransactions = useMemo(() => {
    let list = allTransactions;

    if (selectedMonthAndYear) {
      list = list.filter(
        (t) => monthYearKey(t.occurredAt) === selectedMonthAndYear,
      );
    }

    if (filter === "all") return list;
    return list.filter((t) => t.bucket === filter);
  }, [allTransactions, selectedMonthAndYear, filter]);

  const expenseSections = useMemo((): ExpenseSection[] => {
    const txs = [...displayedTransactions];
    txs.sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    );
    const byMonth = new Map<string, BudgetTransaction[]>();
    for (const t of txs) {
      const key = monthYearKey(t.occurredAt);
      if (!byMonth.has(key)) byMonth.set(key, []);
      byMonth.get(key)!.push(t);
    }
    const keys = Array.from(byMonth.keys()).sort((a, b) => b.localeCompare(a));
    return keys.map((monthKey) => {
      const data = byMonth.get(monthKey)!;
      const subtotal = data.reduce((sum, t) => sum + t.amount, 0);
      return {
        monthKey,
        title: formatMonthYearTitle(monthKey),
        subtotal,
        data,
      };
    });
  }, [displayedTransactions]);

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
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      );
    } catch {
      // ignore
    }
    setTxToDelete(null);
  }, [deleteTransaction, txToDelete]);

  const expenseItemSeparator = useCallback(
    () => <View className="h-3 shrink-0" />,
    [],
  );

  useEffect(() => {
    setMonthAndYearOptions(getMonthYearKeysFromExpenses(allTransactions));
  }, [allTransactions]);

  /** Chronological keys for calendar min/max (picker spans first → last month with data). */
  const monthKeysChrono = useMemo(
    () => [...monthAndYearOptions].sort((a, b) => a.localeCompare(b)),
    [monthAndYearOptions],
  );

  const expenseMonthPickerBounds = useMemo((): {
    minDate: Moment;
    maxDate: Moment;
  } | null => {
    if (monthKeysChrono.length === 0) return null;
    const first = monthKeysChrono[0];
    const last = monthKeysChrono[monthKeysChrono.length - 1];
    return {
      minDate: moment(`${first}-01`, "YYYY-MM-DD").startOf("month"),
      maxDate: moment(`${last}-01`, "YYYY-MM-DD").endOf("month"),
    };
  }, [monthKeysChrono]);

  const expenseMonthPickerSelected = useMemo((): Moment => {
    if (monthKeysChrono.length === 0) {
      return moment().startOf("month");
    }
    if (
      tempSelectedMonthAndYear &&
      monthAndYearOptions.includes(tempSelectedMonthAndYear)
    ) {
      return moment(`${tempSelectedMonthAndYear}-01`, "YYYY-MM-DD");
    }
    const fallback = selectedMonthAndYear ?? monthKeysChrono[monthKeysChrono.length - 1];
    return moment(`${fallback}-01`, "YYYY-MM-DD");
  }, [tempSelectedMonthAndYear, selectedMonthAndYear, monthAndYearOptions, monthKeysChrono]);

  const handleExpenseMonthCalendarChange = useCallback(
    (date: Moment) => {
      const key = `${date.year()}-${String(date.month() + 1).padStart(2, "0")}`;
      if (!monthAndYearOptions.includes(key)) {
        showInfo(
          "No expenses in that month",
          "Only months you’ve already logged appear in your filter. Try another month.",
        );
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning,
        );
        return;
      }
      setTempSelectedMonthAndYear(key);
      void Haptics.selectionAsync();
    },
    [monthAndYearOptions, showInfo],
  );

  const openMonthPicker = useCallback(() => {
    if (monthKeysChrono.length === 0) {
      showInfo(
        "No months yet",
        "Add an expense first, then you can jump to that month here.",
      );
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setTempSelectedMonthAndYear(selectedMonthAndYear);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowMonthPicker(true);
  }, [monthKeysChrono.length, selectedMonthAndYear, showInfo]);

  const categoryName = useCallback(
    (tx: BudgetTransaction) => {
      if (tx.debtId) return "Debt Payment";
      const categoryId = tx.categoryId;
      if (!categoryId) return "Uncategorized";
      const c = cycleCategories.find((x) => x.id === categoryId);
      return c?.name ?? "Uncategorized";
    },
    [cycleCategories],
  );

  const renderExpenseItem = useCallback(
    ({ item: t }: { item: BudgetTransaction }) => (
      <Card>
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 min-w-0 space-y-1">
            <View className="flex-row items-center gap-2 flex-wrap">
              <Text
                className="text-slate-200 font-medium"
                numberOfLines={1}
                ellipsizeMode="tail">
                {categoryName(t)}
              </Text>
              <View className="bg-slate-500/25 px-2 py-0.5 rounded">
                <Text className="text-slate-300 text-xs font-medium">
                  {bucketLabel(t.bucket)}
                </Text>
              </View>
            </View>
            <Text className="text-slate-500 text-xs">
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
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
    ),
    [categoryName],
  );

  const renderExpenseSectionHeader = useCallback(
    ({ section }: { section: ExpenseSection }) => (
      <View style={expensesSectionHeaderStyles.stickyRoot} className="flex-row items-start">
        <View className="mt-1.5 w-3 h-3 rounded-full bg-emerald-500 mr-3" />
        <View className="flex-1 min-w-0">
          <Text className="text-emerald-400 font-semibold text-base">
            {section.title}
          </Text>
          <Text className="text-slate-500 text-xs mt-1">
            {section.data.length} expense{section.data.length === 1 ? "" : "s"}{" "}
            · ₵{formatCurrency(section.subtotal)}
          </Text>
        </View>
      </View>
    ),
    [],
  );

  if (!activeCycleId) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View
          style={{ flex: 1, backgroundColor: "black" }}
          className="flex-1 bg-[#0A0A0A]">
          <StandardHeader title="Expenses" leading={<BackButton />} centered />
          <View
            className="px-5 py-4"
            style={{ paddingTop: getStandardHeaderWithBottomBodyOffsetTop(insets.top) }}
          >
            <Text className="text-slate-400 mt-8 text-center">
              No budget cycle set. Set up your budget first.
            </Text>
          </View>
        </View>
      </>
    );
  }

  const categoryFilter = (
    <View className="px-5">
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
    </View>
  );

  const monthScopeBanner =
    selectedMonthAndYear ? (
      <View className="mb-3 flex-row items-center justify-between bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
        <View className="flex-row items-center gap-2">
          <Calendar size={16} color="#10b981" />
          <Text className="text-emerald-400 font-bold text-base">
            {formatMonthYearTitle(selectedMonthAndYear)}
          </Text>
        </View>
        <Pressable
          onPress={() => setSelectedMonthAndYear(null)}
          className="bg-emerald-500/20 px-3 py-1 rounded-full"
        >
          <Text className="text-emerald-400 text-xs font-medium">Clear</Text>
        </Pressable>
      </View>
    ) : null;

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
            <Pressable
              key="month-select"
              style={expensesHeaderStyles.actionTrigger}
              className={
                selectedMonthAndYear ? "bg-emerald-500/10 rounded-full" : ""
              }
              onPress={openMonthPicker}
              accessibilityLabel="Select month"
              accessibilityRole="button">
              <Calendar
                size={20}
                color={
                  monthKeysChrono.length === 0
                    ? "#475569"
                    : selectedMonthAndYear
                      ? "#10b981"
                      : "#94a3b8"
                }
              />
            </Pressable>,
            <Menu
              key="add-menu"
              onOpenChange={(isOpen) => {
                if (isOpen) {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
            >
              <Menu.Trigger asChild>
                <Pressable
                  style={expensesHeaderStyles.actionTrigger}
                  className="rounded-full bg-emerald-500"
                  accessibilityLabel="Add expense"
                  accessibilityRole="button"
                >
                  <Plus size={22} color="#020617" />
                </Pressable>
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Overlay />
                <Menu.Content
                  presentation="popover"
                  placement="bottom"
                  align="center"
                  className="bg-[rgba(18,22,33,0.98)] rounded-lg min-w-[200px]"
                >
                  <Menu.Group>
                    <Menu.Item
                      id="batch-add"
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setShowBatchModal(true);
                      }}
                      style={expensesHeaderStyles.menuItem}
                    >
                      <ListPlus size={18} color="#f8fafc" />
                      <Menu.ItemTitle className="font-semibold text-slate-50">
                        Batch Add
                      </Menu.ItemTitle>
                    </Menu.Item>
                    <Menu.Item
                      id="single-expense"
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setShowAddModal(true);
                      }}
                      style={expensesHeaderStyles.menuItem}
                    >
                      <Plus size={18} color="#f8fafc" />
                      <Menu.ItemTitle className="font-semibold text-slate-50">
                        Single Expense
                      </Menu.ItemTitle>
                    </Menu.Item>
                  </Menu.Group>
                </Menu.Content>
              </Menu.Portal>
            </Menu>,
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
          {expenseSections.length === 0 ? (
            <View style={{ marginTop: getStandardHeaderWithBottomBodyOffsetTop(insets.top), paddingTop: 20 }}>
              {monthScopeBanner}
              <Card>
                <Text className="text-slate-400 py-4">
                  No expenses match your filters.
                </Text>
              </Card>
            </View>
          ) : (
            <SectionList<BudgetTransaction, ExpenseSection>
              sections={expenseSections}
              keyExtractor={(t) => t.id}
              renderItem={renderExpenseItem}
              renderSectionHeader={renderExpenseSectionHeader}
              ItemSeparatorComponent={expenseItemSeparator}
              stickySectionHeadersEnabled
              contentContainerStyle={{ paddingBottom: 100 }}
              style={{ marginTop: getStandardHeaderWithBottomBodyOffsetTop(insets.top), paddingTop: 8 }}
              ListHeaderComponent={monthScopeBanner}
            />
          )}
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

      <BatchTransactionModal
        visible={showBatchModal}
        categories={cycleCategories}
        onClose={() => {
          setShowBatchModal(false);
        }}
        onSubmitAll={async () => {
          const result = await submitBatchTransactions();
          if (result.count > 0) {
            setShowBatchModal(false);
            showSuccess(`${result.count} expenses added to queue`);

            // Sync in background and notify when done
            if (result.mutationIds.length > 0) {
              const synced = await syncBatch(result.mutationIds);
              if (synced) {
                showSuccess("Data synchronized now");
              }
            }
          } else {
            showError(
              "No expenses submitted — please fix drafts and try again",
            );
          }
        }}
      />

      <CediCalendarPickerModal
        visible={showMonthPicker}
        onRequestClose={() => setShowMonthPicker(false)}
        title="Filter by month"
        subtitle="Change year from the header, then tap a month. Months without any logged expense cannot be applied."
        footer={
          <View style={expensesMonthModalFooter.row}>
            <Pressable
              style={[
                expensesMonthModalFooter.btn,
                expensesMonthModalFooter.btnGhost,
              ]}
              onPress={() => {
                setTempSelectedMonthAndYear(null);
                setSelectedMonthAndYear(null);
                setShowMonthPicker(false);
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              accessibilityRole="button"
              accessibilityLabel="Show all months"
            >
              <Text style={expensesMonthModalFooter.btnGhostText}>
                All time
              </Text>
            </Pressable>
            <Pressable
              style={[
                expensesMonthModalFooter.btn,
                expensesMonthModalFooter.btnSolid,
              ]}
              onPress={() => {
                setSelectedMonthAndYear(tempSelectedMonthAndYear);
                setShowMonthPicker(false);
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              accessibilityRole="button"
              accessibilityLabel="Confirm month selection"
            >
              <Text style={expensesMonthModalFooter.btnSolidText}>Confirm</Text>
            </Pressable>
          </View>
        }
      >
        {expenseMonthPickerBounds ? (
          <CalendarPicker
            selected={expenseMonthPickerSelected}
            onChange={handleExpenseMonthCalendarChange}
            minDate={expenseMonthPickerBounds.minDate}
            maxDate={expenseMonthPickerBounds.maxDate}
            startStage="month"
            finalStage="month"
            showArrows
            style={cediCalendarPickerStyles.calendarWrap}
            barView={cediCalendarPickerStyles.calendarBar}
            barText={cediCalendarPickerStyles.calendarBarText}
            stageView={cediCalendarPickerStyles.calendarStage}
            monthText={cediCalendarPickerStyles.calendarMonthText}
            monthDisabledText={cediCalendarPickerStyles.calendarMonthDisabled}
            monthSelectedText={cediCalendarPickerStyles.calendarMonthSelected}
            yearMinTintColor="#34D399"
            yearMaxTintColor="#475569"
          />
        ) : null}
      </CediCalendarPickerModal>

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
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 32,
  },
});

const expensesMonthModalFooter = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 8,
    paddingTop: 4,
    flexWrap: "wrap",
  },
  btn: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  btnGhost: {
    backgroundColor: "rgba(148, 163, 184, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
  },
  btnGhostText: {
    color: "#E2E8F0",
    fontSize: 15,
    fontWeight: "600",
  },
  btnSolid: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(52, 211, 153, 0.35)",
  },
  btnSolidText: {
    color: "#6EE7B7",
    fontSize: 15,
    fontWeight: "700",
  },
});

/** Opaque fill so sticky section headers do not show list content bleeding through. */
const expensesSectionHeaderStyles = StyleSheet.create({
  stickyRoot: {
    backgroundColor: "#000000",
    paddingTop: 12,
    paddingBottom: 10,
    marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(148, 163, 184, 0.22)",
  },
});
