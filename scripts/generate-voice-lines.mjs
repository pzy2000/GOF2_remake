#!/usr/bin/env node
// Pre-renders every dialogue line into per-character mp3 clips using the
// Microsoft Edge Neural TTS API (via msedge-tts). The runtime voice system
// loads the resulting clips from public/assets/voice/ and applies its
// per-profile Web Audio FX chain on top.
import { createWriteStream, existsSync, statSync } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
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

// A 24kHz/48kbps mono MP3 of even a single short word weighs >= ~1.5KB.
// Anything smaller is a leftover partial write from a previously aborted run
// and must be regenerated, otherwise the runtime plays a silent file.
const MIN_VALID_BYTES = 1500;

// Recreate the websocket client every N successful synth calls. The
// msedge-tts client occasionally races on stream metadata when reused across
// hundreds of calls (the library tries to push audio into a stream record
// that has already been deleted), so cycling the connection keeps us under
// that threshold.
const CLIENT_RECYCLE_INTERVAL = 40;

function toForwardSlash(value) {
  return value.replace(/\\/g, "/");
}

function isValidClipFile(filePath) {
  if (!existsSync(filePath)) return false;
  try {
    const stat = statSync(filePath);
    return stat.isFile() && stat.size >= MIN_VALID_BYTES;
  } catch {
    return false;
  }
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
  // Write to a sibling .partial file and rename only after the stream closes
  // cleanly with at least MIN_VALID_BYTES of payload. This prevents aborted
  // synth attempts from leaving zero-byte files that subsequent runs would
  // happily treat as "cached".
  const partial = `${destination}.partial`;
  // msedge-tts setMetadata merges the third argument; if omitted, it still
  // reads metadataOptions.voiceLocale and throws (Cannot read properties of
  // undefined). Always pass an object.
  await client.setMetadata(voiceId, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, {});
  const { audioStream } = await client.toStream(text, {
    rate: rateMultiplier(ratePct),
    pitch: pctString(pitchPct)
  });
  const writer = createWriteStream(partial);
  try {
    await pipeline(audioStream, writer);
  } catch (err) {
    await rm(partial, { force: true });
    throw err;
  }
  if (writer.bytesWritten < MIN_VALID_BYTES) {
    await rm(partial, { force: true });
    throw new Error(`empty or truncated audio stream (${writer.bytesWritten} bytes)`);
  }
  await rm(destination, { force: true });
  await rename(partial, destination);
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
  const force = process.argv.includes("--force");
  console.log("[voices] bundling dialogue data with esbuild");
  const data = await loadDialogueData();
  const { dialogueSpeakers, dialogueScenes, voiceProfiles, prepareCommsSpeechText, voiceClipKey } = data;
  if (!dialogueSpeakers || !dialogueScenes || !voiceProfiles) {
    throw new Error("Missing exports from bundled dialogue/voice modules");
  }

  const jobs = collectJobs(dialogueSpeakers, dialogueScenes, voiceProfiles, prepareCommsSpeechText, voiceClipKey);
  console.log(`[voices] ${jobs.length} clips planned across ${supportedLocales.length} locales`);
  if (force) console.log("[voices] --force: regenerating all clips regardless of cache");

  let client = new MsEdgeTTS();
  let synthCount = 0;
  let generated = 0;
  let cached = 0;
  let stale = 0;
  let failed = 0;
  const failures = [];

  for (let index = 0; index < jobs.length; index += 1) {
    const job = jobs[index];
    const valid = isValidClipFile(job.destination);
    if (!force && valid) {
      cached += 1;
      continue;
    }
    if (!force && existsSync(job.destination) && !valid) {
      stale += 1;
    }
    let lastError = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await synthesizeOne(client, job.voiceId, job.text, job.ratePct, job.pitchPct, job.destination);
        generated += 1;
        synthCount += 1;
        lastError = null;
        if (synthCount % CLIENT_RECYCLE_INTERVAL === 0) {
          try { client.close?.(); } catch { /* ignore */ }
          client = new MsEdgeTTS();
        }
        break;
      } catch (error) {
        lastError = error;
        // Recreate the client to escape any wedged stream state on retry.
        try { client.close?.(); } catch { /* ignore */ }
        client = new MsEdgeTTS();
      }
    }
    if (lastError) {
      failed += 1;
      const message = lastError instanceof Error ? lastError.message : String(lastError);
      failures.push({ key: job.key, profileId: job.profileId, locale: job.locale, error: message });
      console.warn(`[voices] failed clip ${job.profileId}/${job.locale}/${job.key}: ${message}`);
    }
    if ((generated + failed) % 10 === 0 && generated + failed > 0) {
      console.log(`[voices] progress ${index + 1}/${jobs.length} (${generated} fresh, ${cached} cached, ${stale} stale, ${failed} failed)`);
    }
  }

  const voiceClips = {};
  let registeredInvalid = 0;
  for (const job of jobs) {
    if (isValidClipFile(job.destination)) {
      voiceClips[job.key] = job.publicPath;
    } else if (existsSync(job.destination)) {
      registeredInvalid += 1;
    }
  }

  const manifest = await loadManifest();
  manifest.voiceClips = voiceClips;
  await writeManifest(manifest);

  console.log(
    `[voices] done: ${generated} generated, ${cached} cached, ${stale} stale-replaced, ${failed} failed, ${Object.keys(voiceClips).length} clips registered`
  );
  if (registeredInvalid > 0) {
    console.warn(`[voices] ${registeredInvalid} clips remain below ${MIN_VALID_BYTES} bytes and are skipped from the manifest`);
  }
  if (failures.length > 0) {
    console.warn(`[voices] ${failures.length} failures; manifest still updated for whatever succeeded`);
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
