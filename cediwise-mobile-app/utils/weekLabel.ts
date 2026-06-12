/**
 * ISO-8601 week label (e.g. 2026-W24) using the local calendar.
 * Week 1 is the week with the year's first Thursday.
 * For Ghana (UTC+0) this matches the server UTC week label in `_shared/isoWeekLabel.ts`.
 */
export function getISOWeekLabel(date: Date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const isoYear = d.getFullYear();
  const yearStart = new Date(isoYear, 0, 1);
  const week = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}
