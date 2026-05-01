-- Corrective migration: align production with code paths that reference columns/statuses
-- not present in legacy git migrations. Idempotent (safe if already applied).
-- MUST run only AFTER the baseline from `supabase db pull` (lexicographic order: 9999… sorts last).
-- On empty local DB (no baseline yet), body is skipped via table existence checks.

begin;

-- subscriptions.cancel_at_period_end (used by paystack-webhook, dashboard activity log)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'subscriptions'
  ) then
    alter table public.subscriptions
      add column if not exists cancel_at_period_end boolean not null default false;
  end if;
end $$;

-- subscriptions.status: pending_payment + grace_period (webhook / v2 design)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'subscriptions'
  ) then
    alter table public.subscriptions drop constraint if exists subscriptions_status_check;
    alter table public.subscriptions
      add constraint subscriptions_status_check check (
        status in (
          'active',
          'cancelled',
          'expired',
          'trial',
          'pending_payment',
          'grace_period'
        )
      );
  end if;
end $$;

-- profiles.email (optional denormalization; paystack-initiate reads it — alternative: use auth.users.email only)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profiles'
  ) then
    alter table public.profiles add column if not exists email text;
    update public.profiles p
    set email = u.email
    from auth.users u
    where p.id = u.id
      and p.email is null
      and u.email is not null;
  end if;
end $$;

commit;
