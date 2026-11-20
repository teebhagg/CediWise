# Ghana MoMo SMS Import Design

## Scope

Improve Android MoMo SMS expense import for Ghanaian MTN MoMo, Telecel Cash, and AT Money (formerly AirtelTigo Money). The feature must import only successful wallet-outflow events that the user has explicitly enabled, while preserving manual paste as a fallback. iOS is out of scope.

## Goals

- Avoid uploading unrelated SMS.
- Support provider-specific MTN, Telecel, and AT Money debit formats.
- Distinguish spending from cash withdrawal, own-account movement, received money, failed transactions, and reversals.
- Retain transaction fees separately from principal value.
- Avoid duplicate budget entries and allow uncertain SMS to be reviewed before creating an entry.

## Non-goals

- Replacing provider statements or serving as a ledger of record.
- Scraping MoMo apps, initiating payments, or accessing contacts/call logs.
- Automatic categorisation beyond the existing default category.

## Architecture

The Android app performs a two-stage local decision before any network request:

1. Sender allowlist: normalize the SMS sender and match a provider-specific allowlist.
2. Provider parser: parse a known successful transaction template. Only a high-confidence, outbound candidate proceeds.

The parsed candidate contains provider, transaction type, principal amount, fee, counterparty, transaction ID, balance after, receipt time, and confidence. Normal automatic imports send this structured candidate, not raw SMS. The server validates its schema, provider/event eligibility, amount bounds, idempotency and business rules; it cannot reparse a message it never receives. A raw SMS can be submitted only through the explicit diagnostics flow, then parsed transiently on the server.

For confirmed spending, the server atomically creates a principal budget transaction and, when positive, a separate linked fee transaction. Cash-out and own-account transfers are not budget expenses. Incoming, failed, pending, and unknown messages create no budget transaction. Reversal rules extract both the reversal’s own receipt ID and `reversedReceiptId` (the original receipt/reference being reversed). The server matches first on `(user, provider, reversedReceiptId)` and atomically cancels the linked principal and fee. If the original reference is absent or unmatched, the reversal is a review/no-op; it must never match against the reversal’s own receipt ID. Low-confidence outgoing candidates are returned for the app to show in a review queue.

## Provider and event model

Supported providers are `mtn_momo`, `telecel_cash`, and `at_money`; legacy `airteltigo_money` inputs normalize to `at_money`.

Each parse emits one of: `merchant_payment`, `bill_payment`, `airtime_data`, `p2p_send`, `cash_out`, `bank_transfer`, `wallet_transfer`, `incoming`, `fee`, `reversal`, `failed`, `pending`, or `unknown`.

Only merchant, bill, airtime/data, and user-confirmed P2P events are eligible as expenses. A P2P event whose recipient is detected as the user’s verified own wallet/bank identifier becomes a transfer; if ownership cannot be established, it requires the user to choose Expense or Transfer before submission. A transaction’s fee is represented separately rather than silently folded into principal. Classification is conservative: unrecognized text is ignored locally and never uploaded. Each provider rule has a versioned allowlist of normalized sender aliases, positive final-success markers, debit markers, and fixtures; sender identity alone never qualifies an SMS. Amounts must be valid GHS values within a configured safe range.

## Privacy and consent

Historical import and live listening are separate controls. The permission rationale states which data is read, that parsing happens on-device, and that automatic import is restricted to confirmed transaction alerts from selected providers. The release must use the Google Play SMS-based money-management declaration; if it is rejected or permission is unavailable, the only fallback is manual paste. Consent is per provider and event type. Revoking consent immediately stops listeners, cancels local processing and deletes unsubmitted candidates.

Normal imports transmit structured transaction fields only; raw SMS must be absent from normal request logs, analytics, and persistence. Local candidates are encrypted at rest where platform storage permits, deleted immediately after terminal import/review, and never retained as an inbox mirror. A user can deliberately submit a raw SMS with a parsing-failure report; that opt-in diagnostic record is redacted where possible, access-restricted, excluded from analytics, follows the existing 180-day retention policy, and is deleted through the existing purge mechanism.

## Idempotency and reconciliation

The primary dedupe key is `(user_id, normalized_provider, normalized_receipt_id)` under an immutable database unique constraint. Principal and fee share an import-group ID and are inserted transactionally. If no receipt ID exists, the client supplies a stable random `clientImportId` for retries; the server derives a versioned HMAC with a server-held, rotatable key from the canonical payload—user ID, provider, event type, amount in pesewas, fee in pesewas, receipt time rounded to the second in UTC, normalized counterparty, and the original client rule version. A transactionally enforced unique constraint on `(user_id, client_import_id)` binds that identifier to exactly one canonical-payload hash and import group; the same payload returns its existing outcome, while a changed payload for that ID is rejected. A unique `(user_id, fallback_hmac)` constraint prevents concurrent first requests from creating duplicate fallback imports. The server recomputes this fallback deterministically on every retry using the first accepted canonical payload, so later rule-version changes cannot create a second entry. A collision is surfaced for review rather than merged silently. The message’s post-transaction balance is optional diagnostic metadata, not a source of truth.

## Error handling

- Permission denied or unavailable: preserve manual paste and show a clear recovery action.
- Unsupported or unknown SMS: do nothing and do not upload it.
- Low-confidence outgoing SMS: offer review; never create an entry silently.
- Server/network failure: persist a minimal structured pending item locally, retry with the same `clientImportId` and canonical payload using exponential backoff, and show pending/unknown completion state rather than claiming success after a timeout.
- Duplicate: report success without creating a second transaction.
- Auth/session failure: retain no raw SMS; pause the structured queue and require sign-in before retry.

## Test strategy

Build a redacted fixture suite for each provider covering each supported debit type, incoming funds, cash-out, own-account transfer, fee, reversal, pending/failed, promotion, OTP, Unicode/variant senders, malformed or out-of-range amounts, and an unrelated SMS that resembles a transaction phrase. Tests must assert sender-plus-body matching, type classification, structured fields, no-upload decisions, fee creation, reversal cancellation, and deduplication. Integration tests must cover concurrent retries against the unique constraint, atomic principal-plus-fee creation, consent and permission revocation, manual diagnostic import, and proof that raw SMS is absent from normal requests, server logs, and analytics.

## Rollout

1. Release sender enforcement and no-upload filtering behind the existing feature flag.
2. Add provider fixtures and parser coverage, initially surfacing low-confidence candidates for review.
3. Enable automatic import only after production monitoring confirms acceptable false-positive and duplicate rates.
