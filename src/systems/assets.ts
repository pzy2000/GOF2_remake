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
    "horizon-ark": "/assets/generated/ships/horizon-ark.glb",
    "sparrow-mk1-gundam": "/assets/generated/ships/sparrow-gundam.glb"
  },
  shipMaterialProfiles: {
    "sparrow-mk1": { baseColor: "#cfefff", trimColor: "#318ccf", emissiveColor: "#66e4ff", metalness: 0.48, roughness: 0.28 },
    "mule-lx": { baseColor: "#9a7b4f", trimColor: "#ffd166", emissiveColor: "#ffb657", metalness: 0.5, roughness: 0.36 },
    "prospector-rig": { baseColor: "#bda15f", trimColor: "#ffd166", emissiveColor: "#fff1a8", metalness: 0.54, roughness: 0.34 },
    "veil-runner": { baseColor: "#293b4a", trimColor: "#7dd3fc", emissiveColor: "#e0f7ff", metalness: 0.58, roughness: 0.24 },
    "talon-s": { baseColor: "#d94b58", trimColor: "#1f2937", emissiveColor: "#ffd3d8", metalness: 0.56, roughness: 0.26 },
    "wayfarer-x": { baseColor: "#d7f7ff", trimColor: "#2dd4bf", emissiveColor: "#ffffff", metalness: 0.46, roughness: 0.3 },
    "raptor-v": { baseColor: "#d94b58", trimColor: "#2a2f35", emissiveColor: "#70f0ff", metalness: 0.58, roughness: 0.24 },
    "bastion-7": { baseColor: "#6f2530", trimColor: "#ff7a45", emissiveColor: "#ffd166", metalness: 0.62, roughness: 0.3 },
    "horizon-ark": { baseColor: "#f5ead2", trimColor: "#8ff7ff", emissiveColor: "#ffffff", metalness: 0.52, roughness: 0.22 },
    "sparrow-mk1-gundam": { baseColor: "#f2f7ff", trimColor: "#246bff", emissiveColor: "#83ecff", metalness: 0.56, roughness: 0.26 }
  },
  shipAttachmentProfiles: {
    "sparrow-mk1": { engineHardpoints: [[-5.5, -1.6, 17], [5.5, -1.6, 17]], primaryHardpoints: [[0, 0.4, -28]], secondaryHardpoints: [[-8, -0.8, -10], [8, -0.8, -10]] },
    "mule-lx": { engineHardpoints: [[-12, -3, 20], [12, -3, 20]], primaryHardpoints: [[0, 1, -30]], secondaryHardpoints: [[-14, -1, -8], [14, -1, -8]] },
    "prospector-rig": { engineHardpoints: [[-8, -5, 27], [8, -5, 27]], primaryHardpoints: [[0, -2, -26]], secondaryHardpoints: [[-10, -2, -6], [10, -2, -6]] },
    "veil-runner": { engineHardpoints: [[-5.2, -2.4, 24], [5.2, -2.4, 24]], primaryHardpoints: [[0, 0, -29]], secondaryHardpoints: [[-7, -1, -8], [7, -1, -8]] },
    "talon-s": { engineHardpoints: [[-7.5, -2.2, 20], [7.5, -2.2, 20]], primaryHardpoints: [[-5, 0.5, -30], [5, 0.5, -30]], secondaryHardpoints: [[-11, -1, -12], [11, -1, -12]] },
    "wayfarer-x": { engineHardpoints: [[-15, -2.6, 27], [15, -2.6, 27]], primaryHardpoints: [[0, 0, -33]], secondaryHardpoints: [[-13, -1, -10], [13, -1, -10]] },
    "raptor-v": { engineHardpoints: [[-8, -1.8, 18], [0, -1.2, 20], [8, -1.8, 18]], primaryHardpoints: [[-6, 0.4, -30], [6, 0.4, -30]], secondaryHardpoints: [[0, -1, -11]] },
    "bastion-7": { engineHardpoints: [[-14, -4, 22], [0, -3, 24], [14, -4, 22]], primaryHardpoints: [[-7, 0, -34], [7, 0, -34]], secondaryHardpoints: [[-16, -2, -14], [16, -2, -14]] },
    "horizon-ark": { engineHardpoints: [[-16, -2.4, 24], [-5, -2, 26], [5, -2, 26], [16, -2.4, 24]], primaryHardpoints: [[-5, 0.4, -34], [5, 0.4, -34]], secondaryHardpoints: [[-14, -1, -12], [14, -1, -12]] },
    "sparrow-mk1-gundam": { engineHardpoints: [[-9, -3, 18], [9, -3, 18], [-18, 1, 7], [18, 1, 7]], primaryHardpoints: [[-26, -4, -25], [26, -4, -25]], secondaryHardpoints: [[-18, -3, 21], [18, -3, 21]] }
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
  assetCredits: [
    {
      title: "Mech",
      author: "Quaternius via Get3DModels",
      sourceUrl: "https://www.get3dmodels.com/robot/mech-2/",
      license: "Public domain",
      licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      assetPath: "/assets/generated/ships/sparrow-gundam.glb"
    }
  ],
  vfxCues: {
    hit: "impact-spark",
    shieldHit: "shield-ripple",
    explosion: "cinematic-burst",
    afterburner: "engine-plume",
    targetLock: "lock-reticle"
  },
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
    shipMaterialProfiles: manifest.shipMaterialProfiles,
    shipAttachmentProfiles: manifest.shipAttachmentProfiles,
    npcShipTextures: {
      freighter: resolvePublicAssetPath(manifest.npcShipTextures.freighter, baseUrl)
    },
    speakerPortraits: resolveAssetRecord(manifest.speakerPortraits, baseUrl),
    storyCinematics: resolveAssetRecord(manifest.storyCinematics ?? {}, baseUrl),
    voiceClips: resolveAssetRecord(manifest.voiceClips ?? {}, baseUrl),
    asteroidTextures: resolvePublicAssetPath(manifest.asteroidTextures, baseUrl),
    factionEmblems: resolvePublicAssetPath(manifest.factionEmblems, baseUrl),
    hudOverlay: resolvePublicAssetPath(manifest.hudOverlay, baseUrl),
    assetCredits: manifest.assetCredits.map((credit) => ({
      ...credit,
      assetPath: resolvePublicAssetPath(credit.assetPath, baseUrl)
    })),
    vfxCues: manifest.vfxCues,
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
    shipMaterialProfiles: { ...rawFallbackAssetManifest.shipMaterialProfiles, ...loaded.shipMaterialProfiles },
    shipAttachmentProfiles: { ...rawFallbackAssetManifest.shipAttachmentProfiles, ...loaded.shipAttachmentProfiles },
    npcShipTextures: { ...rawFallbackAssetManifest.npcShipTextures, ...loaded.npcShipTextures },
    speakerPortraits: { ...rawFallbackAssetManifest.speakerPortraits, ...loaded.speakerPortraits },
    storyCinematics: { ...rawFallbackAssetManifest.storyCinematics, ...loaded.storyCinematics },
    voiceClips: { ...rawFallbackAssetManifest.voiceClips, ...loaded.voiceClips },
    assetCredits: loaded.assetCredits ?? rawFallbackAssetManifest.assetCredits,
    vfxCues: { ...rawFallbackAssetManifest.vfxCues, ...loaded.vfxCues },
    musicTracks: {
      systems: { ...rawFallbackAssetManifest.musicTracks.systems, ...loaded.musicTracks?.systems },
      stationArchetypes: { ...rawFallbackAssetManifest.musicTracks.stationArchetypes, ...loaded.musicTracks?.stationArchetypes },
      combat: loaded.musicTracks?.combat ?? rawFallbackAssetManifest.musicTracks.combat
    }
  });
}
