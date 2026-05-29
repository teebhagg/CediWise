# Analytics & Monitoring Dashboard — Design Spec

**Date:** 2026-05-29
**Status:** Draft
**Author:** AI-assisted

---

## Overview

Add two new pages to the CediWise admin dashboard: **Analytics** (PostHog data) and **Monitoring** (Sentry data). These follow the existing dashboard patterns: Server Components fetch data via typed lib modules, client recharts components render it.

---

## Architecture

```
Browser                         Next.js Server               PostHog/Sentry API
   │                                │                              │
   │  GET /analytics                │                              │
   │───────────────────────────────>│                              │
   │                                │  lib/posthog.ts              │
   │                                │  ───────────────────────────>│
   │                                │  <─── JSON response ────────│
   │                                │                              │
   │  <── HTML with chart data ─────│                              │
   │                                │                              │
   │  (client charts hydrate        │                              │
   │   with props data)             │                              │
```

No API routes. No new architectural patterns. Identical to how Users, Subscriptions, Tax Config, and all other dashboard pages work.

---

## Files to Create

### `lib/posthog.ts`

Pure TypeScript module with typed fetch functions calling the PostHog API.

**Functions:**

| Function | PostHog API Endpoint | Returns |
|----------|---------------------|---------|
| `getActiveUsers(period)` | `/api/projects/:id/insights/trend/` (DAU/WAU/MAU) | `{ dau, wau, mau, series[] }` |
| `getTopEvents(period)` | `/api/projects/:id/insights/trend/` (event volume) | `{ events: { name, count }[] }` |
| `getEventBreakdown(period)` | `/api/projects/:id/insights/trend/` (breakdown) | `{ breakdown: { label, value }[] }` |
| `getTotalUsers(period)` | `/api/projects/:id/persons/` (count) | `{ total: number, delta: number }` |
| `getOverview()` | Multiple calls aggregated | Combined stat card data |

**Design:**
- All functions are `async`, throw on error, typed inputs/outputs
- API client configured from `POSTHOG_PERSONAL_API_KEY` + `POSTHOG_PROJECT_ID` env vars
- PostHog base URL: `https://eu.posthog.com` (EU region, matching `EXPO_PUBLIC_POSTHOG_HOST`)

**Authentication:** PostHog Personal API key (`phx_...`). The existing `phc_` key in mobile app env is write-only — a personal key is needed for read access at https://app.posthog.com/settings/user-api-keys.

### `lib/sentry.ts`

Pure TypeScript module with typed fetch functions calling the Sentry API.

**Functions:**

| Function | Sentry API Endpoint | Returns |
|----------|---------------------|---------|
| `getUnresolvedIssues(period)` | `/api/0/projects/:org/:project/issues/` | `{ issues: Issue[], total: number }` |
| `getErrorStats(period)` | `/api/0/projects/:org/:project/stats/` | `{ series: { date, count }[] }` |
| `getPerformanceData(period)` | `/api/0/organizations/:org/events/` (transaction stats) | `{ transactions: { name, p95, p50 }[] }` |
| `getAffectedUsers(period)` | `/api/0/projects/:org/:project/issues/` (aggregated) | `{ count: number }` |
| `getOverview()` | Multiple calls aggregated | Combined stat card data |

**Design:**
- All functions are `async`, throw on error, typed inputs/outputs
- API client configured from `SENTRY_AUTH_TOKEN` + `SENTRY_ORG_SLUG` + `SENTRY_PROJECT_SLUG` env vars
- Sentry base URL: `https://sentry.io/api/0/` or `https://de.sentry.io/api/0/` (region determined by token)

**Authentication:** Uses existing `SENTRY_AUTH_TOKEN` from mobile app env (sntrys_...). Also needs org slug and project slug visible in Sentry dashboard URL.

### `app/(dashboard)/analytics/page.tsx`

Server Component fetching PostHog data and rendering charts.

**Data flow:**
1. Reads `searchParams.range` for period (defaults to `week`)
2. Calls `lib/posthog.ts` functions in parallel (`Promise.all`)
3. Passes data to client chart components

**Layout (4 sections):**

```
┌──────────────────────────────────────────────────────┐
│ Analytics                                    [Week]  │
├──────────┬──────────┬──────────┬──────────────────────┤
│ DAU      │ WAU      │ MAU      │ Total Users          │
├──────────┴──────────┴──────────┴──────────────────────┤
│ Active Users (DAU/WAU/MAU) — LineChart                │
├────────────────────────────────┬──────────────────────┤
│ Top Events — BarChart          │ Event Breakdown Pie  │
└────────────────────────────────┴──────────────────────┘
```

### `app/(dashboard)/monitoring/page.tsx`

Server Component fetching Sentry data and rendering charts.

**Data flow:** Same pattern as analytics page.

**Layout (4 sections):**

```
┌──────────────────────────────────────────────────────┐
│ Monitoring                                    [Week] │
├──────────┬──────────┬────────────────────────────────┤
│ Unresolved│ Affected │ P95 Load Time                 │
│ Issues    │ Users    │                                │
├──────────┴──────────┴────────────────────────────────┤
│ Errors Over Time — AreaChart (stacked)                │
├────────────────────────────────┬──────────────────────┤
│ Top Errors — BarChart          │ Performance by       │
│ (clickable, expand details)    │ Transaction — BarChart│
├────────────────────────────────┴──────────────────────┤
│ Recent Errors — Table (title, count, first/last seen)  │
└──────────────────────────────────────────────────────┘
```

### `components/dashboard/analytics/` — 3 new chart components

| Component | Type | Reuses From |
|-----------|------|-------------|
| `ActiveUsersChart.tsx` | LineChart (3 lines: DAU, WAU, MAU) | `RegistrationsChart` pattern |
| `TopEventsChart.tsx` | Horizontal BarChart | `ModuleChart` pattern |
| `EventBreakdownChart.tsx` | Donut PieChart | `ProfileBreakdownChart` pattern |
| `AnalyticsStatCards.tsx` | 4 stat cards | `stat-card.tsx` component |

### `components/dashboard/monitoring/` — 4 new chart components

| Component | Type | Reuses From |
|-----------|------|-------------|
| `ErrorStatsChart.tsx` | Stacked AreaChart (fatal/error/warning) | `CompletionsChart` pattern |
| `TopErrorsChart.tsx` | Horizontal BarChart | `ModuleChart` pattern |
| `PerformanceChart.tsx` | Horizontal BarChart (p95 per transaction) | `ModuleChart` pattern |
| `ErrorsTable.tsx` | Table with issue rows | `recent-users-table.tsx` pattern |
| `MonitoringStatCards.tsx` | 3 stat cards | `stat-card.tsx` component |

### Sidebar Nav Items

Added to `AppShell` nav array:
- **Analytics** — `ChartLine01Icon` → `href="/analytics"`
- **Monitoring** — `AlertCircleIcon` or similar → `href="/monitoring"`

Both placed above Settings.

---

## Environment Variables

Add these to `cediwise-dashboard/.env.local`:

| Variable | Source | Purpose |
|----------|--------|---------|
| `POSTHOG_PERSONAL_API_KEY` | PostHog dashboard (Settings → User API Keys) | Query PostHog data (phx_... prefix) |
| `POSTHOG_PROJECT_ID` | PostHog dashboard (Project Settings → Project ID) | Identify project in API calls |
| `SENTRY_AUTH_TOKEN` | Already in mobile `.env.local` | Query Sentry data (sntrys_... prefix) |
| `SENTRY_ORG_SLUG` | Sentry dashboard URL (sentry.io/org-slug/) | Identify org in API calls |
| `SENTRY_PROJECT_SLUG` | Sentry dashboard URL (sentry.io/org-slug/project-slug/) | Identify project in API calls |

---

## Prerequisites

Before implementation, you need to:

1. **PostHog personal API key:** Go to https://app.posthog.com/settings/user-api-keys → "Create personal API key" → Copy the `phx_...` key
2. **PostHog project ID:** Go to https://app.posthog.com/project/YOUR_ID/settings → Copy the Project ID (a number)
3. **Sentry org + project slugs:** These are visible in your Sentry URL: `sentry.io/organizations/{org}/projects/{project}/`
4. Add all 5 variables above to `cediwise-dashboard/.env.local`

---

## Testing

- `lib/posthog.ts` and `lib/sentry.ts`: Unit test with mocked fetch responses (Vitest)
- Pages: Verify Server Component rendering with test data
- Charts: Already covered by existing patterns (recharts)
- Auth: Pages inherit dashboard auth guard — no additional auth needed
- Error state: Each chart handles API errors gracefully (empty state + error message)

---

## Error Handling

- If PostHog/Sentry API is unreachable: charts show "Unable to load" message (not a crash)
- If env vars are missing: dev-only warning, production shows empty state
- If data is empty (new project, no events): charts show "No data yet" placeholder
- Follows existing dashboard patterns — all charts receive data as props and handle null/undefined gracefully
