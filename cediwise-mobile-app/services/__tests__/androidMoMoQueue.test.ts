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

  it("does not arm capture when a direct pause lands while the enable awaits the session", async () => {
    let release: (value: { accessToken: string }) => void = () => {};
    mockGetStoredAuthData.mockReturnValue(new Promise((resolve) => { release = resolve; }));

    const enabling = configureNativeMoMoCapture(true, "user-1");
    await pauseNativeMoMoCapture("user-1");
    release({ accessToken: "tok" });

    await expect(enabling).resolves.toBe(false);
    expect(pause).toHaveBeenCalledWith("user-1");
    expect(configure).not.toHaveBeenCalled();
  });

  it("lets a newer enable finish when an older one fails and pauses", async () => {
    let releaseNewer: (value: { accessToken: string }) => void = () => {};
    // Older call fails to get a token; newer call is still refreshing when that failure pauses.
    mockGetStoredAuthData
      .mockResolvedValueOnce(null)
      .mockReturnValueOnce(new Promise((resolve) => { releaseNewer = resolve; }));

    const newer = (async () => {
      const older = configureNativeMoMoCapture(true, "user-1");
      const second = configureNativeMoMoCapture(true, "user-1");
      await older;
      return second;
    })();
    await Promise.resolve();
    releaseNewer({ accessToken: "tok" });

    await expect(newer).resolves.toBe(true);
    expect(configure).toHaveBeenCalledWith(true, "user-1", "tok", expect.any(String), expect.any(Array));
  });
});
