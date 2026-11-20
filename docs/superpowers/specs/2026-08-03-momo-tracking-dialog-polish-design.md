# MoMo Tracking Dialog Polish Design

## Goal

Tighten the MoMo tracking dialogs so they match the rest of CediWise’s `AppDialog` language: logout-style header icons, a calmer **Tracking active** status strip, and human-readable last-checked times.

## Scope

**In scope**

- `MoMoEnableDialog`
- `MoMoTrackingSettingsDialog`
- `MoMoSmsExpenseReviewDialog`
- Last-checked formatting used by the Tracking active panel

**Out of scope**

- SMS sync / import logic
- Expense review list content (amount, category, note)
- Dialog button copy or action order
- AppDialog shell layout (except consuming its default icon wrap)
- Shared `InsetSurface` styling (Enable body + Auto-add toggle keep current look)
- `formatSmsExpenseDate` / expense-row date labels (unchanged)

## Design decisions

### 1. Icon header (Logout parity)

Pass a bare Lucide icon into `AppDialog`’s `icon` prop, same pattern as `LogoutModal`:

- Size `22`
- Color kept per dialog (emerald for enable/review, violet for settings)
- Remove `DialogIconBadge` (tinted square + border + shadow) and its usages
- Remove `iconContainerStyle={styles.iconWrapReset}` so AppDialog’s default circular `iconWrap` (40×40) shows

Applies to all three MoMo dialogs listed above.

### 2. Tracking active panel (soft status strip)

Keep the existing information hierarchy:

1. Status label + live emerald dot (`Tracking active`)
2. Primary line: last checked (human-readable)
3. Optional secondary line: last sync result

Visual refinements — **StatusPanel only**:

- **Stop wrapping `InsetSurface`.** Render StatusPanel as its own `View` with dedicated styles. Shared `InsetSurface` (Enable body + Auto-add toggle) stays untouched.
- Soft emerald-tinted fill (`rgba(16, 185, 129, 0.06)`); **no border**
- Corner radius `16` (match review item cards)
- Emerald status dot: `8×8`, soft glow via light shadow
- Typography: quiet uppercase label, stronger primary time, muted result line
- No pills, side accent rails, or extra badges

### 3. Last-checked time (relative + calendar hybrid)

Replace `formatLastChecked` in `MoMoTrackingDialogs.tsx` with a **dedicated** helper. Do **not** share with or change `formatSmsExpenseDate` (rules diverge: relative &lt;6h, `N days ago` vs weekday, empty-string handling).

**File:** `cediwise-mobile-app/utils/formatLastChecked.ts`

**Signature:**

```ts
export function formatLastChecked(
  iso: string | null,
  nowMs: number = Date.now(),
): string
```

**Validity:** Treat as invalid when `iso` is null/empty, or `new Date(iso).getTime()` is `NaN`. Do not rely on throw — JS date parsing does not throw on bad strings.

**Ordered rules (first match wins):**

1. Missing / invalid → `Not checked yet`
2. `ts > nowMs` (clock skew) → `Just now`
3. `ageMs < 60_000` → `Just now`
4. `ageMs < 3_600_000` → `N minute(s) ago` (`floor(ageMs / 60_000)`)
5. `ageMs < 21_600_000` (6 hours) → `N hour(s) ago` (`floor(ageMs / 3_600_000)`)
6. Same local calendar day → `Today at h:mm A`
7. Previous local calendar day (calendar day difference === 1) → `Yesterday at h:mm A`
8. Local calendar day difference `d` where `2 ≤ d ≤ 6` → `N days ago` (`N = d`)
9. Same local calendar year → `D MMM at h:mm A` (e.g. `8 Jul at 3:19 PM`)
10. Else → `D MMM YYYY at h:mm A` (e.g. `8 Jul 2025 at 3:19 PM`)

**Calendar day difference:** start-of-local-day(`nowMs`) − start-of-local-day(`ts`), in whole days (not `floor(ageMs / 86400000)`). Relative bands (steps 3–5) are evaluated before Today/Yesterday so a timestamp from “yesterday” that is still &lt; 6 hours old shows as relative hours, not Yesterday.

Pluralization: `1 minute ago` / `2 minutes ago`; `1 hour ago` / `2 hours ago`; `2 days ago` … `6 days ago`.

## Architecture / units

| Unit | Responsibility | Depends on |
| --- | --- | --- |
| `utils/formatLastChecked.ts` | Pure ISO → human string for Tracking active | `moment` (already in app) |
| `MoMoTrackingDialogs` | Render MoMo dialogs; bare icons; StatusPanel styles; call `formatLastChecked` | `AppDialog`, date helper |
| `AppDialog` | Unchanged default circular icon wrap | — |

No API, store, or sync changes.

## Error / edge cases

- `lastSyncAt` null / empty → `Not checked yet`
- Invalid date parse (`NaN`) → `Not checked yet`
- Future `lastSyncAt` (clock skew) → `Just now`
- No `lastSyncSummary` → omit secondary result line
- Relative thresholds use injectable `nowMs` (device local calendar for Today/Yesterday/year)

## Testing

Unit tests in `cediwise-mobile-app/utils/__tests__/formatLastChecked.test.ts` covering each age band with fixed `nowMs`. Smoke: open Enable / Settings / Review dialogs — circular icon wrap (no square badge); Settings status strip soft fill, no border, radius 16.

## Success criteria

- MoMo dialog icons match Logout / other AppDialog headers
- Tracking active panel feels softer and clearer without new chrome; Enable/Auto-add `InsetSurface` unchanged
- Last-checked time follows the table above exactly
- Expense review dates unchanged
