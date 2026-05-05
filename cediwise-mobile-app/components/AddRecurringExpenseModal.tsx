import * as Haptics from "expo-haptics";
import { CalendarClock } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type {
  BudgetBucket,
  BudgetCategory,
  RecurringExpense,
  RecurringExpenseFrequency,
} from "@/types/budget";
import {
  parseOptionalRecurringEndDateYmd,
  toMonthlyEquivalentAmount,
} from "@/utils/recurringHelpers";
import { AppDialog } from "./AppDialog";
import { AppTextField } from "./AppTextField";

const FREQUENCIES: { value: RecurringExpenseFrequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "bi_weekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" },
];

const BUCKETS: { value: BudgetBucket; label: string }[] = [
  { value: "needs", label: "Needs" },
  { value: "wants", label: "Wants" },
  { value: "savings", label: "Savings" },
];

export type RecurringExpenseModalPayload = {
  name: string;
  amount: number;
  frequency: RecurringExpenseFrequency;
  bucket: BudgetBucket;
  autoAllocate?: boolean;
  categoryId?: string | null;
  endDate?: string | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: RecurringExpenseModalPayload) => void | Promise<void>;
  editing?: RecurringExpense | null;
  cycleCategories?: BudgetCategory[];
  peerRecurring?: RecurringExpense[];
  netIncomeMonthly?: number;
};

export function AddRecurringExpenseModal({
  visible,
  onClose,
  onSubmit,
  editing = null,
  cycleCategories = [],
  peerRecurring = [],
  netIncomeMonthly,
}: Props) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] =
    useState<RecurringExpenseFrequency>("monthly");
  const [bucket, setBucket] = useState<BudgetBucket>("wants");
  const [autoAllocate, setAutoAllocate] = useState(true);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const bucketCategories = useMemo(
    () => cycleCategories.filter((c) => c.bucket === bucket),
    [cycleCategories, bucket],
  );

  useEffect(() => {
    if (!visible) return;
    setError(undefined);
    if (editing) {
      setName(editing.name);
      setAmount(String(editing.amount));
      setFrequency(editing.frequency);
      setBucket(editing.bucket);
      setAutoAllocate(editing.autoAllocate);
      setCategoryId(editing.categoryId ?? null);
      setEndDate(editing.endDate ?? "");
    } else {
      setName("");
      setAmount("");
      setFrequency("monthly");
      setBucket("wants");
      setAutoAllocate(true);
      setCategoryId(null);
      setEndDate("");
    }
  }, [visible, editing]);

  useEffect(() => {
    if (!categoryId) return;
    const still = bucketCategories.some((c) => c.id === categoryId);
    if (!still) setCategoryId(null);
  }, [bucket, bucketCategories, categoryId]);

  const incomeCapWarning = useMemo(() => {
    const parsed = parseFloat(String(amount).replace(/,/g, ""));
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    if (typeof netIncomeMonthly !== "number" || netIncomeMonthly <= 0)
      return null;
    const monthlyNew = toMonthlyEquivalentAmount(parsed, frequency);
    const others = peerRecurring
      .filter((e) => e.id !== editing?.id && e.isActive)
      .reduce(
        (s, e) => s + toMonthlyEquivalentAmount(e.amount, e.frequency),
        0,
      );
    if (others + monthlyNew > netIncomeMonthly * 0.95) {
      return "Recurring bills are close to your net income — little room left for flexible spending.";
    }
    return null;
  }, [amount, editing?.id, frequency, netIncomeMonthly, peerRecurring]);

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  const handleClose = () => {
    Haptics.selectionAsync().catch(() => {});
    onClose();
  };

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }
    const parsed = parseFloat(String(amount).replace(/,/g, ""));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Enter a valid amount");
      return;
    }

    const dup = peerRecurring.some(
      (e) =>
        e.id !== editing?.id &&
        e.name.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (dup) {
      setError("You already have a recurring expense with this name");
      return;
    }

    if (
      typeof netIncomeMonthly === "number" &&
      netIncomeMonthly > 0 &&
      parsed > netIncomeMonthly * 1.5
    ) {
      setError(
        "Amount is much larger than your monthly income — check for a typo",
      );
      return;
    }

    if (autoAllocate && categoryId) {
      const cat = cycleCategories.find((c) => c.id === categoryId);
      if (!cat || cat.bucket !== bucket) {
        setError("Pick a category in the selected bucket, or clear category");
        return;
      }
    }

    const endParsed = parseOptionalRecurringEndDateYmd(endDate);
    if (!endParsed.ok) {
      setError(endParsed.error);
      return;
    }

    const payload: RecurringExpenseModalPayload = {
      name: trimmed,
      amount: parsed,
      frequency,
      bucket,
      autoAllocate,
      categoryId: autoAllocate ? categoryId : null,
      endDate: endParsed.value,
    };

    setSubmitting(true);
    setError(undefined);
    try {
      await Promise.resolve(onSubmit(payload));
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Could not save. Check your connection and try again.";
      setError(msg);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const title = editing ? "Edit Recurring Expense" : "Add Recurring Expense";

  return (
    <AppDialog
      visible={visible}
      onOpenChange={handleOpenChange}
      icon={<CalendarClock size={22} color="#10B981" />}
      title={title}
      description="Subscriptions, memberships, or regular payments"
      primaryLabel={editing ? "Save" : "Add"}
      onPrimary={handleSubmit}
      onClose={handleClose}
      loading={submitting}
    >
      <View className="gap-3">
        <View style={styles.field}>
          <AppTextField
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Netflix, Gym"
          />
        </View>

        <View style={styles.field}>
          <AppTextField
            label="Amount (GHS)"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            returnKeyType="done"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Frequency</Text>
          <View style={styles.rowWrap}>
            {FREQUENCIES.map((f) => (
              <Pressable
                key={f.value}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setFrequency(f.value);
                }}
                style={[
                  styles.chip,
                  frequency === f.value && styles.chipActive,
                ]}>
                <Text
                  style={[
                    styles.chipText,
                    frequency === f.value && styles.chipTextActive,
                  ]}>
                  {f.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Bucket</Text>
          <View style={styles.row}>
            {BUCKETS.map((b) => (
              <Pressable
                key={b.value}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setBucket(b.value);
                }}
                style={[styles.chip, bucket === b.value && styles.chipActive]}>
                <Text
                  style={[
                    styles.chipText,
                    bucket === b.value && styles.chipTextActive,
                  ]}>
                  {b.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {autoAllocate && bucketCategories.length > 0 ? (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>
              Category (optional — reserves limit when set)
            </Text>
            <View style={styles.rowWrap}>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setCategoryId(null);
                }}
                style={[styles.chip, categoryId == null && styles.chipActive]}>
                <Text
                  style={[
                    styles.chipText,
                    categoryId == null && styles.chipTextActive,
                  ]}>
                  None
                </Text>
              </Pressable>
              {bucketCategories.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setCategoryId(c.id);
                  }}
                  style={[
                    styles.chip,
                    categoryId === c.id && styles.chipActive,
                  ]}>
                  <Text
                    style={[
                      styles.chipText,
                      categoryId === c.id && styles.chipTextActive,
                    ]}
                    numberOfLines={1}>
                    {c.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.field}>
          <AppTextField
            label="End date (optional, YYYY-MM-DD)"
            value={endDate}
            onChangeText={setEndDate}
            placeholder="Leave empty if ongoing"
            autoCapitalize="none"
          />
        </View>

        <Pressable
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            setAutoAllocate((v) => !v);
          }}
          style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Auto-allocate each cycle</Text>
          <View style={[styles.toggle, autoAllocate && styles.toggleOn]}>
            <View
              style={[styles.toggleThumb, autoAllocate && styles.toggleThumbOn]}
            />
          </View>
        </Pressable>

        {incomeCapWarning ? (
          <Text style={styles.warnText}>{incomeCapWarning}</Text>
        ) : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    </AppDialog>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  fieldLabel: {
    fontSize: 12,
    color: "#94A3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: { flexDirection: "row", gap: 10 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(148, 163, 184, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
    maxWidth: "100%",
  },
  chipActive: {
    backgroundColor: "rgba(34, 197, 94, 0.18)",
    borderColor: "rgba(34, 197, 94, 0.45)",
  },
  chipText: {
    fontSize: 13,
    color: "#CBD5F5",
  },
  chipTextActive: { color: "#F8FAFC" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  toggleLabel: {
    fontSize: 14,
    color: "#E2E8F0",
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(148, 163, 184, 0.3)",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  toggleOn: { backgroundColor: "rgba(34, 197, 94, 0.5)" },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#94A3B8",
  },
  toggleThumbOn: {
    alignSelf: "flex-end",
    backgroundColor: "#FFFFFF",
  },
  warnText: {
    color: "#FBBF24",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
});
