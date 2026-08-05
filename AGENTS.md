# Repository guide

- **Flutter app** lives at the repo root (`lib/`, `pubspec.yaml`, `android/`, `ios/`).
- **Bridge API** (Next.js route handlers only) lives in [`api/`](api/). Before changing server code, read the Next.js guide in `api/node_modules/next/dist/docs/`—this project uses Next 16 conventions.
- **Live tutor worker** (LiveKit Agents, Python) lives in [`agent/`](agent/). It is the only long-running process in the repo; the bridge stays request-scoped. See [`agent/README.md`](agent/README.md) for how a session is dispatched.

Provider secrets (Groq, Gemini, LiveKit) belong only in `api/.env.local`, never in the Flutter app. The worker keeps its own `agent/.env.local` with the LiveKit and Beyond Presence keys.
