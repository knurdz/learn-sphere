create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  study_space_id uuid not null references public.study_spaces(id) on delete cascade,
  title text not null default 'New tutor session',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  citations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists chat_sessions_user_id_idx
  on public.chat_sessions(user_id, updated_at desc);

create index if not exists chat_messages_session_id_idx
  on public.chat_messages(session_id, created_at);

alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

create policy "Students can manage their tutor sessions"
  on public.chat_sessions for all
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

create policy "Students can manage their tutor messages"
  on public.chat_messages for all
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.chat_sessions
      where chat_sessions.id = session_id
        and chat_sessions.user_id = auth.uid()
    )
  );
