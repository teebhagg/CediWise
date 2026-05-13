-- AI Smart Budget infrastructure: cache, chat history, daily usage, cost log.
-- Writes are performed only via Edge Functions using the service role (bypasses RLS).
-- Authenticated users may SELECT their own rows where applicable.

-- AI analysis cache (avoids redundant API calls for same budget state)
CREATE TABLE IF NOT EXISTS public.ai_analysis_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  cycle_id uuid REFERENCES public.budget_cycles (id) ON DELETE SET NULL,
  analysis_type text NOT NULL DEFAULT 'budget_summary',
  input_hash text NOT NULL,
  model_used text NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '6 hours')
);

COMMENT ON COLUMN public.ai_analysis_cache.cycle_id IS 'References budget_cycles.id when applicable; nullable for orphan rows';

-- AI chat history (conversation persistence)
CREATE TABLE IF NOT EXISTS public.ai_chat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- AI daily usage tracking (tier limit enforcement; date is user's local calendar day in IANA zone)
CREATE TABLE IF NOT EXISTS public.ai_chat_usage_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  usage_date date NOT NULL,
  message_count integer NOT NULL DEFAULT 0,
  timezone text NOT NULL DEFAULT 'Africa/Accra',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, usage_date)
);

COMMENT ON COLUMN public.ai_chat_usage_daily.usage_date IS 'Calendar date in user timezone when the messages were counted';
COMMENT ON COLUMN public.ai_chat_usage_daily.timezone IS 'IANA timezone last used when incrementing counts for this row';

-- AI cost log (monitoring)
CREATE TABLE IF NOT EXISTS public.ai_cost_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  endpoint text NOT NULL,
  model text NOT NULL,
  provider text NOT NULL DEFAULT 'groq',
  input_tokens integer,
  output_tokens integer,
  cost_usd numeric(12, 8),
  response_time_ms integer,
  status text NOT NULL DEFAULT 'success',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_analysis_user_hash ON public.ai_analysis_cache (user_id, input_hash);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_expires ON public.ai_analysis_cache (expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_chat_user_session ON public.ai_chat_history (user_id, session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON public.ai_chat_usage_daily (user_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_ai_cost_user_created ON public.ai_cost_log (user_id, created_at);

ALTER TABLE public.ai_analysis_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_usage_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_cost_log ENABLE ROW LEVEL SECURITY;

-- SELECT-only for authenticated users on their rows (no INSERT/UPDATE/DELETE for anon/authenticated JWT)
CREATE POLICY ai_analysis_cache_select_own ON public.ai_analysis_cache FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY ai_chat_history_select_own ON public.ai_chat_history FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY ai_chat_usage_daily_select_own ON public.ai_chat_usage_daily FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY ai_cost_log_select_own ON public.ai_cost_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
