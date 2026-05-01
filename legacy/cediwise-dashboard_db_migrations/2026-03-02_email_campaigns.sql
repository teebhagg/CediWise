create extension if not exists pgcrypto;

create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  template_key text not null check (template_key in ('general_update', 'support_response', 'feedback_followup')),
  subject text not null,
  message_body text not null,
  cta_label text,
  cta_url text,
  audience_type text not null check (audience_type in ('single', 'selected_users', 'feedback_reply')),
  recipient_count int not null default 0,
  success_count int not null default 0,
  failure_count int not null default 0,
  status text not null check (status in ('queued', 'sending', 'sent', 'failed', 'partial_failed')),
  created_by uuid references auth.users(id) on delete set null,
  source text not null default 'emails_section' check (source in ('users_tab', 'user_profile', 'app_feedback', 'emails_section')),
  source_feedback_id uuid references public.feedback(id) on delete set null,
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists idx_email_campaigns_created_at on public.email_campaigns(created_at desc);
create index if not exists idx_email_campaigns_status on public.email_campaigns(status, created_at desc);
create index if not exists idx_email_campaigns_created_by on public.email_campaigns(created_by, created_at desc);

create table if not exists public.email_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.email_campaigns(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  recipient_name text,
  delivery_status text not null check (delivery_status in ('queued', 'sent', 'failed', 'bounced', 'complained')),
  provider_message_id text,
  error_code text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_email_recipients_campaign on public.email_recipients(campaign_id, created_at desc);
create index if not exists idx_email_recipients_status on public.email_recipients(delivery_status, created_at desc);
create index if not exists idx_email_recipients_email on public.email_recipients(email);
