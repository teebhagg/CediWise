/** @jest-environment node */

import { ALL_MOMO_NETWORKS } from "@/constants/smsImport";
import { configureNativeMoMoCapture, pauseNativeMoMoCapture } from "../androidMoMoQueue";

const configure = jest.fn().mockResolvedValue(true);
const pause = jest.fn().mockResolvedValue(true);
const mockGetStoredAuthData = jest.fn().mockResolvedValue({ accessToken: "tok" });

jest.mock("react-native", () => {
  const Platform = { OS: "android" };
  return {
    DeviceEventEmitter: { addListener: jest.fn(), emit: jest.fn() },
    Platform,
    NativeModules: {
      CediWiseMoMoSms: {
        configure: (...args: unknown[]) => configure(...args),
        pause: (...args: unknown[]) => pause(...args),
      },
    },
  };
});

jest.mock("@/utils/auth", () => ({
  refreshStoredSession: jest.fn().mockResolvedValue(undefined),
  getStoredAuthData: (...args: unknown[]) => mockGetStoredAuthData(...args),
}));


describe("configureNativeMoMoCapture with automatic capture disabled", () => {
  beforeEach(() => {
    configure.mockClear();
    pause.mockClear();
    mockGetStoredAuthData.mockReset().mockResolvedValue({ accessToken: "tok" });
  });

  it("never arms native capture, even when enabled with a valid token", async () => {
    await expect(configureNativeMoMoCapture(true, "user-1")).resolves.toBe(false);
    expect(configure).not.toHaveBeenCalledWith(true, expect.anything(), expect.anything(), expect.anything(), expect.anything());
    expect(pause).toHaveBeenCalledWith("user-1");
  });
});
