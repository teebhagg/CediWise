create table if not exists public.user_onboarding_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  onboarding_version integer not null default 1,
  state_1_status text not null default 'never_seen'
    check (state_1_status in ('never_seen', 'in_progress', 'dismissed', 'completed', 'invalidated')),
  state_1_seen_at timestamptz null,
  state_1_completed_at timestamptz null,
  state_1_dismissed_at timestamptz null,
  state_1_invalidated_at timestamptz null,
  state_2_status text not null default 'never_seen'
    check (state_2_status in ('never_seen', 'in_progress', 'dismissed', 'completed', 'invalidated')),
  state_2_seen_at timestamptz null,
  state_2_completed_at timestamptz null,
  state_2_dismissed_at timestamptz null,
  state_2_invalidated_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on public.user_onboarding_state;

create trigger set_updated_at
  before update on public.user_onboarding_state
  for each row execute function public.set_updated_at();

alter table public.user_onboarding_state enable row level security;

create policy "Users can read own onboarding state"
  on public.user_onboarding_state
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own onboarding state"
  on public.user_onboarding_state
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own onboarding state"
  on public.user_onboarding_state
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users cannot delete onboarding state"
  on public.user_onboarding_state
  for delete
  using (false);
