-- AI User Context migration: Persists machine-extracted facts and preferences to provide cross-session memory.
-- Writes are performed via Edge Functions using the service role (bypasses RLS).
-- Authenticated users may SELECT their own rows.

CREATE TABLE IF NOT EXISTS public.ai_user_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  context_type text NOT NULL DEFAULT 'general',
  -- Machine-generated summary of user's financial situation, goals, and patterns.
  summary text NOT NULL,
  -- User-expressed preferences that the AI should remember (e.g., "prefers snowball method").
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Key facts extracted from conversations (e.g., "wedding in December").
  key_facts jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Last N session summaries for continuity across conversations.
  session_summaries jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, context_type)
);

CREATE INDEX IF NOT EXISTS idx_ai_user_context_user ON public.ai_user_context (user_id);

ALTER TABLE public.ai_user_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_user_context_select_own ON public.ai_user_context
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

COMMENT ON TABLE public.ai_user_context IS 'Persists machine-extracted facts and preferences to provide cross-session AI memory.';
COMMENT ON COLUMN public.ai_user_context.summary IS 'Evolving machine-generated summary of the users financial state and goals.';
COMMENT ON COLUMN public.ai_user_context.session_summaries IS 'JSON array of brief summaries from the last 10 conversation sessions.';

-- AI Maintenance: Scheduled cleanup jobs
-- Ensure pg_cron is available (Supabase standard)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Delete chat history older than 90 days (Run daily at midnight)
SELECT cron.schedule(
  'ai-chat-history-cleanup',
  '0 0 * * *',
  $$ DELETE FROM public.ai_chat_history WHERE created_at < now() - interval '90 days' $$
);

-- Evict expired analysis cache entries (Run daily at 1 AM)
SELECT cron.schedule(
  'ai-analysis-cache-cleanup',
  '0 1 * * *',
  $$ DELETE FROM public.ai_analysis_cache WHERE expires_at < now() $$
);

