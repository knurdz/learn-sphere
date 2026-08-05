-- App language preference and live session locale persistence.

alter table public.profiles
  add column if not exists preferred_locale text;

alter table public.chat_sessions
  add column if not exists locale text;
