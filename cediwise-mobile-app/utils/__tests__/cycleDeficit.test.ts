import type { BudgetTransaction } from "../../types/budget";
import {
  computeCycleDeficit,
  getDeficitResolutions,
  getResolutionForCycle,
  saveDeficitResolution,
} from "../cycleDeficit";

function makeTx(
  cycleId: string,
  amount: number,
  overrides?: Partial<BudgetTransaction>
): BudgetTransaction {
  return {
    id: `tx-${Math.random()}`,
    userId: "u1",
    cycleId,
    bucket: "needs",
    amount,
    occurredAt: new Date().toISOString(),
    source: "manual",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("computeCycleDeficit", () => {
  it("returns null when total spent is within income", () => {
    const transactions = [makeTx("c1", 300), makeTx("c1", 200)];
    const result = computeCycleDeficit({
      cycleId: "c1",
      transactions,
      monthlyNetIncome: 1000,
    });
    expect(result).toBeNull();
  });

  it("returns null when total spent equals income", () => {
    const transactions = [makeTx("c1", 500), makeTx("c1", 500)];
    const result = computeCycleDeficit({
      cycleId: "c1",
      transactions,
      monthlyNetIncome: 1000,
    });
    expect(result).toBeNull();
  });

  it("returns deficit when total spent exceeds income", () => {
    const transactions = [makeTx("c1", 700), makeTx("c1", 500)];
    const result = computeCycleDeficit({
      cycleId: "c1",
      transactions,
      monthlyNetIncome: 1000,
    });
    expect(result).not.toBeNull();
    expect(result!.deficitAmount).toBe(200);
    expect(result!.totalSpent).toBe(1200);
    expect(result!.monthlyNetIncome).toBe(1000);
    expect(result!.cycleId).toBe("c1");
  });

  it("returns null when monthlyNetIncome is 0", () => {
    const transactions = [makeTx("c1", 100)];
    const result = computeCycleDeficit({
      cycleId: "c1",
      transactions,
      monthlyNetIncome: 0,
    });
    expect(result).toBeNull();
  });

  it("returns null when monthlyNetIncome is negative", () => {
    const transactions = [makeTx("c1", 100)];
    const result = computeCycleDeficit({
      cycleId: "c1",
      transactions,
      monthlyNetIncome: -500,
    });
    expect(result).toBeNull();
  });

  it("only includes transactions for the specified cycle", () => {
    const transactions = [
      makeTx("c1", 800),
      makeTx("c2", 500), // different cycle
    ];
    const result = computeCycleDeficit({
      cycleId: "c1",
      transactions,
      monthlyNetIncome: 1000,
    });
    expect(result).toBeNull(); // only 800 for c1, within 1000
  });

  it("returns null for empty transaction list", () => {
    const result = computeCycleDeficit({
      cycleId: "c1",
      transactions: [],
      monthlyNetIncome: 1000,
    });
    expect(result).toBeNull();
  });

  it("uses budgetBaseline when higher than spent still null", () => {
    const transactions = [makeTx("c1", 400)];
    const result = computeCycleDeficit({
      cycleId: "c1",
      transactions,
      monthlyNetIncome: 1000,
      budgetBaseline: 500,
    });
    expect(result).toBeNull();
  });

  it("flags deficit against disposable baseline", () => {
    const transactions = [makeTx("c1", 600)];
    const result = computeCycleDeficit({
      cycleId: "c1",
      transactions,
      monthlyNetIncome: 1000,
      budgetBaseline: 500,
    });
    expect(result).not.toBeNull();
    expect(result!.deficitAmount).toBe(100);
  });
});

describe("deficit resolution storage", () => {
  beforeEach(async () => {
    // Clear storage via the mock
    const AsyncStorage = require("@react-native-async-storage/async-storage");
    await AsyncStorage.clear();
  });

  it("returns empty array when no resolutions exist", async () => {
    const resolutions = await getDeficitResolutions("user1");
    expect(resolutions).toEqual([]);
  });

  it("saves and retrieves a deficit resolution", async () => {
    await saveDeficitResolution("user1", {
      cycleId: "cycle1",
      choice: "financed",
      debtId: "debt1",
    });

    const resolutions = await getDeficitResolutions("user1");
    expect(resolutions).toHaveLength(1);
    expect(resolutions[0].cycleId).toBe("cycle1");
    expect(resolutions[0].choice).toBe("financed");
    expect(resolutions[0].debtId).toBe("debt1");
    expect(resolutions[0].resolvedAt).toBeDefined();
  });

  it("retrieves resolution for specific cycle", async () => {
    await saveDeficitResolution("user1", {
      cycleId: "cycle1",
      choice: "financed",
    });
    await saveDeficitResolution("user1", {
      cycleId: "cycle2",
      choice: "dismissed",
    });

    const res = await getResolutionForCycle("user1", "cycle2");
    expect(res).not.toBeNull();
    expect(res!.choice).toBe("dismissed");
  });

  it("returns null for non-existent cycle resolution", async () => {
    const res = await getResolutionForCycle("user1", "nonexistent");
    expect(res).toBeNull();
  });

  it("overwrites existing resolution for same cycle", async () => {
    await saveDeficitResolution("user1", {
      cycleId: "cycle1",
      choice: "financed",
    });
    await saveDeficitResolution("user1", {
      cycleId: "cycle1",
      choice: "covered_by_savings",
    });

    const resolutions = await getDeficitResolutions("user1");
    expect(resolutions).toHaveLength(1);
    expect(resolutions[0].choice).toBe("covered_by_savings");
  });
});
