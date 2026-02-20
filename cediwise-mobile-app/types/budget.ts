// Utilities are treated as part of Needs (v1).
export type BudgetBucket = "needs" | "wants" | "savings";

export type IncomeSourceType = "primary" | "side";

export type IncomeSource = {
  id: string;
  userId: string;
  name: string;
  type: IncomeSourceType;
  amount: number; // monthly gross
  applyDeductions: boolean; // only meaningful for primary
  createdAt: string;
  updatedAt: string;
};

export type BudgetCycle = {
  id: string;
  userId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  paydayDay: number; // 1..31
  needsPct: number; // 0..1
  wantsPct: number; // 0..1
  savingsPct: number; // 0..1
  rolloverFromPrevious: {
    needs: number;
    wants: number;
    savings: number;
  };
  reallocationApplied: boolean;
  reallocationReason?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BudgetCategory = {
  id: string;
  userId: string;
  cycleId: string;
  bucket: BudgetBucket;
  name: string;
  limitAmount: number;
  isCustom: boolean;
  parentId?: string | null;
  sortOrder: number;
  suggestedLimit?: number | null;
  isArchived: boolean;
  manualOverride: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BudgetTransaction = {
  id: string;
  userId: string;
  cycleId: string;
  bucket: BudgetBucket;
  categoryId?: string | null;
  amount: number;
  note?: string;
  occurredAt: string; // ISO
  source: "manual";
  createdAt: string;
};

export type BudgetProfilePrefs = {
  paydayDay?: number;
  interests?: string[];
  /** For weighted category allocation */
  lifeStage?: "student" | "young_professional" | "family" | "retiree" | null;
};

export type BudgetState = {
  version: 1;
  userId: string;
  prefs: BudgetProfilePrefs;
  incomeSources: IncomeSource[];
  cycles: BudgetCycle[];
  categories: BudgetCategory[];
  transactions: BudgetTransaction[];
  updatedAt: string;
};

// New types for enhanced personalization
export type RecurringExpenseFrequency =
  | "weekly"
  | "bi_weekly"
  | "monthly"
  | "quarterly"
  | "annually";

export type RecurringExpense = {
  id: string;
  userId: string;
  name: string;
  amount: number;
  frequency: RecurringExpenseFrequency;
  bucket: BudgetBucket;
  categoryId?: string | null;
  startDate: string; // YYYY-MM-DD
  endDate?: string | null; // YYYY-MM-DD
  isActive: boolean;
  autoAllocate: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Debt = {
  id: string;
  userId: string;
  name: string;
  totalAmount: number;
  remainingAmount: number;
  monthlyPayment: number;
  interestRate?: number | null;
  startDate: string; // YYYY-MM-DD
  targetPayoffDate?: string | null; // YYYY-MM-DD
  isActive: boolean;
  categoryId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LifeStage = "student" | "young_professional" | "family" | "retiree";
export type IncomeFrequency = "weekly" | "bi_weekly" | "monthly";
export type SpendingStyle = "conservative" | "moderate" | "liberal";
export type FinancialPriority =
  | "debt_payoff"
  | "savings_growth"
  | "lifestyle"
  | "balanced";

export type BudgetTemplate = {
  id: string;
  name: string;
  description: string;
  targetAudience: string;
  lifeStage?: LifeStage | null;
  needsPct: number;
  wantsPct: number;
  savingsPct: number;
  recommendedCategories: {
    needs: string[];
    wants: string[];
    savings: string[];
  };
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
};

export type SpendingTrend = "increasing" | "stable" | "decreasing";

export type SpendingPattern = {
  id: string;
  userId: string;
  categoryId: string;
  cycleId: string;
  avgSpent: number;
  trend: SpendingTrend;
  variance: number;
  lastCalculatedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type ActivityLogActionType =
  | "category_added"
  | "category_limit_updated"
  | "transaction_added";

export type ActivityLogEntityType = "category" | "transaction";

export type UserActivityLogEntry = {
  id: string;
  userId: string;
  cycleId?: string | null;
  actionType: ActivityLogActionType;
  entityType: ActivityLogEntityType;
  entityId?: string | null;
  intendedAmount: number;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type BudgetAdjustmentType =
  | "vitals_change"
  | "manual"
  | "auto_reallocation"
  | "template_applied"
  | "rollover"
  | "income_change"
  | "category_change";

export type BudgetAdjustment = {
  id: string;
  userId: string;
  cycleId?: string | null;
  adjustmentType: BudgetAdjustmentType;
  changes: Record<string, unknown>;
  reason?: string | null;
  createdAt: string;
};

// Extended profile preferences
export type ExtendedBudgetProfilePrefs = BudgetProfilePrefs & {
  lifeStage?: LifeStage | null;
  dependentsCount: number;
  incomeFrequency: IncomeFrequency;
  spendingStyle?: SpendingStyle | null;
  financialPriority?: FinancialPriority | null;
  enableAutoReallocation: boolean;
  rolloverEnabled: boolean;
};

export type BudgetMutationKind =
  | "upsert_profile"
  | "upsert_income_source"
  | "upsert_cycle"
  | "upsert_category"
  | "insert_transaction"
  | "update_transaction"
  | "delete_transaction"
  | "delete_category"
  | "delete_income_source"
  | "reset_budget"
  | "insert_recurring_expense"
  | "update_recurring_expense"
  | "delete_recurring_expense"
  | "insert_debt"
  | "update_debt"
  | "delete_debt"
  | "record_debt_payment"
  | "apply_template"
  | "apply_reallocation"
  | "log_budget_adjustment"
  | "archive_category"
  | "update_category_limit";

export type BudgetMutation = {
  id: string;
  userId: string;
  createdAt: string; // ISO
  kind: BudgetMutationKind;
  payload: Record<string, unknown>;
  retryCount: number;
  lastAttemptAt?: string;
  lastError?: string;
};

export type BudgetQueue = {
  version: 1;
  userId: string;
  items: BudgetMutation[];
  updatedAt: string;
};

// Extended budget state
export type ExtendedBudgetState = BudgetState & {
  recurringExpenses: RecurringExpense[];
  debts: Debt[];
  spendingPatterns: SpendingPattern[];
  adjustments: BudgetAdjustment[];
};
