import type { PlanetDefinition, StarSystemDefinition, StationDefinition, Vec3 } from "../types/game";

const CELESTIAL_XY_SCALE = 3.4;
const JUMP_GATE_XY_SCALE = 2;
const ORBITAL_CLEARANCE = 300;
const HIDDEN_STATION_EXTRA_CLEARANCE = 180;
const HIDDEN_STATION_DIRECTION_BIAS: Vec3 = [0, 1, -0.5];

function addVec3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function subVec3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scaleVec3(a: Vec3, value: number): Vec3 {
  return [a[0] * value, a[1] * value, a[2] * value];
}

function normalizeVec3(a: Vec3, fallback: Vec3 = [0, 0, 1]): Vec3 {
  const length = Math.hypot(a[0], a[1], a[2]);
  return length <= 0.0001 ? fallback : [a[0] / length, a[1] / length, a[2] / length];
}

function scaleOrbitalPlane(position: Vec3, xyScale = CELESTIAL_XY_SCALE): Vec3 {
  return [position[0] * xyScale, position[1] * xyScale, position[2]];
}

function createOrbitalPosition(planet: PlanetDefinition, rawTargetPosition: Vec3, clearance: number, directionBias?: Vec3): Vec3 {
  const scaledTargetPosition = scaleOrbitalPlane(rawTargetPosition);
  const biasedDirection = directionBias
    ? addVec3(normalizeVec3(subVec3(scaledTargetPosition, planet.position)), directionBias)
    : subVec3(scaledTargetPosition, planet.position);
  return addVec3(planet.position, scaleVec3(normalizeVec3(biasedDirection), planet.radius + clearance));
}

function layoutPlanet(planet: PlanetDefinition): PlanetDefinition {
  const positionedPlanet = { ...planet, position: scaleOrbitalPlane(planet.position) };
  return {
    ...positionedPlanet,
    beaconPosition: createOrbitalPosition(positionedPlanet, planet.beaconPosition, ORBITAL_CLEARANCE)
  };
}

function layoutStation(station: StationDefinition): StationDefinition {
  const planet = planetById[station.planetId];
  if (!planet) return { ...station, position: scaleOrbitalPlane(station.position) };
  if (station.hidden) {
    return {
      ...station,
      position: createOrbitalPosition(planet, station.position, ORBITAL_CLEARANCE + HIDDEN_STATION_EXTRA_CLEARANCE, HIDDEN_STATION_DIRECTION_BIAS)
    };
  }
  return { ...station, position: planet.beaconPosition };
}

function layoutSystem(system: StarSystemDefinition): StarSystemDefinition {
  return {
    ...system,
    jumpGatePosition: scaleOrbitalPlane(system.jumpGatePosition, JUMP_GATE_XY_SCALE)
  };
}

const rawPlanets: PlanetDefinition[] = [
  {
    id: "helion-prime-world",
    name: "Helion Prime",
    type: "Temperate trade world",
    description: "Blue-green continents under regulated orbital traffic lanes.",
    systemId: "helion-reach",
    stationId: "helion-prime",
    textureKey: "helion-prime-world",
    position: [0, -180, -1160],
    beaconPosition: [0, 0, -760],
    radius: 520,
    atmosphereColor: "#78d7ff"
  },
  {
    id: "aurora-shepherd",
    name: "Aurora Shepherd",
    type: "Magnetized ocean moon",
    description: "A storm-lit water moon watched by cargo shepherd arrays.",
    systemId: "helion-reach",
    stationId: "aurora-ring",
    textureKey: "aurora-shepherd",
    position: [840, 110, -1220],
    beaconPosition: [770, 20, -850],
    radius: 380,
    atmosphereColor: "#9ff0d8"
  },
  {
    id: "vale-cinder",
    name: "Vale Cinder",
    type: "Cratered refinery moon",
    description: "Dark mare fields and impact scars around low-gravity foundries.",
    systemId: "helion-reach",
    stationId: "cinder-yard",
    textureKey: "vale-cinder",
    position: [-760, -90, -1180],
    beaconPosition: [-680, -20, -820],
    radius: 340,
    atmosphereColor: "#ffca7a"
  },
  {
    id: "meridian-lumen",
    name: "Meridian Lumen",
    type: "Solar observatory planet",
    description: "A bright terminator world with mirror farms across its ridges.",
    systemId: "helion-reach",
    stationId: "meridian-dock",
    textureKey: "meridian-lumen",
    position: [260, 520, -1380],
    beaconPosition: [220, 340, -920],
    radius: 300,
    atmosphereColor: "#fff0a8"
  },
  {
    id: "kuro-anvil",
    name: "Kuro Anvil",
    type: "Iron belt dwarf",
    description: "A fractured ore world wrapped in industrial dust and slag lights.",
    systemId: "kuro-belt",
    stationId: "kuro-deep",
    textureKey: "kuro-anvil",
    position: [120, -220, -1180],
    beaconPosition: [120, -30, -780],
    radius: 500,
    atmosphereColor: "#ffd166"
  },
  {
    id: "lode-minor",
    name: "Lode Minor",
    type: "Titanium prospector moon",
    description: "Striped regolith and mine cuts expose bright seams of metal.",
    systemId: "kuro-belt",
    stationId: "lode-spindle",
    textureKey: "lode-minor",
    position: [-760, 120, -1220],
    beaconPosition: [-650, 30, -830],
    radius: 340,
    atmosphereColor: "#d7e2ee"
  },
  {
    id: "niobe-ice",
    name: "Niobe Ice",
    type: "Cryovolcanic ice planet",
    description: "Blue fissures vent noble gases through a cracked ice shell.",
    systemId: "kuro-belt",
    stationId: "niobe-refinery",
    textureKey: "niobe-ice",
    position: [760, -140, -1260],
    beaconPosition: [640, -20, -850],
    radius: 370,
    atmosphereColor: "#8fd7ff"
  },
  {
    id: "bracken-dust",
    name: "Bracken Dust",
    type: "Carbonaceous rubble planet",
    description: "A brown-green rubble world where union salvagers chase old impact claims.",
    systemId: "kuro-belt",
    stationId: "bracken-claim",
    textureKey: "bracken-dust",
    position: [-240, 500, -1370],
    beaconPosition: [-200, 330, -930],
    radius: 310,
    atmosphereColor: "#c6d17a"
  },
  {
    id: "vantara-command",
    name: "Vantara Command",
    type: "Fortress planet",
    description: "Red canyons and polar bases anchor Directorate fleet logistics.",
    systemId: "vantara",
    stationId: "vantara-bastion",
    textureKey: "vantara-command",
    position: [-140, -150, -1220],
    beaconPosition: [-140, 25, -820],
    radius: 500,
    atmosphereColor: "#ff8f7a"
  },
  {
    id: "redoubt-moon",
    name: "Redoubt Moon",
    type: "Bunker moon",
    description: "Concrete-gray highlands pocked with shielded munition vaults.",
    systemId: "vantara",
    stationId: "redoubt-arsenal",
    textureKey: "redoubt-moon",
    position: [780, 160, -1280],
    beaconPosition: [660, 40, -880],
    radius: 330,
    atmosphereColor: "#d8e0f0"
  },
  {
    id: "gryphon-reef",
    name: "Gryphon Reef",
    type: "Storm reef world",
    description: "Electric green storm bands hide carrier refuel platforms.",
    systemId: "vantara",
    stationId: "gryphon-carrier",
    textureKey: "gryphon-reef",
    position: [-760, 140, -1270],
    beaconPosition: [-650, 30, -860],
    radius: 370,
    atmosphereColor: "#8fffc4"
  },
  {
    id: "sentry-ash",
    name: "Sentry Ash",
    type: "Burnt listening moon",
    description: "Ash dunes and old antenna craters mark the outer sensor line.",
    systemId: "vantara",
    stationId: "sentry-listening-post",
    textureKey: "sentry-ash",
    position: [210, 520, -1380],
    beaconPosition: [170, 330, -930],
    radius: 300,
    atmosphereColor: "#ffc0a0"
  },
  {
    id: "mirr-glass",
    name: "Mirr Glass",
    type: "Crystal research world",
    description: "Violet crystal basins reflect the Mirr Collective's orbital lattice.",
    systemId: "mirr-vale",
    stationId: "mirr-lattice",
    textureKey: "mirr-glass",
    position: [70, -180, -1160],
    beaconPosition: [70, 50, -760],
    radius: 500,
    atmosphereColor: "#b99cff"
  },
  {
    id: "optic-tide",
    name: "Optic Tide",
    type: "Bioluminescent ocean planet",
    description: "Dark seas pulse with spectral plankton beneath optics farms.",
    systemId: "mirr-vale",
    stationId: "optic-garden",
    textureKey: "optic-tide",
    position: [760, 110, -1260],
    beaconPosition: [650, 30, -870],
    radius: 380,
    atmosphereColor: "#72f3ff"
  },
  {
    id: "hush-orbit",
    name: "Hush Orbit",
    type: "Silent signal moon",
    description: "A dim crater moon where drone whispers leak through the dust.",
    systemId: "mirr-vale",
    stationId: "hush-array",
    textureKey: "hush-orbit",
    position: [-760, -130, -1240],
    beaconPosition: [-660, -30, -850],
    radius: 330,
    atmosphereColor: "#a5b4fc"
  },
  {
    id: "viridian-ruins",
    name: "Viridian Ruins",
    type: "Overgrown relic world",
    description: "Emerald forests swallow old survey domes and buried data vaults.",
    systemId: "mirr-vale",
    stationId: "viridian-lab",
    textureKey: "viridian-ruins",
    position: [-160, 530, -1390],
    beaconPosition: [-130, 340, -940],
    radius: 310,
    atmosphereColor: "#8cf2a9"
  },
  {
    id: "ashen-harbor",
    name: "Ashen Harbor",
    type: "Frontier ash world",
    description: "Copper clouds and volcanic flats surround the drift's legal port.",
    systemId: "ashen-drift",
    stationId: "ashen-freeport",
    textureKey: "ashen-harbor",
    position: [-120, -240, -1140],
    beaconPosition: [-120, -40, -730],
    radius: 500,
    atmosphereColor: "#ff9a6e"
  },
  {
    id: "black-arc",
    name: "Black Arc",
    type: "Eclipsed rogue planet",
    description: "A half-lit outlaw planet with black-market lights on its nightside.",
    systemId: "ashen-drift",
    stationId: "black-arcade",
    textureKey: "black-arc",
    position: [260, -220, -1360],
    beaconPosition: [210, 15, -960],
    radius: 440,
    atmosphereColor: "#ff4e7a"
  },
  {
    id: "emberfall",
    name: "Emberfall",
    type: "Molten courier world",
    description: "Glowing fault lines split a world used for dangerous relay drops.",
    systemId: "ashen-drift",
    stationId: "emberfall-relay",
    textureKey: "emberfall",
    position: [-850, 120, -1260],
    beaconPosition: [-720, 35, -870],
    radius: 360,
    atmosphereColor: "#ffb157"
  },
  {
    id: "grave-moon",
    name: "Grave Moon",
    type: "Ship graveyard moon",
    description: "A pale moon surrounded by derelict hull fragments and salvage claims.",
    systemId: "ashen-drift",
    stationId: "graveyard-spindle",
    textureKey: "grave-moon",
    position: [760, 190, -1320],
    beaconPosition: [650, 65, -910],
    radius: 330,
    atmosphereColor: "#d9d9c8"
  },
  {
    id: "voss-kel",
    name: "Voss Kel",
    type: "Clan market planet",
    description: "High deserts and clan citadels trade under wary convoy beacons.",
    systemId: "ashen-drift",
    stationId: "voss-kel-market",
    textureKey: "voss-kel",
    position: [-180, 560, -1460],
    beaconPosition: [-140, 360, -1010],
    radius: 320,
    atmosphereColor: "#ffd28a"
  },
  {
    id: "celest-crown",
    name: "Celest Crown",
    type: "Luxury capital world",
    description: "A pearl-blue capital planet ringed by premium shipyard traffic.",
    systemId: "celest-gate",
    stationId: "celest-vault",
    textureKey: "celest-crown",
    position: [0, -200, -1280],
    beaconPosition: [0, 60, -880],
    radius: 540,
    atmosphereColor: "#c5e7ff"
  },
  {
    id: "aurelia",
    name: "Aurelia",
    type: "Golden garden planet",
    description: "Warm continents and botanical preserves serve the high-end market.",
    systemId: "celest-gate",
    stationId: "aurelia-exchange",
    textureKey: "aurelia",
    position: [820, 120, -1340],
    beaconPosition: [680, 50, -940],
    radius: 370,
    atmosphereColor: "#ffe08a"
  },
  {
    id: "opal-minor",
    name: "Opal Minor",
    type: "Opal drydock moon",
    description: "Pale mineral plains host quiet private refits and component brokers.",
    systemId: "celest-gate",
    stationId: "opal-drydock",
    textureKey: "opal-minor",
    position: [-760, 110, -1260],
    beaconPosition: [-650, 40, -880],
    radius: 330,
    atmosphereColor: "#f2d5ff"
  },
  {
    id: "zenith-gas",
    name: "Zenith Gas",
    type: "Noble gas giant",
    description: "Layered cyan storms feed a profitable skyhook refinery network.",
    systemId: "celest-gate",
    stationId: "zenith-skydock",
    textureKey: "zenith-gas",
    position: [250, 560, -1510],
    beaconPosition: [210, 350, -1040],
    radius: 440,
    atmosphereColor: "#83e7ff"
  },
  {
    id: "pearl-night",
    name: "Pearl Night",
    type: "Diplomatic nightside world",
    description: "A dark ocean planet glittering with consulate arcologies.",
    systemId: "celest-gate",
    stationId: "pearl-consulate",
    textureKey: "pearl-night",
    position: [-260, -520, -1420],
    beaconPosition: [-220, -310, -990],
    radius: 340,
    atmosphereColor: "#9bbcff"
  },
  {
    id: "ptd-home-world",
    name: "PTD Home",
    type: "Private ship vault world",
    description: "A quiet orbital depot reserved for storing and refitting the player's older hulls.",
    systemId: "ptd-home",
    stationId: "ptd-home",
    textureKey: "ptd-home-world",
    position: [0, -160, -1040],
    beaconPosition: [0, 0, -720],
    radius: 430,
    atmosphereColor: "#8ecbff"
  }
];

export const planets: PlanetDefinition[] = rawPlanets.map(layoutPlanet);

export const planetById = Object.fromEntries(planets.map((planet) => [planet.id, planet])) as Record<
  string,
  PlanetDefinition
>;

const rawStations: StationDefinition[] = [
  { id: "helion-prime", name: "Helion Prime Exchange", techLevel: 2, archetype: "Trade Hub", factionId: "solar-directorate", systemId: "helion-reach", planetId: "helion-prime-world", position: [0, 0, -760] },
  { id: "aurora-ring", name: "Aurora Ring", techLevel: 2, archetype: "Trade Hub", factionId: "solar-directorate", systemId: "helion-reach", planetId: "aurora-shepherd", position: [770, 20, -850] },
  { id: "cinder-yard", name: "Cinder Yard", techLevel: 1, archetype: "Mining Station", factionId: "free-belt-union", systemId: "helion-reach", planetId: "vale-cinder", position: [-680, -20, -820] },
  { id: "meridian-dock", name: "Meridian Dock", techLevel: 3, archetype: "Research Station", factionId: "mirr-collective", systemId: "helion-reach", planetId: "meridian-lumen", position: [220, 340, -920] },
  { id: "kuro-deep", name: "Kuro Deepworks", techLevel: 2, archetype: "Mining Station", factionId: "free-belt-union", systemId: "kuro-belt", planetId: "kuro-anvil", position: [120, -30, -780] },
  { id: "lode-spindle", name: "Lode Spindle", techLevel: 2, archetype: "Mining Station", factionId: "free-belt-union", systemId: "kuro-belt", planetId: "lode-minor", position: [-650, 30, -830] },
  { id: "niobe-refinery", name: "Niobe Gas Refinery", techLevel: 3, archetype: "Mining Station", factionId: "free-belt-union", systemId: "kuro-belt", planetId: "niobe-ice", position: [640, -20, -850] },
  { id: "bracken-claim", name: "Bracken Claim", techLevel: 1, archetype: "Frontier Port", factionId: "free-belt-union", systemId: "kuro-belt", planetId: "bracken-dust", position: [-200, 330, -930] },
  { id: "obsidian-foundry", name: "Obsidian Foundry", techLevel: 4, archetype: "Mining Station", factionId: "free-belt-union", systemId: "kuro-belt", planetId: "kuro-anvil", position: [340, -220, -940], hidden: true },
  { id: "vantara-bastion", name: "Vantara Bastion", techLevel: 3, archetype: "Military Outpost", factionId: "solar-directorate", systemId: "vantara", planetId: "vantara-command", position: [-140, 25, -820] },
  { id: "redoubt-arsenal", name: "Redoubt Arsenal", techLevel: 4, archetype: "Military Outpost", factionId: "solar-directorate", systemId: "vantara", planetId: "redoubt-moon", position: [660, 40, -880] },
  { id: "gryphon-carrier", name: "Gryphon Carrier Dock", techLevel: 4, archetype: "Military Outpost", factionId: "solar-directorate", systemId: "vantara", planetId: "gryphon-reef", position: [-650, 30, -860] },
  { id: "sentry-listening-post", name: "Sentry Listening Post", techLevel: 3, archetype: "Research Station", factionId: "solar-directorate", systemId: "vantara", planetId: "sentry-ash", position: [170, 330, -930] },
  { id: "mirr-lattice", name: "Mirr Lattice", techLevel: 3, archetype: "Research Station", factionId: "mirr-collective", systemId: "mirr-vale", planetId: "mirr-glass", position: [70, 50, -760] },
  { id: "optic-garden", name: "Optic Garden", techLevel: 3, archetype: "Research Station", factionId: "mirr-collective", systemId: "mirr-vale", planetId: "optic-tide", position: [650, 30, -870] },
  { id: "hush-array", name: "Hush Array", techLevel: 4, archetype: "Research Station", factionId: "mirr-collective", systemId: "mirr-vale", planetId: "hush-orbit", position: [-660, -30, -850] },
  { id: "viridian-lab", name: "Viridian Lab", techLevel: 4, archetype: "Research Station", factionId: "mirr-collective", systemId: "mirr-vale", planetId: "viridian-ruins", position: [-130, 340, -940] },
  { id: "parallax-hermitage", name: "Parallax Hermitage", techLevel: 5, archetype: "Research Station", factionId: "mirr-collective", systemId: "mirr-vale", planetId: "hush-orbit", position: [-520, 90, -720], hidden: true },
  { id: "ashen-freeport", name: "Ashen Freeport", techLevel: 2, archetype: "Frontier Port", factionId: "vossari-clans", systemId: "ashen-drift", planetId: "ashen-harbor", position: [-120, -40, -730] },
  { id: "black-arcade", name: "Black Arcade", techLevel: 3, archetype: "Pirate Black Market", factionId: "independent-pirates", systemId: "ashen-drift", planetId: "black-arc", position: [210, 15, -960] },
  { id: "emberfall-relay", name: "Emberfall Relay", techLevel: 2, archetype: "Frontier Port", factionId: "vossari-clans", systemId: "ashen-drift", planetId: "emberfall", position: [-720, 35, -870] },
  { id: "graveyard-spindle", name: "Graveyard Spindle", techLevel: 4, archetype: "Pirate Black Market", factionId: "independent-pirates", systemId: "ashen-drift", planetId: "grave-moon", position: [650, 65, -910] },
  { id: "voss-kel-market", name: "Voss Kel Market", techLevel: 3, archetype: "Frontier Port", factionId: "vossari-clans", systemId: "ashen-drift", planetId: "voss-kel", position: [-140, 360, -1010] },
  { id: "moth-vault", name: "Moth Vault", techLevel: 5, archetype: "Pirate Black Market", factionId: "independent-pirates", systemId: "ashen-drift", planetId: "grave-moon", position: [760, 160, -1020], hidden: true },
  { id: "celest-vault", name: "Celest Vault", techLevel: 4, archetype: "Trade Hub", factionId: "solar-directorate", systemId: "celest-gate", planetId: "celest-crown", position: [0, 60, -880] },
  { id: "aurelia-exchange", name: "Aurelia Exchange", techLevel: 4, archetype: "Trade Hub", factionId: "solar-directorate", systemId: "celest-gate", planetId: "aurelia", position: [680, 50, -940] },
  { id: "opal-drydock", name: "Opal Drydock", techLevel: 4, archetype: "Military Outpost", factionId: "solar-directorate", systemId: "celest-gate", planetId: "opal-minor", position: [-650, 40, -880] },
  { id: "zenith-skydock", name: "Zenith Skydock", techLevel: 5, archetype: "Mining Station", factionId: "solar-directorate", systemId: "celest-gate", planetId: "zenith-gas", position: [210, 350, -1040] },
  { id: "pearl-consulate", name: "Pearl Consulate", techLevel: 5, archetype: "Trade Hub", factionId: "solar-directorate", systemId: "celest-gate", planetId: "pearl-night", position: [-220, -310, -990] },
  { id: "crownshade-observatory", name: "Crownshade Observatory", techLevel: 5, archetype: "Research Station", factionId: "solar-directorate", systemId: "celest-gate", planetId: "celest-crown", position: [110, 430, -1060], hidden: true },
  { id: "ptd-home", name: "PTD Home", techLevel: 5, archetype: "Trade Hub", factionId: "solar-directorate", systemId: "ptd-home", planetId: "ptd-home-world", position: [0, 0, -720] }
];

export const stations: StationDefinition[] = rawStations.map(layoutStation);

export const stationById = Object.fromEntries(stations.map((station) => [station.id, station])) as Record<
  string,
  StationDefinition
>;

const rawSystems: StarSystemDefinition[] = [
  {
    id: "helion-reach",
    name: "Helion Reach",
    description: "Tutorial trade lanes, modest security, and reliable station demand.",
    factionId: "solar-directorate",
    risk: 0.18,
    position: [0, 0],
    skyboxKey: "helion-reach",
    jumpGatePosition: [640, 70, -1240],
    planetIds: ["helion-prime-world", "aurora-shepherd", "vale-cinder", "meridian-lumen"],
    stationIds: ["helion-prime", "aurora-ring", "cinder-yard", "meridian-dock"],
    marketBias: { "basic-food": 0.88, "drinking-water": 0.9, electronics: 1.08, "medical-supplies": 1.12, iron: 0.95 }
  },
  {
    id: "kuro-belt",
    name: "Kuro Belt",
    description: "Dense asteroid bands and union miners feeding the inner systems.",
    factionId: "free-belt-union",
    risk: 0.32,
    position: [-1.2, 0.8],
    skyboxKey: "kuro-belt",
    jumpGatePosition: [-640, 90, -1180],
    planetIds: ["kuro-anvil", "lode-minor", "niobe-ice", "bracken-dust"],
    stationIds: ["kuro-deep", "lode-spindle", "niobe-refinery", "bracken-claim"],
    hiddenStationIds: ["obsidian-foundry"],
    marketBias: { iron: 0.72, titanium: 0.78, cesogen: 0.9, "mechanical-parts": 1.16, "energy-cells": 1.12 }
  },
  {
    id: "vantara",
    name: "Vantara",
    description: "Patrol formations and military contracts dominate the comm band.",
    factionId: "solar-directorate",
    risk: 0.28,
    position: [1.4, 0.7],
    skyboxKey: "vantara",
    jumpGatePosition: [720, 45, -1220],
    planetIds: ["vantara-command", "redoubt-moon", "gryphon-reef", "sentry-ash"],
    stationIds: ["vantara-bastion", "redoubt-arsenal", "gryphon-carrier", "sentry-listening-post"],
    marketBias: { "ship-components": 1.2, "medical-supplies": 1.18, "radioactive-materials": 0.92, "illegal-contraband": 1.65 }
  },
  {
    id: "mirr-vale",
    name: "Mirr Vale",
    description: "Research arrays, optics demand, and quiet rumors about drone signals.",
    factionId: "mirr-collective",
    risk: 0.22,
    position: [0.8, -1.1],
    skyboxKey: "mirr-vale",
    jumpGatePosition: [460, -100, -1280],
    planetIds: ["mirr-glass", "optic-tide", "hush-orbit", "viridian-ruins"],
    stationIds: ["mirr-lattice", "optic-garden", "hush-array", "viridian-lab"],
    hiddenStationIds: ["parallax-hermitage"],
    marketBias: { "data-cores": 1.28, optics: 1.22, microchips: 1.16, "rare-plants": 0.88, voidglass: 1.35 }
  },
  {
    id: "ashen-drift",
    name: "Ashen Drift",
    description: "A frontier corridor where convoy beacons vanish and black markets bloom.",
    factionId: "vossari-clans",
    risk: 0.68,
    position: [-2.1, -0.9],
    skyboxKey: "ashen-drift",
    jumpGatePosition: [-780, -70, -1320],
    planetIds: ["ashen-harbor", "black-arc", "emberfall", "grave-moon", "voss-kel"],
    stationIds: ["ashen-freeport", "black-arcade", "emberfall-relay", "graveyard-spindle", "voss-kel-market"],
    hiddenStationIds: ["moth-vault"],
    marketBias: { "illegal-contraband": 0.72, "luxury-goods": 1.24, "medical-supplies": 1.34, gold: 1.18, voidglass: 1.48 }
  },
  {
    id: "celest-gate",
    name: "Celest Gate",
    description: "An advanced trade hub with premium shipyards and expensive tastes.",
    factionId: "solar-directorate",
    risk: 0.36,
    position: [2.2, -0.6],
    skyboxKey: "celest-gate",
    jumpGatePosition: [800, 120, -1380],
    planetIds: ["celest-crown", "aurelia", "opal-minor", "zenith-gas", "pearl-night"],
    stationIds: ["celest-vault", "aurelia-exchange", "opal-drydock", "zenith-skydock", "pearl-consulate"],
    hiddenStationIds: ["crownshade-observatory"],
    marketBias: { "luxury-goods": 1.36, "ship-components": 1.3, "data-cores": 1.24, "rare-animals": 1.18, "noble-gas": 0.86 }
  },
  {
    id: "ptd-home",
    name: "PTD Home",
    description: "Private storage lanes for parked ships, default loadouts, and free local hull swaps.",
    factionId: "solar-directorate",
    risk: 0.05,
    position: [0.45, 0.35],
    skyboxKey: "ptd-home",
    jumpGatePosition: [520, 40, -980],
    planetIds: ["ptd-home-world"],
    stationIds: ["ptd-home"],
    marketBias: { "ship-components": 0.94, electronics: 0.98, "energy-cells": 0.96 }
  }
];

export const systems: StarSystemDefinition[] = rawSystems.map(layoutSystem);

export const systemById = Object.fromEntries(systems.map((system) => [system.id, system])) as Record<
  string,
  StarSystemDefinition
>;
