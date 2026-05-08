import { blueprintByEquipmentId, blueprintDefinitions, equipmentById } from "../data/equipment";
import { shipById, weapons } from "../data/ships";
import type { BlueprintDefinition, CargoHold, EquipmentId, EquipmentInventory, EquipmentSlotType, PlayerState, ShipDefinition, ShipStats, WeaponDefinition } from "../types/game";

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
  signalScanRangeBonus: number;
  signalScanBandBonus: number;
  signalScanRateMultiplier: number;
  weaponCooldownMultiplier: number;
  echoLockRangeBonus: number;
  echoLockRateMultiplier: number;
}

export type EquipmentSlotUsage = Record<EquipmentSlotType, number>;

export interface EquipmentChangeResult {
  ok: boolean;
  message: string;
  player: PlayerState;
}

export interface BlueprintUnlockResult {
  ok: boolean;
  message: string;
  player: PlayerState;
}

export interface EquipmentComparisonLine {
  label: string;
  before: string;
  after: string;
  tone: "positive" | "negative" | "neutral";
}

export interface EquipmentComparison {
  equipmentId: EquipmentId;
  mode: "installed" | "install" | "replace-preview" | "blocked";
  canInstall: boolean;
  installMessage: string;
  sameSlotInstalled: EquipmentId[];
  slotType: EquipmentSlotType;
  slotUsage: number;
  slotCapacity: number;
  statLines: EquipmentComparisonLine[];
  weaponLines: EquipmentComparisonLine[];
  utilityLines: EquipmentComparisonLine[];
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
        signalScanRangeBonus: effects.signalScanRangeBonus + (modifiers.signalScanRangeBonus ?? 0),
        signalScanBandBonus: effects.signalScanBandBonus + (modifiers.signalScanBandBonus ?? 0),
        signalScanRateMultiplier: effects.signalScanRateMultiplier * (modifiers.signalScanRateMultiplier ?? 1),
        weaponCooldownMultiplier: effects.weaponCooldownMultiplier * (modifiers.weaponCooldownMultiplier ?? 1),
        echoLockRangeBonus: effects.echoLockRangeBonus + (modifiers.echoLockRangeBonus ?? 0),
        echoLockRateMultiplier: effects.echoLockRateMultiplier * (modifiers.echoLockRateMultiplier ?? 1)
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
      signalScanRangeBonus: 0,
      signalScanBandBonus: 0,
      signalScanRateMultiplier: 1,
      weaponCooldownMultiplier: 1,
      echoLockRangeBonus: 0,
      echoLockRateMultiplier: 1
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

export function getStarterBlueprintIds(): EquipmentId[] {
  return blueprintDefinitions.filter((blueprint) => blueprint.starterUnlocked).map((blueprint) => blueprint.equipmentId);
}

export function normalizeUnlockedBlueprintIds(ids: EquipmentId[] | undefined): EquipmentId[] {
  const knownBlueprintIds = new Set(blueprintDefinitions.map((blueprint) => blueprint.equipmentId));
  return Array.from(new Set([...getStarterBlueprintIds(), ...(ids ?? [])])).filter((id) => knownBlueprintIds.has(id));
}

export function isBlueprintUnlocked(player: PlayerState, equipmentId: EquipmentId): boolean {
  return normalizeUnlockedBlueprintIds(player.unlockedBlueprintIds).includes(equipmentId);
}

export function normalizePlayerEquipmentStats(player: PlayerState): PlayerState {
  const baseStats = shipById[player.shipId]?.stats ?? player.stats;
  const equipment = player.equipment ?? [];
  const stats = getEffectiveShipStats(baseStats, equipment);
  return {
    ...player,
    equipment,
    equipmentInventory: player.equipmentInventory ?? {},
    unlockedBlueprintIds: normalizeUnlockedBlueprintIds(player.unlockedBlueprintIds),
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
    unlockedBlueprintIds: normalizeUnlockedBlueprintIds(player.unlockedBlueprintIds),
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

export function canUnlockBlueprint(player: PlayerState, equipmentId: EquipmentId): { ok: boolean; message: string } {
  const blueprint = blueprintByEquipmentId[equipmentId];
  if (!blueprint) return { ok: false, message: "No blueprint research entry." };
  if (blueprint.rewardOnly) return { ok: false, message: "Blueprint unlocks through story rewards." };
  const unlocked = normalizeUnlockedBlueprintIds(player.unlockedBlueprintIds);
  if (unlocked.includes(equipmentId)) return { ok: false, message: "Blueprint already unlocked." };
  const missingPrerequisites = (blueprint.prerequisiteEquipmentIds ?? []).filter((id) => !unlocked.includes(id));
  if (missingPrerequisites.length > 0) return { ok: false, message: `Requires ${missingPrerequisites.map((id) => equipmentById[id].name).join(", ")} blueprint.` };
  if (player.credits < blueprint.unlockCost.credits) return { ok: false, message: "Not enough credits to unlock blueprint." };
  if (blueprint.unlockCost.cargo && !hasCraftMaterials(player.cargo, blueprint.unlockCost.cargo)) return { ok: false, message: "Missing research materials." };
  return { ok: true, message: "Blueprint can be unlocked." };
}

export function unlockBlueprint(player: PlayerState, equipmentId: EquipmentId): BlueprintUnlockResult {
  const availability = canUnlockBlueprint(player, equipmentId);
  if (!availability.ok) return { ok: false, message: availability.message, player: normalizePlayerEquipmentStats(player) };
  const blueprint = blueprintByEquipmentId[equipmentId];
  return {
    ok: true,
    message: `Unlocked ${equipmentById[equipmentId].name} blueprint.`,
    player: normalizePlayerEquipmentStats({
      ...player,
      credits: player.credits - blueprint.unlockCost.credits,
      cargo: blueprint.unlockCost.cargo ? removeCargo(player.cargo, blueprint.unlockCost.cargo) : player.cargo,
      unlockedBlueprintIds: [...normalizeUnlockedBlueprintIds(player.unlockedBlueprintIds), equipmentId]
    })
  };
}

export function isBlueprintVisibleToPlayer(blueprint: BlueprintDefinition, player: PlayerState): boolean {
  return !blueprint.rewardOnly || isBlueprintUnlocked(player, blueprint.equipmentId);
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

function formatComparisonValue(value: number, suffix = ""): string {
  const rounded = Math.abs(value) >= 10 ? Math.round(value).toString() : Number(value.toFixed(2)).toString();
  return `${rounded}${suffix}`;
}

function comparisonTone(before: number, after: number, higherIsBetter = true): EquipmentComparisonLine["tone"] {
  if (Math.abs(after - before) < 0.001) return "neutral";
  return higherIsBetter ? (after > before ? "positive" : "negative") : after < before ? "positive" : "negative";
}

function createComparisonLine(label: string, before: number, after: number, suffix = "", higherIsBetter = true): EquipmentComparisonLine | undefined {
  if (Math.abs(after - before) < 0.001) return undefined;
  return {
    label,
    before: formatComparisonValue(before, suffix),
    after: formatComparisonValue(after, suffix),
    tone: comparisonTone(before, after, higherIsBetter)
  };
}

function compactLines(lines: Array<EquipmentComparisonLine | undefined>): EquipmentComparisonLine[] {
  return lines.filter((line): line is EquipmentComparisonLine => !!line);
}

function getProjectedEquipmentForComparison(player: PlayerState, equipmentId: EquipmentId): { equipment: EquipmentId[]; mode: EquipmentComparison["mode"] } {
  const definition = equipmentById[equipmentId];
  if (!definition) return { equipment: player.equipment, mode: "blocked" };
  if (player.equipment.includes(equipmentId)) return { equipment: player.equipment, mode: "installed" };
  if (definition.installableOn && !definition.installableOn.includes(player.shipId)) return { equipment: player.equipment, mode: "blocked" };
  const capacity = getShipSlotCapacity(player.stats)[definition.slotType];
  const usage = getEquipmentSlotUsage(player.equipment)[definition.slotType];
  const size = definition.slotSize ?? 1;
  if (usage + size <= capacity) return { equipment: [...player.equipment, equipmentId], mode: "install" };

  const sameSlotInstalled = player.equipment.filter((id) => equipmentById[id]?.slotType === definition.slotType && id !== equipmentId);
  const removed = new Set<EquipmentId>();
  let freed = 0;
  for (const installedId of sameSlotInstalled) {
    removed.add(installedId);
    freed += equipmentById[installedId]?.slotSize ?? 1;
    if (usage - freed + size <= capacity) {
      return { equipment: [...player.equipment.filter((id) => !removed.has(id)), equipmentId], mode: "replace-preview" };
    }
  }
  return { equipment: player.equipment, mode: "blocked" };
}

function weaponLines(kind: "primary" | "secondary", currentEquipment: EquipmentId[], projectedEquipment: EquipmentId[]): EquipmentComparisonLine[] {
  const currentWeapon = kind === "primary" ? getActivePrimaryWeapon(currentEquipment) : getActiveSecondaryWeapon(currentEquipment);
  const projectedWeapon = kind === "primary" ? getActivePrimaryWeapon(projectedEquipment) : getActiveSecondaryWeapon(projectedEquipment);
  if (!currentWeapon && !projectedWeapon) return [];
  const currentEffects = getEquipmentEffects(currentEquipment);
  const projectedEffects = getEquipmentEffects(projectedEquipment);
  const heading = kind === "primary" ? "Primary" : "Secondary";
  const lines: EquipmentComparisonLine[] = [];
  if (currentWeapon?.id !== projectedWeapon?.id) {
    lines.push({
      label: `${heading} weapon`,
      before: currentWeapon?.name ?? "None",
      after: projectedWeapon?.name ?? "None",
      tone: projectedWeapon ? "positive" : "negative"
    });
  }
  if (currentWeapon && projectedWeapon) {
    lines.push(
      ...compactLines([
        createComparisonLine(`${heading} damage`, currentWeapon.damage, projectedWeapon.damage),
        createComparisonLine(`${heading} cooldown`, currentWeapon.cooldown * currentEffects.weaponCooldownMultiplier, projectedWeapon.cooldown * projectedEffects.weaponCooldownMultiplier, "s", false),
        createComparisonLine(`${heading} range`, currentWeapon.range, projectedWeapon.range, "m"),
        createComparisonLine(`${heading} energy`, currentWeapon.energyCost, projectedWeapon.energyCost, "", false)
      ])
    );
  }
  return lines;
}

export function getEquipmentComparison(player: PlayerState, equipmentId: EquipmentId): EquipmentComparison {
  const definition = equipmentById[equipmentId];
  const slotUsage = getEquipmentSlotUsage(player.equipment);
  const slotCapacity = getShipSlotCapacity(player.stats);
  const slotType = definition?.slotType ?? "utility";
  const sameSlotInstalled = definition ? player.equipment.filter((id) => equipmentById[id]?.slotType === slotType && id !== equipmentId) : [];
  const projected = getProjectedEquipmentForComparison(player, equipmentId);
  const baseStats = shipById[player.shipId]?.stats ?? player.stats;
  const currentStats = getEffectiveShipStats(baseStats, player.equipment);
  const projectedStats = getEffectiveShipStats(baseStats, projected.equipment);
  const currentEffects = getEquipmentEffects(player.equipment);
  const projectedEffects = getEquipmentEffects(projected.equipment);
  const installed = player.equipment.includes(equipmentId);
  const canFit = definition ? slotUsage[slotType] + (definition.slotSize ?? 1) <= slotCapacity[slotType] : false;
  const canInstall = !!definition && !installed && !(definition.installableOn && !definition.installableOn.includes(player.shipId)) && canFit;
  const installMessage = !definition
    ? "Unknown equipment."
    : installed
      ? "Already installed."
      : definition.installableOn && !definition.installableOn.includes(player.shipId)
        ? "Cannot be installed on this ship."
        : canFit
          ? "Fits an open slot."
          : sameSlotInstalled.length > 0
            ? "Slot full; comparison previews replacing same-slot equipment."
            : "No compatible slot available.";

  return {
    equipmentId,
    mode: projected.mode,
    canInstall,
    installMessage,
    sameSlotInstalled,
    slotType,
    slotUsage: slotUsage[slotType],
    slotCapacity: slotCapacity[slotType],
    statLines: compactLines([
      createComparisonLine("Hull", currentStats.hull, projectedStats.hull),
      createComparisonLine("Shield", currentStats.shield, projectedStats.shield),
      createComparisonLine("Energy", currentStats.energy, projectedStats.energy),
      createComparisonLine("Cargo", currentStats.cargoCapacity, projectedStats.cargoCapacity)
    ]),
    weaponLines: [...weaponLines("primary", player.equipment, projected.equipment), ...weaponLines("secondary", player.equipment, projected.equipment)],
    utilityLines: compactLines([
      createComparisonLine("Boost", currentEffects.afterburnerMultiplier, projectedEffects.afterburnerMultiplier, "x"),
      createComparisonLine("Afterburn drain", currentEffects.afterburnerEnergyDrain, projectedEffects.afterburnerEnergyDrain, "/s", false),
      createComparisonLine("Energy regen", currentEffects.energyRegenPerSecond, projectedEffects.energyRegenPerSecond, "/s"),
      createComparisonLine("Hull regen", currentEffects.hullRegenPerSecond, projectedEffects.hullRegenPerSecond, "/s"),
      createComparisonLine("Loot scan", currentEffects.lootInteractionRange, projectedEffects.lootInteractionRange, "m"),
      createComparisonLine("Mining HUD", currentEffects.miningHudRange, projectedEffects.miningHudRange, "m"),
      createComparisonLine("Weapon cooldown", currentEffects.weaponCooldownMultiplier * 100, projectedEffects.weaponCooldownMultiplier * 100, "%", false)
    ])
  };
}
