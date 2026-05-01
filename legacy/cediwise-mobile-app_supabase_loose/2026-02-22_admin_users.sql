-- Admin users table for dashboard role-based authorization.
-- Users in this table have admin access. Check this table first; env allowlist is fallback.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin', 'super_admin')),
  created_at timestamptz not null default now()
);

-- RLS: deny anon/authenticated; service_role (dashboard backend) bypasses RLS.
alter table public.admin_users enable row level security;

-- No policies = default deny. service_role bypasses RLS.
comment on table public.admin_users is 'Dashboard admin users. Role-first auth. To add an admin: insert into admin_users (user_id) select id from auth.users where email = ''your@email.com'';';
