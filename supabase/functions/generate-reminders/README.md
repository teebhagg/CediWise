# generate-reminders

Generates 1 AI-personalized weekly expense reminder per user using Groq LLaMA 3.1. Stores results in `scheduled_reminders` (`scheduled_day = monday`) for the mobile app to schedule a single weekly local notification.

## Schedule

Run weekly on Sunday 00:00 UTC via Supabase cron.

1. Generate a dedicated cron secret (do **not** reuse the service role key in HTTP headers):

   ```bash
   openssl rand -hex 32
   ```

2. Store it in Vault as `cron_secret` and set the same value on the Edge Function:

   ```bash
   supabase secrets set CRON_SECRET="<your-cron-secret>"
   ```

3. Schedule cron (replace `PROJECT_REF`):

   ```sql
   SELECT cron.schedule(
     'generate-reminders',
     '0 0 * * 0',
     $$
     SELECT net.http_post(
       url := 'https://PROJECT_REF.supabase.co/functions/v1/generate-reminders',
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
curl -X POST https://PROJECT_REF.supabase.co/functions/v1/generate-reminders \
  -H "x-internal-service-token: $CRON_SECRET"
```

During rollout, if `CRON_SECRET` is unset, the function falls back to accepting `SUPABASE_SERVICE_ROLE_KEY` as the internal token. Prefer setting `CRON_SECRET` before production cron.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (bypasses RLS) |
| `CRON_SECRET` | Recommended | Dedicated token for cron/manual triggers (`x-internal-service-token`) |
| `GROQ_API_KEY` | Yes | Groq API key for LLaMA 3.1 |

## How It Works

1. Validates `x-internal-service-token` against `CRON_SECRET` (or service role key during rollout)
2. Paginates profiles opted in to `N-REMINDER`
3. Skips users without active push devices or who already have rows for the current ISO week
4. Calls Groq with budget context to generate one weekly message
5. Upserts into `scheduled_reminders` with unique `(user_id, week_label, scheduled_day)`
6. Mobile app schedules one weekly local notification (Monday 20:00 by default)

See also [MANUAL_STEPS_AFTER_MERGE.md](../../docs/MANUAL_STEPS_AFTER_MERGE.md) for deploy + cron checklist.
