import { buildBudgetCycleFingerprint } from "@/calculators/aiContextBuilder";
import type { BudgetState } from "@/types/budget";

const baseUser = "user-1";

function makeState(
  partial: Partial<BudgetState> & Pick<BudgetState, "categories" | "transactions">,
): BudgetState {
  return {
    version: 1,
    userId: baseUser,
    prefs: {},
    incomeSources: [],
    cycles: [],
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("buildBudgetCycleFingerprint", () => {
  it("returns empty when cycle id missing", () => {
    expect(buildBudgetCycleFingerprint({ cycleId: null, state: null })).toBe(
      "",
    );
  });

  it("is stable for the same category limits and spent aggregates", () => {
    const cycleId = "c1";
    const state = makeState({
      categories: [
        {
          id: "cat-b",
          userId: baseUser,
          cycleId,
          bucket: "needs",
          name: "B",
          limitAmount: 100,
          isCustom: false,
          sortOrder: 0,
          isArchived: false,
          manualOverride: false,
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
        },
        {
          id: "cat-a",
          userId: baseUser,
          cycleId,
          bucket: "needs",
          name: "A",
          limitAmount: 200,
          isCustom: false,
          sortOrder: 1,
          isArchived: false,
          manualOverride: false,
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
        },
      ],
      transactions: [
        {
          id: "t1",
          userId: baseUser,
          cycleId,
          bucket: "needs",
          categoryId: "cat-a",
          amount: 10,
          occurredAt: "2026-01-02",
          source: "manual",
          createdAt: "2026-01-02",
        },
      ],
    });
    const a = buildBudgetCycleFingerprint({ cycleId, state });
    const b = buildBudgetCycleFingerprint({
      cycleId,
      state: {
        ...state,
        categories: [...state.categories].reverse(),
        transactions: [...state.transactions],
      },
    });
    expect(a).toBe(b);
    expect(a).toContain("cat-a");
    expect(a).toContain("cat-b");
  });

  it("changes when a category limit changes", () => {
    const cycleId = "c2";
    const cat = {
      id: "cat-1",
      userId: baseUser,
      cycleId,
      bucket: "needs" as const,
      name: "Food",
      limitAmount: 500,
      isCustom: false,
      sortOrder: 0,
      isArchived: false,
      manualOverride: false,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    };
    const tx = {
      id: "t1",
      userId: baseUser,
      cycleId,
      bucket: "needs" as const,
      categoryId: "cat-1",
      amount: 5,
      occurredAt: "2026-01-02",
      source: "manual" as const,
      createdAt: "2026-01-02",
    };
    const s1 = makeState({
      categories: [cat],
      transactions: [tx],
    });
    const s2 = makeState({
      categories: [{ ...cat, limitAmount: 501 }],
      transactions: [tx],
    });
    expect(buildBudgetCycleFingerprint({ cycleId, state: s1 })).not.toBe(
      buildBudgetCycleFingerprint({ cycleId, state: s2 }),
    );
  });
});
