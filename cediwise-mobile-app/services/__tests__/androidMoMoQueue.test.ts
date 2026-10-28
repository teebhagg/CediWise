/** @jest-environment node */

import { ALL_MOMO_NETWORKS } from "@/constants/smsImport";
import { configureNativeMoMoCapture } from "../androidMoMoQueue";

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

describe("configureNativeMoMoCapture", () => {
  beforeEach(() => {
    configure.mockClear();
    pause.mockClear();
    mockGetStoredAuthData.mockReset().mockResolvedValue({ accessToken: "tok" });
  });

  it("sends all three network ids when Auto-add is on", async () => {
    await configureNativeMoMoCapture(true, "user-1");
    expect(configure).toHaveBeenCalledWith(
      true,
      "user-1",
      "tok",
      expect.any(String),
      [...ALL_MOMO_NETWORKS],
    );
  });

  it("pauses without clearing this user's queue when a fresh token is unavailable", async () => {
    mockGetStoredAuthData.mockResolvedValue(null);

    await expect(configureNativeMoMoCapture(true, "user-1")).resolves.toBe(false);

    expect(pause).toHaveBeenCalledWith("user-1");
    expect(configure).not.toHaveBeenCalled();
  });

  it("pauses this user's queue when capture is disabled without an explicit opt-out", async () => {
    await configureNativeMoMoCapture(false, "user-1");

    expect(pause).toHaveBeenCalledWith("user-1");
    expect(configure).not.toHaveBeenCalled();
  });
});
