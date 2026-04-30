-- Migration: 20260402_cash_flow_columns.sql
-- Add cash flow tracking to profiles. Reuses existing payday_day column.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cash_flow_balance DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS cash_flow_monthly_income DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS cash_flow_last_reset TIMESTAMPTZ;

-- Non-negative constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_cash_flow_balance_nonneg') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_cash_flow_balance_nonneg
      CHECK (cash_flow_balance IS NULL OR cash_flow_balance >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_cash_flow_income_nonneg') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_cash_flow_income_nonneg
      CHECK (cash_flow_monthly_income IS NULL OR cash_flow_monthly_income >= 0);
  END IF;
END $$;

-- Auto-populate monthly_income from income_sources for existing users
UPDATE public.profiles p
SET cash_flow_monthly_income = sub.total_income
FROM (
  SELECT user_id, SUM(amount) AS total_income
  FROM public.income_sources
  GROUP BY user_id
) sub
WHERE p.id = sub.user_id
  AND p.cash_flow_monthly_income IS NULL;
