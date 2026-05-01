-- Migration: Create sme_transactions table
-- Date: 2026-03-27 00:04:00
-- Core ledger table for SME sales and expenses

create table if not exists public.sme_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount numeric not null check (amount > 0),
  description text not null,
  category text not null,
  transaction_date date not null,
  payment_method text check (payment_method in ('cash', 'momo', 'bank', 'card', 'cheque', 'other')),
  vat_applicable boolean not null default true,
  vat_amount numeric not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sme_transactions enable row level security;

drop policy if exists sme_transactions_self on public.sme_transactions;
create policy sme_transactions_self on public.sme_transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists sme_transactions_user_date_idx
  on public.sme_transactions(user_id, transaction_date desc);

create index if not exists sme_transactions_user_type_idx
  on public.sme_transactions(user_id, type);

drop trigger if exists sme_transactions_updated_at on public.sme_transactions;
create trigger sme_transactions_updated_at
  before update on public.sme_transactions
  for each row
  execute function public.update_updated_at_column();
