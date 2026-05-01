-- Migration: Add deterministic smart budget engine mode to profiles
-- Date: 2026-03-25
-- Safe to run multiple times (idempotent).

alter table public.profiles
  add column if not exists budget_engine_mode text not null default 'auto_apply_safe_rules';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_budget_engine_mode_check') then
    alter table public.profiles add constraint profiles_budget_engine_mode_check
      check (budget_engine_mode in ('recommend_only', 'auto_apply_safe_rules', 'manual_off'));
  end if;
end $$;
