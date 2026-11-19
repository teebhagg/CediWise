begin;

alter table public.sms_import_logs alter column raw_message drop not null;
alter table public.sms_import_logs add column if not exists client_import_id text;
alter table public.sms_import_logs add column if not exists receipt_id text;
alter table public.sms_import_logs add column if not exists fallback_hmac text;
alter table public.sms_import_logs add column if not exists event_type text;
alter table public.sms_import_logs add column if not exists import_group_id uuid;
alter table public.sms_import_logs add column if not exists fee_transaction_id uuid references public.budget_transactions(id) on delete set null;
alter table public.sms_import_logs add column if not exists terminal_outcome text;
alter table public.sms_import_logs add column if not exists deleted_at timestamptz;
-- The structured RPC below stamps this field when it adopts an older raw log.
-- Keep the column in this migration so the function never references a schema
-- that is introduced only by a later migration.
alter table public.sms_import_logs add column if not exists attempt_started_at timestamptz;

alter table public.sms_import_logs drop constraint if exists sms_import_logs_parse_status_check;
alter table public.sms_import_logs add constraint sms_import_logs_parse_status_check
  check (parse_status in ('pending', 'processing', 'parsed', 'skipped', 'failed', 'needs_review', 'retryable', 'reversed', 'deleted'));

create unique index if not exists sms_import_logs_provider_receipt_unique
  on public.sms_import_logs(user_id, provider, receipt_id)
  where receipt_id is not null;
create unique index if not exists sms_import_logs_client_import_unique
  on public.sms_import_logs(user_id, client_import_id)
  where client_import_id is not null;
create unique index if not exists sms_import_logs_fallback_hmac_unique
  on public.sms_import_logs(user_id, fallback_hmac)
  where fallback_hmac is not null;

alter table public.budget_transactions add column if not exists sms_import_group_id uuid;
alter table public.budget_transactions add column if not exists sms_import_role text;
alter table public.budget_transactions add constraint budget_transactions_sms_import_role_check
  check (sms_import_role is null or sms_import_role in ('principal', 'fee')) not valid;
alter table public.budget_transactions validate constraint budget_transactions_sms_import_role_check;
create unique index if not exists budget_transactions_sms_import_group_role_unique
  on public.budget_transactions(sms_import_group_id, sms_import_role)
  where sms_import_group_id is not null and sms_import_role is not null;

create or replace function public.import_structured_momo_expense(
  p_user_id uuid,
  p_candidate jsonb,
  p_fallback_hmac text
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_provider text := p_candidate->>'provider';
  v_client_id text := p_candidate->>'clientImportId';
  v_receipt_id text := nullif(trim(p_candidate->>'receiptId'), '');
  v_event_type text := p_candidate->>'eventType';
  v_received_at timestamptz := (p_candidate->>'receivedAt')::timestamptz;
  v_principal_pesewas numeric;
  v_fee_pesewas numeric;
  v_amount numeric;
  v_fee numeric;
  v_counterparty text := nullif(trim(p_candidate->>'counterparty'), '');
  v_requested_category uuid := nullif(p_candidate->>'categoryId', '')::uuid;
  v_cycle_id uuid;
  v_category_id uuid;
  v_bucket text := 'wants';
  v_log_id uuid := gen_random_uuid();
  v_group_id uuid := gen_random_uuid();
  v_tx_id uuid;
  v_fee_tx_id uuid;
  v_existing record;
  v_conflicting record;
  v_reversed_log record;
  v_raw_transaction_count integer;
  v_raw_transaction_id uuid;
  v_reversal_target_count integer;
  v_reversed_receipt_id text := nullif(trim(p_candidate->>'reversedReceiptId'), '');
  v_legacy_dedupe_key text := nullif(trim(p_candidate->>'legacyDedupeKey'), '');
  v_dedupe_key text;
  v_persisted_candidate jsonb := p_candidate - 'legacyDedupeKey';
begin
  if p_user_id is null
     or nullif(trim(v_client_id), '') is null
     or v_provider is null
     or v_provider not in ('mtn_momo', 'telecel_cash', 'at_money')
     or v_event_type is null
     or v_received_at is null then
    raise exception 'invalid_structured_candidate';
  end if;

  -- Parse as numeric before conversion. A bigint cast overflows on valid JSON
  -- numbers before the API can return a controlled invalid-candidate response.
  v_principal_pesewas := nullif(p_candidate->>'principalPesewas', '')::numeric;
  v_fee_pesewas := coalesce(nullif(p_candidate->>'feePesewas', '')::numeric, 0);
  if v_fee_pesewas < 0
     or trunc(v_fee_pesewas) <> v_fee_pesewas
     or v_fee_pesewas > 9007199254740991 then
    raise exception 'invalid_fee';
  end if;
  v_fee := v_fee_pesewas / 100;
  v_dedupe_key := case
    when v_event_type <> 'reversal' and v_legacy_dedupe_key is not null then v_legacy_dedupe_key
    when v_receipt_id is not null then v_provider || ':' || v_receipt_id
    else 'client:' || v_client_id
  end;

  if v_event_type = 'reversal' then
    insert into public.sms_import_logs(
      id, user_id, provider, sender, raw_message, parse_status, parsed, dedupe_key,
      client_import_id, receipt_id, fallback_hmac, event_type, import_group_id,
      terminal_outcome
    ) values (
      v_log_id, p_user_id, v_provider, null, null, 'processing', v_persisted_candidate,
      v_dedupe_key,
      v_client_id, v_receipt_id, p_fallback_hmac, v_event_type, v_group_id,
      null
    ) on conflict do nothing;

    if not found then
      select id, budget_transaction_id, fee_transaction_id, parse_status
        into v_existing
      from public.sms_import_logs
      where user_id = p_user_id and (
        client_import_id = v_client_id
        or (v_receipt_id is not null and provider = v_provider and receipt_id = v_receipt_id)
        or (p_fallback_hmac is not null and fallback_hmac = p_fallback_hmac)
        or dedupe_key = v_dedupe_key
      )
      order by created_at limit 1;
      return jsonb_build_object(
        'status', 'duplicate',
        'importLogId', v_existing.id,
        'transactionId', v_existing.budget_transaction_id,
        'feeTransactionId', v_existing.fee_transaction_id
      );
    end if;

    if v_reversed_receipt_id is null then
      update public.sms_import_logs
      set parse_status = 'needs_review', terminal_outcome = 'reversal_target_missing'
      where id = v_log_id;
      return jsonb_build_object('status', 'needs_review', 'importLogId', v_log_id);
    end if;

    -- Prefer an exact receipt or transaction id. A generic reference can be
    -- reused by a provider, so only use it when it resolves to one log.
    select count(*) into v_reversal_target_count
    from public.sms_import_logs
    where user_id = p_user_id
      and provider = v_provider
      and parse_status in ('parsed', 'reversed')
      and (
        receipt_id = v_reversed_receipt_id
        or (receipt_id is null and parsed->>'txId' = v_reversed_receipt_id)
      );

    if v_reversal_target_count = 1 then
      select id, import_group_id, budget_transaction_id, fee_transaction_id, parse_status
        into v_reversed_log
      from public.sms_import_logs
      where user_id = p_user_id
        and provider = v_provider
        and parse_status in ('parsed', 'reversed')
        and (
          receipt_id = v_reversed_receipt_id
          or (receipt_id is null and parsed->>'txId' = v_reversed_receipt_id)
        )
      for update;
    elsif v_reversal_target_count = 0 then
      select count(*) into v_reversal_target_count
      from public.sms_import_logs
      where user_id = p_user_id
        and provider = v_provider
        and receipt_id is null
        and parsed->>'reference' = v_reversed_receipt_id
        and parse_status in ('parsed', 'reversed');

      if v_reversal_target_count = 1 then
        select id, import_group_id, budget_transaction_id, fee_transaction_id, parse_status
          into v_reversed_log
        from public.sms_import_logs
        where user_id = p_user_id
          and provider = v_provider
          and receipt_id is null
          and parsed->>'reference' = v_reversed_receipt_id
          and parse_status in ('parsed', 'reversed')
        for update;
      end if;
    end if;

    -- Rows can commit between the count and the locking select. Re-count now that the
    -- target is locked and treat any change as ambiguous instead of picking one row.
    if v_reversal_target_count = 1 and v_reversed_log.id is not null then
      select count(*) into v_reversal_target_count
      from public.sms_import_logs
      where user_id = p_user_id
        and provider = v_provider
        and parse_status in ('parsed', 'reversed')
        and (
          receipt_id = v_reversed_receipt_id
          or (receipt_id is null and parsed->>'txId' = v_reversed_receipt_id)
          or (receipt_id is null and parsed->>'reference' = v_reversed_receipt_id and id = v_reversed_log.id)
        );
    end if;

    if v_reversal_target_count <> 1 or v_reversed_log.id is null then
      update public.sms_import_logs
      set parse_status = 'needs_review', terminal_outcome = case
        when v_reversal_target_count > 1 then 'reversal_target_ambiguous'
        else 'reversal_target_not_found'
      end
      where id = v_log_id;
      return jsonb_build_object('status', 'needs_review', 'importLogId', v_log_id);
    end if;
    if v_reversed_log.parse_status = 'reversed' then
      update public.sms_import_logs
      set parse_status = 'reversed', terminal_outcome = 'already_reversed'
      where id = v_log_id;
      return jsonb_build_object('status', 'duplicate', 'importLogId', v_log_id);
    end if;
    delete from public.budget_transactions
    where user_id = p_user_id
      and (
        (v_reversed_log.import_group_id is not null and sms_import_group_id = v_reversed_log.import_group_id)
        or (v_reversed_log.import_group_id is null and sms_import_log_id = v_reversed_log.id and sms_import_group_id is null)
      );
    update public.sms_import_logs set
      parse_status = 'reversed', terminal_outcome = 'reversed',
      budget_transaction_id = null, fee_transaction_id = null
    where id = v_reversed_log.id;
    update public.sms_import_logs
      set parse_status = 'reversed', terminal_outcome = 'reversed'
      where id = v_log_id;
    return jsonb_build_object('status', 'reversed', 'importLogId', v_log_id);
  end if;

  if v_event_type not in ('merchant_payment', 'bill_payment', 'airtime_data', 'p2p_send')
     or coalesce(p_candidate->>'classification', '') <> 'expense' then
    raise exception 'candidate_requires_review';
  end if;
  if v_principal_pesewas is null
     or v_principal_pesewas <= 0
     or trunc(v_principal_pesewas) <> v_principal_pesewas
     or v_principal_pesewas > 9007199254740991 then
    raise exception 'invalid_amount';
  end if;
  v_amount := v_principal_pesewas / 100;

  -- A committed import must replay as a duplicate even if the user has since edited
  -- their cycle dates, so resolve it before requiring an active cycle.
  select id, budget_transaction_id, fee_transaction_id, parse_status
    into v_existing
  from public.sms_import_logs
  where user_id = p_user_id
    and client_import_id = v_client_id
    and parse_status = 'parsed'
    and budget_transaction_id is not null
  order by created_at limit 1;
  if found then
    return jsonb_build_object(
      'status', 'duplicate',
      'importLogId', v_existing.id,
      'transactionId', v_existing.budget_transaction_id,
      'feeTransactionId', v_existing.fee_transaction_id
    );
  end if;

  select id into v_cycle_id
  from public.budget_cycles
  where user_id = p_user_id
    and start_date <= v_received_at::date
    and end_date >= v_received_at::date
  order by start_date desc limit 1;
  if v_cycle_id is null then raise exception 'no_active_budget_cycle'; end if;

  if v_requested_category is not null then
    select id, bucket into v_category_id, v_bucket
    from public.budget_categories
    where id = v_requested_category and user_id = p_user_id and cycle_id = v_cycle_id and not coalesce(is_archived, false);
  end if;
  if v_category_id is null then
    select id, bucket into v_category_id, v_bucket
    from public.budget_categories
    where user_id = p_user_id and cycle_id = v_cycle_id and lower(name) in ('other', 'others') and not coalesce(is_archived, false)
    order by case when lower(name) = 'other' then 0 else 1 end, sort_order limit 1;
  end if;
  v_bucket := case when v_bucket in ('needs', 'wants', 'savings') then v_bucket else 'wants' end;

  insert into public.sms_import_logs(
    id, user_id, provider, sender, raw_message, parse_status, parsed, dedupe_key,
    client_import_id, receipt_id, fallback_hmac, event_type, import_group_id
  ) values (
    v_log_id, p_user_id, v_provider, null, null, 'processing', v_persisted_candidate,
    v_dedupe_key,
    v_client_id, v_receipt_id, p_fallback_hmac, v_event_type, v_group_id
  ) on conflict do nothing;

  if not found then
    -- A prior raw-message parser may have logged this exact SMS as failed or
    -- skipped without creating a transaction. Reuse that row so a higher
    -- confidence structured parse can recover it without violating the legacy
    -- dedupe key or creating a second import log.
    if v_legacy_dedupe_key is not null then
      select id, budget_transaction_id, fee_transaction_id, parse_status
        into v_existing
      from public.sms_import_logs
      where user_id = p_user_id and dedupe_key = v_dedupe_key
      for update;

      if found then
        if v_existing.budget_transaction_id is null
           and v_existing.fee_transaction_id is null
           and v_existing.parse_status in ('failed', 'skipped') then
          v_log_id := v_existing.id;
          select count(*) into v_raw_transaction_count
          from public.budget_transactions
          where user_id = p_user_id
            and sms_import_log_id = v_log_id
            and sms_import_group_id is null;

          if v_raw_transaction_count = 1 then
            select id into v_raw_transaction_id
            from public.budget_transactions
            where user_id = p_user_id
              and sms_import_log_id = v_log_id
              and sms_import_group_id is null
            order by created_at
            limit 1;
            update public.sms_import_logs set
              parse_status = 'parsed',
              parse_error = null,
              terminal_outcome = 'added',
              budget_transaction_id = v_raw_transaction_id
            where id = v_log_id;
            return jsonb_build_object(
              'status', 'duplicate',
              'importLogId', v_log_id,
              'transactionId', v_raw_transaction_id
            );
          elsif v_raw_transaction_count > 1 then
            update public.sms_import_logs set
              parse_status = 'needs_review',
              terminal_outcome = 'raw_transaction_link_ambiguous'
            where id = v_log_id;
            return jsonb_build_object('status', 'needs_review', 'importLogId', v_log_id);
          end if;

          select id, budget_transaction_id, fee_transaction_id, parse_status
            into v_conflicting
          from public.sms_import_logs
          where user_id = p_user_id
            and id <> v_log_id
            and (
              client_import_id = v_client_id
              or (v_receipt_id is not null and provider = v_provider and receipt_id = v_receipt_id)
              or (p_fallback_hmac is not null and fallback_hmac = p_fallback_hmac)
            )
          order by created_at limit 1;

          if found then
            return jsonb_build_object(
              'status', case
                when v_conflicting.parse_status = 'needs_review' then 'needs_review'
                when v_conflicting.parse_status in ('pending', 'processing', 'retryable')
                  and v_conflicting.budget_transaction_id is null then 'retryable'
                else 'duplicate'
              end,
              'importLogId', v_conflicting.id,
              'transactionId', v_conflicting.budget_transaction_id,
              'feeTransactionId', v_conflicting.fee_transaction_id
            );
          end if;

          begin
            update public.sms_import_logs set
              provider = v_provider,
              parse_status = 'processing',
              parse_error = null,
              parsed = v_persisted_candidate,
              client_import_id = v_client_id,
              receipt_id = v_receipt_id,
              fallback_hmac = p_fallback_hmac,
              event_type = v_event_type,
              import_group_id = v_group_id,
              terminal_outcome = null,
              attempt_started_at = now()
            where id = v_log_id;
          exception when unique_violation then
            select id, budget_transaction_id, fee_transaction_id, parse_status
              into v_conflicting
            from public.sms_import_logs
            where user_id = p_user_id
              and id <> v_log_id
              and (
                client_import_id = v_client_id
                or (v_receipt_id is not null and provider = v_provider and receipt_id = v_receipt_id)
                or (p_fallback_hmac is not null and fallback_hmac = p_fallback_hmac)
              )
            order by created_at limit 1;
            if not found then raise; end if;
            return jsonb_build_object(
              'status', case
                when v_conflicting.parse_status = 'needs_review' then 'needs_review'
                when v_conflicting.parse_status in ('pending', 'processing', 'retryable')
                  and v_conflicting.budget_transaction_id is null then 'retryable'
                else 'duplicate'
              end,
              'importLogId', v_conflicting.id,
              'transactionId', v_conflicting.budget_transaction_id,
              'feeTransactionId', v_conflicting.fee_transaction_id
            );
          end;
        else
          return jsonb_build_object(
            'status', case
              when v_existing.parse_status = 'needs_review' then 'needs_review'
              when v_existing.parse_status in ('pending', 'processing', 'retryable')
                and v_existing.budget_transaction_id is null then 'retryable'
              else 'duplicate'
            end,
            'importLogId', v_existing.id,
            'transactionId', v_existing.budget_transaction_id,
            'feeTransactionId', v_existing.fee_transaction_id
          );
        end if;
      else
        select id, budget_transaction_id, fee_transaction_id, parse_status
          into v_existing
        from public.sms_import_logs
        where user_id = p_user_id and (
          client_import_id = v_client_id
          or (v_receipt_id is not null and provider = v_provider and receipt_id = v_receipt_id)
          or (p_fallback_hmac is not null and fallback_hmac = p_fallback_hmac)
        )
        order by created_at limit 1;
        return jsonb_build_object(
          'status', case
            when v_existing.parse_status = 'needs_review' then 'needs_review'
            when v_existing.parse_status in ('pending', 'processing', 'retryable')
              and v_existing.budget_transaction_id is null then 'retryable'
            else 'duplicate'
          end,
          'importLogId', v_existing.id,
          'transactionId', v_existing.budget_transaction_id,
          'feeTransactionId', v_existing.fee_transaction_id
        );
      end if;
    else
      select id, budget_transaction_id, fee_transaction_id, parse_status
        into v_existing
      from public.sms_import_logs
      where user_id = p_user_id and (
        client_import_id = v_client_id
        or (v_receipt_id is not null and provider = v_provider and receipt_id = v_receipt_id)
        or (p_fallback_hmac is not null and fallback_hmac = p_fallback_hmac)
        or dedupe_key = v_dedupe_key
      )
      order by created_at limit 1;
      return jsonb_build_object(
        'status', case
          when v_existing.parse_status = 'needs_review' then 'needs_review'
          when v_existing.parse_status in ('pending', 'processing', 'retryable')
            and v_existing.budget_transaction_id is null then 'retryable'
          else 'duplicate'
        end,
        'importLogId', v_existing.id,
        'transactionId', v_existing.budget_transaction_id,
        'feeTransactionId', v_existing.fee_transaction_id
      );
    end if;
  end if;

  insert into public.budget_transactions(
    user_id, cycle_id, bucket, category_id, amount, note, occurred_at, source,
    sms_import_log_id, sms_import_group_id, sms_import_role
  ) values (
    p_user_id, v_cycle_id, v_bucket, v_category_id, v_amount,
    'MoMo → ' || coalesce(v_counterparty, 'Unknown'), v_received_at, 'sms_webhook',
    v_log_id, v_group_id, 'principal'
  ) returning id into v_tx_id;

  if v_fee > 0 then
    insert into public.budget_transactions(
      user_id, cycle_id, bucket, category_id, amount, note, occurred_at, source,
      sms_import_log_id, sms_import_group_id, sms_import_role
    ) values (
      p_user_id, v_cycle_id, v_bucket, v_category_id, v_fee,
      'MoMo transaction fee', v_received_at, 'sms_webhook',
      v_log_id, v_group_id, 'fee'
    ) returning id into v_fee_tx_id;
  end if;

  update public.sms_import_logs set
    parse_status = 'parsed', terminal_outcome = 'added',
    budget_transaction_id = v_tx_id, fee_transaction_id = v_fee_tx_id
  where id = v_log_id;

  return jsonb_build_object(
    'status', 'parsed', 'importLogId', v_log_id,
    'transactionId', v_tx_id, 'feeTransactionId', v_fee_tx_id
  );
end;
$$;

revoke all on function public.import_structured_momo_expense(uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.import_structured_momo_expense(uuid, jsonb, text) to service_role;

commit;
