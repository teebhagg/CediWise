import type { BudgetBucket } from "../../../types/budget";

export type IncomeTaxSummary = {
  mode: "sources" | "vitals" | "manual";
  gross: number;
  net: number;
  deductions: number;
  totalSsnit: number;
  totalPaye: number;
  breakdowns: Array<{
    src: {
      id: string;
      name: string;
      type: string;
      amount: number;
      applyDeductions: boolean;
    };
    taxable: boolean;
    tax: { ssnit: number; paye: number; netTakeHome: number };
  }>;
};

export type BudgetTotals = {
  monthlyNetIncome: number;
  needsLimit: number;
  wantsLimit: number;
  savingsLimit: number;
  spentByBucket: Record<BudgetBucket, number>;
};
