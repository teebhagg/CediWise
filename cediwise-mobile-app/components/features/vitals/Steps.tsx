import { LabeledTextInput } from "@/components/LabeledTextInput";
import type { GhanaTaxBreakdown } from "@/utils/ghanaTax";
import { Check, Circle, Sparkles } from "lucide-react-native";
import { memo, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type {
  Draft,
  FinancialPriority,
  IncomeFrequency,
  LifeStage,
  SpendingStyle,
  StepErrors,
  UpdateDraft,
} from "./types";

function StepHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: "rgba(34,197,94,0.14)",
            borderWidth: 1,
            borderColor: "rgba(34,197,94,0.32)",
            alignItems: "center",
            justifyContent: "center",
          }}>
          <Sparkles size={17} color="#22C55E" />
        </View>
        <Text
          style={{
            color: "#FFFFFF",
            fontFamily: "Figtree-Bold",
            fontSize: 24,
            letterSpacing: -0.5,
            flexShrink: 1,
          }}>
          {title}
        </Text>
      </View>
      {subtitle ? (
        <Text
          style={{
            color: "#94A3AF",
            fontFamily: "Figtree-Regular",
            fontSize: 13,
            marginTop: 10,
            lineHeight: 20,
          }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <Text
      style={{
        color: "#94A3B8",
        fontFamily: "Figtree-SemiBold",
        fontSize: 13,
        marginBottom: 10,
      }}>
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
        backgroundColor: selected
          ? "rgba(34,197,94,0.16)"
          : "rgba(15,23,42,0.35)",
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
        <Text
          style={{
            color: "#E2E8F0",
            fontFamily: "Figtree-Medium",
            fontSize: 14,
          }}>
          {label}
        </Text>
        {description ? (
          <Text
            style={{
              color: "#94A3AF",
              fontFamily: "Figtree-Regular",
              fontSize: 12,
              marginTop: 2,
              lineHeight: 18,
            }}>
            {description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function PillOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
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
        backgroundColor: selected
          ? "rgba(34,197,94,0.16)"
          : "rgba(15,23,42,0.35)",
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
      <Text
        style={{
          color: selected ? "#DCFCE7" : "#E2E8F0",
          fontFamily: "Figtree-Medium",
          fontSize: 13,
        }}>
        {label}
      </Text>
    </Pressable>
  );
}

function RadioOption({
  label,
  description,
  selected,
  onPress,
}: {
  label: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => ({
        minHeight: 64,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: selected ? "rgba(34,197,94,0.6)" : "rgba(148,163,184,0.25)",
        backgroundColor: selected
          ? "rgba(34,197,94,0.14)"
          : "rgba(15,23,42,0.35)",
        paddingHorizontal: 12,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        opacity: pressed ? 0.9 : 1,
      })}>
      <View style={{ marginTop: 2 }}>
        <Circle size={20} color={selected ? "#22C55E" : "#94A3B8"} fill={selected ? "#22C55E" : "transparent"} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: "#E2E8F0",
            fontFamily: "Figtree-SemiBold",
            fontSize: 14,
          }}>
          {label}
        </Text>
        <Text
          style={{
            color: "#94A3AF",
            fontFamily: "Figtree-Regular",
            fontSize: 12,
            marginTop: 3,
            lineHeight: 18,
          }}>
          {description}
        </Text>
      </View>
    </Pressable>
  );
}

const INCOME_FREQUENCIES: {
  value: IncomeFrequency;
  label: string;
  description: string;
}[] = [
  {
    value: "weekly",
    label: "Weekly",
    description: "Paid every week (about 4.33 times each month).",
  },
  {
    value: "bi_weekly",
    label: "Bi-weekly",
    description: "Paid every two weeks (about 2.17 times each month).",
  },
  {
    value: "monthly",
    label: "Monthly",
    description: "Paid once monthly (default cycle behavior).",
  },
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

const FINANCIAL_PRIORITIES: {
  value: FinancialPriority;
  label: string;
  description: string;
}[] = [
  { value: "debt_payoff", label: "Pay Off Debt", description: "Prioritize reducing debt obligations faster." },
  { value: "savings_growth", label: "Grow Savings", description: "Prioritize emergency fund and long-term reserves." },
  { value: "lifestyle", label: "Lifestyle", description: "Leave more room for wants and quality-of-life spending." },
  { value: "balanced", label: "Balanced", description: "Keep debt, savings, and lifestyle relatively even." },
];

const INTERESTS = [
  "Tech",
  "Fashion",
  "Fitness",
  "Food",
  "Travel",
  "Gaming",
  "Music",
  "Business",
  "Beauty",
] as const;

const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => i + 1);

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
  const frequencyFactor =
    draft.incomeFrequency === "weekly"
      ? 52 / 12
      : draft.incomeFrequency === "bi_weekly"
        ? 26 / 12
        : 1;
  const periodNetPreview = netPreview
    ? Math.max(0, netPreview.netTakeHome / frequencyFactor)
    : null;

  return (
    <View>
      <StepHeading
        title="Income"
        subtitle="Enter your salary and choose your pay rhythm."
      />

      <View style={{ marginTop: 18, gap: 14 }}>
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
          <Text
            style={{
              color: "#94A3AF",
              fontFamily: "Figtree-Regular",
              fontSize: 12,
              marginTop: 8,
              lineHeight: 18,
            }}>
            {INCOME_FREQUENCIES.find((x) => x.value === draft.incomeFrequency)?.description}
          </Text>
        </View>

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

type StepSetupBudgetProps = {
  draft: Draft;
  errors: StepErrors;
  updateDraft: UpdateDraft;
};

export const StepSetupBudget = memo(function StepSetupBudget({
  draft,
  errors,
  updateDraft,
}: StepSetupBudgetProps) {
  const [paydayOpen, setPaydayOpen] = useState(false);
  const expand = useSharedValue(0);

  useEffect(() => {
    expand.value = withTiming(paydayOpen ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [expand, paydayOpen]);

  const dropdownAnimStyle = useAnimatedStyle(() => ({
    maxHeight: 220 * expand.value,
    opacity: expand.value,
    marginTop: 8 * expand.value,
    transform: [{ translateY: (1 - expand.value) * -8 }],
    overflow: "hidden",
  }));

  return (
    <View>
      <StepHeading
        title="Setup Budget"
        subtitle="Cycle is fixed to payday-to-payday. Choose your payday and allocation style."
      />

      <View style={{ marginTop: 18, gap: 14 }}>
        <View
          style={{
            borderWidth: 1,
            borderColor: "rgba(148,163,184,0.25)",
            borderRadius: 14,
            padding: 12,
            backgroundColor: "rgba(15,23,42,0.35)",
          }}>
          <SectionLabel text="Cycle Type" />
          <Text style={{ color: "#E2E8F0", fontFamily: "Figtree-SemiBold", fontSize: 14 }}>
            Payday-to-payday
          </Text>
          <Text
            style={{
              color: "#94A3AF",
              fontFamily: "Figtree-Regular",
              fontSize: 12,
              marginTop: 4,
              lineHeight: 18,
            }}>
            Your cycle starts on your payday and ends the day before your next payday.
          </Text>
        </View>

        <View>
          <SectionLabel text="Payday Day" />
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
                    onPress={() => {
                      updateDraft({ paydayDay: day });
                      setPaydayOpen(false);
                    }}
                    style={{
                      minWidth: 36,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: selected
                        ? "rgba(34,197,94,0.55)"
                        : "rgba(148,163,184,0.25)",
                      backgroundColor: selected
                        ? "rgba(34,197,94,0.2)"
                        : "rgba(148,163,184,0.12)",
                    }}>
                    <Text
                      style={{
                        color: selected ? "#22C55E" : "#E2E8F0",
                        fontFamily: "Figtree-Medium",
                        fontSize: 12,
                        textAlign: "center",
                      }}>
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
          {errors.paydayDay ? (
            <Text
              style={{
                color: "#FCA5A5",
                fontFamily: "Figtree-Regular",
                fontSize: 12,
                marginTop: 6,
              }}>
              {errors.paydayDay}
            </Text>
          ) : null}
        </View>

        <View>
          <SectionLabel text="Allocation Style (Radio Group)" />
          <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
            <RadioOption
              label="Survival (90 / 10 / 0)"
              description="Prioritizes needs heavily. Useful when obligations are tight and you need immediate stability."
              selected={draft.strategyChoice === "survival"}
              onPress={() => updateDraft({ strategyChoice: "survival" })}
            />
            <RadioOption
              label="Balanced (50 / 30 / 20)"
              description="Standard split across needs, wants, and savings. Best for stable day-to-day budgeting."
              selected={draft.strategyChoice === "balanced"}
              onPress={() => updateDraft({ strategyChoice: "balanced" })}
            />
            <RadioOption
              label="Aggressive (40 / 20 / 40)"
              description="Pushes more into savings. Suitable when your essentials are under control and you want faster growth."
              selected={draft.strategyChoice === "aggressive"}
              onPress={() => updateDraft({ strategyChoice: "aggressive" })}
            />
          </View>
        </View>
      </View>
    </View>
  );
});

type StepPreferencesProps = {
  draft: Draft;
  toggleInterest: (interest: string) => void;
  updateDraft: UpdateDraft;
};

export const StepPreferences = memo(function StepPreferences({
  draft,
  toggleInterest,
  updateDraft,
}: StepPreferencesProps) {
  return (
    <View>
      <StepHeading
        title="Preferences"
        subtitle="Use checkbox interactions for personal context and interests."
      />

      <View style={{ marginTop: 18, gap: 16 }}>
        <View>
          <SectionLabel text="Life Stage" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {LIFE_STAGES.map((item) => (
              <PillOption
                key={item.value}
                label={item.label}
                selected={draft.lifeStage === item.value}
                onPress={() => updateDraft({ lifeStage: item.value })}
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
                onPress={() => updateDraft({ spendingStyle: item.value })}
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
                onPress={() => updateDraft({ financialPriority: item.value })}
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
