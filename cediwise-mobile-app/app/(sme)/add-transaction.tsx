/**
 * SME Ledger - Add / Edit Transaction
 * Supports income (sales) and expense entry with daily/weekly/monthly frequency.
 */

import { AppTextField } from "@/components/AppTextField";
import { PrimaryButton } from "@/components/PrimaryButton";
import { StandardHeader, DEFAULT_STANDARD_HEIGHT } from "@/components/CediWiseHeader";
import {
  CediCalendarPickerModal,
  cediCalendarPickerStyles,
} from "@/components/CediCalendarPickerModal";
import { BackButton } from "@/components/BackButton";
import { useSmeLedger } from "@/hooks/useSmeLedger";
import { extractVAT } from "@/utils/vatEngine";
import { PAYMENT_METHOD_LABELS } from "@/types/sme";
import type { PaymentMethod, TransactionType } from "@/types/sme";
import { useAppToast } from "@/hooks/useAppToast";
import * as Haptics from "expo-haptics";
import moment, { type Moment } from "moment";
import Calendar from "react-native-calendar-datepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  Check,
} from "lucide-react-native";
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
import { KeyboardCenteringScrollView } from "@/components/common/KeyboardCenteringScrollView";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PAYMENT_METHODS: PaymentMethod[] = ["cash", "momo", "bank", "card", "cheque", "other"];

export default function AddTransactionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    type?: string;
    editId?: string;
  }>();

  const sme = useSmeLedger();

  const editTransaction = params.editId
    ? sme.transactions.find((t) => t.id === params.editId)
    : null;

  const routeType = editTransaction?.type ?? (params.type as TransactionType) ?? "income";
  const [txType, setTxType] = useState<TransactionType>(routeType);
  const [amount, setAmount] = useState(
    editTransaction ? String(editTransaction.amount) : ""
  );
  const [description, setDescription] = useState(
    editTransaction?.description ?? ""
  );
  const [category, setCategory] = useState(editTransaction?.category ?? "");
  const [transactionDate, setTransactionDate] = useState(
    editTransaction?.transactionDate ?? new Date().toISOString().split("T")[0]
  );
  const [draftDate, setDraftDate] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    editTransaction?.paymentMethod ?? null
  );
  const [vatApplicable, setVatApplicable] = useState(
    editTransaction?.vatApplicable ?? (routeType === "income")
  );
  const [notes, setNotes] = useState(editTransaction?.notes ?? "");

  const { showError } = useAppToast();

  const [isSaving, setIsSaving] = useState(false);

  const descriptionRef = useRef<TextInput>(null);
  const notesRef = useRef<TextInput>(null);

  // Categories based on transaction type
  const availableCategories = useMemo(() => {
    return sme.categories
      .filter((c) => c.type === txType)
      .map((c) => c.name);
  }, [sme.categories, txType]);

  // Auto-select first category if none selected
  useEffect(() => {
    if (!category && availableCategories.length > 0) {
      setCategory(availableCategories[0]);
    }
  }, [availableCategories, category]);

  /** Expense dates are capped at today; clamp if user toggles type from income. */
  useEffect(() => {
    if (txType !== "expense") return;
    const m = moment(transactionDate, "YYYY-MM-DD", true);
    if (m.isValid() && m.isAfter(moment(), "day")) {
      setTransactionDate(moment().format("YYYY-MM-DD"));
    }
  }, [txType, transactionDate]);

  // VAT preview
  const vatPreview = useMemo(() => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return null;
    return extractVAT(num);
  }, [amount]);

  /** Calendar bounds: expenses cannot be dated in the future; income allows typical forward range. */
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

  const handleCalendarChange = useCallback(
    (date: Moment) => {
      setDraftDate(date.format("YYYY-MM-DD"));
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [],
  );

  const confirmDate = useCallback(() => {
    if (draftDate) {
      setTransactionDate(draftDate);
    }
    setShowDatePicker(false);
    setDraftDate(null);
  }, [draftDate]);

  const cancelDate = useCallback(() => {
    setShowDatePicker(false);
    setDraftDate(null);
  }, []);

  const handleSave = useCallback(async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showError("Invalid Amount", "Please enter an amount greater than 0");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (!description.trim()) {
      showError("Missing Description", "Please enter a description for the transaction");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (!category) {
      showError("Missing Category", "Please select a category");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (editTransaction) {
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
      } else {
        await sme.addTransaction({
          type: txType,
          amount: numAmount,
          description: description.trim(),
          category,
          transactionDate,
          paymentMethod,
          vatApplicable,
          notes: notes.trim() || null,
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSaving(false);
    }
  }, [
    amount,
    description,
    category,
    transactionDate,
    paymentMethod,
    vatApplicable,
    notes,
    txType,
    editTransaction,
    sme,
    router,
  ]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StandardHeader
        title={editTransaction ? "Edit transaction" : "Add transaction"}
        centered
        leading={<BackButton />}
        actions={[
          <Pressable key="save" onPress={handleSave} hitSlop={12} disabled={isSaving}>
            <Check color={isSaving ? "#6B7280" : "#10B981"} size={24} />
          </Pressable>
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
              if (!editTransaction) setVatApplicable(true);
            }}
          >
            <ArrowUpRight color={txType === "income" ? "#10B981" : "#6B7280"} size={18} />
            <Text
              style={[styles.typeText, txType === "income" && styles.typeTextActive]}
            >
              Income
            </Text>
          </Pressable>
          <Pressable
            style={[styles.typePill, txType === "expense" && styles.typePillExpense]}
            onPress={() => {
              setTxType("expense");
              setCategory("");
              if (!editTransaction) setVatApplicable(false);
            }}
          >
            <ArrowDownRight color={txType === "expense" ? "#EF4444" : "#6B7280"} size={18} />
            <Text
              style={[styles.typeText, txType === "expense" && styles.typeTextExpense]}
            >
              Expense
            </Text>
          </Pressable>
        </View>

        {/* Amount */}
        <AppTextField
          label="Amount (GH₵)"
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          autoFocus={!editTransaction}
          // inputClassName="text-2xl font-bold py-2"
          returnKeyType="next"
          onSubmitEditing={() => descriptionRef.current?.focus()}
        />
        {vatPreview && vatApplicable && (
          <Text style={styles.vatPreview} className="mt-1 ml-1 mb-4">
            Includes GH₵{vatPreview.vat.toFixed(2)} VAT (net: GH₵{vatPreview.net.toFixed(2)})
          </Text>
        )}

        {/* Description */}
        <View className="mt-4">
          <AppTextField
            ref={descriptionRef}
            label="Description"
            placeholder={txType === "income" ? "e.g. Daily sales" : "e.g. Market supplies"}
            value={description}
            onChangeText={setDescription}
            returnKeyType="next"
            onSubmitEditing={() => notesRef.current?.focus()}
          />
        </View>

        {/* Category */}
        <View className="mt-4">
          <Text style={styles.label}>Category</Text>
          <FlatList
            horizontal
            data={availableCategories}
            keyExtractor={(cat) => cat}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
            className="mt-2"
            renderItem={({ item: cat }) => (
              <Pressable
                style={[styles.categoryPill, category === cat && styles.categoryPillActive]}
                onPress={() => setCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    category === cat && styles.categoryTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            )}
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
            ref={notesRef}
            label="Notes (optional)"
            placeholder="Add a note..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            inputClassName="min-h-[100px] py-3"
            // style={{ textAlignVertical: "top" }}
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
        </View>

        {/* Save Button */}
        <View className="mt-8">
          <PrimaryButton
            loading={isSaving}
            onPress={handleSave}
          >
            {editTransaction ? "Update Transaction" : "Save Transaction"}
          </PrimaryButton>
        </View>
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
  categoryRow: {
    flexDirection: "row",
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  categoryPillActive: {
    backgroundColor: "rgba(16,185,129,0.2)",
  },
  categoryText: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "500",
  },
  categoryTextActive: {
    color: "#10B981",
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
});
