import type {
  CommodityDefinition,
  CommodityId,
  EquipmentId,
  FactionId,
  MissionDefinition,
  ShipDefinition,
  StationDefinition,
  StarSystemDefinition,
  WeaponDefinition
} from "../types/game";

export const factionNames: Record<FactionId, string> = {
  "solar-directorate": "Solar Directorate",
  "vossari-clans": "Vossari Clans",
  "mirr-collective": "Mirr Collective",
  "free-belt-union": "Free Belt Union",
  "independent-pirates": "Independent Pirates",
  "unknown-drones": "Unknown Drones"
};

export const commodities: CommodityDefinition[] = [
  { id: "basic-food", name: "Basic Food", basePrice: 18, mass: 1, legal: true, volatility: 0.1, category: "trade" },
  { id: "drinking-water", name: "Drinking Water", basePrice: 12, mass: 1, legal: true, volatility: 0.08, category: "trade" },
  { id: "electronics", name: "Electronics", basePrice: 74, mass: 1, legal: true, volatility: 0.16, category: "trade" },
  { id: "medical-supplies", name: "Medical Supplies", basePrice: 92, mass: 1, legal: true, volatility: 0.2, category: "trade" },
  { id: "luxury-goods", name: "Luxury Goods", basePrice: 140, mass: 1, legal: true, volatility: 0.24, category: "trade" },
  { id: "nanofibers", name: "Nanofibers", basePrice: 118, mass: 1, legal: true, volatility: 0.18, category: "trade" },
  { id: "energy-cells", name: "Energy Cells", basePrice: 48, mass: 1, legal: true, volatility: 0.12, category: "trade" },
  { id: "mechanical-parts", name: "Mechanical Parts", basePrice: 64, mass: 1, legal: true, volatility: 0.14, category: "trade" },
  { id: "microchips", name: "Microchips", basePrice: 130, mass: 1, legal: true, volatility: 0.22, category: "trade" },
  { id: "plastics", name: "Plastics", basePrice: 28, mass: 1, legal: true, volatility: 0.1, category: "trade" },
  { id: "chemicals", name: "Chemicals", basePrice: 56, mass: 1, legal: true, volatility: 0.18, category: "trade" },
  { id: "rare-plants", name: "Rare Plants", basePrice: 170, mass: 1, legal: true, volatility: 0.28, category: "trade" },
  { id: "rare-animals", name: "Rare Animals", basePrice: 220, mass: 1, legal: true, volatility: 0.32, category: "trade" },
  { id: "radioactive-materials", name: "Radioactive Materials", basePrice: 155, mass: 1, legal: true, volatility: 0.3, category: "trade" },
  { id: "noble-gas", name: "Noble Gas", basePrice: 98, mass: 1, legal: true, volatility: 0.16, category: "trade" },
  { id: "ship-components", name: "Ship Components", basePrice: 180, mass: 1, legal: true, volatility: 0.24, category: "trade" },
  { id: "optics", name: "Optics", basePrice: 112, mass: 1, legal: true, volatility: 0.2, category: "trade" },
  { id: "hydraulics", name: "Hydraulics", basePrice: 66, mass: 1, legal: true, volatility: 0.14, category: "trade" },
  { id: "data-cores", name: "Data Cores", basePrice: 260, mass: 1, legal: true, volatility: 0.34, category: "trade" },
  { id: "illegal-contraband", name: "Illegal Contraband", basePrice: 340, mass: 1, legal: false, volatility: 0.44, category: "restricted" },
  { id: "iron", name: "Iron", basePrice: 24, mass: 1, legal: true, volatility: 0.08, category: "ore" },
  { id: "titanium", name: "Titanium", basePrice: 72, mass: 1, legal: true, volatility: 0.16, category: "ore" },
  { id: "cesogen", name: "Cesogen", basePrice: 128, mass: 1, legal: true, volatility: 0.24, category: "ore" },
  { id: "gold", name: "Gold", basePrice: 210, mass: 1, legal: true, volatility: 0.3, category: "ore" },
  { id: "voidglass", name: "Voidglass", basePrice: 360, mass: 1, legal: true, volatility: 0.4, category: "ore" }
];

export const commodityById = Object.fromEntries(commodities.map((item) => [item.id, item])) as Record<
  CommodityId,
  CommodityDefinition
>;

export const ships: ShipDefinition[] = [
  {
    id: "sparrow-mk1",
    name: "Sparrow MK-I",
    role: "Starter scout",
    price: 0,
    stats: { hull: 100, shield: 80, energy: 100, speed: 170, handling: 1.35, cargoCapacity: 18, primarySlots: 1, secondarySlots: 1, utilitySlots: 1 },
    equipment: ["pulse-laser", "homing-missile", "mining-beam"]
  },
  {
    id: "mule-lx",
    name: "Mule LX",
    role: "Cargo hauler",
    price: 6200,
    stats: { hull: 150, shield: 90, energy: 90, speed: 115, handling: 0.9, cargoCapacity: 55, primarySlots: 1, secondarySlots: 1, utilitySlots: 2 },
    equipment: ["pulse-laser", "cargo-expansion", "scanner"]
  },
  {
    id: "raptor-v",
    name: "Raptor V",
    role: "Light fighter",
    price: 7800,
    stats: { hull: 115, shield: 120, energy: 135, speed: 210, handling: 1.75, cargoCapacity: 14, primarySlots: 2, secondarySlots: 1, utilitySlots: 1 },
    equipment: ["pulse-laser", "plasma-cannon", "homing-missile"]
  },
  {
    id: "bastion-7",
    name: "Bastion-7",
    role: "Heavy gunship",
    price: 13800,
    stats: { hull: 250, shield: 180, energy: 150, speed: 125, handling: 0.82, cargoCapacity: 28, primarySlots: 2, secondarySlots: 2, utilitySlots: 2 },
    equipment: ["plasma-cannon", "homing-missile", "armor-plating"]
  },
  {
    id: "horizon-ark",
    name: "Horizon Ark",
    role: "Late-game balanced explorer",
    price: 26000,
    stats: { hull: 220, shield: 220, energy: 210, speed: 190, handling: 1.25, cargoCapacity: 48, primarySlots: 2, secondarySlots: 2, utilitySlots: 3 },
    equipment: ["plasma-cannon", "homing-missile", "shield-booster", "energy-reactor"]
  }
];

export const shipById = Object.fromEntries(ships.map((ship) => [ship.id, ship])) as Record<string, ShipDefinition>;

export const weapons: Partial<Record<EquipmentId, WeaponDefinition>> = {
  "pulse-laser": { id: "pulse-laser", name: "Pulse Laser", damage: 16, energyCost: 5, cooldown: 0.16, range: 900, speed: 740, kind: "primary" },
  "plasma-cannon": { id: "plasma-cannon", name: "Plasma Cannon", damage: 34, energyCost: 12, cooldown: 0.42, range: 780, speed: 520, kind: "primary" },
  "homing-missile": { id: "homing-missile", name: "Homing Missile", damage: 72, energyCost: 0, cooldown: 1.15, range: 1300, speed: 360, kind: "secondary" },
  "mining-beam": { id: "mining-beam", name: "Mining Beam", damage: 0, energyCost: 7, cooldown: 0.2, range: 360, speed: 0, kind: "utility" }
};

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

export const missionTemplates: MissionDefinition[] = [
  {
    id: "courier-helion-kuro",
    title: "Courier: Helion Seals",
    type: "Courier delivery",
    originSystemId: "helion-reach",
    destinationSystemId: "kuro-belt",
    destinationStationId: "kuro-deep",
    factionId: "solar-directorate",
    description: "Carry sealed trade manifests to Kuro Deepworks.",
    reward: 850,
    cargoProvided: { "data-cores": 1 }
  },
  {
    id: "mining-kuro-iron",
    title: "Mining Contract: Iron Samples",
    type: "Mining contract",
    originSystemId: "kuro-belt",
    destinationSystemId: "kuro-belt",
    destinationStationId: "kuro-deep",
    factionId: "free-belt-union",
    description: "Extract and deliver five units of iron ore from local asteroids.",
    reward: 680,
    targetCommodityId: "iron",
    targetAmount: 5
  },
  {
    id: "bounty-ashen",
    title: "Bounty: Ashen Knife Wing",
    type: "Pirate bounty",
    originSystemId: "ashen-drift",
    destinationSystemId: "ashen-drift",
    destinationStationId: "ashen-freeport",
    factionId: "vossari-clans",
    description: "Reduce pirate pressure near Ashen Freeport.",
    reward: 1250,
    targetAmount: 2
  },
  {
    id: "escort-vantara",
    title: "Escort: Patrol Tender",
    type: "Escort convoy",
    originSystemId: "vantara",
    destinationSystemId: "helion-reach",
    destinationStationId: "helion-prime",
    factionId: "solar-directorate",
    description: "Convoy escort listing. Represented in this vertical slice as board content.",
    reward: 1100
  },
  {
    id: "salvage-mirr",
    title: "Recovery: Mirr Probe",
    type: "Recovery/salvage",
    originSystemId: "mirr-vale",
    destinationSystemId: "mirr-vale",
    destinationStationId: "mirr-lattice",
    factionId: "mirr-collective",
    description: "Locate research debris. Represented in this vertical slice as board content.",
    reward: 1450
  }
];
