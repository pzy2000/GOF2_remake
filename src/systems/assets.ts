import type { AssetManifest } from "../types/game";

const rawFallbackAssetManifest: AssetManifest = {
  keyArt: "/assets/generated/key-art.webp",
  commodityIcons: "/assets/generated/commodity-icons.webp",
  equipmentIcons: "/assets/generated/equipment-icons.webp",
  nebulaBg: "/assets/generated/nebula-bg.webp",
  skyboxPanorama: "/assets/generated/skybox-panorama.webp",
  systemSkyboxes: {
    "helion-reach": "/assets/generated/skybox-helion-reach.webp",
    "kuro-belt": "/assets/generated/skybox-kuro-belt.webp",
    vantara: "/assets/generated/skybox-vantara.webp",
    "mirr-vale": "/assets/generated/skybox-mirr-vale.webp",
    "ashen-drift": "/assets/generated/skybox-ashen-drift.webp",
    "celest-gate": "/assets/generated/skybox-celest-gate.webp",
    "ptd-home": "/assets/generated/skybox-panorama.webp"
  },
  planetTextures: {
    "helion-prime-world": "/assets/generated/planet-helion-prime-world.webp",
    "aurora-shepherd": "/assets/generated/planet-aurora-shepherd.webp",
    "vale-cinder": "/assets/generated/planet-vale-cinder.webp",
    "meridian-lumen": "/assets/generated/planet-meridian-lumen.webp",
    "kuro-anvil": "/assets/generated/planet-kuro-anvil.webp",
    "lode-minor": "/assets/generated/planet-lode-minor.webp",
    "niobe-ice": "/assets/generated/planet-niobe-ice.webp",
    "bracken-dust": "/assets/generated/planet-bracken-dust.webp",
    "vantara-command": "/assets/generated/planet-vantara-command.webp",
    "redoubt-moon": "/assets/generated/planet-redoubt-moon.webp",
    "gryphon-reef": "/assets/generated/planet-gryphon-reef.webp",
    "sentry-ash": "/assets/generated/planet-sentry-ash.webp",
    "mirr-glass": "/assets/generated/planet-mirr-glass.webp",
    "optic-tide": "/assets/generated/planet-optic-tide.webp",
    "hush-orbit": "/assets/generated/planet-hush-orbit.webp",
    "viridian-ruins": "/assets/generated/planet-viridian-ruins.webp",
    "ashen-harbor": "/assets/generated/planet-ashen-harbor.webp",
    "black-arc": "/assets/generated/planet-black-arc.webp",
    emberfall: "/assets/generated/planet-emberfall.webp",
    "grave-moon": "/assets/generated/planet-grave-moon.webp",
    "voss-kel": "/assets/generated/planet-voss-kel.webp",
    "celest-crown": "/assets/generated/planet-celest-crown.webp",
    aurelia: "/assets/generated/planet-aurelia.webp",
    "opal-minor": "/assets/generated/planet-opal-minor.webp",
    "zenith-gas": "/assets/generated/planet-zenith-gas.webp",
    "pearl-night": "/assets/generated/planet-pearl-night.webp",
    "ptd-home-world": "/assets/generated/planet-celest-crown.webp"
  },
  shipModels: {
    "sparrow-mk1": "/assets/generated/ships/sparrow-mk1.glb",
    "mule-lx": "/assets/generated/ships/mule-lx.glb",
    "raptor-v": "/assets/generated/ships/raptor-v.glb",
    "bastion-7": "/assets/generated/ships/bastion-7.glb",
    "horizon-ark": "/assets/generated/ships/horizon-ark.glb"
  },
  asteroidTextures: "/assets/generated/asteroid-textures.webp",
  factionEmblems: "/assets/generated/faction-emblems.webp",
  hudOverlay: "/assets/generated/hud-overlay.webp"
};

type AssetRecord = Record<string, string>;

function isExternalUrl(path: string): boolean {
  return /^(?:[a-z][a-z\d+\-.]*:)?\/\//i.test(path) || path.startsWith("data:") || path.startsWith("blob:");
}

export function resolvePublicAssetPath(path: string, baseUrl: string = import.meta.env.BASE_URL): string {
  if (isExternalUrl(path)) return path;
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${base}${cleanPath}`;
}

function resolveAssetRecord(record: AssetRecord, baseUrl?: string): AssetRecord {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, resolvePublicAssetPath(value, baseUrl)]));
}

export function resolveAssetManifest(manifest: AssetManifest, baseUrl?: string): AssetManifest {
  return {
    keyArt: resolvePublicAssetPath(manifest.keyArt, baseUrl),
    commodityIcons: resolvePublicAssetPath(manifest.commodityIcons, baseUrl),
    equipmentIcons: resolvePublicAssetPath(manifest.equipmentIcons, baseUrl),
    nebulaBg: resolvePublicAssetPath(manifest.nebulaBg, baseUrl),
    skyboxPanorama: resolvePublicAssetPath(manifest.skyboxPanorama, baseUrl),
    systemSkyboxes: resolveAssetRecord(manifest.systemSkyboxes, baseUrl),
    planetTextures: resolveAssetRecord(manifest.planetTextures, baseUrl),
    shipModels: resolveAssetRecord(manifest.shipModels, baseUrl),
    asteroidTextures: resolvePublicAssetPath(manifest.asteroidTextures, baseUrl),
    factionEmblems: resolvePublicAssetPath(manifest.factionEmblems, baseUrl),
    hudOverlay: resolvePublicAssetPath(manifest.hudOverlay, baseUrl)
  };
}

export const fallbackAssetManifest: AssetManifest = resolveAssetManifest(rawFallbackAssetManifest);

export async function loadAssetManifest(): Promise<AssetManifest> {
  const response = await fetch(resolvePublicAssetPath("assets/generated/manifest.json"));
  if (!response.ok) return fallbackAssetManifest;
  const loaded = (await response.json()) as Partial<AssetManifest>;
  return resolveAssetManifest({
    ...rawFallbackAssetManifest,
    ...loaded,
    systemSkyboxes: { ...rawFallbackAssetManifest.systemSkyboxes, ...loaded.systemSkyboxes },
    planetTextures: { ...rawFallbackAssetManifest.planetTextures, ...loaded.planetTextures },
    shipModels: { ...rawFallbackAssetManifest.shipModels, ...loaded.shipModels }
  });
}
