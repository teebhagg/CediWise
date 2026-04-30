-- Migration: Create debts table
-- Date: 2026-02-04
-- Tracks loans, credit cards, and other debts

create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  total_amount numeric not null,
  remaining_amount numeric not null,
  monthly_payment numeric not null,
  interest_rate numeric,
  start_date date not null default current_date,
  target_payoff_date date,
  is_active boolean not null default true,
  category_id uuid references public.budget_categories(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Constraints
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'debts_total_amount_check') then
    alter table public.debts add constraint debts_total_amount_check check (total_amount >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'debts_remaining_amount_check') then
    alter table public.debts add constraint debts_remaining_amount_check check (remaining_amount >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'debts_monthly_payment_check') then
    alter table public.debts add constraint debts_monthly_payment_check check (monthly_payment >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'debts_interest_rate_check') then
    alter table public.debts add constraint debts_interest_rate_check 
      check (interest_rate is null or (interest_rate >= 0 and interest_rate <= 100));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'debts_remaining_total_check') then
    alter table public.debts add constraint debts_remaining_total_check 
      check (remaining_amount <= total_amount);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'debts_target_date_check') then
    alter table public.debts add constraint debts_target_date_check 
      check (target_payoff_date is null or target_payoff_date >= start_date);
  end if;
end $$;

-- Indexes
create index if not exists debts_user_id_idx on public.debts(user_id);
create index if not exists debts_category_id_idx on public.debts(category_id);
create index if not exists debts_is_active_idx on public.debts(is_active);

-- RLS
alter table public.debts enable row level security;

drop policy if exists debts_self on public.debts;
create policy debts_self on public.debts
  for all using (auth.uid() = user_id);

-- Updated at trigger
drop trigger if exists debts_updated_at on public.debts;
create trigger debts_updated_at
  before update on public.debts
  for each row
  execute function public.update_updated_at_column();
