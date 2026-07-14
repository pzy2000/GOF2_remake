import {
  commodities,
  equipmentById,
  equipmentList,
  factionNames,
  missionTemplates,
  planetById,
  shipById,
  stationById,
  stations,
  systemById
} from "../data/world";
import type {
  CargoHold,
  EquipmentId,
  FactionHeatRecord,
  FactionHeatState,
  FactionId,
  MarketEntry,
  MarketState,
  MissionDefinition,
  OwnedShipRecord,
  PlayerState,
  SaveGameData,
  SaveGameScreen,
  SaveIndex,
  SaveSlotId,
  SaveSlotSummary,
  ShipDefinition,
  Vec3
} from "../types/game";
import { normalizeDialogueState } from "./dialogue";
import { createInitialMarketState } from "./economy";
import { getEffectiveShipStats, normalizePlayerEquipmentStats } from "./equipment";
import { normalizeExplorationState } from "./exploration";
import { applyExplorationChainBlueprintRewards } from "./explorationObjectives";
import { normalizeFactionHeat } from "./factionConsequences";
import { isEconomyDispatchMissionId } from "./marketMissions";
import { cloneMission } from "./missions";
import { getInitialKnownPlanetIds } from "./navigation";
import { isOnboardingStepId, normalizeOnboardingState } from "./onboarding";
import { normalizeReputation } from "./reputation";

export const SAVE_KEY = "gof2-by-pzy-save";
export const SAVE_INDEX_KEY = "gof2-by-pzy-save-index";
export const SAVE_SLOT_PREFIX = "gof2-by-pzy-save-slot:";
export const SAVE_VERSION = 3;
export const PREVIOUS_SAVE_VERSION = 2;
export const LEGACY_SAVE_VERSION = 1;

export const saveSlotLabels: Record<SaveSlotId, string> = {
  "manual-1": "Manual Slot 1",
  "manual-2": "Manual Slot 2",
  "manual-3": "Manual Slot 3",
  auto: "Auto / Quick Slot"
};

export const saveSlotIds: SaveSlotId[] = ["manual-1", "manual-2", "manual-3", "auto"];

type UnknownRecord = Record<string, unknown>;

const MAX_SAFE = Number.MAX_SAFE_INTEGER;
const MAX_TEXT_LENGTH = 2_048;
const MAX_ID_LENGTH = 256;
const MAX_MISSIONS = 64;
const MAX_ID_COLLECTION = 512;
const MAX_CONTRACT_CARGO = 128;
const MAX_EQUIPMENT_INVENTORY = 10_000;
const MAX_MISSILES = 6;
const FALLBACK_SAVED_AT = new Date(0).toISOString();
const DEFAULT_POSITION: Vec3 = [0, 0, 120];
const ZERO_VECTOR: Vec3 = [0, 0, 0];
const factionIds = Object.keys(factionNames) as FactionId[];
const marketItemIds = [...commodities.map((item) => item.id), ...equipmentList.map((item) => item.id)];
const missionTemplateById = new Map(missionTemplates.map((mission) => [mission.id, mission]));

function slotKey(slotId: SaveSlotId): string {
  return `${SAVE_SLOT_PREFIX}${slotId}`;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function own(record: UnknownRecord, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
}

function hasCatalogId(record: object, value: unknown): value is string {
  return typeof value === "string" && value.length <= MAX_ID_LENGTH && Object.prototype.hasOwnProperty.call(record, value);
}

function supportedSaveVersion(value: unknown): value is number {
  return value === SAVE_VERSION || value === PREVIOUS_SAVE_VERSION || value === LEGACY_SAVE_VERSION;
}

function finiteNumber(value: unknown, fallback: number, min = -MAX_SAFE, max = MAX_SAFE): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
}

function finiteInteger(value: unknown, fallback: number, min = -MAX_SAFE, max = MAX_SAFE): number {
  return Math.trunc(finiteNumber(value, fallback, min, max));
}

function optionalFiniteNumber(value: unknown, min = -MAX_SAFE, max = MAX_SAFE): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : undefined;
}

function safeText(value: unknown, maxLength = MAX_TEXT_LENGTH): string | undefined {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength ? value : undefined;
}

function safeIsoTimestamp(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : undefined;
}

function safeVec3(value: unknown, fallback: Vec3): Vec3 {
  if (
    !Array.isArray(value) ||
    value.length !== 3 ||
    value.some((component) => typeof component !== "number" || !Number.isFinite(component) || Math.abs(component) > MAX_SAFE)
  ) {
    return [...fallback];
  }
  return [value[0], value[1], value[2]];
}

function safeUniqueIds<T extends string>(
  value: unknown,
  predicate: (candidate: unknown) => candidate is T,
  limit = MAX_ID_COLLECTION
): T[] {
  if (!Array.isArray(value)) return [];
  const result: T[] = [];
  const seen = new Set<string>();
  for (const candidate of value.slice(0, limit)) {
    if (!predicate(candidate) || seen.has(candidate)) continue;
    seen.add(candidate);
    result.push(candidate);
  }
  return result;
}

function isEquipmentId(value: unknown): value is EquipmentId {
  return hasCatalogId(equipmentById, value);
}

function isKnownMissionId(value: unknown): value is string {
  return typeof value === "string" && missionTemplateById.has(value);
}

function isSaveSlotId(value: unknown): value is SaveSlotId {
  return typeof value === "string" && (saveSlotIds as string[]).includes(value);
}

function decodeCargo(value: unknown, maxQuantity = MAX_CONTRACT_CARGO): CargoHold {
  const source = isRecord(value) ? value : undefined;
  const cargo: CargoHold = {};
  if (!source) return cargo;
  for (const commodity of commodities) {
    const amount = finiteInteger(own(source, commodity.id), 0, 0, maxQuantity);
    if (amount > 0) cargo[commodity.id] = amount;
  }
  return cargo;
}

function decodePlayerCargo(value: unknown, capacity: number): CargoHold {
  const source = isRecord(value) ? value : undefined;
  const cargo: CargoHold = {};
  if (!source) return cargo;
  let remaining = Math.max(0, capacity);
  for (const commodity of commodities) {
    const allowed = Math.max(0, Math.floor(remaining / commodity.mass));
    const amount = finiteInteger(own(source, commodity.id), 0, 0, allowed);
    if (amount <= 0) continue;
    cargo[commodity.id] = amount;
    remaining -= amount * commodity.mass;
  }
  return cargo;
}

function decodeEquipmentInventory(value: unknown): PlayerState["equipmentInventory"] {
  const source = isRecord(value) ? value : undefined;
  const inventory: NonNullable<PlayerState["equipmentInventory"]> = {};
  if (!source) return inventory;
  for (const equipment of equipmentList) {
    const amount = finiteInteger(own(source, equipment.id), 0, 0, MAX_EQUIPMENT_INVENTORY);
    if (amount > 0) inventory[equipment.id] = amount;
  }
  return inventory;
}

function decodeInstalledEquipment(value: unknown, ship: ShipDefinition): EquipmentId[] {
  const requested = Array.isArray(value) ? value.slice(0, 64) : ship.equipment;
  const usage = { primary: 0, secondary: 0, utility: 0, defense: 0, engineering: 0 };
  const capacities = {
    primary: ship.stats.primarySlots,
    secondary: ship.stats.secondarySlots,
    utility: ship.stats.utilitySlots,
    defense: ship.stats.defenseSlots,
    engineering: ship.stats.engineeringSlots
  };
  const installed: EquipmentId[] = [];
  const seen = new Set<EquipmentId>();
  for (const candidate of requested) {
    if (!isEquipmentId(candidate) || seen.has(candidate)) continue;
    const definition = equipmentById[candidate];
    const size = definition.slotSize ?? 1;
    if (usage[definition.slotType] + size > capacities[definition.slotType]) continue;
    usage[definition.slotType] += size;
    seen.add(candidate);
    installed.push(candidate);
  }
  return installed;
}

function decodeOwnedShipRecord(value: unknown): OwnedShipRecord | null {
  if (!isRecord(value)) return null;
  const shipId = own(value, "shipId");
  const stationId = own(value, "stationId");
  if (!hasCatalogId(shipById, shipId) || !hasCatalogId(stationById, stationId)) return null;
  const ship = shipById[shipId];
  const installedEquipment = decodeInstalledEquipment(own(value, "installedEquipment"), ship);
  const stats = getEffectiveShipStats(ship.stats, installedEquipment);
  return {
    shipId,
    stationId,
    installedEquipment,
    hull: finiteNumber(own(value, "hull"), stats.hull, 0, stats.hull),
    shield: finiteNumber(own(value, "shield"), stats.shield, 0, stats.shield),
    energy: finiteNumber(own(value, "energy"), stats.energy, 0, stats.energy)
  };
}

function decodePlayer(value: unknown): PlayerState | null {
  if (!isRecord(value)) return null;
  const shipId = own(value, "shipId");
  if (!hasCatalogId(shipById, shipId)) return null;
  const ship = shipById[shipId];
  const equipment = decodeInstalledEquipment(own(value, "equipment"), ship);
  const effectiveStats = getEffectiveShipStats(ship.stats, equipment);
  const ownedShipRecords: OwnedShipRecord[] = [];
  const recordShipIds = new Set<string>();
  const rawRecords = own(value, "ownedShipRecords");
  if (Array.isArray(rawRecords)) {
    for (const rawRecord of rawRecords.slice(0, 64)) {
      const record = decodeOwnedShipRecord(rawRecord);
      if (!record || recordShipIds.has(record.shipId)) continue;
      recordShipIds.add(record.shipId);
      ownedShipRecords.push(record);
    }
  }
  const ownedShips = safeUniqueIds(own(value, "ownedShips"), (candidate): candidate is string => hasCatalogId(shipById, candidate));
  if (!ownedShips.includes(shipId)) ownedShips.unshift(shipId);
  const decoded: PlayerState = {
    shipId,
    stats: ship.stats,
    hull: finiteNumber(own(value, "hull"), MAX_SAFE, 0, MAX_SAFE),
    shield: finiteNumber(own(value, "shield"), MAX_SAFE, 0, MAX_SAFE),
    energy: finiteNumber(own(value, "energy"), MAX_SAFE, 0, MAX_SAFE),
    credits: finiteInteger(own(value, "credits"), 0, 0, MAX_SAFE),
    cargo: decodePlayerCargo(own(value, "cargo"), effectiveStats.cargoCapacity),
    equipment,
    equipmentInventory: decodeEquipmentInventory(own(value, "equipmentInventory")),
    unlockedBlueprintIds: safeUniqueIds(own(value, "unlockedBlueprintIds"), isEquipmentId),
    missiles: finiteInteger(own(value, "missiles"), 0, 0, MAX_MISSILES),
    ownedShips,
    ownedShipRecords,
    position: safeVec3(own(value, "position"), DEFAULT_POSITION),
    velocity: safeVec3(own(value, "velocity"), ZERO_VECTOR),
    rotation: safeVec3(own(value, "rotation"), ZERO_VECTOR),
    throttle: finiteNumber(own(value, "throttle"), 0, 0, 1),
    lastDamageAt: finiteNumber(own(value, "lastDamageAt"), -999)
  };
  return normalizePlayerEquipmentStats(decoded);
}

function decodeStaticMission(value: UnknownRecord, template: MissionDefinition): MissionDefinition {
  const mission = cloneMission(template);
  if (!template.storyCritical) {
    const savedReward = own(value, "reward");
    const allowedRewards = [template.reward, Math.round(template.reward * 1.1), Math.round(template.reward * 1.18)];
    if (typeof savedReward === "number" && Number.isFinite(savedReward) && allowedRewards.includes(savedReward)) {
      mission.reward = savedReward;
    }
  }
  mission.accepted = typeof own(value, "accepted") === "boolean" ? own(value, "accepted") as boolean : true;
  mission.completed = own(value, "completed") === true;
  mission.failed = own(value, "failed") === true;
  mission.acceptedAt = optionalFiniteNumber(own(value, "acceptedAt"), 0, MAX_SAFE);
  const failureReason = safeText(own(value, "failureReason"));
  if (failureReason) mission.failureReason = failureReason;

  const targetIds = new Set(template.storyEncounter?.targets.map((target) => target.id) ?? []);
  if (template.storyEncounter) {
    mission.storyTargetDestroyedIds = safeUniqueIds(
      own(value, "storyTargetDestroyedIds"),
      (candidate): candidate is string => typeof candidate === "string" && targetIds.has(candidate)
    );
    mission.storyEchoLockedTargetIds = safeUniqueIds(
      own(value, "storyEchoLockedTargetIds"),
      (candidate): candidate is string => typeof candidate === "string" && targetIds.has(candidate)
    );
  }

  const rawEscort = own(value, "escort");
  if (mission.escort && isRecord(rawEscort)) {
    mission.escort = {
      ...mission.escort,
      hull: finiteNumber(own(rawEscort, "hull"), mission.escort.hull, 0, mission.escort.hull),
      arrived: own(rawEscort, "arrived") === true
    };
  }
  const rawSalvage = own(value, "salvage");
  if (mission.salvage && isRecord(rawSalvage)) {
    mission.salvage = { ...mission.salvage, recovered: own(rawSalvage, "recovered") === true };
  }
  return mission;
}

function decodeDynamicMission(value: UnknownRecord, id: string): MissionDefinition | null {
  if (!isEconomyDispatchMissionId(id) || id.length > MAX_ID_LENGTH || !/^[a-z0-9:_-]+$/i.test(id)) return null;
  const title = safeText(own(value, "title"));
  const description = safeText(own(value, "description"));
  const type = own(value, "type");
  const originSystemId = own(value, "originSystemId");
  const destinationSystemId = own(value, "destinationSystemId");
  const destinationStationId = own(value, "destinationStationId");
  const factionId = own(value, "factionId");
  if (
    !title ||
    !description ||
    type !== "Cargo transport" ||
    !hasCatalogId(systemById, originSystemId) ||
    !hasCatalogId(systemById, destinationSystemId) ||
    !hasCatalogId(stationById, destinationStationId) ||
    stationById[destinationStationId].systemId !== destinationSystemId ||
    !hasCatalogId(factionNames, factionId)
  ) {
    return null;
  }
  const mission: MissionDefinition = {
    id,
    title,
    type: type as MissionDefinition["type"],
    originSystemId,
    destinationSystemId,
    destinationStationId,
    factionId: factionId as FactionId,
    description,
    reward: finiteInteger(own(value, "reward"), 0, 0, MAX_SAFE),
    accepted: typeof own(value, "accepted") === "boolean" ? own(value, "accepted") as boolean : true,
    completed: own(value, "completed") === true,
    failed: own(value, "failed") === true
  };
  const sourceStationId = own(value, "sourceStationId");
  if (hasCatalogId(stationById, sourceStationId)) mission.sourceStationId = sourceStationId;
  const deadlineSeconds = optionalFiniteNumber(own(value, "deadlineSeconds"), 0, MAX_SAFE);
  if (deadlineSeconds !== undefined) mission.deadlineSeconds = deadlineSeconds;
  const acceptedAt = optionalFiniteNumber(own(value, "acceptedAt"), 0, MAX_SAFE);
  if (acceptedAt !== undefined) mission.acceptedAt = acceptedAt;
  const failureDelta = optionalFiniteNumber(own(value, "failureReputationDelta"), -100, 100);
  if (failureDelta !== undefined) mission.failureReputationDelta = failureDelta;
  const cargoRequired = decodeCargo(own(value, "cargoRequired"));
  const cargoProvided = decodeCargo(own(value, "cargoProvided"));
  if (Object.keys(cargoRequired).length > 0) mission.cargoRequired = cargoRequired;
  if (Object.keys(cargoProvided).length > 0) mission.cargoProvided = cargoProvided;
  if (typeof own(value, "consumeCargoOnComplete") === "boolean") mission.consumeCargoOnComplete = own(value, "consumeCargoOnComplete") as boolean;
  const reputationRewards = isRecord(own(value, "reputationRewards")) ? own(value, "reputationRewards") as UnknownRecord : undefined;
  if (reputationRewards) {
    const decodedRewards: Partial<Record<FactionId, number>> = {};
    for (const knownFactionId of factionIds) {
      const reward = optionalFiniteNumber(own(reputationRewards, knownFactionId), -100, 100);
      if (reward !== undefined) decodedRewards[knownFactionId] = reward;
    }
    if (Object.keys(decodedRewards).length > 0) mission.reputationRewards = decodedRewards;
  }
  return mission;
}

function decodeActiveMissions(value: unknown): MissionDefinition[] {
  if (!Array.isArray(value)) return [];
  const missions: MissionDefinition[] = [];
  const seen = new Set<string>();
  for (const rawMission of value.slice(0, MAX_MISSIONS)) {
    if (!isRecord(rawMission)) continue;
    const id = own(rawMission, "id");
    if (typeof id !== "string" || seen.has(id)) continue;
    const template = missionTemplateById.get(id);
    const mission = template ? decodeStaticMission(rawMission, template) : decodeDynamicMission(rawMission, id);
    if (!mission) continue;
    seen.add(id);
    missions.push(mission);
  }
  return missions;
}

function decodeMarketEntry(value: unknown, fallback: MarketEntry): MarketEntry {
  if (!isRecord(value)) return { ...fallback };
  return {
    stock: finiteNumber(own(value, "stock"), fallback.stock, 0, fallback.maxStock),
    maxStock: fallback.maxStock,
    baselineStock: fallback.baselineStock,
    demand: finiteNumber(own(value, "demand"), fallback.demand, 0.25, 2.5),
    baselineDemand: fallback.baselineDemand
  };
}

function decodeMarketState(value: unknown): MarketState {
  const initial = createInitialMarketState();
  const source = isRecord(value) ? value : undefined;
  const market: MarketState = {};
  for (const station of stations) {
    const rawStation = source && isRecord(own(source, station.id)) ? own(source, station.id) as UnknownRecord : undefined;
    const stationMarket: MarketState[string] = {};
    for (const itemId of marketItemIds) {
      const fallback = initial[station.id][itemId];
      if (!fallback) continue;
      stationMarket[itemId] = decodeMarketEntry(rawStation ? own(rawStation, itemId) : undefined, fallback);
    }
    market[station.id] = stationMarket;
  }
  return market;
}

function decodeReputation(value: unknown): SaveGameData["reputation"] {
  const source = isRecord(value) && isRecord(own(value, "factions")) ? own(value, "factions") as UnknownRecord : undefined;
  const factions: Partial<Record<FactionId, number>> = {};
  if (source) {
    for (const factionId of factionIds) {
      const score = optionalFiniteNumber(own(source, factionId), -100, 100);
      if (score !== undefined) factions[factionId] = score;
    }
  }
  return normalizeReputation({ factions } as SaveGameData["reputation"]);
}

function decodeFactionHeat(value: unknown): FactionHeatState {
  const source = isRecord(value) && isRecord(own(value, "factions")) ? own(value, "factions") as UnknownRecord : undefined;
  const factions: Partial<Record<FactionId, FactionHeatRecord>> = {};
  if (source) {
    for (const factionId of factionIds) {
      const rawRecord = own(source, factionId);
      if (!isRecord(rawRecord)) continue;
      const record: FactionHeatRecord = {
        heat: finiteNumber(own(rawRecord, "heat"), 0, 0, 100),
        fineCredits: finiteInteger(own(rawRecord, "fineCredits"), 0, 0, MAX_SAFE),
        offenseCount: finiteInteger(own(rawRecord, "offenseCount"), 0, 0, 1_000_000)
      };
      for (const key of ["lastIncidentAt", "warningUntil", "wantedUntil", "interceptCooldownUntil"] as const) {
        const timestamp = optionalFiniteNumber(own(rawRecord, key), 0, MAX_SAFE);
        if (timestamp !== undefined) record[key] = timestamp;
      }
      factions[factionId] = record;
    }
  }
  return normalizeFactionHeat({ factions });
}

function decodeExplorationState(value: unknown): SaveGameData["explorationState"] {
  const source = isRecord(value) ? value : undefined;
  return normalizeExplorationState({
    discoveredSignalIds: source && Array.isArray(own(source, "discoveredSignalIds"))
      ? (own(source, "discoveredSignalIds") as unknown[]).filter((id): id is string => typeof id === "string").slice(0, MAX_ID_COLLECTION)
      : [],
    completedSignalIds: source && Array.isArray(own(source, "completedSignalIds"))
      ? (own(source, "completedSignalIds") as unknown[]).filter((id): id is string => typeof id === "string").slice(0, MAX_ID_COLLECTION)
      : [],
    revealedStationIds: source && Array.isArray(own(source, "revealedStationIds"))
      ? (own(source, "revealedStationIds") as unknown[]).filter((id): id is string => typeof id === "string").slice(0, MAX_ID_COLLECTION)
      : [],
    eventLogIds: source && Array.isArray(own(source, "eventLogIds"))
      ? (own(source, "eventLogIds") as unknown[]).filter((id): id is string => typeof id === "string").slice(0, MAX_ID_COLLECTION)
      : []
  });
}

function decodeDialogueState(value: unknown): SaveGameData["dialogueState"] {
  const source = isRecord(value) ? value : undefined;
  const seenSceneIds = source && Array.isArray(own(source, "seenSceneIds"))
    ? (own(source, "seenSceneIds") as unknown[]).filter((id): id is string => typeof id === "string").slice(0, MAX_ID_COLLECTION)
    : [];
  return normalizeDialogueState({ seenSceneIds });
}

function decodeOnboardingState(
  value: unknown,
  completedMissionIds: string[],
  gameClock: number
): SaveGameData["onboardingState"] {
  if (!isRecord(value)) return normalizeOnboardingState(undefined, { completedMissionIds, gameClock });
  const completedStepIds = safeUniqueIds(own(value, "completedStepIds"), isOnboardingStepId);
  const claimedRewardStepIds = safeUniqueIds(own(value, "claimedRewardStepIds"), isOnboardingStepId);
  return normalizeOnboardingState(
    {
      enabled: typeof own(value, "enabled") === "boolean" ? own(value, "enabled") as boolean : undefined,
      collapsed: typeof own(value, "collapsed") === "boolean" ? own(value, "collapsed") as boolean : undefined,
      completedStepIds,
      claimedRewardStepIds,
      startedAtGameTime: finiteNumber(own(value, "startedAtGameTime"), gameClock, 0, MAX_SAFE),
      completedAtGameTime: optionalFiniteNumber(own(value, "completedAtGameTime"), 0, MAX_SAFE)
    },
    { completedMissionIds, gameClock }
  );
}

function normalizeSave(value: unknown): SaveGameData | null {
  if (!isRecord(value) || !supportedSaveVersion(own(value, "version"))) return null;
  const currentSystemId = own(value, "currentSystemId");
  if (!hasCatalogId(systemById, currentSystemId)) return null;
  const decodedPlayer = decodePlayer(own(value, "player"));
  if (!decodedPlayer) return null;

  const rawStationId = own(value, "currentStationId");
  const currentStationId = hasCatalogId(stationById, rawStationId) && stationById[rawStationId].systemId === currentSystemId
    ? rawStationId
    : undefined;
  const rawScreen = own(value, "screen");
  const screen: SaveGameScreen = currentStationId && rawScreen !== "flight" ? "station" : "flight";
  const gameClock = finiteNumber(own(value, "gameClock"), 0, 0, MAX_SAFE);
  const activeMissions = decodeActiveMissions(own(value, "activeMissions"));
  const completedMissionIds = safeUniqueIds(own(value, "completedMissionIds"), isKnownMissionId);
  const failedMissionIds = safeUniqueIds(own(value, "failedMissionIds"), isKnownMissionId)
    .filter((id) => !completedMissionIds.includes(id));
  const knownSystems = safeUniqueIds(
    own(value, "knownSystems"),
    (candidate): candidate is string => hasCatalogId(systemById, candidate)
  );
  if (!knownSystems.includes(currentSystemId)) knownSystems.unshift(currentSystemId);

  const rawKnownPlanetIds = own(value, "knownPlanetIds");
  const knownSystemSet = new Set(knownSystems);
  const knownPlanetIds = Array.isArray(rawKnownPlanetIds)
    ? safeUniqueIds(
        rawKnownPlanetIds,
        (candidate): candidate is string => hasCatalogId(planetById, candidate) && knownSystemSet.has(planetById[candidate].systemId)
      )
    : getInitialKnownPlanetIds(knownSystems, currentStationId);
  if (currentStationId) {
    const stationPlanetId = stationById[currentStationId].planetId;
    if (!knownPlanetIds.includes(stationPlanetId)) knownPlanetIds.push(stationPlanetId);
  }

  const explorationState = decodeExplorationState(own(value, "explorationState"));
  const player = applyExplorationChainBlueprintRewards(decodedPlayer, explorationState).player;
  const economySnapshotId = optionalFiniteNumber(own(value, "economySnapshotId"), 0, MAX_SAFE);
  const save: SaveGameData = {
    version: SAVE_VERSION,
    savedAt: safeIsoTimestamp(own(value, "savedAt")) ?? FALLBACK_SAVED_AT,
    screen,
    currentSystemId,
    gameClock,
    player,
    activeMissions,
    completedMissionIds,
    failedMissionIds,
    marketState: decodeMarketState(own(value, "marketState")),
    reputation: decodeReputation(own(value, "reputation")),
    factionHeat: decodeFactionHeat(own(value, "factionHeat")),
    knownSystems,
    knownPlanetIds,
    explorationState,
    dialogueState: decodeDialogueState(own(value, "dialogueState")),
    onboardingState: decodeOnboardingState(own(value, "onboardingState"), completedMissionIds, gameClock)
  };
  if (currentStationId) save.currentStationId = currentStationId;
  if (economySnapshotId !== undefined) save.economySnapshotId = economySnapshotId;
  return save;
}

function emptySlot(slotId: SaveSlotId): SaveSlotSummary {
  return { id: slotId, label: saveSlotLabels[slotId], exists: false };
}

function decodeSlotSummary(slotId: SaveSlotId, value: unknown): SaveSlotSummary {
  if (!isRecord(value) || own(value, "exists") !== true) return emptySlot(slotId);
  const currentSystemId = hasCatalogId(systemById, own(value, "currentSystemId")) ? own(value, "currentSystemId") as string : undefined;
  const rawStationId = own(value, "currentStationId");
  const currentStationId = currentSystemId && hasCatalogId(stationById, rawStationId) && stationById[rawStationId].systemId === currentSystemId
    ? rawStationId
    : undefined;
  const summary: SaveSlotSummary = {
    id: slotId,
    label: saveSlotLabels[slotId],
    exists: true,
    screen: own(value, "screen") === "station" && currentStationId ? "station" : "flight"
  };
  const savedAt = safeIsoTimestamp(own(value, "savedAt"));
  if (savedAt) summary.savedAt = savedAt;
  if (currentSystemId) summary.currentSystemId = currentSystemId;
  if (currentStationId) summary.currentStationId = currentStationId;
  const credits = optionalFiniteNumber(own(value, "credits"), 0, MAX_SAFE);
  if (credits !== undefined) summary.credits = Math.trunc(credits);
  const gameClock = optionalFiniteNumber(own(value, "gameClock"), 0, MAX_SAFE);
  if (gameClock !== undefined) summary.gameClock = gameClock;
  const version = own(value, "version");
  if (supportedSaveVersion(version)) summary.version = version;
  return summary;
}

function completeIndex(index?: SaveIndex): SaveIndex {
  const slots = {} as Record<SaveSlotId, SaveSlotSummary>;
  for (const slotId of saveSlotIds) slots[slotId] = decodeSlotSummary(slotId, index?.slots[slotId]);
  const lastPlayedSlotId = isSaveSlotId(index?.lastPlayedSlotId) && slots[index.lastPlayedSlotId].exists
    ? index.lastPlayedSlotId
    : undefined;
  return { version: SAVE_VERSION, slots, lastPlayedSlotId };
}

function decodeIndex(value: unknown): SaveIndex | null {
  if (!isRecord(value) || !supportedSaveVersion(own(value, "version"))) return null;
  const rawSlots = isRecord(own(value, "slots")) ? own(value, "slots") as UnknownRecord : {};
  const slots = {} as Record<SaveSlotId, SaveSlotSummary>;
  for (const slotId of saveSlotIds) slots[slotId] = decodeSlotSummary(slotId, own(rawSlots, slotId));
  const rawLastPlayed = own(value, "lastPlayedSlotId");
  const lastPlayedSlotId = isSaveSlotId(rawLastPlayed) && slots[rawLastPlayed].exists ? rawLastPlayed : undefined;
  return { version: SAVE_VERSION, slots, lastPlayedSlotId };
}

function summarizeSave(slotId: SaveSlotId, save: SaveGameData): SaveSlotSummary {
  const summary: SaveSlotSummary = {
    id: slotId,
    label: saveSlotLabels[slotId],
    exists: true,
    savedAt: save.savedAt,
    screen: save.screen,
    currentSystemId: save.currentSystemId,
    credits: save.player.credits,
    gameClock: save.gameClock,
    version: save.version
  };
  if (save.currentStationId) summary.currentStationId = save.currentStationId;
  return summary;
}

function parseJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function latestSlotFromSummaries(slots: SaveIndex["slots"]): SaveSlotId | undefined {
  return saveSlotIds
    .map((slotId) => slots[slotId])
    .filter((slot): slot is SaveSlotSummary => !!slot?.exists && !!slot.savedAt)
    .sort((a, b) => (Date.parse(b.savedAt ?? "") || 0) - (Date.parse(a.savedAt ?? "") || 0))[0]?.id;
}

function discoverStoredSlots(storage: Storage, seed?: SaveIndex): SaveIndex {
  const slots = {} as Record<SaveSlotId, SaveSlotSummary>;
  for (const slotId of saveSlotIds) {
    const save = parseSave(storage.getItem(slotKey(slotId)));
    slots[slotId] = save ? summarizeSave(slotId, save) : emptySlot(slotId);
  }
  const lastPlayedSlotId = seed?.lastPlayedSlotId && slots[seed.lastPlayedSlotId].exists
    ? seed.lastPlayedSlotId
    : latestSlotFromSummaries(slots);
  return { version: SAVE_VERSION, slots, lastPlayedSlotId };
}

export function serializeSave(save: Omit<SaveGameData, "version" | "savedAt">): string {
  return JSON.stringify({ ...save, version: SAVE_VERSION, savedAt: new Date().toISOString() } satisfies SaveGameData);
}

export function parseSave(raw: string | null): SaveGameData | null {
  return normalizeSave(parseJson(raw));
}

function writeIndex(index: SaveIndex, storage: Storage): SaveIndex {
  const completed = completeIndex(index);
  storage.setItem(SAVE_INDEX_KEY, JSON.stringify(completed));
  return completed;
}

export function migrateLegacySave(storage: Storage = localStorage): SaveIndex {
  const existing = decodeIndex(parseJson(storage.getItem(SAVE_INDEX_KEY)));
  if (existing) return writeIndex(discoverStoredSlots(storage, existing), storage);

  const discovered = discoverStoredSlots(storage);
  if (saveSlotIds.some((slotId) => discovered.slots[slotId]?.exists)) return writeIndex(discovered, storage);

  const legacy = parseSave(storage.getItem(SAVE_KEY));
  if (!legacy) return writeIndex(completeIndex(), storage);

  storage.setItem(slotKey("auto"), JSON.stringify(legacy));
  return writeIndex(
    {
      version: SAVE_VERSION,
      slots: { auto: summarizeSave("auto", legacy) },
      lastPlayedSlotId: "auto"
    },
    storage
  );
}

export function readSaveIndex(storage: Storage = localStorage): SaveIndex {
  migrateLegacySave(storage);
  return decodeIndex(parseJson(storage.getItem(SAVE_INDEX_KEY))) ?? completeIndex();
}

export function readSaveSlots(storage: Storage = localStorage): SaveSlotSummary[] {
  const index = readSaveIndex(storage);
  return saveSlotIds.map((slotId) => index.slots[slotId] ?? emptySlot(slotId));
}

export function getLatestSaveSlotId(storage: Storage = localStorage): SaveSlotId | undefined {
  const index = readSaveIndex(storage);
  const last = index.lastPlayedSlotId;
  if (last && index.slots[last]?.exists) return last;
  return latestSlotFromSummaries(index.slots);
}

export function writeSave(
  save: Omit<SaveGameData, "version" | "savedAt">,
  storage: Storage = localStorage,
  slotId: SaveSlotId = "auto"
): SaveGameData {
  migrateLegacySave(storage);
  const parsed = parseSave(serializeSave(save));
  if (!parsed) throw new Error("Failed to parse saved game immediately after writing.");
  storage.setItem(slotKey(slotId), JSON.stringify(parsed));
  const index = readSaveIndex(storage);
  writeIndex(
    {
      version: SAVE_VERSION,
      slots: { ...index.slots, [slotId]: summarizeSave(slotId, parsed) },
      lastPlayedSlotId: slotId
    },
    storage
  );
  return parsed;
}

export function readSave(storage: Storage = localStorage, slotId?: SaveSlotId): SaveGameData | null {
  const resolvedSlotId = slotId ?? getLatestSaveSlotId(storage);
  if (!resolvedSlotId) return null;
  const save = parseSave(storage.getItem(slotKey(resolvedSlotId)));
  if (!save) return null;
  const index = readSaveIndex(storage);
  writeIndex({ version: SAVE_VERSION, slots: index.slots, lastPlayedSlotId: resolvedSlotId }, storage);
  return save;
}

export function deleteSave(slotId: SaveSlotId, storage: Storage = localStorage): SaveIndex {
  migrateLegacySave(storage);
  storage.removeItem(slotKey(slotId));
  const index = readSaveIndex(storage);
  const nextLast = index.lastPlayedSlotId === slotId ? undefined : index.lastPlayedSlotId;
  return writeIndex(
    {
      version: SAVE_VERSION,
      lastPlayedSlotId: nextLast,
      slots: { ...index.slots, [slotId]: emptySlot(slotId) }
    },
    storage
  );
}
