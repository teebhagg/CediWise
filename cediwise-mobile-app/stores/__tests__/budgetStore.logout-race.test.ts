/** @jest-environment node */

import { useBudgetStore } from "../budgetStore";

let deferredState: { resolve: (v: any) => void; promise: Promise<any> };
let deferredQueue: { resolve: (v: any) => void; promise: Promise<any> };

const mockLoadBudgetState = jest.fn();
const mockLoadBudgetQueue = jest.fn();

jest.mock("@/utils/budgetStorage", () => ({
  BUDGET_CHANGED_EVENT: "cediwise_budget_changed",
  createEmptyBudgetState: jest.fn((userId: string) => ({
    version: 1,
    userId,
    prefs: {},
    incomeSources: [],
    cycles: [],
    categories: [],
    transactions: [],
    updatedAt: new Date().toISOString(),
  })),
  createEmptyQueue: jest.fn((userId: string) => ({
    version: 1,
    userId,
    items: [],
    updatedAt: new Date().toISOString(),
  })),
  loadBudgetState: (...args: any[]) => mockLoadBudgetState(...args),
  loadBudgetQueue: (...args: any[]) => mockLoadBudgetQueue(...args),
  saveBudgetState: jest.fn().mockResolvedValue(undefined),
}));

function makeDeferred() {
  let resolve: (v: any) => void;
  const promise = new Promise<any>((res) => {
    resolve = res;
  });
  return { promise, resolve: resolve! };
}

describe("budgetStore logout race", () => {
  beforeEach(() => {
    deferredState = makeDeferred();
    deferredQueue = makeDeferred();
    mockLoadBudgetState.mockReturnValue(deferredState.promise);
    mockLoadBudgetQueue.mockReturnValue(deferredQueue.promise);

    useBudgetStore.setState({
      userId: null,
      state: null,
      queue: null,
      isLoading: true,
    });
  });

  it("does not overwrite cleared state when logout happens during reload", async () => {
    const emptyState = {
      version: 1,
      userId: "user-A",
      prefs: {},
      incomeSources: [],
      cycles: [],
      categories: [],
      transactions: [],
      updatedAt: new Date().toISOString(),
    };
    const emptyQueue = {
      version: 1,
      userId: "user-A",
      items: [],
      updatedAt: new Date().toISOString(),
    };

    useBudgetStore.setState({ userId: "user-A", state: null, queue: null });
    const reloadPromise = useBudgetStore.getState().reload();

    useBudgetStore.getState().initForUser(null);

    deferredState.resolve(emptyState);
    deferredQueue.resolve(emptyQueue);

    await reloadPromise;

    const state = useBudgetStore.getState();
    expect(state.userId).toBeNull();
    expect(state.state).toBeNull();
    expect(state.queue).toBeNull();
  });

  it("does not overwrite cleared state when logout happens during initForUser", async () => {
    const emptyState = {
      version: 1,
      userId: "user-A",
      prefs: {},
      incomeSources: [],
      cycles: [],
      categories: [],
      transactions: [],
      updatedAt: new Date().toISOString(),
    };
    const emptyQueue = {
      version: 1,
      userId: "user-A",
      items: [],
      updatedAt: new Date().toISOString(),
    };

    const initPromise = useBudgetStore.getState().initForUser("user-A");

    useBudgetStore.getState().initForUser(null);

    deferredState.resolve(emptyState);
    deferredQueue.resolve(emptyQueue);

    await initPromise;

    const state = useBudgetStore.getState();
    expect(state.userId).toBeNull();
    expect(state.state).toBeNull();
    expect(state.queue).toBeNull();
  });
});
