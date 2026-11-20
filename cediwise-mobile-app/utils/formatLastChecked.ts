import moment from "moment";

/**
 * Human-readable "last checked" for MoMo Tracking active panel.
 * Ordered rules — first match wins. See design spec.
 */
export function formatLastChecked(
  iso: string | null,
  nowMs: number = Date.now(),
): string {
  if (!iso) return "Not checked yet";

  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return "Not checked yet";

  if (ts > nowMs) return "Just now";

  const ageMs = nowMs - ts;

  if (ageMs < 60_000) return "Just now";

  if (ageMs < 3_600_000) {
    const n = Math.floor(ageMs / 60_000);
    return n === 1 ? "1 minute ago" : `${n} minutes ago`;
  }

  if (ageMs < 21_600_000) {
    const n = Math.floor(ageMs / 3_600_000);
    return n === 1 ? "1 hour ago" : `${n} hours ago`;
  }

  const when = moment(ts);
  const now = moment(nowMs);
  const dayDiff = now.clone().startOf("day").diff(when.clone().startOf("day"), "days");

  if (dayDiff === 0) {
    return `Today at ${when.format("h:mm A")}`;
  }

  if (dayDiff === 1) {
    return `Yesterday at ${when.format("h:mm A")}`;
  }

  if (dayDiff >= 2 && dayDiff <= 6) {
    return `${dayDiff} days ago`;
  }

  if (when.isSame(now, "year")) {
    return when.format("D MMM [at] h:mm A");
  }

  return when.format("D MMM YYYY [at] h:mm A");
}
