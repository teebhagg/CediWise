// Direction: custom SVG charts + range selector + category breakdown to match mock; no new deps.

import type { BudgetCategory, BudgetCycle, BudgetTransaction } from '@/types/budget';
import {
  CATEGORY_ICON_COLORS,
  getCategoryIcon,
  type CategoryIconName,
} from '@/constants/categoryIcons';

// export type InsightsRangeKey = '1W' | '1M' | '6M' | '1Y';
export type InsightsRangeKey = '1W' | '1M' | '6M' | '1Y';

export type InsightsSeries = {
  labels: string[];
  values: number[];
  maxValue: number;
  avgValue: number;
};

export type CategoryBreakdown = {
  categoryId: string;
  name: string;
  amount: number;
  percent: number;
  icon: CategoryIconName;
  color: string;
  count: number;
};

export type InsightsRangeData = {
  series: InsightsSeries;
  totalSpent: number;
  averageLabel: string;
  dateRangeLabel: string;
  categoryBreakdown: CategoryBreakdown[];
};

const DEBT_CATEGORY_ID = '__debt__';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const toMonthLabel = (date: Date) =>
  date.toLocaleString('en-US', { month: 'short' });

const toMonthDayLabel = (date: Date) => {
  const month = toMonthLabel(date);
  const day = date.getDate();
  return `${month} ${day}`;
};

const toDayLabel = (date: Date) =>
  date.toLocaleString('en-US', { weekday: 'short' });

const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const addDays = (date: Date, days: number) =>
  new Date(date.getTime() + days * MS_PER_DAY);

const clampNumber = (value: number) => (Number.isFinite(value) ? value : 0);

const sumAmounts = (transactions: BudgetTransaction[]) =>
  transactions.reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);

const buildYearlyMonthlySeries = (
  endDate: Date,
  transactions: BudgetTransaction[],
) => {
  const labels: string[] = [];
  const values: number[] = [];
  const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  for (let i = 11; i >= 0; i -= 1) {
    const monthStart = new Date(endMonth.getFullYear(), endMonth.getMonth() - i, 1);
    const monthEnd = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
    labels.push(toMonthLabel(monthStart));
    const periodTx = transactions.filter((tx) => {
      const occurred = new Date(tx.occurredAt);
      return occurred >= monthStart && occurred <= monthEnd;
    });
    values.push(sumAmounts(periodTx));
  }
  const dateRangeLabel = labels.length
    ? `${labels[0]} - ${labels[labels.length - 1]}`
    : '';
  return { labels, values, dateRangeLabel };
};

const buildCycleSeries = (
  cycles: BudgetCycle[],
  transactions: BudgetTransaction[],
  count: number,
) => {
  const sorted = [...cycles].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );
  const slice = sorted.slice(-count);
  const labels = slice.map((cycle) =>
    toMonthLabel(new Date(cycle.startDate)),
  );
  const values = slice.map((cycle) => {
    const cycleTx = transactions.filter((tx) => tx.cycleId === cycle.id);
    return sumAmounts(cycleTx);
  });
  const dateRangeLabel = slice.length
    ? `${toMonthLabel(new Date(slice[0].startDate))} - ${toMonthLabel(
        new Date(slice[slice.length - 1].startDate),
      )}`
    : '';
  return { labels, values, dateRangeLabel };
};

const buildMonthlySeries = (
  endDate: Date,
  transactions: BudgetTransaction[],
  count: number,
) => {
  const labels: string[] = [];
  const values: number[] = [];
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  for (let i = count - 1; i >= 0; i -= 1) {
    const monthStart = new Date(end.getFullYear(), end.getMonth() - i, 1);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59, 999);
    labels.push(toMonthLabel(monthStart));
    const periodTx = transactions.filter((tx) => {
      const occurred = new Date(tx.occurredAt);
      return occurred >= monthStart && occurred <= monthEnd;
    });
    values.push(sumAmounts(periodTx));
  }
  const dateRangeLabel = labels.length
    ? `${labels[0]} - ${labels[labels.length - 1]}`
    : '';
  return { labels, values, dateRangeLabel };
};

const buildWeeklySeries = (endDate: Date, transactions: BudgetTransaction[]) => {
  const end = startOfDay(endDate);
  const labels: string[] = [];
  const values: number[] = [];

  // Build 4 consecutive 7-day buckets ending on `end` (today), oldest -> newest.
  for (let i = 3; i >= 0; i -= 1) {
    const periodEnd = addDays(end, -i * 7);
    const periodStart = addDays(periodEnd, -6);
    labels.push(toMonthDayLabel(periodEnd));
    const periodTx = transactions.filter((tx) => {
      const occurred = new Date(tx.occurredAt);
      return occurred >= periodStart && occurred < addDays(periodEnd, 1);
    });
    values.push(sumAmounts(periodTx));
  }

  const start = addDays(end, -27);
  const dateRangeLabel = `${toMonthDayLabel(start)} - ${toMonthDayLabel(end)}`;
  return { labels, values, dateRangeLabel };
};

const buildDailySeries = (endDate: Date, transactions: BudgetTransaction[]) => {
  const end = startOfDay(endDate);
  const start = addDays(end, -6);
  const labels: string[] = [];
  const values: number[] = [];
  for (let i = 0; i < 7; i += 1) {
    const day = addDays(start, i);
    labels.push(toDayLabel(day));
    const dayEnd = addDays(day, 1);
    const periodTx = transactions.filter((tx) => {
      const occurred = new Date(tx.occurredAt);
      return occurred >= day && occurred < dayEnd;
    });
    values.push(sumAmounts(periodTx));
  }
  const dateRangeLabel = `${toMonthDayLabel(start)} - ${toMonthDayLabel(end)}`;
  return { labels, values, dateRangeLabel };
};

const getRangeTransactions = (
  range: InsightsRangeKey,
  cycles: BudgetCycle[],
  transactions: BudgetTransaction[],
  now: Date,
) => {
  if (range === '6M' || range === '1Y') {
    const count = range === '6M' ? 6 : 12;
    const sorted = [...cycles].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );
    const slice = sorted.slice(-count);
    if (slice.length) {
      const cycleIds = new Set(slice.map((cycle) => cycle.id));
      return transactions.filter((tx) => cycleIds.has(tx.cycleId));
    }
  }
  const days = range === '1W' ? 7 : range === '1M' ? 30 : range === '6M' ? 180 : 365;
  const start = addDays(startOfDay(now), -(days - 1));
  const end = addDays(startOfDay(now), 1);
  return transactions.filter((tx) => {
    const occurred = new Date(tx.occurredAt);
    return occurred >= start && occurred < end;
  });
};

export const buildInsightsRangeData = ({
  range,
  cycles,
  transactions,
  categories,
  now = new Date(),
}: {
  range: InsightsRangeKey;
  cycles: BudgetCycle[];
  transactions: BudgetTransaction[];
  categories: BudgetCategory[];
  now?: Date;
}): InsightsRangeData => {
  const hasCyclesForSixMonths = cycles.length >= 6;
  let seriesLabels: string[] = [];
  let seriesValues: number[] = [];
  let dateRangeLabel = '';

  if (range === '1W') {
    ({ labels: seriesLabels, values: seriesValues, dateRangeLabel } = buildDailySeries(
      now,
      transactions,
    ));
  } else if (range === '1M') {
    ({ labels: seriesLabels, values: seriesValues, dateRangeLabel } = buildWeeklySeries(
      now,
      transactions,
    ));
  } else if (range === '6M' && hasCyclesForSixMonths) {
    ({ labels: seriesLabels, values: seriesValues, dateRangeLabel } = buildCycleSeries(
      cycles,
      transactions,
      6,
    ));
  } else if (range === '1Y') {
    ({ labels: seriesLabels, values: seriesValues, dateRangeLabel } = buildYearlyMonthlySeries(
      now,
      transactions,
    ));
  } else {
    ({ labels: seriesLabels, values: seriesValues, dateRangeLabel } = buildMonthlySeries(
      now,
      transactions,
      range === '6M' ? 6 : 12,
    ));
  }

  const totalSpent = seriesValues.reduce((sum, value) => sum + clampNumber(value), 0);
  const avgValue = seriesValues.length ? totalSpent / seriesValues.length : 0;
  const maxValue = Math.max(1, ...seriesValues.map(clampNumber));

  const rangeTransactions = getRangeTransactions(range, cycles, transactions, now);
  const categoriesById = new Map(categories.map((c) => [c.id, c]));
  
  // Grouping by name instead of categoryId to aggregate across cycles
  const totalsByName = new Map<string, { 
    amount: number; 
    count: number; 
    categoryId: string; 
    icon: CategoryIconName; 
    displayName: string 
  }>();
  
  for (const tx of rangeTransactions) {
    const isDebt = !!tx.debtId;
    const category = tx.categoryId ? categoriesById.get(tx.categoryId) : null;
    const name = isDebt ? 'Debt Payment' : (category?.name ?? 'Uncategorized');
    
    const key = name.toLowerCase().trim();
    const current = totalsByName.get(key) ?? { 
      amount: 0, 
      count: 0, 
      categoryId: tx.categoryId ?? (isDebt ? DEBT_CATEGORY_ID : 'uncategorized'),
      icon: (isDebt ? 'Receipt' : category?.icon ?? getCategoryIcon(name)) as CategoryIconName,
      displayName: name // Keep the first one we find for display
    };
    
    totalsByName.set(key, {
      ...current,
      amount: current.amount + Math.abs(tx.amount || 0),
      count: current.count + 1,
    });
  }

  const breakdown = Array.from(totalsByName.values())
    .map((summary, index) => {
      const color = CATEGORY_ICON_COLORS[index % CATEGORY_ICON_COLORS.length];
      const percent = totalSpent > 0 ? summary.amount / totalSpent : 0;
      return {
        categoryId: summary.categoryId, 
        name: summary.displayName,
        amount: summary.amount,
        percent,
        icon: summary.icon,
        color,
        count: summary.count,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  let averageLabel: string;
  if (range === '1W') {
    averageLabel = 'avg. per day';
  } else if (range === '1M') {
    averageLabel = 'avg. per week';
  } else if (range === '6M') {
    averageLabel = hasCyclesForSixMonths ? 'avg. per cycle' : 'avg. per month';
  } else {
    averageLabel = 'avg. per month';
  }

  return {
    series: {
      labels: seriesLabels,
      values: seriesValues,
      maxValue,
      avgValue,
    },
    totalSpent,
    averageLabel,
    dateRangeLabel,
    categoryBreakdown: breakdown,
  };
};
