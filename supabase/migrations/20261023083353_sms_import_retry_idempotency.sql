-- Claim abandoned raw-import attempts once and prevent two requests from linking
-- multiple raw transactions to the same import log. Structured imports use a
-- non-null group id because one SMS may produce both principal and fee rows.
begin;

alter table public.sms_import_logs
  add column if not exists attempt_started_at timestamptz;

create index if not exists sms_import_logs_attempt_started_at_idx
  on public.sms_import_logs (attempt_started_at)
  where parse_status in ('pending', 'processing', 'retryable');

-- Fail with an actionable message rather than an opaque index error if older
-- concurrent imports already linked multiple raw transactions to one log. Keep
-- transaction writes out until the check and unique index are both complete.
lock table public.budget_transactions in share mode;

do $$
begin
  if exists (
    select 1
    from public.budget_transactions
    where sms_import_log_id is not null
      and sms_import_group_id is null
    group by sms_import_log_id
    having count(*) > 1
  ) then
    raise exception using
      message = 'Cannot enforce one raw SMS transaction per import log: duplicate links exist. Review and reconcile those transaction rows before retrying this migration.';
  end if;
end;
$$;

create unique index if not exists budget_transactions_sms_import_raw_log_unique
  on public.budget_transactions (sms_import_log_id)
  where sms_import_log_id is not null and sms_import_group_id is null;

commit;
