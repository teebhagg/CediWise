import { getISOWeekLabel } from "../weekLabel";

describe("getISOWeekLabel", () => {
  it("returns ISO week for mid-year date", () => {
    expect(getISOWeekLabel(new Date(2026, 5, 10))).toBe("2026-W24");
  });

  it("handles year boundary (late December)", () => {
    expect(getISOWeekLabel(new Date(2025, 11, 31))).toBe("2026-W01");
  });

  it("handles early January belonging to prior ISO year week", () => {
    expect(getISOWeekLabel(new Date(2026, 0, 1))).toBe("2026-W01");
  });
});
