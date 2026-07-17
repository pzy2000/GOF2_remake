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
}

trap capture_evidence EXIT

adb wait-for-device
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

adb logcat -c || true
./android/gradlew -p android --stacktrace :app:connectedDebugAndroidTest

capture_evidence
trap - EXIT

if grep -E "FATAL EXCEPTION|ANR in com\.pzy2000\.gof2|RenderThread.*SIG|GPU.*crash" "$logcat_path"; then
  echo "Android runtime crash signature detected in logcat." >&2
  exit 1
fi
