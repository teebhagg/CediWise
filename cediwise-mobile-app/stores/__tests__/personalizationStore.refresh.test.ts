/** @jest-environment node */

import { usePersonalizationStore } from "../personalizationStore";

const mockReadPersonalizationStatusCache = jest.fn();
const mockFetchPersonalizationStatusRemote = jest.fn();
const mockWritePersonalizationStatusCache = jest.fn().mockResolvedValue(undefined);

jest.mock("@/utils/profileVitals", () => ({
  readPersonalizationStatusCache: (...args: unknown[]) =>
    mockReadPersonalizationStatusCache(...args),
  fetchPersonalizationStatusRemote: (...args: unknown[]) =>
    mockFetchPersonalizationStatusRemote(...args),
  writePersonalizationStatusCache: (...args: unknown[]) =>
    mockWritePersonalizationStatusCache(...args),
}));

describe("personalizationStore.refresh", () => {
  beforeEach(() => {
    mockReadPersonalizationStatusCache.mockReset();
    mockFetchPersonalizationStatusRemote.mockReset();
    mockWritePersonalizationStatusCache.mockClear();
    usePersonalizationStore.setState({
      userId: "user-1",
      isLoading: true,
      setupCompleted: false,
      hasProfile: false,
    });
  });

  it("does not downgrade setupCompleted when local cache is true but remote is false", async () => {
    mockReadPersonalizationStatusCache.mockResolvedValue({
      setupCompleted: true,
      updatedAt: new Date().toISOString(),
    });
    mockFetchPersonalizationStatusRemote.mockResolvedValue({
      exists: false,
      setupCompleted: false,
    });

    await usePersonalizationStore.getState().refresh();

    const state = usePersonalizationStore.getState();
    expect(state.setupCompleted).toBe(true);
    expect(state.hasProfile).toBe(true);
    expect(mockWritePersonalizationStatusCache).toHaveBeenCalledWith(
      "user-1",
      true,
    );
  });
});
