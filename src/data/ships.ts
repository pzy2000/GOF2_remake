import type { EquipmentId, ShipDefinition, WeaponDefinition } from "../types/game";

export const ships: ShipDefinition[] = [
  {
    id: "sparrow-mk1",
    name: "Sparrow MK-I",
    role: "Starter scout",
    price: 0,
    career: "starter",
    stats: { hull: 100, shield: 80, energy: 100, speed: 170, handling: 1.35, cargoCapacity: 18, primarySlots: 1, secondarySlots: 1, utilitySlots: 1, defenseSlots: 1, engineeringSlots: 1 },
    equipment: ["pulse-laser", "homing-missile", "mining-beam"]
  },
  {
    id: "mule-lx",
    name: "Mule LX",
    role: "Cargo hauler",
    price: 6200,
    career: "hauler",
    stats: { hull: 150, shield: 90, energy: 90, speed: 115, handling: 0.9, cargoCapacity: 55, primarySlots: 1, secondarySlots: 1, utilitySlots: 2, defenseSlots: 1, engineeringSlots: 2 },
    equipment: ["pulse-laser", "cargo-expansion", "scanner"]
  },
  {
    id: "prospector-rig",
    name: "Prospector Rig",
    role: "Industrial mining skiff",
    price: 11200,
    career: "miner",
    stats: { hull: 165, shield: 105, energy: 125, speed: 132, handling: 0.95, cargoCapacity: 42, primarySlots: 1, secondarySlots: 1, utilitySlots: 2, defenseSlots: 1, engineeringSlots: 2 },
    equipment: ["pulse-laser", "industrial-mining-beam", "ore-processor", "scanner"],
    trait: {
      name: "Oreline Stabilizers",
      description: "Mining progress +20% and mining energy drain -15%.",
      modifiers: { miningProgressMultiplier: 1.2, miningEnergyDrainMultiplier: 0.85 }
    },
    purchaseRequirement: { stationArchetypes: ["Mining Station"], minTechLevel: 3 }
  },
  {
    id: "veil-runner",
    name: "Veil Runner",
    role: "Low-signature smuggling courier",
    price: 9800,
    career: "smuggler",
    stats: { hull: 105, shield: 95, energy: 135, speed: 225, handling: 1.65, cargoCapacity: 24, primarySlots: 1, secondarySlots: 1, utilitySlots: 2, defenseSlots: 1, engineeringSlots: 2 },
    equipment: ["pulse-laser", "afterburner", "shielded-holds"],
    trait: {
      name: "Cold Registry",
      description: "Contraband scan progress x0.70.",
      modifiers: { contrabandScanProgressMultiplier: 0.7 }
    },
    purchaseRequirement: { stationArchetypes: ["Pirate Black Market", "Frontier Port"], minTechLevel: 3 }
  },
  {
    id: "talon-s",
    name: "Talon-S",
    role: "Strike fighter",
    price: 10600,
    career: "fighter",
    stats: { hull: 125, shield: 125, energy: 145, speed: 215, handling: 1.72, cargoCapacity: 16, primarySlots: 2, secondarySlots: 2, utilitySlots: 1, defenseSlots: 1, engineeringSlots: 1 },
    equipment: ["pulse-laser", "plasma-cannon", "homing-missile", "targeting-computer"],
    trait: {
      name: "Overtuned Bus",
      description: "Weapon damage +8% and weapon energy cost +6%.",
      modifiers: { weaponDamageMultiplier: 1.08, weaponEnergyCostMultiplier: 1.06 }
    },
    purchaseRequirement: { stationArchetypes: ["Military Outpost"], minTechLevel: 3 }
  },
  {
    id: "wayfarer-x",
    name: "Wayfarer-X",
    role: "Deep signal explorer",
    price: 16400,
    career: "explorer",
    stats: { hull: 145, shield: 150, energy: 165, speed: 188, handling: 1.28, cargoCapacity: 32, primarySlots: 1, secondarySlots: 1, utilitySlots: 3, defenseSlots: 1, engineeringSlots: 2 },
    equipment: ["pulse-laser", "survey-array", "scanner", "energy-reactor"],
    trait: {
      name: "Deep Survey Spine",
      description: "Quiet Signal scan rate +12% and loot/salvage range +60m.",
      modifiers: { signalScanRateMultiplier: 1.12, scannerRangeBonus: 60 }
    },
    purchaseRequirement: { stationArchetypes: ["Research Station"], minTechLevel: 4, requiredUnlockedBlueprintIds: ["survey-array"] }
  },
  {
    id: "raptor-v",
    name: "Raptor V",
    role: "Light fighter",
    price: 7800,
    career: "fighter",
    stats: { hull: 115, shield: 120, energy: 135, speed: 210, handling: 1.75, cargoCapacity: 14, primarySlots: 2, secondarySlots: 1, utilitySlots: 1, defenseSlots: 1, engineeringSlots: 1 },
    equipment: ["pulse-laser", "plasma-cannon", "homing-missile"]
  },
  {
    id: "bastion-7",
    name: "Bastion-7",
    role: "Heavy gunship",
    price: 13800,
    career: "gunship",
    stats: { hull: 250, shield: 180, energy: 150, speed: 125, handling: 0.82, cargoCapacity: 28, primarySlots: 2, secondarySlots: 2, utilitySlots: 2, defenseSlots: 2, engineeringSlots: 1 },
    equipment: ["plasma-cannon", "homing-missile", "armor-plating"],
    purchaseRequirement: { minTechLevel: 3 }
  },
  {
    id: "horizon-ark",
    name: "Horizon Ark",
    role: "Late-game balanced explorer",
    price: 26000,
    career: "explorer",
    stats: { hull: 220, shield: 220, energy: 210, speed: 190, handling: 1.25, cargoCapacity: 48, primarySlots: 2, secondarySlots: 2, utilitySlots: 3, defenseSlots: 2, engineeringSlots: 3 },
    equipment: ["plasma-cannon", "homing-missile", "shield-booster", "energy-reactor"],
    trait: {
      name: "Horizon Survey Suite",
      description: "Quiet Signal scan range +80m, scan rate +15%, and loot/salvage range +80m.",
      modifiers: { scannerRangeBonus: 80, signalScanRangeBonus: 80, signalScanRateMultiplier: 1.15 }
    },
    purchaseRequirement: { minTechLevel: 5 }
  }
];

export const shipById = Object.fromEntries(ships.map((ship) => [ship.id, ship])) as Record<string, ShipDefinition>;

export const weapons: Partial<Record<EquipmentId, WeaponDefinition>> = {
  "pulse-laser": { id: "pulse-laser", name: "Pulse Laser", damage: 16, energyCost: 5, cooldown: 0.16, range: 900, speed: 740, kind: "primary" },
  "plasma-cannon": { id: "plasma-cannon", name: "Plasma Cannon", damage: 34, energyCost: 12, cooldown: 0.42, range: 780, speed: 520, kind: "primary" },
  railgun: { id: "railgun", name: "Railgun", damage: 52, energyCost: 18, cooldown: 0.65, range: 1050, speed: 900, kind: "primary" },
  "parallax-lance": { id: "parallax-lance", name: "Parallax Lance", damage: 96, energyCost: 30, cooldown: 0.52, range: 1500, speed: 1100, kind: "primary" },
  "homing-missile": { id: "homing-missile", name: "Homing Missile", damage: 72, energyCost: 0, cooldown: 1.15, range: 1300, speed: 360, kind: "secondary" },
  "torpedo-rack": { id: "torpedo-rack", name: "Torpedo Rack", damage: 112, energyCost: 0, cooldown: 1.8, range: 1450, speed: 300, kind: "secondary" },
  "moth-choir-torpedo": { id: "moth-choir-torpedo", name: "Moth Choir Torpedo", damage: 240, energyCost: 0, cooldown: 2.3, range: 1800, speed: 340, kind: "secondary" },
  "mining-beam": { id: "mining-beam", name: "Mining Beam", damage: 0, energyCost: 7, cooldown: 0.2, range: 360, speed: 0, kind: "utility" },
  "industrial-mining-beam": { id: "industrial-mining-beam", name: "Industrial Mining Beam", damage: 0, energyCost: 10, cooldown: 0.16, range: 480, speed: 0, kind: "utility" }
};
