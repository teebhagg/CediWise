-- CediWise Budgeting schema (offline-first client sync target)
-- Apply in Supabase SQL editor.
-- Notes:
-- - Uses auth.uid() for Row Level Security (RLS)
-- - Client can operate offline with local queue; these tables are sync targets

-- Extensions (optional, usually already enabled)
-- create extension if not exists "pgcrypto";

-- Profiles (optional budget prefs live here)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  payday_day int check (payday_day between 1 and 31),
  interests text[] default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Income sources (jobs)
create table if not exists public.income_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('primary','side')),
  amount numeric not null check (amount >= 0),
  apply_deductions boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Budget cycles (payday-based monthly windows)
create table if not exists public.budget_cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  payday_day int not null check (payday_day between 1 and 31),
  needs_pct numeric not null check (needs_pct >= 0 and needs_pct <= 1),
  wants_pct numeric not null check (wants_pct >= 0 and wants_pct <= 1),
  savings_pct numeric not null check (savings_pct >= 0 and savings_pct <= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, start_date, end_date)
);

-- Budget categories per cycle
create table if not exists public.budget_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle_id uuid not null references public.budget_cycles(id) on delete cascade,
  -- Utilities are treated as part of Needs (v1)
  bucket text not null check (bucket in ('needs','wants','savings')),
  name text not null,
  limit_amount numeric not null default 0 check (limit_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Transactions (expenses/income allocations)
create table if not exists public.budget_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle_id uuid not null references public.budget_cycles(id) on delete cascade,
  -- Utilities are treated as part of Needs (v1)
  bucket text not null check (bucket in ('needs','wants','savings')),
  category_id uuid references public.budget_categories(id) on delete set null,
  amount numeric not null check (amount >= 0),
  note text,
  occurred_at timestamptz not null default now(),
  source text not null default 'manual',
  created_at timestamptz not null default now()
);

-- Savings goals
create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric not null check (target_amount >= 0),
  current_amount numeric not null default 0 check (current_amount >= 0),
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Utility logs (ECG/WATER/TRASH)
create table if not exists public.utility_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  utility text not null check (utility in ('ecg','water','trash')),
  units numeric not null check (units >= 0),
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.income_sources enable row level security;
alter table public.budget_cycles enable row level security;
alter table public.budget_categories enable row level security;
alter table public.budget_transactions enable row level security;
alter table public.savings_goals enable row level security;
alter table public.utility_logs enable row level security;

-- RLS policies
do $$
begin
  -- profiles: user can manage their row
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_self'
  ) then
    create policy profiles_self on public.profiles
      for all
      using (id = auth.uid())
      with check (id = auth.uid());
  end if;

  -- helper for user_id tables
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='income_sources' and policyname='income_sources_self') then
    create policy income_sources_self on public.income_sources
      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='budget_cycles' and policyname='budget_cycles_self') then
    create policy budget_cycles_self on public.budget_cycles
      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='budget_categories' and policyname='budget_categories_self') then
    create policy budget_categories_self on public.budget_categories
      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='budget_transactions' and policyname='budget_transactions_self') then
    create policy budget_transactions_self on public.budget_transactions
      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='savings_goals' and policyname='savings_goals_self') then
    create policy savings_goals_self on public.savings_goals
      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='utility_logs' and policyname='utility_logs_self') then
    create policy utility_logs_self on public.utility_logs
      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;

