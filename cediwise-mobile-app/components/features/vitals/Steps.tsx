import * as Haptics from "expo-haptics";
import { memo } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { Card } from "@/components/Card";
import { LabeledTextInput } from "@/components/LabeledTextInput";
import type { GhanaTaxBreakdown } from "@/utils/ghanaTax";

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
import { computeIntelligentStrategy, strategyToPercents, toMoney } from "./utils";

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
    <Card>
      <AnimatedView entering={FadeInUp.duration(220).delay(0)}>
        <Text
          style={{
            color: "#E2E8F0",
            fontFamily: "Figtree-Medium",
            fontSize: 14,
            textTransform: "uppercase",
            letterSpacing: 0.6,
          }}
        >
          Income & Jobs
        </Text>
      </AnimatedView>

      <AnimatedView entering={FadeInUp.duration(220).delay(100)}>
        <Text
          style={{
            color: "#FFFFFF",
            fontFamily: "Figtree-Bold",
            fontSize: 28,
            marginTop: 10,
            letterSpacing: -0.5,
          }}
        >
          Tell us what comes in
        </Text>
      </AnimatedView>

      <View style={{ marginTop: 18, gap: 14 }}>
        <AnimatedView entering={FadeInUp.duration(220).delay(200)}>
          <LabeledTextInput
            label="Monthly Basic Salary (GHS)"
            keyboardType="decimal-pad"
            returnKeyType="done"
            inputAccessoryViewID={keyboardAccessoryId}
            value={draft.stableSalary}
            onChangeText={(v) => updateDraft({ stableSalary: v })}
            error={errors.stableSalary}
          />
        </AnimatedView>

        <AnimatedView entering={FadeInUp.duration(220).delay(300)}>
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

        <AnimatedView entering={FadeInUp.duration(220).delay(400)}>
          <LabeledTextInput
            label="Side Hustle / Variable Income (GHS)"
            keyboardType="decimal-pad"
            returnKeyType="done"
            inputAccessoryViewID={keyboardAccessoryId}
            value={draft.sideIncome}
            onChangeText={(v) => updateDraft({ sideIncome: v })}
          />
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

        <AnimatedView entering={FadeInUp.duration(220).delay(600)}>
          <LabeledTextInput
            label="Payday day (1–31)"
            keyboardType="number-pad"
            returnKeyType="done"
            inputAccessoryViewID={keyboardAccessoryId}
            value={draft.paydayDay}
            onChangeText={(v) => updateDraft({ paydayDay: v })}
            error={errors.paydayDay}
          />
        </AnimatedView>
      </View>
    </Card>
  );
});

type StepLifeStageProps = {
  draft: Draft;
  updateDraft: UpdateDraft;
};

export const StepLifeStage = memo(function StepLifeStage({ draft, updateDraft }: StepLifeStageProps) {
  return (
    <Card>
      <AnimatedView entering={FadeInUp.duration(220).delay(0)}>
        <Text
          style={{
            color: "#E2E8F0",
            fontFamily: "Figtree-Medium",
            fontSize: 14,
            textTransform: "uppercase",
            letterSpacing: 0.6,
          }}
        >
          Life Stage & Context
        </Text>
      </AnimatedView>
      <AnimatedView entering={FadeInUp.duration(220).delay(100)}>
        <Text
          style={{
            color: "#FFFFFF",
            fontFamily: "Figtree-Bold",
            fontSize: 28,
            marginTop: 10,
            letterSpacing: -0.5,
          }}
        >
          Tell us about yourself
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
    </Card>
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
    <Card>
      <AnimatedView entering={FadeInUp.duration(220).delay(0)}>
        <Text
          style={{
            color: "#FFFFFF",
            fontFamily: "Figtree-Bold",
            fontSize: 28,
            letterSpacing: -0.5,
          }}
        >
          Lock in your needs
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
            label="Tithe / Remittances (GHS)"
            keyboardType="decimal-pad"
            returnKeyType="done"
            inputAccessoryViewID={keyboardAccessoryId}
            value={draft.titheRemittance}
            onChangeText={(v) => updateDraft({ titheRemittance: v })}
          />
        </AnimatedView>

        <AnimatedView entering={FadeInUp.duration(220).delay(350)}>
          <LabeledTextInput
            label="Debt repayments (GHS)"
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
              marginBottom: 10,
            }}
          >
            Utilities input
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
    </Card>
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
    <Card>
      <AnimatedView entering={FadeInUp.duration(220).delay(0)}>
        <Text
          style={{
            color: "#FFFFFF",
            fontFamily: "Figtree-Bold",
            fontSize: 28,
            letterSpacing: -0.5,
          }}
        >
          What do you care about?
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
          We’ll shape your Wants categories around these.
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
    </Card>
  );
});

type StepGoalProps = {
  draft: Draft;
  error: string | null;
  updateDraft: UpdateDraft;
};

export const StepGoal = memo(function StepGoal({ draft, error, updateDraft }: StepGoalProps) {
  return (
    <Card>
      <AnimatedView entering={FadeInUp.duration(220).delay(0)}>
        <Text
          style={{
            color: "#FFFFFF",
            fontFamily: "Figtree-Bold",
            fontSize: 28,
            letterSpacing: -0.5,
          }}
        >
          Pick a primary goal
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

      <View style={{ marginTop: 16, gap: 12 }}>
        <View>
          <Text
            style={{
              color: "#9CA3AF",
              fontFamily: "Figtree-Medium",
              fontSize: 12,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Choose your plan
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

        {([
          { key: "emergency_fund", label: "Emergency Fund" },
          { key: "project", label: "Project" },
          { key: "investment", label: "Investment" },
        ] as const).map((g) => {
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
                updateDraft({ primaryGoal: g.key });
              }}
              style={({ pressed }) => ({
                minHeight: 56,
                paddingHorizontal: 14,
                paddingVertical: 14,
                borderRadius: 18,
                backgroundColor: active
                  ? "rgba(34,197,94,0.16)"
                  : "rgba(148,163,184,0.10)",
                borderWidth: 1,
                borderColor: active
                  ? "rgba(34,197,94,0.40)"
                  : "rgba(148,163,184,0.25)",
                opacity: pressed ? 0.92 : 1,
              })}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontFamily: "Figtree-Medium",
                  fontSize: 18,
                }}
              >
                {g.label}
              </Text>
            </Pressable>
          );
        })}

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
            const stableSalary = toMoney(draft.stableSalary);
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
    </Card>
  );
});

