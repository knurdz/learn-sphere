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

## Azure / cloud NSG

If `api` is healthy but **curl to the public domain fails** from anywhere, open **inbound TCP 80 and 443** in your cloud network security group (e.g. Azure NSG on the VM NIC or subnet), in addition to UFW on the VM.

## Quick checks on the VM

```bash
# API inside Docker (should return HTTP headers)
sudo docker compose exec api curl -sI http://127.0.0.1:3000/

# Caddy logs (if Restarting, check Caddyfile syntax)
sudo docker compose logs caddy --tail 50

# Host port 80 listening?
sudo ss -tlnp | grep -E ':80|:443'

# UFW
sudo ufw status
```

Run `docker compose` from **`/opt/learnsphere/app/deploy`** so `deploy/.env` sets `LEARNSPHERE_ENV_DIR`. TLS uses the site block in [`Caddyfile`](Caddyfile) (no separate `compose.env` required).
