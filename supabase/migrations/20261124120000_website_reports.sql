begin;

-- Public "Report an issue" submissions from the CediWise website.
-- Written and read only by the website server (service role) and the dashboard
-- (service role behind an admin check). RLS is on with no policies, so anon and
-- authenticated clients cannot read or write these rows.

create table public.website_reports (
  id uuid primary key default gen_random_uuid(),
  category text not null check (
    category in ('app_problem', 'account_or_payment', 'content_or_data', 'safety_or_abuse', 'other')
  ),
  reporter_name text check (reporter_name is null or char_length(reporter_name) between 1 and 120),
  reporter_email text not null check (
    reporter_email = lower(btrim(reporter_email)) and char_length(reporter_email) between 3 and 255
  ),
  message text not null check (char_length(btrim(message)) between 10 and 3000),
  page text check (page is null or char_length(page) between 1 and 300),
  source text not null default 'website_report_page' check (source in ('website_report_page')),
  status text not null default 'open' check (status in ('open', 'in_review', 'resolved')),
  email_status text not null default 'pending' check (email_status in ('pending', 'sent', 'failed')),
  email_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index website_reports_created_at_idx
  on public.website_reports (created_at desc);
create index website_reports_status_created_at_idx
  on public.website_reports (status, created_at desc);
create index website_reports_email_created_at_idx
  on public.website_reports (reporter_email, created_at desc);

alter table public.website_reports enable row level security;
revoke all on table public.website_reports from anon, authenticated;

commit;
