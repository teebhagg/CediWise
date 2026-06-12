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
  /** Full net income — budget envelopes use this; recurring does not reduce it. */
  disposableIncome: number;
  /** Active recurring (monthly equivalents) for planning display only. */
  totalRecurringMonthly: number;
  recurringByBucket: Record<BudgetBucket, number>;
  needsLimit: number;
  wantsLimit: number;
  savingsLimit: number;
  spentTotal: number;
  /** Flexible envelope left: net income − logged spend this cycle. */
  unspentThisMonth: number;
  spentByBucket: Record<BudgetBucket, number>;
};
