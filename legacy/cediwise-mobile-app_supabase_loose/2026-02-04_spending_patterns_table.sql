-- Migration: Create spending_patterns table
-- Date: 2026-02-04
-- Aggregated spending insights per category

create table if not exists public.spending_patterns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.budget_categories(id) on delete cascade,
  cycle_id uuid not null references public.budget_cycles(id) on delete cascade,
  avg_spent numeric not null default 0,
  trend text not null default 'stable',
  variance numeric not null default 0,
  last_calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Constraints
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'spending_patterns_avg_spent_check') then
    alter table public.spending_patterns add constraint spending_patterns_avg_spent_check check (avg_spent >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'spending_patterns_variance_check') then
    alter table public.spending_patterns add constraint spending_patterns_variance_check check (variance >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'spending_patterns_trend_check') then
    alter table public.spending_patterns add constraint spending_patterns_trend_check 
      check (trend in ('increasing', 'stable', 'decreasing'));
  end if;
end $$;

-- Indexes
create index if not exists spending_patterns_user_id_idx on public.spending_patterns(user_id);
create index if not exists spending_patterns_category_id_idx on public.spending_patterns(category_id);
create index if not exists spending_patterns_cycle_id_idx on public.spending_patterns(cycle_id);

-- Unique constraint: one pattern per category per cycle
create unique index if not exists spending_patterns_category_cycle_unique 
  on public.spending_patterns(category_id, cycle_id);

-- RLS
alter table public.spending_patterns enable row level security;

drop policy if exists spending_patterns_self on public.spending_patterns;
create policy spending_patterns_self on public.spending_patterns
  for all using (auth.uid() = user_id);

-- Updated at trigger
drop trigger if exists spending_patterns_updated_at on public.spending_patterns;
create trigger spending_patterns_updated_at
  before update on public.spending_patterns
  for each row
  execute function public.update_updated_at_column();
