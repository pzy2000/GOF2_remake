import type { BlueprintDefinition, BlueprintPath, EquipmentDefinition, EquipmentId } from "../types/game";
import { weapons } from "./ships";

export const equipmentList: EquipmentDefinition[] = [
  {
    id: "pulse-laser",
    name: "Pulse Laser",
    techLevel: 1,
    marketPrice: 950,
    marketStock: 5,
    dropWeight: 16,
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
    techLevel: 2,
    marketPrice: 2400,
    marketStock: 3,
    dropWeight: 8,
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
    id: "railgun",
    name: "Railgun",
    techLevel: 4,
    marketPrice: 8200,
    marketStock: 1,
    dropWeight: 2,
    category: "Primary Weapon",
    role: "Long-range armor puncher for fighter and gunship builds.",
    description: "A magnetic accelerator that trades energy efficiency for clean impact at standoff range.",
    effect: "Preferred over lighter primary weapons when installed.",
    displayStats: [
      { label: "Damage", value: "52" },
      { label: "Energy", value: "18" },
      { label: "Cooldown", value: "0.65s" },
      { label: "Range", value: "1050m" },
      { label: "Speed", value: "900" }
    ],
    slotType: "primary",
    craftCost: { credits: 4400, cargo: { "ship-components": 2, "data-cores": 1, titanium: 2 } },
    weapon: weapons.railgun
  },
  {
    id: "homing-missile",
    name: "Homing Missile",
    techLevel: 1,
    marketPrice: 1650,
    marketStock: 4,
    dropWeight: 12,
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
    id: "torpedo-rack",
    name: "Torpedo Rack",
    techLevel: 3,
    marketPrice: 5200,
    marketStock: 2,
    dropWeight: 4,
    category: "Secondary Weapon",
    role: "Heavy secondary rack for slow, high-impact ship kills.",
    description: "A reinforced launcher that fires heavier guided torpedoes from the standard missile reserve.",
    effect: "Replaces the Homing Missile as the active secondary weapon when installed.",
    displayStats: [
      { label: "Damage", value: "112" },
      { label: "Cooldown", value: "1.80s" },
      { label: "Range", value: "1450m" },
      { label: "Speed", value: "300" }
    ],
    slotType: "secondary",
    craftCost: { credits: 2800, cargo: { "ship-components": 2, chemicals: 1, "energy-cells": 2 } },
    weapon: weapons["torpedo-rack"]
  },
  {
    id: "mining-beam",
    name: "Mining Beam",
    techLevel: 1,
    marketPrice: 1200,
    marketStock: 4,
    dropWeight: 8,
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
    id: "industrial-mining-beam",
    name: "Industrial Mining Beam",
    techLevel: 3,
    marketPrice: 3900,
    marketStock: 2,
    dropWeight: 4,
    category: "Utility",
    role: "High-throughput asteroid extraction beam.",
    description: "A reinforced cutter built for mining skiffs and cargo captains who want fewer passes per vein.",
    effect: "Mines within 480m and increases mining progress by 15%.",
    displayStats: [
      { label: "Range", value: "480m" },
      { label: "Progress", value: "+15%" },
      { label: "Drain", value: "10/s" }
    ],
    slotType: "utility",
    craftCost: { credits: 2100, cargo: { titanium: 2, iron: 4, "energy-cells": 2 } },
    modifiers: { miningProgressMultiplier: 1.15, miningHudRangeBonus: 60 },
    weapon: weapons["industrial-mining-beam"]
  },
  {
    id: "shield-booster",
    name: "Shield Booster",
    techLevel: 2,
    marketPrice: 2100,
    marketStock: 3,
    dropWeight: 8,
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
    id: "shield-matrix",
    name: "Shield Matrix",
    techLevel: 4,
    marketPrice: 7600,
    marketStock: 1,
    dropWeight: 2,
    category: "Defense",
    role: "Military shield lattice for heavy combat routes.",
    description: "Distributed emitters hold a wider defensive envelope around bulky hulls and weapon pylons.",
    effect: "Increases maximum shield capacity by 55.",
    displayStats: [{ label: "Max Shield", value: "+55" }],
    slotType: "defense",
    craftCost: { credits: 3900, cargo: { "ship-components": 2, microchips: 2, "energy-cells": 2 } },
    modifiers: { stats: { shield: 55 } }
  },
  {
    id: "cargo-expansion",
    name: "Cargo Expansion",
    techLevel: 1,
    marketPrice: 1350,
    marketStock: 5,
    dropWeight: 10,
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
    id: "ore-processor",
    name: "Ore Processor",
    techLevel: 3,
    marketPrice: 3600,
    marketStock: 2,
    dropWeight: 4,
    category: "Engineering",
    role: "Onboard refinery for miner builds.",
    description: "Separates low-value slag during extraction so each completed mining cycle keeps more usable ore.",
    effect: "Adds 8 cargo capacity and +1 ore yield per completed mining cycle.",
    displayStats: [
      { label: "Cargo", value: "+8" },
      { label: "Mining Yield", value: "+1" }
    ],
    slotType: "engineering",
    craftCost: { credits: 1900, cargo: { iron: 4, titanium: 2, "mechanical-parts": 2 } },
    modifiers: { stats: { cargoCapacity: 8 }, miningYieldBonus: 1 }
  },
  {
    id: "shielded-holds",
    name: "Shielded Holds",
    techLevel: 3,
    marketPrice: 4100,
    marketStock: 2,
    dropWeight: 3,
    category: "Engineering",
    role: "Masked cargo bays for smuggling builds.",
    description: "Layered baffles and false inventory lanes slow down routine contraband sweeps.",
    effect: "Adds 10 cargo capacity and slows contraband scan progress to 80%.",
    displayStats: [
      { label: "Cargo", value: "+10" },
      { label: "Contraband Scan", value: "x0.80" }
    ],
    slotType: "engineering",
    craftCost: { credits: 2200, cargo: { "mechanical-parts": 2, plastics: 3, microchips: 1 } },
    modifiers: { stats: { cargoCapacity: 10 }, contrabandScanProgressMultiplier: 0.8 }
  },
  {
    id: "afterburner",
    name: "Afterburner",
    techLevel: 2,
    marketPrice: 1800,
    marketStock: 3,
    dropWeight: 8,
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
    techLevel: 2,
    marketPrice: 1600,
    marketStock: 3,
    dropWeight: 8,
    category: "Utility",
    role: "Extended short-range object resolver.",
    description: "Upgrades local sweep fidelity for cargo, salvage, and nearby mineral veins.",
    effect: "Adds 60m to loot and salvage interaction ranges, and 80m to mining vein HUD detection.",
    displayStats: [
      { label: "Interact", value: "+60m" },
      { label: "Vein HUD", value: "+80m" },
      { label: "Quiet Signal", value: "+90m / +/-4" }
    ],
    slotType: "utility",
    craftCost: { credits: 700, cargo: { electronics: 1, "data-cores": 1 } },
    modifiers: { scannerRangeBonus: 60, miningHudRangeBonus: 80, signalScanRangeBonus: 90, signalScanBandBonus: 4 }
  },
  {
    id: "survey-array",
    name: "Survey Array",
    techLevel: 3,
    marketPrice: 4200,
    marketStock: 2,
    dropWeight: 4,
    category: "Utility",
    role: "Explorer-grade signal and mineral resolver.",
    description: "A wide-band sensor spine for captains who want cleaner scans before committing to a route.",
    effect: "Adds 120m to loot and salvage interaction ranges, and 150m to mining vein HUD detection.",
    displayStats: [
      { label: "Interact", value: "+120m" },
      { label: "Vein HUD", value: "+150m" },
      { label: "Quiet Signal", value: "+140m / +/-7 / +10%" }
    ],
    slotType: "utility",
    craftCost: { credits: 2100, cargo: { optics: 2, "data-cores": 1, electronics: 1 } },
    modifiers: { scannerRangeBonus: 120, miningHudRangeBonus: 150, signalScanRangeBonus: 140, signalScanBandBonus: 7, signalScanRateMultiplier: 1.1 }
  },
  {
    id: "decoy-transponder",
    name: "Decoy Transponder",
    techLevel: 4,
    marketPrice: 6900,
    marketStock: 1,
    dropWeight: 2,
    category: "Utility",
    role: "Spoofed registry emitter for smuggling routes.",
    description: "Broadcasts a clean cargo identity long enough to stretch patrol scan windows.",
    effect: "Slows contraband scan progress to 65% and reduces contraband fines by 15%.",
    displayStats: [
      { label: "Contraband Scan", value: "x0.65" },
      { label: "Fine", value: "x0.85" }
    ],
    slotType: "utility",
    craftCost: { credits: 3600, cargo: { "data-cores": 1, microchips: 2, optics: 1 } },
    modifiers: { contrabandScanProgressMultiplier: 0.65, contrabandFineMultiplier: 0.85 }
  },
  {
    id: "survey-lab",
    name: "Survey Lab",
    techLevel: 4,
    marketPrice: 7200,
    marketStock: 1,
    dropWeight: 2,
    category: "Utility",
    role: "Deep exploration analysis suite.",
    description: "A compact lab that resolves weak signal harmonics and expands recovery sweeps around quiet sites.",
    effect: "Adds 90m to loot and salvage ranges, improves Quiet Signal range/band, and accelerates scans by 18%.",
    displayStats: [
      { label: "Interact", value: "+90m" },
      { label: "Vein HUD", value: "+70m" },
      { label: "Quiet Signal", value: "+170m / +/-8 / +18%" }
    ],
    slotType: "utility",
    craftCost: { credits: 3800, cargo: { optics: 3, "data-cores": 2, electronics: 2 } },
    modifiers: { scannerRangeBonus: 90, miningHudRangeBonus: 70, signalScanRangeBonus: 170, signalScanBandBonus: 8, signalScanRateMultiplier: 1.18 }
  },
  {
    id: "armor-plating",
    name: "Armor Plating",
    techLevel: 2,
    marketPrice: 1900,
    marketStock: 3,
    dropWeight: 8,
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
    techLevel: 3,
    marketPrice: 3500,
    marketStock: 2,
    dropWeight: 5,
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
    id: "quantum-reactor",
    name: "Quantum Reactor",
    techLevel: 5,
    marketPrice: 12800,
    marketStock: 1,
    dropWeight: 1,
    category: "Engineering",
    role: "Late-game power core for sustained weapon builds.",
    description: "A compact high-energy reactor tuned for expensive weapons and long afterburner windows.",
    effect: "Increases maximum energy by 55, adds 8 energy regeneration per second, and reduces weapon cooldowns by 8%.",
    displayStats: [
      { label: "Max Energy", value: "+55" },
      { label: "Regen", value: "+8/s" },
      { label: "Cooldown", value: "-8%" }
    ],
    slotType: "engineering",
    craftCost: { credits: 6500, cargo: { "data-cores": 2, voidglass: 1, "energy-cells": 3 } },
    modifiers: { stats: { energy: 55 }, energyRegenBonus: 8, weaponCooldownMultiplier: 0.92 }
  },
  {
    id: "repair-drone",
    name: "Repair Drone",
    techLevel: 3,
    marketPrice: 3000,
    marketStock: 2,
    dropWeight: 5,
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
    techLevel: 3,
    marketPrice: 2900,
    marketStock: 2,
    dropWeight: 6,
    category: "Engineering",
    role: "Predictive fire-control processor.",
    description: "Tightens firing windows with target lead estimation and launcher timing compensation.",
    effect: "Reduces primary and secondary weapon cooldowns by 12%.",
    displayStats: [{ label: "Cooldown", value: "-12%" }],
    slotType: "engineering",
    craftCost: { credits: 820, cargo: { optics: 1, microchips: 1 } },
    modifiers: { weaponCooldownMultiplier: 0.88 }
  },
  {
    id: "weapon-amplifier",
    name: "Weapon Amplifier",
    techLevel: 4,
    marketPrice: 7800,
    marketStock: 1,
    dropWeight: 2,
    category: "Engineering",
    role: "High-output fire-control bus for combat builds.",
    description: "Overdrives primary and secondary weapon feeds for stronger impacts at the cost of extra energy draw.",
    effect: "Increases weapon damage by 10% and weapon energy cost by 12%.",
    displayStats: [
      { label: "Weapon Damage", value: "+10%" },
      { label: "Weapon Energy", value: "+12%" }
    ],
    slotType: "engineering",
    craftCost: { credits: 4200, cargo: { "ship-components": 2, microchips: 2, "energy-cells": 3 } },
    modifiers: { weaponDamageMultiplier: 1.1, weaponEnergyCostMultiplier: 1.12 }
  },
  {
    id: "echo-nullifier",
    name: "Echo Nullifier",
    techLevel: 5,
    marketPrice: 9800,
    marketStock: 0,
    dropWeight: 0,
    category: "Utility",
    role: "Story-grade counter-listener for Glass Wake echoes.",
    description: "A tuned null-field array built from the Listener Scar core, designed to desynchronize name-bearing drone carriers.",
    effect: "Adds 100m to loot, salvage, and mining signal awareness, extends Echo Lock range by 120m, and accelerates Echo Lock by 25%.",
    displayStats: [
      { label: "Interact", value: "+100m" },
      { label: "Vein HUD", value: "+100m" },
      { label: "Quiet Signal", value: "+130m / +/-6 / +25%" },
      { label: "Echo Lock", value: "+120m / +25%" }
    ],
    slotType: "utility",
    craftCost: { credits: 4800, cargo: { "data-cores": 2, voidglass: 2, microchips: 2 } },
    modifiers: { scannerRangeBonus: 100, miningHudRangeBonus: 100, signalScanRangeBonus: 130, signalScanBandBonus: 6, signalScanRateMultiplier: 1.25, echoLockRangeBonus: 120, echoLockRateMultiplier: 1.25 }
  },
  {
    id: "relic-cartographer",
    name: "Relic Cartographer",
    techLevel: 5,
    marketPrice: 11800,
    marketStock: 0,
    dropWeight: 0,
    category: "Utility",
    role: "Explorer-grade coordinate resolver for deep Quiet Signals.",
    description: "A relic-mapped survey core that overlays recovered coordinates onto live scan harmonics.",
    effect: "Extends Quiet Signal scan range by 190m, widens scan bands by 10 points on each side, and accelerates Quiet Signal scans by 35%.",
    displayStats: [
      { label: "Quiet Signal", value: "+190m / +/-10 / +35%" },
      { label: "Interact", value: "+80m" },
      { label: "Vein HUD", value: "+120m" }
    ],
    slotType: "utility",
    craftCost: { credits: 5600, cargo: { voidglass: 2, "data-cores": 2, optics: 2 } },
    modifiers: { scannerRangeBonus: 80, miningHudRangeBonus: 120, signalScanRangeBonus: 190, signalScanBandBonus: 10, signalScanRateMultiplier: 1.35 }
  }
];

export const equipmentById = Object.fromEntries(equipmentList.map((item) => [item.id, item])) as Record<
  EquipmentId,
  EquipmentDefinition
>;

export const blueprintPathLabels: Record<BlueprintPath, string> = {
  combat: "Combat Systems",
  defense: "Defense Systems",
  exploration: "Exploration Systems",
  engineering: "Engineering & Trade"
};

export const blueprintDefinitions: BlueprintDefinition[] = [
  { equipmentId: "pulse-laser", path: "combat", tier: 1, unlockCost: { credits: 0 }, starterUnlocked: true },
  { equipmentId: "homing-missile", path: "combat", tier: 1, unlockCost: { credits: 0 }, starterUnlocked: true },
  { equipmentId: "plasma-cannon", path: "combat", tier: 2, prerequisiteEquipmentIds: ["pulse-laser"], unlockCost: { credits: 350 } },
  { equipmentId: "torpedo-rack", path: "combat", tier: 3, prerequisiteEquipmentIds: ["homing-missile"], unlockCost: { credits: 800 } },
  { equipmentId: "railgun", path: "combat", tier: 4, prerequisiteEquipmentIds: ["plasma-cannon"], unlockCost: { credits: 1400 } },
  { equipmentId: "weapon-amplifier", path: "combat", tier: 4, prerequisiteEquipmentIds: ["plasma-cannon", "targeting-computer"], unlockCost: { credits: 1600 } },
  { equipmentId: "shield-booster", path: "defense", tier: 1, unlockCost: { credits: 0 }, starterUnlocked: true },
  { equipmentId: "armor-plating", path: "defense", tier: 1, unlockCost: { credits: 0 }, starterUnlocked: true },
  { equipmentId: "repair-drone", path: "defense", tier: 2, prerequisiteEquipmentIds: ["armor-plating"], unlockCost: { credits: 520 } },
  { equipmentId: "shield-matrix", path: "defense", tier: 3, prerequisiteEquipmentIds: ["shield-booster"], unlockCost: { credits: 1200 } },
  { equipmentId: "mining-beam", path: "exploration", tier: 1, unlockCost: { credits: 0 }, starterUnlocked: true },
  { equipmentId: "scanner", path: "exploration", tier: 1, unlockCost: { credits: 0 }, starterUnlocked: true },
  { equipmentId: "industrial-mining-beam", path: "exploration", tier: 2, prerequisiteEquipmentIds: ["mining-beam"], unlockCost: { credits: 640 } },
  { equipmentId: "ore-processor", path: "exploration", tier: 3, prerequisiteEquipmentIds: ["industrial-mining-beam"], unlockCost: { credits: 920 } },
  { equipmentId: "survey-array", path: "exploration", tier: 2, prerequisiteEquipmentIds: ["scanner"], unlockCost: { credits: 760 } },
  { equipmentId: "survey-lab", path: "exploration", tier: 3, prerequisiteEquipmentIds: ["survey-array"], unlockCost: { credits: 1220 } },
  { equipmentId: "echo-nullifier", path: "exploration", tier: 4, prerequisiteEquipmentIds: ["survey-array"], unlockCost: { credits: 0 }, rewardOnly: true },
  { equipmentId: "relic-cartographer", path: "exploration", tier: 5, prerequisiteEquipmentIds: ["survey-array"], unlockCost: { credits: 0 }, rewardOnly: true },
  { equipmentId: "cargo-expansion", path: "engineering", tier: 1, unlockCost: { credits: 0 }, starterUnlocked: true },
  { equipmentId: "shielded-holds", path: "engineering", tier: 2, prerequisiteEquipmentIds: ["cargo-expansion"], unlockCost: { credits: 700 } },
  { equipmentId: "decoy-transponder", path: "engineering", tier: 3, prerequisiteEquipmentIds: ["shielded-holds"], unlockCost: { credits: 1180 } },
  { equipmentId: "afterburner", path: "engineering", tier: 2, prerequisiteEquipmentIds: ["cargo-expansion"], unlockCost: { credits: 420 } },
  { equipmentId: "energy-reactor", path: "engineering", tier: 2, prerequisiteEquipmentIds: ["cargo-expansion"], unlockCost: { credits: 620 } },
  { equipmentId: "targeting-computer", path: "engineering", tier: 3, prerequisiteEquipmentIds: ["energy-reactor"], unlockCost: { credits: 900 } },
  { equipmentId: "quantum-reactor", path: "engineering", tier: 4, prerequisiteEquipmentIds: ["energy-reactor", "targeting-computer"], unlockCost: { credits: 1800 } }
];

export const blueprintByEquipmentId = Object.fromEntries(blueprintDefinitions.map((item) => [item.equipmentId, item])) as Record<
  EquipmentId,
  BlueprintDefinition
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
