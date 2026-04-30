-- Migration: Create sme_profiles table
-- Date: 2026-03-27 00:02:00
-- One business profile per user for the SME Ledger feature

create table if not exists public.sme_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  business_name text not null,
  business_type text not null default 'goods' check (business_type in ('goods', 'services', 'mixed')),
  business_category text,
  currency text not null default 'GHS',
  vat_registered boolean not null default false,
  tin text,
  fiscal_year_start_month integer not null default 1 check (fiscal_year_start_month between 1 and 12),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sme_profiles enable row level security;

drop policy if exists sme_profiles_self on public.sme_profiles;
create policy sme_profiles_self on public.sme_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists sme_profiles_updated_at on public.sme_profiles;
create trigger sme_profiles_updated_at
  before update on public.sme_profiles
  for each row
  execute function public.update_updated_at_column();
