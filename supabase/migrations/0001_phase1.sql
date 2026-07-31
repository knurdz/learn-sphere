create extension if not exists "pgcrypto";
create extension if not exists "vector";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.study_spaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  description text check (char_length(coalesce(description, '')) <= 240),
  created_at timestamptz not null default now()
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  study_space_id uuid not null references public.study_spaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 26214400),
  storage_path text not null unique,
  status text not null default 'created' check (status in ('created', 'uploaded', 'upload_failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists study_spaces_user_id_idx on public.study_spaces(user_id);
create index if not exists materials_user_id_idx on public.materials(user_id);
create index if not exists materials_study_space_id_idx on public.materials(study_space_id);

alter table public.profiles enable row level security;
alter table public.study_spaces enable row level security;
alter table public.materials enable row level security;

create policy "Students can view their profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Students can update their profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Students can manage their study spaces"
  on public.study_spaces for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Students can manage their materials"
  on public.materials for all
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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into storage.buckets (id, name, public)
values ('materials', 'materials', false)
on conflict (id) do nothing;

create policy "Students can upload their materials"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Students can view their materials"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Students can update their materials"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Students can delete their materials"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
