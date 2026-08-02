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
    'video_engage'
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
    'video_engage'
  ));
