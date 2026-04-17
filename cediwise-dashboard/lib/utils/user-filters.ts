export const ALLOWED_INACTIVE_DAYS = new Set([15, 30, 45, 60, 75, 90]);

export function compareVersions(a: string, b: string) {
  const partsA = a.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const partsB = b.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const maxLength = Math.max(partsA.length, partsB.length);

  for (let index = 0; index < maxLength; index += 1) {
    const left = partsA[index] ?? 0;
    const right = partsB[index] ?? 0;
    if (left > right) return 1;
    if (left < right) return -1;
  }

  return 0;
}

export function resolveVersionStatus(
  deviceVersion: string | null,
  devicePlatform: "ios" | "android" | null,
  activeVersions: Map<"ios" | "android", string>
): "outdated" | "current" | "unknown" {
  if (!deviceVersion || !devicePlatform) return "unknown";
  const activeVersion = activeVersions.get(devicePlatform);
  if (!activeVersion) return "unknown";
  return compareVersions(deviceVersion, activeVersion) < 0 ? "outdated" : "current";
}

export function resolveLastActiveAt(
  lastSeenAt: string | null,
  lastSignInAt: string | null
) {
  return lastSeenAt ?? lastSignInAt ?? null;
}

export function isInactiveByDays(lastActiveAt: string | null, inactiveDays?: number) {
  if (!inactiveDays) return false;
  if (!lastActiveAt) return true;
  const lastActiveMs = new Date(lastActiveAt).getTime();
  if (Number.isNaN(lastActiveMs)) return true;
  return lastActiveMs <= Date.now() - inactiveDays * 24 * 60 * 60 * 1000;
}

export function sanitizeInactiveDays(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "", 10);
  return ALLOWED_INACTIVE_DAYS.has(parsed)
    ? (parsed as 15 | 30 | 45 | 60 | 75 | 90)
    : undefined;
}
