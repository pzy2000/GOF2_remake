import { equipmentById } from "../data/equipment";
import { shipById, weapons } from "../data/ships";
import type { EquipmentId, PlayerState, ShipDefinition, ShipStats, WeaponDefinition } from "../types/game";

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
  const stats = getEffectiveShipStats(baseStats, player.equipment);
  return {
    ...player,
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
    equipment: ship.equipment
  };
}

export function installEquipment(player: PlayerState, equipmentId: EquipmentId): PlayerState {
  return normalizePlayerEquipmentStats({
    ...player,
    equipment: [...player.equipment, equipmentId]
  });
}

export function getActivePrimaryWeapon(equipment: EquipmentId[]): WeaponDefinition | undefined {
  if (equipment.includes("plasma-cannon")) return weapons["plasma-cannon"];
  if (equipment.includes("pulse-laser")) return weapons["pulse-laser"];
  return undefined;
}

export function getActiveSecondaryWeapon(equipment: EquipmentId[]): WeaponDefinition | undefined {
  return equipment.includes("homing-missile") ? weapons["homing-missile"] : undefined;
}

export function hasMiningBeam(equipment: EquipmentId[]): boolean {
  return equipment.includes("mining-beam");
}

export function getWeaponCooldown(weapon: WeaponDefinition, equipment: EquipmentId[]): number {
  return weapon.cooldown * getEquipmentEffects(equipment).weaponCooldownMultiplier;
}
