# CediWise — Supabase (canonical)

All database migrations, Edge Functions, and seeds for the shared Supabase project **`etilowirjbuyknsfdtpt`** live **at this repo root** (`/supabase`), not inside individual app folders.

## Quick commands

| Goal | Command |
| --- | --- |
| First-time link + baseline | `./scripts/sync-remote-baseline.sh` |
| New migration | `supabase migration new short_description` |
| Apply to production | `supabase db push` (after `supabase link`) |
| Dry run | `supabase db push --dry-run` |
| Pick up ad-hoc prod edits | `supabase db pull` → commit new file |
| Local reset (all migrations + seeds) | `supabase db reset` |
| Regenerate schema snapshot | `supabase db dump --schema public -f supabase/schema.generated.sql` |

**Operator checklist before first push:** [docs/OPERATOR_PREFLIGHT.md](docs/OPERATOR_PREFLIGHT.md)

**Full workflow & governance:** [docs/database-change-workflow.md](docs/database-change-workflow.md)

## Layout

```
supabase/
  config.toml          # CLI config (from supabase init)
  migrations/          # ONLY source of DDL for production
  functions/           # Edge Functions (deploy: supabase functions deploy <name>)
  seeds/               # Optional seed data for local db reset
  schema.generated.sql # Read-only DDL snapshot (regenerate after changes)
  docs/                # Runbooks + non-schema inventory template
```

## Rules

1. **No hand-edited SQL in the Supabase Dashboard** on production once this workflow is active — changes go through PRs and `supabase/migrations/*.sql`.
2. **Never re-apply** files under [`/legacy`](../legacy/) — they are archived only.
3. **Baseline first:** `supabase db pull` must run once to create `*_remote_schema.sql` before relying on `db push` for new environments.
4. **Drift fix:** `99999999999999_fix_schema_drift_if_missing.sql` must sort **after** the baseline file. If your baseline timestamp is lexicographically larger, rename the drift file.

## Edge Functions (current)

| Directory | Purpose |
| --- | --- |
| `paystack-initiate` | Hosted checkout / Paystack initialize (`SUPABASE_ANON_KEY` required for `getUser`) |
| `paystack-momo-charge` | Ghana MoMo `POST /charge` + idempotency (`SUPABASE_ANON_KEY`) |
| `paystack-momo-status` | Poll transaction by reference (`SUPABASE_ANON_KEY`) |
| `paystack-webhook` | Paystack event handler (reference idempotency via `paystack_applied_charges`) |
| `subscription-janitor` | Hourly (see `config.toml`): MoMo `next_billing_date` overdue → grace; expire finished grace when `ENABLE_AUTO_DOWNGRADE=true` |
| `send-announcement` | Admin announcements |
| `daily-cash-flow-check` | Scheduled / utility |
| `delete-account` | User account deletion |

Deploy naming matches folder name (rename from legacy `paystack-initiates` → **`paystack-initiate`**).

## Table ownership (PR review)

| Area | Owns (examples) |
| --- | --- |
| Mobile product | `subscriptions`, `profiles`, `budget_*`, `sme_*`, `debts`, `recurring_expenses`, `vaults`, `flm_*` |
| Dashboard | `admin_users`, `subscription_activity_log`, `sms_campaigns`, `email_campaigns`, `announcements` |
| Web official | `feedback`, `app_versions` |

## Seeds

Configured in `config.toml` → `[db.seed]` → `sql_paths`. Loaded **after** migrations on `supabase db reset` only.
