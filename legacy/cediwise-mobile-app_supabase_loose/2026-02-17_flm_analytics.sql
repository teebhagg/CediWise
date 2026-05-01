-- Financial Literacy Module - Analytics Tables
-- Migration: 2026-02-17_flm_analytics.sql

-- ============================================================
-- 1. Analytics Events Table
-- ============================================================
create table if not exists public.literacy_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  event_type text not null check (event_type in (
    'lesson_viewed',
    'lesson_completed',
    'quiz_attempted',
    'quiz_passed',
    'module_completed',
    'calculator_used',
    'trigger_shown',
    'trigger_dismissed',
    'trigger_action_taken'
  )),
  lesson_id text,
  module_id text,
  calculator_id text,
  trigger_id text,
  metadata jsonb default '{}', -- Additional context (e.g., quiz_score, time_spent)
  created_at timestamptz not null default now()
);

-- Indexes for common queries
create index idx_literacy_events_user_id on literacy_events(user_id);
create index idx_literacy_events_type on literacy_events(event_type);
create index idx_literacy_events_created_at on literacy_events(created_at);
create index idx_literacy_events_lesson_id on literacy_events(lesson_id);
create index idx_literacy_events_module_id on literacy_events(module_id);

-- RLS Policies
alter table literacy_events enable row level security;

-- Users can insert their own events
create policy "Users can insert their own literacy events"
  on literacy_events for insert
  with check (auth.uid() = user_id);

-- Users can view their own events
create policy "Users can view their own literacy events"
  on literacy_events for select
  using (auth.uid() = user_id);

-- ============================================================
-- 2. Lesson Feedback Table
-- ============================================================
create table if not exists public.lesson_feedback (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  lesson_id text not null,
  rating int check (rating >= 1 and rating <= 5),
  feedback_type text check (feedback_type in ('helpful', 'unclear', 'incorrect', 'suggestion', 'other')),
  comment text,
  is_resolved boolean default false,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_lesson_feedback_user_id on lesson_feedback(user_id);
create index idx_lesson_feedback_lesson_id on lesson_feedback(lesson_id);
create index idx_lesson_feedback_is_resolved on lesson_feedback(is_resolved);

-- RLS Policies
alter table lesson_feedback enable row level security;

-- Users can insert feedback
create policy "Users can insert lesson feedback"
  on lesson_feedback for insert
  with check (auth.uid() = user_id);

-- Users can view their own feedback
create policy "Users can view their own lesson feedback"
  on lesson_feedback for select
  using (auth.uid() = user_id);

-- ============================================================
-- 3. Module Completion Summary (Materialized View)
-- ============================================================
-- Note: This is a view to aggregate progress
create or replace view module_completion_stats as
select
  module_id,
  count(distinct user_id) as total_users,
  avg(case when event_type = 'module_completed' then 1 else 0 end) as completion_rate,
  count(*) filter (where event_type = 'lesson_viewed') as total_views,
  count(*) filter (where event_type = 'quiz_attempted') as total_quiz_attempts
from literacy_events
where module_id is not null
group by module_id;

-- ============================================================
-- 4. User Learning Streaks (Optional Enhancement)
-- ============================================================
create table if not exists public.learning_streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak int default 0,
  longest_streak int default 0,
  last_activity_date date,
  updated_at timestamptz not null default now()
);

-- RLS Policies
alter table learning_streaks enable row level security;

-- Users can view their own streaks
create policy "Users can view their own learning streaks"
  on learning_streaks for select
  using (auth.uid() = user_id);

-- Users can update their own streaks
create policy "Users can update their own learning streaks"
  on learning_streaks for update
  using (auth.uid() = user_id);

-- Users can insert their own streaks
create policy "Users can insert their own learning streaks"
  on learning_streaks for insert
  with check (auth.uid() = user_id);

-- ============================================================
-- 5. Analytics Helper Functions
-- ============================================================

-- Function to get user's learning summary
create or replace function get_user_learning_summary(target_user_id uuid)
returns json as $$
declare
  result json;
begin
  select json_build_object(
    'total_lessons_viewed', count(*) filter (where event_type = 'lesson_viewed'),
    'lessons_completed', count(distinct lesson_id) filter (where event_type = 'lesson_completed'),
    'quizzes_attempted', count(*) filter (where event_type = 'quiz_attempted'),
    'quizzes_passed', count(*) filter (where event_type = 'quiz_passed'),
    'modules_completed', count(distinct module_id) filter (where event_type = 'module_completed'),
    'calculators_used', count(distinct calculator_id) filter (where event_type = 'calculator_used'),
    'first_activity', min(created_at),
    'last_activity', max(created_at)
  ) into result
  from literacy_events
  where user_id = target_user_id;

  return result;
end;
$$ language plpgsql security definer;

-- Grant execute permission
grant execute on function get_user_learning_summary(uuid) to authenticated;

-- ============================================================
-- 6. Analytics Data Retention (90 days as per FRD)
-- ============================================================
-- Note: Set up a cron job to run this monthly
create or replace function cleanup_old_analytics()
returns void as $$
begin
  delete from literacy_events
  where created_at < now() - interval '90 days';
end;
$$ language plpgsql security definer;

-- ============================================================
-- Comments for Documentation
-- ============================================================
comment on table literacy_events is 'Tracks user interactions with Financial Literacy Module (90-day retention)';
comment on table lesson_feedback is 'User feedback on lesson quality and clarity';
comment on table learning_streaks is 'Tracks user learning consistency and streaks';
comment on function get_user_learning_summary(uuid) is 'Returns aggregated learning stats for a user';
