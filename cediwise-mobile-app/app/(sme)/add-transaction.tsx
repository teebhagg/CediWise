/**
 * SME Ledger - Add / Edit Transaction
 * Supports income (sales) and expense entry with daily/weekly/monthly frequency.
 */

import { AppTextField } from "@/components/AppTextField";
import { PrimaryButton } from "@/components/PrimaryButton";
import { StandardHeader, DEFAULT_STANDARD_HEIGHT } from "@/components/CediWiseHeader";
import { BackButton } from "@/components/BackButton";
import { useSmeLedger } from "@/hooks/useSmeLedger";
import { extractVAT } from "@/utils/vatEngine";
import { PAYMENT_METHOD_LABELS } from "@/types/sme";
import type { PaymentMethod, TransactionType } from "@/types/sme";
import { useAppToast } from "@/hooks/useAppToast";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  Check,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
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

  // VAT preview
  const vatPreview = useMemo(() => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return null;
    return extractVAT(num);
  }, [amount]);

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
        title={`${editTransaction ? "Edit" : "Add"} Transaction`}
        centered
        leading={<BackButton />}
        actions={[
          <Pressable key="save" onPress={handleSave} hitSlop={12} disabled={isSaving}>
            <Check color={isSaving ? "#6B7280" : "#10B981"} size={24} />
          </Pressable>
        ]}
      />

      <ScrollView
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
          inputClassName="text-2xl font-bold py-2"
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
            onChangeText={setDescription}
          />
        </View>

        {/* Category */}
        <View className="mt-4">
          <Text style={styles.label}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
            className="mt-2"
          >
            {availableCategories.map((cat) => (
              <Pressable
                key={cat}
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
            ))}
          </ScrollView>
        </View>

        {/* Date */}
        <View className="mt-6 border-b border-white/10 pb-4">
          <Text style={styles.label}>Date</Text>
          <Pressable 
            onPress={() => setShowDatePicker(true)} 
            className="flex-row items-center justify-between mt-2 px-1"
          >
            <Text style={{ color: "white", fontSize: 16 }}>{transactionDate}</Text>
            <ChevronRight color="#64748b" size={18} />
          </Pressable>
          {showDatePicker && (
            <DateTimePicker
              value={new Date(transactionDate)}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(event, selectedDate) => {
                setShowDatePicker(Platform.OS === "ios");
                if (selectedDate) {
                  setTransactionDate(selectedDate.toISOString().split("T")[0]);
                }
              }}
            />
          )}
        </View>

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
            numberOfLines={3}
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
      </ScrollView>
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
