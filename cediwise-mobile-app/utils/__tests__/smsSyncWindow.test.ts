import { resolveSmsSyncMinDateMs } from "../smsSyncWindow";

describe("resolveSmsSyncMinDateMs", () => {
  const now = Date.UTC(2026, 7, 3, 12, 0, 0);
  const yearMs = 365 * 24 * 60 * 60 * 1000;

  it("uses lookback window when profile created_at is missing", () => {
    expect(resolveSmsSyncMinDateMs(now, null, yearMs)).toBe(now - yearMs);
  });

  it("clamps to profile created_at when newer than lookback start", () => {
    const profileCreated = Date.UTC(2026, 6, 1, 0, 0, 0);
    expect(resolveSmsSyncMinDateMs(now, profileCreated, yearMs)).toBe(
      profileCreated,
    );
  });

  it("keeps lookback start when profile is older than the window", () => {
    const profileCreated = Date.UTC(2020, 0, 1, 0, 0, 0);
    expect(resolveSmsSyncMinDateMs(now, profileCreated, yearMs)).toBe(
      now - yearMs,
    );
  });
});
