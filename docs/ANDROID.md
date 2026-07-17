# GOF2 Android build and acceptance

The Android distribution wraps the existing React/Vite/Three.js game with Capacitor. It uses `com.pzy2000.gof2`, keeps browser save-data compatibility, and is intentionally offline single-player in v1. Web/PWA and GitHub Pages builds retain their existing online/local-service behavior.

## Command-line build

Android Studio is not required. Install Node.js 22 or 24, JDK 21, and Android SDK platform/build tools 36, then set `ANDROID_HOME` (or `ANDROID_SDK_ROOT`). Capacitor 8.4 compiles its generated Android modules with Java 21; JDK 17 cannot compile the checked-in project.

```bash
npm ci
npm run build:android
npm run android:sync
npm run android:check
npm run android:apk
```

The debug package is written to `android/app/build/outputs/apk/debug/app-debug.apk`. The checked-in wrapper uses Gradle 8.14.3 and AGP 8.13.0 with min SDK 24 and compile/target SDK 36.

Android builds use `.env.android`: root asset paths, local economy fallback, multiplayer disabled, and the Android platform profile. They do not register the PWA service worker. The first-run graphics profile is Medium; High and Ultra remain selectable.

## Automated validation

`.github/workflows/android.yml` runs:

- Capacitor sync, Android lint, JVM tests, and a debug APK on pull requests and `main`.
- API 36 instrumentation separately at `2748x1172` and `2480x2200`, both at 420 dpi, with screenshots, logcat, and XML/HTML test reports.
- An API 26 compatibility launch on `main`.
- Signed APK/AAB assembly and validation for `v*` tags or manual release runs.

The browser suite also tests the corresponding CSS viewports (`1047x446` and `945x838`), reverse rotation, safe-area insets, target size, HUD/control overlap, multi-touch cancellation, route-planner reachability, and outer-to-inner resize without replacing the WebGL canvas or losing save state.

## Release signing

Configure these repository Secrets before running a tag/manual release:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

The workflow decodes the keystore only under the runner temporary directory. `versionName` comes from a `v*` tag (or `package.json` for a manual run), while `versionCode` uses `github.run_number`. Artifacts are named `gof2-<version>-release.apk`, `gof2-<version>-release.aab`, and `SHA256SUMS`; the workflow runs `apksigner verify` and `bundletool validate`. It does not upload to Google Play.

## Real-device checklist

CI emulators do not validate an OEM GPU driver, hinge hardware, sustained thermal behavior, or vendor WebView quirks. Record the following for each physical-device run:

| Field | Result |
| --- | --- |
| Device model |  |
| Android version / security patch |  |
| Android System WebView version |  |
| Physical resolution and density |  |
| `window.devicePixelRatio` / CSS viewport |  |
| Folded and unfolded viewport, if applicable |  |

Run the following acceptance sequence:

1. Install the debug or verified signed APK offline and cold-start it.
2. Start a new game and fly/fight continuously for 15–30 minutes on Medium; record minimum/typical FPS, with a target of at least 30 FPS.
3. Hold throttle/steering while firing with another finger; verify pointer cancellation and interrupted touches never stay latched.
4. Open map, pause, settings, dialogue, and every station tab; verify Android Back order and that Multiplayer/login UI is absent.
5. Verify flight and flight-owned overlays stay landscape, while menu/station unlock rotation.
6. Sleep/background and resume, then force-stop and continue from the auto-save; check audio focus and held-input reset.
7. Fold/unfold or rotate repeatedly; confirm the current game, save, and WebGL canvas persist and no control/HUD overlap appears.
8. Capture screenshots and `adb logcat`; reject ANR, fatal exceptions, renderer/GPU crashes, black WebGL output, or sustained performance below target.
