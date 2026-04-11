import type { BudgetCycle, BudgetTransaction, VaultDeposit } from "@/types/budget";
import {
  buildSparklineData,
  computeCycleRolloverDeposit,
  computeVaultTotal,
  isCycleEnded,
  sortDepositsChronologically,
  sortDepositsVaultLedgerOrder,
  validateVaultIntegrity,
} from "../vaultCalculator";

function dep(
  overrides: Partial<VaultDeposit> & Pick<VaultDeposit, "id" | "source" | "amount" | "depositedAt">,
): VaultDeposit {
  return {
    userId: "u1",
    sourceCycleId: null,
    note: null,
    createdAt: overrides.depositedAt,
    ...overrides,
  };
}

describe("computeVaultTotal", () => {
  it("returns zero for empty deposits", () => {
    const s = computeVaultTotal([]);
    expect(s.totalBalance).toBe(0);
    expect(s.initialBalance).toBe(0);
    expect(s.totalFromRollovers).toBe(0);
    expect(s.sparklinePoints).toEqual([]);
    expect(s.lastDepositAt).toBeNull();
  });

  it("sums initial and rollover and builds cumulative sparkline", () => {
    const deposits = [
      dep({
        id: "1",
        source: "initial",
        amount: 1000,
        depositedAt: "2025-01-01T10:00:00.000Z",
      }),
      dep({
        id: "2",
        source: "cycle_rollover",
        amount: 500,
        depositedAt: "2025-02-01T10:00:00.000Z",
        sourceCycleId: "c1",
      }),
    ];
    const s = computeVaultTotal(deposits);
    expect(s.totalBalance).toBe(1500);
    expect(s.initialBalance).toBe(1000);
    expect(s.totalFromRollovers).toBe(500);
    expect(s.sparklinePoints.map((p) => p.cumulativeTotal)).toEqual([1000, 1500]);
  });

  it("orders initial before rollovers even when initial is dated later", () => {
    const deposits = [
      dep({
        id: "rol",
        source: "cycle_rollover",
        amount: 100,
        depositedAt: "2025-01-01T10:00:00.000Z",
        sourceCycleId: "c1",
      }),
      dep({
        id: "ini",
        source: "initial",
        amount: 1000,
        depositedAt: "2025-06-01T10:00:00.000Z",
      }),
    ];
    const s = computeVaultTotal(deposits);
    expect(s.sparklinePoints.map((p) => p.cumulativeTotal)).toEqual([1000, 1100]);
    expect(s.deposits[0].source).toBe("initial");
    expect(s.deposits[1].source).toBe("cycle_rollover");
  });

  it("excludes future-dated deposits from totals", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const deposits = [
      dep({
        id: "1",
        source: "initial",
        amount: 100,
        depositedAt: "2020-01-01T00:00:00.000Z",
      }),
      dep({
        id: "2",
        source: "cycle_rollover",
        amount: 999,
        depositedAt: future.toISOString(),
        sourceCycleId: "c1",
      }),
    ];
    const s = computeVaultTotal(deposits);
    expect(s.totalBalance).toBe(100);
    expect(s.totalFromRollovers).toBe(0);
  });

  it("handles zero-amount deposits", () => {
    const s = computeVaultTotal([
      dep({
        id: "1",
        source: "initial",
        amount: 0,
        depositedAt: "2025-01-01T00:00:00.000Z",
      }),
    ]);
    expect(s.totalBalance).toBe(0);
  });

  it("handles very large amounts without obvious drift", () => {
    const big = 100_000_000;
    const s = computeVaultTotal([
      dep({
        id: "1",
        source: "initial",
        amount: big,
        depositedAt: "2025-01-01T00:00:00.000Z",
      }),
      dep({
        id: "2",
        source: "cycle_rollover",
        amount: 0.01,
        depositedAt: "2025-02-01T00:00:00.000Z",
        sourceCycleId: "c1",
      }),
    ]);
    expect(s.totalBalance).toBe(big + 0.01);
  });
});

describe("sortDepositsVaultLedgerOrder", () => {
  it("sorts initial rows by depositedAt then id", () => {
    const a = [
      dep({ id: "b", source: "initial", amount: 1, depositedAt: "2025-01-02T00:00:00.000Z" }),
      dep({ id: "a", source: "initial", amount: 1, depositedAt: "2025-01-01T00:00:00.000Z" }),
    ];
    const s = sortDepositsVaultLedgerOrder(a);
    expect(s.map((d) => d.id)).toEqual(["a", "b"]);
  });

  it("places all initial deposits before any cycle_rollover", () => {
    const a = [
      dep({
        id: "rol",
        source: "cycle_rollover",
        amount: 50,
        depositedAt: "2025-01-01T00:00:00.000Z",
        sourceCycleId: "c1",
      }),
      dep({ id: "ini", source: "initial", amount: 200, depositedAt: "2025-12-01T00:00:00.000Z" }),
    ];
    const s = sortDepositsVaultLedgerOrder(a);
    expect(s.map((d) => d.id)).toEqual(["ini", "rol"]);
  });

  it("matches sortDepositsChronologically alias", () => {
    const a = [
      dep({ id: "b", source: "initial", amount: 1, depositedAt: "2025-01-02T00:00:00.000Z" }),
      dep({ id: "a", source: "initial", amount: 1, depositedAt: "2025-01-01T00:00:00.000Z" }),
    ];
    expect(sortDepositsChronologically(a).map((d) => d.id)).toEqual(
      sortDepositsVaultLedgerOrder(a).map((d) => d.id),
    );
  });
});

describe("computeCycleRolloverDeposit", () => {
  const mkTx = (cycleId: string, bucket: BudgetTransaction["bucket"], amount: number): BudgetTransaction => ({
    id: `tx-${cycleId}-${amount}`,
    userId: "u1",
    cycleId,
    bucket,
    amount,
    occurredAt: "2025-01-15T00:00:00.000Z",
    source: "manual",
    createdAt: "2025-01-15T00:00:00.000Z",
  });

  it("returns null for empty cycleId", () => {
    expect(computeCycleRolloverDeposit("", [], 3000)).toBeNull();
  });

  it("returns null when disposableIncome <= 0", () => {
    expect(computeCycleRolloverDeposit("c1", [mkTx("c1", "needs", 100)], 0)).toBeNull();
    expect(computeCycleRolloverDeposit("c1", [], -1)).toBeNull();
  });

  it("returns null when totalSpent >= disposableIncome", () => {
    const txs = [mkTx("c1", "needs", 2000), mkTx("c1", "wants", 1000)];
    expect(computeCycleRolloverDeposit("c1", txs, 3000)).toBeNull();
  });

  it("returns null on deficit", () => {
    const txs = [mkTx("c1", "needs", 2500), mkTx("c1", "wants", 600)];
    expect(computeCycleRolloverDeposit("c1", txs, 3000)).toBeNull();
  });

  it("returns full disposable when nothing spent", () => {
    expect(computeCycleRolloverDeposit("c1", [], 3000)).toEqual({ amount: 3000 });
  });

  it("cross-bucket: needs over, wants under, savings untouched -> net surplus", () => {
    const txs = [
      mkTx("c1", "needs", 1800),
      mkTx("c1", "wants", 700),
      mkTx("c1", "savings", 0),
    ];
    expect(computeCycleRolloverDeposit("c1", txs, 3000)).toEqual({ amount: 500 });
  });

  it("cross-bucket: needs over 250, wants under 200", () => {
    const txs = [mkTx("c1", "needs", 1750), mkTx("c1", "wants", 700)];
    expect(computeCycleRolloverDeposit("c1", txs, 3000)).toEqual({ amount: 550 });
  });

  it("deficit when overspend exceeds buffer", () => {
    const txs = [
      mkTx("c1", "needs", 2300),
      mkTx("c1", "wants", 1200),
    ];
    expect(computeCycleRolloverDeposit("c1", txs, 3000)).toBeNull();
  });

  it("savings transactions count as spend", () => {
    const txs = [mkTx("c1", "savings", 200), mkTx("c1", "needs", 2800)];
    expect(computeCycleRolloverDeposit("c1", txs, 3000)).toBeNull();
  });

  it("ignores transactions from other cycles", () => {
    const txs = [mkTx("c2", "needs", 9999)];
    expect(computeCycleRolloverDeposit("c1", txs, 3000)).toEqual({ amount: 3000 });
  });
});

describe("buildSparklineData", () => {
  it("returns [] for months <= 0", () => {
    expect(buildSparklineData([], 0, new Date("2025-06-15"))).toEqual([]);
    expect(buildSparklineData([], -1, new Date("2025-06-15"))).toEqual([]);
  });

  it("aggregates by month with carry-forward cumulative", () => {
    const deposits = [
      dep({
        id: "1",
        source: "cycle_rollover",
        amount: 100,
        depositedAt: "2025-04-10T00:00:00.000Z",
        sourceCycleId: "c1",
      }),
      dep({
        id: "2",
        source: "cycle_rollover",
        amount: 50,
        depositedAt: "2025-05-20T00:00:00.000Z",
        sourceCycleId: "c2",
      }),
    ];
    const now = new Date("2025-05-25T12:00:00.000Z");
    const points = buildSparklineData(deposits, 3, now);
    expect(points.length).toBe(3);
    expect(points[0].cumulativeTotal).toBe(0);
    expect(points[1].cumulativeTotal).toBe(100);
    expect(points[2].cumulativeTotal).toBe(150);
  });

  it("excludes future deposits", () => {
    const future = new Date("2030-01-01T00:00:00.000Z");
    const deposits = [
      dep({
        id: "1",
        source: "initial",
        amount: 500,
        depositedAt: future.toISOString(),
      }),
    ];
    const points = buildSparklineData(deposits, 2, new Date("2025-01-15"));
    expect(points.every((p) => p.cumulativeTotal === 0)).toBe(true);
  });
});

describe("validateVaultIntegrity", () => {
  const cycle = (id: string): BudgetCycle => ({
    id,
    userId: "u1",
    startDate: "2025-01-01",
    endDate: "2025-01-31",
    paydayDay: 25,
    needsPct: 0.5,
    wantsPct: 0.3,
    savingsPct: 0.2,
    rolloverFromPrevious: { needs: 0, wants: 0, savings: 0 },
    reallocationApplied: false,
    createdAt: "",
    updatedAt: "",
  });

  it("flags duplicate cycle deposits", () => {
    const deposits = [
      dep({
        id: "a",
        source: "cycle_rollover",
        amount: 10,
        depositedAt: "2025-02-01T00:00:00.000Z",
        sourceCycleId: "c1",
      }),
      dep({
        id: "b",
        source: "cycle_rollover",
        amount: 10,
        depositedAt: "2025-02-02T00:00:00.000Z",
        sourceCycleId: "c1",
      }),
    ];
    const r = validateVaultIntegrity(deposits, [cycle("c1")], { c1: 3000 });
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.code === "duplicate_cycle_deposit")).toBe(true);
  });

  it("flags unknown cycle", () => {
    const deposits = [
      dep({
        id: "a",
        source: "cycle_rollover",
        amount: 10,
        depositedAt: "2025-02-01T00:00:00.000Z",
        sourceCycleId: "missing",
      }),
    ];
    const r = validateVaultIntegrity(deposits, [], {});
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.code === "unknown_cycle")).toBe(true);
  });

  it("flags amount exceeding disposable cap", () => {
    const deposits = [
      dep({
        id: "a",
        source: "cycle_rollover",
        amount: 5000,
        depositedAt: "2025-02-01T00:00:00.000Z",
        sourceCycleId: "c1",
      }),
    ];
    const r = validateVaultIntegrity(deposits, [cycle("c1")], { c1: 100 });
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.code === "amount_exceeds_disposable")).toBe(true);
  });
});

describe("isCycleEnded", () => {
  it("returns false before end of endDate", () => {
    const c: BudgetCycle = {
      id: "c1",
      userId: "u1",
      startDate: "2025-01-01",
      endDate: "2025-01-31",
      paydayDay: 25,
      needsPct: 1,
      wantsPct: 0,
      savingsPct: 0,
      rolloverFromPrevious: { needs: 0, wants: 0, savings: 0 },
      reallocationApplied: false,
      createdAt: "",
      updatedAt: "",
    };
    expect(isCycleEnded(c, new Date("2025-01-31T12:00:00"))).toBe(false);
    expect(isCycleEnded(c, new Date("2025-02-01T00:00:00"))).toBe(true);
  });
});
