# LearnSphere mobile

Native Android/iOS client for the LearnSphere study workspace.

## Run

From this directory:

```bash
flutter pub get
flutter run \
  --dart-define=SUPABASE_URL=https://your-project.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=your-anon-key \
  --dart-define=API_BASE_URL=https://your-next-api.example.com
```

If the platform folders are not present yet, generate them once with:

```bash
flutter create . --platforms=android,ios
```

The Flutter client never receives provider secrets. Groq, Gemini, and Beyond
Presence keys remain in the Next.js server environment.

## Deep links

Configure `learnsphere://auth/callback` as a Supabase email redirect URL, then
add the matching Android intent filter and iOS URL scheme in the generated
platform projects. Supabase Flutter restores the session after the callback.
