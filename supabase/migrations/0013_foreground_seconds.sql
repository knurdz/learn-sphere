-- Lifetime foreground time for the header wallet chip. Survives reinstall.

alter table public.user_gamification
  add column if not exists foreground_seconds bigint not null default 0
  check (foreground_seconds >= 0);

create or replace function public.add_foreground_seconds(delta integer)
returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  clamped integer;
  result bigint;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  clamped := greatest(0, least(coalesce(delta, 0), 14400));
  if clamped < 1 then
    select foreground_seconds into result
    from public.user_gamification
    where user_id = uid;
    return coalesce(result, 0);
  end if;

  insert into public.user_gamification (user_id, foreground_seconds)
  values (uid, clamped)
  on conflict (user_id) do update
    set foreground_seconds = public.user_gamification.foreground_seconds + excluded.foreground_seconds,
        updated_at = now()
  returning foreground_seconds into result;

  return result;
end;
$$;

grant execute on function public.add_foreground_seconds(integer) to authenticated;
