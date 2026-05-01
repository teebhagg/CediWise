-- Add icon column to budget_categories for persisting custom category icons
alter table public.budget_categories
  add column if not exists icon text;
