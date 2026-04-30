-- Push notifications schema for local reminders + admin announcements.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  app_version text,
  device_label text,
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_devices_user_active_idx
  on public.push_devices (user_id, is_active);

create index if not exists push_devices_active_last_seen_idx
  on public.push_devices (is_active, last_seen_at desc);

alter table public.push_devices enable row level security;

drop policy if exists push_devices_self_select on public.push_devices;
create policy push_devices_self_select
  on public.push_devices
  for select
  using (user_id = auth.uid());

drop policy if exists push_devices_self_insert on public.push_devices;
create policy push_devices_self_insert
  on public.push_devices
  for insert
  with check (user_id = auth.uid());

drop policy if exists push_devices_self_update on public.push_devices;
create policy push_devices_self_update
  on public.push_devices
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop trigger if exists push_devices_updated_at on public.push_devices;
create trigger push_devices_updated_at
  before update on public.push_devices
  for each row
  execute function public.set_updated_at();

create table if not exists public.announcement_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  deep_link text,
  audience_type text not null default 'all' check (audience_type in ('all')),
  status text not null default 'queued' check (status in ('draft', 'queued', 'sending', 'sent', 'failed')),
  created_by uuid not null references auth.users(id) on delete restrict,
  sent_at timestamptz,
  attempted_count int not null default 0,
  success_count int not null default 0,
  failure_count int not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists announcement_campaigns_status_idx
  on public.announcement_campaigns (status, created_at desc);

alter table public.announcement_campaigns enable row level security;

drop policy if exists announcement_campaigns_admin_read on public.announcement_campaigns;
create policy announcement_campaigns_admin_read
  on public.announcement_campaigns
  for select
  using (
    exists (
      select 1 from public.admin_users a
      where a.user_id = auth.uid()
    )
  );

drop policy if exists announcement_campaigns_admin_insert on public.announcement_campaigns;
create policy announcement_campaigns_admin_insert
  on public.announcement_campaigns
  for insert
  with check (
    exists (
      select 1 from public.admin_users a
      where a.user_id = auth.uid()
    )
  );

drop trigger if exists announcement_campaigns_updated_at on public.announcement_campaigns;
create trigger announcement_campaigns_updated_at
  before update on public.announcement_campaigns
  for each row
  execute function public.set_updated_at();

create table if not exists public.announcement_deliveries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.announcement_campaigns(id) on delete cascade,
  push_device_id uuid not null references public.push_devices(id) on delete cascade,
  expo_push_token text not null,
  status text not null check (status in ('success', 'error')),
  provider_ticket_id text,
  error_code text,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists announcement_deliveries_campaign_idx
  on public.announcement_deliveries (campaign_id);

create index if not exists announcement_deliveries_status_idx
  on public.announcement_deliveries (status);

create index if not exists announcement_deliveries_created_idx
  on public.announcement_deliveries (created_at desc);

alter table public.announcement_deliveries enable row level security;

drop policy if exists announcement_deliveries_admin_read on public.announcement_deliveries;
create policy announcement_deliveries_admin_read
  on public.announcement_deliveries
  for select
  using (
    exists (
      select 1 from public.admin_users a
      where a.user_id = auth.uid()
    )
  );
