-- Migration: Financial Literacy Module (FLM) tables
-- Date: 2026-02-16
-- Tables: lessons, user_lesson_progress, live_tbill_rates, trigger_dismissals

-- Lessons (public read, admin write)
create table if not exists public.lessons (
  id text primary key,
  title text not null,
  module text not null,
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'advanced')),
  duration_minutes int not null check (duration_minutes >= 1 and duration_minutes <= 120),
  languages text[] not null default '{en}',
  tags text[] not null default '{}',
  content_url text,
  calculator_id text,
  sources jsonb not null default '[]',
  verified_by jsonb,
  version text not null,
  last_updated timestamptz not null,
  created_at timestamptz not null default now()
);

-- Constraints for module
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'lessons_module_check') then
    alter table public.lessons add constraint lessons_module_check
      check (module in ('MOD-01', 'MOD-02', 'MOD-03', 'MOD-04', 'MOD-05', 'MOD-06', 'MOD-07', 'MOD-08', 'MOD-09'));
  end if;
end $$;

-- Indexes for lessons
create index if not exists lessons_module_idx on public.lessons(module);
create index if not exists lessons_difficulty_idx on public.lessons(difficulty);

-- User lesson progress (RLS: user_id = auth.uid())
create table if not exists public.user_lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null,
  completed_at timestamptz,
  quiz_score numeric check (quiz_score is null or (quiz_score >= 0 and quiz_score <= 1)),
  quiz_attempted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

-- FK to lessons (optional, allows lessons to be loaded from bundled content)
alter table public.user_lesson_progress
  drop constraint if exists user_lesson_progress_lesson_id_fkey;
alter table public.user_lesson_progress
  add constraint user_lesson_progress_lesson_id_fkey
  foreign key (lesson_id) references public.lessons(id) on delete cascade;

-- Indexes for progress
create index if not exists user_lesson_progress_user_id_idx on public.user_lesson_progress(user_id);
create index if not exists user_lesson_progress_lesson_id_idx on public.user_lesson_progress(lesson_id);

-- Live T-Bill rates (admin write, public read)
create table if not exists public.live_tbill_rates (
  id uuid primary key default gen_random_uuid(),
  tenor text not null,
  rate numeric not null check (rate >= 0 and rate <= 100),
  fetched_at timestamptz not null,
  source_snapshot_id text
);

create index if not exists live_tbill_rates_fetched_at_idx on public.live_tbill_rates(fetched_at desc);

-- Trigger dismissals (RLS)
create table if not exists public.trigger_dismissals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trigger_id text not null,
  dismissed_at timestamptz not null default now(),
  unique (user_id, trigger_id)
);

create index if not exists trigger_dismissals_user_id_idx on public.trigger_dismissals(user_id);

-- RLS
alter table public.lessons enable row level security;
alter table public.user_lesson_progress enable row level security;
alter table public.live_tbill_rates enable row level security;
alter table public.trigger_dismissals enable row level security;

-- Lessons: public read
drop policy if exists lessons_read_all on public.lessons;
create policy lessons_read_all on public.lessons for select using (true);

-- User progress: user can manage own rows
drop policy if exists user_lesson_progress_self on public.user_lesson_progress;
create policy user_lesson_progress_self on public.user_lesson_progress
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- T-Bill rates: public read
drop policy if exists live_tbill_rates_read_all on public.live_tbill_rates;
create policy live_tbill_rates_read_all on public.live_tbill_rates for select using (true);

-- Trigger dismissals: user can manage own rows
drop policy if exists trigger_dismissals_self on public.trigger_dismissals;
create policy trigger_dismissals_self on public.trigger_dismissals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
