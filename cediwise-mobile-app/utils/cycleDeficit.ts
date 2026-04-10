import type { BudgetTransaction } from "@/types/budget";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DEFICIT_RESOLUTIONS_KEY_PREFIX = "@cediwise_deficit_resolutions:";

export type CycleDeficitResolutionChoice =
  | "financed"
  | "covered_by_savings"
  | "dismissed";

export type CycleDeficitResolution = {
  cycleId: string;
  resolvedAt: string;
  choice: CycleDeficitResolutionChoice;
  debtId?: string | null;
};

export type CycleDeficitResult = {
  cycleId: string;
  deficitAmount: number;
  totalSpent: number;
  monthlyNetIncome: number;
};

/**
 * Compute deficit for a cycle: total spent > monthly net income.
 * Returns null if no deficit.
 */
export function computeCycleDeficit(params: {
  cycleId: string;
  transactions: BudgetTransaction[];
  monthlyNetIncome: number;
  /** When set, overspend is measured against this (e.g. disposable after recurring). */
  budgetBaseline?: number;
}): CycleDeficitResult | null {
  const { cycleId, transactions, monthlyNetIncome, budgetBaseline } = params;
  if (monthlyNetIncome <= 0) return null;

  const baseline = budgetBaseline ?? monthlyNetIncome;
  if (baseline <= 0) return null;

  const totalSpent = transactions
    .filter((t) => t.cycleId === cycleId)
    .reduce((sum, t) => sum + t.amount, 0);

  if (totalSpent <= baseline) return null;

  return {
    cycleId,
    deficitAmount: totalSpent - baseline,
    totalSpent,
    monthlyNetIncome,
  };
}

function deficitResolutionsKey(userId: string): string {
  return `${DEFICIT_RESOLUTIONS_KEY_PREFIX}${userId}`;
}

export async function getDeficitResolutions(
  userId: string,
): Promise<CycleDeficitResolution[]> {
  try {
    const raw = await AsyncStorage.getItem(deficitResolutionsKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function getResolutionForCycle(
  userId: string,
  cycleId: string,
): Promise<CycleDeficitResolution | null> {
  const all = await getDeficitResolutions(userId);
  return all.find((r) => r.cycleId === cycleId) ?? null;
}

export async function saveDeficitResolution(
  userId: string,
  resolution: Omit<CycleDeficitResolution, "resolvedAt">,
): Promise<void> {
  const full: CycleDeficitResolution = {
    ...resolution,
    resolvedAt: new Date().toISOString(),
  };
  const all = await getDeficitResolutions(userId);
  const filtered = all.filter((r) => r.cycleId !== resolution.cycleId);
  await AsyncStorage.setItem(
    deficitResolutionsKey(userId),
    JSON.stringify([...filtered, full]),
  );
}
