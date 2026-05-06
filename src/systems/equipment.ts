import { equipmentById } from "../data/equipment";
import { shipById, weapons } from "../data/ships";
import type { CargoHold, EquipmentId, EquipmentInventory, EquipmentSlotType, PlayerState, ShipDefinition, ShipStats, WeaponDefinition } from "../types/game";

export const BASE_AFTERBURNER_MULTIPLIER = 1.88;
export const BASE_AFTERBURNER_ENERGY_DRAIN = 58;
export const BASE_ENERGY_REGEN_PER_SECOND = 16;
export const MINING_ENERGY_DRAIN_PER_SECOND = 12;
export const MINING_COOLDOWN_SECONDS = 0.08;
export const MINING_YIELD_PER_CYCLE = 2;
export const MINING_MIN_ENERGY = 5;
export const BASE_LOOT_INTERACTION_RANGE = 90;
export const BASE_SALVAGE_INTERACTION_RANGE = 110;
export const STATION_INTERACTION_RANGE = 260;
export const BASE_MINING_HUD_RANGE = 390;

export interface EquipmentRuntimeEffects {
  afterburnerMultiplier: number;
  afterburnerEnergyDrain: number;
  energyRegenPerSecond: number;
  hullRegenPerSecond: number;
  hullRegenDelay: number;
  lootInteractionRange: number;
  salvageInteractionRange: number;
  miningHudRange: number;
  weaponCooldownMultiplier: number;
}

export type EquipmentSlotUsage = Record<EquipmentSlotType, number>;

export interface EquipmentChangeResult {
  ok: boolean;
  message: string;
  player: PlayerState;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getEquipmentEffects(equipment: EquipmentId[]): EquipmentRuntimeEffects {
  return equipment.reduce<EquipmentRuntimeEffects>(
    (effects, equipmentId) => {
      const modifiers = equipmentById[equipmentId]?.modifiers;
      if (!modifiers) return effects;
      return {
        afterburnerMultiplier: modifiers.afterburnerMultiplier ?? effects.afterburnerMultiplier,
        afterburnerEnergyDrain: modifiers.afterburnerEnergyDrain ?? effects.afterburnerEnergyDrain,
        energyRegenPerSecond: effects.energyRegenPerSecond + (modifiers.energyRegenBonus ?? 0),
        hullRegenPerSecond: Math.max(effects.hullRegenPerSecond, modifiers.hullRegenPerSecond ?? 0),
        hullRegenDelay: modifiers.hullRegenDelay ?? effects.hullRegenDelay,
        lootInteractionRange: effects.lootInteractionRange + (modifiers.scannerRangeBonus ?? 0),
        salvageInteractionRange: effects.salvageInteractionRange + (modifiers.scannerRangeBonus ?? 0),
        miningHudRange: effects.miningHudRange + (modifiers.miningHudRangeBonus ?? 0),
        weaponCooldownMultiplier: effects.weaponCooldownMultiplier * (modifiers.weaponCooldownMultiplier ?? 1)
      };
    },
    {
      afterburnerMultiplier: BASE_AFTERBURNER_MULTIPLIER,
      afterburnerEnergyDrain: BASE_AFTERBURNER_ENERGY_DRAIN,
      energyRegenPerSecond: BASE_ENERGY_REGEN_PER_SECOND,
      hullRegenPerSecond: 0,
      hullRegenDelay: 8,
      lootInteractionRange: BASE_LOOT_INTERACTION_RANGE,
      salvageInteractionRange: BASE_SALVAGE_INTERACTION_RANGE,
      miningHudRange: BASE_MINING_HUD_RANGE,
      weaponCooldownMultiplier: 1
    }
  );
}

export function getShipSlotCapacity(stats: ShipStats): EquipmentSlotUsage {
  return {
    primary: stats.primarySlots,
    secondary: stats.secondarySlots,
    utility: stats.utilitySlots,
    defense: stats.defenseSlots,
    engineering: stats.engineeringSlots
  };
}

export function getEquipmentSlotUsage(equipment: EquipmentId[]): EquipmentSlotUsage {
  return equipment.reduce<EquipmentSlotUsage>(
    (usage, equipmentId) => {
      const definition = equipmentById[equipmentId];
      if (!definition) return usage;
      return {
        ...usage,
        [definition.slotType]: usage[definition.slotType] + (definition.slotSize ?? 1)
      };
    },
    { primary: 0, secondary: 0, utility: 0, defense: 0, engineering: 0 }
  );
}

export function getEffectiveShipStats(baseStats: ShipStats, equipment: EquipmentId[]): ShipStats {
  return equipment.reduce<ShipStats>(
    (stats, equipmentId) => {
      const bonus = equipmentById[equipmentId]?.modifiers?.stats;
      if (!bonus) return stats;
      return {
        ...stats,
        hull: stats.hull + (bonus.hull ?? 0),
        shield: stats.shield + (bonus.shield ?? 0),
        energy: stats.energy + (bonus.energy ?? 0),
        cargoCapacity: stats.cargoCapacity + (bonus.cargoCapacity ?? 0)
      };
    },
    { ...baseStats }
  );
}

export function normalizePlayerEquipmentStats(player: PlayerState): PlayerState {
  const baseStats = shipById[player.shipId]?.stats ?? player.stats;
  const equipment = player.equipment ?? [];
  const stats = getEffectiveShipStats(baseStats, equipment);
  return {
    ...player,
    equipment,
    equipmentInventory: player.equipmentInventory ?? {},
    ownedShips: player.ownedShips ?? [player.shipId],
    ownedShipRecords: player.ownedShipRecords ?? [],
    stats,
    hull: clamp(player.hull, 0, stats.hull),
    shield: clamp(player.shield, 0, stats.shield),
    energy: clamp(player.energy, 0, stats.energy)
  };
}

export function createPlayerShipLoadout(player: PlayerState, ship: ShipDefinition): PlayerState {
  const stats = getEffectiveShipStats(ship.stats, ship.equipment);
  return {
    ...player,
    shipId: ship.id,
    stats,
    hull: stats.hull,
    shield: stats.shield,
    energy: stats.energy,
    equipment: [...ship.equipment],
    equipmentInventory: player.equipmentInventory ?? {},
    ownedShipRecords: player.ownedShipRecords ?? []
  };
}

export function installEquipment(player: PlayerState, equipmentId: EquipmentId): PlayerState {
  return installEquipmentFromInventory(
    { ...player, equipmentInventory: { ...(player.equipmentInventory ?? {}), [equipmentId]: (player.equipmentInventory?.[equipmentId] ?? 0) + 1 } },
    equipmentId
  ).player;
}

export function addEquipmentToInventory(inventory: EquipmentInventory = {}, equipmentId: EquipmentId, amount = 1): EquipmentInventory {
  return { ...inventory, [equipmentId]: (inventory[equipmentId] ?? 0) + amount };
}

export function removeCargo(cargo: CargoHold, cost: CargoHold): CargoHold {
  const next = { ...cargo };
  for (const [commodityId, amount] of Object.entries(cost)) {
    const id = commodityId as keyof CargoHold;
    next[id] = Math.max(0, (next[id] ?? 0) - (amount ?? 0));
    if (next[id] === 0) delete next[id];
  }
  return next;
}

export function hasCraftMaterials(cargo: CargoHold, cost: CargoHold): boolean {
  return Object.entries(cost).every(([commodityId, amount]) => (cargo[commodityId as keyof CargoHold] ?? 0) >= (amount ?? 0));
}

export function formatCraftRequirement(cargo: CargoHold): string {
  return Object.entries(cargo)
    .map(([commodityId, amount]) => `${amount} ${commodityId.replace(/-/g, " ")}`)
    .join(", ");
}

export function canInstallEquipment(player: PlayerState, equipmentId: EquipmentId): { ok: boolean; message: string } {
  const definition = equipmentById[equipmentId];
  if (!definition) return { ok: false, message: "Unknown equipment." };
  if (player.equipment.includes(equipmentId)) return { ok: false, message: "Equipment already installed." };
  if ((player.equipmentInventory?.[equipmentId] ?? 0) <= 0) return { ok: false, message: "Equipment is not in inventory." };
  if (definition.installableOn && !definition.installableOn.includes(player.shipId)) return { ok: false, message: "Equipment cannot be installed on this ship." };
  const usage = getEquipmentSlotUsage(player.equipment);
  const capacity = getShipSlotCapacity(player.stats);
  const nextUsage = usage[definition.slotType] + (definition.slotSize ?? 1);
  if (nextUsage > capacity[definition.slotType]) return { ok: false, message: `No ${definition.slotType} slot available.` };
  return { ok: true, message: "Equipment can be installed." };
}

export function installEquipmentFromInventory(player: PlayerState, equipmentId: EquipmentId): EquipmentChangeResult {
  const availability = canInstallEquipment(player, equipmentId);
  if (!availability.ok) return { ok: false, message: availability.message, player };
  const inventory = { ...(player.equipmentInventory ?? {}) };
  inventory[equipmentId] = Math.max(0, (inventory[equipmentId] ?? 0) - 1);
  return {
    ok: true,
    message: `Installed ${equipmentById[equipmentId].name}.`,
    player: normalizePlayerEquipmentStats({
      ...player,
      equipment: [...player.equipment, equipmentId],
      equipmentInventory: inventory
    })
  };
}

export function uninstallEquipmentToInventory(player: PlayerState, equipmentId: EquipmentId): EquipmentChangeResult {
  if (!player.equipment.includes(equipmentId)) return { ok: false, message: "Equipment is not installed.", player };
  const nextEquipment = [...player.equipment];
  nextEquipment.splice(nextEquipment.indexOf(equipmentId), 1);
  return {
    ok: true,
    message: `Uninstalled ${equipmentById[equipmentId].name}.`,
    player: normalizePlayerEquipmentStats({
      ...player,
      equipment: nextEquipment,
      equipmentInventory: addEquipmentToInventory(player.equipmentInventory, equipmentId)
    })
  };
}

export function getActivePrimaryWeapon(equipment: EquipmentId[]): WeaponDefinition | undefined {
  const primary = equipment.find((equipmentId) => equipmentById[equipmentId]?.weapon?.kind === "primary");
  if (primary) return weapons[primary];
  return undefined;
}

export function getActiveSecondaryWeapon(equipment: EquipmentId[]): WeaponDefinition | undefined {
  const secondary = equipment.find((equipmentId) => equipmentById[equipmentId]?.weapon?.kind === "secondary");
  return secondary ? weapons[secondary] : undefined;
}

export function hasMiningBeam(equipment: EquipmentId[]): boolean {
  return equipment.some((equipmentId) => equipmentId === "mining-beam" && equipmentById[equipmentId]?.slotType === "utility");
}

export function getWeaponCooldown(weapon: WeaponDefinition, equipment: EquipmentId[]): number {
  return weapon.cooldown * getEquipmentEffects(equipment).weaponCooldownMultiplier;
}
