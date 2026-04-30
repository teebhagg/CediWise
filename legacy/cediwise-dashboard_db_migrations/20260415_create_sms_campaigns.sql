-- SMS Campaign System
-- Run this migration to create the SMS campaigns and recipients tables

-- SMS Campaigns table
CREATE TABLE IF NOT EXISTS public.sms_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT NOT NULL CHECK (template_key IN (
    'general_update', 'support_response', 'feedback_followup', 'join_beta',
    'app_update', 'customer_checkin', 'maintenance_notice', 'educational_tip'
  )),
  message TEXT NOT NULL,
  audience_type TEXT NOT NULL CHECK (audience_type IN ('single', 'selected_users')),
  recipient_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'sent', 'failed', 'partial_failed')),
  source TEXT NOT NULL CHECK (source IN ('users_tab', 'user_profile', 'sms_section')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_created_at ON public.sms_campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_status ON public.sms_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_created_by ON public.sms_campaigns(created_by, created_at DESC);

-- SMS Recipients table (audit trail)
CREATE TABLE IF NOT EXISTS public.sms_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.sms_campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  recipient_name TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'queued' CHECK (delivery_status IN ('queued', 'sent', 'failed')),
  provider_message_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sms_recipients_campaign_id ON public.sms_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sms_recipients_user_id ON public.sms_recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_recipients_phone ON public.sms_recipients(phone);
