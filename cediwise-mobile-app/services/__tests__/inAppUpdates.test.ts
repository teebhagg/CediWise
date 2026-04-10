/** @jest-environment node */

import { log } from "@/utils/logger";
import { checkAndPromptUpdate } from "@/services/inAppUpdates";

const mockCheckNeedsUpdate = jest.fn();
const mockStartUpdate = jest.fn();

jest.mock("sp-react-native-in-app-updates", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    checkNeedsUpdate: mockCheckNeedsUpdate,
    startUpdate: mockStartUpdate,
  })),
  IAUUpdateKind: {
    IMMEDIATE: "IMMEDIATE",
    FLEXIBLE: "FLEXIBLE",
  },
}));

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: { version: "9.8.7" },
  },
}));

function rnPlatform() {
  const g = globalThis as { __TEST_RN_PLATFORM__?: { OS: string } };
  return g.__TEST_RN_PLATFORM__;
}

describe("inAppUpdates", () => {
  beforeEach(() => {
    const p = rnPlatform();
    if (p) p.OS = "android";
    mockCheckNeedsUpdate.mockReset();
    mockStartUpdate.mockReset();
    mockCheckNeedsUpdate.mockResolvedValue({ shouldUpdate: true });
    mockStartUpdate.mockResolvedValue(undefined);
    jest.clearAllMocks();
  });

  it("starts IMMEDIATE update on Android when Play reports shouldUpdate", async () => {
    await checkAndPromptUpdate({ immediate: true });
    expect(mockCheckNeedsUpdate).toHaveBeenCalledWith({ curVersion: "9.8.7" });
    expect(mockStartUpdate).toHaveBeenCalledWith({ updateType: "IMMEDIATE" });
  });

  it("starts FLEXIBLE update when immediate is false", async () => {
    await checkAndPromptUpdate({ immediate: false });
    expect(mockStartUpdate).toHaveBeenCalledWith({ updateType: "FLEXIBLE" });
  });

  it("uses curVersion override when provided", async () => {
    await checkAndPromptUpdate({ curVersion: "1.2.3", immediate: true });
    expect(mockCheckNeedsUpdate).toHaveBeenCalledWith({ curVersion: "1.2.3" });
  });

  it("does not start update on iOS even if shouldUpdate is true", async () => {
    const p = rnPlatform();
    if (p) p.OS = "ios";
    await checkAndPromptUpdate({ immediate: true });
    expect(mockCheckNeedsUpdate).toHaveBeenCalled();
    expect(mockStartUpdate).not.toHaveBeenCalled();
  });

  it("does not start update when Play says no update", async () => {
    mockCheckNeedsUpdate.mockResolvedValue({ shouldUpdate: false });
    await checkAndPromptUpdate({ immediate: true });
    expect(mockStartUpdate).not.toHaveBeenCalled();
  });

  it("swallows errors and logs", async () => {
    mockCheckNeedsUpdate.mockRejectedValue(new Error("boom"));
    await expect(checkAndPromptUpdate({ immediate: true })).resolves.toBeUndefined();
    expect(log.error).toHaveBeenCalled();
  });
});
