import {
  compareVersions,
  isInactiveByDays,
  resolveLastActiveAt,
  resolveVersionStatus,
  sanitizeInactiveDays,
} from "@/lib/utils/user-filters";

describe("users action helpers", () => {
  it("compares semantic-ish version strings", () => {
    expect(compareVersions("1.2.3", "1.2.3")).toBe(0);
    expect(compareVersions("1.2.4", "1.2.3")).toBe(1);
    expect(compareVersions("1.2.3", "1.3.0")).toBe(-1);
    expect(compareVersions("1.2", "1.2.0")).toBe(0);
  });

  it("resolves outdated version status against active platform version", () => {
    const activeVersions = new Map<"ios" | "android", string>([
      ["android", "2.0.0"],
      ["ios", "3.1.0"],
    ]);

    expect(resolveVersionStatus("1.9.9", "android", activeVersions)).toBe("outdated");
    expect(resolveVersionStatus("2.0.0", "android", activeVersions)).toBe("current");
    expect(resolveVersionStatus(null, "android", activeVersions)).toBe("unknown");
    expect(resolveVersionStatus("3.1.0", null, activeVersions)).toBe("unknown");
  });

  it("falls back from device activity to auth sign-in", () => {
    expect(resolveLastActiveAt("2026-04-10T12:00:00.000Z", "2026-03-01T00:00:00.000Z")).toBe(
      "2026-04-10T12:00:00.000Z"
    );
    expect(resolveLastActiveAt(null, "2026-03-01T00:00:00.000Z")).toBe(
      "2026-03-01T00:00:00.000Z"
    );
    expect(resolveLastActiveAt(null, null)).toBeNull();
  });

  it("treats missing activity as inactive and recent activity as active", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-15T12:00:00.000Z"));

    expect(isInactiveByDays(null, 30)).toBe(true);
    expect(isInactiveByDays("2026-03-10T12:00:00.000Z", 30)).toBe(true);
    expect(isInactiveByDays("2026-04-01T12:00:00.000Z", 30)).toBe(false);

    vi.useRealTimers();
  });

  it("only accepts the allowed inactivity buckets", () => {
    expect(sanitizeInactiveDays("15")).toBe(15);
    expect(sanitizeInactiveDays("90")).toBe(90);
    expect(sanitizeInactiveDays("14")).toBeUndefined();
    expect(sanitizeInactiveDays(undefined)).toBeUndefined();
  });
});
