alter table public.email_campaigns
  drop constraint if exists email_campaigns_template_key_check;

alter table public.email_campaigns
  add constraint email_campaigns_template_key_check
  check (template_key in ('general_update', 'support_response', 'feedback_followup', 'join_beta'));

alter table public.email_campaigns
  add column if not exists message_body_html text not null default '',
  add column if not exists message_body_text text not null default '';

update public.email_campaigns
set
  message_body_html = case
    when coalesce(trim(message_body_html), '') = '' then '<p>' || replace(replace(coalesce(message_body, ''), '&', '&amp;'), '<', '&lt;') || '</p>'
    else message_body_html
  end,
  message_body_text = case
    when coalesce(trim(message_body_text), '') = '' then coalesce(message_body, '')
    else message_body_text
  end
where coalesce(trim(message_body_html), '') = ''
   or coalesce(trim(message_body_text), '') = '';
