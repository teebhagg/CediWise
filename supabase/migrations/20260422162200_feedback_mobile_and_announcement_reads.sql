-- Announcement inbox read receipts; RLS for app users. feedback.rating stays NOT NULL 1-5.

COMMENT ON COLUMN public.feedback.source IS 'Origin of submission, e.g. website_feedback_page, mobile_app (service role / admin bypass RLS).';

-- 1) Per-user read state for in-app announcement inbox
CREATE TABLE IF NOT EXISTS public.user_announcement_reads (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.announcement_campaigns (id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, campaign_id)
);

CREATE INDEX IF NOT EXISTS user_announcement_reads_user_id_idx
  ON public.user_announcement_reads (user_id, read_at DESC);

ALTER TABLE public.user_announcement_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_announcement_reads_select_own
  ON public.user_announcement_reads
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY user_announcement_reads_insert_own
  ON public.user_announcement_reads
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY user_announcement_reads_update_own
  ON public.user_announcement_reads
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY user_announcement_reads_delete_own
  ON public.user_announcement_reads
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_announcement_reads TO authenticated;
GRANT ALL ON public.user_announcement_reads TO service_role;

-- 2) Authenticated users can read sent campaigns targeted to them or broadcast to all
CREATE POLICY announcement_campaigns_user_read_sent
  ON public.announcement_campaigns
  FOR SELECT
  TO authenticated
  USING (
    status = 'sent'
    AND (
      audience_type = 'all'
      OR target_user_id = auth.uid()
    )
  );

-- 3) feedback: enable RLS; website continues via service_role (bypasses RLS)
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY feedback_insert_mobile_app
  ON public.feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (source = 'mobile_app');
