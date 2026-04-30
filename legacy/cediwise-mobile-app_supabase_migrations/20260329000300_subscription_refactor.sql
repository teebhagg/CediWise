-- Migration: Subscription refactor — subscriptions as source of truth for tier
-- Date: 2026-03-29 00:03:00
-- Schema update + data migration + sync triggers

-- =====================================================
-- 1. SCHEMA UPDATES
-- =====================================================

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS pending_tier TEXT 
    CHECK (pending_tier IN ('free', 'budget', 'sme')),
  ADD COLUMN IF NOT EXISTS pending_tier_start_date TIMESTAMPTZ;

-- =====================================================
-- 2. DATA MIGRATION — Copy existing profile tier data
--    to subscriptions for users who don't have one yet
-- =====================================================

INSERT INTO public.subscriptions (
  user_id, plan, status, trial_ends_at, 
  pending_tier, pending_tier_start_date, updated_at
)
SELECT 
  id,
  COALESCE(tier, 'free'),
  CASE 
    WHEN trial_ends_at IS NOT NULL AND trial_ends_at > NOW() THEN 'trial'
    WHEN tier IN ('budget', 'sme') THEN 'active'
    ELSE 'expired'
  END,
  trial_ends_at,
  pending_tier,
  pending_tier_start_date,
  NOW()
FROM public.profiles
WHERE id NOT IN (SELECT user_id FROM public.subscriptions);

-- =====================================================
-- 3. TRIGGER: Push subscription changes to profiles
--    Fires on INSERT/UPDATE of tier-relevant fields
-- =====================================================

CREATE OR REPLACE FUNCTION public.sync_subscription_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip if no tier-relevant fields changed (UPDATE only)
  IF TG_OP = 'UPDATE' AND
    OLD.plan IS NOT DISTINCT FROM NEW.plan AND
    OLD.trial_ends_at IS NOT DISTINCT FROM NEW.trial_ends_at AND
    OLD.pending_tier IS NOT DISTINCT FROM NEW.pending_tier AND
    OLD.pending_tier_start_date IS NOT DISTINCT FROM NEW.pending_tier_start_date
  THEN
    RETURN NEW;
  END IF;

  UPDATE public.profiles SET 
    tier = NEW.plan,
    trial_ends_at = NEW.trial_ends_at,
    pending_tier = NEW.pending_tier,
    pending_tier_start_date = NEW.pending_tier_start_date
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_subscription_updated ON public.subscriptions;
CREATE TRIGGER on_subscription_updated
AFTER INSERT OR UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.sync_subscription_to_profile();

-- =====================================================
-- 4. TRIGGER: Pull subscription data when profile created
--    Solves race condition: subscription exists before profile
-- =====================================================

CREATE OR REPLACE FUNCTION public.sync_profile_from_subscription()
RETURNS TRIGGER AS $$
DECLARE
  sub_row RECORD;
BEGIN
  SELECT plan as tier, trial_ends_at, pending_tier, pending_tier_start_date 
  INTO sub_row 
  FROM public.subscriptions 
  WHERE user_id = NEW.id;

  IF FOUND THEN
    NEW.tier := sub_row.tier;
    NEW.trial_ends_at := sub_row.trial_ends_at;
    NEW.pending_tier := sub_row.pending_tier;
    NEW.pending_tier_start_date := sub_row.pending_tier_start_date;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_inserted ON public.profiles;
CREATE TRIGGER on_profile_inserted
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_from_subscription();
