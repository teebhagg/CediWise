-- Migration: Create user_activity_log table
-- Date: 2026-02-04
-- Per-user activity log; intended amounts are never overwritten by budget recalculation.

create table if not exists public.user_activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle_id uuid references public.budget_cycles(id) on delete set null,
  action_type text not null,
  entity_type text not null check (entity_type in ('category', 'transaction')),
  entity_id text,
  intended_amount numeric not null default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'user_activity_log_action_type_check') then
    alter table public.user_activity_log add constraint user_activity_log_action_type_check
      check (action_type in ('category_added', 'category_limit_updated', 'transaction_added'));
  end if;
end $$;

create index if not exists user_activity_log_user_id_idx on public.user_activity_log(user_id);
create index if not exists user_activity_log_cycle_id_idx on public.user_activity_log(cycle_id);
create index if not exists user_activity_log_created_at_idx on public.user_activity_log(created_at desc);
create index if not exists user_activity_log_entity_id_idx on public.user_activity_log(entity_id) where entity_id is not null;

alter table public.user_activity_log enable row level security;

drop policy if exists user_activity_log_self on public.user_activity_log;
create policy user_activity_log_self on public.user_activity_log
  for all using (auth.uid() = user_id);
