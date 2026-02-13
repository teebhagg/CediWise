# Vitals Wizard Enhancement Guide

This document outlines all changes needed to enhance the vitals wizard with:

1. Life Stage & Context step (new step 1)
2. Recurring Expenses & Debts in Fixed Expenses (step 2)
3. Budget Template selector in Goal Setting (step 4)

## Summary of Changes

### Current Structure (4 steps):

- Step 0: Income & Jobs
- Step 1: Fixed Expenses (Needs)
- Step 2: Interests & Wants
- Step 3: Goal Setting (Savings)

### New Structure (5 steps):

- Step 0: Income & Jobs (unchanged)
- Step 1: **Life Stage & Context** (NEW)
- Step 2: Fixed Expenses + Recurring Expenses + Debts (enhanced)
- Step 3: Interests & Wants (unchanged, just shifted)
- Step 4: Goal Setting + Template Selector (enhanced)

## Step-by-Step Implementation

### 1. Update Draft Type

Add new fields to the `Draft` type (line 66):

```typescript
type Draft = {
  step: number;
  // Existing income fields
  stableSalary: string;
  autoTax: boolean;
  sideIncome: string;
  paydayDay: string;
  // NEW: Life stage fields
  lifeStage: LifeStage | null;
  dependentsCount: string;
  incomeFrequency: IncomeFrequency;
  spendingStyle: SpendingStyle | null;
  financialPriority: FinancialPriority | null;
  // Existing expense fields
  rent: string;
  titheRemittance: string;
  utilitiesMode: UtilitiesMode;
  utilitiesTotal: string;
  utilitiesECG: string;
  utilitiesWater: string;
  // NEW: Recurring expenses & debts
  recurringExpenses: Array<{
    id: string;
    name: string;
    amount: string;
    frequency: RecurringExpenseFrequency;
    bucket: BudgetBucket;
  }>;
  debts: Array<{
    id: string;
    name: string;
    remainingAmount: string;
    monthlyPayment: string;
  }>;
  // Existing interest & goal fields
  interests: string[];
  primaryGoal: PrimaryGoal | null;
  strategyChoice: PersonalizationStrategy;
  // NEW: Template selection
  selectedTemplate: string | null; // template ID or "custom"
};
```

### 2. Update makeDefaultDraft Function

Add default values for new fields (around line 900):

```typescript
function makeDefaultDraft(): Draft {
  return {
    step: 0,
    stableSalary: "",
    autoTax: false,
    sideIncome: "",
    paydayDay: "",
    // NEW defaults
    lifeStage: null,
    dependentsCount: "0",
    incomeFrequency: "monthly",
    spendingStyle: null,
    financialPriority: null,
    // Existing defaults
    rent: "",
    titheRemittance: "",
    utilitiesMode: "general",
    utilitiesTotal: "",
    utilitiesECG: "",
    utilitiesWater: "",
    recurringExpenses: [],
    debts: [],
    interests: [],
    primaryGoal: null,
    strategyChoice: "balanced",
    selectedTemplate: null,
  };
}
```

### 3. Update totalSteps Constant

Change from 4 to 5 (line 935):

```typescript
const totalSteps = 5;
```

### 4. Create StepLifeStage Component

Insert after StepIncome (around line 485), before StepFixedExpenses:

```typescript
const StepLifeStage = memo(function StepLifeStage({
  draft,
  updateDraft,
}: {
  draft: Draft;
  updateDraft: UpdateDraft;
}) {
  const lifeStages: Array<{
    value: LifeStage;
    label: string;
    description: string;
  }> = [
    {
      value: "student",
      label: "Student",
      description: "University or tertiary education",
    },
    {
      value: "young_professional",
      label: "Young Professional",
      description: "Early career, single or couple",
    },
    {
      value: "family",
      label: "Family",
      description: "Household with dependents",
    },
    {
      value: "retiree",
      label: "Retiree",
      description: "Retired or nearing retirement",
    },
  ];

  const frequencies: Array<{ value: IncomeFrequency; label: string }> = [
    { value: "weekly", label: "Weekly" },
    { value: "bi_weekly", label: "Bi-weekly" },
    { value: "monthly", label: "Monthly" },
  ];

  const styles: Array<{
    value: SpendingStyle;
    label: string;
    description: string;
  }> = [
    {
      value: "conservative",
      label: "Conservative",
      description: "I prefer to save more",
    },
    { value: "moderate", label: "Moderate", description: "Balanced approach" },
    {
      value: "liberal",
      label: "Liberal",
      description: "I enjoy spending on lifestyle",
    },
  ];

  const priorities: Array<{ value: FinancialPriority; label: string }> = [
    { value: "debt_payoff", label: "Paying Off Debt" },
    { value: "savings_growth", label: "Growing Savings" },
    { value: "lifestyle", label: "Lifestyle Quality" },
    { value: "balanced", label: "Balanced Approach" },
  ];

  return (
    <Card>
      <Animated.View entering={FadeInUp.duration(220).delay(0)}>
        <Text
          style={{
            color: "#E2E8F0",
            fontFamily: "Figtree-Medium",
            fontSize: 14,
            textTransform: "uppercase",
            letterSpacing: 0.6,
          }}>
          Life Stage & Context
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(220).delay(100)}>
        <Text
          style={{
            color: "#FFFFFF",
            fontFamily: "Figtree-Bold",
            fontSize: 28,
            marginTop: 10,
            letterSpacing: -0.5,
          }}>
          Tell us about yourself
        </Text>
      </Animated.View>

      <View style={{ marginTop: 18, gap: 16 }}>
        {/* Life Stage Selector */}
        <Animated.View entering={FadeInUp.duration(220).delay(200)}>
          <Text
            style={{
              color: "#94A3B8",
              fontFamily: "Figtree-Medium",
              fontSize: 14,
              marginBottom: 10,
            }}>
            Life Stage
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {lifeStages.map((stage) => (
              <InterestChip
                key={stage.value}
                label={stage.label}
                selected={draft.lifeStage === stage.value}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateDraft({ lifeStage: stage.value });
                }}
              />
            ))}
          </View>
        </Animated.View>

        {/* Dependents Count */}
        <Animated.View entering={FadeInUp.duration(220).delay(300)}>
          <LabeledTextInput
            label="Number of Dependents"
            keyboardType="number-pad"
            returnKeyType="done"
            value={draft.dependentsCount}
            onChangeText={(v) => updateDraft({ dependentsCount: v })}
            placeholder="0"
          />
        </Animated.View>

        {/* Income Frequency */}
        <Animated.View entering={FadeInUp.duration(220).delay(400)}>
          <Text
            style={{
              color: "#94A3B8",
              fontFamily: "Figtree-Medium",
              fontSize: 14,
              marginBottom: 10,
            }}>
            How often do you get paid?
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {frequencies.map((freq) => (
              <InterestChip
                key={freq.value}
                label={freq.label}
                selected={draft.incomeFrequency === freq.value}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateDraft({ incomeFrequency: freq.value });
                }}
              />
            ))}
          </View>
        </Animated.View>

        {/* Spending Style */}
        <Animated.View entering={FadeInUp.duration(220).delay(500)}>
          <Text
            style={{
              color: "#94A3B8",
              fontFamily: "Figtree-Medium",
              fontSize: 14,
              marginBottom: 10,
            }}>
            Spending Style (Optional)
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {styles.map((style) => (
              <InterestChip
                key={style.value}
                label={style.label}
                selected={draft.spendingStyle === style.value}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateDraft({ spendingStyle: style.value });
                }}
              />
            ))}
          </View>
        </Animated.View>

        {/* Financial Priority */}
        <Animated.View entering={FadeInUp.duration(220).delay(600)}>
          <Text
            style={{
              color: "#94A3B8",
              fontFamily: "Figtree-Medium",
              fontSize: 14,
              marginBottom: 10,
            }}>
            What's your main financial priority?
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {priorities.map((priority) => (
              <InterestChip
                key={priority.value}
                label={priority.label}
                selected={draft.financialPriority === priority.value}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateDraft({ financialPriority: priority.value });
                }}
              />
            ))}
          </View>
        </Animated.View>
      </View>
    </Card>
  );
});
```

### 5. Update Step Rendering Logic

Update the conditional rendering in the main component (around line 1300-1350):

```typescript
{
  draft.step === 0 && (
    <StepIncome
      draft={draft}
      errors={stepErrors}
      keyboardAccessoryId={keyboardAccessoryId}
      netPreview={netPreview}
      updateDraft={updateDraft}
    />
  );
}

{
  draft.step === 1 && <StepLifeStage draft={draft} updateDraft={updateDraft} />;
}

{
  draft.step === 2 && (
    <StepFixedExpenses
      draft={draft}
      errors={stepErrors}
      keyboardAccessoryId={keyboardAccessoryId}
      updateDraft={updateDraft}
    />
  );
}

{
  draft.step === 3 && (
    <StepInterests draft={draft} toggleInterest={toggleInterest} />
  );
}

{
  draft.step === 4 && (
    <StepGoal
      draft={draft}
      computedStrategy={computedStrategy}
      updateDraft={updateDraft}
    />
  );
}
```

### 6. Update stepErrors Validation

Update the validation logic (around line 1011-1030) to handle new step numbering:

```typescript
const stepErrors: StepErrors = useMemo(() => {
  const out: StepErrors = {};

  if (draft.step === 0) {
    if (toMoney(draft.stableSalary) === 0) out.stableSalary = "Required";
    const pd = clampDay(draft.paydayDay);
    if (pd == null) out.paydayDay = "Enter 1-31";
  }

  // Step 1 (Life Stage) has no required fields

  if (draft.step === 2) {
    if (toMoney(draft.rent) === 0) out.rent = "Required";
    if (draft.utilitiesMode === "general") {
      if (toMoney(draft.utilitiesTotal) === 0) out.utilitiesTotal = "Required";
    } else {
      const ecg = toMoney(draft.utilitiesECG);
      const water = toMoney(draft.utilitiesWater);
      if (ecg + water === 0) out.utilitiesTotal = "Enter ECG or Water";
    }
  }

  // Step 3 (Interests) has no required fields

  if (draft.step === 4) {
    if (!draft.primaryGoal) out.primaryGoal = "Please select a goal";
  }

  return out;
}, [draft]);
```

### 7. Update computeStrategy Function

Enhance the strategy calculation to include recurring expenses and debts (around line 94):

```typescript
function computeStrategy(params: {
  stableSalary: number;
  autoTax: boolean;
  sideIncome: number;
  rent: number;
  titheRemittance: number;
  utilitiesTotal: number;
  recurringExpenses: Draft["recurringExpenses"];
  debts: Draft["debts"];
}): PersonalizationStrategy {
  // ... existing net income calculation ...

  // Calculate recurring expenses monthly total
  const recurringExpensesTotal = params.recurringExpenses.reduce(
    (sum, expense) => {
      const amount = toMoney(expense.amount);
      // Convert to monthly based on frequency
      let monthly = amount;
      if (expense.frequency === "weekly") monthly = amount * 4.33;
      else if (expense.frequency === "bi_weekly") monthly = amount * 2.165;
      else if (expense.frequency === "quarterly") monthly = amount / 3;
      else if (expense.frequency === "annually") monthly = amount / 12;

      // Only count needs bucket for fixed costs
      return sum + (expense.bucket === "needs" ? monthly : 0);
    },
    0
  );

  // Calculate debt payments total
  const debtPaymentsTotal = params.debts.reduce((sum, debt) => {
    return sum + toMoney(debt.monthlyPayment);
  }, 0);

  // Total fixed costs including recurring and debts
  const fixedCosts =
    params.rent +
    params.titheRemittance +
    params.utilitiesTotal +
    recurringExpensesTotal +
    debtPaymentsTotal;

  // Rest of strategy logic remains same...
}
```

### 8. Enhance StepFixedExpenses Component

Add recurring expenses and debts sections to StepFixedExpenses (around line 486-626).

Add after utilities section:

```typescript
{
  /* Recurring Expenses Section */
}
<Animated.View entering={FadeInUp.duration(220).delay(500)}>
  <Text
    style={{
      color: "#94A3B8",
      fontFamily: "Figtree-Medium",
      fontSize: 14,
      marginBottom: 10,
    }}>
    Recurring Expenses (Optional)
  </Text>
  <Text
    style={{
      color: "#64748B",
      fontFamily: "Figtree-Regular",
      fontSize: 12,
      marginBottom: 10,
    }}>
    Subscriptions, memberships, or regular payments
  </Text>

  {draft.recurringExpenses.map((expense, index) => (
    <View
      key={expense.id}
      style={{
        marginBottom: 10,
        padding: 12,
        backgroundColor: "rgba(148,163,184,0.05)",
        borderRadius: 12,
      }}>
      <LabeledTextInput
        label="Name"
        value={expense.name}
        onChangeText={(v) => {
          const updated = [...draft.recurringExpenses];
          updated[index] = { ...updated[index], name: v };
          updateDraft({ recurringExpenses: updated });
        }}
        placeholder="e.g. Netflix"
      />
      {/* Add amount, frequency, bucket inputs... */}
    </View>
  ))}

  <PrimaryButton
    onPress={() => {
      updateDraft({
        recurringExpenses: [
          ...draft.recurringExpenses,
          {
            id: crypto.randomUUID(),
            name: "",
            amount: "",
            frequency: "monthly",
            bucket: "wants",
          },
        ],
      });
    }}
    title="+ Add Recurring Expense"
  />
</Animated.View>;

{
  /* Debts Section */
}
<Animated.View entering={FadeInUp.duration(220).delay(600)}>
  <Text
    style={{
      color: "#94A3B8",
      fontFamily: "Figtree-Medium",
      fontSize: 14,
      marginTop: 20,
      marginBottom: 10,
    }}>
    Debts & Loans (Optional)
  </Text>
  {/* Similar structure for debts... */}
</Animated.View>;
```

### 9. Update handleFinish Function

Add new fields to profile upsert payload (around line 1156):

```typescript
await enqueueMutation({
  kind: "upsert_profile",
  payload: {
    id: user.id,
    payday_day: paydayDay,
    interests: draft.interests,
    // Existing vitals
    setup_completed: true,
    stable_salary: stableSalary,
    auto_tax: draft.autoTax,
    side_income: sideIncome,
    rent: rent,
    tithe_remittance: titheRemittance,
    utilities_mode: draft.utilitiesMode,
    utilities_total: utilitiesTotal,
    utilities_ecg: toMoney(draft.utilitiesECG),
    utilities_water: toMoney(draft.utilitiesWater),
    primary_goal: draft.primaryGoal,
    strategy: draft.strategyChoice,
    needs_pct: strategy.needsPct,
    wants_pct: strategy.wantsPct,
    savings_pct: strategy.savingsPct,
    // NEW: Life stage fields
    life_stage: draft.lifeStage,
    dependents_count: parseInt(draft.dependentsCount) || 0,
    income_frequency: draft.incomeFrequency,
    spending_style: draft.spendingStyle,
    financial_priority: draft.financialPriority,
  },
});

// Add recurring expenses
for (const expense of draft.recurringExpenses.filter(
  (e) => e.name && e.amount
)) {
  await enqueueMutation({
    kind: "insert_recurring_expense",
    payload: {
      id: expense.id,
      user_id: user.id,
      name: expense.name,
      amount: toMoney(expense.amount),
      frequency: expense.frequency,
      bucket: expense.bucket,
      start_date: new Date().toISOString().split("T")[0],
      is_active: true,
      auto_allocate: true,
    },
  });
}

// Add debts
for (const debt of draft.debts.filter((d) => d.name && d.remainingAmount)) {
  await enqueueMutation({
    kind: "insert_debt",
    payload: {
      id: debt.id,
      user_id: user.id,
      name: debt.name,
      total_amount: toMoney(debt.remainingAmount),
      remaining_amount: toMoney(debt.remainingAmount),
      monthly_payment: toMoney(debt.monthlyPayment),
      start_date: new Date().toISOString().split("T")[0],
      is_active: true,
    },
  });
}
```

## Next Steps

After implementing these changes:

1. Test each step individually
2. Verify data persistence to AsyncStorage
3. Test offline-first queue
4. Verify Supabase sync
5. Add budget template selector to StepGoal component
6. Test complete wizard flow

## Files That Need Updates

1. `/app/vitals/index.tsx` - Main wizard file (all changes above)
2. `/types/budget.ts` - Already updated with new types
3. `/utils/profileVitals.ts` - May need updates to include new fields
4. `/utils/budgetSync.ts` - Add handlers for new mutation kinds
