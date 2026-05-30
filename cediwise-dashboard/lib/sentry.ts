import type {
  ErrorStatsData,
  PerformanceData,
  Period,
  SentryIssue,
  StatCardData,
  UnresolvedIssuesData,
} from "@/lib/types/dashboard";

const AUTH_TOKEN = process.env.SENTRY_AUTH_TOKEN ?? "";
const ORG_SLUG = process.env.SENTRY_ORG_SLUG ?? "";
const PROJECT_SLUG = process.env.SENTRY_PROJECT_SLUG ?? "";
const BASE_URL = process.env.SENTRY_BASE_URL ?? "https://de.sentry.io/api/0/";

function authHeader(): Record<string, string> {
  if (!AUTH_TOKEN) throw new Error("SENTRY_AUTH_TOKEN is not set");
  return { Authorization: `Bearer ${AUTH_TOKEN}` };
}

function ensureConfig(): void {
  if (!ORG_SLUG) throw new Error("SENTRY_ORG_SLUG is not set");
  if (!PROJECT_SLUG) throw new Error("SENTRY_PROJECT_SLUG is not set");
}

function computeDelta(current: number, previous: number): number | null {
  return previous === 0 ? (current > 0 ? 100 : null) : Math.round(((current - previous) / previous) * 100);
}

function periodLabel(period: Period): string {
  const labels: Record<Period, string> = { day: "dy", week: "wk", month: "mo", year: "yr" };
  return labels[period];
}

async function fetchFromSentry<T>(path: string): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    headers: {
      ...authHeader(),
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "(unreadable)");
    throw new Error(`Sentry API error: ${response.status} ${response.statusText}\nURL: ${url}\nResponse: ${body}`);
  }
  return response.json();
}

function periodStats(period: Period): { since: string; until: string } {
  const now = new Date();
  const days = period === "day" ? 1 : period === "week" ? 7 : period === "month" ? 30 : 365;
  return {
    since: new Date(now.getTime() - days * 86400000).toISOString().split("T")[0],
    until: now.toISOString().split("T")[0],
  };
}

function periodStatsUnix(period: Period): { since: string; until: string } {
  const now = Math.floor(Date.now() / 1000);
  const days = period === "day" ? 1 : period === "week" ? 7 : period === "month" ? 30 : 365;
  return { since: String(now - days * 86400), until: String(now) };
}

// ─── Issues API ──────────────────────────────────────────────────────────
// Response is a flat array of issues: [issue, issue, ...]

type SentryIssueRaw = {
  id: string;
  title: string;
  level: string;
  count: string | number;
  userCount: number;
  firstSeen: string;
  lastSeen: string;
  permalink: string;
  culprit: string;
  metadata: {
    type?: string;
    value?: string;
    filename?: string;
    function?: string;
    title?: string;
  };
};

function parseIssue(raw: SentryIssueRaw): SentryIssue {
  return {
    id: raw.id,
    title: raw.title,
    level: (["fatal", "error", "warning", "info"] as const).includes(raw.level as SentryIssue["level"])
      ? (raw.level as SentryIssue["level"])
      : "error",
    count: Number(raw.count ?? 0),
    userCount: raw.userCount ?? 0,
    firstSeen: raw.firstSeen,
    lastSeen: raw.lastSeen,
    permalink: raw.permalink,
    culprit: raw.culprit ?? "",
    metadata: {
      type: raw.metadata?.type ?? "",
      value: raw.metadata?.value ?? "",
      filename: raw.metadata?.filename ?? "",
      function: raw.metadata?.function ?? "",
    },
  };
}

export async function getUnresolvedIssues(period: Period): Promise<UnresolvedIssuesData> {
  ensureConfig();
  const { since } = periodStats(period);

  const data = await fetchFromSentry<SentryIssueRaw[]>(
    `projects/${ORG_SLUG}/${PROJECT_SLUG}/issues/?query=is:unresolved firstSeen:>=${since}`,
  );

  const issues = (data ?? []).map(parseIssue);
  const total = issues.length;

  const half = Math.floor(issues.length / 2);
  const current = issues.slice(half).reduce((sum, i) => sum + i.count, 0);
  const previous = issues.slice(0, half).reduce((sum, i) => sum + i.count, 0);

  return {
    total: {
      label: "Unresolved Issues",
      value: total,
      delta: computeDelta(current, previous),
      deltaLabel: periodLabel(period),
    },
    issues,
  };
}

// ─── Stats API ────────────────────────────────────────────────────────────
// Response is an array of [unix_timestamp, count]: [[ts, count], [ts, count], ...]
// No per-level breakdown — returns total error event volume.

export async function getErrorStats(period: Period): Promise<ErrorStatsData> {
  ensureConfig();
  const { since, until } = periodStatsUnix(period);

  const data = await fetchFromSentry<[number, number][]>(
    `projects/${ORG_SLUG}/${PROJECT_SLUG}/stats/?since=${since}&until=${until}&resolution=1d`,
  );

  const error = (data ?? []).map(([ts, count]) => ({
    date: new Date(ts * 1000).toISOString().split("T")[0],
    value: count,
  }));

  return { fatal: [], error, warning: [] };
}

// ─── Events/Discover API ─────────────────────────────────────────────────
// Response: { data: [{ transaction, "p95()": ..., "p50()": ... }, ...] }

type SentryEventsResponse = {
  data?: {
    transaction: string;
    "p95()": number;
    "p50()": number;
  }[];
};

export async function getPerformanceData(period: Period): Promise<PerformanceData> {
  ensureConfig();
  const { since, until } = periodStats(period);

  const query = encodeURIComponent(
    `event.type:transaction timestamp:>=${since} timestamp:<=${until}`,
  );

  const data = await fetchFromSentry<SentryEventsResponse>(
    `organizations/${ORG_SLUG}/events/?field=transaction&field=p95(transaction.duration)&field=p50(transaction.duration)&query=${query}&per_page=10`,
  );

  const transactions = (data.data ?? []).map((t) => ({
    name: t.transaction,
    p95: Number(t["p95()"]) ?? 0,
    p50: Number(t["p50()"]) ?? 0,
  }));

  const maxP95 = transactions.length > 0 ? Math.max(...transactions.map((t) => t.p95)) : 0;

  return {
    transactions,
    overallP95: {
      label: "P95 Load Time",
      value: `${maxP95.toFixed(0)}ms`,
      delta: null,
      deltaLabel: "",
    },
  };
}

export async function getAffectedUsers(period: Period): Promise<StatCardData> {
  ensureConfig();
  const { since } = periodStats(period);

  const data = await fetchFromSentry<SentryIssueRaw[]>(
    `projects/${ORG_SLUG}/${PROJECT_SLUG}/issues/?query=is:unresolved firstSeen:>=${since}`,
  );

  const issues = data ?? [];
  const totalUsers = issues.reduce((sum, i) => sum + (i.userCount ?? 0), 0);

  const half = Math.floor(issues.length / 2);
  const currentUsers = issues.slice(half).reduce((sum, i) => sum + (i.userCount ?? 0), 0);
  const previousUsers = issues.slice(0, half).reduce((sum, i) => sum + (i.userCount ?? 0), 0);

  return {
    label: "Affected Users",
    value: totalUsers,
    delta: computeDelta(currentUsers, previousUsers),
    deltaLabel: periodLabel(period),
  };
}
