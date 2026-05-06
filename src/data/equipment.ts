import type { EquipmentDefinition, EquipmentId } from "../types/game";
import { weapons } from "./ships";

export const equipmentList: EquipmentDefinition[] = [
  {
    id: "pulse-laser",
    name: "Pulse Laser",
    category: "Primary Weapon",
    role: "Reliable close-to-mid range ship weapon.",
    description: "A low-drain beam emitter tuned for steady pirate suppression and starter ship power grids.",
    effect: "Fires as the primary weapon when no heavier primary is installed.",
    displayStats: [
      { label: "Damage", value: "16" },
      { label: "Energy", value: "5" },
      { label: "Cooldown", value: "0.16s" },
      { label: "Range", value: "900m" },
      { label: "Speed", value: "740" }
    ],
    slotType: "primary",
    craftCost: { credits: 450, cargo: { electronics: 1, "energy-cells": 1 } },
    weapon: weapons["pulse-laser"]
  },
  {
    id: "plasma-cannon",
    name: "Plasma Cannon",
    category: "Primary Weapon",
    role: "Heavy primary cannon for decisive shield breaks.",
    description: "A compact plasma accelerator with higher impact per shot and a slower firing rhythm.",
    effect: "Preferred over Pulse Laser as the active primary weapon when installed.",
    displayStats: [
      { label: "Damage", value: "34" },
      { label: "Energy", value: "12" },
      { label: "Cooldown", value: "0.42s" },
      { label: "Range", value: "780m" },
      { label: "Speed", value: "520" }
    ],
    slotType: "primary",
    craftCost: { credits: 1300, cargo: { titanium: 2, "energy-cells": 2 } },
    weapon: weapons["plasma-cannon"]
  },
  {
    id: "homing-missile",
    name: "Homing Missile",
    category: "Secondary Weapon",
    role: "Lock-assisted missile rack for burst damage.",
    description: "Guided ordnance that bends toward the current pirate target while missile reserves last.",
    effect: "Enables secondary fire and consumes one missile per launch.",
    displayStats: [
      { label: "Damage", value: "72" },
      { label: "Cooldown", value: "1.15s" },
      { label: "Range", value: "1300m" },
      { label: "Speed", value: "360" }
    ],
    slotType: "secondary",
    craftCost: { credits: 900, cargo: { "ship-components": 1, "energy-cells": 1 } },
    weapon: weapons["homing-missile"]
  },
  {
    id: "mining-beam",
    name: "Mining Beam",
    category: "Utility",
    role: "Asteroid extraction tool.",
    description: "A focused cutting beam that fractures ore seams directly into the cargo hold.",
    effect: "Enables asteroid mining within 360m, draining 12 energy per second and yielding up to 2 cargo per completed cycle.",
    displayStats: [
      { label: "Range", value: "360m" },
      { label: "Drain", value: "12/s" },
      { label: "Yield", value: "2 units" }
    ],
    slotType: "utility",
    craftCost: { credits: 650, cargo: { iron: 2, "energy-cells": 1 } },
    weapon: weapons["mining-beam"]
  },
  {
    id: "shield-booster",
    name: "Shield Booster",
    category: "Defense",
    role: "Reinforced shield capacitor bank.",
    description: "Adds a dedicated reserve layer to the ship's defensive envelope.",
    effect: "Increases maximum shield capacity by 25.",
    displayStats: [{ label: "Max Shield", value: "+25" }],
    slotType: "defense",
    craftCost: { credits: 900, cargo: { "ship-components": 1, "energy-cells": 1 } },
    modifiers: { stats: { shield: 25 } }
  },
  {
    id: "cargo-expansion",
    name: "Cargo Expansion",
    category: "Engineering",
    role: "Modular hold extension.",
    description: "Rebalances internal storage racks for ore, trade goods, passengers, and mission freight.",
    effect: "Increases cargo capacity by 12.",
    displayStats: [{ label: "Cargo", value: "+12" }],
    slotType: "engineering",
    craftCost: { credits: 700, cargo: { "mechanical-parts": 2, plastics: 2 } },
    modifiers: { stats: { cargoCapacity: 12 } }
  },
  {
    id: "afterburner",
    name: "Afterburner",
    category: "Engineering",
    role: "High-output thrust overdrive.",
    description: "Injects stored plasma into the main drive for sharper escape burns and intercepts.",
    effect: "Raises afterburn speed multiplier to 2.05x and reduces afterburn drain to 50 energy per second.",
    displayStats: [
      { label: "Boost", value: "2.05x" },
      { label: "Drain", value: "50/s" }
    ],
    slotType: "engineering",
    craftCost: { credits: 760, cargo: { "energy-cells": 2, hydraulics: 1 } },
    modifiers: { afterburnerMultiplier: 2.05, afterburnerEnergyDrain: 50 }
  },
  {
    id: "scanner",
    name: "Scanner",
    category: "Utility",
    role: "Extended short-range object resolver.",
    description: "Upgrades local sweep fidelity for cargo, salvage, and nearby mineral veins.",
    effect: "Adds 60m to loot and salvage interaction ranges, and 80m to mining vein HUD detection.",
    displayStats: [
      { label: "Interact", value: "+60m" },
      { label: "Vein HUD", value: "+80m" }
    ],
    slotType: "utility",
    craftCost: { credits: 700, cargo: { electronics: 1, "data-cores": 1 } },
    modifiers: { scannerRangeBonus: 60, miningHudRangeBonus: 80 }
  },
  {
    id: "armor-plating",
    name: "Armor Plating",
    category: "Defense",
    role: "Segmented hull reinforcement.",
    description: "Bolts high-density plating around exposed frame ribs and reactor shielding.",
    effect: "Increases maximum hull integrity by 30.",
    displayStats: [{ label: "Max Hull", value: "+30" }],
    slotType: "defense",
    craftCost: { credits: 850, cargo: { titanium: 2, "mechanical-parts": 1 } },
    modifiers: { stats: { hull: 30 } }
  },
  {
    id: "energy-reactor",
    name: "Energy Reactor",
    category: "Engineering",
    role: "Auxiliary energy core.",
    description: "Smooths power delivery for weapons, shields, and sustained maneuvering.",
    effect: "Increases maximum energy by 25 and adds 4 energy regeneration per second.",
    displayStats: [
      { label: "Max Energy", value: "+25" },
      { label: "Regen", value: "+4/s" }
    ],
    slotType: "engineering",
    craftCost: { credits: 1100, cargo: { "energy-cells": 2, microchips: 1 } },
    modifiers: { stats: { energy: 25 }, energyRegenBonus: 4 }
  },
  {
    id: "repair-drone",
    name: "Repair Drone",
    category: "Utility",
    role: "Autonomous hull maintenance unit.",
    description: "A compact drone bay that dispatches repair swarms once combat pressure drops.",
    effect: "Regenerates hull at 2 integrity per second after 8 seconds without taking damage.",
    displayStats: [
      { label: "Hull Regen", value: "2/s" },
      { label: "Delay", value: "8s" }
    ],
    slotType: "utility",
    craftCost: { credits: 950, cargo: { "mechanical-parts": 1, microchips: 1 } },
    modifiers: { hullRegenPerSecond: 2, hullRegenDelay: 8 }
  },
  {
    id: "targeting-computer",
    name: "Targeting Computer",
    category: "Engineering",
    role: "Predictive fire-control processor.",
    description: "Tightens firing windows with target lead estimation and launcher timing compensation.",
    effect: "Reduces primary and secondary weapon cooldowns by 12%.",
    displayStats: [{ label: "Cooldown", value: "-12%" }],
    slotType: "engineering",
    craftCost: { credits: 820, cargo: { optics: 1, microchips: 1 } },
    modifiers: { weaponCooldownMultiplier: 0.88 }
  }
];

export const equipmentById = Object.fromEntries(equipmentList.map((item) => [item.id, item])) as Record<
  EquipmentId,
  EquipmentDefinition
>;

function titleize(id: string): string {
  return id
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function equipmentName(id: EquipmentId | string): string {
  return equipmentById[id as EquipmentId]?.name ?? titleize(id);
}
