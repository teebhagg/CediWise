export type DataSufficiency = "insufficient" | "warmup" | "full";

export type CashFlowProjection = {
  sufficiency: DataSufficiency;
  dataDays: number;
  dailyBurnRate: number;
  runOutDate: Date | null;
  daysUntilRunOut: number | null;
  safeToSpendToday: number;
  isNegative: boolean;
};

type TransactionInput = {
  amount: number;
  occurredAt: string;
};

type RecurringExpenseInput = {
  amount: number;
  frequency: "weekly" | "bi_weekly" | "monthly" | "quarterly" | "annually";
  isActive: boolean;
};

export function toMonthlyEquivalent(expense: RecurringExpenseInput): number {
  const { amount, frequency } = expense;
  switch (frequency) {
    case "weekly":
      return (amount * 52) / 12;
    case "bi_weekly":
      return (amount * 26) / 12;
    case "monthly":
      return amount;
    case "quarterly":
      return amount / 3;
    case "annually":
      return amount / 12;
  }
}

export function computeCashFlowProjection(
  currentBalance: number,
  transactions: TransactionInput[],
  recurringExpenses: RecurringExpenseInput[],
  cycleStartDate: string
): CashFlowProjection {
  const today = new Date();
  const cycleStart = new Date(cycleStartDate + "T00:00:00");
  const dataDays = Math.max(
    1,
    Math.ceil(
      (today.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24)
    )
  );

  let sufficiency: DataSufficiency;
  if (dataDays < 3) {
    sufficiency = "insufficient";
  } else if (dataDays < 7) {
    sufficiency = "warmup";
  } else {
    sufficiency = "full";
  }

  if (sufficiency === "insufficient") {
    return {
      sufficiency,
      dataDays,
      dailyBurnRate: 0,
      runOutDate: null,
      daysUntilRunOut: null,
      safeToSpendToday: 0,
      isNegative: false,
    };
  }

  const fixedMonthlyExpenses = recurringExpenses
    .filter((e) => e.isActive)
    .reduce((sum, e) => sum + toMonthlyEquivalent(e), 0);

  const totalVariableSpending = transactions.reduce(
    (sum, t) => sum + t.amount,
    0
  );

  const daysInMonth = 30;

  // daily burn = fixed daily rate + variable daily rate extrapolated from observed period
  const dailyBurnRate =
    (fixedMonthlyExpenses + totalVariableSpending * (30 / dataDays)) /
    daysInMonth;

  if (dailyBurnRate <= 0) {
    return {
      sufficiency,
      dataDays,
      dailyBurnRate: 0,
      runOutDate: null,
      daysUntilRunOut: null,
      safeToSpendToday: currentBalance,
      isNegative: false,
    };
  }

  const daysUntilRunOutRaw = currentBalance / dailyBurnRate;
  const daysUntilRunOut = Math.max(0, Math.floor(daysUntilRunOutRaw));
  const runOutDate = new Date(
    today.getTime() + daysUntilRunOut * 24 * 60 * 60 * 1000
  );

  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const remainingDaysInMonth = Math.max(
    1,
    Math.ceil(
      (endOfMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )
  );

  const safeToSpend = currentBalance - dailyBurnRate * remainingDaysInMonth;
  const isNegative = safeToSpend < 0;

  return {
    sufficiency,
    dataDays,
    dailyBurnRate,
    runOutDate,
    daysUntilRunOut,
    safeToSpendToday: Math.max(0, safeToSpend),
    isNegative,
  };
}

export function formatRunOutDate(
  date: Date,
  locale: string = "en-GH"
): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";

  return date.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year:
      date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

export function isTodayPayday(
  paydayDay: number | null | undefined
): boolean {
  if (paydayDay == null) return false;
  if (
    !Number.isInteger(paydayDay) ||
    paydayDay < 1 ||
    paydayDay > 31
  ) {
    return false;
  }
  const today = new Date();
  return today.getDate() === paydayDay;
}

export function needsSalaryReset(
  paydayDay: number | null | undefined,
  lastReset: string | null
): boolean {
  if (!isTodayPayday(paydayDay)) return false;
  if (!lastReset) return true;
  const lastResetDate = new Date(lastReset);
  const today = new Date();
  return lastResetDate.toDateString() !== today.toDateString();
}

export function isDataStale(lastReset: string | null): boolean {
  if (!lastReset) return false;
  const lastResetDate = new Date(lastReset);
  const now = new Date();
  const monthsDiff =
    (now.getFullYear() - lastResetDate.getFullYear()) * 12 +
    (now.getMonth() - lastResetDate.getMonth());
  return monthsDiff >= 2;
}
