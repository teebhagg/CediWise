-- Migration: Enhance budget_categories table for custom categories and subcategories
-- Date: 2026-02-04

alter table public.budget_categories
  add column if not exists is_custom boolean not null default false,
  add column if not exists parent_id uuid references public.budget_categories(id) on delete cascade,
  add column if not exists sort_order int not null default 0,
  add column if not exists suggested_limit numeric,
  add column if not exists is_archived boolean not null default false,
  add column if not exists manual_override boolean not null default false;

-- Constraints
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'budget_categories_suggested_limit_check') then
    alter table public.budget_categories add constraint budget_categories_suggested_limit_check 
      check (suggested_limit is null or suggested_limit >= 0);
  end if;

  -- Prevent circular parent references (category can't be its own parent)
  if not exists (select 1 from pg_constraint where conname = 'budget_categories_no_self_parent') then
    alter table public.budget_categories add constraint budget_categories_no_self_parent 
      check (parent_id is null or parent_id != id);
  end if;
end $$;

-- Indexes
create index if not exists budget_categories_parent_id_idx on public.budget_categories(parent_id);
create index if not exists budget_categories_is_custom_idx on public.budget_categories(is_custom);
create index if not exists budget_categories_is_archived_idx on public.budget_categories(is_archived);
create index if not exists budget_categories_sort_order_idx on public.budget_categories(sort_order);
