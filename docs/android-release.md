# Android sideload releases (GitHub Actions)

LearnSphere is not published to the Play Store for now. Release APKs are built in CI, attached to **draft** GitHub Releases, and installed manually.

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
