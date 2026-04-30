-- Billing cadence + proration support (pending cadence changes, activity types).

begin;

alter table public.subscriptions
  add column if not exists billing_cycle text not null default 'monthly';

alter table public.subscriptions
  add column if not exists pending_billing_cycle text;

alter table public.subscriptions
  drop constraint if exists subscriptions_billing_cycle_check;

alter table public.subscriptions
  add constraint subscriptions_billing_cycle_check check (
    billing_cycle in ('monthly', 'quarterly')
  );

alter table public.subscriptions
  drop constraint if exists subscriptions_pending_billing_cycle_check;

alter table public.subscriptions
  add constraint subscriptions_pending_billing_cycle_check check (
    pending_billing_cycle is null
    or pending_billing_cycle in ('monthly', 'quarterly')
  );

comment on column public.subscriptions.billing_cycle is
  'Active renewal cadence for paid tier (monthly | quarterly).';

comment on column public.subscriptions.pending_billing_cycle is
  'Cadence switch scheduled for end of current period (or next full charge).';

-- Infer cadence from existing period length when plausible.
update public.subscriptions s
set
  billing_cycle = case
    when s.current_period_start is not null
    and s.current_period_end is not null
    and (s.current_period_end - s.current_period_start) > interval '45 days' then
      'quarterly'
    else
      'monthly'
  end
where
  s.billing_cycle = 'monthly';

-- subscription_activity_log: new event types
alter table public.subscription_activity_log
  drop constraint if exists subscription_activity_log_event_type_check;

alter table public.subscription_activity_log
  add constraint subscription_activity_log_event_type_check check (
    event_type = any (
      array[
        'trial_started'::text,
        'trial_ended'::text,
        'trial_expired'::text,
        'tier_upgraded'::text,
        'tier_downgraded'::text,
        'tier_stacked'::text,
        'subscription_activated'::text,
        'subscription_cancelled'::text,
        'subscription_renewed'::text,
        'early_bird_claimed'::text,
        'payment_failed'::text,
        'grace_period_entered'::text,
        'momo_charge_initiated'::text,
        'momo_charge_completed'::text,
        'reminder_sent'::text,
        'auto_downgraded'::text,
        'invoice_payment_failed'::text,
        'prorated_upgrade'::text,
        'cadence_change_scheduled'::text,
        'cadence_change_applied'::text
      ]
    )
  );

create or replace function public.log_subscription_change () returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  event text;
  old_tier text;
  new_tier text;
  old_status text;
  new_status text;
begin
  old_tier := coalesce(OLD.plan, 'free');
  new_tier := coalesce(NEW.plan, 'free');
  old_status := coalesce(OLD.status, 'active');
  new_status := coalesce(NEW.status, 'active');

  if tg_op = 'INSERT' then
    if new_status = 'trial' then
      if (
        select count(*) from public.subscriptions
        where
          plan != 'free'
          or status = 'trial'
      ) < 100 then
        event := 'early_bird_claimed';
      else
        event := 'trial_started';
      end if;
    elsif new_status = 'pending_payment' then
      event := 'subscription_activated';
    elsif new_status = 'active' and new_tier != 'free' then
      event := 'subscription_activated';
    else
      event := 'subscription_activated';
    end if;

  elsif tg_op = 'UPDATE' then
    if OLD.plan is not distinct from NEW.plan
    and OLD.status is not distinct from NEW.status
    and OLD.pending_tier is not distinct from NEW.pending_tier
    and OLD.billing_cycle is not distinct from NEW.billing_cycle
    and OLD.pending_billing_cycle is not distinct from NEW.pending_billing_cycle then
      return NEW;
    end if;

    if old_status = 'trial' and new_status in ('active', 'expired') then
      event := 'trial_ended';

    elsif old_tier <> new_tier and new_status = 'active' then
      if public.rank_tier (new_tier) > public.rank_tier (old_tier) then
        event := 'tier_upgraded';
      else
        event := 'tier_downgraded';
      end if;

    elsif new.pending_tier is not null and old.pending_tier is null then
      event := 'tier_stacked';

    elsif new.pending_tier is null and old.pending_tier is not null and old_tier <> new_tier then
      if public.rank_tier (new_tier) < public.rank_tier (old_tier) then
        event := 'tier_downgraded';
      else
        event := 'tier_upgraded';
      end if;

    elsif old_status <> 'expired' and new_status = 'expired' then
      event := 'subscription_cancelled';

    elsif old_status = 'expired' and new_status = 'active' then
      event := 'subscription_renewed';

    elsif old_status = 'pending_payment' and new_status = 'active' then
      event := 'subscription_activated';

    elsif old_status = 'pending_payment' and new_status = 'trial' then
      event := 'trial_started';

    elsif old_status is distinct from 'grace_period' and new_status = 'grace_period' then
      event := 'grace_period_entered';

    elsif old_status = 'grace_period' and new_status = 'active' then
      event := 'subscription_renewed';

    elsif OLD.pending_billing_cycle is null
    and NEW.pending_billing_cycle is not null then
      event := 'cadence_change_scheduled';

    elsif OLD.pending_billing_cycle is not null
    and NEW.pending_billing_cycle is null
    and OLD.billing_cycle is distinct from NEW.billing_cycle then
      event := 'cadence_change_applied';

    else
      return NEW;
    end if;
  else
    return NEW;
  end if;

  insert into public.subscription_activity_log (
    user_id,
    event_type,
    from_tier,
    to_tier,
    from_status,
    to_status,
    metadata,
    created_at
  )
  values (
    NEW.user_id,
    event,
    case when tg_op = 'INSERT' then null else old_tier end,
    new_tier,
    case when tg_op = 'INSERT' then null else old_status end,
    new_status,
    jsonb_build_object(
      'paystack_code', NEW.paystack_subscription_code,
      'cancel_at_period_end', coalesce(NEW.cancel_at_period_end, false),
      'pending_tier', NEW.pending_tier,
      'payment_preference', NEW.payment_preference,
      'grace_period_end', NEW.grace_period_end,
      'billing_cycle', NEW.billing_cycle,
      'pending_billing_cycle', NEW.pending_billing_cycle
    ),
    now()
  );

  return NEW;
end;
$$;

commit;
