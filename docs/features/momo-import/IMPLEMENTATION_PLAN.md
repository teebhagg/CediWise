# MoMo import: implementation plan

**Last reviewed:** 2026-10-27  
**Status:** Proposed release sequence; source changes and production rollout are separate.

## Phase 1 — deployment and policy readiness

1. Confirm current Google Play SMS permission eligibility and complete the required declaration/review.
2. Confirm the intended Supabase production project and compare remote migration history with the three import migrations.
3. Run the duplicate/reconciliation preflight for the retry/idempotency migration and schedule it during an approved low-traffic window if needed.
4. Confirm server-side HMAC/credential secrets, endpoint URL, retention schedule and feature-flag owner.
5. Keep live capture disabled until all previous items have evidence.

## Phase 2 — behavior and privacy validation

1. Exercise manual import, Android capture, permission revocation, reboot recovery, retries, reversal messages, duplicates and budget-cycle recovery.
2. On supported devices, verify logout/account-switch clears queue, transient auth/gate/permission loss preserves same-user items, and structured uploads contain no raw SMS. Review the legacy raw endpoint and diagnostics/retention path separately.
3. Source tests now cover request bounds, structured category selection, legacy dedupe-key handling and client queue pausing. Still exercise database RPC outcomes for each candidate class, reversals, concurrent retries and service-role assumptions against a disposable project.
4. Verify iOS handoff/manual behavior independently rather than assuming Android parity.

## Phase 3 — staged release

1. Produce a signed release artifact with reviewed permissions and the approved flag configuration.
2. Validate imports with opted-in internal testers and observe privacy-safe failure counters.
3. Expand rollout only after support, deletion, retention and incident-response steps are confirmed.

**Release evidence to capture:** target project and non-production test endpoint, migration versions, secret names (never values), permission declaration decision, artifact hash, device/OS matrix, test outcomes and rollout decision. Development/preview endpoint configuration is still unverified; keep live Auto-add disabled until it is intentionally configured and validated.
