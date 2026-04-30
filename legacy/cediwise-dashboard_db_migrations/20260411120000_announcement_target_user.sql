-- Targeted push: allow a single-user audience on announcement campaigns.
-- Apply if public.announcement_campaigns already exists (admin / production).

alter table public.announcement_campaigns
  add column if not exists target_user_id uuid references auth.users (id) on delete set null;

comment on column public.announcement_campaigns.target_user_id is
  'When audience_type is single_user, only devices for this user receive the push.';

-- Widen audience_type check to include single_user. Constraint name may differ per DB;
-- if this errors, drop the existing check manually and re-run the ADD CONSTRAINT.
alter table public.announcement_campaigns
  drop constraint if exists announcement_campaigns_audience_type_check;

alter table public.announcement_campaigns
  add constraint announcement_campaigns_audience_type_check
  check (audience_type in ('all', 'single_user'));
