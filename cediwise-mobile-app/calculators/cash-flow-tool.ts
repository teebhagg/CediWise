/**
 * Small Business Cash Flow Tool
 * Simple cash-in vs cash-out projection. For educational purposes only.
 */

export type CashFlowInput = {
  /** Expected monthly income (GHS) */
  monthlyIncome: number;
  /** Fixed monthly expenses (rent, utilities, etc.) */
  fixedExpenses: number;
  /** Variable expenses as % of income (0-1) */
  variableExpensePct: number;
  /** Number of months to project */
  months: number;
};

export type CashFlowMonth = {
  month: number;
  income: number;
  fixedExpenses: number;
  variableExpenses: number;
  netCashFlow: number;
  cumulativeCash: number;
};

export type CashFlowResult = {
  monthlyProjection: CashFlowMonth[];
  averageMonthlyNet: number;
  totalNetOverPeriod: number;
};

export function calculateCashFlow(input: CashFlowInput): CashFlowResult {
  const { monthlyIncome, fixedExpenses, variableExpensePct, months } = input;

  const monthlyProjection: CashFlowMonth[] = [];
  let cumulativeCash = 0;

  for (let m = 1; m <= months; m++) {
    const variableExpenses =
      Math.round(monthlyIncome * variableExpensePct * 100) / 100;
    const netCashFlow =
      Math.round((monthlyIncome - fixedExpenses - variableExpenses) * 100) /
      100;
    cumulativeCash = Math.round((cumulativeCash + netCashFlow) * 100) / 100;

    monthlyProjection.push({
      month: m,
      income: monthlyIncome,
      fixedExpenses,
      variableExpenses,
      netCashFlow,
      cumulativeCash,
    });
  }

  const totalNetOverPeriod = monthlyProjection.reduce(
    (sum, m) => sum + m.netCashFlow,
    0
  );
  const averageMonthlyNet =
    months > 0 ? Math.round((totalNetOverPeriod / months) * 100) / 100 : 0;

  return {
    monthlyProjection,
    averageMonthlyNet,
    totalNetOverPeriod,
  };
}
