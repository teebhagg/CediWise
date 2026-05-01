-- Migration: Add updated_at column + trigger to sme_categories
-- Date: 2026-03-27 00:06:00
-- Ensures category renames and edits have a timestamp trail

alter table public.sme_categories
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists sme_categories_updated_at on public.sme_categories;
create trigger sme_categories_updated_at
  before update on public.sme_categories
  for each row
  execute function public.update_updated_at_column();
