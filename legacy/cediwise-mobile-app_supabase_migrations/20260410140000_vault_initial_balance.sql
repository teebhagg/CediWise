-- Wealth Vault: user-declared starting balance (Genesis Deposit)
alter table public.profiles
  add column if not exists initial_savings_balance numeric not null default 0
  check (initial_savings_balance >= 0);
