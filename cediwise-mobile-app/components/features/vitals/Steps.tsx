import { LabeledTextInput } from "@/components/LabeledTextInput";
import type { GhanaTaxBreakdown } from "@/utils/ghanaTax";
import * as Haptics from "expo-haptics";
import { memo } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { InterestChip } from "./InterestChip";
import { ModeToggle } from "./ModeToggle";
import { StrategyChip } from "./StrategyChip";
import type {
  Draft,
  FinancialPriority,
  IncomeFrequency,
  LifeStage,
  SpendingStyle,
  StepErrors,
  UpdateDraft,
} from "./types";
import { computeIntelligentStrategy, strategyToPercents, toMoney, toMonthlySalary } from "./utils";

const STEP_LABELS = ["Income", "Life", "Expenses", "Interests", "Goal"] as const;

const AnimatedView = Animated.createAnimatedComponent(View);

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

const LIFE_STAGES: { value: LifeStage; label: string }[] = [
  { value: "student", label: "Student" },
  { value: "young_professional", label: "Young Professional" },
  { value: "family", label: "Family" },
  { value: "retiree", label: "Retiree" },
];

const INCOME_FREQUENCIES: { value: IncomeFrequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "bi_weekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
];

const SPENDING_STYLES: { value: SpendingStyle; label: string }[] = [
  { value: "conservative", label: "Conservative" },
  { value: "moderate", label: "Moderate" },
  { value: "liberal", label: "Liberal" },
];

const FINANCIAL_PRIORITIES: { value: FinancialPriority; label: string }[] = [
  { value: "debt_payoff", label: "Paying Off Debt" },
  { value: "savings_growth", label: "Growing Savings" },
  { value: "lifestyle", label: "Lifestyle Quality" },
  { value: "balanced", label: "Balanced" },
];

export const StepWelcome = memo(function StepWelcome() {
  return (
    <View>
      <AnimatedView entering={FadeInUp.duration(220).delay(100)}>
        <Text
          style={{
            color: "#FFFFFF",
            fontFamily: "Figtree-Bold",
            fontSize: 22,
            marginTop: 10,
            letterSpacing: -0.5,
          }}
        >
          Set up your personalized budget
        </Text>
      </AnimatedView>
      <AnimatedView entering={FadeInUp.duration(220).delay(200)}>
        <Text
          style={{
            color: "#94A3AF",
            fontFamily: "Figtree-Regular",
            fontSize: 15,
            marginTop: 12,
            lineHeight: 24,
          }}
        >
          We&apos;ll ask 5 quick questions to build a budget tailored to you. Takes about 2 minutes.
        </Text>
      </AnimatedView>
      <View style={{ marginTop: 24, gap: 8 }}>
        {STEP_LABELS.map((label, i) => (
          <View
            key={label}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: "rgba(34,197,94,0.25)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#22C55E", fontFamily: "Figtree-SemiBold", fontSize: 12 }}>
                {i + 1}
              </Text>
            </View>
            <Text style={{ color: "#E2E8F0", fontFamily: "Figtree-Medium", fontSize: 14 }}>
              {label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
});

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
  return (
    <View>
      <AnimatedView entering={FadeInUp.duration(220).delay(0)}>
        <Text
          style={{
            color: "#FFFFFF",
            fontFamily: "Figtree-Bold",
            fontSize: 22,
            letterSpacing: -0.5,
          }}
        >
          Tell us what comes in
        </Text>
      </AnimatedView>

      <View style={{ marginTop: 18, gap: 14 }}>
        <AnimatedView entering={FadeInUp.duration(220).delay(200)}>
          <Text
            style={{
              color: "#94A3B8",
              fontFamily: "Figtree-Medium",
              fontSize: 14,
              marginBottom: 10,
            }}
          >
            How often do you get paid?
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {INCOME_FREQUENCIES.map((f) => (
              <InterestChip
                key={f.value}
                label={f.label}
                selected={draft.incomeFrequency === f.value}
                haptic
                onToggle={(label) => {
                  const found = INCOME_FREQUENCIES.find((x) => x.label === label);
                  if (found) updateDraft({ incomeFrequency: found.value });
                }}
              />
            ))}
          </View>
        </AnimatedView>

        <AnimatedView entering={FadeInUp.duration(220).delay(300)}>
          <LabeledTextInput
            label={
              draft.incomeFrequency === "weekly"
                ? "Weekly Salary (GHS)"
                : draft.incomeFrequency === "bi_weekly"
                  ? "Bi-weekly Salary (GHS)"
                  : "Monthly Basic Salary (GHS)"
            }
            keyboardType="decimal-pad"
            returnKeyType="next"
            inputAccessoryViewID={keyboardAccessoryId}
            value={draft.stableSalary}
            onChangeText={(v) => updateDraft({ stableSalary: v })}
            error={errors.stableSalary}
          />
        </AnimatedView>

        <AnimatedView entering={FadeInUp.duration(220).delay(400)}>
          <Pressable
            onPress={() => updateDraft({ autoTax: !draft.autoTax })}
            style={({ pressed }) => ({
              minHeight: 44,
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderRadius: 16,
              backgroundColor: draft.autoTax
                ? "rgba(34,197,94,0.12)"
                : "rgba(148,163,184,0.10)",
              borderWidth: 1,
              borderColor: draft.autoTax
                ? "rgba(34,197,94,0.35)"
                : "rgba(148,163,184,0.25)",
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Text
              style={{
                color: "#E2E8F0",
                fontFamily: "Figtree-Medium",
                fontSize: 13,
              }}
            >
              Apply SSNIT + PAYE deductions: {draft.autoTax ? "On" : "Off"}
            </Text>
            {draft.autoTax ? (
              netPreview ? (
                <Text
                  style={{
                    color: "#94A3AF",
                    fontFamily: "Figtree-Regular",
                    fontSize: 12,
                    marginTop: 6,
                  }}
                >
                  Net take-home estimate: ₵
                  {Math.round(netPreview.netTakeHome).toLocaleString("en-GB")}
                </Text>
              ) : (
                <Text
                  style={{
                    color: "#94A3AF",
                    fontFamily: "Figtree-Regular",
                    fontSize: 12,
                    marginTop: 6,
                  }}
                >
                  Estimating take-home…
                </Text>
              )
            ) : (
              <Text
                style={{
                  color: "#94A3AF",
                  fontFamily: "Figtree-Regular",
                  fontSize: 12,
                  marginTop: 6,
                }}
              >
                Turn off if your salary is already net / not taxed at source.
              </Text>
            )}
          </Pressable>
        </AnimatedView>

        <AnimatedView entering={FadeInUp.duration(220).delay(500)}>
          <LabeledTextInput
            label="Side Hustle / Variable Income (GHS)"
            keyboardType="decimal-pad"
            returnKeyType="next"
            inputAccessoryViewID={keyboardAccessoryId}
            value={draft.sideIncome}
            onChangeText={(v) => updateDraft({ sideIncome: v })}
          />
        </AnimatedView>

        <AnimatedView entering={FadeInUp.duration(220).delay(600)}>
          <LabeledTextInput
            label="Payday day of month (1–31)"
            keyboardType="number-pad"
            returnKeyType="done"
            inputAccessoryViewID={keyboardAccessoryId}
            value={draft.paydayDay}
            onChangeText={(v) => updateDraft({ paydayDay: v })}
            error={errors.paydayDay}
          />
        </AnimatedView>
      </View>
    </View>
  );
});

type StepLifeStageProps = {
  draft: Draft;
  updateDraft: UpdateDraft;
};

export const StepLifeStage = memo(function StepLifeStage({ draft, updateDraft }: StepLifeStageProps) {
  return (
    <View>
      <AnimatedView entering={FadeInUp.duration(220).delay(0)}>
        <Text
          style={{
            color: "#FFFFFF",
            fontFamily: "Figtree-Bold",
            fontSize: 22,
            letterSpacing: -0.5,
          }}
        >
          Tell us about yourself
        </Text>
      </AnimatedView>
      <AnimatedView entering={FadeInUp.duration(220).delay(150)}>
        <Text
          style={{
            color: "#64748B",
            fontFamily: "Figtree-Regular",
            fontSize: 12,
            marginTop: 4,
          }}
        >
          Optional but helps us tailor your plan.
        </Text>
      </AnimatedView>

      <View style={{ marginTop: 18, gap: 16 }}>
        <AnimatedView entering={FadeInUp.duration(220).delay(200)}>
          <Text
            style={{
              color: "#94A3B8",
              fontFamily: "Figtree-Medium",
              fontSize: 14,
              marginBottom: 10,
            }}
          >
            Life Stage
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {LIFE_STAGES.map((s) => (
              <InterestChip
                key={s.value}
                label={s.label}
                selected={draft.lifeStage === s.value}
                haptic
                onToggle={(label) => {
                  const found = LIFE_STAGES.find((x) => x.label === label);
                  if (found) updateDraft({ lifeStage: found.value });
                }}
              />
            ))}
          </View>
        </AnimatedView>

        <AnimatedView entering={FadeInUp.duration(220).delay(300)}>
          <LabeledTextInput
            label="Number of Dependents"
            keyboardType="number-pad"
            returnKeyType="done"
            value={draft.dependentsCount}
            onChangeText={(v) => updateDraft({ dependentsCount: v })}
            placeholder="0"
          />
        </AnimatedView>

        <AnimatedView entering={FadeInUp.duration(220).delay(400)}>
          <Text
            style={{
              color: "#94A3B8",
              fontFamily: "Figtree-Medium",
              fontSize: 14,
              marginBottom: 10,
            }}
          >
            Spending Style (Optional)
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {SPENDING_STYLES.map((s) => (
              <InterestChip
                key={s.value}
                label={s.label}
                selected={draft.spendingStyle === s.value}
                haptic
                onToggle={(label) => {
                  const found = SPENDING_STYLES.find((x) => x.label === label);
                  if (found) updateDraft({ spendingStyle: found.value });
                }}
              />
            ))}
          </View>
        </AnimatedView>

        <AnimatedView entering={FadeInUp.duration(220).delay(500)}>
          <Text
            style={{
              color: "#94A3B8",
              fontFamily: "Figtree-Medium",
              fontSize: 14,
              marginBottom: 10,
            }}
          >
            Main financial priority?
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {FINANCIAL_PRIORITIES.map((p) => (
              <InterestChip
                key={p.value}
                label={p.label}
                selected={draft.financialPriority === p.value}
                haptic
                onToggle={(label) => {
                  const found = FINANCIAL_PRIORITIES.find((x) => x.label === label);
                  if (found) updateDraft({ financialPriority: found.value });
                }}
              />
            ))}
          </View>
        </AnimatedView>
      </View>
    </View>
  );
});

type StepFixedExpensesProps = {
  draft: Draft;
  errors: StepErrors;
  keyboardAccessoryId: string;
  updateDraft: UpdateDraft;
};

export const StepFixedExpenses = memo(function StepFixedExpenses({
  draft,
  errors,
  keyboardAccessoryId,
  updateDraft,
}: StepFixedExpensesProps) {
  return (
    <View>
      <AnimatedView entering={FadeInUp.duration(220).delay(0)}>
        <Text
          style={{
            color: "#FFFFFF",
            fontFamily: "Figtree-Bold",
            fontSize: 28,
            letterSpacing: -0.5,
          }}
        >
          Your fixed monthly expenses
        </Text>
      </AnimatedView>
      <AnimatedView entering={FadeInUp.duration(220).delay(100)}>
        <Text
          style={{
            color: "#94A3AF",
            fontFamily: "Figtree-Regular",
            fontSize: 13,
            marginTop: 8,
          }}
        >
          These help us pick a strategy that matches real life.
        </Text>
      </AnimatedView>

      <View style={{ marginTop: 18, gap: 14 }}>
        <AnimatedView entering={FadeInUp.duration(220).delay(200)}>
          <LabeledTextInput
            label="Rent (GHS) (optional)"
            placeholder="0 or leave blank if none"
            keyboardType="decimal-pad"
            returnKeyType="done"
            inputAccessoryViewID={keyboardAccessoryId}
            value={draft.rent}
            onChangeText={(v) => updateDraft({ rent: v })}
            error={errors.rent}
          />
        </AnimatedView>
        <AnimatedView entering={FadeInUp.duration(220).delay(300)}>
          <LabeledTextInput
            label="Tithe / Remittances (GHS) (optional)"
            keyboardType="decimal-pad"
            returnKeyType="done"
            inputAccessoryViewID={keyboardAccessoryId}
            value={draft.titheRemittance}
            onChangeText={(v) => updateDraft({ titheRemittance: v })}
          />
        </AnimatedView>

        <AnimatedView entering={FadeInUp.duration(220).delay(350)}>
          <LabeledTextInput
            label="Debt repayments (GHS) (optional)"
            keyboardType="decimal-pad"
            returnKeyType="done"
            inputAccessoryViewID={keyboardAccessoryId}
            value={draft.debtObligations}
            onChangeText={(v) => updateDraft({ debtObligations: v })}
          />
        </AnimatedView>

        <AnimatedView entering={FadeInUp.duration(220).delay(400)}>
          <Text
            style={{
              color: "#9CA3AF",
              fontFamily: "Figtree-Medium",
              fontSize: 12,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            How do you want to enter utilities?
          </Text>
          <ModeToggle
            value={draft.utilitiesMode}
            onChange={async (m) => {
              try {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {
                // ignore
              }
              updateDraft({ utilitiesMode: m });
            }}
          />
        </AnimatedView>

        {draft.utilitiesMode === "general" ? (
          <AnimatedView entering={FadeInUp.duration(220).delay(500)}>
            <LabeledTextInput
              label="Utilities total (ECG + Water) (GHS)"
              keyboardType="decimal-pad"
              returnKeyType="done"
              inputAccessoryViewID={keyboardAccessoryId}
              value={draft.utilitiesTotal}
              onChangeText={(v) => updateDraft({ utilitiesTotal: v })}
              error={errors.utilities}
            />
          </AnimatedView>
        ) : (
          <>
            <AnimatedView entering={FadeInUp.duration(220).delay(500)}>
              <LabeledTextInput
                label="ECG (GHS)"
                keyboardType="decimal-pad"
                returnKeyType="done"
                inputAccessoryViewID={keyboardAccessoryId}
                value={draft.utilitiesECG}
                onChangeText={(v) => updateDraft({ utilitiesECG: v })}
              />
            </AnimatedView>
            <AnimatedView entering={FadeInUp.duration(220).delay(600)}>
              <LabeledTextInput
                label="Water (GHS)"
                keyboardType="decimal-pad"
                returnKeyType="done"
                inputAccessoryViewID={keyboardAccessoryId}
                value={draft.utilitiesWater}
                onChangeText={(v) => updateDraft({ utilitiesWater: v })}
                error={errors.utilities}
              />
            </AnimatedView>
            <AnimatedView entering={FadeInUp.duration(220).delay(700)}>
              <Text
                style={{
                  color: "#94A3AF",
                  fontFamily: "Figtree-Regular",
                  fontSize: 12,
                  marginTop: -8,
                }}
              >
                Total: ₵
                {(toMoney(draft.utilitiesECG) + toMoney(draft.utilitiesWater)).toLocaleString("en-GB")}
              </Text>
            </AnimatedView>
          </>
        )}
      </View>
    </View>
  );
});

type StepInterestsProps = {
  interests: string[];
  onToggleInterest: (interest: string) => void;
};

export const StepInterests = memo(function StepInterests({
  interests,
  onToggleInterest,
}: StepInterestsProps) {
  return (
    <View>
      <AnimatedView entering={FadeInUp.duration(220).delay(0)}>
        <Text
          style={{
            color: "#FFFFFF",
            fontFamily: "Figtree-Bold",
            fontSize: 28,
            letterSpacing: -0.5,
          }}
        >
          What do you spend on?
        </Text>
      </AnimatedView>
      <AnimatedView entering={FadeInUp.duration(220).delay(100)}>
        <Text
          style={{
            color: "#94A3AF",
            fontFamily: "Figtree-Regular",
            fontSize: 13,
            marginTop: 8,
          }}
        >
          Select all that apply. We&apos;ll shape your Wants categories around these.
        </Text>
      </AnimatedView>

      <AnimatedView
        entering={FadeInUp.duration(220).delay(200)}
        style={{ marginTop: 16 }}
      >
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {INTERESTS.map((it) => (
            <InterestChip
              key={it}
              label={it}
              selected={interests.includes(it)}
              onToggle={onToggleInterest}
            />
          ))}
        </View>
      </AnimatedView>
    </View>
  );
});

const GOAL_OPTIONS = [
  { key: "emergency_fund" as const, label: "Emergency Fund", description: "A safety net for unexpected expenses. We'll prioritise your savings bucket where possible." },
  { key: "project" as const, label: "Project", description: "Saving for a specific goal (wedding, car, house). Balanced approach that keeps essentials covered." },
  { key: "investment" as const, label: "Investment", description: "Long-term wealth building. We'll allocate more to savings when you have headroom." },
];

type StepGoalProps = {
  draft: Draft;
  error: string | null;
  updateDraft: UpdateDraft;
};

function getStrategySuggestionForGoal(
  goal: "emergency_fund" | "project" | "investment",
  computedStrategy: "survival" | "balanced" | "aggressive",
  fixedCostRatio: number
): "survival" | "balanced" | "aggressive" | null {
  if (goal === "investment" && computedStrategy === "balanced" && fixedCostRatio < 0.5) {
    return "aggressive";
  }
  if (goal === "emergency_fund" && computedStrategy === "aggressive" && fixedCostRatio > 0.45) {
    return "balanced";
  }
  return null;
}

export const StepGoal = memo(function StepGoal({ draft, error, updateDraft }: StepGoalProps) {
  const rawSalary = toMoney(draft.stableSalary);
  const stableSalary = toMonthlySalary(rawSalary, draft.incomeFrequency);
  const sideIncome = toMoney(draft.sideIncome);
  const rent = toMoney(draft.rent);
  const titheRemittance = toMoney(draft.titheRemittance);
  const debtObligations = toMoney(draft.debtObligations);
  const utilitiesTotal =
    draft.utilitiesMode === "precise"
      ? toMoney(draft.utilitiesECG) + toMoney(draft.utilitiesWater)
      : toMoney(draft.utilitiesTotal);
  const computedIntelligent = computeIntelligentStrategy({
    stableSalary,
    autoTax: draft.autoTax,
    sideIncome,
    rent,
    titheRemittance,
    debtObligations,
    utilitiesTotal,
    lifeStage: draft.lifeStage,
    dependentsCount: Math.max(0, parseInt(draft.dependentsCount, 10) || 0),
    incomeFrequency: draft.incomeFrequency,
    spendingStyle: draft.spendingStyle,
    financialPriority: draft.financialPriority,
  });
  const netIncome = computedIntelligent.netIncome;
  const fixedCostRatio = netIncome > 0 ? computedIntelligent.fixedCosts / netIncome : 1;

  const handleGoalSelect = (goal: "emergency_fund" | "project" | "investment") => {
    const suggestedStrategy = getStrategySuggestionForGoal(
      goal,
      computedIntelligent.strategy,
      fixedCostRatio
    );
    const patch: Partial<Draft> = { primaryGoal: goal };
    if (suggestedStrategy) patch.strategyChoice = suggestedStrategy;
    updateDraft(patch);
  };

  const selectedGoalInfo = draft.primaryGoal
    ? GOAL_OPTIONS.find((g) => g.key === draft.primaryGoal)
    : null;

  return (
    <View>
      <AnimatedView entering={FadeInUp.duration(220).delay(0)}>
        <Text
          style={{
            color: "#FFFFFF",
            fontFamily: "Figtree-Bold",
            fontSize: 28,
            letterSpacing: -0.5,
          }}
        >
          What&apos;s your main savings goal?
        </Text>
      </AnimatedView>
      <AnimatedView entering={FadeInUp.duration(220).delay(100)}>
        <Text
          style={{
            color: "#94A3AF",
            fontFamily: "Figtree-Regular",
            fontSize: 13,
            marginTop: 8,
          }}
        >
          This helps us weight your Savings bucket.
        </Text>
      </AnimatedView>

      <View style={{ marginTop: 16, gap: 14 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {GOAL_OPTIONS.map((g) => {
            const active = draft.primaryGoal === g.key;
            return (
              <Pressable
                key={g.key}
                onPress={async () => {
                  try {
                    await Haptics.selectionAsync();
                  } catch {
                    // ignore
                  }
                  handleGoalSelect(g.key);
                }}
                style={({ pressed }) => ({
                  flex: 1,
                  minWidth: 90,
                  minHeight: 44,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 14,
                  backgroundColor: active
                    ? "rgba(34,197,94,0.16)"
                    : "rgba(148,163,184,0.10)",
                  borderWidth: 1,
                  borderColor: active
                    ? "rgba(34,197,94,0.40)"
                    : "rgba(148,163,184,0.25)",
                  opacity: pressed ? 0.92 : 1,
                  alignItems: "center",
                  justifyContent: "center",
                })}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontFamily: "Figtree-Medium",
                    fontSize: 14,
                    textAlign: "center",
                  }}
                >
                  {g.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {selectedGoalInfo ? (
          <View
            style={{
              padding: 12,
              borderRadius: 12,
              backgroundColor: "rgba(34,197,94,0.08)",
              borderWidth: 1,
              borderColor: "rgba(34,197,94,0.2)",
            }}
          >
            <Text
              style={{
                color: "#94A3AF",
                fontFamily: "Figtree-Regular",
                fontSize: 13,
                lineHeight: 20,
              }}
            >
              {selectedGoalInfo.description}
            </Text>
          </View>
        ) : null}

        <View>
          <Text
            style={{
              color: "#9CA3AF",
              fontFamily: "Figtree-Medium",
              fontSize: 12,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Budget style
          </Text>
          <Text
            style={{
              color: "#64748B",
              fontFamily: "Figtree-Regular",
              fontSize: 11,
              marginBottom: 10,
            }}
          >
            Survival = more to needs • Balanced = 50/30/20 • Aggressive = more to savings
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            <StrategyChip
              label="Survival"
              value="survival"
              selected={draft.strategyChoice === "survival"}
              onSelect={(value) => updateDraft({ strategyChoice: value })}
            />
            <StrategyChip
              label="Balanced"
              value="balanced"
              selected={draft.strategyChoice === "balanced"}
              onSelect={(value) => updateDraft({ strategyChoice: value })}
            />
            <StrategyChip
              label="Aggressive"
              value="aggressive"
              selected={draft.strategyChoice === "aggressive"}
              onSelect={(value) => updateDraft({ strategyChoice: value })}
            />
          </View>
        </View>

        {error ? (
          <Text
            style={{
              color: "#FCA5A5",
              fontFamily: "Figtree-Regular",
              marginTop: 8,
            }}
          >
            {error}
          </Text>
        ) : null}

        <View style={{ marginTop: 8 }}>
          {(() => {
            const userOverride =
              draft.strategyChoice === "survival" || draft.strategyChoice === "aggressive";
            const chosen = userOverride
              ? {
                ...computedIntelligent,
                strategy: draft.strategyChoice,
                ...strategyToPercents(draft.strategyChoice),
              }
              : {
                ...computedIntelligent,
                strategy: computedIntelligent.strategy,
                needsPct: computedIntelligent.needsPct,
                wantsPct: computedIntelligent.wantsPct,
                savingsPct: computedIntelligent.savingsPct,
              };
            return (
              <View
                style={{
                  borderRadius: 18,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.08)",
                  backgroundColor: "rgba(2,6,23,0.25)",
                }}
              >
                <Text
                  style={{
                    color: "#9CA3AF",
                    fontFamily: "Figtree-Medium",
                    fontSize: 12,
                    letterSpacing: 0.6,
                    textTransform: "uppercase",
                  }}
                >
                  Strategy preview
                </Text>
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontFamily: "Figtree-Bold",
                    fontSize: 18,
                    marginTop: 8,
                  }}
                >
                  {chosen.strategy === "survival"
                    ? "Survival"
                    : chosen.strategy === "aggressive"
                      ? "Aggressive"
                      : "Balanced"}
                </Text>
                <Text
                  style={{
                    color: "#94A3AF",
                    fontFamily: "Figtree-Regular",
                    fontSize: 12,
                    marginTop: 6,
                  }}
                >
                  Needs {(chosen.needsPct * 100).toFixed(0)}% • Wants{" "}
                  {(chosen.wantsPct * 100).toFixed(0)}% • Savings{" "}
                  {(chosen.savingsPct * 100).toFixed(0)}%
                </Text>
              </View>
            );
          })()}
        </View>
      </View>
    </View>
  );
});

