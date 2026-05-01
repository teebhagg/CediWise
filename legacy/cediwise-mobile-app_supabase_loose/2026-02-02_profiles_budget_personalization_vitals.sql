-- Migration: Add budget personalization vitals to public.profiles
-- Date: 2026-02-02
-- Safe to run multiple times (idempotent).

alter table public.profiles
  add column if not exists setup_completed boolean not null default false,
  add column if not exists stable_salary numeric not null default 0,
  add column if not exists auto_tax boolean not null default false,
  add column if not exists side_income numeric not null default 0,
  add column if not exists rent numeric not null default 0,
  add column if not exists tithe_remittance numeric not null default 0,
  add column if not exists utilities_mode text not null default 'general',
  add column if not exists utilities_total numeric not null default 0,
  add column if not exists utilities_ecg numeric not null default 0,
  add column if not exists utilities_water numeric not null default 0,
  add column if not exists primary_goal text,
  add column if not exists strategy text,
  add column if not exists needs_pct numeric,
  add column if not exists wants_pct numeric,
  add column if not exists savings_pct numeric;

do $$
begin
  -- Non-negative checks
  if not exists (select 1 from pg_constraint where conname = 'profiles_stable_salary_nonneg') then
    alter table public.profiles add constraint profiles_stable_salary_nonneg check (stable_salary >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profiles_side_income_nonneg') then
    alter table public.profiles add constraint profiles_side_income_nonneg check (side_income >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profiles_rent_nonneg') then
    alter table public.profiles add constraint profiles_rent_nonneg check (rent >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profiles_tithe_remittance_nonneg') then
    alter table public.profiles add constraint profiles_tithe_remittance_nonneg check (tithe_remittance >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profiles_utilities_total_nonneg') then
    alter table public.profiles add constraint profiles_utilities_total_nonneg check (utilities_total >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profiles_utilities_ecg_nonneg') then
    alter table public.profiles add constraint profiles_utilities_ecg_nonneg check (utilities_ecg >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profiles_utilities_water_nonneg') then
    alter table public.profiles add constraint profiles_utilities_water_nonneg check (utilities_water >= 0);
  end if;

  -- Enum-like checks
  if not exists (select 1 from pg_constraint where conname = 'profiles_utilities_mode_check') then
    alter table public.profiles add constraint profiles_utilities_mode_check check (utilities_mode in ('general','precise'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profiles_primary_goal_check') then
    alter table public.profiles add constraint profiles_primary_goal_check check (primary_goal in ('emergency_fund','project','investment'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profiles_strategy_check') then
    alter table public.profiles add constraint profiles_strategy_check check (strategy in ('survival','balanced','aggressive'));
  end if;

  -- Percentage checks (0..1)
  if not exists (select 1 from pg_constraint where conname = 'profiles_needs_pct_check') then
    alter table public.profiles add constraint profiles_needs_pct_check check (needs_pct is null or (needs_pct >= 0 and needs_pct <= 1));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profiles_wants_pct_check') then
    alter table public.profiles add constraint profiles_wants_pct_check check (wants_pct is null or (wants_pct >= 0 and wants_pct <= 1));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profiles_savings_pct_check') then
    alter table public.profiles add constraint profiles_savings_pct_check check (savings_pct is null or (savings_pct >= 0 and savings_pct <= 1));
  end if;
end $$;

