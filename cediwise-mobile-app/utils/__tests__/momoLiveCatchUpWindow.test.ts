import { resolveLiveCatchUpMinDateMs } from "../momoLiveCatchUpWindow";

const NOW = Date.UTC(2026, 7, 3, 15, 0, 0);

describe("resolveLiveCatchUpMinDateMs", () => {
  it("uses initial lookback when no watermark", () => {
    const min = resolveLiveCatchUpMinDateMs(NOW, null, {
      maxLookbackMs: 2 * 60 * 60 * 1000,
      initialLookbackMs: 30 * 60 * 1000,
      overlapMs: 60_000,
    });
    expect(min).toBe(NOW - 30 * 60 * 1000);
  });

  it("uses watermark minus overlap when recent", () => {
    const last = NOW - 5 * 60 * 1000;
    const min = resolveLiveCatchUpMinDateMs(NOW, last, {
      maxLookbackMs: 2 * 60 * 60 * 1000,
      initialLookbackMs: 30 * 60 * 1000,
      overlapMs: 60_000,
    });
    expect(min).toBe(last - 60_000);
  });

  it("caps at max lookback for old watermark", () => {
    const last = NOW - 5 * 60 * 60 * 1000;
    const min = resolveLiveCatchUpMinDateMs(NOW, last, {
      maxLookbackMs: 2 * 60 * 60 * 1000,
      initialLookbackMs: 30 * 60 * 1000,
      overlapMs: 60_000,
    });
    expect(min).toBe(NOW - 2 * 60 * 60 * 1000);
  });
});

describe("resolveLiveCatchUpMinDateMs clock skew", () => {
  it("never returns a bound later than now", () => {
    const now = 1_000_000_000;
    expect(resolveLiveCatchUpMinDateMs(now, now + 3_600_000)).toBeLessThanOrEqual(now);
  });
});
