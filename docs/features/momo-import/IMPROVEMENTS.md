# CW-MOB-13 — MoMo import improvements

**Last reviewed:** 2026-10-28  
**Evidence basis:** `docs/features/momo-import/CURRENT_STATE.md`; `cediwise-mobile-app/hooks/useSmsImport.ts`, `services/{androidMoMoQueue,androidSmsListener,androidSmsPermissions,androidSmsReader,iosMomoHistoryHandoff,smsImportClient}.ts`, `utils/featureFlags.ts`, `eas.json`, `cediwise-web-official/server/api/v1/sms-import.post.ts` and local migrations. No signed build, remote project, Play review or device behavior was checked.

## A. Fix existing defects

No confirmed data-loss or parsing defect was reproduced in this source review. Live import is deliberately hard-gated off in the checked-in EAS profiles; this is a verified release limitation, not necessarily a defect.

### A1. Keep automatic import behind an explicit release-readiness contract — P1

- **Evidence:** **Verified:** `eas.json` sets `EXPO_PUBLIC_MOMO_SMS_LIVE_IMPORT=false` in examined profiles and `utils/featureFlags.ts` gates the live path. **Needs Validation:** whether product intends production Auto-add and whether policy/schema/secret/device gates are satisfied. Source path: `cediwise-mobile-app/hooks/useSmsImport.ts`.
- **User benefit:** Prevents users being promised an unavailable or unreviewed background capture workflow.
- **Approach:** Document intentional availability by platform/build; enable only after permission disclosure, consent/revocation, migrations/RPC, secret rotation, policy review, signed-build and device gates have named owners and pass evidence.
- **Complexity:** L.
- **Dependencies:** Android native build, Play policy, Supabase migrations/RPC, server secret, EAS profiles and support readiness.
- **Risks:** A static flag can drift from the installed build or server configuration; pair it with runtime capability diagnostics and fail-closed behavior.
- **Test strategy:** Release preflight assertions plus supported-device tests for permission grant/revocation, background capture, retry, logout/account switch, duplicate and API rejection; do not infer readiness from source tests.
- **Priority:** P1; release-blocking if automatic import is advertised before these gates pass.

## B. Refine existing capabilities and workflows

### B1. Make manual, iOS Shortcut and Android automatic paths explicit — P2

- **Evidence:** **Verified:** manual/history review exists; iOS uses user-configured Shortcuts handoff, while Android has native capture source. iOS is not general inbox scanning (`app/profile/import-sms.tsx`, `services/iosMomoHistoryHandoff.ts`). Source path: `cediwise-mobile-app/hooks/useSmsImport.ts`.
- **User benefit:** Users know what each platform actually imports and whether a message is saved automatically or only after review.
- **Approach:** Show per-platform method, permission state, last capture/sync, pending review count and a reason when unavailable; preserve explicit review before saving candidate transactions.
- **Complexity:** M.
- **Dependencies:** `useSmsImport`, native permission state, feature gate and profile import UI.
- **Risks:** “Last checked” may imply complete inbox coverage; label foreground/background and date-window limits accurately.
- **Test strategy:** UI state tests for unsupported, disabled, denied, queued and ready states; accessible permissions and candidate-review walkthroughs on Android/iOS.
- **Priority:** P2.

## C. Add high-value enhancements

### C1. Add safe correction, reversal and import history — P2

- **Evidence:** **Needs Validation:** source review shows candidate preview/import and duplicate protections, but a complete user-facing correction/reversal history contract is not established. Relevant source: `cediwise-mobile-app/eas.json`.
- **User benefit:** Users can repair an incorrect category/amount or undo an imported transaction without creating unexplained duplicates.
- **Approach:** Keep an import provenance ID on the resulting transaction; provide edit/reverse actions that use existing transaction mutation/idempotency rules and preserve the original message body minimization policy.
- **Complexity:** M.
- **Dependencies:** `budget_transactions`, import identifiers/RPC, expense editing and dedupe semantics.
- **Risks:** Reversal can conflict with later edits or duplicate detection; use explicit linked reversal events and confirmation.
- **Test strategy:** Import/edit/reverse/reimport cases, duplicate webhook and account ownership integration tests, with sensitive-body redaction assertions.
- **Priority:** P2.

## Requirements to resolve

- Is Auto-add intended to ship, and on which Android versions and in which regions?
- Does iOS Shortcut import receive supported-product status or remain a manual workaround?
- What raw SMS retention, queue lifetime, correction and user-consent rules are required?

