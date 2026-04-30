# Migrations

## Bootstrap order

1. **Link** — `supabase login` then `supabase link --project-ref etilowirjbuyknsfdtpt`
2. **Baseline** — `supabase db pull`  
   Creates `YYYYMMDDHHMMSS_remote_schema.sql` and stamps `supabase_migrations.schema_migrations` on the remote. Commit that file.
3. **Verify** — `supabase db diff --linked` must print nothing.
4. **Drift fix** — `99999999999999_fix_schema_drift_if_missing.sql` is already in this folder; it sorts **after** any real pull timestamp from 2026–2099.  
   If `db pull` generated a migration with a timestamp *newer* than `99999999999999`, rename this file to a timestamp **after** the baseline (e.g. `20300101000000_...`) before first `db push`.
5. **Push** — `supabase db push --dry-run`, then `supabase db push`

## New changes

Always use:

```bash
supabase migration new describe_change
```

Never edit applied migration files; add a new timestamped file instead.
