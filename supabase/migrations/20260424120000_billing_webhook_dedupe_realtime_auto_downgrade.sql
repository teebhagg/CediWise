-- Webhook idempotency, Realtime for subscriptions, auto_downgraded activity event.

begin;

-- ---------------------------------------------------------------------------
-- paystack_applied_charges: idempotent charge.success (reference is unique per txn)
-- ---------------------------------------------------------------------------
create table if not exists public.paystack_applied_charges (
  reference text primary key,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.paystack_applied_charges is 'Paystack transaction references already applied by webhook (charge.success).';

alter table public.paystack_applied_charges enable row level security;

grant select, insert, delete on public.paystack_applied_charges to service_role;

-- ---------------------------------------------------------------------------
-- Realtime: mobile listens for subscription row changes after payment
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where
      pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'subscriptions'
  ) then
    execute 'alter publication supabase_realtime add table public.subscriptions';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- log_subscription_change: grace_period → expired (free) = auto_downgraded
-- ---------------------------------------------------------------------------
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
    and OLD.pending_tier is not distinct from NEW.pending_tier then
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

    elsif old_status = 'grace_period' and new_status = 'expired' and new_tier = 'free' then
      event := 'auto_downgraded';

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
      'grace_period_end', NEW.grace_period_end
    ),
    now()
  );

  return NEW;
end;
$$;

commit;
