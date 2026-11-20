# MoMo SMS Category Rules Design

## Problem

SMS-imported expenses used a blind fallback (`Others → Transport → Groceries`). Airtime and other MoMo payments often landed on Transport even when a better seeded category existed.

## Approach (option A)

Deterministic rules on the server at insert time, using parsed counterparty + raw SMS text:

| Signal | Prefer (if present in cycle) |
|---|---|
| airtime / data / internet / bundle | Data Bundles → Others |
| ECG | ECG |
| Ghana Water / GWCL | Ghana Water |
| else | Others → Transport → Groceries → first wants → first category |

Never create categories. Match is case-insensitive substring. Transaction `bucket` follows the matched category (`needs` / `wants` / `savings`).

## Non-goals

Fuzzy name matching, AI, learning from user edits, mobile-side category selection.

## Files

- `server/lib/sms-import/categoryRules.ts` — pure rule map
- `server/lib/sms-import/insert.ts` — uses rules when creating the expense
