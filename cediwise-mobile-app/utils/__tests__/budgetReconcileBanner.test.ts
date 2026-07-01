import type { BudgetPlanValidationResult } from "../budgetPlanValidation";
import {
  getPlanViolationOverflow,
  getReconcileBannerMessage,
  shouldShowReconcileBanner,
} from "../budgetReconcileBanner";

function makeInvalidValidation(
  overflow: number,
): BudgetPlanValidationResult {
  return {
    valid: false,
    takeHome: 3000,
    totalPlanned: 3000 + overflow,
    unassigned: 0,
    buckets: {
      needs: {
        bucket: "needs",
        allocated: 1600,
        envelope: 1500,
        freeInBucket: 0,
        overflow: 100,
        status: "over",
      },
      wants: {
        bucket: "wants",
        allocated: 900,
        envelope: 900,
        freeInBucket: 0,
        overflow: 0,
        status: "ok",
      },
      savings: {
        bucket: "savings",
        allocated: 600,
        envelope: 600,
        freeInBucket: 0,
        overflow: 0,
        status: "ok",
      },
    },
    violations: [{ type: "L2", bucket: "needs", amount: overflow }],
    lockedObligations: 0,
  };
}

describe("budgetReconcileBanner", () => {
  it("builds bucket-specific banner copy", () => {
    const msg = getReconcileBannerMessage(makeInvalidValidation(70));
    expect(msg).toContain("Needs");
    expect(msg).toContain("70");
  });

  it("shows banner when categories exceed and not dismissed", () => {
    expect(
      shouldShowReconcileBanner({
        validation: makeInvalidValidation(70),
      }),
    ).toBe(true);
  });

  it("hides banner when only fixed costs exceed take-home (L4)", () => {
    const l4Only: BudgetPlanValidationResult = {
      valid: false,
      takeHome: 2000,
      totalPlanned: 1800,
      unassigned: 200,
      buckets: {
        needs: {
          bucket: "needs",
          allocated: 1000,
          envelope: 1000,
          freeInBucket: 0,
          overflow: 0,
          status: "ok",
        },
        wants: {
          bucket: "wants",
          allocated: 500,
          envelope: 600,
          freeInBucket: 100,
          overflow: 0,
          status: "under",
        },
        savings: {
          bucket: "savings",
          allocated: 300,
          envelope: 400,
          freeInBucket: 100,
          overflow: 0,
          status: "under",
        },
      },
      violations: [{ type: "L4", amount: 500 }],
      lockedObligations: 2500,
    };
    expect(
      shouldShowReconcileBanner({
        validation: l4Only,
      }),
    ).toBe(false);
  });

  it("hides banner after dismiss until violation worsens materially", () => {
    const validation = makeInvalidValidation(70);
    expect(
      shouldShowReconcileBanner({
        validation,
        dismissedAt: new Date().toISOString(),
        dismissedOverflow: 70,
      }),
    ).toBe(false);

    const worse = makeInvalidValidation(130);
    expect(
      shouldShowReconcileBanner({
        validation: worse,
        dismissedAt: new Date().toISOString(),
        dismissedOverflow: 70,
      }),
    ).toBe(true);
    expect(getPlanViolationOverflow(worse)).toBe(130);
  });
});
