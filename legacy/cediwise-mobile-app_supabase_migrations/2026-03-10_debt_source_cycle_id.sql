-- Add source_cycle_id to debts for linking debt to the cycle where overspend occurred
alter table public.debts
  add column if not exists source_cycle_id uuid references public.budget_cycles(id);
