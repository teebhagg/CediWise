-- MoMo SMS import: webhook credentials, import logs, budget transaction traceability.
-- Import logs retained 180 days (purged by scheduled job calling purge_expired_sms_import_logs).

begin;

-- ---------------------------------------------------------------------------
-- sms_webhook_credentials: one active key per user (hashed at rest)
-- ---------------------------------------------------------------------------
create table if not exists public.sms_webhook_credentials (
  user_id uuid primary key references auth.users (id) on delete cascade,
  key_hash text not null,
  key_prefix text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  rotated_at timestamptz,
  last_used_at timestamptz,
  constraint sms_webhook_credentials_key_prefix_len check (char_length(key_prefix) >= 8)
);

comment on table public.sms_webhook_credentials is
  'Per-user API keys for MoMo SMS import (iOS Shortcuts / external webhooks). Plaintext shown once via rotate_sms_webhook_key().';

create index if not exists idx_sms_webhook_credentials_enabled
  on public.sms_webhook_credentials (enabled)
  where enabled = true;

alter table public.sms_webhook_credentials enable row level security;

create policy "sms_webhook_credentials_self_select"
  on public.sms_webhook_credentials
  for select
  using (user_id = auth.uid());

-- key_hash is service_role only; clients see prefix + metadata for settings UI
revoke all on public.sms_webhook_credentials from anon;
grant select (user_id, key_prefix, enabled, created_at, rotated_at, last_used_at)
  on public.sms_webhook_credentials to authenticated;
grant all on public.sms_webhook_credentials to service_role;

create index if not exists idx_sms_webhook_credentials_key_prefix
  on public.sms_webhook_credentials (key_prefix)
  where enabled = true;

-- ---------------------------------------------------------------------------
-- sms_import_logs: raw SMS audit, dedupe, parse outcome (180-day retention)
-- ---------------------------------------------------------------------------
create table if not exists public.sms_import_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text,
  sender text,
  raw_message text not null,
  parse_status text not null default 'pending'
    check (
      parse_status in (
        'pending',
        'parsed',
        'skipped',
        'failed',
        'duplicate' -- API response only; rows are never stored with this status (dedupe is unique)
      )
      and (
        parse_status <> 'parsed'
        or budget_transaction_id is not null
      )
    ),
  parse_error text,
  parsed jsonb,
  dedupe_key text not null,
  budget_transaction_id uuid references public.budget_transactions (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint sms_import_logs_dedupe unique (user_id, dedupe_key)
);

comment on table public.sms_import_logs is
  'MoMo SMS import audit trail. Raw message + parse metadata; delete after 180 days via purge_expired_sms_import_logs(). Budget transactions are kept separately.';

create index if not exists idx_sms_import_logs_user_created
  on public.sms_import_logs (user_id, created_at desc);

create index if not exists idx_sms_import_logs_status
  on public.sms_import_logs (parse_status, created_at desc);

create index if not exists idx_sms_import_logs_created_at
  on public.sms_import_logs (created_at);

alter table public.sms_import_logs enable row level security;

create policy "sms_import_logs_self_select"
  on public.sms_import_logs
  for select
  using (user_id = auth.uid());

revoke all on public.sms_import_logs from anon;
grant select on public.sms_import_logs to authenticated;
grant all on public.sms_import_logs to service_role;

-- ---------------------------------------------------------------------------
-- budget_transactions: link imported expenses back to source log
-- ---------------------------------------------------------------------------
alter table public.budget_transactions
  add column if not exists sms_import_log_id uuid
  references public.sms_import_logs (id) on delete set null;

create index if not exists idx_budget_transactions_sms_import
  on public.budget_transactions (sms_import_log_id)
  where sms_import_log_id is not null;

-- Prevent linking a transaction to another user's import log
create or replace function public.enforce_sms_import_log_owner_match ()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.sms_import_log_id is not null then
    if not exists (
      select 1
      from public.sms_import_logs l
      where l.id = new.sms_import_log_id
        and l.user_id = new.user_id
    ) then
      raise exception 'sms_import_log_id must belong to the same user';
    end if;
  end if;

  return new;
end;
$$;

create trigger budget_transactions_sms_import_log_owner
  before insert or update of sms_import_log_id
  on public.budget_transactions
  for each row
  execute function public.enforce_sms_import_log_owner_match ();

-- ---------------------------------------------------------------------------
-- rotate_sms_webhook_key: returns plaintext key once (authenticated user)
-- ---------------------------------------------------------------------------
create or replace function public.rotate_sms_webhook_key ()
returns table (api_key text, key_prefix text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_raw text;
  v_hash text;
  v_prefix text;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  v_raw := 'cwsk_' || replace(
    replace(encode(gen_random_bytes(24), 'base64'), '+', '-'),
    '/',
    '_'
  );
  v_hash := encode(digest(v_raw, 'sha256'), 'hex');
  v_prefix := left(v_raw, 12);

  insert into public.sms_webhook_credentials (
    user_id,
    key_hash,
    key_prefix,
    enabled,
    rotated_at
  )
  values (
    v_user_id,
    v_hash,
    v_prefix,
    true,
    now()
  )
  on conflict (user_id) do update
  set
    key_hash = excluded.key_hash,
    key_prefix = excluded.key_prefix,
    enabled = true,
    rotated_at = now(),
    last_used_at = null;

  return query
  select v_raw as api_key, v_prefix as key_prefix;
end;
$$;

revoke all on function public.rotate_sms_webhook_key () from public;
grant execute on function public.rotate_sms_webhook_key () to authenticated;

-- ---------------------------------------------------------------------------
-- disable_sms_webhook: opt out without deleting hash row
-- ---------------------------------------------------------------------------
create or replace function public.disable_sms_webhook ()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  update public.sms_webhook_credentials
  set enabled = false
  where user_id = auth.uid();
end;
$$;

revoke all on function public.disable_sms_webhook () from public;
grant execute on function public.disable_sms_webhook () to authenticated;

-- ---------------------------------------------------------------------------
-- purge_expired_sms_import_logs: 180-day retention (service_role / cron)
-- ---------------------------------------------------------------------------
create or replace function public.purge_expired_sms_import_logs ()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.sms_import_logs
  where created_at < now() - interval '180 days';

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

comment on function public.purge_expired_sms_import_logs () is
  'Deletes sms_import_logs older than 180 days. Budget transactions are unaffected (FK ON DELETE SET NULL).';

revoke all on function public.purge_expired_sms_import_logs () from public, anon, authenticated;
grant execute on function public.purge_expired_sms_import_logs () to service_role;

-- Daily purge of import logs older than 180 days (2 AM UTC)
select cron.schedule(
  'sms-import-logs-purge',
  '0 2 * * *',
  $$ select public.purge_expired_sms_import_logs(); $$
);

commit;
