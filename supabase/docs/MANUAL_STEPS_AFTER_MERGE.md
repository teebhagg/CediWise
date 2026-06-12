# Manual steps after merge (requires Supabase credentials)

These steps **cannot** be completed in a sandbox CI without your access token and DB password.

1. **PITR / dashboard backup** — per [OPERATOR_PREFLIGHT.md](OPERATOR_PREFLIGHT.md).
2. **Local dumps** — `DATABASE_URL=... ./scripts/backup-supabase-prod.sh`
3. **Link + baseline** — `./scripts/sync-remote-baseline.sh`  
   This runs `supabase login`, `supabase link --project-ref etilowirjbuyknsfdtpt`, `supabase db pull`.
4. **Verify** — `supabase db diff --linked` (empty output).
5. **Rename drift migration if needed** — if the new `*_remote_schema.sql` filename sorts **after** `99999999999999_fix_schema_drift_if_missing.sql`, rename the drift file to a **later** timestamp so order is: baseline → drift fix.
6. **Second backup** — run `backup-supabase-prod.sh` again into `backups/pre-push-<ts>/`.
7. **Push** — `supabase db push --dry-run` then `supabase db push`.
8. **Regenerate** — `supabase db dump --schema public -f supabase/schema.generated.sql` and commit.

9. **Redeploy Edge Functions** — from repo root, especially if production still uses the old name `paystack-initiates`:

   ```bash
   supabase functions deploy paystack-initiate
   supabase functions deploy paystack-webhook
   supabase functions deploy send-announcement
   supabase functions deploy generate-reminders
   ```

10. **Schedule weekly AI expense reminders** — after `generate-reminders` is deployed and migrations for `scheduled_reminders` are applied:

   Generate a dedicated cron secret (do not send the service role key in cron HTTP headers):

   ```bash
   openssl rand -hex 32
   supabase secrets set CRON_SECRET="<your-cron-secret>"
   ```

   Store the same value in Vault as `cron_secret`, then schedule cron:

   ```sql
   SELECT cron.schedule(
     'generate-reminders',
     '0 0 * * 0',
     $$
     SELECT net.http_post(
       url := 'https://etilowirjbuyknsfdtpt.supabase.co/functions/v1/generate-reminders',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'x-internal-service-token', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1)
       )
     ) AS request_id;
     $$
   );
   ```

   Manual smoke test:

   ```bash
   curl -X POST "https://etilowirjbuyknsfdtpt.supabase.co/functions/v1/generate-reminders" \
     -H "x-internal-service-token: $CRON_SECRET"
   ```
