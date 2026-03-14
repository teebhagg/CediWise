/** @jest-environment node */

import { usePersonalizationStore } from "../personalizationStore";

let deferred: { resolve: (v: any) => void; promise: Promise<any> };

const mockReadPersonalizationStatusCache = jest.fn();
const mockFetchPersonalizationStatusRemote = jest.fn();
const mockWritePersonalizationStatusCache = jest.fn().mockResolvedValue(undefined);

jest.mock("@/utils/profileVitals", () => ({
  readPersonalizationStatusCache: (...args: any[]) =>
    mockReadPersonalizationStatusCache(...args),
  fetchPersonalizationStatusRemote: (...args: any[]) =>
    mockFetchPersonalizationStatusRemote(...args),
  writePersonalizationStatusCache: (...args: any[]) =>
    mockWritePersonalizationStatusCache(...args),
}));

describe("personalizationStore logout race", () => {
  beforeEach(() => {
    let resolve: (v: any) => void;
    deferred = {
      promise: new Promise<any>((res) => {
        resolve = res;
      }),
      resolve: null as any,
    };
    deferred.resolve = resolve!;

    mockReadPersonalizationStatusCache.mockResolvedValue(null);
    mockFetchPersonalizationStatusRemote.mockReturnValue(deferred.promise);

    usePersonalizationStore.setState({
      userId: null,
      isLoading: true,
      setupCompleted: false,
      hasProfile: false,
    });
  });

  it("does not overwrite cleared state when logout happens during refresh", async () => {
    usePersonalizationStore.setState({
      userId: "user-A",
      setupCompleted: false,
      hasProfile: false,
    });
    const refreshPromise = usePersonalizationStore.getState().refresh();

    usePersonalizationStore.getState().initForUser(null);

    deferred.resolve({ exists: true, setupCompleted: true });

    await refreshPromise;

    const state = usePersonalizationStore.getState();
    expect(state.userId).toBeNull();
    expect(state.setupCompleted).toBe(false);
    expect(state.hasProfile).toBe(false);
  });
});
