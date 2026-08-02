drop index if exists public.material_chunks_embedding_idx;

alter table public.material_chunks
  drop column if exists embedding;

alter table public.material_chunks
  add column embedding vector(1024);

create index if not exists material_chunks_embedding_idx
  on public.material_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 50);

drop function if exists public.match_material_chunks(vector, uuid, uuid, integer);

create or replace function public.match_material_chunks(
  query_embedding vector(1024),
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
    and material_chunks.embedding is not null
  order by material_chunks.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 20);
$$;

update public.materials
set status = 'uploaded',
    ingestion_error = 'Re-index this material to create Jina embeddings.'
where status = 'ready';
