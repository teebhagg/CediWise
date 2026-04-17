import { LabeledTextInput } from "@/components/LabeledTextInput";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import type { GhanaTaxBreakdown } from "@/utils/ghanaTax";
import { Check, ChevronDown, ChevronRight, Sparkles, Target, X } from "lucide-react-native";
import { memo, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type {
  BudgetPreview,
  Draft,
  FinancialPriority,
  GoalType,
  IncomeFrequency,
  LifeStage,
  RecurringExpense,
  RecurringExpenseBucket,
  SpendingStyle,
  StepErrors,
  UpdateDraft,
} from "./types";
import {
  type BudgetTemplate,
  BUDGET_TEMPLATE_LIST,
  recommendBudgetTemplate,
} from "./budgetTemplates";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

function formatGHS(amount: number): string {
  return `₵${Math.round(Math.max(0, amount)).toLocaleString("en-GB")}`;
}

function parseAmount(value: string): number {
  const n = parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// ─── Bucket meta ──────────────────────────────────────────────────────────────

const BUCKET_META: Record<RecurringExpenseBucket, { label: string; color: string; bg: string; border: string; hint: string }> = {
  needs: {
    label: "Needs",
    color: "#60A5FA",
    bg: "rgba(59,130,246,0.14)",
    border: "rgba(59,130,246,0.4)",
    hint: "Essential recurring cost — affects your Needs allocation.",
  },
  wants: {
    label: "Wants",
    color: "#A78BFA",
    bg: "rgba(139,92,246,0.14)",
    border: "rgba(139,92,246,0.4)",
    hint: "Discretionary recurring spend — counted in your Wants bucket.",
  },
};

const BUCKET_OPTIONS: RecurringExpenseBucket[] = ["needs", "wants"];

const stepHeadingStyles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(34,197,94,0.14)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.32)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#FFFFFF",
    fontFamily: "Figtree-Bold",
    fontSize: 24,
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  subtitle: {
    color: "#94A3AF",
    fontFamily: "Figtree-Regular",
    fontSize: 13,
    marginTop: 10,
    lineHeight: 20,
  },
});

// ─── Strategy display meta ────────────────────────────────────────────────────

const STRATEGY_META: Record<string, { label: string; color: string; bg: string }> = {
  survival:          { label: "Survival",    color: "#FBBF24", bg: "rgba(251,191,36,0.15)"  },
  balanced:          { label: "Balanced",    color: "#22C55E", bg: "rgba(34,197,94,0.15)"   },
  moderate:          { label: "Moderate",    color: "#22D3EE", bg: "rgba(34,211,238,0.15)"  },
  aggressive:        { label: "Aggressive",  color: "#818CF8", bg: "rgba(129,140,248,0.15)" },
  aggressive_savings:{ label: "Aggressive",  color: "#818CF8", bg: "rgba(129,140,248,0.15)" },
  custom:            { label: "Custom",      color: "#94A3B8", bg: "rgba(148,163,184,0.15)" },
};

// ─── Shared UI ────────────────────────────────────────────────────────────────

function StepHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View>
      <View style={stepHeadingStyles.titleRow}>
        <View style={stepHeadingStyles.iconBadge}>
          <Sparkles size={17} color="#22C55E" />
        </View>
        <Text style={stepHeadingStyles.title}>{title}</Text>
      </View>
      {subtitle ? (
        <Text style={stepHeadingStyles.subtitle}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <Text style={{ color: "#94A3B8", fontFamily: "Figtree-SemiBold", fontSize: 13, marginBottom: 10 }}>
      {text}
    </Text>
  );
}

function CheckboxOption({
  label,
  description,
  selected,
  onPress,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => ({
        minHeight: 52,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: selected ? "rgba(34,197,94,0.55)" : "rgba(148,163,184,0.25)",
        backgroundColor: selected ? "rgba(34,197,94,0.16)" : "rgba(15,23,42,0.35)",
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        opacity: pressed ? 0.9 : 1,
      })}>
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 6,
          borderWidth: 1.5,
          borderColor: selected ? "#22C55E" : "rgba(148,163,184,0.5)",
          backgroundColor: selected ? "#22C55E" : "transparent",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 1,
        }}>
        {selected ? <Check size={12} color="#04140A" /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: "#E2E8F0", fontFamily: "Figtree-Medium", fontSize: 14 }}>
          {label}
        </Text>
        {description ? (
          <Text style={{ color: "#94A3AF", fontFamily: "Figtree-Regular", fontSize: 12, marginTop: 2, lineHeight: 18 }}>
            {description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function PillOption({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => ({
        minHeight: 44,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: selected ? "rgba(34,197,94,0.6)" : "rgba(148,163,184,0.3)",
        backgroundColor: selected ? "rgba(34,197,94,0.16)" : "rgba(15,23,42,0.35)",
        paddingHorizontal: 14,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        opacity: pressed ? 0.9 : 1,
      })}>
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          borderWidth: 1.5,
          borderColor: selected ? "#22C55E" : "rgba(148,163,184,0.55)",
          backgroundColor: selected ? "#22C55E" : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}>
        {selected ? <Check size={11} color="#04140A" /> : null}
      </View>
      <Text style={{ color: selected ? "#DCFCE7" : "#E2E8F0", fontFamily: "Figtree-Medium", fontSize: 13 }}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INCOME_FREQUENCIES: { value: IncomeFrequency; label: string; description: string }[] = [
  { value: "weekly", label: "Weekly", description: "Paid every week (about 4.33 times each month)." },
  { value: "bi_weekly", label: "Bi-weekly", description: "Paid every two weeks (about 2.17 times each month)." },
  { value: "monthly", label: "Monthly", description: "Paid once monthly (default cycle behavior)." },
];

const LIFE_STAGES: { value: LifeStage; label: string; description: string }[] = [
  { value: "student", label: "Student", description: "Lower steady income, education-heavy priorities." },
  { value: "young_professional", label: "Young Professional", description: "Early career growth and lifestyle balance." },
  { value: "family", label: "Family", description: "Household needs and long-term stability focus." },
  { value: "retiree", label: "Retiree", description: "Preserve spending stability and savings drawdown." },
];

const SPENDING_STYLES: { value: SpendingStyle; label: string; description: string }[] = [
  { value: "conservative", label: "Conservative", description: "Prefers lower discretionary spend and tighter limits." },
  { value: "moderate", label: "Moderate", description: "Balanced day-to-day spending pattern." },
  { value: "liberal", label: "Liberal", description: "Higher flexibility for wants and lifestyle spending." },
];

const FINANCIAL_PRIORITIES: { value: FinancialPriority; label: string; description: string }[] = [
  { value: "debt_payoff", label: "Pay Off Debt", description: "Prioritize reducing debt obligations faster." },
  { value: "savings_growth", label: "Grow Savings", description: "Prioritize emergency fund and long-term reserves." },
  { value: "lifestyle", label: "Lifestyle", description: "Leave more room for wants and quality-of-life spending." },
  { value: "balanced", label: "Balanced", description: "Keep debt, savings, and lifestyle relatively even." },
];

const INTERESTS = ["Tech", "Fashion", "Fitness", "Food", "Travel", "Gaming", "Music", "Business", "Beauty"] as const;

const GOAL_TYPES: { value: GoalType; label: string }[] = [
  { value: "emergency_fund", label: "Emergency Fund" },
  { value: "project", label: "Project" },
  { value: "investment", label: "Investment" },
];

const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => i + 1);

// ─── StepIncome ("Your Money") ────────────────────────────────────────────────

type StepIncomeProps = {
  draft: Draft;
  errors: StepErrors;
  keyboardAccessoryId: string;
  netPreview: GhanaTaxBreakdown | null;
  updateDraft: UpdateDraft;
};

export const StepIncome = memo(function StepIncome({
  draft,
  errors,
  keyboardAccessoryId,
  netPreview,
  updateDraft,
}: StepIncomeProps) {
  const [paydayOpen, setPaydayOpen] = useState(false);
  const expand = useSharedValue(0);

  useEffect(() => {
    expand.value = withTiming(paydayOpen ? 1 : 0, { duration: 220, easing: Easing.out(Easing.cubic) });
  }, [expand, paydayOpen]);

  const dropdownAnimStyle = useAnimatedStyle(() => ({
    maxHeight: 320 * expand.value,
    opacity: expand.value,
    marginTop: 8 * expand.value,
    transform: [{ translateY: (1 - expand.value) * -8 }],
    overflow: "hidden",
  }));

  const frequencyFactor =
    draft.incomeFrequency === "weekly" ? 52 / 12 : draft.incomeFrequency === "bi_weekly" ? 26 / 12 : 1;
  const periodNetPreview = netPreview ? Math.max(0, netPreview.netTakeHome / frequencyFactor) : null;

  return (
    <View>
      <StepHeading title="Your Money" subtitle="A few basics to generate your personalized budget." />

      <View style={{ marginTop: 18, gap: 18 }}>
        {/* Income Frequency */}
        <View>
          <SectionLabel text="Income Frequency" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {INCOME_FREQUENCIES.map((item) => (
              <PillOption
                key={item.value}
                label={item.label}
                selected={draft.incomeFrequency === item.value}
                onPress={() => updateDraft({ incomeFrequency: item.value })}
              />
            ))}
          </View>
          <Text style={{ color: "#94A3AF", fontFamily: "Figtree-Regular", fontSize: 12, marginTop: 8, lineHeight: 18 }}>
            {INCOME_FREQUENCIES.find((x) => x.value === draft.incomeFrequency)?.description}
          </Text>
        </View>

        {/* Salary */}
        <LabeledTextInput
          label={
            draft.incomeFrequency === "weekly"
              ? "Weekly Salary (GHS)"
              : draft.incomeFrequency === "bi_weekly"
                ? "Bi-weekly Salary (GHS)"
                : "Monthly Salary (GHS)"
          }
          keyboardType="decimal-pad"
          returnKeyType="done"
          inputAccessoryViewID={keyboardAccessoryId}
          value={draft.stableSalary}
          onChangeText={(v) => updateDraft({ stableSalary: v })}
          error={errors.stableSalary}
        />

        {/* Payday */}
        <View>
          <SectionLabel text="Payday" />
          <Pressable
            onPress={() => setPaydayOpen((prev) => !prev)}
            style={{
              minHeight: 46,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: "rgba(148,163,184,0.3)",
              backgroundColor: "rgba(15,23,42,0.35)",
              paddingHorizontal: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
            <Text style={{ color: "#E2E8F0", fontFamily: "Figtree-Medium", fontSize: 13 }}>
              Day {draft.paydayDay} of each month
            </Text>
            <Text style={{ color: "#94A3B8", fontFamily: "Figtree-Regular", fontSize: 12 }}>
              {paydayOpen ? "Hide" : "Select"}
            </Text>
          </Pressable>
          <Animated.View style={dropdownAnimStyle}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 4 }}>
              {DAY_OPTIONS.map((day) => {
                const selected = draft.paydayDay === day;
                return (
                  <Pressable
                    key={day}
                    onPress={() => { updateDraft({ paydayDay: day }); setPaydayOpen(false); }}
                    style={{
                      minWidth: 36,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: selected ? "rgba(34,197,94,0.55)" : "rgba(148,163,184,0.25)",
                      backgroundColor: selected ? "rgba(34,197,94,0.2)" : "rgba(148,163,184,0.12)",
                    }}>
                    <Text style={{ color: selected ? "#22C55E" : "#E2E8F0", fontFamily: "Figtree-Medium", fontSize: 12, textAlign: "center" }}>
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
          {errors.paydayDay ? (
            <Text style={{ color: "#FCA5A5", fontFamily: "Figtree-Regular", fontSize: 12, marginTop: 6 }}>
              {errors.paydayDay}
            </Text>
          ) : null}
        </View>

        {/* Auto Tax */}
        <CheckboxOption
          label={`Apply SSNIT + PAYE deductions: ${draft.autoTax ? "On" : "Off"}`}
          description={
            draft.autoTax
              ? periodNetPreview
                ? `Estimated ${draft.incomeFrequency.replace("_", "-")} take-home: ₵${Math.round(periodNetPreview).toLocaleString("en-GB")}`
                : "Estimating take-home..."
              : "Turn off if your salary is already net."
          }
          selected={draft.autoTax}
          onPress={() => updateDraft({ autoTax: !draft.autoTax })}
        />
      </View>
    </View>
  );
});

// ─── StepStyle ("Your Style") ─────────────────────────────────────────────────

type StepStyleProps = {
  draft: Draft;
  toggleInterest: (interest: string) => void;
  updateDraft: UpdateDraft;
};

export const StepStyle = memo(function StepStyle({ draft, toggleInterest, updateDraft }: StepStyleProps) {
  return (
    <View>
      <StepHeading title="Your Style" subtitle="Personalizes your budget split and spending categories. All optional." />

      <View style={{ marginTop: 18, gap: 16 }}>
        <View>
          <SectionLabel text="Life Stage" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {LIFE_STAGES.map((item) => (
              <PillOption
                key={item.value}
                label={item.label}
                selected={draft.lifeStage === item.value}
                onPress={() => updateDraft({ lifeStage: draft.lifeStage === item.value ? null : item.value })}
              />
            ))}
          </View>
          {draft.lifeStage ? (
            <Text style={{ color: "#94A3AF", fontFamily: "Figtree-Regular", fontSize: 12, marginTop: 8, lineHeight: 18 }}>
              {LIFE_STAGES.find((x) => x.value === draft.lifeStage)?.description}
            </Text>
          ) : null}
        </View>

        <View>
          <SectionLabel text="Spending Style" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {SPENDING_STYLES.map((item) => (
              <PillOption
                key={item.value}
                label={item.label}
                selected={draft.spendingStyle === item.value}
                onPress={() => updateDraft({ spendingStyle: draft.spendingStyle === item.value ? null : item.value })}
              />
            ))}
          </View>
          {draft.spendingStyle ? (
            <Text style={{ color: "#94A3AF", fontFamily: "Figtree-Regular", fontSize: 12, marginTop: 8, lineHeight: 18 }}>
              {SPENDING_STYLES.find((x) => x.value === draft.spendingStyle)?.description}
            </Text>
          ) : null}
        </View>

        <View>
          <SectionLabel text="Financial Priority" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {FINANCIAL_PRIORITIES.map((item) => (
              <PillOption
                key={item.value}
                label={item.label}
                selected={draft.financialPriority === item.value}
                onPress={() => updateDraft({ financialPriority: draft.financialPriority === item.value ? null : item.value })}
              />
            ))}
          </View>
          {draft.financialPriority ? (
            <Text style={{ color: "#94A3AF", fontFamily: "Figtree-Regular", fontSize: 12, marginTop: 8, lineHeight: 18 }}>
              {FINANCIAL_PRIORITIES.find((x) => x.value === draft.financialPriority)?.description}
            </Text>
          ) : null}
        </View>

        <View>
          <SectionLabel text="Interests" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {INTERESTS.map((interest) => (
              <PillOption
                key={interest}
                label={interest}
                selected={draft.interests.includes(interest)}
                onPress={() => toggleInterest(interest)}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
});

// ─── Expense row (shared) ─────────────────────────────────────────────────────

function BucketBadge({ bucket }: { bucket: RecurringExpenseBucket }) {
  const meta = BUCKET_META[bucket];
  return (
    <View style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: meta.bg, borderWidth: 1, borderColor: meta.border }}>
      <Text style={{ color: meta.color, fontFamily: "Figtree-SemiBold", fontSize: 10, letterSpacing: 0.2 }}>
        {meta.label}
      </Text>
    </View>
  );
}

function ExpenseRow({ expense, onRemove }: { expense: RecurringExpense; onRemove: () => void }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: "rgba(15,23,42,0.5)",
        borderWidth: 1,
        borderColor: "rgba(148,163,184,0.12)",
      }}>
      <BucketBadge bucket={expense.bucket} />
      <Text style={{ flex: 1, color: "#E2E8F0", fontFamily: "Figtree-Medium", fontSize: 13 }} numberOfLines={1}>
        {expense.name}
      </Text>
      <Text style={{ color: "#94A3B8", fontFamily: "Figtree-SemiBold", fontSize: 13 }}>
        {formatGHS(parseAmount(expense.amount))}
      </Text>
      <Pressable
        onPress={onRemove}
        accessibilityLabel={`Remove ${expense.name}`}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
        <X size={15} color="#64748B" />
      </Pressable>
    </View>
  );
}

// ─── Recurring Expense Dialog ─────────────────────────────────────────────────

type ExpenseDialogProps = {
  visible: boolean;
  expenses: RecurringExpense[];
  onAdd: (expense: Omit<RecurringExpense, "id">) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
};

function ExpenseDialog({ visible, expenses, onAdd, onRemove, onClose }: ExpenseDialogProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(0);

  const [name, setName] = useState("");
  const [bucket, setBucket] = useState<RecurringExpenseBucket>("needs");
  const [amount, setAmount] = useState("");
  const [nameError, setNameError] = useState(false);
  const [amountError, setAmountError] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardOpen(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const resetForm = useCallback(() => {
    setName("");
    setBucket("needs");
    setAmount("");
    setNameError(false);
    setAmountError(false);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const validate = useCallback((): boolean => {
    const nameOk = name.trim().length > 0;
    const amountOk = parseAmount(amount) > 0;
    setNameError(!nameOk);
    setAmountError(!amountOk);
    return nameOk && amountOk;
  }, [name, amount]);

  /** Add current form entry and keep the dialog open for another entry. */
  const handleAddAnother = useCallback(() => {
    if (!validate()) return;
    onAdd({ name: name.trim(), bucket, amount });
    resetForm();
  }, [validate, onAdd, name, bucket, amount, resetForm]);

  /** Save current form entry (if non-empty) then close. */
  const handleSaveClose = useCallback(() => {
    const hasContent = name.trim().length > 0 || parseAmount(amount) > 0;
    if (hasContent) {
      if (!validate()) return;
      onAdd({ name: name.trim(), bucket, amount });
    }
    resetForm();
    onClose();
  }, [validate, onAdd, onClose, resetForm, name, bucket, amount]);

  // Reset drag position each time the sheet opens
  useEffect(() => {
    if (visible) {
      translateY.value = 0;
    }
  }, [visible, translateY]);

  const sheetDragStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: Math.max(0, translateY.value) }],
  }));

  // Pan gesture on the drag-area — swipe down to dismiss
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 100 || e.velocityY > 800) {
        translateY.value = withTiming(800, { duration: 260 }, () => {
          runOnJS(handleClose)();
        });
      } else {
        translateY.value = withSpring(0, { damping: 18, stiffness: 280 });
      }
    });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        {/* Tap-to-dismiss backdrop */}
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ width: "100%" }}>
          <Animated.View
            style={[
              styles.sheet,
              {
                paddingBottom: Math.max(insets.bottom, 16),
                maxHeight: keyboardOpen ? 350 : 700,
              },
              sheetDragStyle,
            ]}>

            {/* Draggable handle + header area */}
            <GestureDetector gesture={panGesture}>
              <View style={styles.dragArea}>
                <View style={styles.handle} />
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>Add Recurring Expense</Text>
                  <Pressable
                    onPress={handleClose}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                    <X size={20} color="#94A3B8" />
                  </Pressable>
                </View>
              </View>
            </GestureDetector>

            {/* Header / content separator */}
            <View style={styles.headerSeparator} />

            {/* Scrollable form + expense list */}
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 16, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>

              {/* Name */}
              <LabeledTextInput
                label="Expense Name"
                placeholder="e.g. Rent, Netflix, Gym membership"
                value={name}
                onChangeText={(v) => {
                  setName(v);
                  if (nameError && v.trim().length > 0) setNameError(false);
                }}
                error={nameError ? "Enter a name for this expense" : undefined}
                returnKeyType="next"
              />

              {/* Bucket selector */}
              <View style={{ gap: 10 }}>
                <Text style={styles.fieldLabel}>BUDGET BUCKET</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {BUCKET_OPTIONS.map((b) => {
                    const meta = BUCKET_META[b];
                    const selected = bucket === b;
                    return (
                      <Pressable
                        key={b}
                        onPress={() => setBucket(b)}
                        style={({ pressed }) => ({
                          flex: 1,
                          alignItems: "center",
                          paddingVertical: 12,
                          borderRadius: 12,
                          borderWidth: 1.5,
                          borderColor: selected ? meta.border : "rgba(148,163,184,0.2)",
                          backgroundColor: selected ? meta.bg : "rgba(15,23,42,0.4)",
                          opacity: pressed ? 0.85 : 1,
                        })}>
                        <Text
                          style={{
                            color: selected ? meta.color : "#64748B",
                            fontFamily: "Figtree-SemiBold",
                            fontSize: 12,
                            letterSpacing: 0.3,
                          }}>
                          {meta.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.bucketHint}>{BUCKET_META[bucket].hint}</Text>
              </View>

              {/* Amount */}
              <LabeledTextInput
                label="Amount (GHS)"
                placeholder="0.00"
                keyboardType="decimal-pad"
                returnKeyType="done"
                value={amount}
                onChangeText={(v) => {
                  setAmount(v);
                  if (amountError && parseAmount(v) > 0) setAmountError(false);
                }}
                error={amountError ? "Enter an amount greater than 0" : undefined}
              />

              {/* Action buttons */}
              <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                <SecondaryButton
                  onPress={handleAddAnother}
                  className="flex-1 min-h-[48px] rounded-2xl"
                  accessibilityLabel="Add another expense">
                  Add another
                </SecondaryButton>

                <PrimaryButton
                  onPress={handleSaveClose}
                  className="flex-1 min-h-[48px] rounded-2xl"
                  accessibilityLabel="Save expenses and close">
                  Save & close
                </PrimaryButton>
              </View>

              {/* Existing expenses list */}
              {expenses.length > 0 && (
                <View style={{ gap: 8 }}>
                  <View style={styles.divider} />
                  <Text style={styles.existingLabel}>
                    Added · {expenses.length} expense{expenses.length !== 1 ? "s" : ""}
                  </Text>
                  {expenses.map((expense) => (
                    <ExpenseRow key={expense.id} expense={expense} onRemove={() => onRemove(expense.id)} />
                  ))}
                </View>
              )}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Expandable goal card ─────────────────────────────────────────────────────

function ExpandableGoalCard({
  open,
  onToggle,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const expand = useSharedValue(0);
  const chevronRotate = useSharedValue(0);

  useEffect(() => {
    expand.value = withTiming(open ? 1 : 0, { duration: 240, easing: Easing.out(Easing.cubic) });
    chevronRotate.value = withSpring(open ? 1 : 0, { damping: 18, stiffness: 200 });
  }, [open, expand, chevronRotate]);

  const bodyStyle = useAnimatedStyle(() => ({
    maxHeight: 420 * expand.value,
    opacity: expand.value,
    overflow: "hidden",
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotate.value * 180}deg` }],
  }));

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: open ? "rgba(129,140,248,0.35)" : "rgba(148,163,184,0.2)",
        borderRadius: 16,
        backgroundColor: open ? "rgba(129,140,248,0.06)" : "rgba(15,23,42,0.35)",
        overflow: "hidden",
      }}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: 14,
          paddingVertical: 14,
          opacity: pressed ? 0.85 : 1,
        })}>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: "rgba(129,140,248,0.12)",
            alignItems: "center",
            justifyContent: "center",
          }}>
          <Target size={14} color="#818CF8" />
        </View>
        <Text style={{ flex: 1, color: open ? "#C7D2FE" : "#E2E8F0", fontFamily: "Figtree-SemiBold", fontSize: 14 }}>
          + Set a savings goal
        </Text>
        <Animated.View style={chevronStyle}>
          <ChevronDown size={16} color={open ? "#818CF8" : "#94A3B8"} />
        </Animated.View>
      </Pressable>

      <Animated.View style={bodyStyle}>
        <View
          style={{
            paddingHorizontal: 14,
            paddingBottom: 16,
            gap: 12,
            borderTopWidth: 1,
            borderTopColor: "rgba(148,163,184,0.12)",
          }}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Template card ────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  isSelected,
  isRecommended,
  onPress,
}: {
  template: BudgetTemplate;
  isSelected: boolean;
  isRecommended: boolean;
  onPress: () => void;
}) {
  const hasSplit = template.needsPct !== null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`${template.name} budget template`}
      accessibilityHint={isRecommended ? "Recommended for your profile" : undefined}
      style={({ pressed }) => ({
        width: 150,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: isSelected ? "rgba(34,197,94,0.6)" : "rgba(148,163,184,0.15)",
        backgroundColor: isSelected ? "rgba(34,197,94,0.06)" : "rgba(15,23,42,0.5)",
        padding: 14,
        gap: 5,
        opacity: pressed ? 0.85 : 1,
      })}>

      {/* "For you" badge */}
      {isRecommended && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            alignSelf: "flex-start",
            backgroundColor: "rgba(251,191,36,0.13)",
            borderRadius: 6,
            paddingHorizontal: 7,
            paddingVertical: 3,
            borderWidth: 1,
            borderColor: "rgba(251,191,36,0.3)",
            marginBottom: 2,
          }}>
          <Sparkles size={9} color="#FBBF24" />
          <Text
            style={{
              color: "#FBBF24",
              fontFamily: "Figtree-SemiBold",
              fontSize: 10,
              letterSpacing: 0.3,
            }}>
            For you
          </Text>
        </View>
      )}

      {/* Name */}
      <Text
        style={{
          color: isSelected ? "#FFFFFF" : "#CBD5E1",
          fontFamily: "Figtree-Bold",
          fontSize: 15,
          letterSpacing: -0.3,
          lineHeight: 20,
        }}>
        {template.name}
      </Text>

      {/* Tagline */}
      <Text
        style={{ color: "#64748B", fontFamily: "Figtree-Regular", fontSize: 11, lineHeight: 15 }}
        numberOfLines={2}>
        {template.tagline}
      </Text>

      {/* Split visualisation */}
      {hasSplit ? (
        <View style={{ marginTop: 6, gap: 4 }}>
          <View style={{ flexDirection: "row", gap: 2, height: 5 }}>
            <View style={{ flex: template.needsPct!, backgroundColor: "#EF4444", borderRadius: 3 }} />
            <View style={{ flex: template.wantsPct!, backgroundColor: "#F59E0B", borderRadius: 3 }} />
            <View style={{ flex: template.savingsPct!, backgroundColor: "#22C55E", borderRadius: 3 }} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: "#EF4444", fontFamily: "Figtree-Medium", fontSize: 9 }}>
              {Math.round(template.needsPct! * 100)}%
            </Text>
            <Text style={{ color: "#F59E0B", fontFamily: "Figtree-Medium", fontSize: 9 }}>
              {Math.round(template.wantsPct! * 100)}%
            </Text>
            <Text style={{ color: "#22C55E", fontFamily: "Figtree-Medium", fontSize: 9 }}>
              {Math.round(template.savingsPct! * 100)}%
            </Text>
          </View>
        </View>
      ) : (
        // Smart card — decorative animated-looking bars instead of fixed split
        <View style={{ marginTop: 6, flexDirection: "row", alignItems: "flex-end", gap: 3, height: 18 }}>
          {[0.45, 0.7, 0.55, 0.85, 0.6, 0.4, 0.75].map((h, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: `${h * 100}%` as any,
                borderRadius: 2,
                backgroundColor:
                  i % 3 === 0
                    ? "rgba(34,197,94,0.35)"
                    : i % 3 === 1
                      ? "rgba(34,211,238,0.25)"
                      : "rgba(129,140,248,0.25)",
              }}
            />
          ))}
        </View>
      )}

      {/* Selected check */}
      {isSelected && (
        <View
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: "#22C55E",
            alignItems: "center",
            justifyContent: "center",
          }}>
          <Check size={10} color="#04140A" strokeWidth={3} />
        </View>
      )}
    </Pressable>
  );
}

// ─── StepPreview ("Your Budget Preview") ──────────────────────────────────────

type StepPreviewProps = {
  draft: Draft;
  updateDraft: UpdateDraft;
  preview: BudgetPreview;
};

export const StepPreview = memo(function StepPreview({ draft, updateDraft, preview }: StepPreviewProps) {
  const [expenseDialogVisible, setExpenseDialogVisible] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);

  const recommendedTemplate = useMemo(
    () => recommendBudgetTemplate(draft.lifeStage, draft.spendingStyle, draft.financialPriority),
    [draft.lifeStage, draft.spendingStyle, draft.financialPriority],
  );

  const handleAddExpense = useCallback(
    (expense: Omit<RecurringExpense, "id">) => {
      const newExpense: RecurringExpense = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        ...expense,
      };
      updateDraft({ recurringExpenses: [...draft.recurringExpenses, newExpense] });
    },
    [draft.recurringExpenses, updateDraft],
  );

  const handleRemoveExpense = useCallback(
    (id: string) => {
      updateDraft({ recurringExpenses: draft.recurringExpenses.filter((e) => e.id !== id) });
    },
    [draft.recurringExpenses, updateDraft],
  );

  const totalRecurring = draft.recurringExpenses.reduce((sum, e) => sum + parseAmount(e.amount), 0);
  const count = draft.recurringExpenses.length;

  const needsGHS = preview.netIncome * preview.needsPct;
  const wantsGHS = preview.netIncome * preview.wantsPct;
  const savingsGHS = preview.netIncome * preview.savingsPct;

  const strategyKey = preview.strategy in STRATEGY_META ? preview.strategy : "custom";
  const { label: strategyLabel, color: strategyColor, bg: strategyBg } = STRATEGY_META[strategyKey];

  return (
    <View>
      <StepHeading title="Your Budget" subtitle="Here's your computed budget before we lock it in." />

      <View style={{ marginTop: 18, gap: 14 }}>
        {/* Cycle info */}
        <Text style={{ color: "#64748B", fontFamily: "Figtree-Regular", fontSize: 12 }}>
          Payday-to-payday, starting on the {ordinal(draft.paydayDay)} of each month
        </Text>

        {/* ── Template picker ── */}
        <View style={{ gap: 10 }}>
          <SectionLabel text="BUDGET TEMPLATE" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10 }}>
            {BUDGET_TEMPLATE_LIST.map((tmpl) => (
              <TemplateCard
                key={tmpl.key}
                template={tmpl}
                isSelected={draft.selectedTemplate === tmpl.key}
                isRecommended={tmpl.key === recommendedTemplate}
                onPress={() => updateDraft({ selectedTemplate: tmpl.key })}
              />
            ))}
          </ScrollView>
        </View>

        {/* Budget split */}
        <View style={{ borderWidth: 1, borderColor: "rgba(34,197,94,0.22)", borderRadius: 18, backgroundColor: "rgba(34,197,94,0.06)", padding: 16 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[
              { label: "Needs", amount: needsGHS, pct: Math.round(preview.needsPct * 100) },
              { label: "Wants", amount: wantsGHS, pct: Math.round(preview.wantsPct * 100) },
              { label: "Savings", amount: savingsGHS, pct: Math.round(preview.savingsPct * 100) },
            ].map((col) => (
              <View
                key={col.label}
                style={{
                  flex: 1,
                  alignItems: "center",
                  gap: 4,
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: "rgba(15,23,42,0.5)",
                  borderWidth: 1,
                  borderColor: "rgba(148,163,184,0.12)",
                }}>
                <Text style={{ color: "#94A3B8", fontFamily: "Figtree-Medium", fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase" }}>
                  {col.label}
                </Text>
                <Text style={{ color: "#FFFFFF", fontFamily: "Figtree-Bold", fontSize: 16, letterSpacing: -0.3 }}>
                  {formatGHS(col.amount)}
                </Text>
                <Text style={{ color: "#64748B", fontFamily: "Figtree-Regular", fontSize: 11 }}>
                  {col.pct}%
                </Text>
              </View>
            ))}
          </View>
          <View style={{ alignItems: "flex-start", marginTop: 12 }}>
            <View style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: strategyBg, borderWidth: 1, borderColor: strategyColor + "55" }}>
              <Text style={{ color: strategyColor, fontFamily: "Figtree-SemiBold", fontSize: 12, letterSpacing: 0.3 }}>
                {strategyLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* Recurring expenses — tap-to-open dialog */}
        <View style={{ gap: 10 }}>
          <Pressable
            onPress={() => setExpenseDialogVisible(true)}
            style={({ pressed }) => ({
              borderWidth: 1,
              borderColor: count > 0 ? "rgba(34,197,94,0.35)" : "rgba(148,163,184,0.2)",
              borderRadius: 16,
              backgroundColor: count > 0 ? "rgba(34,197,94,0.06)" : "rgba(15,23,42,0.35)",
              paddingHorizontal: 14,
              paddingVertical: 14,
              opacity: pressed ? 0.85 : 1,
            })}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: "rgba(34,197,94,0.12)",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                <Text style={{ color: "#22C55E", fontFamily: "Figtree-Bold", fontSize: 16, lineHeight: 20 }}>₵</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: count > 0 ? "#DCFCE7" : "#E2E8F0", fontFamily: "Figtree-SemiBold", fontSize: 14 }}>
                  {count > 0 ? `${count} recurring expense${count !== 1 ? "s" : ""}` : "+ Add recurring expenses"}
                </Text>
                {totalRecurring > 0 && (
                  <Text style={{ color: "#22C55E", fontFamily: "Figtree-Regular", fontSize: 12, marginTop: 2 }}>
                    {formatGHS(totalRecurring)}/mo · updates your split above
                  </Text>
                )}
              </View>
              <ChevronRight size={16} color={count > 0 ? "#22C55E" : "#94A3B8"} />
            </View>
          </Pressable>

          {/* Inline list of added expenses with quick-delete */}
          {count > 0 && (
            <View style={{ gap: 6 }}>
              {draft.recurringExpenses.map((expense) => (
                <ExpenseRow key={expense.id} expense={expense} onRemove={() => handleRemoveExpense(expense.id)} />
              ))}
            </View>
          )}
        </View>

        {/* Savings goal */}
        <ExpandableGoalCard open={goalOpen} onToggle={() => setGoalOpen((v) => !v)}>
          <Text style={{ color: "#64748B", fontFamily: "Figtree-Regular", fontSize: 12, lineHeight: 18, marginTop: 4 }}>
            Stored as your primary goal on your profile.
          </Text>
          <View>
            <SectionLabel text="Goal Type" />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {GOAL_TYPES.map((g) => (
                <PillOption
                  key={g.value}
                  label={g.label}
                  selected={draft.goalType === g.value}
                  onPress={() => updateDraft({ goalType: draft.goalType === g.value ? null : g.value })}
                />
              ))}
            </View>
          </View>
          <LabeledTextInput
            label="Target Amount (GHS)"
            keyboardType="decimal-pad"
            returnKeyType="done"
            value={draft.goalAmount}
            onChangeText={(v) => updateDraft({ goalAmount: v })}
          />
          <LabeledTextInput
            label="Timeline (e.g. 3 months)"
            keyboardType="default"
            returnKeyType="done"
            value={draft.goalTimeline}
            onChangeText={(v) => updateDraft({ goalTimeline: v })}
          />
        </ExpandableGoalCard>
      </View>

      {/* The recurring expense dialog */}
      <ExpenseDialog
        visible={expenseDialogVisible}
        expenses={draft.recurringExpenses}
        onAdd={handleAddExpense}
        onRemove={handleRemoveExpense}
        onClose={() => setExpenseDialogVisible(false)}
      />
    </View>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  sheet: {
    backgroundColor: "#0B1220",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
    // maxHeight and paddingBottom are set dynamically via inline style
  },
  dragArea: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(148,163,184,0.3)",
    alignSelf: "center",
    marginBottom: 14,
  },
  headerSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(148,163,184,0.18)",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: {
    color: "#FFFFFF",
    fontFamily: "Figtree-Bold",
    fontSize: 18,
    letterSpacing: -0.3,
  },
  fieldLabel: {
    color: "#64748B",
    fontFamily: "Figtree-SemiBold",
    fontSize: 11,
    letterSpacing: 0.8,
  },
  bucketHint: {
    color: "#4B5563",
    fontFamily: "Figtree-Regular",
    fontSize: 11,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(148,163,184,0.12)",
    marginVertical: 4,
  },
  existingLabel: {
    color: "#64748B",
    fontFamily: "Figtree-SemiBold",
    fontSize: 12,
    letterSpacing: 0.3,
  },
});
