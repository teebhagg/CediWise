-- Migration: Create sme_categories table
-- Date: 2026-03-27 00:03:00
-- User-customizable income and expense categories for SME Ledger

create table if not exists public.sme_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  icon text,
  color text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique(user_id, name, type)
);

alter table public.sme_categories enable row level security;

drop policy if exists sme_categories_self on public.sme_categories;
create policy sme_categories_self on public.sme_categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists sme_categories_user_type_idx on public.sme_categories(user_id, type);
