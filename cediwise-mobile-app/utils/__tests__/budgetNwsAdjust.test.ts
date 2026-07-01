import { buildNwsAdjustPreview, normalizeNwsAllocation } from "../budgetNwsAdjust";
import type { IncomeSource } from "../../types/budget";

const income: IncomeSource[] = [
  {
    id: "i1",
    userId: "u1",
    name: "Salary",
    type: "primary",
    amount: 3000,
    applyDeductions: false,
    createdAt: "",
    updatedAt: "",
  },
];

describe("budgetNwsAdjust", () => {
  it("normalizes allocation percentages to sum to 1", () => {
    const n = normalizeNwsAllocation({
      needsPct: 60,
      wantsPct: 30,
      savingsPct: 10,
    });
    expect(n.needsPct + n.wantsPct + n.savingsPct).toBeCloseTo(1, 5);
  });

  it("previews new envelopes for proposed split", () => {
    const preview = buildNwsAdjustPreview({
      cycle: { needsPct: 0.5, wantsPct: 0.3, savingsPct: 0.2 },
      proposed: { needsPct: 0.6, wantsPct: 0.25, savingsPct: 0.15 },
      categories: [
        { bucket: "needs", limitAmount: 1400, manualOverride: false },
        { bucket: "wants", limitAmount: 800, manualOverride: false },
        { bucket: "savings", limitAmount: 500, manualOverride: false },
      ],
      incomeSources: income,
    });
    expect(preview.proposedEnvelopes.needs).toBe(1800);
    expect(preview.proposedEnvelopes.wants).toBe(750);
    expect(preview.proposedEnvelopes.savings).toBe(450);
  });
});
