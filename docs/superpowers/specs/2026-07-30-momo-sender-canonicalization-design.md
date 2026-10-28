# MoMo SMS Sender Canonicalization Design

## Problem

Android MoMo alerts sometimes arrive from sender `MobileMoney` (no space). The on-device allowlist matched `MOBILE MONEY` (with space) and `MOMO`, neither of which is a substring of `MOBILEMONEY`. Those SMS never left the device, so airtime and other wallet-outflow payments were not imported as expenses.

## Goal

Treat spacing/punctuation variants of known Ghana MoMo senders as the same identity for allowlist matching, without loosening the body-pattern gate.

## Approach

Canonicalize the sender before matching:

1. Trim, uppercase, strip non-alphanumeric characters (`MobileMoney` → `MOBILEMONEY`, `AT-Money` → `ATMONEY`).
2. Match `MOMO_SENDER_HINTS` against the canonical form (hints canonicalized the same way).
3. Infer provider on the canonical string; treat `MOBILEMONEY` as `mtn_momo` explicitly (it does not contain `MOMO`).
4. Keep the raw address for display and API payloads.

## Non-goals

- Server parser changes (airtime body already parses as expense once uploaded).
- Full short-code allowlist audit.
- Changing which body formats count as expenses vs transfers.

## Testing

- Unit: `MobileMoney` + airtime body accepted; `Mobile Money` / `AT-Money` still accepted; unrelated senders rejected.
- Manual: rebuild Android app, “Check recent payments”, confirm GHS 2.00 MTN AIRTIME creates an expense.
