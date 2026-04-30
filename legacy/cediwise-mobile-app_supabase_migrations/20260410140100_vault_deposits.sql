-- Savings Vault: immutable deposit log (initial + cycle-end surplus only)
CREATE TABLE IF NOT EXISTS public.vault_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('initial', 'cycle_rollover')),
  amount numeric NOT NULL CHECK (amount >= 0),
  source_cycle_id uuid REFERENCES public.budget_cycles(id) ON DELETE SET NULL,
  note text,
  deposited_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Partial unique indexes (idempotent via DO blocks — avoids runner/parser issues with
-- multi-line CREATE UNIQUE INDEX IF NOT EXISTS).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'vault_deposits_user_cycle_unique'
  ) THEN
    EXECUTE $idx$
      CREATE UNIQUE INDEX vault_deposits_user_cycle_unique
      ON public.vault_deposits (user_id, source_cycle_id)
      WHERE source = 'cycle_rollover' AND source_cycle_id IS NOT NULL
    $idx$;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'vault_deposits_user_initial_unique'
  ) THEN
    EXECUTE $idx$
      CREATE UNIQUE INDEX vault_deposits_user_initial_unique
      ON public.vault_deposits (user_id)
      WHERE source = 'initial'
    $idx$;
  END IF;
END $$;

ALTER TABLE public.vault_deposits ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'vault_deposits' AND policyname = 'vault_deposits_self'
  ) THEN
    CREATE POLICY vault_deposits_self ON public.vault_deposits
      FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;
