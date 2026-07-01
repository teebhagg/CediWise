import type {
  BudgetBucket,
  BudgetCategory,
  BudgetCycle,
  IncomeSource,
} from "@/types/budget";
import { BUDGET_PLAN_TOLERANCE_GHS } from "@/utils/budgetPlanConstants";
import { getMonthlyNetIncome } from "@/utils/incomeCalculations";
import type { TaxConfig } from "@/utils/taxSync";

export type BucketReconciliationStatus = "ok" | "over" | "under";

export type BucketReconciliation = {
  bucket: BudgetBucket;
  allocated: number;
  envelope: number;
  freeInBucket: number;
  overflow: number;
  status: BucketReconciliationStatus;
};

export type BudgetPlanViolation = {
  type: "L2" | "L3" | "L4";
  bucket?: BudgetBucket;
  amount: number;
};

export type BudgetPlanValidationResult = {
  valid: boolean;
  takeHome: number;
  totalPlanned: number;
  unassigned: number;
  buckets: Record<BudgetBucket, BucketReconciliation>;
  violations: BudgetPlanViolation[];
  lockedObligations: number;
};

const BUCKETS: BudgetBucket[] = ["needs", "wants", "savings"];

export function computeBucketEnvelopes(
  takeHome: number,
  cycle: Pick<BudgetCycle, "needsPct" | "wantsPct" | "savingsPct">,
): Record<BudgetBucket, number> {
  return {
    needs: takeHome * cycle.needsPct,
    wants: takeHome * cycle.wantsPct,
    savings: takeHome * cycle.savingsPct,
  };
}

export function sumCategoryLimitsByBucket(
  categories: Pick<BudgetCategory, "bucket" | "limitAmount">[],
): Record<BudgetBucket, number> {
  const sums: Record<BudgetBucket, number> = {
    needs: 0,
    wants: 0,
    savings: 0,
  };
  for (const cat of categories) {
    sums[cat.bucket] += cat.limitAmount;
  }
  return sums;
}

export function validateBudgetPlan(params: {
  cycle: Pick<BudgetCycle, "needsPct" | "wantsPct" | "savingsPct">;
  categories: Pick<
    BudgetCategory,
    "bucket" | "limitAmount" | "manualOverride"
  >[];
  incomeSources: IncomeSource[];
  taxConfig?: TaxConfig;
  tolerance?: number;
}): BudgetPlanValidationResult {
  const tolerance = params.tolerance ?? BUDGET_PLAN_TOLERANCE_GHS;
  const takeHome = getMonthlyNetIncome(
    params.incomeSources,
    params.taxConfig,
  );
  const envelopes = computeBucketEnvelopes(takeHome, params.cycle);
  const allocatedByBucket = sumCategoryLimitsByBucket(params.categories);
  const totalPlanned = BUCKETS.reduce(
    (s, b) => s + allocatedByBucket[b],
    0,
  );
  const unassigned = Math.max(0, takeHome - totalPlanned);

  const lockedObligations = params.categories
    .filter((c) => c.manualOverride && c.limitAmount > 0)
    .reduce((s, c) => s + c.limitAmount, 0);

  const violations: BudgetPlanViolation[] = [];
  const buckets = {} as Record<BudgetBucket, BucketReconciliation>;

  for (const bucket of BUCKETS) {
    const allocated = allocatedByBucket[bucket];
    const envelope = envelopes[bucket];
    const diff = allocated - envelope;
    const overflow = diff > tolerance ? diff : 0;
    const freeInBucket = diff < -tolerance ? -diff : Math.max(0, -diff);

    let status: BucketReconciliationStatus = "ok";
    if (overflow > 0) status = "over";
    else if (allocated < envelope - tolerance) status = "under";

    buckets[bucket] = {
      bucket,
      allocated,
      envelope,
      freeInBucket: Math.max(0, envelope - allocated),
      overflow,
      status,
    };

    if (overflow > 0) {
      violations.push({ type: "L2", bucket, amount: overflow });
    }
  }

  const incomeOverflow = totalPlanned - takeHome;
  if (incomeOverflow > tolerance) {
    violations.push({ type: "L3", amount: incomeOverflow });
  }

  if (takeHome > 0 && lockedObligations > takeHome) {
    violations.push({
      type: "L4",
      amount: lockedObligations - takeHome,
    });
  }

  if (takeHome <= 0) {
    violations.push({ type: "L3", amount: totalPlanned });
  }

  return {
    valid: violations.length === 0,
    takeHome,
    totalPlanned,
    unassigned,
    buckets,
    violations,
    lockedObligations,
  };
}

export function formatViolationMessage(
  result: BudgetPlanValidationResult,
): string {
  const primary = getPrimaryViolation(result);
  if (!primary) return "";
  if (primary.type === "L4") {
    return `Fixed costs (₵${primary.amount.toFixed(0)} over take-home) exceed your take-home pay.`;
  }
  if (primary.type === "L3") {
    return `Your category limits are ₵${primary.amount.toFixed(0)} above take-home pay.`;
  }
  if (primary.type === "L2" && primary.bucket) {
    const label =
      primary.bucket === "needs"
        ? "Needs"
        : primary.bucket === "wants"
          ? "Wants"
          : "Savings";
    return `${label} is ₵${primary.amount.toFixed(0)} over its budget.`;
  }
  return "Your budget plan needs adjustment.";
}

export function getPrimaryViolation(
  result: BudgetPlanValidationResult,
): BudgetPlanViolation | null {
  const order: BudgetPlanViolation["type"][] = ["L4", "L3", "L2"];
  for (const type of order) {
    const hit = result.violations.find((v) => v.type === type);
    if (hit) return hit;
  }
  return null;
}

/** True when category totals exceed take-home (L3) or fixed costs do (L4). */
export function isPlanOverTakeHomePay(
  validation: BudgetPlanValidationResult | null | undefined,
): boolean {
  if (!validation) return false;
  return validation.violations.some((v) => v.type === "L3" || v.type === "L4");
}

/** True when category limits exceed a bucket envelope (L2) or take-home (L3). */
export function hasCategoryAllocationExceeded(
  validation: BudgetPlanValidationResult | null | undefined,
): boolean {
  if (!validation) return false;
  return validation.violations.some((v) => v.type === "L2" || v.type === "L3");
}

/** Primary L2/L3 violation for reconcile banners (ignores L4 survival). */
export function getCategoryAllocationViolation(
  result: BudgetPlanValidationResult,
): BudgetPlanViolation | null {
  const l3 = result.violations.find((v) => v.type === "L3");
  if (l3) return l3;
  const l2Violations = result.violations.filter((v) => v.type === "L2");
  if (l2Violations.length === 0) return null;
  return l2Violations.reduce((max, v) => (v.amount > max.amount ? v : max));
}

export class BudgetPlanSetupError extends Error {
  readonly validation: BudgetPlanValidationResult;

  constructor(validation: BudgetPlanValidationResult) {
    super(formatViolationMessage(validation));
    this.name = "BudgetPlanSetupError";
    this.validation = validation;
  }
}
