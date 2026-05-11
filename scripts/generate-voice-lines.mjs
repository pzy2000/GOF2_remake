#!/usr/bin/env node
// Pre-renders every dialogue line into per-character mp3 clips using the
// Microsoft Edge Neural TTS API (via msedge-tts). The runtime voice system
// loads the resulting clips from public/assets/voice/ and applies its
// per-profile Web Audio FX chain on top.
import { createWriteStream, existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import esbuild from "esbuild";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const manifestPath = path.join(rootDir, "public/assets/generated/manifest.json");
const outputRoot = path.join(rootDir, "public/assets/voice");
const tmpBundlePath = path.join(rootDir, ".tmp/voice-data/bundle.mjs");

const supportedLocales = ["en", "zh-CN", "ja", "fr"];

function toForwardSlash(value) {
  return value.replace(/\\/g, "/");
}

async function loadDialogueData() {
  await mkdir(path.dirname(tmpBundlePath), { recursive: true });
  const dialoguesPath = toForwardSlash(path.resolve(rootDir, "src/data/dialogues.ts"));
  const voicePath = toForwardSlash(path.resolve(rootDir, "src/systems/voice.ts"));
  const entry = `
export { dialogueSpeakers, dialogueScenes } from "${dialoguesPath}";
export { voiceProfiles, voiceClipKey, prepareCommsSpeechText } from "${voicePath}";
`;
  await esbuild.build({
    stdin: { contents: entry, resolveDir: rootDir, sourcefile: "voice-data-entry.ts", loader: "ts" },
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    outfile: tmpBundlePath,
    logLevel: "warning"
  });
  return import(pathToFileURL(tmpBundlePath).href);
}

function pickLocalizedText(line, locale) {
  if (locale === "en") return line.text;
  return line.textI18n?.[locale] ?? line.text;
}

function pickVoiceId(profile, locale) {
  const voice = profile.tts.voiceByLocale[locale] ?? profile.tts.voiceByLocale.en;
  return voice;
}

function pctString(value) {
  if (value > 0) return `+${value}%`;
  return `${value}%`;
}

function rateMultiplier(ratePct) {
  return Number((1 + ratePct / 100).toFixed(3));
}

async function synthesizeOne(client, voiceId, text, ratePct, pitchPct, destination) {
  await mkdir(path.dirname(destination), { recursive: true });
  await client.setMetadata(voiceId, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioStream } = await client.toStream(text, {
    rate: rateMultiplier(ratePct),
    pitch: pctString(pitchPct)
  });
  await new Promise((resolve, reject) => {
    const writer = createWriteStream(destination);
    audioStream.on("data", (chunk) => writer.write(chunk));
    audioStream.on("close", () => {
      writer.end();
      writer.on("finish", () => resolve());
      writer.on("error", reject);
    });
    audioStream.on("error", reject);
  });
}

function collectJobs(dialogueSpeakers, dialogueScenes, voiceProfiles, prepareCommsSpeechText, voiceClipKey) {
  const speakerById = Object.fromEntries(dialogueSpeakers.map((speaker) => [speaker.id, speaker]));
  const jobs = [];
  const seenKeys = new Set();
  for (const scene of dialogueScenes) {
    for (const line of scene.lines) {
      const speaker = speakerById[line.speakerId];
      if (!speaker) continue;
      const profileId = speaker.voiceProfile;
      const profile = voiceProfiles[profileId];
      if (!profile) continue;
      for (const locale of supportedLocales) {
        const localized = pickLocalizedText(line, locale);
        if (!localized) continue;
        const normalized = prepareCommsSpeechText(localized);
        if (!normalized) continue;
        const key = voiceClipKey(profileId, locale, normalized);
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        jobs.push({
          key,
          profileId,
          locale,
          text: normalized,
          voiceId: pickVoiceId(profile, locale),
          pitchPct: profile.tts.pitchPct,
          ratePct: profile.tts.ratePct,
          destination: path.join(outputRoot, profileId, `${key}.mp3`),
          publicPath: `/assets/voice/${profileId}/${key}.mp3`
        });
      }
    }
  }
  return jobs;
}

async function loadManifest() {
  const raw = await readFile(manifestPath, "utf8");
  return JSON.parse(raw);
}

async function writeManifest(manifest) {
  const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
  await writeFile(manifestPath, serialized, "utf8");
}

async function main() {
  console.log("[voices] bundling dialogue data with esbuild");
  const data = await loadDialogueData();
  const { dialogueSpeakers, dialogueScenes, voiceProfiles, prepareCommsSpeechText, voiceClipKey } = data;
  if (!dialogueSpeakers || !dialogueScenes || !voiceProfiles) {
    throw new Error("Missing exports from bundled dialogue/voice modules");
  }

  const jobs = collectJobs(dialogueSpeakers, dialogueScenes, voiceProfiles, prepareCommsSpeechText, voiceClipKey);
  console.log(`[voices] ${jobs.length} clips planned across ${supportedLocales.length} locales`);

  const client = new MsEdgeTTS();
  let generated = 0;
  let cached = 0;
  let failed = 0;
  const failures = [];

  for (let index = 0; index < jobs.length; index += 1) {
    const job = jobs[index];
    if (existsSync(job.destination)) {
      cached += 1;
      continue;
    }
    try {
      await synthesizeOne(client, job.voiceId, job.text, job.ratePct, job.pitchPct, job.destination);
      generated += 1;
      if ((generated + failed) % 10 === 0) {
        console.log(`[voices] progress ${index + 1}/${jobs.length} (${generated} fresh, ${cached} cached, ${failed} failed)`);
      }
    } catch (error) {
      failed += 1;
      failures.push({ key: job.key, profileId: job.profileId, locale: job.locale, error: error instanceof Error ? error.message : String(error) });
      console.warn(`[voices] failed clip ${job.profileId}/${job.locale}/${job.key}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const voiceClips = {};
  for (const job of jobs) {
    if (existsSync(job.destination)) {
      voiceClips[job.key] = job.publicPath;
    }
  }

  const manifest = await loadManifest();
  manifest.voiceClips = voiceClips;
  await writeManifest(manifest);

  console.log(`[voices] done: ${generated} generated, ${cached} cached, ${failed} failed, ${Object.keys(voiceClips).length} clips registered`);
  if (failures.length > 0) {
    console.warn(`[voices] ${failures.length} failures; manifest still updated for whatever succeeded`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
