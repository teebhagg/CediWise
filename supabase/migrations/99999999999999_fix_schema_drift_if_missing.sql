-- Corrective migration: align production with code paths (pending_payment, grace_period, profiles.email).
-- Idempotent. Runs after remote_schema baselines (lexicographic order).

begin;

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
