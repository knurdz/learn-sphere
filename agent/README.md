# Live tutor worker

The LiveKit Agents worker behind the app's **Live tutor** screen. It owns the
conversation loop (speech to text, LLM, text to speech) and starts a Beyond
Presence avatar that publishes the lip-synced video into the same LiveKit room
as the learner.

```
Flutter app ─┐
             ├─ LiveKit room ─ this worker ─ Beyond Presence avatar worker
Next.js API ─┘   (token + dispatch)   (briefing + transcript over HTTP)
```

The Next.js bridge mints the learner's token with a `RoomAgentDispatch` for
agent name `learnsphere-tutor`, so this worker is only pulled into rooms the
bridge created. The dispatch metadata carries the chat session id and the
learner's Supabase token, which the worker uses to fetch its teaching prompt
from `/api/live-tutor/session/{id}/briefing` and to save the transcript.

## Setup

```bash
cd agent
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Where it comes from |
|----------|---------------------|
| `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | [LiveKit Cloud](https://cloud.livekit.io) → Settings → Keys. Must match `api/.env.local`. |
| `BEY_API_KEY` | [Beyond Presence API key](https://docs.bey.dev/api-key) |
| `BEY_AVATAR_ID` | Avatar on your Beyond Presence agent. Blank uses their stock avatar. |
| `LEARNSPHERE_API_URL` | Where this worker can reach the Next.js bridge |

Speech and language models run on LiveKit Inference, so no other provider
accounts are needed.

## Run

```bash
.venv/bin/python agent.py dev
```

Keep it running alongside `pnpm dev` in `api/`. The worker registers with
LiveKit Cloud and waits for dispatches; nothing happens until the app starts a
session.

Use `start` instead of `dev` for production, and see the
[deployment guide](https://docs.livekit.io/agents/ops/deployment.md) for hosting.
