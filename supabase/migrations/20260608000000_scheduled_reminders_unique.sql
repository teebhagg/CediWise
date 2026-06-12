-- Prevent duplicate AI reminder rows per user/week/day (e.g. double cron runs).

ALTER TABLE public.scheduled_reminders
  DROP CONSTRAINT IF EXISTS scheduled_reminders_user_week_day_unique;

ALTER TABLE public.scheduled_reminders
  ADD CONSTRAINT scheduled_reminders_user_week_day_unique
  UNIQUE (user_id, week_label, scheduled_day);
