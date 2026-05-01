# Database backups (local, gitignored)

This directory holds **operator-run** dumps before production changes. Nothing here is committed.

## 1. PITR (primary recovery)

Before any migration work, take a **Point-in-Time Recovery** snapshot in the Supabase dashboard (Project → Database → Backups / PITR per your plan tier).

## 2. Full local dump (secondary recovery)

Set `DATABASE_URL` to the **direct** Postgres URI (port `5432`, not the pooler `6543`):

```bash
export DATABASE_URL='postgresql://postgres:YOUR_PASSWORD@db.etilowirjbuyknsfdtpt.supabase.co:5432/postgres'
./scripts/backup-supabase-prod.sh
```

Or use the script’s `CONN` override. Outputs go to `backups/dump-<UTC-timestamp>/`.

## 3. Non-schema infrastructure inventory

After connecting with `psql`, fill in `backups/nonschema-infra-<ts>.md` using the checklist in [supabase/docs/database-change-workflow.md](../supabase/docs/database-change-workflow.md) (extensions, buckets, cron, Realtime, Vault, Edge secrets).
