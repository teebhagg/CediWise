-- Scheduled reminders: AI-generated personalized messages for weekly expense reminders.
-- The generate-reminders Edge Function populates this weekly (Sun midnight UTC).
-- The mobile app reads pending reminders and schedules one weekly local notification.

CREATE TABLE IF NOT EXISTS public.scheduled_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    deep_link TEXT DEFAULT '/expenses',
    scheduled_day TEXT NOT NULL CHECK (scheduled_day IN ('monday', 'thursday')),
    week_label TEXT NOT NULL, -- ISO week string e.g. '2026-W20'
    is_shown BOOLEAN NOT NULL DEFAULT false,
    shown_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scheduled_reminders_pending_idx
    ON public.scheduled_reminders (user_id, week_label, scheduled_day)
    WHERE is_shown = false;

ALTER TABLE public.scheduled_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY scheduled_reminders_select_own
    ON public.scheduled_reminders
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY scheduled_reminders_update_own
    ON public.scheduled_reminders
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE public.scheduled_reminders IS 'AI-generated personalized weekly expense reminder messages.';
COMMENT ON COLUMN public.scheduled_reminders.week_label IS 'ISO-8601 week label (e.g. 2026-W24).';
COMMENT ON COLUMN public.scheduled_reminders.scheduled_day IS 'Target day: monday or thursday.';
COMMENT ON COLUMN public.scheduled_reminders.is_shown IS 'Marked true after the local notification is delivered or opened.';

-- Schedule weekly cron: generate AI reminders every Sunday at 00:00 UTC
-- 1) Create a dedicated secret in Vault (name: cron_secret) and set the same value as Edge Function secret CRON_SECRET.
-- 2) Run in Supabase SQL Editor after deploy (replace PROJECT_REF):
-- SELECT cron.schedule(
--   'generate-reminders',
--   '0 0 * * 0',
--   $$
--   SELECT net.http_post(
--     url := 'https://PROJECT_REF.supabase.co/functions/v1/generate-reminders',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'x-internal-service-token', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1)
--     )
--   ) AS request_id;
--   $$
-- );
