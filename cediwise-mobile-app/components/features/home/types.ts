import type { BudgetBucket } from "../../../types/budget";

export type IncomeTaxSummary = {
  mode: "sources" | "vitals" | "manual";
  gross: number;
  net: number;
  deductions: number;
  totalSsnit: number;
  totalNhis: number;
  totalPaye: number;
  breakdowns: {
    src: {
      id: string;
      name: string;
      type: string;
      amount: number;
      applyDeductions: boolean;
    };
    taxable: boolean;
    tax: { ssnit: number; nhis: number; paye: number; netTakeHome: number };
  }[];
};

export type BudgetTotals = {
  monthlyNetIncome: number;
  /** Net income minus active recurring (monthly equivalents). */
  disposableIncome: number;
  totalRecurringMonthly: number;
  recurringByBucket: Record<BudgetBucket, number>;
  needsLimit: number;
  wantsLimit: number;
  savingsLimit: number;
  spentTotal: number;
  /** Flexible envelope left: disposableIncome − logged spend this cycle. */
  unspentThisMonth: number;
  spentByBucket: Record<BudgetBucket, number>;
};
