-- Link budget transactions to debts when they represent debt payments
alter table public.budget_transactions
  add column if not exists debt_id uuid references public.debts(id);

