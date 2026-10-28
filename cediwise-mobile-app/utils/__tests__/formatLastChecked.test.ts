import { formatLastChecked } from "../formatLastChecked";

/** Fixed "now": Mon 3 Aug 2026, 15:00 local */
const NOW = new Date(2026, 7, 3, 15, 0, 0).getTime();

function isoAt(
  year: number,
  monthIndex: number,
  day: number,
  hour: number,
  minute: number,
): string {
  return new Date(year, monthIndex, day, hour, minute, 0).toISOString();
}

describe("formatLastChecked", () => {
  it("returns Not checked yet for null, empty, and invalid", () => {
    expect(formatLastChecked(null, NOW)).toBe("Not checked yet");
    expect(formatLastChecked("", NOW)).toBe("Not checked yet");
    expect(formatLastChecked("not-a-date", NOW)).toBe("Not checked yet");
  });

  it("treats future timestamps as Just now", () => {
    expect(formatLastChecked(isoAt(2026, 7, 3, 16, 0), NOW)).toBe("Just now");
  });

  it("uses Just now under one minute", () => {
    const thirtySecAgo = new Date(2026, 7, 3, 14, 59, 30).toISOString();
    expect(formatLastChecked(thirtySecAgo, NOW)).toBe("Just now");
  });

  it("uses relative minutes under one hour", () => {
    expect(formatLastChecked(isoAt(2026, 7, 3, 14, 48), NOW)).toBe(
      "12 minutes ago",
    );
    expect(formatLastChecked(isoAt(2026, 7, 3, 14, 59), NOW)).toBe(
      "1 minute ago",
    );
  });

  it("uses relative hours under six hours", () => {
    expect(formatLastChecked(isoAt(2026, 7, 3, 13, 0), NOW)).toBe(
      "2 hours ago",
    );
    expect(formatLastChecked(isoAt(2026, 7, 3, 14, 0), NOW)).toBe(
      "1 hour ago",
    );
  });

  it("prefers relative hours over Yesterday when under six hours", () => {
    const nowEarly = new Date(2026, 7, 3, 2, 0, 0).getTime();
    expect(formatLastChecked(isoAt(2026, 7, 2, 23, 0), nowEarly)).toBe(
      "3 hours ago",
    );
  });

  it("uses Today at for same day at or past six hours", () => {
    expect(formatLastChecked(isoAt(2026, 7, 3, 8, 15), NOW)).toBe(
      "Today at 8:15 AM",
    );
  });

  it("uses Yesterday at for previous calendar day when past six hours", () => {
    expect(formatLastChecked(isoAt(2026, 7, 2, 10, 0), NOW)).toBe(
      "Yesterday at 10:00 AM",
    );
  });

  it("uses N days ago for calendar day difference 2–6", () => {
    expect(formatLastChecked(isoAt(2026, 6, 31, 12, 0), NOW)).toBe(
      "3 days ago",
    );
    expect(formatLastChecked(isoAt(2026, 6, 28, 12, 0), NOW)).toBe(
      "6 days ago",
    );
  });

  it("uses calendar date same year for older dates", () => {
    expect(formatLastChecked(isoAt(2026, 6, 8, 15, 19), NOW)).toBe(
      "8 Jul at 3:19 PM",
    );
  });

  it("includes year for prior years", () => {
    expect(formatLastChecked(isoAt(2025, 6, 8, 15, 19), NOW)).toBe(
      "8 Jul 2025 at 3:19 PM",
    );
  });
});
