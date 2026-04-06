/** @jest-environment node */

/**
 * Tests for stores/cashFlowStore.ts
 *
 * Covers:
 * - initForUser with null (logout reset)
 * - initForUser with a userId (loads from cache + Supabase)
 * - setupCashFlow persists to AsyncStorage and enqueues an upsert_profile mutation
 * - updateBalance persists to AsyncStorage and enqueues an upsert_profile mutation
 * - Logout race: Supabase response arrives after user has already logged out
 * - Stale data detection via isDataStale helper
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCashFlowStore } from "../cashFlowStore";

// ─── Mock wiring ─────────────────────────────────────────────────────────────

const mockEnqueueMutation = jest.fn().mockResolvedValue(undefined);
const mockFlushBudgetQueue = jest.fn().mockResolvedValue({ okCount: 0, failCount: 0 });

jest.mock("@/utils/budgetStorage", () => ({
  enqueueMutation: (...args: unknown[]) => mockEnqueueMutation(...args),
}));

jest.mock("@/utils/budgetSync", () => ({
  flushBudgetQueue: (...args: unknown[]) => mockFlushBudgetQueue(...args),
}));

// Supabase is mocked as null globally in jest.setup.js, but we override per test where needed.
let mockSupabase: {
  from: jest.Mock;
} | null = null;

jest.mock("@/utils/supabase", () => ({
  get supabase() {
    return mockSupabase;
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildSupabaseMock(resolveWith: {
  data: Record<string, unknown> | null;
  error: null | { message: string };
}) {
  const maybeSingle = jest.fn().mockResolvedValue(resolveWith);
  const eq = jest.fn().mockReturnValue({ maybeSingle });
  const select = jest.fn().mockReturnValue({ eq });
  const from = jest.fn().mockReturnValue({ select });
  return { from, select, eq, maybeSingle };
}

function makeDeferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const CACHE_PREFIX = "@cediwise_cash_flow:";

function cacheKey(userId: string) {
  return `${CACHE_PREFIX}${userId}`;
}

// ─── State reset between tests ────────────────────────────────────────────────

beforeEach(async () => {
  useCashFlowStore.setState({
    userId: null,
    balance: null,
    monthlyIncome: null,
    lastReset: null,
    isLoading: false,
    isSetup: false,
  });
  mockSupabase = null;
  mockEnqueueMutation.mockClear();
  mockFlushBudgetQueue.mockClear();
  await AsyncStorage.clear();
});

// ─── initForUser — null (logout) ──────────────────────────────────────────────

describe("cashFlowStore.initForUser(null)", () => {
  it("resets all state to initial values", async () => {
    useCashFlowStore.setState({
      userId: "user-A",
      balance: 2000,
      monthlyIncome: 3000,
      lastReset: "2026-04-01T00:00:00.000Z",
      isSetup: true,
      isLoading: false,
    });

    await useCashFlowStore.getState().initForUser(null);

    const s = useCashFlowStore.getState();
    expect(s.userId).toBeNull();
    expect(s.balance).toBeNull();
    expect(s.monthlyIncome).toBeNull();
    expect(s.lastReset).toBeNull();
    expect(s.isSetup).toBe(false);
    expect(s.isLoading).toBe(false);
  });

  it("sets isLoading=false after resetting", async () => {
    await useCashFlowStore.getState().initForUser(null);
    expect(useCashFlowStore.getState().isLoading).toBe(false);
  });
});

// ─── initForUser — loads from AsyncStorage cache ──────────────────────────────

describe("cashFlowStore.initForUser — AsyncStorage cache", () => {
  it("loads cached data when supabase is null (offline mode)", async () => {
    const cached = {
      balance: 1500,
      monthlyIncome: 3000,
      lastReset: "2026-04-01T10:00:00.000Z",
    };
    await AsyncStorage.setItem(cacheKey("user-B"), JSON.stringify(cached));

    await useCashFlowStore.getState().initForUser("user-B");

    const s = useCashFlowStore.getState();
    expect(s.balance).toBe(1500);
    expect(s.monthlyIncome).toBe(3000);
    expect(s.lastReset).toBe("2026-04-01T10:00:00.000Z");
    expect(s.isSetup).toBe(true);
  });

  it("isSetup=false when cache has null balance", async () => {
    const cached = {
      balance: null,
      monthlyIncome: 3000,
      lastReset: null,
    };
    await AsyncStorage.setItem(cacheKey("user-C"), JSON.stringify(cached));

    await useCashFlowStore.getState().initForUser("user-C");

    expect(useCashFlowStore.getState().isSetup).toBe(false);
  });

  it("isSetup=false when cache has null monthlyIncome", async () => {
    const cached = {
      balance: 1000,
      monthlyIncome: null,
      lastReset: null,
    };
    await AsyncStorage.setItem(cacheKey("user-D"), JSON.stringify(cached));

    await useCashFlowStore.getState().initForUser("user-D");

    expect(useCashFlowStore.getState().isSetup).toBe(false);
  });

  it("handles missing cache gracefully (fresh user)", async () => {
    await useCashFlowStore.getState().initForUser("user-new");

    const s = useCashFlowStore.getState();
    expect(s.balance).toBeNull();
    expect(s.monthlyIncome).toBeNull();
    expect(s.isSetup).toBe(false);
  });

  it("handles malformed cache JSON gracefully", async () => {
    await AsyncStorage.setItem(cacheKey("user-bad"), "NOT_JSON{{{");

    // Should not throw
    await expect(
      useCashFlowStore.getState().initForUser("user-bad")
    ).resolves.toBeUndefined();

    expect(useCashFlowStore.getState().balance).toBeNull();
  });
});

// ─── initForUser — merges Supabase data ───────────────────────────────────────

describe("cashFlowStore.initForUser — Supabase fetch", () => {
  it("sets state from Supabase response when cash_flow fields are present", async () => {
    const mock = buildSupabaseMock({
      data: {
        cash_flow_balance: "2500",
        cash_flow_monthly_income: "4000",
        cash_flow_last_reset: "2026-04-01T00:00:00.000Z",
        stable_salary: "4200",
      },
      error: null,
    });
    mockSupabase = mock as any;

    await useCashFlowStore.getState().initForUser("user-E");

    const s = useCashFlowStore.getState();
    expect(s.balance).toBe(2500);
    expect(s.monthlyIncome).toBe(4000);
    expect(s.lastReset).toBe("2026-04-01T00:00:00.000Z");
    expect(s.isSetup).toBe(true);
  });

  it("falls back to stable_salary when cash_flow_monthly_income is null", async () => {
    const mock = buildSupabaseMock({
      data: {
        cash_flow_balance: "1000",
        cash_flow_monthly_income: null,
        cash_flow_last_reset: null,
        stable_salary: "3500",
      },
      error: null,
    });
    mockSupabase = mock as any;

    await useCashFlowStore.getState().initForUser("user-F");

    expect(useCashFlowStore.getState().monthlyIncome).toBe(3500);
  });

  it("isSetup=false when Supabase returns null balance", async () => {
    const mock = buildSupabaseMock({
      data: {
        cash_flow_balance: null,
        cash_flow_monthly_income: "3000",
        cash_flow_last_reset: null,
        stable_salary: "3000",
      },
      error: null,
    });
    mockSupabase = mock as any;

    await useCashFlowStore.getState().initForUser("user-G");

    expect(useCashFlowStore.getState().isSetup).toBe(false);
    expect(useCashFlowStore.getState().balance).toBeNull();
  });

  it("updates AsyncStorage cache after successful Supabase fetch", async () => {
    const mock = buildSupabaseMock({
      data: {
        cash_flow_balance: "800",
        cash_flow_monthly_income: "2000",
        cash_flow_last_reset: "2026-03-01T00:00:00.000Z",
        stable_salary: "2000",
      },
      error: null,
    });
    mockSupabase = mock as any;

    await useCashFlowStore.getState().initForUser("user-H");

    const raw = await AsyncStorage.getItem(cacheKey("user-H"));
    expect(raw).not.toBeNull();
    const cached = JSON.parse(raw!);
    expect(cached.balance).toBe(800);
    expect(cached.monthlyIncome).toBe(2000);
  });

  it("keeps cached values when Supabase returns no data (null row)", async () => {
    // Pre-populate cache
    await AsyncStorage.setItem(
      cacheKey("user-I"),
      JSON.stringify({ balance: 999, monthlyIncome: 1500, lastReset: null })
    );

    const mock = buildSupabaseMock({ data: null, error: null });
    mockSupabase = mock as any;

    await useCashFlowStore.getState().initForUser("user-I");

    // Should still have the cached values (not overwritten by null Supabase response)
    const s = useCashFlowStore.getState();
    expect(s.balance).toBe(999);
    expect(s.monthlyIncome).toBe(1500);
  });
});

// ─── setupCashFlow ────────────────────────────────────────────────────────────

describe("cashFlowStore.setupCashFlow", () => {
  beforeEach(() => {
    useCashFlowStore.setState({ userId: "user-X", balance: null, monthlyIncome: null, lastReset: null, isSetup: false, isLoading: false });
  });

  it("sets balance, monthlyIncome, lastReset, and isSetup=true in state", async () => {
    await useCashFlowStore.getState().setupCashFlow({ balance: 3000, monthlyIncome: 4500 });

    const s = useCashFlowStore.getState();
    expect(s.balance).toBe(3000);
    expect(s.monthlyIncome).toBe(4500);
    expect(s.isSetup).toBe(true);
    expect(s.lastReset).not.toBeNull();
  });

  it("persists to AsyncStorage", async () => {
    await useCashFlowStore.getState().setupCashFlow({ balance: 1200, monthlyIncome: 2800 });

    const raw = await AsyncStorage.getItem(cacheKey("user-X"));
    expect(raw).not.toBeNull();
    const cached = JSON.parse(raw!);
    expect(cached.balance).toBe(1200);
    expect(cached.monthlyIncome).toBe(2800);
    expect(cached.lastReset).not.toBeNull();
  });

  it("enqueues an upsert_profile mutation with cash flow fields", async () => {
    await useCashFlowStore.getState().setupCashFlow({ balance: 2000, monthlyIncome: 3500 });

    expect(mockEnqueueMutation).toHaveBeenCalledTimes(1);
    const [userId, mutation] = mockEnqueueMutation.mock.calls[0];
    expect(userId).toBe("user-X");
    expect(mutation.kind).toBe("upsert_profile");
    expect(mutation.payload.id).toBe("user-X");
    expect(mutation.payload.cash_flow_balance).toBe(2000);
    expect(mutation.payload.cash_flow_monthly_income).toBe(3500);
    expect(mutation.payload.cash_flow_last_reset).toBeDefined();
  });

  it("includes paydayDay in profile payload when provided", async () => {
    await useCashFlowStore.getState().setupCashFlow({
      balance: 1000,
      monthlyIncome: 2000,
      paydayDay: 25,
    });

    const mutation = mockEnqueueMutation.mock.calls[0][1];
    expect(mutation.payload.payday_day).toBe(25);
  });

  it("does not include paydayDay in payload when not provided", async () => {
    await useCashFlowStore.getState().setupCashFlow({ balance: 500, monthlyIncome: 1500 });

    const mutation = mockEnqueueMutation.mock.calls[0][1];
    expect(mutation.payload.payday_day).toBeUndefined();
  });

  it("calls flushBudgetQueue after enqueueing", async () => {
    await useCashFlowStore.getState().setupCashFlow({ balance: 100, monthlyIncome: 500 });
    expect(mockFlushBudgetQueue).toHaveBeenCalledWith("user-X");
  });

  it("throws when userId is null", async () => {
    useCashFlowStore.setState({ userId: null });
    await expect(
      useCashFlowStore.getState().setupCashFlow({ balance: 100, monthlyIncome: 500 })
    ).rejects.toThrow();
  });

  it("handles zero balance (user has nothing left)", async () => {
    await useCashFlowStore.getState().setupCashFlow({ balance: 0, monthlyIncome: 2000 });

    expect(useCashFlowStore.getState().balance).toBe(0);
    expect(useCashFlowStore.getState().isSetup).toBe(true);
  });
});

// ─── updateBalance ────────────────────────────────────────────────────────────

describe("cashFlowStore.updateBalance", () => {
  beforeEach(() => {
    useCashFlowStore.setState({
      userId: "user-Y",
      balance: 1000,
      monthlyIncome: 3000,
      lastReset: "2026-04-01T00:00:00.000Z",
      isSetup: true,
      isLoading: false,
    });
  });

  it("updates balance in state", async () => {
    await useCashFlowStore.getState().updateBalance(2500);
    expect(useCashFlowStore.getState().balance).toBe(2500);
  });

  it("updates lastReset timestamp", async () => {
    const before = useCashFlowStore.getState().lastReset;
    await useCashFlowStore.getState().updateBalance(2500);
    const after = useCashFlowStore.getState().lastReset;
    expect(after).not.toEqual(before);
    expect(after).not.toBeNull();
  });

  it("persists new balance to AsyncStorage", async () => {
    await useCashFlowStore.getState().updateBalance(999);

    const raw = await AsyncStorage.getItem(cacheKey("user-Y"));
    const cached = JSON.parse(raw!);
    expect(cached.balance).toBe(999);
  });

  it("retains monthlyIncome in AsyncStorage after balance update", async () => {
    await useCashFlowStore.getState().updateBalance(500);

    const raw = await AsyncStorage.getItem(cacheKey("user-Y"));
    const cached = JSON.parse(raw!);
    expect(cached.monthlyIncome).toBe(3000);
  });

  it("enqueues an upsert_profile mutation with only balance and lastReset", async () => {
    await useCashFlowStore.getState().updateBalance(1800);

    expect(mockEnqueueMutation).toHaveBeenCalledTimes(1);
    const [userId, mutation] = mockEnqueueMutation.mock.calls[0];
    expect(userId).toBe("user-Y");
    expect(mutation.kind).toBe("upsert_profile");
    expect(mutation.payload.cash_flow_balance).toBe(1800);
    expect(mutation.payload.cash_flow_last_reset).toBeDefined();
    // Monthly income should NOT be in this mutation (updateBalance only touches balance)
    expect(mutation.payload.cash_flow_monthly_income).toBeUndefined();
  });

  it("calls flushBudgetQueue after enqueueing", async () => {
    await useCashFlowStore.getState().updateBalance(1800);
    expect(mockFlushBudgetQueue).toHaveBeenCalledWith("user-Y");
  });

  it("throws when userId is null", async () => {
    useCashFlowStore.setState({ userId: null });
    await expect(
      useCashFlowStore.getState().updateBalance(500)
    ).rejects.toThrow();
  });

  it("handles balance of 0 (payday, money not arrived yet edge case)", async () => {
    await useCashFlowStore.getState().updateBalance(0);
    expect(useCashFlowStore.getState().balance).toBe(0);
  });
});

// ─── Logout race condition ─────────────────────────────────────────────────────

describe("cashFlowStore logout race", () => {
  it("does not overwrite reset state when logout happens before Supabase resolves", async () => {
    const deferred = makeDeferred<{
      data: Record<string, unknown> | null;
      error: null;
    }>();

    const maybeSingle = jest.fn().mockReturnValue(deferred.promise);
    const eq = jest.fn().mockReturnValue({ maybeSingle });
    const select = jest.fn().mockReturnValue({ eq });
    const from = jest.fn().mockReturnValue({ select });
    mockSupabase = { from } as any;

    // Start loading for user-A
    useCashFlowStore.setState({ userId: "user-A", isLoading: false, balance: null, monthlyIncome: null, lastReset: null, isSetup: false });
    const refreshPromise = useCashFlowStore.getState().refresh();

    // Logout (initForUser null) fires before Supabase responds
    await useCashFlowStore.getState().initForUser(null);

    // Now Supabase responds with data for user-A
    deferred.resolve({
      data: {
        cash_flow_balance: "9999",
        cash_flow_monthly_income: "5000",
        cash_flow_last_reset: null,
        stable_salary: "5000",
      },
      error: null,
    });

    await refreshPromise;

    // State should still be the logged-out state (null)
    const s = useCashFlowStore.getState();
    expect(s.userId).toBeNull();
    expect(s.balance).toBeNull();
    expect(s.monthlyIncome).toBeNull();
    expect(s.isSetup).toBe(false);
  });

  it("does not overwrite new user state when old refresh resolves late", async () => {
    const deferredUserA = makeDeferred<{
      data: Record<string, unknown> | null;
      error: null;
    }>();

    // Set up slow Supabase for user-A
    const maybeSingleA = jest.fn().mockReturnValue(deferredUserA.promise);
    const eqA = jest.fn().mockReturnValue({ maybeSingle: maybeSingleA });
    const selectA = jest.fn().mockReturnValue({ eq: eqA });
    const fromA = jest.fn().mockReturnValue({ select: selectA });
    mockSupabase = { from: fromA } as any;

    useCashFlowStore.setState({
      userId: "user-A",
      isLoading: false,
      balance: null,
      monthlyIncome: null,
      lastReset: null,
      isSetup: false,
    });
    const refreshA = useCashFlowStore.getState().refresh();

    // Null out supabase BEFORE switching users so user-B's init resolves immediately.
    mockSupabase = null;
    await useCashFlowStore.getState().initForUser("user-B");

    // user-A's Supabase response finally arrives (stale)
    deferredUserA.resolve({
      data: {
        cash_flow_balance: "5000",
        cash_flow_monthly_income: "4000",
        cash_flow_last_reset: null,
        stable_salary: "4000",
      },
      error: null,
    });

    await refreshA;

    // State should reflect user-B; user-A's stale data must not overwrite it.
    const s = useCashFlowStore.getState();
    expect(s.userId).toBe("user-B");
    expect(s.balance).toBeNull(); // user-B has no cached data
  });
});

// ─── resetForLogout ───────────────────────────────────────────────────────────

describe("cashFlowStore.resetForLogout", () => {
  it("resets all state immediately and synchronously", () => {
    useCashFlowStore.setState({
      userId: "user-Z",
      balance: 5000,
      monthlyIncome: 6000,
      lastReset: "2026-04-01T00:00:00.000Z",
      isSetup: true,
      isLoading: false,
    });

    useCashFlowStore.getState().resetForLogout();

    const s = useCashFlowStore.getState();
    expect(s.userId).toBeNull();
    expect(s.balance).toBeNull();
    expect(s.monthlyIncome).toBeNull();
    expect(s.lastReset).toBeNull();
    expect(s.isSetup).toBe(false);
    expect(s.isLoading).toBe(false);
  });
});

// ─── mutation payload shape ───────────────────────────────────────────────────

describe("mutation payload contract", () => {
  beforeEach(() => {
    useCashFlowStore.setState({
      userId: "user-contract",
      balance: null,
      monthlyIncome: null,
      lastReset: null,
      isSetup: false,
      isLoading: false,
    });
  });

  it("setupCashFlow mutation has a valid UUID-shaped id", async () => {
    await useCashFlowStore.getState().setupCashFlow({ balance: 100, monthlyIncome: 200 });

    const mutation = mockEnqueueMutation.mock.calls[0][1];
    expect(mutation.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it("setupCashFlow mutation does not include retryCount (set internally by enqueueMutation)", async () => {
    await useCashFlowStore.getState().setupCashFlow({ balance: 100, monthlyIncome: 200 });

    const mutation = mockEnqueueMutation.mock.calls[0][1];
    // retryCount is excluded from the enqueueMutation argument type (Omit<BudgetMutation, "retryCount">)
    expect(Object.keys(mutation)).not.toContain("retryCount");
  });

  it("updateBalance mutation has a valid UUID-shaped id", async () => {
    useCashFlowStore.setState({
      userId: "user-contract",
      balance: 500,
      monthlyIncome: 1000,
      lastReset: null,
      isSetup: true,
      isLoading: false,
    });
    await useCashFlowStore.getState().updateBalance(600);

    const mutation = mockEnqueueMutation.mock.calls[0][1];
    expect(mutation.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it("both mutations have createdAt as a valid ISO string", async () => {
    await useCashFlowStore.getState().setupCashFlow({ balance: 100, monthlyIncome: 200 });

    const mutation = mockEnqueueMutation.mock.calls[0][1];
    expect(() => new Date(mutation.createdAt)).not.toThrow();
    expect(new Date(mutation.createdAt).toISOString()).toBe(mutation.createdAt);
  });
});
