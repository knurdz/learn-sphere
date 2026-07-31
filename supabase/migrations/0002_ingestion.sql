alter table public.materials
  drop constraint if exists materials_status_check;

alter table public.materials
  add constraint materials_status_check
  check (status in ('created', 'uploaded', 'processing', 'ready', 'upload_failed', 'error'));

alter table public.materials
  add column if not exists ingestion_error text,
  add column if not exists ingested_at timestamptz;

create table if not exists public.material_chunks (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  study_space_id uuid not null references public.study_spaces(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  content text not null,
  page_number integer,
  start_seconds numeric,
  end_seconds numeric,
  embedding vector(1536) not null,
  created_at timestamptz not null default now(),
  unique (material_id, chunk_index)
);

create index if not exists material_chunks_material_id_idx
  on public.material_chunks(material_id);

create index if not exists material_chunks_user_space_idx
  on public.material_chunks(user_id, study_space_id);

create index if not exists material_chunks_embedding_idx
  on public.material_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 50);

alter table public.material_chunks enable row level security;

create policy "Students can view their material chunks"
  on public.material_chunks for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Students can insert their material chunks"
  on public.material_chunks for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Students can delete their material chunks"
  on public.material_chunks for delete
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.match_material_chunks(
  query_embedding vector(1536),
  match_user_id uuid,
  match_study_space_id uuid,
  match_count integer default 8
)
returns table (
  id uuid,
  material_id uuid,
  material_name text,
  content text,
  page_number integer,
  start_seconds numeric,
  end_seconds numeric,
  similarity real
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    material_chunks.id,
    material_chunks.material_id,
    materials.name as material_name,
    material_chunks.content,
    material_chunks.page_number,
    material_chunks.start_seconds,
    material_chunks.end_seconds,
    (1 - (material_chunks.embedding <=> query_embedding))::real as similarity
  from public.material_chunks
  join public.materials on materials.id = material_chunks.material_id
  where material_chunks.user_id = match_user_id
    and material_chunks.study_space_id = match_study_space_id
  order by material_chunks.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 20);
$$;
