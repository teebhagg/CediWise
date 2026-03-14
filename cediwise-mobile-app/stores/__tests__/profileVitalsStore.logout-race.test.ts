/** @jest-environment node */

import { useProfileVitalsStore } from "../profileVitalsStore";

let deferred: { resolve: (v: any) => void; promise: Promise<any> };

const mockReadProfileVitalsCache = jest.fn();
const mockFetchProfileVitalsRemote = jest.fn();
const mockWriteProfileVitalsCache = jest.fn().mockResolvedValue(undefined);

jest.mock("@/utils/profileVitals", () => ({
  readProfileVitalsCache: (...args: any[]) => mockReadProfileVitalsCache(...args),
  fetchProfileVitalsRemote: (...args: any[]) =>
    mockFetchProfileVitalsRemote(...args),
  writeProfileVitalsCache: (...args: any[]) =>
    mockWriteProfileVitalsCache(...args),
}));

describe("profileVitalsStore logout race", () => {
  beforeEach(() => {
    let resolve: (v: any) => void;
    deferred = {
      promise: new Promise<any>((res) => {
        resolve = res;
      }),
      resolve: null as any,
    };
    deferred.resolve = resolve!;

    mockReadProfileVitalsCache.mockResolvedValue(null);
    mockFetchProfileVitalsRemote.mockReturnValue(deferred.promise);

    useProfileVitalsStore.setState({
      userId: null,
      vitals: null,
      isLoading: true,
    });
  });

  it("does not overwrite cleared state when logout happens during refresh", async () => {
    useProfileVitalsStore.setState({ userId: "user-A", vitals: null });
    const refreshPromise = useProfileVitalsStore.getState().refresh();

    useProfileVitalsStore.getState().initForUser(null);

    deferred.resolve({
      setup_completed: true,
      payday_day: 15,
      interests: [],
      stable_salary: 5000,
      auto_tax: true,
      side_income: 0,
      rent: 1000,
      tithe_remittance: 0,
      debt_obligations: 0,
      utilities_mode: "general",
      utilities_total: 100,
      utilities_ecg: 0,
      utilities_water: 0,
      primary_goal: null,
      strategy: null,
      needs_pct: null,
      wants_pct: null,
      savings_pct: null,
    });

    await refreshPromise;

    const state = useProfileVitalsStore.getState();
    expect(state.userId).toBeNull();
    expect(state.vitals).toBeNull();
  });
});
