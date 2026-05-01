-- Recurring expenses created before auto_allocate existed need this column on remote DBs.
alter table public.recurring_expenses
  add column if not exists auto_allocate boolean not null default true;
