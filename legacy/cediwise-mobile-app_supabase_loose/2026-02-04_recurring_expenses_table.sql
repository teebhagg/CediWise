-- Migration: Create recurring_expenses table
-- Date: 2026-02-04
-- Tracks subscriptions, memberships, loans, and other recurring costs

create table if not exists public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric not null,
  frequency text not null default 'monthly',
  bucket text not null,
  category_id uuid references public.budget_categories(id) on delete set null,
  start_date date not null default current_date,
  end_date date,
  is_active boolean not null default true,
  auto_allocate boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Constraints
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'recurring_expenses_amount_check') then
    alter table public.recurring_expenses add constraint recurring_expenses_amount_check check (amount >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'recurring_expenses_frequency_check') then
    alter table public.recurring_expenses add constraint recurring_expenses_frequency_check 
      check (frequency in ('weekly', 'bi_weekly', 'monthly', 'quarterly', 'annually'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'recurring_expenses_bucket_check') then
    alter table public.recurring_expenses add constraint recurring_expenses_bucket_check 
      check (bucket in ('needs', 'wants', 'savings'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'recurring_expenses_end_date_check') then
    alter table public.recurring_expenses add constraint recurring_expenses_end_date_check 
      check (end_date is null or end_date >= start_date);
  end if;
end $$;

-- Indexes
create index if not exists recurring_expenses_user_id_idx on public.recurring_expenses(user_id);
create index if not exists recurring_expenses_category_id_idx on public.recurring_expenses(category_id);
create index if not exists recurring_expenses_is_active_idx on public.recurring_expenses(is_active);

-- RLS
alter table public.recurring_expenses enable row level security;

drop policy if exists recurring_expenses_self on public.recurring_expenses;
create policy recurring_expenses_self on public.recurring_expenses
  for all using (auth.uid() = user_id);

-- Updated at trigger
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists recurring_expenses_updated_at on public.recurring_expenses;
create trigger recurring_expenses_updated_at
  before update on public.recurring_expenses
  for each row
  execute function public.update_updated_at_column();
