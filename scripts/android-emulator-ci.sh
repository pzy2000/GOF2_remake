#!/usr/bin/env bash

set -Eeuo pipefail

physical_size="${1:?usage: android-emulator-ci.sh WIDTHxHEIGHT ARTIFACT_SUFFIX}"
artifact_suffix="${2:?usage: android-emulator-ci.sh WIDTHxHEIGHT ARTIFACT_SUFFIX}"
artifact_dir="android-artifacts"
logcat_path="${artifact_dir}/${artifact_suffix}-logcat.txt"
screenshot_path="${artifact_dir}/${artifact_suffix}.png"

mkdir -p "$artifact_dir"

capture_evidence() {
  adb exec-out screencap -p > "$screenshot_path" 2>/dev/null || true
  adb logcat -b all -d > "$logcat_path" 2>/dev/null || true
  adb shell getprop > "${artifact_dir}/${artifact_suffix}-getprop.txt" 2>/dev/null || true
  adb shell service list > "${artifact_dir}/${artifact_suffix}-services.txt" 2>/dev/null || true
  adb shell dumpsys window windows > "${artifact_dir}/${artifact_suffix}-windows.txt" 2>/dev/null || true
}

trap capture_evidence EXIT

adb wait-for-device

# Large wm overrides can make the emulator's Launcher/Quickstep miss its ANR
# deadline. A system-owned ANR window sits above the activity and consumes Back,
# so disable system error UI before resizing. Application ANRs are still caught
# from logcat below.
adb shell settings put global hide_error_dialogs 1
test "$(adb shell settings get global hide_error_dialogs | tr -d '\r')" = "1"

adb shell wm size "$physical_size"
adb shell wm density 420
adb shell settings put system accelerometer_rotation 0
adb shell settings put system user_rotation 1

services_ready=0
for _ in $(seq 1 90); do
  boot_completed="$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)"
  package_service="$(adb shell service check package 2>/dev/null || true)"
  activity_service="$(adb shell service check activity 2>/dev/null || true)"
  if [[ "$boot_completed" == "1" && "$package_service" == *"found"* && "$activity_service" == *"found"* ]]; then
    services_ready=1
    break
  fi
  sleep 2
done

if [[ "$services_ready" != "1" ]]; then
  echo "Android package/activity services did not recover after applying ${physical_size} at 420 dpi." >&2
  exit 1
fi

# Clear a system error window that may have been queued before
# hide_error_dialogs took effect. API 36 cold boots have produced both
# Launcher and System UI startup ANRs on GitHub runners. Selecting Wait lets
# these persistent system processes finish warming up without killing the
# application under test (which has not been installed yet).
display_width="${physical_size%x*}"
display_height="${physical_size#*x}"
for _ in $(seq 1 30); do
  window_dump="$(adb shell dumpsys window windows)"
  if [[ "$window_dump" != *"Application Not Responding:"* ]]; then
    break
  fi

  if [[ "$window_dump" == *"Application Not Responding: com.android.systemui"* ||
        "$window_dump" == *"Application Not Responding: com.android.launcher3"* ]]; then
    # The Wait row is stable at roughly 22% across and 58% down in both target
    # resolutions. Reassert the setting first so no later system dialog appears.
    adb shell settings put global hide_error_dialogs 1
    adb shell input tap "$((display_width * 22 / 100))" "$((display_height * 58 / 100))" || true
  fi
  sleep 1
done

window_dump="$(adb shell dumpsys window windows)"
if [[ "$window_dump" == *"Application Not Responding:"* ]]; then
  echo "A system ANR window is still intercepting emulator input." >&2
  exit 1
fi

# A fresh emulator shows a system-owned immersive-mode confirmation the first
# time the game hides navigation bars. That overlay consumes Back before the
# application can receive it, so normalize the device like Android's own CTS.
adb shell settings put secure immersive_mode_confirmations confirmed
test "$(adb shell settings get secure immersive_mode_confirmations | tr -d '\r')" = "confirmed"

adb logcat -c || true
./android/gradlew -p android --stacktrace :app:connectedDebugAndroidTest

capture_evidence
trap - EXIT

if grep -E "FATAL EXCEPTION|ANR in com\.pzy2000\.gof2|RenderThread.*SIG|GPU.*crash" "$logcat_path"; then
  echo "Android runtime crash signature detected in logcat." >&2
  exit 1
fi
