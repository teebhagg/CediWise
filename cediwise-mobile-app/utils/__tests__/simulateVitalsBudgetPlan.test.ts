import { simulateVitalsBudgetPlan } from "../simulateVitalsBudgetPlan";

describe("simulateVitalsBudgetPlan", () => {
  it("fails when AI fixed Needs exceed bucket envelope (regression)", () => {
    const result = simulateVitalsBudgetPlan({
      takeHome: 3000,
      needsPct: 0.5,
      wantsPct: 0.3,
      savingsPct: 0.2,
      categories: [
        { name: "Rent", bucket: "needs", limit: 2200 },
        { name: "Others", bucket: "wants", limit: 0 },
      ],
    });

    expect(result.valid).toBe(false);
    expect(
      result.overflows.length > 0 ||
        result.validation.violations.some((v) => v.type === "L2"),
    ).toBe(true);
  });

  it("passes for modest fixed obligations within envelopes", () => {
    const result = simulateVitalsBudgetPlan({
      takeHome: 3000,
      needsPct: 0.5,
      wantsPct: 0.3,
      savingsPct: 0.2,
      categories: [
        { name: "Rent", bucket: "needs", limit: 1200 },
        { name: "Transport", bucket: "needs", limit: 200 },
      ],
    });

    expect(result.valid).toBe(true);
    expect(result.totalPlanned).toBeLessThanOrEqual(3000);
  });
});
