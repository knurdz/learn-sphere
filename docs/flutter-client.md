# Flutter client contract

`flutter_app/` is the Android/iOS client for LearnSphere.

## Data ownership

The client uses the Supabase Flutter SDK with the signed-in user's session for:

- `study_spaces`, `materials`, and material upload storage
- reading study artifacts and progress
- cached recent spaces, materials, feed items, and progress

The client sends the current Supabase access token as:

```http
Authorization: Bearer <access-token>
```

The Next.js API accepts that header as well as its existing browser cookies.

## Secure bridge routes

These routes retain provider-backed work on the server:

- `POST /api/materials/:id/ingest`
- `POST /api/learning/generate`
- `GET /api/feed`
- `POST /api/learning/:id/attempt`
- `POST /api/learning/:id/progress`
- `POST /api/tutor/sessions`
- `GET|POST /api/tutor/sessions/:id/messages`
- `POST /api/tutor/sessions/:id/voice`
- `GET|POST /api/study-tools`
- `POST /api/study-tools/:id/attempts`
- `POST|DELETE /api/beyond-presence/session`

Errors use `{ "error": "..." }`. Provider credentials are server-only.
