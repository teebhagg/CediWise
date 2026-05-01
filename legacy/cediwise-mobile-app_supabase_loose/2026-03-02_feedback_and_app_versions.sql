-- Shared feedback table for website beta and future channels
create extension if not exists pgcrypto;

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('bug_report', 'feature_request', 'general_comment')),
  rating int not null check (rating >= 1 and rating <= 5),
  feedback_text text not null,
  email text not null,
  is_beta boolean not null default false,
  version text not null,
  source text not null default 'website_feedback_page',
  created_at timestamptz not null default now()
);

create index if not exists idx_feedback_created_at on public.feedback (created_at desc);
create index if not exists idx_feedback_category_created_at on public.feedback (category, created_at desc);
create index if not exists idx_feedback_is_beta_created_at on public.feedback (is_beta, created_at desc);
create index if not exists idx_feedback_rating_created_at on public.feedback (rating, created_at desc);

-- Current app versions used by website feedback stamping
create table if not exists public.app_versions (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('android', 'ios', 'web')),
  version text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_app_versions_platform_active on public.app_versions (platform, is_active, updated_at desc);

create unique index if not exists uniq_active_app_version_per_platform
  on public.app_versions (platform)
  where is_active = true;

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_app_versions_updated_at on public.app_versions;
create trigger trg_app_versions_updated_at
before update on public.app_versions
for each row
execute function public.set_updated_at_timestamp();
