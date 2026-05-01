-- Migration: Create budget_templates table
-- Date: 2026-02-04
-- Pre-defined budget templates for different life stages

create table if not exists public.budget_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  target_audience text not null,
  life_stage text,
  needs_pct numeric not null,
  wants_pct numeric not null,
  savings_pct numeric not null,
  recommended_categories jsonb not null default '{"needs":[],"wants":[],"savings":[]}'::jsonb,
  is_default boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Constraints
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'budget_templates_needs_pct_check') then
    alter table public.budget_templates add constraint budget_templates_needs_pct_check 
      check (needs_pct >= 0 and needs_pct <= 1);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'budget_templates_wants_pct_check') then
    alter table public.budget_templates add constraint budget_templates_wants_pct_check 
      check (wants_pct >= 0 and wants_pct <= 1);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'budget_templates_savings_pct_check') then
    alter table public.budget_templates add constraint budget_templates_savings_pct_check 
      check (savings_pct >= 0 and savings_pct <= 1);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'budget_templates_life_stage_check') then
    alter table public.budget_templates add constraint budget_templates_life_stage_check 
      check (life_stage is null or life_stage in ('student', 'young_professional', 'family', 'retiree'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'budget_templates_percentages_sum_check') then
    alter table public.budget_templates add constraint budget_templates_percentages_sum_check 
      check (abs((needs_pct + wants_pct + savings_pct) - 1.0) < 0.01);
  end if;
end $$;

-- Indexes
create index if not exists budget_templates_life_stage_idx on public.budget_templates(life_stage);
create index if not exists budget_templates_is_default_idx on public.budget_templates(is_default);

-- RLS (public read access, no write access)
alter table public.budget_templates enable row level security;

drop policy if exists budget_templates_read_all on public.budget_templates;
create policy budget_templates_read_all on public.budget_templates
  for select using (true);
