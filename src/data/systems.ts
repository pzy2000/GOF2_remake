import type { StarSystemDefinition, StationDefinition } from "../types/game";

export const stations: StationDefinition[] = [
  { id: "helion-prime", name: "Helion Prime Exchange", archetype: "Trade Hub", factionId: "solar-directorate", systemId: "helion-reach", position: [0, 0, -760] },
  { id: "kuro-deep", name: "Kuro Deepworks", archetype: "Mining Station", factionId: "free-belt-union", systemId: "kuro-belt", position: [120, -30, -780] },
  { id: "vantara-bastion", name: "Vantara Bastion", archetype: "Military Outpost", factionId: "solar-directorate", systemId: "vantara", position: [-140, 25, -820] },
  { id: "mirr-lattice", name: "Mirr Lattice", archetype: "Research Station", factionId: "mirr-collective", systemId: "mirr-vale", position: [70, 50, -760] },
  { id: "ashen-freeport", name: "Ashen Freeport", archetype: "Frontier Port", factionId: "vossari-clans", systemId: "ashen-drift", position: [-120, -40, -730] },
  { id: "black-arcade", name: "Black Arcade", archetype: "Pirate Black Market", factionId: "independent-pirates", systemId: "ashen-drift", position: [210, 15, -960] },
  { id: "celest-vault", name: "Celest Vault", archetype: "Trade Hub", factionId: "solar-directorate", systemId: "celest-gate", position: [0, 60, -880] }
];

export const stationById = Object.fromEntries(stations.map((station) => [station.id, station])) as Record<
  string,
  StationDefinition
>;

export const systems: StarSystemDefinition[] = [
  {
    id: "helion-reach",
    name: "Helion Reach",
    description: "Tutorial trade lanes, modest security, and reliable station demand.",
    factionId: "solar-directorate",
    risk: 0.18,
    position: [0, 0],
    jumpGatePosition: [640, 70, -1240],
    stationIds: ["helion-prime"],
    marketBias: { "basic-food": 0.88, "drinking-water": 0.9, electronics: 1.08, "medical-supplies": 1.12, iron: 0.95 }
  },
  {
    id: "kuro-belt",
    name: "Kuro Belt",
    description: "Dense asteroid bands and union miners feeding the inner systems.",
    factionId: "free-belt-union",
    risk: 0.32,
    position: [-1.2, 0.8],
    jumpGatePosition: [-640, 90, -1180],
    stationIds: ["kuro-deep"],
    marketBias: { iron: 0.72, titanium: 0.78, cesogen: 0.9, "mechanical-parts": 1.16, "energy-cells": 1.12 }
  },
  {
    id: "vantara",
    name: "Vantara",
    description: "Patrol formations and military contracts dominate the comm band.",
    factionId: "solar-directorate",
    risk: 0.28,
    position: [1.4, 0.7],
    jumpGatePosition: [720, 45, -1220],
    stationIds: ["vantara-bastion"],
    marketBias: { "ship-components": 1.2, "medical-supplies": 1.18, "radioactive-materials": 0.92, "illegal-contraband": 1.65 }
  },
  {
    id: "mirr-vale",
    name: "Mirr Vale",
    description: "Research arrays, optics demand, and quiet rumors about drone signals.",
    factionId: "mirr-collective",
    risk: 0.22,
    position: [0.8, -1.1],
    jumpGatePosition: [460, -100, -1280],
    stationIds: ["mirr-lattice"],
    marketBias: { "data-cores": 1.28, optics: 1.22, microchips: 1.16, "rare-plants": 0.88, voidglass: 1.35 }
  },
  {
    id: "ashen-drift",
    name: "Ashen Drift",
    description: "A frontier corridor where convoy beacons vanish and black markets bloom.",
    factionId: "vossari-clans",
    risk: 0.68,
    position: [-2.1, -0.9],
    jumpGatePosition: [-780, -70, -1320],
    stationIds: ["ashen-freeport", "black-arcade"],
    marketBias: { "illegal-contraband": 0.72, "luxury-goods": 1.24, "medical-supplies": 1.34, gold: 1.18, voidglass: 1.48 }
  },
  {
    id: "celest-gate",
    name: "Celest Gate",
    description: "An advanced trade hub with premium shipyards and expensive tastes.",
    factionId: "solar-directorate",
    risk: 0.36,
    position: [2.2, -0.6],
    jumpGatePosition: [800, 120, -1380],
    stationIds: ["celest-vault"],
    marketBias: { "luxury-goods": 1.36, "ship-components": 1.3, "data-cores": 1.24, "rare-animals": 1.18, "noble-gas": 0.86 }
  }
];

export const systemById = Object.fromEntries(systems.map((system) => [system.id, system])) as Record<
  string,
  StarSystemDefinition
>;
