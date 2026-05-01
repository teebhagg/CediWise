-- Migration: Fix debts.source_cycle_id FK constraint
-- Date: 2026-03-29 00:01:00
-- Changes NO ACTION (default) to ON DELETE SET NULL
-- When a budget_cycle is deleted, debts' source_cycle_id becomes NULL
-- instead of blocking the delete.

alter table public.debts 
  drop constraint if exists debts_source_cycle_id_fkey;

alter table public.debts 
  add constraint debts_source_cycle_id_fkey 
  foreign key (source_cycle_id) 
  references public.budget_cycles(id) 
  on delete set null;
