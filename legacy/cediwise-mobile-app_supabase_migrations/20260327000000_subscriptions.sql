-- Migration: Create subscriptions table
-- Date: 2026-03-27 00:00:00
-- Tracks Paystack subscription state per user

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'budget', 'sme')),
  status text not null default 'active' check (status in ('active', 'cancelled', 'expired', 'trial')),
  paystack_customer_id text,
  paystack_subscription_code text,
  paystack_plan_code text,
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

drop policy if exists subscriptions_self on public.subscriptions;
create policy subscriptions_self on public.subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row
  execute function public.update_updated_at_column();
