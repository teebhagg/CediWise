/** @jest-environment node */

/**
 * Tests for stores/vaultStore.ts — init, refresh, rollover deposit, initial balance,
 * logout race, and backfill idempotency.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { BudgetCycle, BudgetState, BudgetTransaction } from "@/types/budget";
import { computeVaultTotal } from "@/utils/vaultCalculator";
import { useBudgetStore } from "../budgetStore";
import { useRecurringExpensesStore } from "../recurringExpensesStore";
import { useVaultStore } from "../vaultStore";

const mockEnqueueMutation = jest.fn();
const mockFlushUntil = jest.fn().mockResolvedValue({ ok: true });

jest.mock("@/utils/budgetStorage", () => {
  const actual = jest.requireActual<typeof import("@/utils/budgetStorage")>(
    "@/utils/budgetStorage",
  );
  return {
    ...actual,
    enqueueMutation: (...args: unknown[]) => mockEnqueueMutation(...args),
  };
});

jest.mock("@/utils/budgetSync", () => ({
  flushBudgetQueueUntilMutationIdsCleared: (...args: unknown[]) =>
    mockFlushUntil(...args),
}));

jest.mock("@/utils/incomeCalculations", () => ({
  getMonthlyDisposableIncome: jest.fn(() => ({
    netIncome: 3000,
    totalRecurringMonthly: 0,
    disposableIncome: 3000,
  })),
}));

let mockSupabase: { from: jest.Mock } | null = null;

jest.mock("@/utils/supabase", () => ({
  get supabase() {
    return mockSupabase;
  },
}));

const CACHE_PREFIX = "@cediwise_vault_deposits:";

function cacheKey(userId: string) {
  return `${CACHE_PREFIX}${userId}`;
}

function makeDeferred() {
  let resolve!: (v: {
    data: Record<string, unknown>[] | null;
    error: null | { message: string };
  }) => void;
  const promise = new Promise<{
    data: Record<string, unknown>[] | null;
    error: null | { message: string };
  }>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function buildVaultSupabaseMock(
  resolveWith: { data: Record<string, unknown>[] | null; error: null | { message: string } },
  deferred?: { promise: Promise<typeof resolveWith> },
) {
  const result = deferred ? deferred.promise : Promise.resolve(resolveWith);
  const order = jest.fn().mockReturnValue(result);
  const eq = jest.fn().mockReturnValue({ order });
  const select = jest.fn().mockReturnValue({ eq });
  const from = jest.fn().mockReturnValue({ select });
  return { from };
}

function cycleBase(overrides: Partial<BudgetCycle> & Pick<BudgetCycle, "id" | "startDate" | "endDate">): BudgetCycle {
  return {
    userId: "user-1",
    paydayDay: 1,
    needsPct: 0.5,
    wantsPct: 0.3,
    savingsPct: 0.2,
    rolloverFromPrevious: { needs: 0, wants: 0, savings: 0 },
    reallocationApplied: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function tx(
  partial: Partial<BudgetTransaction> & Pick<BudgetTransaction, "id" | "cycleId" | "amount">,
): BudgetTransaction {
  return {
    source: "manual",
    userId: partial.userId ?? "user-1",
    cycleId: partial.cycleId,
    bucket: partial.bucket ?? "needs",
    categoryId: partial.categoryId,
    amount: partial.amount,
    note: partial.note,
    occurredAt: partial.occurredAt ?? "2026-05-15T12:00:00.000Z",
    createdAt: partial.createdAt ?? "2026-05-15T12:00:00.000Z",
    debtId: partial.debtId,
    id: partial.id,
  };
}

function budgetStateWithCycles(
  cycles: BudgetCycle[],
  transactions: BudgetTransaction[],
): BudgetState {
  return {
    version: 1,
    userId: "user-1",
    prefs: { paydayDay: 1 },
    incomeSources: [],
    cycles,
    categories: [],
    transactions,
    updatedAt: "2026-06-01T00:00:00.000Z",
  };
}

afterEach(() => {
  jest.useRealTimers();
});

beforeEach(async () => {
  jest.useRealTimers();
  mockSupabase = null;
  mockEnqueueMutation.mockReset();
  mockEnqueueMutation.mockImplementation(async (_userId: string, mut: any) => ({
    ...mut,
    retryCount: 0,
  }));
  mockFlushUntil.mockClear();
  mockFlushUntil.mockResolvedValue({ ok: true });
  await AsyncStorage.clear();
  useVaultStore.setState({
    userId: null,
    deposits: [],
    summary: null,
    isLoading: false,
    lastSyncedAt: null,
    logoutEpoch: 0,
  });
  useBudgetStore.setState({
    userId: null,
    state: null,
    queue: null,
    isLoading: false,
    isSyncing: false,
    lastSyncRunEndedAt: null,
    retryIn: null,
  });
  useRecurringExpensesStore.setState({
    userId: null,
    recurringExpenses: [],
    isLoading: false,
    error: null,
    budgetQueueFlushError: null,
  });
});

describe("vaultStore.initForUser(null)", () => {
  it("clears vault state and increments logoutEpoch", async () => {
    useVaultStore.setState({
      userId: "user-A",
      deposits: [
        {
          id: "d1",
          userId: "user-A",
          source: "initial",
          amount: 100,
          sourceCycleId: null,
          note: null,
          depositedAt: "2026-01-01T00:00:00.000Z",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      summary: computeVaultTotal([]),
      isLoading: false,
      lastSyncedAt: "2026-01-02T00:00:00.000Z",
      logoutEpoch: 2,
    });

    await useVaultStore.getState().initForUser(null);

    const s = useVaultStore.getState();
    expect(s.userId).toBeNull();
    expect(s.deposits).toEqual([]);
    expect(s.summary).toBeNull();
    expect(s.isLoading).toBe(false);
    expect(s.logoutEpoch).toBe(3);
  });
});

describe("vaultStore.initForUser — cache and remote", () => {
  it("uses AsyncStorage cache when supabase is null", async () => {
    const cached = [
      {
        id: "d-cache",
        userId: "user-B",
        source: "initial" as const,
        amount: 250,
        sourceCycleId: null,
        note: null,
        depositedAt: "2026-03-01T00:00:00.000Z",
        createdAt: "2026-03-01T00:00:00.000Z",
      },
    ];
    await AsyncStorage.setItem(cacheKey("user-B"), JSON.stringify(cached));

    await useVaultStore.getState().initForUser("user-B");

    const s = useVaultStore.getState();
    expect(s.deposits).toHaveLength(1);
    expect(s.deposits[0].amount).toBe(250);
    expect(s.summary?.totalBalance).toBe(250);
    expect(s.isLoading).toBe(false);
  });

  it("prefers remote rows over cache when supabase returns data", async () => {
    await AsyncStorage.setItem(
      cacheKey("user-C"),
      JSON.stringify([
        {
          id: "old",
          userId: "user-C",
          source: "initial",
          amount: 1,
          sourceCycleId: null,
          note: null,
          depositedAt: "2026-01-01T00:00:00.000Z",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ]),
    );

    mockSupabase = buildVaultSupabaseMock({
      data: [
        {
          id: "remote-1",
          user_id: "user-C",
          source: "initial",
          amount: 999,
          source_cycle_id: null,
          note: null,
          deposited_at: "2026-02-01T00:00:00.000Z",
          created_at: "2026-02-01T00:00:00.000Z",
        },
      ],
      error: null,
    });

    await useVaultStore.getState().initForUser("user-C");

    expect(useVaultStore.getState().deposits[0].amount).toBe(999);
    expect(useVaultStore.getState().summary?.totalBalance).toBe(999);
  });
});

describe("vaultStore.addCycleRolloverDeposit", () => {
  it("inserts optimistically, enqueues sync, and ignores duplicate cycle", async () => {
    useVaultStore.setState({
      userId: "user-1",
      deposits: [],
      summary: computeVaultTotal([]),
      isLoading: false,
      lastSyncedAt: null,
      logoutEpoch: 0,
    });

    await useVaultStore.getState().addCycleRolloverDeposit({
      userId: "user-1",
      sourceCycleId: "cycle-x",
      amount: 150,
    });

    expect(useVaultStore.getState().deposits).toHaveLength(1);
    expect(useVaultStore.getState().summary?.totalFromRollovers).toBe(150);
    expect(mockEnqueueMutation).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ kind: "insert_vault_deposit" }),
    );
    expect(mockFlushUntil).toHaveBeenCalled();

    mockEnqueueMutation.mockClear();
    await useVaultStore.getState().addCycleRolloverDeposit({
      userId: "user-1",
      sourceCycleId: "cycle-x",
      amount: 200,
    });
    expect(mockEnqueueMutation).not.toHaveBeenCalled();
    expect(useVaultStore.getState().deposits).toHaveLength(1);
  });

  it("ignores when store userId does not match", async () => {
    useVaultStore.setState({
      userId: "user-1",
      deposits: [],
      summary: computeVaultTotal([]),
      isLoading: false,
      lastSyncedAt: null,
      logoutEpoch: 0,
    });

    await useVaultStore.getState().addCycleRolloverDeposit({
      userId: "other",
      sourceCycleId: "c1",
      amount: 50,
    });

    expect(useVaultStore.getState().deposits).toHaveLength(0);
    expect(mockEnqueueMutation).not.toHaveBeenCalled();
  });
});

describe("vaultStore.setInitialBalance", () => {
  it("creates initial deposit then updates same row on second save", async () => {
    useVaultStore.setState({
      userId: "user-1",
      deposits: [],
      summary: computeVaultTotal([]),
      isLoading: false,
      lastSyncedAt: null,
      logoutEpoch: 0,
    });

    await useVaultStore.getState().setInitialBalance(1000);
    expect(useVaultStore.getState().deposits.filter((d) => d.source === "initial")).toHaveLength(1);
    expect(useVaultStore.getState().summary?.initialBalance).toBe(1000);
    expect(mockEnqueueMutation).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ kind: "upsert_profile" }),
    );
    expect(mockEnqueueMutation).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ kind: "insert_vault_deposit" }),
    );

    const initialId = useVaultStore.getState().deposits.find((d) => d.source === "initial")!.id;
    mockEnqueueMutation.mockClear();

    await useVaultStore.getState().setInitialBalance(750);
    const after = useVaultStore.getState().deposits.find((d) => d.source === "initial");
    expect(after?.id).toBe(initialId);
    expect(after?.amount).toBe(750);
    expect(mockEnqueueMutation).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ kind: "update_vault_deposit" }),
    );
  });
});

describe("vaultStore.setInitialBalance — flush failure", () => {
  it("throws and restores deposits when sync fails", async () => {
    mockFlushUntil.mockResolvedValue({ ok: false, error: "network down" });
    const initialRow = {
      id: "init-1",
      userId: "user-1",
      source: "initial" as const,
      amount: 100,
      sourceCycleId: null,
      note: null,
      depositedAt: "2026-01-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    useVaultStore.setState({
      userId: "user-1",
      deposits: [initialRow],
      summary: computeVaultTotal([initialRow]),
      isLoading: false,
      lastSyncedAt: null,
      logoutEpoch: 0,
    });

    await expect(useVaultStore.getState().setInitialBalance(500)).rejects.toThrow(
      "network down",
    );
    expect(useVaultStore.getState().deposits[0].amount).toBe(100);
  });
});

describe("vaultStore.addCycleRolloverDeposit — flush failure", () => {
  it("rolls back optimistic deposit when sync fails", async () => {
    mockFlushUntil.mockResolvedValue({ ok: false, error: "write failed" });
    useVaultStore.setState({
      userId: "user-1",
      deposits: [],
      summary: computeVaultTotal([]),
      isLoading: false,
      lastSyncedAt: null,
      logoutEpoch: 0,
    });

    await useVaultStore.getState().addCycleRolloverDeposit({
      userId: "user-1",
      sourceCycleId: "cycle-z",
      amount: 42,
    });

    expect(useVaultStore.getState().deposits).toHaveLength(0);
    expect(mockEnqueueMutation).toHaveBeenCalled();
  });
});

describe("vaultStore.refreshFromRemote", () => {
  it("replaces local deposits when remote returns rows", async () => {
    useVaultStore.setState({
      userId: "user-1",
      deposits: [],
      summary: computeVaultTotal([]),
      isLoading: false,
      lastSyncedAt: null,
      logoutEpoch: 0,
    });

    mockSupabase = buildVaultSupabaseMock({
      data: [
        {
          id: "r1",
          user_id: "user-1",
          source: "cycle_rollover",
          amount: 88,
          source_cycle_id: "c1",
          note: null,
          deposited_at: "2026-04-10T00:00:00.000Z",
          created_at: "2026-04-10T00:00:00.000Z",
        },
      ],
      error: null,
    });

    await useVaultStore.getState().refreshFromRemote();
    expect(useVaultStore.getState().deposits).toHaveLength(1);
    expect(useVaultStore.getState().summary?.totalFromRollovers).toBe(88);
  });
});

describe("vaultStore logout race", () => {
  it("does not apply remote init after resetForLogout bumped epoch", async () => {
    const deferred = makeDeferred();
    mockSupabase = buildVaultSupabaseMock({ data: [], error: null }, deferred);

    jest.useFakeTimers({ now: new Date("2026-06-15T12:00:00.000Z") });

    const active = cycleBase({
      id: "cycle-active",
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });
    const ended = cycleBase({
      id: "cycle-ended",
      startDate: "2026-05-01",
      endDate: "2026-05-31",
    });
    useBudgetStore.setState({
      state: budgetStateWithCycles(
        [active, ended],
        [tx({ id: "t1", cycleId: "cycle-ended", amount: 500 })],
      ),
    });

    const p = useVaultStore.getState().initForUser("user-1");
    useVaultStore.getState().resetForLogout();
    deferred.resolve({
      data: [
        {
          id: "stale",
          user_id: "user-1",
          source: "initial",
          amount: 99999,
          source_cycle_id: null,
          note: null,
          deposited_at: "2026-01-01T00:00:00.000Z",
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      error: null,
    });
    await p;

    const s = useVaultStore.getState();
    expect(s.userId).toBeNull();
    expect(s.deposits).toEqual([]);
  });
});

describe("vaultStore backfill idempotency", () => {
  it("second init does not enqueue duplicate rollover for same ended cycle", async () => {
    jest.useFakeTimers({ now: new Date("2026-06-15T12:00:00.000Z") });
    mockSupabase = buildVaultSupabaseMock({ data: [], error: null });

    const active = cycleBase({
      id: "cycle-active",
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });
    const ended = cycleBase({
      id: "cycle-ended",
      startDate: "2026-05-01",
      endDate: "2026-05-31",
    });
    useBudgetStore.setState({
      state: budgetStateWithCycles(
        [active, ended],
        [tx({ id: "t1", cycleId: "cycle-ended", amount: 500 })],
      ),
    });

    await useVaultStore.getState().initForUser("user-1");
    const insertCalls = mockEnqueueMutation.mock.calls.filter(
      (c) => (c[1] as { kind: string }).kind === "insert_vault_deposit",
    );
    expect(insertCalls.length).toBeGreaterThanOrEqual(1);
    const rolloverInserts = insertCalls.filter(
      (c) =>
        (c[1] as { payload: { source?: string } }).payload?.source === "cycle_rollover",
    );
    expect(rolloverInserts.length).toBe(1);

    mockEnqueueMutation.mockClear();
    await useVaultStore.getState().initForUser("user-1");
    const after = mockEnqueueMutation.mock.calls.filter(
      (c) => (c[1] as { kind: string }).kind === "insert_vault_deposit",
    );
    expect(after.length).toBe(0);
  });
});
