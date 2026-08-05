# Verify production auth (VM + APK)

Use these checks when the app shows **Authentication required** or **You must be signed in** on Feed/Library but Supabase sign-in seems to work.

## 1. Bridge health (no login)

From your laptop or the VM:

```bash
curl -sS https://learnsphere.knurdz.org/api/health | jq
```

Expect:

| Field | Meaning |
|--------|---------|
| `supabase.configured` | `true` — API has URL + anon key |
| `supabase.projectRef` | Supabase project id (subdomain), e.g. `abcdefghijklmnop` |
| `supabase.anonKeyPreview` | First 12 characters of anon key — **must match** the app |
| `supabase.envSources` | Prefer `SUPABASE_URL` / `SUPABASE_ANON_KEY` on Docker (runtime). `NEXT_PUBLIC_*` alone may be empty if the image was built without them |

If `configured` is **false**, fix `/opt/learnsphere/env/api.env` and restart:

```bash
sudo nano /opt/learnsphere/env/api.env
# Add (same project as your Flutter APK / GitHub secrets):
#   SUPABASE_URL=https://YOUR_PROJECT.supabase.co
#   SUPABASE_ANON_KEY=eyJhbG...
cd /opt/learnsphere/app/deploy && sudo docker compose up -d --force-recreate api
```

## 2. Env inside the running container

On the VM:

```bash
cd /opt/learnsphere/app/deploy
sudo docker compose exec api printenv | grep -E '^SUPABASE_|^NEXT_PUBLIC_SUPABASE_'
```

You should see **non-empty** `SUPABASE_URL` and `SUPABASE_ANON_KEY` (recommended). If only `NEXT_PUBLIC_*` is set and health still shows misconfigured, add the `SUPABASE_*` pair with the same values.

## 3. Match the mobile app

The release APK embeds (from GitHub Actions secrets):

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `API_BASE_URL=https://learnsphere.knurdz.org`

Compare with the server:

1. `projectRef` from `/api/health` must equal the subdomain in the app’s `SUPABASE_URL`.
2. `anonKeyPreview` must match the start of the app’s anon key (Supabase → Project Settings → API → anon public).

GitHub: **Settings → Secrets → Actions**  
VM: **`/opt/learnsphere/env/api.env`**

They must be the **same Supabase project**, not two different projects.

## 4. Test a real access token

After signing in on the phone (or Supabase dashboard → Authentication → user → copy JWT for testing):

```bash
TOKEN='paste-access-token-here'
curl -sS -H "Authorization: Bearer $TOKEN" \
  https://learnsphere.knurdz.org/api/auth/session | jq
```

| Response | Meaning |
|----------|---------|
| `ok: true` + `user.email` | Server auth is correct; if the app still fails, rebuild/reinstall APK or sign out and in again |
| `503` Supabase not configured | Fix `api.env` and recreate `api` container |
| `401` Token rejected + `authError` | Wrong project or expired token — align secrets or refresh session |

Quick smoke test of a protected route:

```bash
curl -sS -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $TOKEN" \
  https://learnsphere.knurdz.org/api/gamification/summary
```

Expect **200** (not 401).

## 5. Redeploy after env changes

```bash
cd /opt/learnsphere/app && git pull
cd deploy && sudo docker compose up -d --build api
curl -sS https://learnsphere.knurdz.org/api/health | jq .supabase
```

## 6. On the device

1. Uninstall the old APK or **clear app storage** (avoids tokens from another Supabase project).
2. Install the latest release APK.
3. Sign in again.

See also [`docs/android-release.md`](../docs/android-release.md) for GitHub secrets.
