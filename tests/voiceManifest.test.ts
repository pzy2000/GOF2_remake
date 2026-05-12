import { describe, expect, it } from "vitest";
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import manifest from "../public/assets/generated/manifest.json";
import { dialogueScenes, dialogueSpeakerById } from "../src/data/world";
import type { AssetManifest } from "../src/types/game";
import { prepareCommsSpeechText, voiceClipKey, voiceProfiles, type VoiceProfileId } from "../src/systems/voice";

const supportedLocales = ["en", "zh-CN", "ja", "fr"] as const;
const minValidVoiceClipBytes = 1500;

type DialogueLine = (typeof dialogueScenes)[number]["lines"][number];

function localizedFor(line: DialogueLine, locale: (typeof supportedLocales)[number]): string | undefined {
  if (locale === "en") return line.text;
  return line.textI18n?.[locale];
}

function* iterateClipJobs() {
  for (const scene of dialogueScenes) {
    for (const line of scene.lines) {
      const speaker = dialogueSpeakerById[line.speakerId];
      if (!speaker) continue;
      const profileId = speaker.voiceProfile as VoiceProfileId;
      if (!voiceProfiles[profileId]) continue;
      for (const locale of supportedLocales) {
        const localized = localizedFor(line, locale);
        if (!localized) continue;
        const normalized = prepareCommsSpeechText(localized);
        if (!normalized) continue;
        yield { profileId, locale, normalized, key: voiceClipKey(profileId, locale, normalized) };
      }
    }
  }
}

function* iterateSceneClipJobs(sceneId: string) {
  const scene = dialogueScenes.find((item) => item.id === sceneId);
  if (!scene) throw new Error(`Missing dialogue scene ${sceneId}`);
  for (const line of scene.lines) {
    const speaker = dialogueSpeakerById[line.speakerId];
    if (!speaker) throw new Error(`Missing dialogue speaker ${line.speakerId}`);
    const profileId = speaker.voiceProfile as VoiceProfileId;
    for (const locale of supportedLocales) {
      const localized = localizedFor(line, locale);
      if (!localized) throw new Error(`Missing ${locale} text for ${sceneId}`);
      const normalized = prepareCommsSpeechText(localized);
      const key = voiceClipKey(profileId, locale, normalized);
      yield { profileId, locale, key };
    }
  }
}

describe("voice clip manifest", () => {
  it("declares a voiceClips map on the asset manifest", () => {
    const assetManifest = manifest as AssetManifest;
    expect(assetManifest.voiceClips).toBeDefined();
    expect(typeof assetManifest.voiceClips).toBe("object");
  });

  it("every registered clip url is namespaced under /assets/voice/{profileId}/{hash}.mp3", () => {
    const assetManifest = manifest as AssetManifest;
    for (const [key, url] of Object.entries(assetManifest.voiceClips ?? {})) {
      expect(url, `clip ${key} url`).toMatch(/^\/assets\/voice\/[a-z0-9-]+\/[0-9a-f]{16}\.mp3$/);
      const expectedTail = `/${key}.mp3`;
      expect(url.endsWith(expectedTail), `clip url ${url} should end with ${expectedTail}`).toBe(true);
    }
  });

  it("reports how many required clips are still missing from the manifest", () => {
    const assetManifest = manifest as AssetManifest;
    const registered = new Set(Object.keys(assetManifest.voiceClips ?? {}));
    const expected = new Set<string>();
    for (const job of iterateClipJobs()) {
      expected.add(job.key);
    }
    const missing = [...expected].filter((key) => !registered.has(key));
    // Voice clips are produced offline via `npm run generate:voices`. The test
    // is informational: it asserts the expected coverage size is non-trivial
    // and that whatever is registered matches a valid (speaker, locale, text)
    // hash. Missing clips are tolerated so CI does not require Edge TTS to be
    // reachable from the build environment.
    expect(expected.size).toBeGreaterThan(0);
    if (registered.size > 0) {
      for (const key of registered) {
        expect(expected.has(key), `manifest contains stale clip ${key} no longer referenced by dialogue data`).toBe(true);
      }
    }
    if (missing.length > 0 && registered.size > 0 && missing.length === expected.size) {
      throw new Error("Voice manifest is registered but covers zero expected clips; regenerate voices.");
    }
  });

  it("ships pre-rendered clips for the Glass Wake opening", () => {
    const assetManifest = manifest as AssetManifest;
    const jobs = [...iterateSceneClipJobs("dialogue-story-glass-wake-intro")];
    expect(jobs).toHaveLength(16);
    for (const job of jobs) {
      const url = assetManifest.voiceClips[job.key];
      expect(url, `${job.profileId}/${job.locale}/${job.key} should be registered`).toBe(`/assets/voice/${job.profileId}/${job.key}.mp3`);
      const filePath = resolve(process.cwd(), "public", url.replace(/^\//, ""));
      expect(existsSync(filePath), `${url} should exist`).toBe(true);
      expect(statSync(filePath).size, `${url} should contain valid MP3 audio`).toBeGreaterThanOrEqual(minValidVoiceClipBytes);
    }
  });

  it("collects exactly one job per (speakerProfile, locale, normalizedText) tuple without hash collisions", () => {
    const keys = new Map<string, { profileId: string; locale: string; normalized: string }>();
    for (const job of iterateClipJobs()) {
      const existing = keys.get(job.key);
      if (existing) {
        expect(existing.profileId).toBe(job.profileId);
        expect(existing.locale).toBe(job.locale);
        expect(existing.normalized).toBe(job.normalized);
      } else {
        keys.set(job.key, { profileId: job.profileId, locale: job.locale, normalized: job.normalized });
      }
    }
    expect(keys.size).toBeGreaterThan(100);
  });
});
