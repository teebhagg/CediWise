alter table if exists public.app_versions
  add column if not exists release_notes text,
  add column if not exists requires_update boolean not null default false;

comment on column public.app_versions.release_notes is
  'Release notes shown in update prompts and store metadata sync.';

comment on column public.app_versions.requires_update is
  'If true and the client is behind this active version, app should enforce a mandatory update gate.';
