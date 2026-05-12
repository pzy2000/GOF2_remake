import type { AssetManifest, MusicTrackManifest } from "../types/game";

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
    "ptd-home": "/assets/generated/skybox-ptd-home.webp"
  },
  starSprites: {
    "helion-reach": "/assets/generated/stars/star-helion-reach.png",
    "kuro-belt": "/assets/generated/stars/star-kuro-belt.png",
    vantara: "/assets/generated/stars/star-vantara.png",
    "mirr-vale": "/assets/generated/stars/star-mirr-vale.png",
    "ashen-drift": "/assets/generated/stars/star-ashen-drift.png",
    "celest-gate": "/assets/generated/stars/star-celest-gate.png",
    "ptd-home": "/assets/generated/stars/star-ptd-home.png"
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
    "prospector-rig": "/assets/generated/ships/prospector-rig.glb",
    "veil-runner": "/assets/generated/ships/veil-runner.glb",
    "talon-s": "/assets/generated/ships/talon-s.glb",
    "wayfarer-x": "/assets/generated/ships/wayfarer-x.glb",
    "raptor-v": "/assets/generated/ships/raptor-v.glb",
    "bastion-7": "/assets/generated/ships/bastion-7.glb",
    "horizon-ark": "/assets/generated/ships/horizon-ark.glb"
  },
  npcShipTextures: {
    freighter: "/assets/generated/npc-freighter-hull.webp"
  },
  speakerPortraits: {
    captain: "/assets/generated/portraits/captain.webp",
    "ship-ai": "/assets/generated/portraits/ship-ai.webp",
    "helion-handler": "/assets/generated/portraits/helion-handler.webp",
    "mirr-analyst": "/assets/generated/portraits/mirr-analyst.webp",
    "kuro-foreman": "/assets/generated/portraits/kuro-foreman.webp",
    "vantara-officer": "/assets/generated/portraits/vantara-officer.webp",
    "ashen-broker": "/assets/generated/portraits/ashen-broker.webp",
    "celest-archivist": "/assets/generated/portraits/celest-archivist.webp",
    "union-witness": "/assets/generated/portraits/union-witness.webp"
  },
  storyCinematics: {
    "glass-wake-intro": "/assets/generated/story-glass-wake-intro.webp",
    "glass-echo-reversal": "/assets/generated/story-glass-echo-reversal.webp"
  },
  voiceClips: {},
  asteroidTextures: "/assets/generated/asteroid-textures.webp",
  factionEmblems: "/assets/generated/faction-emblems.webp",
  hudOverlay: "/assets/generated/hud-overlay.webp",
  musicTracks: {
    systems: {
      "helion-reach": "/assets/music/magic-space.mp3",
      "kuro-belt": "/assets/music/pynchon.mp3",
      vantara: "/assets/music/out-there.ogg",
      "mirr-vale": "/assets/music/galactic-temple.ogg",
      "ashen-drift": "/assets/music/space-graveyard.mp3",
      "celest-gate": "/assets/music/observing-the-star.ogg",
      "ptd-home": "/assets/music/loaben.mp3"
    },
    stationArchetypes: {
      "Trade Hub": "/assets/music/magic-space.mp3",
      "Mining Station": "/assets/music/pynchon.mp3",
      "Research Station": "/assets/music/galactic-temple.ogg",
      "Military Outpost": "/assets/music/tense-future-loop.ogg",
      "Frontier Port": "/assets/music/outer-space.mp3",
      "Pirate Black Market": "/assets/music/space-graveyard.mp3"
    },
    combat: "/assets/music/infestation-control-room.mp3"
  }
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

function resolveMusicTrackManifest(manifest: MusicTrackManifest, baseUrl?: string): MusicTrackManifest {
  return {
    systems: resolveAssetRecord(manifest.systems, baseUrl),
    stationArchetypes: resolveAssetRecord(manifest.stationArchetypes as AssetRecord, baseUrl) as MusicTrackManifest["stationArchetypes"],
    combat: resolvePublicAssetPath(manifest.combat, baseUrl)
  };
}

export function resolveAssetManifest(manifest: AssetManifest, baseUrl?: string): AssetManifest {
  return {
    keyArt: resolvePublicAssetPath(manifest.keyArt, baseUrl),
    commodityIcons: resolvePublicAssetPath(manifest.commodityIcons, baseUrl),
    equipmentIcons: resolvePublicAssetPath(manifest.equipmentIcons, baseUrl),
    nebulaBg: resolvePublicAssetPath(manifest.nebulaBg, baseUrl),
    skyboxPanorama: resolvePublicAssetPath(manifest.skyboxPanorama, baseUrl),
    systemSkyboxes: resolveAssetRecord(manifest.systemSkyboxes, baseUrl),
    starSprites: resolveAssetRecord(manifest.starSprites, baseUrl),
    planetTextures: resolveAssetRecord(manifest.planetTextures, baseUrl),
    shipModels: resolveAssetRecord(manifest.shipModels, baseUrl),
    npcShipTextures: {
      freighter: resolvePublicAssetPath(manifest.npcShipTextures.freighter, baseUrl)
    },
    speakerPortraits: resolveAssetRecord(manifest.speakerPortraits, baseUrl),
    storyCinematics: resolveAssetRecord(manifest.storyCinematics ?? {}, baseUrl),
    voiceClips: resolveAssetRecord(manifest.voiceClips ?? {}, baseUrl),
    asteroidTextures: resolvePublicAssetPath(manifest.asteroidTextures, baseUrl),
    factionEmblems: resolvePublicAssetPath(manifest.factionEmblems, baseUrl),
    hudOverlay: resolvePublicAssetPath(manifest.hudOverlay, baseUrl),
    musicTracks: resolveMusicTrackManifest(manifest.musicTracks, baseUrl)
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
    starSprites: { ...rawFallbackAssetManifest.starSprites, ...loaded.starSprites },
    planetTextures: { ...rawFallbackAssetManifest.planetTextures, ...loaded.planetTextures },
    shipModels: { ...rawFallbackAssetManifest.shipModels, ...loaded.shipModels },
    npcShipTextures: { ...rawFallbackAssetManifest.npcShipTextures, ...loaded.npcShipTextures },
    speakerPortraits: { ...rawFallbackAssetManifest.speakerPortraits, ...loaded.speakerPortraits },
    storyCinematics: { ...rawFallbackAssetManifest.storyCinematics, ...loaded.storyCinematics },
    voiceClips: { ...rawFallbackAssetManifest.voiceClips, ...loaded.voiceClips },
    musicTracks: {
      systems: { ...rawFallbackAssetManifest.musicTracks.systems, ...loaded.musicTracks?.systems },
      stationArchetypes: { ...rawFallbackAssetManifest.musicTracks.stationArchetypes, ...loaded.musicTracks?.stationArchetypes },
      combat: loaded.musicTracks?.combat ?? rawFallbackAssetManifest.musicTracks.combat
    }
  });
}
