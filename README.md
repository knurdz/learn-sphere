# LearnSphere

LearnSphere is a grounded study workspace MVP built with Next.js and Supabase.
It supports private study spaces, PDF/DOCX/audio/video ingestion, source-aware
tutoring, optional Beyond Presence avatars, generated study tools, and quiz
progress. A doomscrolling feed is intentionally not included.

## Local setup

1. Install dependencies:

   ~~~bash
   pnpm install
   ~~~

2. Create a Supabase project and copy .env.example to .env.local.

3. Add your Supabase project URL and anon key to .env.local.

4. Run these migrations in order in the Supabase SQL editor:
   0001_phase1.sql, 0002_ingestion.sql, 0003_tutor.sql, and
   0004_study_tools.sql.

5. Add provider keys to .env.local:
   - GROQ_API_KEY for tutor responses, study-tool generation, and transcription.
   - GEMINI_API_KEY for vector embeddings. The default model is gemini-embedding-001 at 1,536 dimensions.
   - BEYOND_PRESENCE_API_KEY and NEXT_PUBLIC_BEYOND_PRESENCE_AGENT_ID for interactive video sessions.

6. Start the app:

   ~~~bash
   pnpm dev
   ~~~

Open http://localhost:3000.

## Phase-by-phase checks

~~~bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
~~~

If Playwright reports a missing Chromium executable, run
pnpm exec playwright install chromium once and rerun pnpm test:e2e.

Use this manual sequence to test each product phase:

1. Phase 1: sign up, sign in, create a study space, and upload a supported file.
   Confirm the private materials bucket and user-owned rows in Supabase.
2. Phase 2: run migration 0002_ingestion.sql, configure OpenAI, click Index on
   an uploaded file, and confirm the material becomes Ready with rows in
   material_chunks.
3. Phase 3: run migration 0003_tutor.sql, configure Groq, ask a question
   in /tutor, and verify citations. Configure the Beyond Presence agent and API
   key, then start the interactive video session from the tutor page.
4. Phase 4: run migration 0004_study_tools.sql, open /study, generate each tool
   type, submit a video quiz, and reload saved tools to verify
   the score appears under Recent progress.

The app supports email/password accounts, private study spaces, secure uploads
for PDF, DOCX, MP3, WAV, and MP4 files up to 25 MB, grounded retrieval,
voice questions, video quizzes, and
Beyond Presence avatar teaching sessions for new and engaging lessons. The
engaging lesson tool accepts YouTube URLs with readable captions, renders the
YouTube player with page-level controls, and gives the avatar the caption context
for interactive teaching. The page automatically pauses at learning checkpoints
and sends the avatar a question prompt. Leaving the browser tab pauses the video
and sends an attention prompt. Optional Beyond Presence webcam vision can also
let the avatar respond to visible distraction cues after camera permission.
If the Beyond Presence account does not include programmatic call creation, the
app automatically uses the managed bey.chat session instead of LiveKit.
The "Teach a YouTube video" tool is a live session: enter a YouTube URL, let the
server retrieve its readable captions, and the avatar starts explaining the
transcript without requiring a study-space video upload.
Provider-backed flows require the environment variables
above; Supabase remains the source of truth for user-owned data.
