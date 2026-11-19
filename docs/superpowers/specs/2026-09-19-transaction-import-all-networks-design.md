# Transaction Import: All Networks, Layman Paste, Scan Loading

## Goal

On Transaction import, people do not choose a mobile-money network. MTN MoMo, Telecel Cash, and AT Money are always included. The paste path uses everyday language (no “provider,” no “fallback”). Scan messages shows a loading state on the button while inbox data is read.

## Scope

**In scope**

- [cediwise-mobile-app/app/profile/import-sms.tsx](../../../cediwise-mobile-app/app/profile/import-sms.tsx)
- Provider flags and `setProviderEnabled` usage in [cediwise-mobile-app/hooks/useSmsImport.ts](../../../cediwise-mobile-app/hooks/useSmsImport.ts) and [cediwise-mobile-app/stores/smsTrackingStore.ts](../../../cediwise-mobile-app/stores/smsTrackingStore.ts)
- Provider-choice copy on the Automatic capture settings row on this screen
- Scan-button busy state on Transaction import
- Related unit tests for scan filtering and store hydrate
- Audit only: confirm `MoMoTrackingSettingsDialog` and profile MoMo setup have no network switches (Auto-add switch stays)

**Out of scope**

- New networks or SMS parser / category rules
- Review-list layout, classification chips, or save-selected flow
- Permission-request copy beyond removing “provider” where it appears on this screen
- iOS Shortcuts setup, except: if a network picker exists there, do not add one; do not build a new iOS import UI
- Profile Android row copy such as “Add one MTN or Telecel payment manually” (leave for a later pass)
- Server SMS import API

## Units

| Unit | Does | Interface | Depends on |
| --- | --- | --- | --- |
| Import screen | Layout, copy, scan button busy state, paste fields | User taps Scan / paste / settings | `useSmsImport` |
| Tracking store | Persist three network flags always on | Store `hydrate` calls `ensureAllProvidersEnabled` before finish; hook `hydrateUserTracking` only invokes store `hydrate` | AsyncStorage |
| SMS import hook | Scan, live capture, native configure always pass all three networks | Existing `scanHistory`, `importOneMessage`; no UI calls `setProviderEnabled` | Store, inbox reader, filters |
| Settings UI | Audit: no network picker | Auto-add and permissions only | Already shipped |

## Screen structure

Keep one scroll. Remove the **Providers** card and its three switches.

1. **Status card.** Same jobs as today (permission, paused, queue, checking, active). Exact detail strings are in Copy. Network names appear only on the idle active line, as coverage, not as a control.
2. **Message history (scan).** Keep 2 / 7 / 30 day chips and helper: nothing is added until review. Primary action: **Scan messages**.
3. **Review transactions.** Unchanged when results exist.
4. **Add a payment yourself.** Replaces the “Manual fallback” eyebrow. Remove the inner heading **Paste a message**. The eyebrow plus helper are the only titles for this block.
5. **Automatic capture settings** row. Subtitle must not mention choosing networks. Example: `Permissions and background status`.

## Copy

Do not use “provider” or “fallback” on this screen.

| Place | Copy |
| --- | --- |
| Status: permission | Keep title. Detail: `Allow SMS access to scan and capture mobile money transactions.` |
| Status: paused | Keep title. Detail: `Manual scans and pasted messages remain available.` |
| Status: queue waiting | Keep `{n} waiting` title. Detail: `Captured securely and waiting to sync or review.` |
| Status: checking (inbox scan or save) | Title: `Checking messages`. Detail: `CediWise is reading recent payment messages.` |
| Status: active, never checked | Title: `Automatic capture active`. Detail: `Ready for MTN, Telecel, and AT Money messages.` |
| Status: active, has last check | Title: `Automatic capture active`. Detail: keep `Last checked {local datetime}`. |
| Paste section eyebrow | `Add a payment yourself` |
| Paste helper | `Paste the SMS text from your inbox.` Secondary: `Available even when SMS permission is off.` |
| Sender label | `Who sent this SMS? (optional)` |
| Sender placeholder | `The name at the top of the message` |
| Message label | `Message` |
| Message placeholder | `Paste the complete transaction message` |
| Paste primary button | `Add this payment` |
| Scan idle | `Scan messages` |
| Scan busy | `Scanning…` |
| Short paste error | `Paste the full SMS text` |
| Scan empty toast | Keep existing: no eligible expenses in this period |
| Scan error toast | Keep existing: could not scan; show error message |

Buttons stay verb + object. Network names are allowed only as status/coverage text, not as a picker or sender hint list.

## Always include every network

Store keys stay `mtn_momo`, `telecel_cash`, `at_money`. They are no longer a user preference.

Export one shared list (e.g. `ALL_MOMO_NETWORKS` in `constants/smsImport.ts`): `mtn_momo`, `telecel_cash`, `at_money`. Scan, live configure, and native configure all use that list. Do not filter user-facing paths by stored flags.

- Default remains all three `true`.
- Persist all-on **only** in store `hydrate` (via `ensureAllProvidersEnabled`). Hook `hydrateUserTracking` stays a thin caller. That already runs on import-screen mount, Android Profile setup, and `MoMoSmsImportLifecycle` at signed-in start. Do not add extra writes on Profile navigation or settings open. Settings remains an audit: no network picker to add or remove unless one is found.
- Existing users who stored a network as `false` are turned back on at next hydrate, with no banner.
- `setProviderEnabled` is not called from UI. If it remains for tests, it only writes storage flags and **does not** call `configureNativeMoMoCapture`. All real configure call sites pass `ALL_MOMO_NETWORKS`.

Parser still infers the network from the SMS sender/body. That is implementation, not a user choice.

## Scan loading

Inbox scan and save-review must not share one busy flag on the Scan button.

- `scanningInbox` and `savingReview` are **screen-local** on Transaction import. Keep existing hook `syncing` for Profile / live catch-up. Do not reuse `syncing` for the Scan button or Add-N button.
- `scanningInbox` drives **only** the Scan messages button: spinner, **Scanning…**, disabled, ignore second tap. Set it around `scanHistory`.
- Scan and save exclude each other through a synchronous ref guard taken at entry, not only through state. `scanningInbox` is set on the first tap, before the SMS permission check or request is awaited, so Add-N is disabled and ignored for the whole permission wait. The guard is released in `finally`.
- `savingReview` drives **only** the review **Add N transactions** loading state. Set it around `saveCapturedExpenses`.
- Scan and save must not run together. While `scanningInbox`, Add-N is disabled and taps are ignored. While `savingReview`, Scan is disabled and taps are ignored. No overlapping writes; there is no winner rule because the second action never starts.
- Paste (`Add this payment`) may run while scan or save is idle only. While `scanningInbox` or `savingReview`, disable paste submit.
- Status card uses **checking** copy when `scanningInbox || savingReview`.
- On success, empty, or error: clear scan busy, enable Scan messages, restore **Scan messages**.
- A successful or empty scan **replaces** any unsaved review list (today’s behavior).
- No results-area skeleton. Review list appears only after the scan returns items.
- Day chips stay tappable while scanning. The in-flight call uses the days value from tap time.

Minimum height 44pt. Spinner is decorative. Accessibility label: `Scanning messages` while busy, `Scan messages` when idle. No extra bounce or scale. Reduced motion: keep the spinner as a progress cue.

## Paste path

Sender stays optional and is never a network picker. Parse path unchanged (`importOneMessage` with body + optional address).

## Error handling

| Case | Behavior |
| --- | --- |
| SMS permission denied on scan | Existing info toast; offer that they can still paste; no hang on Scan button |
| Scan throws | Error toast; button returns to idle |
| Scan returns zero expenses | Info toast; button idle; no review list |
| Paste shorter than 20 chars | Error: paste the full SMS text |
| Paste parse fail | Existing review-needed / import-failed toasts |

## Testing

- Hydrate / ensure-all-on writes all three flags true even if storage had a `false`.
- `scanHistory` includes MTN, Telecel, and AT Money messages when stored flags were mixed.
- Native configure receives all three network ids when Auto-add is on.
- Scan button: idle label; in-flight disabled + Scanning…; after resolve (success, empty, error) back to idle.
- Import screen and settings have no provider Switch.
- Paste short-message copy does not say “provider.”

## Non-goals

Do not add a “select all networks” control. Do not copy production data. Do not change EAS / env wiring.
