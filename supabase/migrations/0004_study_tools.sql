create table if not exists public.study_artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  study_space_id uuid not null references public.study_spaces(id) on delete cascade,
  kind text not null check (kind in ('guide', 'flashcards', 'practice_test', 'video_quiz')),
  title text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.study_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  artifact_id uuid not null references public.study_artifacts(id) on delete cascade,
  score numeric not null check (score >= 0 and score <= 100),
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.learning_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  study_space_id uuid not null references public.study_spaces(id) on delete cascade,
  artifact_id uuid not null references public.study_artifacts(id) on delete cascade,
  item_type text not null check (item_type in ('guide', 'flashcards', 'practice_test', 'video_quiz')),
  completed_at timestamptz,
  last_score numeric check (last_score is null or (last_score >= 0 and last_score <= 100)),
  unique (user_id, artifact_id)
);

create index if not exists study_artifacts_user_space_idx
  on public.study_artifacts(user_id, study_space_id, created_at desc);

create index if not exists study_attempts_artifact_idx
  on public.study_attempts(user_id, artifact_id, created_at desc);

create index if not exists learning_progress_user_space_idx
  on public.learning_progress(user_id, study_space_id);

alter table public.study_artifacts enable row level security;
alter table public.study_attempts enable row level security;
alter table public.learning_progress enable row level security;

create policy "Students can manage their study artifacts"
  on public.study_artifacts for all
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.study_spaces
      where study_spaces.id = study_space_id
        and study_spaces.user_id = auth.uid()
    )
  );

create policy "Students can manage their study attempts"
  on public.study_attempts for all
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.study_artifacts
      where study_artifacts.id = artifact_id
        and study_artifacts.user_id = auth.uid()
    )
  );

create policy "Students can manage their learning progress"
  on public.learning_progress for all
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.study_artifacts
      where study_artifacts.id = artifact_id
        and study_artifacts.user_id = auth.uid()
    )
  );
