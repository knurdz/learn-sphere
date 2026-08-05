-- Gamification: activity log, streaks, XP, coach tour state.

create table if not exists public.user_activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  local_date date not null,
  xp_awarded integer not null default 0 check (xp_awarded >= 0),
  occurred_at timestamptz not null default now()
);

create index if not exists user_activity_events_user_occurred_idx
  on public.user_activity_events (user_id, occurred_at desc);

create index if not exists user_activity_events_user_local_date_idx
  on public.user_activity_events (user_id, local_date desc);

create unique index if not exists user_activity_events_idempotency_idx
  on public.user_activity_events (user_id, ((metadata ->> 'idempotency_key')))
  where (metadata ->> 'idempotency_key') is not null;

create table if not exists public.user_gamification (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_qualifying_date date,
  total_xp integer not null default 0 check (total_xp >= 0),
  daily_goal integer not null default 3 check (daily_goal between 1 and 50),
  coach_tour_completed jsonb not null default '{"version":1,"steps":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_activity_events enable row level security;
alter table public.user_gamification enable row level security;

create policy "Students can view their activity events"
  on public.user_activity_events for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Students can view their gamification"
  on public.user_gamification for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  )
  on conflict (id) do nothing;

  insert into public.user_gamification (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

insert into public.user_gamification (user_id)
select id from auth.users
on conflict (user_id) do nothing;
