-- Allow authenticated users to update their own gamification row and log activities.
-- Bridge API uses the user JWT (anon key + Bearer), so SELECT-only RLS caused
-- tour/streak writes to succeed with HTTP 200 while updating 0 rows.

create policy "Students can update their gamification"
  on public.user_gamification for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Students can insert their activity events"
  on public.user_activity_events for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Students can insert their gamification"
  on public.user_gamification for insert
  to authenticated
  with check (auth.uid() = user_id);
