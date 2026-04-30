-- Migration: Enhance budget_cycles table for rollover and reallocation
-- Date: 2026-02-04

alter table public.budget_cycles
  add column if not exists rollover_from_previous jsonb not null default '{"needs":0,"wants":0,"savings":0}'::jsonb,
  add column if not exists reallocation_applied boolean not null default false,
  add column if not exists reallocation_reason text;

-- No additional constraints needed for these fields
-- jsonb allows flexible structure for rollover amounts
