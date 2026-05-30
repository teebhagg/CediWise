import { readableEventName } from "@/constants/event-labels";
import type {
  ActiveUsersData,
  EventBreakdownData,
  Period,
  StatCardData,
  TopEventsData,
} from "@/lib/types/dashboard";

const BASE_URL = process.env.POSTHOG_HOST ?? "https://eu.posthog.com";
const ENVIRONMENT_ID = process.env.POSTHOG_PROJECT_ID ?? "";
const PERSONAL_API_KEY = process.env.POSTHOG_PERSONAL_API_KEY ?? "";

function authHeader(): Record<string, string> {
  if (!PERSONAL_API_KEY) throw new Error("POSTHOG_PERSONAL_API_KEY is not set");
  return { Authorization: `Bearer ${PERSONAL_API_KEY}` };
}

function periodDays(period: Period): number {
  if (period === "day") return 1;
  if (period === "week") return 7;
  if (period === "month") return 30;
  return 365;
}

function computeDelta(current: number, previous: number): number | null {
  return previous === 0 ? (current > 0 ? 100 : null) : Math.round(((current - previous) / previous) * 100);
}

function periodLabel(period: Period): string {
  const labels: Record<Period, string> = { day: "dy", week: "wk", month: "mo", year: "yr" };
  return labels[period];
}

function intervalDays(period: Period): string {
  return `${periodDays(period)} DAY`;
}

async function hogql(query: string): Promise<{ results: unknown[][]; columns: string[] }> {
  const response = await fetch(`${BASE_URL}/api/environments/${ENVIRONMENT_ID}/query/`, {
    method: "POST",
    headers: { ...authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "(unreadable)");
    throw new Error(
      `PostHog query error: ${response.status} ${response.statusText}\nBody: ${body}\nQuery: ${query.slice(0, 200)}`,
    );
  }
  return response.json();
}

export async function getTopEvents(period: Period): Promise<TopEventsData> {
  const days = periodDays(period);
  const query = `
    SELECT event, count() as count
    FROM events
    WHERE timestamp > now() - INTERVAL ${days} DAY
    GROUP BY event
    ORDER BY count DESC
    LIMIT 10
  `;

  const data = await hogql(query);

  const colors = [
    "var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)",
    "var(--chart-5)", "var(--chart-6)", "var(--chart-7)", "var(--chart-8)",
    "var(--chart-1)", "var(--chart-2)",
  ];

  return (data.results ?? []).map((row, i) => ({
    label: readableEventName(String(row[0] ?? "unknown")),
    value: Number(row[1] ?? 0),
    color: colors[i % colors.length],
  }));
}

export async function getEventBreakdown(period: Period): Promise<EventBreakdownData> {
  const data = await getTopEvents(period);
  return data.slice(0, 8);
}

export async function getActiveUsers(period: Period): Promise<ActiveUsersData> {
  const days = periodDays(period);

  const [dauSeriesData, wauSeriesData, mauSeriesData, dauTotal, wauTotal, mauTotal, prevDau, prevWau, prevMau] =
    await Promise.all([
      hogql(`
        SELECT toDate(timestamp) as day,
               count(DISTINCT person_id) as dau
        FROM events
        WHERE timestamp > now() - INTERVAL ${days} DAY
        GROUP BY day
        ORDER BY day
      `),
      hogql(`
        SELECT toStartOfWeek(timestamp) as week,
               count(DISTINCT person_id) as wau
        FROM events
        WHERE timestamp > now() - INTERVAL ${Math.max(days, 7)} DAY
        GROUP BY week
        ORDER BY week
      `),
      hogql(`
        SELECT toStartOfMonth(timestamp) as month,
               count(DISTINCT person_id) as mau
        FROM events
        WHERE timestamp > now() - INTERVAL ${Math.max(days, 30)} DAY
        GROUP BY month
        ORDER BY month
      `),
      // Rolling counts for stat cards:
      hogql(`SELECT count(DISTINCT person_id) FROM events WHERE timestamp > now() - INTERVAL 1 DAY`),
      hogql(`SELECT count(DISTINCT person_id) FROM events WHERE timestamp > now() - INTERVAL 7 DAY`),
      hogql(`SELECT count(DISTINCT person_id) FROM events WHERE timestamp > now() - INTERVAL ${Math.max(days, 30)} DAY`),
      // Previous period for delta comparison:
      hogql(`SELECT count(DISTINCT person_id) FROM events WHERE timestamp > now() - INTERVAL 2 DAY AND timestamp <= now() - INTERVAL 1 DAY`),
      hogql(`SELECT count(DISTINCT person_id) FROM events WHERE timestamp > now() - INTERVAL 14 DAY AND timestamp <= now() - INTERVAL 7 DAY`),
      hogql(`SELECT count(DISTINCT person_id) FROM events WHERE timestamp > now() - INTERVAL ${Math.max(days * 2, 60)} DAY AND timestamp <= now() - INTERVAL ${Math.max(days, 30)} DAY`),
    ]);

  function toSeries(rows: [string, number][]): { date: string; value: number }[] {
    return rows.map(([date, value]) => ({ date, value }));
  }

  const pl = periodLabel(period);

  return {
    dau: {
      label: "Daily Active Users",
      value: (dauTotal.results?.[0]?.[0] ?? 0) as number,
      delta: computeDelta(
        (dauTotal.results?.[0]?.[0] ?? 0) as number,
        (prevDau.results?.[0]?.[0] ?? 0) as number,
      ),
      deltaLabel: pl,
    },
    wau: {
      label: "Weekly Active Users",
      value: (wauTotal.results?.[0]?.[0] ?? 0) as number,
      delta: computeDelta(
        (wauTotal.results?.[0]?.[0] ?? 0) as number,
        (prevWau.results?.[0]?.[0] ?? 0) as number,
      ),
      deltaLabel: pl,
    },
    mau: {
      label: "Monthly Active Users",
      value: (mauTotal.results?.[0]?.[0] ?? 0) as number,
      delta: computeDelta(
        (mauTotal.results?.[0]?.[0] ?? 0) as number,
        (prevMau.results?.[0]?.[0] ?? 0) as number,
      ),
      deltaLabel: pl,
    },
    series: {
      dau: toSeries((dauSeriesData.results ?? []) as [string, number][]),
      wau: toSeries((wauSeriesData.results ?? []) as [string, number][]),
      mau: toSeries((mauSeriesData.results ?? []) as [string, number][]),
    },
  };
}

export async function getTotalUsers(period: Period): Promise<StatCardData> {
  const days = periodDays(period);
  const query = `
    SELECT toDate(timestamp) as day,
           count(DISTINCT person_id) as new_users
    FROM events
    WHERE timestamp > now() - INTERVAL ${days} DAY
    GROUP BY day
    ORDER BY day
  `;

  const data = await hogql(query);
  const rows = (data.results ?? []) as [string, number][];

  const total = rows.reduce((s, r) => s + r[1], 0);
  const mid = Math.floor(rows.length / 2);
  const current = rows.slice(mid).reduce((s, r) => s + r[1], 0);
  const previous = rows.slice(0, mid).reduce((s, r) => s + r[1], 0);

  return {
    label: "New Users",
    value: total,
    delta: computeDelta(current, previous),
    deltaLabel: periodLabel(period),
  };
}
