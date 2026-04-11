import type {
  BudgetCycle,
  BudgetTransaction,
  VaultDeposit,
  VaultSparklinePoint,
  VaultSummary,
} from "@/types/budget";

const MS_DAY = 86400000;

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Initial / starting balance always before cycle surpluses; then by `depositedAt` ascending; tie-break by `id`. */
export function sortDepositsVaultLedgerOrder(deposits: VaultDeposit[]): VaultDeposit[] {
  const sourceRank = (s: VaultDeposit["source"]) => (s === "initial" ? 0 : 1);
  return [...deposits].sort((a, b) => {
    const r = sourceRank(a.source) - sourceRank(b.source);
    if (r !== 0) return r;
    const t = new Date(a.depositedAt).getTime() - new Date(b.depositedAt).getTime();
    if (t !== 0) return t;
    return a.id.localeCompare(b.id);
  });
}

/**
 * @deprecated Prefer {@link sortDepositsVaultLedgerOrder}. Alias for the same ordering.
 */
export function sortDepositsChronologically(deposits: VaultDeposit[]): VaultDeposit[] {
  return sortDepositsVaultLedgerOrder(deposits);
}

/**
 * Aggregate vault totals and cumulative sparkline from deposit rows.
 */
export function computeVaultTotal(deposits: VaultDeposit[]): VaultSummary {
  const sorted = sortDepositsVaultLedgerOrder(deposits);
  let initialBalance = 0;
  let totalFromRollovers = 0;
  let running = 0;
  const sparklinePoints: VaultSparklinePoint[] = [];
  const now = Date.now();

  for (const d of sorted) {
    const at = new Date(d.depositedAt).getTime();
    if (at > now) continue;
    const amt = Math.max(0, d.amount);
    if (d.source === "initial") initialBalance += amt;
    else if (d.source === "cycle_rollover") totalFromRollovers += amt;
    running = roundMoney(running + amt);
    sparklinePoints.push({
      date: d.depositedAt.slice(0, 10),
      cumulativeTotal: running,
    });
  }

  const lastDepositAt =
    sorted.length > 0
      ? [...sorted].reverse().find((d) => new Date(d.depositedAt).getTime() <= now)
          ?.depositedAt ?? null
      : null;

  return {
    totalBalance: roundMoney(running),
    initialBalance: roundMoney(initialBalance),
    totalFromRollovers: roundMoney(totalFromRollovers),
    depositCount: sorted.filter((d) => new Date(d.depositedAt).getTime() <= now).length,
    deposits: sorted,
    lastDepositAt,
    sparklinePoints,
  };
}

/**
 * Cycle-end surplus: max(0, disposableIncome - totalSpent for cycle).
 * Returns null when there is no positive surplus or invalid inputs.
 */
export function computeCycleRolloverDeposit(
  cycleId: string,
  transactions: BudgetTransaction[],
  disposableIncome: number,
): { amount: number } | null {
  if (!cycleId || disposableIncome <= 0) return null;
  const totalSpent = transactions
    .filter((t) => t.cycleId === cycleId)
    .reduce((sum, t) => sum + t.amount, 0);
  if (totalSpent >= disposableIncome) return null;
  const amount = roundMoney(Math.max(0, disposableIncome - totalSpent));
  if (amount <= 0) return null;
  return { amount };
}

export type SparklineGranularity = "month";

/**
 * Bucket deposits into calendar months (UTC date part) and emit cumulative totals.
 * When months <= 0, returns [].
 */
export function buildSparklineData(
  deposits: VaultDeposit[],
  months: number,
  now: Date = new Date(),
): VaultSparklinePoint[] {
  if (months <= 0) return [];

  const sorted = sortDepositsVaultLedgerOrder(deposits);
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));

  const byMonth = new Map<string, number>();
  for (const d of sorted) {
    const t = new Date(d.depositedAt).getTime();
    if (t > now.getTime()) continue;
    const day = d.depositedAt.slice(0, 10);
    const monthKey = day.slice(0, 7);
    const mStart = new Date(monthKey + "-01T00:00:00.000Z").getTime();
    if (mStart < start.getTime() || mStart > end.getTime()) continue;
    byMonth.set(monthKey, (byMonth.get(monthKey) ?? 0) + Math.max(0, d.amount));
  }

  const points: VaultSparklinePoint[] = [];
  let cumulative = 0;
  let cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    const key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`;
    cumulative = roundMoney(cumulative + (byMonth.get(key) ?? 0));
    points.push({
      date: `${key}-01`,
      cumulativeTotal: cumulative,
    });
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }

  return points;
}

export type VaultValidationIssue = {
  code: string;
  message: string;
  depositId?: string;
};

export type VaultValidationResult = {
  ok: boolean;
  issues: VaultValidationIssue[];
};

/**
 * Dev/debug checks: duplicate cycle deposits, unknown cycles, impossible rollover amounts.
 */
export function validateVaultIntegrity(
  deposits: VaultDeposit[],
  cycles: BudgetCycle[],
  disposableByCycleId: Record<string, number>,
): VaultValidationResult {
  const issues: VaultValidationIssue[] = [];
  const cycleIds = new Set(cycles.map((c) => c.id));
  const seenCycleDeposit = new Set<string>();

  for (const d of deposits) {
    if (d.source === "cycle_rollover") {
      if (!d.sourceCycleId) {
        issues.push({
          code: "missing_cycle_id",
          message: "cycle_rollover deposit missing sourceCycleId",
          depositId: d.id,
        });
        continue;
      }
      const key = d.sourceCycleId;
      if (seenCycleDeposit.has(key)) {
        issues.push({
          code: "duplicate_cycle_deposit",
          message: `More than one vault deposit for cycle ${key}`,
          depositId: d.id,
        });
      }
      seenCycleDeposit.add(key);
      if (!cycleIds.has(d.sourceCycleId)) {
        issues.push({
          code: "unknown_cycle",
          message: `Deposit references unknown cycle ${d.sourceCycleId}`,
          depositId: d.id,
        });
      } else {
        const cap = disposableByCycleId[d.sourceCycleId];
        if (cap !== undefined && d.amount > cap + 0.01) {
          issues.push({
            code: "amount_exceeds_disposable",
            message: `Deposit amount exceeds disposable income for cycle ${d.sourceCycleId}`,
            depositId: d.id,
          });
        }
      }
    }
  }

  return { ok: issues.length === 0, issues };
}

/** Whether a cycle has ended (local end-of-day on endDate). */
export function isCycleEnded(cycle: BudgetCycle, now: Date = new Date()): boolean {
  const end = new Date(cycle.endDate + "T23:59:59");
  return now > end;
}
