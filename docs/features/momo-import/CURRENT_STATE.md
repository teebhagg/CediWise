# CW-MOB-13 — MoMo transaction import

**Last reviewed:** 2026-10-28  
**Evidence status:** Source paths and local configuration reviewed. EAS profiles, remote migrations/secrets, Play approval and real-device behavior were not independently verified in this pass.

## 1. Purpose and problem solved

Reduces manual entry by identifying mobile-money messages and proposing budget transactions for user review or (when enabled) automatic insertion.

## 2. Target user and expected outcome

Users who receive MoMo payment messages and want those transactions represented in their budget. Expected outcome: import a correctly dated, categorized amount with duplicate protection and clear control over consent and automatic capture.

## 3. Current capabilities and journey

Profile route supports manual/historical import and Android tracking setup. Android source includes foreground parsing, SMS listener/reader, native background queue, catch-up, categorization and candidate review. iOS uses a user-created Shortcuts history handoff; it is not general inbox scanning. The web Nitro API accepts validated import candidates and persists them into budget transactions. Local source flags keep live Auto-add disabled in the examined EAS profiles. User-reviewed imports remain a separate workflow.

## 4. Screens, components, hooks, services, persistence

- Screen: cediwise-mobile-app/app/profile/import-sms.tsx and profile tracking controls.
- Client: hooks/useSmsImport.ts; services/smsImportClient.ts; Android permission/reader/listener/queue helpers; iOS handoff and catch-up helpers; candidate/filter/preview/category helpers.
- Native: cediwise-mobile-app/native/momo-sms/ and Android configuration in app.json.
- API: cediwise-web-official/server/api/v1/sms-import.post.ts and server/lib/sms-import/.
- Tables/migrations: sms_import_logs, sms_webhook_credentials, budget_transactions; local migration sources include structured import, idempotency and retention changes.
- Integrations: Android SMS/WorkManager APIs, Supabase Auth, Nitro endpoint, local notifications; Apple Shortcuts is user configured.

## 5. Business rules, validation, calculations, edge cases

Source validates payload size/shape, sender/timestamp bounds, structured candidate fields, user authentication/webhook credentials, and deduplicates through stable identifiers. Category resolution uses event type/counterparty and the budget cycle covering the message date. A queue is paused/retained when fresh auth, the live gate or permissions are unavailable; opt-out/logout/account change clear account-bound items. Raw message content is not intended to be transmitted on the structured Android path. Local source includes a 180-day purge function/schedule, but remote activation is unverified.

## 6. Loading, empty, success, error, offline

Source has candidate review, manual import, queued/pending items, permissions/setup checks and catch-up watermarks. Offline capture can be queued locally on Android; upload requires network and authentication. Exact permission revocation, background termination, delayed SMS, duplicated delivery, retry after server rejection, queue encryption behavior across OS versions and iOS Shortcut execution were not exercised. Installed build flag values were not checked.

## 7. Dependencies

Depends on notification and SMS permissions, Android native build integration, auth refresh, budget categories/cycles, server API deployment, webhook secret, database migrations/RPCs, and platform policy. iOS depends on the user's Shortcut configuration and foreground handoff. Auto-add also depends on the EAS feature gate.

## 8. Functional limitations and confusing flows

Automatic import is disabled by the checked-in development/preview/production profiles; users have manual/history routes, but release behavior may differ by installed artifact. iOS uses Shortcut handoff, so platform parity is limited. SMS permission approval and Play eligibility are external gates. Different import pathways may have different confirmation and duplicate semantics; full device exercise is required.

## 9. Defects and failure modes

- **Confirmed release limitation:** eas.json sets EXPO_PUBLIC_MOMO_SMS_LIVE_IMPORT=false across the examined profiles, and the app feature flag hard-gates the live pathway. This is a disabled capability in source configuration, not proof of a defect if intentional.
- **Potential failure modes (Needs Validation):** permission revocation, missing remote RPC/migration, absent HMAC secret, background worker retries, old queued data, or OS scheduling can interrupt import.
- Historical project docs record production migration/secret gaps and source-only readiness findings; those dated claims were not refreshed against remote systems in this audit.

## 10. Performance, accessibility, security, testability

SMS content and account-linked transaction data are sensitive. Validate least-privilege permission, raw-body minimization, encryption/key lifecycle, HMAC rotation, log retention and deletion. Queue and upload behavior has platform-specific complexity; benchmark only on device. Permission dialogs and review screens require accessibility testing. Source-only behavior does not establish Play policy compliance or end-to-end test coverage.

## 11. Missing capabilities and requirements to confirm

Confirm whether Auto-add is intended for production, supported Android versions/devices, precise data-retention/consent policy, supported providers/message formats, category correction flow, import history/reversal, and whether iOS Shortcuts are a supported feature or workaround. Confirm required policy approval and migration/secret release gates.

## 12. Proposed improvements

- **Quick wins:** explain manual vs automatic import availability and why a permission/feature gate blocks it; show last successful capture/sync time.
- **Medium effort:** publish a release checklist for permissions, migration, secret and device verification; add failure telemetry without retaining message bodies; cover duplicate/retry/permission-revocation cases.
- **Substantial:** standardize platform adapters behind one reviewed candidate-and-consent contract, with explicit recovery and audit controls.

## Source map

See section 4; related docs/features/budget-tracking/CURRENT_STATE.md, docs/audits/SECURITY_AUDIT.md, docs/architecture/DATA_FLOW.md.

