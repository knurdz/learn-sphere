# Android releases (GitHub Actions)

Release builds are produced in CI using the same signing keystore and production env secrets. **APKs** are for sideload installs via draft GitHub Releases. **AABs** are for uploading to Google Play.

## One-time: create a release keystore

On your machine:

```bash
keytool -genkey -v \
  -keystore upload-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias upload
```

Keep the `.jks` file and passwords safe. Do not commit the keystore.

## Local release build (optional)

```bash
cp android/key.properties.example android/key.properties
# Edit storeFile path (relative to android/ folder), passwords, alias.
cp upload-keystore.jks android/upload-keystore.jks

cp .env.example .env.local
# Set SUPABASE_* and API_BASE_URL=https://learnsphere.knurdz.org

flutter pub get
flutter build apk --release
```

Output (local build): `build/app/outputs/flutter-apk/learn-sphere-<version>.apk` from `pubspec.yaml` (e.g. `learn-sphere-0.1.0.apk`). GitHub Actions names the file `learn-sphere-<release-tag>.apk` (e.g. `learn-sphere-v0.1.0.apk`) to match the release title.

## GitHub repository secrets

Settings → Secrets and variables → Actions:

| Secret | Value |
|--------|--------|
| `ANDROID_KEYSTORE_BASE64` | `base64 -i upload-keystore.jks \| pbcopy` (macOS) |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | `upload` |
| `ANDROID_KEY_PASSWORD` | Key password |
| `SUPABASE_URL` | Production Supabase project URL |
| `SUPABASE_ANON_KEY` | Production anon key |
| `API_BASE_URL` | `https://learnsphere.knurdz.org` |

These must match **`SUPABASE_URL`** / **`SUPABASE_ANON_KEY`** (or `NEXT_PUBLIC_SUPABASE_*`) on the VM (`/opt/learnsphere/env/api.env`). A mismatch causes “Authentication required” on Feed/Library even when Supabase sign-in looks fine. **How to verify on the server:** [`deploy/AUTH-CHECK.md`](../deploy/AUTH-CHECK.md).

## Create a draft release

1. GitHub → **Actions** → **Android Release** → **Run workflow**.
2. Enter **release tag** (e.g. `v0.1.0`) and optional **release notes**.
3. When the job finishes, open **Releases**, edit the **draft**, verify the APK (`learn-sphere-<release-tag>.apk`, e.g. `learn-sphere-v0.1.0.apk`), then **Publish**.

Version **name/code** inside the app still come from `pubspec.yaml` (`version: x.y.z+build`). The **download filename** matches the **release tag** you enter in the workflow.

## Install on a device

1. Download `learn-sphere-<version>.apk` from the release.
2. Enable install from unknown sources (or use `adb install -r learn-sphere-0.1.0.apk`).
3. Ensure the device can reach `https://learnsphere.knurdz.org` and Supabase.

## Play Store (AAB)

Google Play requires an **Android App Bundle** (`.aab`), not an APK.

### Build in CI

1. GitHub → **Actions** → **Android Play AAB** → **Run workflow**.
2. Optionally enter an **artifact label** (e.g. `v0.2.4`) to suffix the filename; otherwise the name comes from `pubspec.yaml` (e.g. `learn-sphere-0.2.4.aab`).
3. When the job finishes, open the run → **Artifacts** → download **`learn-sphere-aab`** (contains the signed `.aab`).

The workflow uses the same repository secrets as the APK release (`ANDROID_*`, `SUPABASE_*`, `API_BASE_URL=https://learnsphere.knurdz.org`). Supabase values must match the VM — see [`deploy/AUTH-CHECK.md`](../deploy/AUTH-CHECK.md).

### Upload to Play Console

1. Open [Google Play Console](https://play.google.com/console) and create or select the app with package **`com.learnsphere.learnsphere_mobile`**.
2. Go to **Release** → **Production** or **Internal testing** → **Create new release**.
3. Upload the downloaded `.aab`.
4. Complete store listing requirements (privacy policy, content rating, graphics) if not done already.

**Version code:** bump the `+N` in `pubspec.yaml` before each Play upload (e.g. `0.2.4+2`). Play rejects duplicate or lower version codes. Version name/code inside the bundle come from `pubspec.yaml`, not the optional artifact label.

**Upload key:** the keystore in `ANDROID_KEYSTORE_BASE64` is the upload key. Use the same key for every Play upload; if Play Console already registered a different key, signing must match that key instead.
