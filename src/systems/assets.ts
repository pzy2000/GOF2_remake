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
  enemyShipModels: {
    "glass-echo-drone": "/assets/generated/enemies/glass-echo-drone.glb",
    "glass-echo-prime": "/assets/generated/enemies/glass-echo-prime.glb"
  },
  stationModels: {
    "mirr-lattice": "/assets/generated/stations/mirr-lattice.glb",
    "celest-vault": "/assets/generated/stations/celest-vault.glb"
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
  shipLodProfiles: {
    default: { highDetailDistance: 720, mediumDetailDistance: 1500, highGeometrySegments: 32, mediumGeometrySegments: 18, lowGeometrySegments: 10, silhouetteScale: 1 },
    "sparrow-mk1": { highDetailDistance: 720, mediumDetailDistance: 1500, highGeometrySegments: 32, mediumGeometrySegments: 18, lowGeometrySegments: 10, silhouetteScale: 1 },
    "mule-lx": { highDetailDistance: 760, mediumDetailDistance: 1600, highGeometrySegments: 28, mediumGeometrySegments: 16, lowGeometrySegments: 10, silhouetteScale: 1.06 },
    "prospector-rig": { highDetailDistance: 760, mediumDetailDistance: 1600, highGeometrySegments: 28, mediumGeometrySegments: 16, lowGeometrySegments: 10, silhouetteScale: 1.04 },
    "veil-runner": { highDetailDistance: 740, mediumDetailDistance: 1550, highGeometrySegments: 34, mediumGeometrySegments: 18, lowGeometrySegments: 10, silhouetteScale: 0.96 },
    "talon-s": { highDetailDistance: 740, mediumDetailDistance: 1550, highGeometrySegments: 30, mediumGeometrySegments: 16, lowGeometrySegments: 9, silhouetteScale: 0.98 },
    "wayfarer-x": { highDetailDistance: 790, mediumDetailDistance: 1650, highGeometrySegments: 30, mediumGeometrySegments: 16, lowGeometrySegments: 10, silhouetteScale: 1.08 },
    "raptor-v": { highDetailDistance: 760, mediumDetailDistance: 1600, highGeometrySegments: 34, mediumGeometrySegments: 18, lowGeometrySegments: 10, silhouetteScale: 1 },
    "bastion-7": { highDetailDistance: 820, mediumDetailDistance: 1750, highGeometrySegments: 30, mediumGeometrySegments: 16, lowGeometrySegments: 10, silhouetteScale: 1.12 },
    "horizon-ark": { highDetailDistance: 860, mediumDetailDistance: 1800, highGeometrySegments: 36, mediumGeometrySegments: 20, lowGeometrySegments: 12, silhouetteScale: 1.16 },
    "sparrow-mk1-gundam": { highDetailDistance: 900, mediumDetailDistance: 1900, highGeometrySegments: 36, mediumGeometrySegments: 20, lowGeometrySegments: 12, silhouetteScale: 1.22 }
  },
  planetVisualProfiles: {
    default: { cloudOpacity: 0.06, hazeOpacity: 0.13, ringed: false, rotationSpeed: 0.014, rimDistanceMultiplier: 2.35, cloudColor: "#f5fbff", ringColor: "#dbe8f0", cityLightColor: "#ffd166", cityLightIntensity: 0.12, nearSegments: [96, 48], farSegments: [48, 24], farDistance: 1650 },
    rocky: { cloudOpacity: 0.025, hazeOpacity: 0.07, ringed: false, rotationSpeed: 0.009, rimDistanceMultiplier: 1.9, cloudColor: "#d9d1c4", ringColor: "#b9a889", cityLightColor: "#ffb657", cityLightIntensity: 0.08, nearSegments: [72, 36], farSegments: [36, 18], farDistance: 1450 },
    volatile: { cloudOpacity: 0.1, hazeOpacity: 0.15, ringed: true, rotationSpeed: 0.014, rimDistanceMultiplier: 2.55, cloudColor: "#f5fbff", ringColor: "#dbe8f0", cityLightColor: "#9bffe8", cityLightIntensity: 0.14, nearSegments: [96, 48], farSegments: [56, 28], farDistance: 1750 },
    "mirr-glass": { cloudOpacity: 0.07, hazeOpacity: 0.18, ringed: true, rotationSpeed: 0.012, rimDistanceMultiplier: 2.7, cloudColor: "#eaffff", ringColor: "#9bffe8", cityLightColor: "#ff9bd5", cityLightIntensity: 0.18, nearSegments: [112, 56], farSegments: [56, 28], farDistance: 1800 },
    "ashen-harbor": { cloudOpacity: 0.035, hazeOpacity: 0.1, ringed: false, rotationSpeed: 0.01, rimDistanceMultiplier: 2.1, cloudColor: "#ffd6a3", ringColor: "#ff8a6a", cityLightColor: "#ff784f", cityLightIntensity: 0.16, nearSegments: [80, 40], farSegments: [40, 20], farDistance: 1500 },
    "celest-crown": { cloudOpacity: 0.12, hazeOpacity: 0.18, ringed: true, rotationSpeed: 0.015, rimDistanceMultiplier: 2.8, cloudColor: "#ffffff", ringColor: "#ffd166", cityLightColor: "#dff8ff", cityLightIntensity: 0.22, nearSegments: [112, 56], farSegments: [64, 32], farDistance: 1850 }
  },
  stationVisualProfiles: {
    default: { accentColor: "#3bb4ff", hullColor: "#7e919e", solarColor: "#5f7180", ringScale: 1, emissiveIntensity: 0.16, trafficColor: "#80d6ff", nearSegments: 72, farSegments: 36, farDistance: 1300 },
    "Trade Hub": { accentColor: "#3bb4ff", hullColor: "#8aa0ad", solarColor: "#5f7180", ringScale: 1.2, emissiveIntensity: 0.2, trafficColor: "#dff8ff", nearSegments: 80, farSegments: 40, farDistance: 1400 },
    "Mining Station": { accentColor: "#ffd166", hullColor: "#7b7569", solarColor: "#d8a23b", ringScale: 1, emissiveIntensity: 0.18, trafficColor: "#ffb657", nearSegments: 64, farSegments: 32, farDistance: 1250 },
    "Research Station": { accentColor: "#9b7bff", hullColor: "#7988a6", solarColor: "#9dbbff", ringScale: 1.05, emissiveIntensity: 0.24, trafficColor: "#9bffe8", nearSegments: 80, farSegments: 40, farDistance: 1450 },
    "Military Outpost": { accentColor: "#ff6b6b", hullColor: "#6f7782", solarColor: "#7b8794", ringScale: 0.95, emissiveIntensity: 0.2, trafficColor: "#ff9b9b", nearSegments: 64, farSegments: 32, farDistance: 1300 },
    "Frontier Port": { accentColor: "#74e08d", hullColor: "#74838a", solarColor: "#607985", ringScale: 0.92, emissiveIntensity: 0.16, trafficColor: "#9bffe8", nearSegments: 60, farSegments: 30, farDistance: 1200 },
    "Pirate Black Market": { accentColor: "#ff4e5f", hullColor: "#4a2a36", solarColor: "#8a3a52", ringScale: 0.82, emissiveIntensity: 0.28, trafficColor: "#ff784f", nearSegments: 56, farSegments: 28, farDistance: 1150 },
    "mirr-lattice": { accentColor: "#9bffe8", hullColor: "#7a8fa6", solarColor: "#b8ccff", ringScale: 1.16, emissiveIntensity: 0.32, trafficColor: "#ff9bd5", nearSegments: 96, farSegments: 48, farDistance: 1500 },
    "celest-vault": { accentColor: "#ffd166", hullColor: "#a6a18a", solarColor: "#dff8ff", ringScale: 1.28, emissiveIntensity: 0.3, trafficColor: "#ffffff", nearSegments: 96, farSegments: 48, farDistance: 1550 }
  },
  scenePostProfiles: {
    default: { backgroundColor: "#030712", fogColor: "#050b18", fogNear: 1450, fogFar: 4200, ambientMultiplier: 1, fillColor: "#5fc3ff", fillIntensity: 0.42, exposure: 1, bloomStrength: 0.34, bloomRadius: 0.28, bloomThreshold: 0.18, dofFocus: 1800, dofAperture: 0.000018, dofMaxBlur: 0.004 },
    "helion-reach": { backgroundColor: "#030712", fogColor: "#07111f", fogNear: 1550, fogFar: 4300, ambientMultiplier: 1.08, fillColor: "#5fc3ff", fillIntensity: 0.44, exposure: 1.02, bloomStrength: 0.38, bloomRadius: 0.3, bloomThreshold: 0.16, dofFocus: 1900, dofAperture: 0.000018, dofMaxBlur: 0.004 },
    "kuro-belt": { backgroundColor: "#050608", fogColor: "#17110b", fogNear: 1200, fogFar: 3600, ambientMultiplier: 0.92, fillColor: "#ffd166", fillIntensity: 0.32, exposure: 0.96, bloomStrength: 0.28, bloomRadius: 0.24, bloomThreshold: 0.22, dofFocus: 1550, dofAperture: 0.00002, dofMaxBlur: 0.0035 },
    vantara: { backgroundColor: "#04080f", fogColor: "#0b1424", fogNear: 1350, fogFar: 3900, ambientMultiplier: 1, fillColor: "#8fb7ff", fillIntensity: 0.38, exposure: 1, bloomStrength: 0.32, bloomRadius: 0.28, bloomThreshold: 0.18, dofFocus: 1750, dofAperture: 0.000018, dofMaxBlur: 0.0038 },
    "mirr-vale": { backgroundColor: "#030912", fogColor: "#061d24", fogNear: 1300, fogFar: 3850, ambientMultiplier: 1.08, fillColor: "#9bffe8", fillIntensity: 0.48, exposure: 1.04, bloomStrength: 0.54, bloomRadius: 0.42, bloomThreshold: 0.1, dofFocus: 1650, dofAperture: 0.000024, dofMaxBlur: 0.005 },
    "ashen-drift": { backgroundColor: "#070507", fogColor: "#1a0a10", fogNear: 1100, fogFar: 3400, ambientMultiplier: 0.88, fillColor: "#ff784f", fillIntensity: 0.34, exposure: 0.94, bloomStrength: 0.42, bloomRadius: 0.34, bloomThreshold: 0.14, dofFocus: 1500, dofAperture: 0.000024, dofMaxBlur: 0.0045 },
    "celest-gate": { backgroundColor: "#030713", fogColor: "#101729", fogNear: 1600, fogFar: 4600, ambientMultiplier: 1.12, fillColor: "#dff8ff", fillIntensity: 0.52, exposure: 1.08, bloomStrength: 0.48, bloomRadius: 0.38, bloomThreshold: 0.12, dofFocus: 2100, dofAperture: 0.000016, dofMaxBlur: 0.004 },
    "ptd-home": { backgroundColor: "#02070f", fogColor: "#09122a", fogNear: 1700, fogFar: 4700, ambientMultiplier: 1.1, fillColor: "#83ecff", fillIntensity: 0.5, exposure: 1.06, bloomStrength: 0.4, bloomRadius: 0.34, bloomThreshold: 0.14, dofFocus: 2150, dofAperture: 0.000016, dofMaxBlur: 0.004 }
  },
  vfxAssetProfiles: {
    "impact-spark": { coreColor: "#ffb657", shockColor: "#ffffff", debrisColor: "#ff784f", bloomIntensity: 1.1, particleMultiplier: 1 },
    "shield-ripple": { coreColor: "#69e4ff", shockColor: "#eaffff", debrisColor: "#9bffe8", bloomIntensity: 1.2, particleMultiplier: 1 },
    "cinematic-burst": { coreColor: "#ff784f", shockColor: "#ffd166", debrisColor: "#8a4b2b", bloomIntensity: 1.45, particleMultiplier: 1.25 },
    "engine-plume": { coreColor: "#66e4ff", shockColor: "#ffffff", debrisColor: "#7dd3fc", bloomIntensity: 1.15, particleMultiplier: 1 },
    "lock-reticle": { coreColor: "#ffdf6e", shockColor: "#eaffff", debrisColor: "#ffd166", bloomIntensity: 1, particleMultiplier: 1 }
  },
  vfxTextureSequences: {
    "cinematic-burst": [
      "/assets/generated/vfx/explosion-burst-00.png",
      "/assets/generated/vfx/explosion-burst-01.png",
      "/assets/generated/vfx/explosion-burst-02.png",
      "/assets/generated/vfx/explosion-burst-03.png",
      "/assets/generated/vfx/explosion-burst-04.png",
      "/assets/generated/vfx/explosion-burst-05.png",
      "/assets/generated/vfx/explosion-burst-06.png",
      "/assets/generated/vfx/explosion-burst-07.png"
    ]
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
    },
    {
      title: "Glass Echo premium enemy GLB set",
      author: "GOF2 procedural asset generator",
      sourceUrl: "scripts/generate-premium-assets.mjs",
      license: "Original project asset",
      assetPath: "/assets/generated/enemies/glass-echo-drone.glb"
    },
    {
      title: "Mirr Lattice and Celest Vault premium station GLB set",
      author: "GOF2 procedural asset generator",
      sourceUrl: "scripts/generate-premium-assets.mjs",
      license: "Original project asset",
      assetPath: "/assets/generated/stations/mirr-lattice.glb"
    },
    {
      title: "Cinematic burst explosion texture sequence",
      author: "GOF2 procedural asset generator",
      sourceUrl: "scripts/generate-premium-assets.mjs",
      license: "Original project asset",
      assetPath: "/assets/generated/vfx/explosion-burst-00.png"
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

function resolveAssetSequenceRecord(record: Record<string, string[]>, baseUrl?: string): Record<string, string[]> {
  return Object.fromEntries(Object.entries(record).map(([key, values]) => [key, values.map((value) => resolvePublicAssetPath(value, baseUrl))]));
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
    enemyShipModels: resolveAssetRecord(manifest.enemyShipModels, baseUrl),
    stationModels: resolveAssetRecord(manifest.stationModels, baseUrl),
    shipMaterialProfiles: manifest.shipMaterialProfiles,
    shipAttachmentProfiles: manifest.shipAttachmentProfiles,
    shipLodProfiles: manifest.shipLodProfiles,
    planetVisualProfiles: manifest.planetVisualProfiles,
    stationVisualProfiles: manifest.stationVisualProfiles,
    scenePostProfiles: manifest.scenePostProfiles,
    vfxAssetProfiles: manifest.vfxAssetProfiles,
    vfxTextureSequences: resolveAssetSequenceRecord(manifest.vfxTextureSequences, baseUrl),
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
    enemyShipModels: { ...rawFallbackAssetManifest.enemyShipModels, ...loaded.enemyShipModels },
    stationModels: { ...rawFallbackAssetManifest.stationModels, ...loaded.stationModels },
    shipMaterialProfiles: { ...rawFallbackAssetManifest.shipMaterialProfiles, ...loaded.shipMaterialProfiles },
    shipAttachmentProfiles: { ...rawFallbackAssetManifest.shipAttachmentProfiles, ...loaded.shipAttachmentProfiles },
    shipLodProfiles: { ...rawFallbackAssetManifest.shipLodProfiles, ...loaded.shipLodProfiles },
    planetVisualProfiles: { ...rawFallbackAssetManifest.planetVisualProfiles, ...loaded.planetVisualProfiles },
    stationVisualProfiles: { ...rawFallbackAssetManifest.stationVisualProfiles, ...loaded.stationVisualProfiles },
    scenePostProfiles: { ...rawFallbackAssetManifest.scenePostProfiles, ...loaded.scenePostProfiles },
    vfxAssetProfiles: { ...rawFallbackAssetManifest.vfxAssetProfiles, ...loaded.vfxAssetProfiles },
    vfxTextureSequences: { ...rawFallbackAssetManifest.vfxTextureSequences, ...loaded.vfxTextureSequences },
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
