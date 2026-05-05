import { AppDialog } from "@/components/AppDialog";
import { AppTextField } from "@/components/AppTextField";
import { BackButton } from "@/components/BackButton";
import {
  CediCalendarPickerModal, cediCalendarPickerStyles,
} from "@/components/CediCalendarPickerModal";
import { DEFAULT_STANDARD_HEIGHT, StandardHeader } from "@/components/CediWiseHeader";
import { KeyboardCenteringScrollView } from "@/components/common/KeyboardCenteringScrollView";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useAppToast } from "@/hooks/useAppToast";
import { useSmeLedger } from "@/hooks/useSmeLedger";
import { useSMELedgerStore } from "@/stores/smeLedgerStore";
import type { DraftSMETransaction, PaymentMethod, TransactionType } from "@/types/sme";
import { PAYMENT_METHOD_LABELS } from "@/types/sme";
import { formatCurrency } from "@/utils/formatCurrency";
import { calculateVAT, extractVAT } from "@/utils/vatEngine";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Plus,
  X,
} from "lucide-react-native";
import moment, { type Moment } from "moment";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import Calendar from "react-native-calendar-datepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PAYMENT_METHODS: PaymentMethod[] = ["cash", "momo", "bank", "card", "cheque", "other"];

export default function SMEBatchTransactionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sme = useSmeLedger();
  const { showError, showInfo } = useAppToast();

  const params = useLocalSearchParams<{
    type?: string;
    editId?: string;
  }>();
  const editTransaction = params.editId
    ? sme.transactions.find((t) => t.id === params.editId)
    : null;

  const [txType, setTxType] = useState<TransactionType>(
    editTransaction?.type ?? (params.type as TransactionType) ?? "expense"
  );
  const [amount, setAmount] = useState(editTransaction ? String(editTransaction.amount) : "");
  const [description, setDescription] = useState(editTransaction?.description ?? "");
  const [category, setCategory] = useState(editTransaction?.category ?? "");
  const [transactionDate, setTransactionDate] = useState(
    editTransaction?.transactionDate ?? new Date().toISOString().split("T")[0]
  );
  const [draftDate, setDraftDate] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    editTransaction?.paymentMethod ?? null
  );
  const [vatApplicable, setVatApplicable] = useState(editTransaction?.vatApplicable ?? false);
  const [notes, setNotes] = useState(editTransaction?.notes ?? "");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const amountInputRef = useRef<TextInput>(null);
  const didPrefillLastUsedRef = useRef(false);

  const draftItems = useSMELedgerStore((s) => s.draftBatchTransactions);

  const availableCategories = useMemo(() => {
    return sme.categories
      .filter((c) => c.type === txType)
      .map((c) => c.name);
  }, [sme.categories, txType]);

  const lastEditHydrateKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (didPrefillLastUsedRef.current) return;
    if (params.editId) return;
    didPrefillLastUsedRef.current = true;
    const { lastUsedType, lastUsedCategory, lastUsedPaymentMethod } =
      useSMELedgerStore.getState();
    if (lastUsedType) setTxType(lastUsedType);
    if (lastUsedCategory) setCategory(lastUsedCategory);
    if (lastUsedPaymentMethod) setPaymentMethod(lastUsedPaymentMethod);
  }, [params.editId]);

  useEffect(() => {
    if (!params.editId) {
      lastEditHydrateKeyRef.current = null;
      return;
    }
    if (!editTransaction) return;
    const key = `${editTransaction.id}:${editTransaction.updatedAt}`;
    if (lastEditHydrateKeyRef.current === key) return;
    lastEditHydrateKeyRef.current = key;
    setTxType(editTransaction.type);
    setAmount(String(editTransaction.amount));
    setDescription(editTransaction.description);
    setCategory(editTransaction.category);
    setTransactionDate(editTransaction.transactionDate);
    setPaymentMethod(editTransaction.paymentMethod ?? null);
    setVatApplicable(editTransaction.vatApplicable);
    setNotes(editTransaction.notes ?? "");
  }, [params.editId, editTransaction]);

  useEffect(() => {
    if (!category && availableCategories.length > 0) {
      setCategory(availableCategories[0]);
    }
  }, [availableCategories, category]);

  const vatPreview = useMemo(() => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return null;
    return extractVAT(num);
  }, [amount]);

  /** Calendar bounds */
  const calendarBounds = useMemo(() => {
    const minDate = moment("1990-01-01", "YYYY-MM-DD").startOf("day");
    const maxDate =
      txType === "expense"
        ? moment().endOf("day")
        : moment().add(10, "years").endOf("day");
    return { minDate, maxDate };
  }, [txType]);

  const selectedMoment = useMemo((): Moment => {
    const m = moment(draftDate ?? transactionDate, "YYYY-MM-DD", true);
    return m.isValid() ? m : moment().startOf("day");
  }, [transactionDate, draftDate]);

  const dateDisplayLabel = useMemo(() => {
    const m = moment(draftDate ?? transactionDate, "YYYY-MM-DD", true);
    return m.isValid()
      ? m.format("ddd, D MMM YYYY")
      : (draftDate ?? transactionDate);
  }, [transactionDate, draftDate]);

  const handleCalendarChange = useCallback((date: Moment) => {
    setDraftDate(date.format("YYYY-MM-DD"));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const confirmDate = useCallback(() => {
    if (draftDate) setTransactionDate(draftDate);
    setShowDatePicker(false);
    setDraftDate(null);
  }, [draftDate]);

  const cancelDate = useCallback(() => {
    setShowDatePicker(false);
    setDraftDate(null);
  }, []);

  const validateForm = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError("Enter a valid amount");
      return null;
    }
    if (!description.trim()) {
      setFormError("Enter a description");
      return null;
    }
    if (!category) {
      setFormError("Select a category");
      return null;
    }
    setFormError(null);
    return numAmount;
  };

  const handleAddToList = () => {
    const numAmount = validateForm();
    if (numAmount === null) return;

    try {
      Haptics.selectionAsync();
    } catch { }

    const vatAmount = calculateVAT(numAmount, vatApplicable);

    const item: Omit<DraftSMETransaction, "tempId"> = {
      type: txType,
      amount: numAmount,
      description: description.trim(),
      category,
      transactionDate,
      paymentMethod,
      vatApplicable,
      vatAmount,
      notes: notes.trim() || null,
    };
    useSMELedgerStore.getState().addToDraftBatch(item);
    useSMELedgerStore.getState().setLastUsedType(txType);
    if (category) useSMELedgerStore.getState().setLastUsedCategory(category);
    if (paymentMethod) useSMELedgerStore.getState().setLastUsedPaymentMethod(paymentMethod);

    setAmount("");
    setDescription("");
    setNotes("");
    // Keep date and VAT preference
    setTimeout(() => amountInputRef.current?.focus(), 100);
  };

  const handleRemoveItem = useCallback((tempId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch { }
    useSMELedgerStore.getState().removeFromDraftBatch(tempId);
  }, []);

  const handleSaveAll = async () => {
    // If editing a single existing transaction
    if (editTransaction) {
      const numAmount = validateForm();
      if (numAmount === null) return;
      setIsSaving(true);
      try {
        await sme.updateTransaction(editTransaction.id, {
          type: txType,
          amount: numAmount,
          description: description.trim(),
          category,
          transactionDate,
          paymentMethod,
          vatApplicable,
          notes: notes.trim() || null,
        });
        showInfo("Updated", "Transaction updated successfully");
        setIsSaving(false);
        router.back();
      } catch {
        showError("Error", "Failed to update transaction");
        setIsSaving(false);
      }
      return;
    }

    // If batch list is empty, treat as single save
    if (draftItems.length === 0) {
      const numAmount = validateForm();
      if (numAmount === null) return;
      setIsSaving(true);
      try {
        const { mutationId } = await sme.addTransaction({
          type: txType,
          amount: numAmount,
          description: description.trim(),
          category,
          transactionDate,
          paymentMethod,
          vatApplicable,
          notes: notes.trim() || null,
        });
        showInfo("Saved Locally", "Transaction added to sync queue");
        setIsSaving(false);
        if (mutationId) {
          const synced = await sme.syncBatch([mutationId]);
          if (synced) showInfo("Sync Complete", "Transaction is now on the server.");
        }
        router.back();
      } catch {
        showError("Error", "Failed to save transaction");
        setIsSaving(false);
      }
      return;
    }

    // Batch Save — include current row when it is complete so count matches "Save All" label
    setIsSaving(true);
    try {
      const numAmount = parseFloat(amount);
      const formComplete =
        !Number.isNaN(numAmount) &&
        numAmount > 0 &&
        description.trim().length > 0 &&
        category.length > 0;
      if (formComplete) {
        const vatAmount = calculateVAT(numAmount, vatApplicable);
        const item: Omit<DraftSMETransaction, "tempId"> = {
          type: txType,
          amount: numAmount,
          description: description.trim(),
          category,
          transactionDate,
          paymentMethod,
          vatApplicable,
          vatAmount,
          notes: notes.trim() || null,
        };
        useSMELedgerStore.getState().addToDraftBatch(item);
        useSMELedgerStore.getState().setLastUsedType(txType);
        if (category) useSMELedgerStore.getState().setLastUsedCategory(category);
        if (paymentMethod) useSMELedgerStore.getState().setLastUsedPaymentMethod(paymentMethod);
        setAmount("");
        setDescription("");
        setNotes("");
      }

      const result = await sme.submitBatchTransactions();
      if (result.success) {
        showInfo("Saved Locally", `${result.count} transactions added to sync queue`);
        setIsSaving(false);
        router.back();
        if (result.mutationIds.length > 0) {
          const synced = await sme.syncBatch(result.mutationIds);
          if (synced) showInfo("Sync Complete", "Transactions are now on the server.");
        }
      } else if (result.count > 0) {
        setIsSaving(false);
        showInfo(
          "Partial save",
          `${result.count} transaction(s) queued; remaining drafts are still in your list.`,
        );
        if (result.mutationIds.length > 0) {
          const synced = await sme.syncBatch(result.mutationIds);
          if (!synced) {
            showError("Sync pending", "Queued items will retry when sync is available.");
          } else {
            showInfo("Sync Complete", "Queued transactions are on the server.");
          }
        }
      } else {
        setIsSaving(false);
      }
    } catch {
      showError("Error", "Failed to save transactions");
      setIsSaving(false);
    }
  };

  const totalExpenses = useMemo(
    () => draftItems.filter((d) => d.type === "expense").reduce((s, d) => s + d.amount, 0),
    [draftItems]
  );
  const totalIncome = useMemo(
    () => draftItems.filter((d) => d.type === "income").reduce((s, d) => s + d.amount, 0),
    [draftItems]
  );

  const renderDraftItem = useCallback(
    ({ item }: { item: DraftSMETransaction }) => (
      <View style={styles.draftItem}>
        <View style={styles.draftItemLeft}>
          <Text style={styles.draftItemCategory} numberOfLines={1}>
            {item.category}
          </Text>
          <Text style={styles.draftItemDesc} numberOfLines={1}>
            {item.description}
          </Text>
          <View style={styles.draftItemMeta}>
            <Text
              style={[
                styles.draftItemType,
                item.type === "income" ? styles.draftItemTypeIncome : styles.draftItemTypeExpense,
              ]}
            >
              {item.type === "income" ? "Income" : "Expense"}
            </Text>
            {item.paymentMethod && (
              <>
                <Text style={styles.draftItemDot}>·</Text>
                <Text style={styles.draftItemPayment}>{PAYMENT_METHOD_LABELS[item.paymentMethod]}</Text>
              </>
            )}
            {item.vatApplicable && (
              <>
                <Text style={styles.draftItemDot}>·</Text>
                <Text style={styles.draftItemVAT}>VAT</Text>
              </>
            )}
          </View>
        </View>
        <View style={styles.draftItemRight}>
          <Text
            style={[
              styles.draftItemAmount,
              item.type === "income" ? styles.draftItemAmountIncome : styles.draftItemAmountExpense,
            ]}
          >
            {item.type === "income" ? "+" : "-"}₵{formatCurrency(item.amount)}
          </Text>
          <Pressable
            onPress={() => handleRemoveItem(item.tempId)}
            style={styles.removeBtn}
            hitSlop={8}
            accessibilityLabel={`Remove ${item.description}`}
            accessibilityRole="button"
          >
            <X size={14} color="#94a3b8" />
          </Pressable>
        </View>
      </View>
    ),
    [handleRemoveItem]
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StandardHeader
        title={
          editTransaction
            ? "Edit Transaction"
            : draftItems.length > 0
              ? `Batch · ${draftItems.length} items`
              : "New Transaction"
        }
        centered
        leading={<BackButton />}
        actions={[
          <Pressable
            key="save"
            onPress={handleSaveAll}
            hitSlop={12}
            disabled={isSaving}
          >
            <Check color={isSaving ? "#6B7280" : "#10B981"} size={24} />
          </Pressable>,
        ]}
      />

      <KeyboardCenteringScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: 10 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ height: insets.top + (DEFAULT_STANDARD_HEIGHT || 64) }} />

        {/* Type Toggle */}
        <View style={styles.typeToggle} className="mb-4">
          <Pressable
            style={[styles.typePill, txType === "income" && styles.typePillIncome]}
            onPress={() => {
              setTxType("income");
              setCategory("");
              setVatApplicable(true);
            }}
          >
            <ArrowUpRight color={txType === "income" ? "#10B981" : "#6B7280"} size={18} />
            <Text style={[styles.typeText, txType === "income" && styles.typeTextActive]}>
              Income
            </Text>
          </Pressable>
          <Pressable
            style={[styles.typePill, txType === "expense" && styles.typePillExpense]}
            onPress={() => {
              setTxType("expense");
              setCategory("");
              setVatApplicable(false);
            }}
          >
            <ArrowDownRight color={txType === "expense" ? "#EF4444" : "#6B7280"} size={18} />
            <Text style={[styles.typeText, txType === "expense" && styles.typeTextExpense]}>
              Expense
            </Text>
          </Pressable>
        </View>

        {/* Amount */}
        <AppTextField
          ref={amountInputRef}
          label="Amount (GH₵)"
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={(t) => {
            setAmount(t);
            if (formError) setFormError(null);
          }}
          returnKeyType="done"
        />
        {vatPreview && vatApplicable && (
          <Text style={styles.vatPreview} className="mt-1 ml-1 mb-4">
            Includes GH₵{vatPreview.vat.toFixed(2)} VAT (net: GH₵{vatPreview.net.toFixed(2)})
          </Text>
        )}

        {/* Description */}
        <View className="mt-4">
          <AppTextField
            label="Description"
            placeholder={txType === "income" ? "e.g. Daily sales" : "e.g. Market supplies"}
            value={description}
            onChangeText={(t) => {
              setDescription(t);
              if (formError) setFormError(null);
            }}
            returnKeyType="done"
          />
        </View>

        {/* Date */}
        <View className="mt-6">
          <Text style={styles.label}>Date</Text>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            className="flex-row items-center justify-between mt-2 px-4 py-4 rounded-2xl bg-white/5 border border-white/10 active:bg-white/10 transition-colors"
          >
            <Text style={{ color: "#F1F5F9", fontSize: 16, fontWeight: "500" }}>{dateDisplayLabel}</Text>
            <ChevronRight color="#94A3B8" size={20} />
          </Pressable>
        </View>

        <CediCalendarPickerModal
          visible={showDatePicker}
          onRequestClose={cancelDate}
          title="Select date"
          subtitle={
            txType === "expense"
              ? "Expense entries can’t be dated in the future."
              : "Pick the day this income should appear on your ledger."
          }
          footer={
            <View style={{ flexDirection: "row", gap: 12, marginTop: 16, flexWrap: "wrap", justifyContent: "space-between" }}>
              <Pressable
                style={{ flex: 1, backgroundColor: "rgba(148, 163, 184, 0.12)", borderWidth: 1, borderColor: "rgba(148, 163, 184, 0.25)", paddingVertical: 14, borderRadius: 999, alignItems: "center" }}
                onPress={cancelDate}
              >
                <Text style={{ color: "#E2E8F0", fontSize: 15, fontWeight: "600" }}>Cancel</Text>
              </Pressable>
              <Pressable
                style={{ flex: 1, backgroundColor: "rgba(16, 185, 129, 0.2)", borderWidth: 1, borderColor: "rgba(52, 211, 153, 0.35)", paddingVertical: 14, borderRadius: 999, alignItems: "center" }}
                onPress={confirmDate}
              >
                <Text style={{ color: "#6EE7B7", fontSize: 15, fontWeight: "700" }}>Confirm</Text>
              </Pressable>
            </View>
          }
        >
          <Calendar
            selected={selectedMoment}
            onChange={handleCalendarChange}
            minDate={calendarBounds.minDate}
            maxDate={calendarBounds.maxDate}
            showArrows
            style={cediCalendarPickerStyles.calendarWrap}
            barView={cediCalendarPickerStyles.calendarBar}
            barText={cediCalendarPickerStyles.calendarBarText}
            stageView={cediCalendarPickerStyles.calendarStage}
            dayHeaderText={cediCalendarPickerStyles.calendarDayHeader}
            dayRowView={cediCalendarPickerStyles.calendarDayRow}
            dayText={cediCalendarPickerStyles.calendarDayText}
            dayTodayText={cediCalendarPickerStyles.calendarDayToday}
            daySelectedText={cediCalendarPickerStyles.calendarDaySelected}
            daySelectedView={cediCalendarPickerStyles.calendarDaySelectedView}
            dayDisabledText={cediCalendarPickerStyles.calendarDayDisabled}
            monthText={cediCalendarPickerStyles.calendarMonthText}
            monthDisabledText={cediCalendarPickerStyles.calendarMonthDisabled}
            monthSelectedText={cediCalendarPickerStyles.calendarMonthSelected}
            yearMinTintColor="#34D399"
            yearMaxTintColor="#475569"
          />
        </CediCalendarPickerModal>

        <AppDialog
          visible={showCategoryPicker}
          onOpenChange={setShowCategoryPicker}
          title="Select Category"
          description={`Choose a category for this ${txType}.`}
          primaryLabel="Close"
          onPrimary={() => setShowCategoryPicker(false)}
        >
          <View className="gap-2">
            {availableCategories.map((cat) => (
              <Pressable
                key={cat}
                style={[
                  styles.dialogCategoryItem,
                  category === cat && styles.dialogCategoryItemActive
                ]}
                onPress={() => {
                  setCategory(cat);
                  setShowCategoryPicker(false);
                  if (formError) setFormError(null);
                  void Haptics.selectionAsync();
                }}
              >
                <Text style={[
                  styles.dialogCategoryText,
                  category === cat && styles.dialogCategoryTextActive
                ]}>
                  {cat}
                </Text>
                {category === cat && (
                  <Check size={18} color="#10B981" />
                )}
              </Pressable>
            ))}
          </View>
        </AppDialog>

        {/* Payment Method */}
        <View className="mt-6">
          <Text style={styles.label}>Payment Method</Text>
          <View style={styles.methodRow} className="mt-2">
            {PAYMENT_METHODS.map((m) => (
              <Pressable
                key={m}
                style={[styles.methodPill, paymentMethod === m && styles.methodPillActive]}
                onPress={() => setPaymentMethod(m === paymentMethod ? null : m)}
              >
                <Text
                  style={[
                    styles.methodText,
                    paymentMethod === m && styles.methodTextActive,
                  ]}
                >
                  {PAYMENT_METHOD_LABELS[m]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* VAT Toggle */}
        <View className="mt-6 flex-row justify-between items-center border-t border-white/10 pt-6">
          <View>
            <Text style={styles.label}>VAT Applicable (20%)</Text>
            <Text style={styles.hint}>
              Under Act 1151 — 20% unified rate
            </Text>
          </View>
          <Switch
            value={vatApplicable}
            onValueChange={setVatApplicable}
            trackColor={{ false: "#374151", true: "#10B981" }}
            thumbColor="white"
          />
        </View>

        {/* Notes */}
        <View className="mt-6">
          <AppTextField
            label="Notes (optional)"
            placeholder="Add a note..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={2}
            inputClassName="min-h-[80px] py-3"
            returnKeyType="done"
            onSubmitEditing={handleAddToList}
          />
        </View>

        {formError ? (
          <Text style={styles.errorText}>{formError}</Text>
        ) : null}

        {/* Buttons Section */}
        <View className="mt-8 gap-4">
          {!editTransaction && (
            <Pressable
              onPress={handleAddToList}
              className="flex-row items-center justify-center gap-2 py-4 rounded-2xl bg-slate-800/80 border border-slate-700/50 active:bg-slate-700/80"
            >
              <Plus size={18} color="#10B981" />
              <Text className="text-emerald-400 font-bold text-base">Add Another...</Text>
            </Pressable>
          )}

          <PrimaryButton
            loading={isSaving}
            onPress={handleSaveAll}
          >
            <Text className="text-slate-900 font-bold text-base">
              {editTransaction
                ? "Update Transaction"
                : draftItems.length > 0
                  ? `Save All (${draftItems.length + (amount && description && category ? 1 : 0)})`
                  : "Save Transaction"}
            </Text>
          </PrimaryButton>
        </View>

        {/* Draft List */}
        {!editTransaction && draftItems.length > 0 && (
          <View style={styles.listSection}>
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderTitle}>Added ({draftItems.length})</Text>
            </View>

            <FlatList
              data={draftItems}
              keyExtractor={(item) => item.tempId}
              renderItem={renderDraftItem}
              style={styles.draftList}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
            />

            {/* Totals */}
            <View style={styles.totalRow}>
              {totalExpenses > 0 && (
                <View style={styles.totalItem}>
                  <Text style={styles.totalLabel}>Expenses</Text>
                  <Text style={styles.totalExpense}>-₵{formatCurrency(totalExpenses)}</Text>
                </View>
              )}
              {totalIncome > 0 && (
                <View style={styles.totalItem}>
                  <Text style={styles.totalLabel}>Income</Text>
                  <Text style={styles.totalIncome}>+₵{formatCurrency(totalIncome)}</Text>
                </View>
              )}
            </View>
          </View>
        )}

      </KeyboardCenteringScrollView>


    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 60,
    gap: 12,
  },
  typeToggle: {
    flexDirection: "row",
    gap: 12,
  },
  typePill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  typePillIncome: {
    backgroundColor: "rgba(16,185,129,0.15)",
  },
  typePillExpense: {
    backgroundColor: "rgba(239,68,68,0.15)",
  },
  typeText: {
    color: "#6B7280",
    fontSize: 15,
    fontWeight: "500",
  },
  typeTextActive: {
    color: "#10B981",
  },
  typeTextExpense: {
    color: "#EF4444",
  },
  label: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  vatPreview: {
    color: "#F59E0B",
    fontSize: 13,
    marginTop: 8,
  },
  hint: {
    color: "#4B5563",
    fontSize: 12,
    marginTop: 4,
  },
  methodRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  methodPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  methodPillActive: {
    backgroundColor: "rgba(59,130,246,0.2)",
  },
  methodText: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "500",
  },
  methodTextActive: {
    color: "#3B82F6",
  },
  errorText: {
    color: "#f87171",
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
  },
  listSection: {
    marginTop: 32,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    paddingTop: 24,
  },
  listHeader: {
    marginBottom: 16,
  },
  listHeaderTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  draftList: {},
  draftItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(148, 163, 184, 0.1)",
  },
  draftItemLeft: {
    flex: 1,
    minWidth: 0,
  },
  draftItemCategory: {
    fontSize: 14,
    fontWeight: "600",
    color: "#e2e8f0",
  },
  draftItemDesc: {
    fontSize: 13,
    color: "#94a3b8",
    marginTop: 2,
  },
  draftItemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  draftItemType: {
    fontSize: 11,
    fontWeight: "600",
  },
  draftItemTypeIncome: {
    color: "#10b981",
  },
  draftItemTypeExpense: {
    color: "#ef4444",
  },
  draftItemDot: {
    fontSize: 11,
    color: "#475569",
  },
  draftItemPayment: {
    fontSize: 11,
    color: "#64748b",
  },
  draftItemVAT: {
    fontSize: 11,
    color: "#f59e0b",
  },
  draftItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 8,
  },
  draftItemAmount: {
    fontSize: 14,
    fontWeight: "700",
  },
  draftItemAmountIncome: {
    color: "#10b981",
  },
  draftItemAmountExpense: {
    color: "#f87171",
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(148, 163, 184, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  totalRow: {
    flexDirection: "row",
    gap: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(148, 163, 184, 0.2)",
    marginTop: 4,
  },
  totalItem: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94a3b8",
  },
  totalExpense: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f87171",
  },
  totalIncome: {
    fontSize: 14,
    fontWeight: "700",
    color: "#10b981",
  },
  dialogCategoryItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    marginBottom: 4,
  },
  dialogCategoryItemActive: {
    backgroundColor: "rgba(16,185,129,0.08)",
    borderColor: "rgba(16,185,129,0.2)",
    borderWidth: 1,
  },
  dialogCategoryText: {
    color: "#94A3B8",
    fontSize: 16,
    fontWeight: "500",
  },
  dialogCategoryTextActive: {
    color: "#F1F5F9",
    fontWeight: "600",
  },
});
