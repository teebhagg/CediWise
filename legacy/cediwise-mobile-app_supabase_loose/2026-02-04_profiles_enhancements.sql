-- Migration: Enhance profiles table with additional personalization fields
-- Date: 2026-02-04

alter table public.profiles
  add column if not exists life_stage text,
  add column if not exists dependents_count int not null default 0,
  add column if not exists income_frequency text not null default 'monthly',
  add column if not exists spending_style text,
  add column if not exists financial_priority text,
  add column if not exists enable_auto_reallocation boolean not null default false,
  add column if not exists rollover_enabled boolean not null default false;

-- Constraints
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_life_stage_check') then
    alter table public.profiles add constraint profiles_life_stage_check 
      check (life_stage is null or life_stage in ('student', 'young_professional', 'family', 'retiree'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profiles_dependents_count_check') then
    alter table public.profiles add constraint profiles_dependents_count_check check (dependents_count >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profiles_income_frequency_check') then
    alter table public.profiles add constraint profiles_income_frequency_check 
      check (income_frequency in ('weekly', 'bi_weekly', 'monthly'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profiles_spending_style_check') then
    alter table public.profiles add constraint profiles_spending_style_check 
      check (spending_style is null or spending_style in ('conservative', 'moderate', 'liberal'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profiles_financial_priority_check') then
    alter table public.profiles add constraint profiles_financial_priority_check 
      check (financial_priority is null or financial_priority in ('debt_payoff', 'savings_growth', 'lifestyle', 'balanced'));
  end if;
end $$;
