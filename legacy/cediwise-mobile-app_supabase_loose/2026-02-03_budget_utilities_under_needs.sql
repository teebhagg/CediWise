-- Migration: Treat utilities as part of needs
-- Date: 2026-02-03
-- Converts existing 'utilities' buckets into 'needs' and tightens constraints.

-- 1) Data migration: move utilities -> needs
update public.budget_categories
set bucket = 'needs'
where bucket = 'utilities';

update public.budget_transactions
set bucket = 'needs'
where bucket = 'utilities';

-- 2) Constraint migration: drop old bucket checks and add new ones
do $$
declare
  con text;
begin
  -- budget_categories bucket check
  select c.conname into con
  from pg_constraint c
  where c.conrelid = 'public.budget_categories'::regclass
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) like '%bucket%'
    and pg_get_constraintdef(c.oid) like '%utilities%';

  if con is not null then
    execute format('alter table public.budget_categories drop constraint %I', con);
  end if;

  if not exists (
    select 1 from pg_constraint c
    where c.conrelid = 'public.budget_categories'::regclass
      and c.conname = 'budget_categories_bucket_check_v1'
  ) then
    alter table public.budget_categories
      add constraint budget_categories_bucket_check_v1
      check (bucket in ('needs','wants','savings'));
  end if;

  -- budget_transactions bucket check
  select c.conname into con
  from pg_constraint c
  where c.conrelid = 'public.budget_transactions'::regclass
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) like '%bucket%'
    and pg_get_constraintdef(c.oid) like '%utilities%';

  if con is not null then
    execute format('alter table public.budget_transactions drop constraint %I', con);
  end if;

  if not exists (
    select 1 from pg_constraint c
    where c.conrelid = 'public.budget_transactions'::regclass
      and c.conname = 'budget_transactions_bucket_check_v1'
  ) then
    alter table public.budget_transactions
      add constraint budget_transactions_bucket_check_v1
      check (bucket in ('needs','wants','savings'));
  end if;
end $$;

