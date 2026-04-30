-- Subscription & billing v2: MoMo fields, grace clocks, reminders, idempotency, activity log events.

begin;

-- ---------------------------------------------------------------------------
-- subscriptions: billing v2 columns
-- ---------------------------------------------------------------------------
alter table public.subscriptions
  add column if not exists payment_preference text,
  add column if not exists momo_phone text,
  add column if not exists momo_provider text,
  add column if not exists next_billing_date timestamptz,
  add column if not exists last_payment_failed_at timestamptz,
  add column if not exists grace_period_end timestamptz,
  add column if not exists grace_period_days integer not null default 5;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'subscriptions_payment_preference_check'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_payment_preference_check
      check (payment_preference is null or payment_preference in ('momo', 'card'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'subscriptions_momo_provider_check'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_momo_provider_check
      check (momo_provider is null or momo_provider in ('mtn', 'vod', 'tgo'));
  end if;
end $$;

comment on column public.subscriptions.payment_preference is 'momo | card — set from successful charge / user flow';
comment on column public.subscriptions.next_billing_date is 'Anchor for renewals & reminder cadence; MoMo manual pay cycle';
comment on column public.subscriptions.grace_period_end is 'Access ends after this instant unless payment succeeds';

-- ---------------------------------------------------------------------------
-- momo_charge_attempts (Edge idempotency)
-- ---------------------------------------------------------------------------
create table if not exists public.momo_charge_attempts (
  idempotency_key uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_key text not null,
  paystack_reference text,
  status text not null default 'pending',
  paystack_response jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint momo_charge_attempts_status_check check (
    status in ('pending', 'success', 'failed')
  )
);

create index if not exists idx_momo_charge_attempts_user on public.momo_charge_attempts (user_id);
create index if not exists idx_momo_charge_attempts_reference on public.momo_charge_attempts (paystack_reference);

alter table public.momo_charge_attempts enable row level security;

-- No user-facing policies; Edge uses service_role (bypasses RLS).

grant select, insert, update, delete on public.momo_charge_attempts to service_role;

-- ---------------------------------------------------------------------------
-- subscription_reminders
-- ---------------------------------------------------------------------------
create table if not exists public.subscription_reminders (
  id uuid primary key default gen_random_uuid (),
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  reminder_type text not null,
  cycle_anchor_date date not null,
  channel text,
  sent_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint subscription_reminders_unique_cycle unique (subscription_id, reminder_type, cycle_anchor_date)
);

create index if not exists idx_subscription_reminders_user on public.subscription_reminders (user_id);
create index if not exists idx_subscription_reminders_subscription on public.subscription_reminders (subscription_id);

alter table public.subscription_reminders enable row level security;

create policy "subscription_reminders_select_own" on public.subscription_reminders for select using (
  auth.uid () = user_id
);

grant select on public.subscription_reminders to authenticated;
grant all on public.subscription_reminders to service_role;

-- ---------------------------------------------------------------------------
-- subscription_activity_log: extend event_type
-- ---------------------------------------------------------------------------
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
        'invoice_payment_failed'::text
      ]
    )
  );

-- ---------------------------------------------------------------------------
-- log_subscription_change: grace transitions + richer metadata
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

-- ---------------------------------------------------------------------------
-- Backfill (idempotent)
-- ---------------------------------------------------------------------------
update public.subscriptions s
set
  next_billing_date = coalesce(s.next_billing_date, s.current_period_end)
where
  s.current_period_end is not null
  and s.next_billing_date is null;

update public.subscriptions s
set
  next_billing_date = coalesce(s.next_billing_date, s.trial_ends_at)
where
  s.status = 'trial'
  and s.trial_ends_at is not null
  and s.next_billing_date is null;

commit;
