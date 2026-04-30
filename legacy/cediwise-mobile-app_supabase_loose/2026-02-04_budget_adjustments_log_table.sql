-- Migration: Create budget_adjustments_log table
-- Date: 2026-02-04
-- Audit trail for budget changes

create table if not exists public.budget_adjustments_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle_id uuid references public.budget_cycles(id) on delete set null,
  adjustment_type text not null,
  changes jsonb not null,
  reason text,
  created_at timestamptz not null default now()
);

-- Constraints
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'budget_adjustments_log_type_check') then
    alter table public.budget_adjustments_log add constraint budget_adjustments_log_type_check 
      check (adjustment_type in ('vitals_change', 'manual', 'auto_reallocation', 'template_applied', 'rollover', 'income_change', 'category_change'));
  end if;
end $$;

-- Indexes
create index if not exists budget_adjustments_log_user_id_idx on public.budget_adjustments_log(user_id);
create index if not exists budget_adjustments_log_cycle_id_idx on public.budget_adjustments_log(cycle_id);
create index if not exists budget_adjustments_log_type_idx on public.budget_adjustments_log(adjustment_type);
create index if not exists budget_adjustments_log_created_at_idx on public.budget_adjustments_log(created_at desc);

-- RLS
alter table public.budget_adjustments_log enable row level security;

drop policy if exists budget_adjustments_log_self on public.budget_adjustments_log;
create policy budget_adjustments_log_self on public.budget_adjustments_log
  for all using (auth.uid() = user_id);
