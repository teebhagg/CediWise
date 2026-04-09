export type LifeStage = "student" | "young_professional" | "family" | "retiree";

export type BudgetTemplateKey =
  | "smart"
  | "balanced"
  | "moderate"
  | "survival"
  | "aggressive_savings";
export type IncomeFrequency = "weekly" | "bi_weekly" | "monthly";
export type SpendingStyle = "conservative" | "moderate" | "liberal";
export type FinancialPriority =
  | "debt_payoff"
  | "savings_growth"
  | "lifestyle"
  | "balanced";

/** Matches PrimaryGoal in profileVitals — keep in sync. */
export type GoalType = "emergency_fund" | "project" | "investment";

/** Budget allocation bucket for a recurring expense. */
export type RecurringExpenseBucket = "needs" | "wants";

export type RecurringExpense = {
  id: string;
  name: string;
  bucket: RecurringExpenseBucket;
  amount: string; // stored as string to mirror text input state
};

export type BudgetPreview = {
  needsPct: number;
  wantsPct: number;
  savingsPct: number;
  netIncome: number;
  strategy: string;
};

export type Draft = {
  step: number;
  stableSalary: string;
  autoTax: boolean;
  paydayDay: number;
  lifeStage: LifeStage | null;
  incomeFrequency: IncomeFrequency;
  spendingStyle: SpendingStyle | null;
  financialPriority: FinancialPriority | null;
  interests: string[];
  // Budget template (Screen 3 — user picks; "smart" uses computeIntelligentStrategy)
  selectedTemplate: BudgetTemplateKey;
  // Recurring expenses (Screen 3 — added via dialog)
  recurringExpenses: RecurringExpense[];
  // Savings goal (Screen 3 inline form)
  goalType: GoalType | null;
  goalAmount: string;
  goalTimeline: string;
};

export type UpdateDraft = (patch: Partial<Draft>) => void;

export type StepErrors = Record<string, string>;
