create table if not exists public.learning_atoms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  study_space_id uuid not null references public.study_spaces(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete cascade,
  concept text not null check (char_length(concept) between 1 and 240),
  tension jsonb not null default '{}'::jsonb,
  emotional_shape text not null check (emotional_shape in ('dilemma', 'preference', 'betrayal', 'irony', 'escalation')),
  created_at timestamptz not null default now(),
  unique (user_id, material_id, concept)
);

create index if not exists learning_atoms_user_space_idx
  on public.learning_atoms(user_id, study_space_id, created_at desc);

create index if not exists learning_atoms_material_idx
  on public.learning_atoms(material_id, created_at desc);

alter table public.learning_atoms enable row level security;

create policy "Students can manage their learning atoms"
  on public.learning_atoms for all
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.study_spaces
      where study_spaces.id = study_space_id
        and study_spaces.user_id = auth.uid()
    )
    and exists (
      select 1 from public.materials
      where materials.id = material_id
        and materials.user_id = auth.uid()
        and materials.study_space_id = study_space_id
    )
  );

alter table public.study_artifacts
  add column if not exists atom_id uuid references public.learning_atoms(id) on delete set null,
  add column if not exists material_id uuid references public.materials(id) on delete set null,
  add column if not exists asset_path text,
  add column if not exists generation_key text unique;

alter table public.study_artifacts
  drop constraint if exists study_artifacts_kind_check;

alter table public.study_artifacts
  add constraint study_artifacts_kind_check
  check (kind in (
    'guide',
    'flashcards',
    'practice_test',
    'video_quiz',
    'video_create',
    'video_engage',
    'meme',
    'quiz',
    'flashcard',
    'fill_blank',
    'true_false',
    'did_you_know'
  ));

alter table public.learning_progress
  drop constraint if exists learning_progress_item_type_check;

alter table public.learning_progress
  add constraint learning_progress_item_type_check
  check (item_type in (
    'guide',
    'flashcards',
    'practice_test',
    'video_quiz',
    'video_create',
    'video_engage',
    'meme',
    'quiz',
    'flashcard',
    'fill_blank',
    'true_false',
    'did_you_know'
  ));

insert into storage.buckets (id, name, public)
values ('learning-assets', 'learning-assets', false)
on conflict (id) do nothing;

create policy "Students can upload learning assets"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'learning-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Students can view learning assets"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'learning-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Students can update learning assets"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'learning-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'learning-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Students can delete learning assets"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'learning-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
