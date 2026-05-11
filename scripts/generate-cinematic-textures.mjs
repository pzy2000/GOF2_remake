import { mkdir, rm } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const manifestPath = path.join(rootDir, "public/assets/generated/manifest.json");
const sourcePath = path.join(rootDir, "public/assets/generated/sources/cinematic-texture-atlas.png");
const tempDir = path.join(rootDir, ".tmp/generated-cinematic-textures");

const ffmpeg = process.env.FFMPEG_BIN || "ffmpeg";
const cwebp = process.env.CWEBP_BIN || "cwebp";

if (!existsSync(sourcePath)) {
  throw new Error(`Missing source atlas: ${sourcePath}`);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

const skyboxStyles = {
  "helion-reach": { hue: 8, saturation: 1.18, contrast: 1.12, brightness: -0.03 },
  "kuro-belt": { hue: -22, saturation: 0.92, contrast: 1.22, brightness: -0.08 },
  vantara: { hue: 30, saturation: 1.22, contrast: 1.17, brightness: -0.06 },
  "mirr-vale": { hue: 72, saturation: 1.28, contrast: 1.1, brightness: -0.05 },
  "ashen-drift": { hue: -44, saturation: 0.78, contrast: 1.28, brightness: -0.1 },
  "celest-gate": { hue: 114, saturation: 1.08, contrast: 1.2, brightness: -0.07 },
  "ptd-home": { hue: 148, saturation: 0.86, contrast: 1.18, brightness: -0.08 }
};

const planetStyles = {
  "helion-prime-world": { hue: 96, saturation: 1.22, contrast: 1.12, brightness: -0.02 },
  "aurora-shepherd": { hue: 122, saturation: 1.34, contrast: 1.04, brightness: 0.02 },
  "vale-cinder": { hue: 18, saturation: 1.18, contrast: 1.2, brightness: -0.04 },
  "meridian-lumen": { hue: 42, saturation: 0.94, contrast: 1.22, brightness: 0.02 },
  "kuro-anvil": { hue: -16, saturation: 0.76, contrast: 1.35, brightness: -0.12 },
  "lode-minor": { hue: 6, saturation: 0.72, contrast: 1.3, brightness: -0.04 },
  "niobe-ice": { hue: 154, saturation: 0.88, contrast: 1.18, brightness: 0.04 },
  "bracken-dust": { hue: 52, saturation: 0.74, contrast: 1.26, brightness: -0.06 },
  "vantara-command": { hue: -12, saturation: 1.18, contrast: 1.24, brightness: -0.04 },
  "redoubt-moon": { hue: 12, saturation: 0.52, contrast: 1.26, brightness: 0.01 },
  "gryphon-reef": { hue: 126, saturation: 1.16, contrast: 1.12, brightness: -0.02 },
  "sentry-ash": { hue: 28, saturation: 0.76, contrast: 1.32, brightness: -0.08 },
  "mirr-glass": { hue: 92, saturation: 1.36, contrast: 1.16, brightness: -0.03 },
  "optic-tide": { hue: 138, saturation: 1.38, contrast: 1.08, brightness: -0.03 },
  "hush-orbit": { hue: 178, saturation: 0.68, contrast: 1.28, brightness: -0.1 },
  "viridian-ruins": { hue: 108, saturation: 1.05, contrast: 1.22, brightness: -0.06 },
  "ashen-harbor": { hue: -8, saturation: 0.92, contrast: 1.32, brightness: -0.11 },
  "black-arc": { hue: 214, saturation: 0.56, contrast: 1.5, brightness: -0.18 },
  emberfall: { hue: 22, saturation: 1.32, contrast: 1.34, brightness: -0.1 },
  "grave-moon": { hue: 186, saturation: 0.46, contrast: 1.34, brightness: -0.12 },
  "voss-kel": { hue: 38, saturation: 1.18, contrast: 1.22, brightness: -0.03 },
  "celest-crown": { hue: 158, saturation: 0.92, contrast: 1.18, brightness: 0.02 },
  aurelia: { hue: 62, saturation: 1.22, contrast: 1.14, brightness: 0.01 },
  "opal-minor": { hue: 196, saturation: 0.88, contrast: 1.18, brightness: 0.03 },
  "zenith-gas": { hue: 132, saturation: 1.12, contrast: 1.08, brightness: -0.03 },
  "pearl-night": { hue: 190, saturation: 0.72, contrast: 1.36, brightness: -0.16 },
  "ptd-home-world": { hue: 154, saturation: 0.9, contrast: 1.18, brightness: 0.02 }
};

function run(command, args) {
  const result = spawnSync(command, args, { cwd: rootDir, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")}\n${result.error?.message || result.stderr || result.stdout || `exit code ${result.status ?? "unknown"}`}`);
  }
}

function projectPath(publicPath) {
  return path.join(rootDir, "public", publicPath.replace(/^\//, ""));
}

function eq(style) {
  return `eq=saturation=${style.saturation}:contrast=${style.contrast}:brightness=${style.brightness}`;
}

function toneFilters(style, extra = "") {
  return [
    `hue=h=${style.hue}:s=${style.saturation}`,
    eq(style),
    extra,
    "unsharp=5:5:0.55:3:3:0.25"
  ].filter(Boolean).join(",");
}

async function renderWebp({ publicPath, band, width, height, style, flip = false, quality = 82, extra = "" }) {
  const outPath = projectPath(publicPath);
  const tempPng = path.join(tempDir, `${path.basename(publicPath, path.extname(publicPath))}.png`);
  await mkdir(path.dirname(outPath), { recursive: true });
  const filters = [
    `crop=iw:ih/4:0:ih*${band}/4`,
    flip ? "hflip" : "",
    `scale=${width}:${height}:flags=lanczos`,
    toneFilters(style, extra)
  ].filter(Boolean).join(",");
  run(ffmpeg, ["-y", "-loglevel", "error", "-i", sourcePath, "-vf", filters, tempPng]);
  run(cwebp, ["-quiet", "-q", String(quality), tempPng, "-o", outPath]);
}

async function renderSkyboxWebp({ publicPath, band, width, height, style, flip = false, quality = 82, extra = "" }) {
  const outPath = projectPath(publicPath);
  const tempPng = path.join(tempDir, `${path.basename(publicPath, path.extname(publicPath))}.png`);
  await mkdir(path.dirname(outPath), { recursive: true });
  const sourceFilters = [
    `crop=iw:ih/4:0:ih*${band}/4`,
    flip ? "hflip" : ""
  ].filter(Boolean).join(",");
  const filters = [
    `[0:v]${sourceFilters},split=2[sky_bg_src][sky_fg_src]`,
    `[sky_bg_src]scale=${width}:${height}:force_original_aspect_ratio=increase:flags=lanczos,crop=${width}:${height},gblur=sigma=18,${toneFilters(style, extra)}[sky_bg]`,
    `[sky_fg_src]scale=${width}:${height}:force_original_aspect_ratio=decrease:flags=lanczos,${toneFilters(style, extra)}[sky_fg]`,
    "[sky_bg][sky_fg]overlay=(W-w)/2:(H-h)/2"
  ].join(";");
  run(ffmpeg, ["-y", "-loglevel", "error", "-i", sourcePath, "-filter_complex", filters, tempPng]);
  run(cwebp, ["-quiet", "-q", String(quality), tempPng, "-o", outPath]);
}

await rm(tempDir, { recursive: true, force: true });
await mkdir(tempDir, { recursive: true });

for (const [systemId, publicPath] of Object.entries(manifest.systemSkyboxes)) {
  const style = skyboxStyles[systemId] ?? skyboxStyles["helion-reach"];
  await renderSkyboxWebp({
    publicPath,
    band: 0,
    width: 2048,
    height: 1024,
    style,
    flip: systemId.length % 2 === 0,
    quality: 84,
    extra: "noise=alls=3:allf=t+u"
  });
}

await renderSkyboxWebp({
  publicPath: manifest.skyboxPanorama,
  band: 0,
  width: 2048,
  height: 1024,
  style: { hue: 42, saturation: 1.04, contrast: 1.18, brightness: -0.07 },
  quality: 84,
  extra: "noise=alls=3:allf=t+u"
});

for (const [planetId, publicPath] of Object.entries(manifest.planetTextures)) {
  const style = planetStyles[planetId] ?? planetStyles["helion-prime-world"];
  await renderWebp({
    publicPath,
    band: 1,
    width: 1024,
    height: 512,
    style,
    flip: planetId.length % 3 === 0,
    quality: 83,
    extra: planetId.includes("gas") || planetId.includes("reef") ? "gblur=sigma=0.7" : "noise=alls=2:allf=t+u"
  });
}

await renderWebp({
  publicPath: manifest.asteroidTextures,
  band: 3,
  width: 1254,
  height: 1254,
  style: { hue: -18, saturation: 0.88, contrast: 1.42, brightness: -0.12 },
  quality: 84,
  extra: "noise=alls=5:allf=t+u"
});

await renderWebp({
  publicPath: manifest.npcShipTextures.freighter,
  band: 2,
  width: 1024,
  height: 512,
  style: { hue: 14, saturation: 0.84, contrast: 1.22, brightness: -0.05 },
  quality: 86,
  extra: "noise=alls=2:allf=t+u"
});

await rm(tempDir, { recursive: true, force: true });
console.log("generated cinematic flight textures");
