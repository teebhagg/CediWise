-- Migration: Subscription activity log + logging trigger
-- Date: 2026-03-30 00:00:00
-- Creates the activity log table, helper function, and auto-logging trigger

-- =====================================================
-- 1. Activity log table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.subscription_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'trial_started', 'trial_ended', 'trial_expired',
    'tier_upgraded', 'tier_downgraded', 'tier_stacked',
    'subscription_activated', 'subscription_cancelled',
    'subscription_renewed', 'early_bird_claimed',
    'payment_failed'
  )),
  from_tier text,
  to_tier text,
  from_status text,
  to_status text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sub_log_user ON public.subscription_activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sub_log_type ON public.subscription_activity_log(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sub_log_created ON public.subscription_activity_log(created_at DESC);

ALTER TABLE public.subscription_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_sub_log" ON public.subscription_activity_log;
CREATE POLICY "service_role_sub_log" ON public.subscription_activity_log
  FOR ALL USING (true);

-- =====================================================
-- 2. Helper function — rank tiers for comparison
-- =====================================================

CREATE OR REPLACE FUNCTION public.rank_tier(t text)
RETURNS int AS $$
  SELECT CASE t WHEN 'free' THEN 0 WHEN 'budget' THEN 1 WHEN 'sme' THEN 2 ELSE -1 END;
$$ LANGUAGE sql IMMUTABLE;

-- =====================================================
-- 3. Logging trigger function
-- =====================================================

CREATE OR REPLACE FUNCTION public.log_subscription_change()
RETURNS TRIGGER AS $$
DECLARE
  event text;
  old_tier text;
  new_tier text;
  old_status text;
  new_status text;
BEGIN
  old_tier := COALESCE(OLD.plan, 'free');
  new_tier := COALESCE(NEW.plan, 'free');
  old_status := COALESCE(OLD.status, 'active');
  new_status := COALESCE(NEW.status, 'active');

  IF TG_OP = 'INSERT' THEN
    IF new_status = 'trial' THEN
      -- Check if early bird (under 100 trials/active subs)
      IF (SELECT COUNT(*) FROM public.subscriptions WHERE plan != 'free' OR status = 'trial') < 100 THEN
        event := 'early_bird_claimed';
      ELSE
        event := 'trial_started';
      END IF;
    ELSIF new_status = 'pending_payment' THEN
      event := 'subscription_activated';
    ELSIF new_status = 'active' AND new_tier != 'free' THEN
      event := 'subscription_activated';
    ELSE
      event := 'subscription_activated';
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Skip if nothing tier-relevant changed
    IF OLD.plan IS NOT DISTINCT FROM NEW.plan AND
       OLD.status IS NOT DISTINCT FROM NEW.status AND
       OLD.pending_tier IS NOT DISTINCT FROM NEW.pending_tier THEN
      RETURN NEW;
    END IF;

    -- Trial ended (janitor activated pending tier)
    IF old_status = 'trial' AND new_status IN ('active', 'expired') THEN
      event := 'trial_ended';

    -- Plan upgraded
    ELSIF old_tier <> new_tier AND new_status = 'active' THEN
      IF public.rank_tier(new_tier) > public.rank_tier(old_tier) THEN
        event := 'tier_upgraded';
      ELSE
        event := 'tier_downgraded';
      END IF;

    -- Pending tier was set (trial stacking)
    ELSIF NEW.pending_tier IS NOT NULL AND OLD.pending_tier IS NULL THEN
      event := 'tier_stacked';

    -- Pending tier was cleared (activation happened)
    ELSIF NEW.pending_tier IS NULL AND OLD.pending_tier IS NOT NULL AND old_tier <> new_tier THEN
      IF public.rank_tier(new_tier) < public.rank_tier(old_tier) THEN
        event := 'tier_downgraded';
      ELSE
        event := 'tier_upgraded';
      END IF;

    -- Subscription cancelled
    ELSIF old_status <> 'expired' AND new_status = 'expired' THEN
      event := 'subscription_cancelled';

    -- Subscription renewed/reactivated
    ELSIF old_status = 'expired' AND new_status = 'active' THEN
      event := 'subscription_renewed';

    -- Pending payment → active
    ELSIF old_status = 'pending_payment' AND new_status = 'active' THEN
      event := 'subscription_activated';

    -- Pending payment → trial
    ELSIF old_status = 'pending_payment' AND new_status = 'trial' THEN
      event := 'trial_started';

    ELSE
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  -- Insert log entry
  INSERT INTO public.subscription_activity_log (
    user_id, event_type, from_tier, to_tier,
    from_status, to_status, metadata, created_at
  ) VALUES (
    NEW.user_id,
    event,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE old_tier END,
    new_tier,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE old_status END,
    new_status,
    jsonb_build_object(
      'paystack_code', NEW.paystack_subscription_code,
      'cancel_at_period_end', COALESCE(NEW.cancel_at_period_end, false),
      'pending_tier', NEW.pending_tier
    ),
    now()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. Attach trigger
-- =====================================================

DROP TRIGGER IF EXISTS on_subscription_changed ON public.subscriptions;
CREATE TRIGGER on_subscription_changed
AFTER INSERT OR UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.log_subscription_change();
