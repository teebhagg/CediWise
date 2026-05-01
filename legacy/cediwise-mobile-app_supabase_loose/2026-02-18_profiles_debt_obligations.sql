-- Migration: Add debt obligations to profiles for personalization
-- Date: 2026-02-18

alter table public.profiles
  add column if not exists debt_obligations numeric not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_debt_obligations_nonneg') then
    alter table public.profiles add constraint profiles_debt_obligations_nonneg check (debt_obligations >= 0);
  end if;
end $$;
