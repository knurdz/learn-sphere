# LearnSphere VM firewall notes

Target host: Ubuntu with Docker (Caddy + api + agent).

## Inbound (UFW)

| Port | Protocol | Purpose |
|------|----------|---------|
| 22 | TCP | SSH (restrict to your IP when possible) |
| 80 | TCP | HTTP (Let's Encrypt + redirect to HTTPS) |
| 443 | TCP | HTTPS → Caddy → api |

Do **not** publish `api` port 3000 on the host; only Caddy should be public.

## Outbound

Default **allow all outbound** is simplest for demos and judges.

If you restrict egress, allow at minimum:

| Port | Protocol | Purpose |
|------|----------|---------|
| 53 | TCP + UDP | DNS |
| 443 | TCP | HTTPS to Supabase, Groq, Gemini, LiveKit, Beyond Presence, ACME, Docker Hub |

LiveKit / WebRTC from the **agent** container may also need **outbound UDP** (STUN/TURN) depending on network policy. If live tutor fails only on a locked-down firewall, allow outbound UDP to LiveKit or open outbound UDP broadly for a test.

## What does not hit this VM

- Flutter app → **Supabase** (direct from phone).
- Flutter app → **LiveKit** media (direct from phone).
- Phones only need **`https://learnsphere.knurdz.org`** for the bridge API.

## DNS

`learnsphere.knurdz.org` A record → your VM public IP (e.g. `20.244.109.83`) before running bootstrap.
