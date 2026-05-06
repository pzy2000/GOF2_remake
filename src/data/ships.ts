import type { EquipmentId, ShipDefinition, WeaponDefinition } from "../types/game";

export const ships: ShipDefinition[] = [
  {
    id: "sparrow-mk1",
    name: "Sparrow MK-I",
    role: "Starter scout",
    price: 0,
    stats: { hull: 100, shield: 80, energy: 100, speed: 170, handling: 1.35, cargoCapacity: 18, primarySlots: 1, secondarySlots: 1, utilitySlots: 1, defenseSlots: 1, engineeringSlots: 1 },
    equipment: ["pulse-laser", "homing-missile", "mining-beam"]
  },
  {
    id: "mule-lx",
    name: "Mule LX",
    role: "Cargo hauler",
    price: 6200,
    stats: { hull: 150, shield: 90, energy: 90, speed: 115, handling: 0.9, cargoCapacity: 55, primarySlots: 1, secondarySlots: 1, utilitySlots: 2, defenseSlots: 1, engineeringSlots: 2 },
    equipment: ["pulse-laser", "cargo-expansion", "scanner"]
  },
  {
    id: "raptor-v",
    name: "Raptor V",
    role: "Light fighter",
    price: 7800,
    stats: { hull: 115, shield: 120, energy: 135, speed: 210, handling: 1.75, cargoCapacity: 14, primarySlots: 2, secondarySlots: 1, utilitySlots: 1, defenseSlots: 1, engineeringSlots: 1 },
    equipment: ["pulse-laser", "plasma-cannon", "homing-missile"]
  },
  {
    id: "bastion-7",
    name: "Bastion-7",
    role: "Heavy gunship",
    price: 13800,
    stats: { hull: 250, shield: 180, energy: 150, speed: 125, handling: 0.82, cargoCapacity: 28, primarySlots: 2, secondarySlots: 2, utilitySlots: 2, defenseSlots: 2, engineeringSlots: 1 },
    equipment: ["plasma-cannon", "homing-missile", "armor-plating"]
  },
  {
    id: "horizon-ark",
    name: "Horizon Ark",
    role: "Late-game balanced explorer",
    price: 26000,
    stats: { hull: 220, shield: 220, energy: 210, speed: 190, handling: 1.25, cargoCapacity: 48, primarySlots: 2, secondarySlots: 2, utilitySlots: 3, defenseSlots: 2, engineeringSlots: 3 },
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
