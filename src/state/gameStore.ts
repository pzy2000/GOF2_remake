import { create } from "zustand";
import { commodities, commodityById, dialogueSceneById, equipmentById, equipmentList, missionTemplates, planetById, planets, shipById, ships, stationById, stations, systemById, systems } from "../data/world";
import type {
  CargoHold,
  EquipmentId,
  FactionId,
  FlightEntity,
  FlightInput,
  LootEntity,
  MissionDefinition,
  NpcInteractionAction,
  ProjectileEntity,
  RuntimeState,
  AudioEventName,
  StoryNotificationTone,
  Vec3
} from "../types/game";
import type { EconomyEvent, EconomyNpcInteractionAction, EconomyServiceStatus } from "../types/economy";
import type { GameStore, SavePayload, SavePayloadOverrides } from "./gameStoreTypes";
import { fallbackAssetManifest } from "../systems/assets";
import { add, clamp, distance, forwardFromRotation, normalize, scale, sub } from "../systems/math";
import { applyDamage, regenerateShield } from "../systems/combat";
import {
  getMiningProgressIncrement,
  getOreColor
} from "../systems/difficulty";
import { integrateVelocity } from "../systems/flight";
import { getDefaultTargetStation } from "../systems/autopilot";
import { NPC_INTERACTION_RANGE } from "../systems/npcInteraction";
import { advanceMarketState, buyCommodity, buyEquipment, createInitialMarketState, getCargoUsed, getOccupiedCargo, sellCommodity, sellEquipment } from "../systems/economy";
import { createInitialReputation, updateReputation } from "../systems/reputation";
import {
  acceptMission as acceptMissionPure,
  canCompleteMission,
  cloneMissionTemplates,
  completeMission as completeMissionPure,
  failMission as failMissionPure,
  areMissionPrerequisitesMet,
  markEscortArrived,
  markSalvageRecovered,
  markStoryTargetDestroyed,
  markStoryTargetEchoLocked,
  isStoryTargetEchoLocked
} from "../systems/missions";
import { deleteSave as deleteSaveSlot, getLatestSaveSlotId, readSave, readSaveSlots, writeSave } from "../systems/save";
import { audioSystem } from "../systems/audio";
import {
  CONTRABAND_FINE_PER_UNIT,
  getContrabandLaw,
  isHostileToPlayer,
  resolveCombatAiStep,
  sortPirateTargets,
  sortTargetableShips
} from "../systems/combatAi";
import {
  applyFactionHeatDecay,
  applyFactionInterceptCooldown,
  applyFactionIncident,
  applyFriendlyFireWarning,
  bountyRewardForShip,
  createBountyNotification,
  createInitialFactionHeat,
  getFactionHeatRecord,
  hasActiveFriendlyFireWarning,
  incidentKindForShip,
  isFactionKillOnSight,
  isFactionWanted,
  payFactionFine as payFactionFinePure
} from "../systems/factionConsequences";
import {
  applyBlackMarketAmnesty,
  getEquipmentPurchaseAccess,
  getFactionRewardMultiplier,
  getMissionAcceptAccess,
  getRepairCostMultiplier,
  getShipPurchaseAccess,
  getStationServiceAccess
} from "../systems/factionServices";
import {
  getActivePrimaryWeapon,
  getActiveSecondaryWeapon,
  getActiveMiningWeapon,
  getPlayerRuntimeEffects,
  getWeaponCooldown,
  installEquipmentFromInventory as installEquipmentFromInventoryPure,
  isBlueprintUnlocked,
  createPlayerShipLoadout,
  uninstallEquipmentToInventory as uninstallEquipmentToInventoryPure,
  unlockBlueprint as unlockBlueprintPure,
  addEquipmentToInventory,
  hasCraftMaterials,
  removeCargo as removeCraftCargo,
  MINING_COOLDOWN_SECONDS,
  MINING_ENERGY_DRAIN_PER_SECOND,
  MINING_MIN_ENERGY,
  MINING_YIELD_PER_CYCLE,
  normalizePlayerEquipmentStats
} from "../systems/equipment";
import {
  createInitialExplorationState,
  explorationSignalById,
  getEffectiveSignalScanBand,
  getEffectiveSignalScanRange,
  getEffectiveSignalScanRateMultiplier,
  hasRequiredSignalEquipment,
  isExplorationSignalUnlocked,
  isFrequencyInSignalBand,
  normalizeExplorationState,
  requiredSignalEquipmentLabel
} from "../systems/exploration";
import {
  createInitialDialogueState,
  getExplorationDialogueScene,
  getStoryMissionDialogueScene,
  isDialogueSceneSeen,
  normalizeDialogueState
} from "../systems/dialogue";
import {
  getInitialKnownSystems,
  getInitialKnownPlanetIds,
  getNearestNavigationTarget,
  discoverNearbyPlanets
} from "../systems/navigation";
import {
  connectEconomyEvents,
  ECONOMY_SERVICE_URL,
  fetchEconomyNpc,
  fetchEconomySnapshot,
  isEconomyNotFoundError,
  postEconomyDispatchDelivery,
  postEconomyNpcInteraction,
  postEconomyReset,
  postNpcDestroyed,
  postPlayerTrade
} from "../systems/economyClient";
import {
  addCargoWithinCapacity,
  addMissionRuntimeEntity,
  addOwnedShipId,
  addUniqueIds,
  createInitialPlayer,
  createPatrolSupportShip,
  createRuntimeForSystem,
  currentShipStorageRecord,
  dialogueOpenPatch,
  hydrateActiveMission,
  lootDropsForDestroyedShip,
  navEffect,
  projectileId,
  upsertShipRecord
} from "./domains/runtimeFactory";
import {
  advanceConvoyEntity,
  createPatrolSupportRequest,
  getActiveCivilianDistress,
  hasActiveCivilianDistress,
  hasLocalCombatThreat,
  resolveCivilianDistress
} from "./domains/combatRuntime";
import { applyEconomySnapshotPatch, offlineEconomyPatch, shouldReportEconomyNpcDestroyed } from "./domains/economyRuntime";
import { applyExpiredMissions } from "./domains/missionRuntime";
import { applyExplorationReward } from "./domains/explorationRuntime";
import {
  applyEconomyDispatchMissionDelivery,
  getEconomyDispatchMissionById,
  isEconomyDispatchMissionId,
  isMarketSmugglingMissionId
} from "../systems/marketMissions";
import {
  createInitialOnboardingState,
  getOnboardingStepDefinition,
  normalizeOnboardingState,
  resolveOnboardingProgress
} from "../systems/onboarding";
import {
  advanceAutopilotPatch,
  activateStargateJumpToStationPatch,
  dockAtPatch,
  emptyFlightInput,
  jumpToSystemPatch,
  startJumpToStationPatch,
  undockPatch
} from "./domains/navigationRuntime";
import { readLocalePreference, saveLocalePreference } from "../i18n";

const emptyInput: FlightInput = emptyFlightInput();
const GLASS_WAKE_INTRO_SCENE_ID = "dialogue-story-glass-wake-intro";

let closeEconomyStream: (() => void) | undefined;
let economyRefreshInFlight = false;

function economyErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Economy service offline.";
}

function dispatchVisibilityFor(state: Pick<GameStore, "knownSystems" | "knownPlanetIds" | "explorationState" | "economyPersonalOffers">) {
  return {
    knownSystemIds: state.knownSystems,
    knownPlanetIds: state.knownPlanetIds,
    explorationState: state.explorationState,
    personalOffers: state.economyPersonalOffers
  };
}

function savePayload(state: GameStore, overrides: SavePayloadOverrides = {}): SavePayload {
  return {
    currentSystemId: overrides.currentSystemId ?? state.currentSystemId,
    currentStationId: Object.prototype.hasOwnProperty.call(overrides, "currentStationId") ? overrides.currentStationId : state.currentStationId,
    gameClock: overrides.gameClock ?? state.gameClock,
    player: overrides.player ?? state.player,
    activeMissions: overrides.activeMissions ?? state.activeMissions,
    completedMissionIds: overrides.completedMissionIds ?? state.completedMissionIds,
    failedMissionIds: overrides.failedMissionIds ?? state.failedMissionIds,
    marketState: overrides.marketState ?? state.marketState,
    economySnapshotId: state.economyService.snapshotId,
    reputation: overrides.reputation ?? state.reputation,
    factionHeat: overrides.factionHeat ?? state.factionHeat,
    knownSystems: overrides.knownSystems ?? state.knownSystems,
    knownPlanetIds: overrides.knownPlanetIds ?? state.knownPlanetIds,
    explorationState: overrides.explorationState ?? state.explorationState,
    dialogueState: overrides.dialogueState ?? state.dialogueState,
    onboardingState: Object.prototype.hasOwnProperty.call(overrides, "onboardingState") ? overrides.onboardingState : state.onboardingState
  };
}

function writeStationAutoSave(state: GameStore): Pick<GameStore, "hasSave" | "saveSlots" | "activeSaveSlotId"> {
  writeSave(savePayload(state), undefined, "auto");
  return {
    hasSave: true,
    saveSlots: readSaveSlots(),
    activeSaveSlotId: "auto"
  };
}

function createStoryNotification(tone: StoryNotificationTone, title: string, body: string, gameClock: number) {
  return {
    id: `story-${tone}-${Math.round(gameClock * 1000)}-${title}`,
    tone,
    title,
    body,
    expiresAt: gameClock + 5
  };
}

function eventDialogueOpenPatch(state: GameStore, sceneId: string) {
  const dialogueState = state.activeDialogue?.sceneId === GLASS_WAKE_INTRO_SCENE_ID
    ? { ...state, activeDialogue: undefined }
    : state;
  return dialogueOpenPatch(dialogueState, sceneId);
}

function eventDialogueQueuePatch(state: GameStore, sceneId: string) {
  if (!dialogueSceneById[sceneId] || isDialogueSceneSeen(state.dialogueState, sceneId)) return {};
  if (!state.activeDialogue || state.activeDialogue.sceneId === GLASS_WAKE_INTRO_SCENE_ID) {
    return eventDialogueOpenPatch(state, sceneId);
  }
  const queuedSceneIds = state.activeDialogue.queuedSceneIds ?? [];
  if (state.activeDialogue.sceneId === sceneId || queuedSceneIds.includes(sceneId)) return {};
  return {
    activeDialogue: {
      ...state.activeDialogue,
      queuedSceneIds: [...queuedSceneIds, sceneId]
    }
  };
}

function closeOrAdvanceDialoguePatch(state: GameStore) {
  const queuedSceneIds = state.activeDialogue?.queuedSceneIds ?? [];
  for (const sceneId of queuedSceneIds) {
    const patch = dialogueOpenPatch({ dialogueState: state.dialogueState, activeDialogue: undefined }, sceneId);
    if (patch.activeDialogue) {
      return {
        ...patch,
        activeDialogue: {
          ...patch.activeDialogue,
          queuedSceneIds: queuedSceneIds.filter((id) => id !== sceneId)
        }
      };
    }
  }
  return { activeDialogue: undefined };
}

function createOnboardingStorePatch(state: GameStore): Pick<GameStore, "onboardingState" | "player" | "runtime"> | undefined {
  const progress = resolveOnboardingProgress({
    onboardingState: state.onboardingState,
    screen: state.screen,
    currentSystemId: state.currentSystemId,
    currentStationId: state.currentStationId,
    player: state.player,
    activeMissions: state.activeMissions,
    completedMissionIds: state.completedMissionIds,
    autopilot: state.autopilot,
    gameClock: state.gameClock
  });
  if (!progress.changed || !progress.onboardingState) return undefined;
  let player = state.player;
  const rewardCredits = progress.rewardStepIds.reduce((total, stepId) => total + getOnboardingStepDefinition(stepId).rewardCredits, 0);
  if (rewardCredits > 0) {
    player = { ...player, credits: player.credits + rewardCredits };
  }
  if (progress.rewardStepIds.includes("dock-helion")) {
    player = { ...player, hull: Math.max(player.hull, Math.ceil(player.stats.hull * 0.75)) };
  }
  const lastCompletedStep = progress.completedNow[progress.completedNow.length - 1];
  const lastStep = lastCompletedStep ? getOnboardingStepDefinition(lastCompletedStep) : undefined;
  const rewardMessage = rewardCredits > 0 ? ` +${rewardCredits.toLocaleString()} cr.` : "";
  const onboardingMessage = progress.finishedNow
    ? "Flight checklist complete. Glass Wake 02 is debriefed; next: Kuro Resonance, Economy, or Quiet Signals."
    : lastStep
      ? `Onboarding: ${lastStep.title} complete.${rewardMessage}`
      : state.runtime.message;
  const preserveRuntimeMessage =
    !!state.runtime.message &&
    state.runtime.message !== "Flight systems online." &&
    !state.runtime.message.startsWith("Onboarding:") &&
    !state.runtime.message.startsWith("Flight checklist complete.");
  return {
    onboardingState: progress.onboardingState,
    player,
    runtime: {
      ...state.runtime,
      message: preserveRuntimeMessage ? state.runtime.message : onboardingMessage,
      storyNotification: progress.finishedNow
        ? state.runtime.storyNotification ?? createStoryNotification("complete", "Flight Checklist Complete", "First reversal complete. Next: Kuro Resonance, Economy, or Quiet Signals.", state.gameClock)
        : state.runtime.storyNotification
    }
  };
}

function withOnboardingProgress<T extends Partial<GameStore>>(state: GameStore, patch: T): T {
  const next = { ...state, ...patch } as GameStore;
  const onboardingPatch = createOnboardingStorePatch(next);
  return onboardingPatch ? ({ ...patch, ...onboardingPatch } as T) : patch;
}

const PATROL_INTERDICTION_COOLDOWN_SECONDS = 120;

function withPatrolInterdiction<T extends Partial<GameStore>>(state: GameStore, patch: T): T {
  const next = { ...state, ...patch } as GameStore;
  const enteringSystem = patch.currentSystemId !== undefined && patch.currentSystemId !== state.currentSystemId;
  const launchingFromStation = state.currentStationId !== undefined && next.currentStationId === undefined && next.screen === "flight";
  if (!enteringSystem && !launchingFromStation) return patch;
  if (next.currentStationId !== undefined || next.screen !== "flight") return patch;
  const system = systemById[next.currentSystemId];
  if (!system) return patch;
  const factionHeat = patch.factionHeat ?? state.factionHeat;
  const record = getFactionHeatRecord(factionHeat, system.factionId);
  if ((record.interceptCooldownUntil ?? -Infinity) > next.gameClock) return patch;
  const killOnSight = isFactionKillOnSight(factionHeat, system.factionId);
  const wanted = isFactionWanted(factionHeat, system.factionId, next.gameClock);
  if (!wanted && !killOnSight) return patch;
  const runtime = patch.runtime ?? state.runtime;
  const player = patch.player ?? state.player;
  const spawnCount = killOnSight ? 2 : 1;
  const existingSupport = runtime.enemies.filter((ship) => ship.supportWing && ship.hull > 0 && ship.deathTimer === undefined).length;
  const supportShips = Array.from({ length: spawnCount }, (_, index) =>
    createPatrolSupportShip(next.currentSystemId, existingSupport + index, "player", player.position, next.gameClock)
  );
  const message = killOnSight
    ? "Kill-on-sight interdiction: patrol wing has your transponder."
    : "Wanted interdiction: patrol support is moving to intercept.";
  return {
    ...patch,
    factionHeat: applyFactionInterceptCooldown(factionHeat, system.factionId, next.gameClock + PATROL_INTERDICTION_COOLDOWN_SECONDS),
    runtime: {
      ...runtime,
      enemies: [...runtime.enemies, ...supportShips],
      effects: [...runtime.effects, ...supportShips.map((ship) => navEffect(ship.position, "INTERDICT"))],
      message
    }
  } as T;
}

function isWatchableEconomyNpc(ship: FlightEntity | undefined): ship is FlightEntity {
  return !!ship?.economyStatus && ship.hull > 0 && ship.deathTimer === undefined;
}

const NPC_ESCORT_RANGE = 900;
const NPC_ESCORT_SECONDS = 90;
const NPC_ESCORT_PROGRESS_SECONDS = 25;
const NPC_RESCUE_SECONDS = 90;
const NPC_RESCUE_CLEAR_RANGE = 1200;
type NpcRouteAction = Extract<NpcInteractionAction, "escort" | "rob">;

function isEconomyNpc(ship: FlightEntity | undefined): ship is FlightEntity {
  return isWatchableEconomyNpc(ship) && ["trader", "freighter", "courier", "miner", "smuggler"].includes(ship.role);
}

function isEscortableNpc(ship: FlightEntity): boolean {
  return ship.role === "trader" || ship.role === "freighter" || ship.role === "courier" || ship.role === "miner";
}

function cargoUnits(cargo: CargoHold | undefined): number {
  return Object.values(cargo ?? {}).reduce((total, amount) => total + (amount ?? 0), 0);
}

function economyNpcById(state: GameStore, npcId: string | undefined): FlightEntity | undefined {
  return state.runtime.enemies.find((ship) => ship.id === npcId && isEconomyNpc(ship));
}

function nearestEconomyNpc(state: GameStore): FlightEntity | undefined {
  const target = economyNpcById(state, state.targetId);
  if (target && distance(target.position, state.player.position) <= NPC_INTERACTION_RANGE) return target;
  return state.runtime.enemies
    .filter(isEconomyNpc)
    .map((ship) => ({ ship, dist: distance(ship.position, state.player.position) }))
    .filter((candidate) => candidate.dist <= NPC_INTERACTION_RANGE)
    .sort((a, b) => a.dist - b.dist)[0]?.ship;
}

function hailMessageForNpc(ship: FlightEntity, now: number): string {
  if (ship.economyRelationTier === "hostile") return `${ship.name}: Channel rejected. ${ship.economyRelationSummary ?? "Hostile contact"}.`;
  if (ship.distressThreatId && ship.distressCalledAt !== undefined && now - ship.distressCalledAt <= 18) {
    return `${ship.name}: Distress traffic open. Hostile contact is on our route.`;
  }
  if (ship.economyPersonalOfferId) return `${ship.name}: Personal call is open at home station. ${ship.economyRelationSummary ?? ""}`.trim();
  if (ship.role === "smuggler") return `${ship.name}: Private freight. Keep patrol ears off this channel.`;
  if (ship.economyTaskKind === "mining") return `${ship.name}: Cutting ore. Keep pirates off our beam line.`;
  if (ship.economyTaskKind === "hauling") return `${ship.name}: Freight run active. Cargo and margin are both exposed.`;
  if (ship.economyTaskKind === "buying" || ship.economyTaskKind === "selling") return `${ship.name}: Docking window is tight. Make it quick.`;
  return `${ship.name}: Channel open. Status ${ship.economyStatus ?? "IDLE"}.`;
}

function escortRewardForNpc(ship: FlightEntity, systemId: string): number {
  const roleBonus = ship.role === "freighter" ? 70 : ship.role === "courier" ? 40 : ship.role === "miner" ? 30 : 0;
  const riskBonus = Math.round((systemById[systemId]?.risk ?? 0) * 220);
  return Math.round(clamp(180 + roleBonus + riskBonus, 180, 450));
}

function rescueRewardForNpc(ship: FlightEntity, systemId: string): number {
  const roleBonus = ship.role === "freighter" ? 80 : ship.role === "courier" ? 50 : 40;
  const riskBonus = Math.round((systemById[systemId]?.risk ?? 0) * 220);
  return Math.round(clamp(260 + roleBonus + riskBonus, 260, 580));
}

function reportRewardFaction(state: GameStore, ship: FlightEntity): FactionId {
  return ship.role === "smuggler" ? systemById[state.currentSystemId].factionId : ship.factionId;
}

function canReportNpc(state: GameStore, ship: FlightEntity): boolean {
  return ship.role === "smuggler" || hasActiveCivilianDistress(ship, state.runtime.clock) || isHostileToPlayer(ship);
}

function robberyIncidentKindForShip(ship: FlightEntity) {
  if (ship.role === "smuggler") return incidentKindForShip(ship.role, false);
  if (ship.role === "trader" || ship.role === "freighter" || ship.role === "courier" || ship.role === "miner") return "civilian-robbed" as const;
  return incidentKindForShip(ship.role, false);
}

function stationForMissionAccess(state: GameStore, mission: MissionDefinition) {
  return stationById[state.currentStationId ?? mission.sourceStationId ?? mission.destinationStationId] ?? stationById[mission.destinationStationId];
}

type MissionDialogueMode = "open" | "queue";

interface MissionPatchResult {
  ok: boolean;
  patch: Partial<GameStore>;
  audioEvent?: AudioEventName;
  dispatchDeliveryRequest?: {
    missionId: string;
    systemId: string;
    stationId: string;
    cargoDelivered: CargoHold;
  };
  shouldPostDispatchDelivery?: boolean;
  completeMessage?: string;
}

function storyMissionOrder(missionId: string): number {
  const index = missionTemplates.findIndex((mission) => mission.id === missionId);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function dialoguePatchForMode(state: GameStore, sceneId: string, mode: MissionDialogueMode) {
  return mode === "queue" ? eventDialogueQueuePatch(state, sceneId) : eventDialogueOpenPatch(state, sceneId);
}

function buildAcceptMissionPatch(state: GameStore, missionId: string, dialogueMode: MissionDialogueMode = "open"): MissionPatchResult {
  const mission = missionTemplates.find((candidate) => candidate.id === missionId) ?? getEconomyDispatchMissionById(state.marketState, missionId, dispatchVisibilityFor(state));
  const generatedDispatchMission = isEconomyDispatchMissionId(missionId);
  if (!mission) {
    return { ok: false, patch: { runtime: { ...state.runtime, message: "That market contract is no longer available." } } };
  }
  if (!generatedDispatchMission && (state.completedMissionIds.includes(missionId) || (state.failedMissionIds.includes(missionId) && !mission.retryOnFailure))) {
    return { ok: false, patch: { runtime: { ...state.runtime, message: "That contract is no longer available." } } };
  }
  if (!generatedDispatchMission && !areMissionPrerequisitesMet(mission, state.completedMissionIds)) {
    return { ok: false, patch: { runtime: { ...state.runtime, message: "Mission prerequisites are not complete." } } };
  }
  const accessStation = stationForMissionAccess(state, mission);
  const missionAccess = getMissionAcceptAccess({
    station: accessStation,
    mission,
    reputation: state.reputation,
    factionHeat: state.factionHeat,
    now: state.gameClock
  });
  if (!missionAccess.ok) {
    return { ok: false, patch: { runtime: { ...state.runtime, message: missionAccess.message } } };
  }
  const rewardMultiplier = mission.storyCritical ? 1 : getFactionRewardMultiplier(accessStation.factionId, state.reputation, state.factionHeat, state.gameClock);
  const missionForAcceptance = rewardMultiplier === 1 ? mission : { ...mission, reward: Math.round(mission.reward * rewardMultiplier) };
  const result = acceptMissionPure(state.player, state.activeMissions, missionForAcceptance, state.gameClock);
  const runtime = result.mission ? addMissionRuntimeEntity(state.runtime, result.mission, state.currentSystemId) : state.runtime;
  const dialogueScene = result.ok && !generatedDispatchMission ? getStoryMissionDialogueScene(mission.id, "accept") : undefined;
  const dialoguePatch = dialogueScene ? dialoguePatchForMode(state, dialogueScene.id, dialogueMode) : {};
  const queuedBehindActiveDialogue = dialogueMode === "queue";
  const storyNotification = result.ok && mission.storyCritical && !queuedBehindActiveDialogue
    ? createStoryNotification("start", mission.title, result.message, state.gameClock)
    : runtime.storyNotification;
  const patch = withOnboardingProgress(state, {
    player: result.player,
    activeMissions: result.activeMissions,
    failedMissionIds: result.ok && (mission.retryOnFailure || generatedDispatchMission) ? state.failedMissionIds.filter((id) => id !== missionId) : state.failedMissionIds,
    runtime: { ...runtime, message: queuedBehindActiveDialogue ? runtime.message : result.message, storyNotification },
    ...dialoguePatch
  });
  return { ok: result.ok, patch, audioEvent: result.ok ? "ui-click" : undefined };
}

function buildCompleteMissionPatch(state: GameStore, missionId: string, dialogueMode: MissionDialogueMode = "open"): MissionPatchResult {
  if (!state.currentStationId) return { ok: false, patch: {} };
  const mission = state.activeMissions.find((candidate) => candidate.id === missionId);
  if (!mission || !canCompleteMission(mission, state.player, state.currentSystemId, state.currentStationId, state.runtime.destroyedPirates, state.gameClock)) {
    return { ok: false, patch: { runtime: { ...state.runtime, message: "Mission requirements are not complete." } } };
  }
  const result = completeMissionPure(mission, state.player, state.reputation);
  const generatedDispatchMission = isEconomyDispatchMissionId(mission.id);
  const marketState = generatedDispatchMission ? applyEconomyDispatchMissionDelivery(state.marketState, mission) : state.marketState;
  const dialogueScene = generatedDispatchMission ? undefined : getStoryMissionDialogueScene(mission.id, "complete");
  const dialoguePatch = dialogueScene ? dialoguePatchForMode(state, dialogueScene.id, dialogueMode) : {};
  const newlyUnlockedBlueprints = (mission.blueprintRewardIds ?? [])
    .filter((equipmentId) => !state.player.unlockedBlueprintIds?.includes(equipmentId))
    .map((equipmentId) => equipmentById[equipmentId]?.name ?? equipmentId);
  const blueprintRewardMessage = newlyUnlockedBlueprints.length > 0
    ? ` ${newlyUnlockedBlueprints.join(", ")} blueprint unlocked.`
    : "";
  const completeMessage = generatedDispatchMission
    ? `${mission.title} delivered. ${isMarketSmugglingMissionId(mission.id) ? "Black-market pressure shifted" : "Market pressure eased"}. +${mission.reward} credits.`
    : `${mission.title} complete. +${mission.reward} credits.${blueprintRewardMessage}`;
  const dispatchDeliveryRequest = generatedDispatchMission && mission.cargoRequired
    ? {
        missionId: mission.id,
        systemId: state.currentSystemId,
        stationId: state.currentStationId,
        cargoDelivered: mission.cargoRequired
      }
    : undefined;
  const economyService = generatedDispatchMission && state.economyService.status !== "connected"
    ? { ...state.economyService, status: "fallback" as const, lastError: "Dispatch delivery recorded locally." }
    : state.economyService;
  const patch = withOnboardingProgress(state, {
    player: result.player,
    reputation: result.reputation,
    activeMissions: state.activeMissions.filter((active) => active.id !== missionId),
    completedMissionIds: generatedDispatchMission ? state.completedMissionIds : [...state.completedMissionIds, missionId],
    marketState,
    economyService,
    runtime: {
      ...state.runtime,
      convoys: state.runtime.convoys.filter((convoy) => convoy.missionId !== missionId),
      salvage: state.runtime.salvage.filter((salvage) => salvage.missionId !== missionId),
      message: completeMessage,
      storyNotification: mission.storyCritical
        ? createStoryNotification("complete", mission.title, completeMessage, state.gameClock)
        : state.runtime.storyNotification
    },
    ...dialoguePatch
  });
  return {
    ok: true,
    patch,
    audioEvent: "mission-complete",
    dispatchDeliveryRequest,
    shouldPostDispatchDelivery: !!dispatchDeliveryRequest && state.economyService.status === "connected",
    completeMessage
  };
}

function getAutoCompletableStoryMission(state: GameStore): MissionDefinition | undefined {
  if (!state.currentStationId) return undefined;
  return state.activeMissions
    .filter((mission) => mission.storyCritical)
    .filter((mission) => canCompleteMission(mission, state.player, state.currentSystemId, state.currentStationId!, state.runtime.destroyedPirates, state.gameClock))
    .sort((a, b) => storyMissionOrder(a.id) - storyMissionOrder(b.id))[0];
}

function getAutoAcceptableStoryMission(state: GameStore): MissionDefinition | undefined {
  const station = state.currentStationId ? stationById[state.currentStationId] : undefined;
  if (!station || state.activeMissions.some((mission) => mission.storyCritical)) return undefined;
  return missionTemplates
    .filter((mission) => mission.storyCritical)
    .filter((mission) => !state.activeMissions.some((active) => active.id === mission.id))
    .filter((mission) => !state.completedMissionIds.includes(mission.id))
    .filter((mission) => !state.failedMissionIds.includes(mission.id) || mission.retryOnFailure)
    .filter((mission) => areMissionPrerequisitesMet(mission, state.completedMissionIds))
    .filter((mission) => (mission.sourceStationId ? mission.sourceStationId === station.id : mission.originSystemId === station.systemId))
    .sort((a, b) => storyMissionOrder(a.id) - storyMissionOrder(b.id))[0];
}

function applyStoryStationAutomation(state: GameStore): { patch: Partial<GameStore>; audioEvents: AudioEventName[] } {
  let next = state;
  let patch: Partial<GameStore> = {};
  const audioEvents: AudioEventName[] = [];
  const completeMission = getAutoCompletableStoryMission(next);
  if (completeMission) {
    const result = buildCompleteMissionPatch(next, completeMission.id, "open");
    if (result.ok) {
      patch = { ...patch, ...result.patch };
      next = { ...next, ...result.patch } as GameStore;
      if (result.audioEvent) audioEvents.push(result.audioEvent);
    }
  }
  const acceptMission = getAutoAcceptableStoryMission(next);
  if (acceptMission) {
    const dialogueMode = next.activeDialogue && next.activeDialogue.sceneId !== GLASS_WAKE_INTRO_SCENE_ID ? "queue" : "open";
    const result = buildAcceptMissionPatch(next, acceptMission.id, dialogueMode);
    if (result.ok) {
      patch = { ...patch, ...result.patch };
      next = { ...next, ...result.patch } as GameStore;
      if (result.audioEvent) audioEvents.push(result.audioEvent);
    }
  }
  return { patch, audioEvents };
}

function npcRouteActionLabel(action: NpcRouteAction): string {
  return action[0].toUpperCase() + action.slice(1);
}

function shouldRouteToNpc(state: GameStore, ship: FlightEntity): boolean {
  return state.screen !== "flight" || distance(ship.position, state.player.position) > NPC_INTERACTION_RANGE;
}

function startNpcInteractionRoutePatch(state: GameStore, ship: FlightEntity, action: NpcRouteAction): Partial<GameStore> {
  const launchPatch = state.currentStationId ? undockPatch(state) : {};
  const player = launchPatch.player ?? state.player;
  const runtime = launchPatch.runtime ?? state.runtime;
  const targetPosition = [...ship.position] as Vec3;
  const actionLabel = npcRouteActionLabel(action);
  return {
    ...launchPatch,
    screen: "flight",
    previousScreen: state.screen,
    currentStationId: undefined,
    economyNpcWatch: undefined,
    npcInteraction: undefined,
    targetId: ship.id,
    autopilot: {
      phase: "to-npc",
      originSystemId: state.currentSystemId,
      targetSystemId: state.currentSystemId,
      targetPosition,
      targetNpcId: ship.id,
      targetName: ship.name,
      pendingNpcAction: action,
      timer: 0,
      cancelable: true
    },
    player: {
      ...player,
      velocity: [0, 0, 0],
      throttle: Math.max(player.throttle, 0.45)
    },
    runtime: {
      ...runtime,
      graceUntil: Math.max(runtime.graceUntil, runtime.clock + 5),
      effects: [...runtime.effects, navEffect(targetPosition, `${actionLabel} ${ship.name}`)],
      message: `Autopilot: routing to ${ship.name} for ${actionLabel}.`
    },
    input: emptyFlightInput(),
    primaryCooldown: 0,
    secondaryCooldown: 0
  };
}

function lootForCargo(cargo: CargoHold | undefined, position: Vec3): LootEntity[] {
  return (Object.entries(cargo ?? {}) as [keyof CargoHold, number | undefined][])
    .filter(([, amount]) => (amount ?? 0) > 0)
    .map(([commodityId, amount], index) => ({
      id: projectileId(`npc-rob-${commodityId}`),
      kind: "commodity" as const,
      commodityId,
      amount: amount ?? 0,
      position: add(position, [index * 18 - 12, 6 + index * 3, 0]),
      velocity: [12 - index * 9, 12, -18 + index * 7],
      rarity: "uncommon" as const
    }));
}

function backendActionFor(action: NpcInteractionAction): EconomyNpcInteractionAction | undefined {
  return action === "rob" || action === "rescue" || action === "report" ? action : undefined;
}

function storyTargetMission(activeMissions: MissionDefinition[], ship: FlightEntity): MissionDefinition | undefined {
  return ship.storyTarget && ship.missionId ? activeMissions.find((mission) => mission.id === ship.missionId) : undefined;
}

function storyTargetDefinition(activeMissions: MissionDefinition[], ship: FlightEntity) {
  return storyTargetMission(activeMissions, ship)?.storyEncounter?.targets.find((target) => target.id === ship.id);
}

function protectEchoLockedStoryTargetDeath(
  damaged: FlightEntity,
  original: FlightEntity,
  activeMissions: MissionDefinition[]
): { ship: FlightEntity; blocked: boolean } {
  if (damaged.hull > 0 || original.hull <= 0) return { ship: damaged, blocked: false };
  const mission = storyTargetMission(activeMissions, original);
  const target = storyTargetDefinition(activeMissions, original);
  if (!mission || !target?.echoLock || isStoryTargetEchoLocked(mission, target.id)) return { ship: damaged, blocked: false };
  return { ship: { ...damaged, hull: 1, shield: 0 }, blocked: true };
}

function advanceStoryEchoLock({
  runtime,
  activeMissions,
  player,
  targetId,
  delta,
  echoLockRangeBonus,
  echoLockRateMultiplier
}: {
  runtime: RuntimeState;
  activeMissions: MissionDefinition[];
  player: { position: Vec3 };
  targetId?: string;
  delta: number;
  echoLockRangeBonus: number;
  echoLockRateMultiplier: number;
}): { runtime: RuntimeState; activeMissions: MissionDefinition[]; message?: string } {
  const selectedShip = targetId ? runtime.enemies.find((ship) => ship.id === targetId && ship.hull > 0 && ship.deathTimer === undefined) : undefined;
  const selectedMission = selectedShip ? storyTargetMission(activeMissions, selectedShip) : undefined;
  const selectedTarget = selectedShip ? storyTargetDefinition(activeMissions, selectedShip) : undefined;
  const selectedNeedsLock = !!selectedMission && !!selectedTarget?.echoLock && !isStoryTargetEchoLocked(selectedMission, selectedTarget.id);
  const prior = runtime.storyEchoLock;
  const lockTargetId = selectedNeedsLock ? selectedTarget!.id : prior?.targetId;
  const lockMissionId = selectedNeedsLock ? selectedMission!.id : prior?.missionId;
  if (!lockTargetId || !lockMissionId) return { runtime: { ...runtime, storyEchoLock: undefined }, activeMissions };

  const mission = activeMissions.find((item) => item.id === lockMissionId);
  const targetDef = mission?.storyEncounter?.targets.find((target) => target.id === lockTargetId);
  const ship = runtime.enemies.find((item) => item.id === lockTargetId && item.hull > 0 && item.deathTimer === undefined);
  if (!mission || !targetDef?.echoLock || !ship || isStoryTargetEchoLocked(mission, lockTargetId)) {
    return { runtime: { ...runtime, storyEchoLock: undefined }, activeMissions };
  }

  const isSelected = selectedNeedsLock && targetId === lockTargetId;
  const maxRange = targetDef.echoLock.rangeMeters + echoLockRangeBonus;
  const inRange = isSelected && distance(player.position, ship.position) <= maxRange;
  const currentProgress = prior?.targetId === lockTargetId && prior.missionId === lockMissionId ? prior.progressSeconds : 0;
  const progressSeconds = clamp(
    currentProgress + (inRange ? delta * echoLockRateMultiplier : -delta),
    0,
    targetDef.echoLock.requiredSeconds
  );
  if (progressSeconds <= 0 && !inRange) return { runtime: { ...runtime, storyEchoLock: undefined }, activeMissions };
  const completed = progressSeconds >= targetDef.echoLock.requiredSeconds;
  const nextActiveMissions = completed
    ? activeMissions.map((item) => (item.id === mission.id ? markStoryTargetEchoLocked(item, lockTargetId) : item))
    : activeMissions;
  return {
    activeMissions: nextActiveMissions,
    runtime: {
      ...runtime,
      storyEchoLock: completed
        ? undefined
        : {
            missionId: mission.id,
            targetId: lockTargetId,
            progressSeconds,
            requiredSeconds: targetDef.echoLock.requiredSeconds,
            inRange
          }
    },
    message: completed ? `Echo Lock complete: ${ship.name} desynchronized.` : undefined
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  screen: "menu",
  previousScreen: "menu",
  stationTab: "Market",
  galaxyMapMode: "browse",
  currentSystemId: "helion-reach",
  targetId: undefined,
  cameraMode: "chase",
  assetManifest: fallbackAssetManifest,
  player: createInitialPlayer(),
  runtime: createRuntimeForSystem("helion-reach"),
  economyService: { status: "offline", url: ECONOMY_SERVICE_URL },
  economyEvents: [],
  economyPersonalOffers: [],
  economyNpcWatch: undefined,
  npcInteraction: undefined,
  npcObjective: undefined,
  autopilot: undefined,
  input: emptyInput,
  gameClock: 0,
  marketState: createInitialMarketState(),
  activeMissions: [],
  completedMissionIds: [],
  failedMissionIds: [],
  reputation: createInitialReputation(),
  factionHeat: createInitialFactionHeat(),
  knownSystems: getInitialKnownSystems("helion-reach"),
  knownPlanetIds: getInitialKnownPlanetIds(getInitialKnownSystems("helion-reach")),
  explorationState: createInitialExplorationState(),
  dialogueState: createInitialDialogueState(),
  onboardingState: undefined,
  activeDialogue: undefined,
  primaryCooldown: 0,
  secondaryCooldown: 0,
  hasSave: readSave() !== null,
  saveSlots: readSaveSlots(),
  activeSaveSlotId: undefined,
  locale: readLocalePreference(),
  setAssetManifest: (assetManifest) => set({ assetManifest }),
  setLocale: (locale) => set({ locale: saveLocalePreference(locale) }),
  newGame: () => {
    const introAlreadySeen = get().dialogueState.seenSceneIds.includes(GLASS_WAKE_INTRO_SCENE_ID);
    const dialogueState = introAlreadySeen
      ? { ...createInitialDialogueState(), seenSceneIds: [GLASS_WAKE_INTRO_SCENE_ID] }
      : createInitialDialogueState();
    const introPatch = introAlreadySeen
      ? {}
      : dialogueOpenPatch({ dialogueState, activeDialogue: undefined }, GLASS_WAKE_INTRO_SCENE_ID);
    set({
      screen: "flight",
      previousScreen: "menu",
      stationTab: "Market",
      galaxyMapMode: "browse",
      currentSystemId: "helion-reach",
      currentStationId: undefined,
      targetId: undefined,
      cameraMode: "chase",
      player: createInitialPlayer(),
      runtime: createRuntimeForSystem("helion-reach"),
      economyService: { status: "offline", url: ECONOMY_SERVICE_URL },
      economyEvents: [],
      economyPersonalOffers: [],
      economyNpcWatch: undefined,
      npcInteraction: undefined,
      npcObjective: undefined,
      autopilot: undefined,
      gameClock: 0,
      marketState: createInitialMarketState(),
      activeMissions: [],
      completedMissionIds: [],
      failedMissionIds: [],
      reputation: createInitialReputation(),
      factionHeat: createInitialFactionHeat(),
      knownSystems: getInitialKnownSystems("helion-reach"),
      knownPlanetIds: getInitialKnownPlanetIds(getInitialKnownSystems("helion-reach")),
      explorationState: createInitialExplorationState(),
      dialogueState,
      onboardingState: createInitialOnboardingState(0),
      activeDialogue: undefined,
      primaryCooldown: 0,
      secondaryCooldown: 0,
      activeSaveSlotId: undefined,
      ...introPatch
    });
  },
  loadGame: (slotId) => {
    const resolvedSlotId = slotId ?? getLatestSaveSlotId();
    const save = readSave(undefined, resolvedSlotId);
    if (!save) return false;
    const activeMissions = save.activeMissions.map(hydrateActiveMission);
    set({
      screen: "flight",
      previousScreen: "menu",
      galaxyMapMode: "browse",
      currentSystemId: save.currentSystemId,
      currentStationId: save.currentStationId,
      gameClock: save.gameClock,
      player: normalizePlayerEquipmentStats(save.player),
      activeMissions,
      completedMissionIds: save.completedMissionIds,
      failedMissionIds: save.failedMissionIds,
      marketState: save.marketState,
      reputation: save.reputation,
      factionHeat: save.factionHeat,
      knownSystems: save.knownSystems,
      knownPlanetIds: save.knownPlanetIds,
      explorationState: normalizeExplorationState(save.explorationState),
      dialogueState: normalizeDialogueState(save.dialogueState),
      onboardingState: normalizeOnboardingState(save.onboardingState, {
        completedMissionIds: save.completedMissionIds,
        gameClock: save.gameClock
      }),
      activeDialogue: undefined,
      runtime: createRuntimeForSystem(save.currentSystemId, activeMissions),
      economyService: { status: "offline", url: ECONOMY_SERVICE_URL, snapshotId: save.economySnapshotId },
      economyEvents: [],
      economyPersonalOffers: [],
      economyNpcWatch: undefined,
      npcInteraction: undefined,
      npcObjective: undefined,
      autopilot: undefined,
      hasSave: true,
      saveSlots: readSaveSlots(),
      activeSaveSlotId: resolvedSlotId,
      targetId: undefined
    });
    get().syncOnboardingProgress();
    audioSystem.play("ui-click");
    return true;
  },
  saveGame: (slotId) => {
    const state = get();
    const resolvedSlot = slotId ?? state.activeSaveSlotId ?? "auto";
    writeSave(savePayload(state), undefined, resolvedSlot);
    audioSystem.play("ui-click");
    set({ hasSave: true, activeSaveSlotId: resolvedSlot, saveSlots: readSaveSlots(), runtime: { ...get().runtime, message: `Game saved to ${resolvedSlot}.` } });
  },
  deleteSave: (slotId) => {
    deleteSaveSlot(slotId);
    set((state) => ({
      saveSlots: readSaveSlots(),
      hasSave: readSave() !== null,
      activeSaveSlotId: state.activeSaveSlotId === slotId ? undefined : state.activeSaveSlotId,
      runtime: { ...state.runtime, message: `Deleted ${slotId}.` }
    }));
  },
  refreshSaveSlots: () => set({ saveSlots: readSaveSlots(), hasSave: readSave() !== null }),
  payFactionFine: (factionId: FactionId) => {
    const state = get();
    const result = payFactionFinePure(state.factionHeat, factionId, state.player.credits, state.gameClock);
    if (!result.paid) {
      set({
        runtime: {
          ...state.runtime,
          message: result.record.fineCredits > state.player.credits
            ? `Insufficient credits for ${result.record.fineCredits.toLocaleString()} cr fine.`
            : "No outstanding fine."
        }
      });
      audioSystem.play("ui-click");
      return;
    }
    set({
      player: { ...state.player, credits: result.credits },
      factionHeat: result.factionHeat,
      runtime: {
        ...state.runtime,
        message: result.notification?.body ?? "Fine paid.",
        lawNotification: result.notification
      }
    });
    audioSystem.play("ui-click");
  },
  brokerBlackMarketAmnesty: (factionId: FactionId) => {
    const state = get();
    const station = state.currentStationId ? stationById[state.currentStationId] : undefined;
    if (!station) return;
    const result = applyBlackMarketAmnesty({
      station,
      targetFactionId: factionId,
      factionHeat: state.factionHeat,
      reputation: state.reputation,
      player: state.player,
      now: state.gameClock
    });
    if (result.ok) audioSystem.play("ui-click");
    set({
      player: result.player,
      factionHeat: result.factionHeat,
      reputation: result.reputation,
      runtime: { ...state.runtime, message: result.message }
    });
  },
  refreshEconomySnapshot: async () => {
    if (economyRefreshInFlight) return;
    economyRefreshInFlight = true;
    const requestedState = get();
    const requestedSystemId = requestedState.currentSystemId;
    const watchedNpcId = requestedState.screen === "economyWatch" ? requestedState.economyNpcWatch?.npcId : undefined;
    try {
      const [snapshotResult, watchedNpcResult] = await Promise.allSettled([
        fetchEconomySnapshot(requestedSystemId),
        watchedNpcId ? fetchEconomyNpc(watchedNpcId) : Promise.resolve(undefined)
      ] as const);
      const watchedNpcLost =
        watchedNpcId !== undefined && watchedNpcResult.status === "rejected" && isEconomyNotFoundError(watchedNpcResult.reason);

      if (snapshotResult.status === "rejected") {
        set((state) => offlineEconomyPatch(state, economyErrorMessage(snapshotResult.reason)));
        if (watchedNpcLost && get().economyNpcWatch?.npcId === watchedNpcId) {
          get().stopEconomyNpcWatch("NPC signal lost.");
        }
        return;
      }

      const watchedNpc = watchedNpcResult.status === "fulfilled" ? watchedNpcResult.value?.npc : undefined;
      const watchedNpcOfflineMessage =
        watchedNpcId !== undefined && watchedNpcResult.status === "rejected" && !watchedNpcLost
          ? economyErrorMessage(watchedNpcResult.reason)
          : undefined;

      set((state) => {
        if (state.currentSystemId !== requestedSystemId) return {};
        const activeWatchedNpcId = state.screen === "economyWatch" ? state.economyNpcWatch?.npcId : undefined;
        const effectiveWatchedNpc = watchedNpc?.id === activeWatchedNpcId ? watchedNpc : undefined;
        const preserveWatchedNpcId =
          watchedNpcLost && watchedNpcId === activeWatchedNpcId ? undefined : activeWatchedNpcId;
        const activeWatchOfflineMessage =
          watchedNpcOfflineMessage && watchedNpcId === activeWatchedNpcId ? watchedNpcOfflineMessage : undefined;
        const patch = applyEconomySnapshotPatch(state, snapshotResult.value, "snapshot", {
          watchedNpc: effectiveWatchedNpc,
          watchedNpcId: preserveWatchedNpcId
        });
        if (!activeWatchOfflineMessage) return patch;
        return {
          ...patch,
          economyService: {
            ...patch.economyService,
            status: "offline",
            lastError: activeWatchOfflineMessage
          }
        };
      });

      if (watchedNpcLost && get().economyNpcWatch?.npcId === watchedNpcId) {
        get().stopEconomyNpcWatch("NPC signal lost.");
      }
    } finally {
      economyRefreshInFlight = false;
    }
  },
  startEconomyStream: () => {
    if (closeEconomyStream) return;
    const close = connectEconomyEvents(
      (event: EconomyEvent) => {
        set((state) => ({
          economyService: {
            ...state.economyService,
            status: "connected",
            lastEvent: event.message,
            snapshotId: event.snapshotId ?? state.economyService.snapshotId,
            lastError: undefined
          }
        }));
        void get().refreshEconomySnapshot();
      },
      (message) => {
        closeEconomyStream?.();
        closeEconomyStream = undefined;
        set((state) => offlineEconomyPatch(state, message));
      }
    );
    if (close) closeEconomyStream = close;
  },
  stopEconomyStream: () => {
    closeEconomyStream?.();
    closeEconomyStream = undefined;
  },
  resetEconomyBackend: async () => {
    const requestedSystemId = get().currentSystemId;
    try {
      const snapshot = await postEconomyReset(requestedSystemId);
      set((state) => {
        if (state.currentSystemId !== requestedSystemId) return {};
        const patch = applyEconomySnapshotPatch(state, snapshot, "Economy state reset.");
        return {
          ...patch,
          runtime: {
            ...patch.runtime,
            message: "Economy backend reset."
          }
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Economy reset failed.";
      set((state) => ({
        ...offlineEconomyPatch(state, message),
        runtime: {
          ...state.runtime,
          message: `Economy reset failed: ${message}`
        }
      }));
    }
  },
  startEconomyNpcWatch: (npcId) => {
    const state = get();
    const npc = state.runtime.enemies.find((ship) => ship.id === npcId);
    if (!isWatchableEconomyNpc(npc)) {
      set({ runtime: { ...state.runtime, message: "NPC signal lost." } });
      return;
    }
    audioSystem.play("ui-click");
    set({
      screen: "economyWatch",
      previousScreen: state.screen,
      stationTab: "Economy",
      targetId: undefined,
      autopilot: undefined,
      input: emptyFlightInput(),
      economyNpcWatch: {
        npcId: npc.id,
        returnStationId: state.currentStationId,
        cameraMode: "cockpit",
        lookYaw: 0,
        lookPitch: 0,
        enteredAt: state.runtime.clock
      },
      npcInteraction: undefined,
      runtime: {
        ...state.runtime,
        message: `Watching ${npc.name}.`
      }
    });
  },
  stopEconomyNpcWatch: (reason) => {
    const state = get();
    const returnStationId = state.economyNpcWatch?.returnStationId ?? state.currentStationId;
    const returnStation = returnStationId ? stationById[returnStationId] : undefined;
    audioSystem.play("ui-click");
    set({
      screen: returnStation ? "station" : "flight",
      previousScreen: state.screen,
      currentSystemId: returnStation?.systemId ?? state.currentSystemId,
      currentStationId: returnStation?.id ?? state.currentStationId,
      stationTab: returnStation ? "Economy" : state.stationTab,
      targetId: undefined,
      economyNpcWatch: undefined,
      npcInteraction: undefined,
      input: emptyFlightInput(),
      runtime: {
        ...state.runtime,
        message: reason ?? (returnStation ? `Returned to ${returnStation.name}.` : "Returned from NPC watch.")
      }
    });
  },
  toggleEconomyNpcWatchCamera: () => {
    const state = get();
    if (!state.economyNpcWatch) return;
    audioSystem.play("ui-click");
    set({
      economyNpcWatch: {
        ...state.economyNpcWatch,
        cameraMode: state.economyNpcWatch.cameraMode === "cockpit" ? "chase" : "cockpit"
      }
    });
  },
  openNpcInteraction: (npcId, openedFrom = "flight") => {
    const state = get();
    const npc = economyNpcById(state, npcId);
    if (!npc) {
      set({ runtime: { ...state.runtime, message: "NPC signal lost." }, npcInteraction: undefined });
      return;
    }
    audioSystem.play("ui-click");
    set({
      targetId: npc.id,
      npcInteraction: {
        npcId: npc.id,
        openedFrom,
        openedAt: state.runtime.clock
      },
      runtime: {
        ...state.runtime,
        message: `Channel open: ${npc.name}.`
      }
    });
  },
  closeNpcInteraction: () => set({ npcInteraction: undefined }),
  executeNpcInteraction: async (action, npcId) => {
    const state = get();
    const npc = economyNpcById(state, npcId ?? state.npcInteraction?.npcId ?? state.economyNpcWatch?.npcId ?? state.targetId);
    if (!npc) {
      set({ runtime: { ...state.runtime, message: "NPC signal lost." }, npcInteraction: undefined });
      return;
    }
    const openedFrom = state.screen === "economyWatch" ? "watch" : "flight";
    const setInteractionMessage = (message: string, pending = false) => {
      set((latest) => ({
        npcInteraction: {
          npcId: npc.id,
          openedFrom,
          openedAt: latest.npcInteraction?.npcId === npc.id ? latest.npcInteraction.openedAt : latest.runtime.clock,
          lastAction: action,
          message,
          pending
        },
        runtime: { ...latest.runtime, message }
      }));
    };

    if (action === "hail") {
      audioSystem.play("ui-click");
      setInteractionMessage(hailMessageForNpc(npc, state.runtime.clock));
      return;
    }

    if (action === "escort") {
      if (!isEscortableNpc(npc)) {
        setInteractionMessage(`${npc.name} refuses escort terms.`);
        return;
      }
      if (shouldRouteToNpc(state, npc)) {
        audioSystem.play("ui-click");
        set(startNpcInteractionRoutePatch(state, npc, "escort"));
        return;
      }
      const rewardCredits = escortRewardForNpc(npc, state.currentSystemId);
      audioSystem.play("ui-click");
      set({
        npcObjective: {
          kind: "escort",
          npcId: npc.id,
          startedAt: state.gameClock,
          expiresAt: state.gameClock + NPC_ESCORT_SECONDS,
          progressSeconds: 0,
          rewardCredits,
          factionId: npc.factionId
        },
        npcInteraction: {
          npcId: npc.id,
          openedFrom,
          openedAt: state.npcInteraction?.npcId === npc.id ? state.npcInteraction.openedAt : state.runtime.clock,
          lastAction: action,
          message: `Escort accepted: stay within ${NPC_ESCORT_RANGE}m of ${npc.name}.`
        },
        runtime: {
          ...state.runtime,
          message: `Escort accepted: stay within ${NPC_ESCORT_RANGE}m of ${npc.name}.`
        }
      });
      return;
    }

    if (action === "rescue") {
      const threat = npc.distressThreatId
        ? state.runtime.enemies.find((ship) => ship.id === npc.distressThreatId && ship.hull > 0 && ship.deathTimer === undefined)
        : undefined;
      if (!hasActiveCivilianDistress(npc, state.runtime.clock) || !threat) {
        setInteractionMessage(`${npc.name} has no active distress lock.`);
        return;
      }
      audioSystem.play("ui-click");
      set({
        targetId: threat.id,
        npcObjective: {
          kind: "rescue",
          npcId: npc.id,
          threatId: threat.id,
          startedAt: state.gameClock,
          expiresAt: state.gameClock + NPC_RESCUE_SECONDS,
          progressSeconds: 0,
          rewardCredits: rescueRewardForNpc(npc, state.currentSystemId),
          factionId: npc.factionId
        },
        npcInteraction: {
          npcId: npc.id,
          openedFrom,
          openedAt: state.npcInteraction?.npcId === npc.id ? state.npcInteraction.openedAt : state.runtime.clock,
          lastAction: action,
          message: `Rescue vector locked: clear ${threat.name}.`
        },
        runtime: {
          ...state.runtime,
          message: `Rescue vector locked: clear ${threat.name}.`
        }
      });
      return;
    }

    if (action === "report" && !canReportNpc(state, npc)) {
      setInteractionMessage(`${npc.name} has nothing reportable on public channels.`);
      return;
    }
    if (action === "rob" && cargoUnits(npc.economyCargo) <= 0) {
      setInteractionMessage(`${npc.name} has no visible cargo to rob.`);
      return;
    }
    if (action === "rob" && shouldRouteToNpc(state, npc)) {
      audioSystem.play("ui-click");
      set(startNpcInteractionRoutePatch(state, npc, "rob"));
      return;
    }

    const backendAction = backendActionFor(action);
    if (!backendAction) return;
    setInteractionMessage(`${action.toUpperCase()} request pending...`, true);
    try {
      const result = await postEconomyNpcInteraction({
        action: backendAction,
        npcId: npc.id,
        systemId: state.currentSystemId
      });
      if (!result.ok) {
        setInteractionMessage(result.message);
        return;
      }
      set((latest) => {
        const latestNpc = economyNpcById(latest, npc.id) ?? npc;
        const patch = result.snapshot
          ? applyEconomySnapshotPatch(latest, result.snapshot, result.message)
          : {
              marketState: latest.marketState,
              runtime: latest.runtime,
              economyService: latest.economyService,
              economyEvents: result.event ? [...latest.economyEvents, result.event].slice(-12) : latest.economyEvents,
              economyPersonalOffers: latest.economyPersonalOffers
            };
        let player = latest.player;
        let reputation = latest.reputation;
        let factionHeat = latest.factionHeat;
        let lawNotification = latest.runtime.lawNotification;
        let message = result.message;
        let runtime = patch.runtime;
        if (action === "rob") {
          const consequenceKind = robberyIncidentKindForShip(latestNpc);
          if (consequenceKind) {
            const incident = applyFactionIncident({
              factionHeat,
              factionId: latestNpc.factionId,
              kind: consequenceKind,
              subjectName: latestNpc.name,
              now: latest.gameClock
            });
            factionHeat = incident.factionHeat;
            reputation = updateReputation(reputation, latestNpc.factionId, incident.reputationDelta);
            lawNotification = incident.notification;
            message = `${result.message} ${incident.notification.body}`;
          }
          const droppedLoot = lootForCargo(result.cargoDropped, latestNpc.position);
          runtime = {
            ...runtime,
            loot: [...runtime.loot, ...droppedLoot],
            effects: [
              ...runtime.effects,
              {
                id: projectileId("npc-rob-effect"),
                kind: "hit",
                position: latestNpc.position,
                color: "#ffb657",
                secondaryColor: "#ffffff",
                label: "Cargo dropped",
                particleCount: 12,
                spread: 24,
                size: 18,
                life: 0.7,
                maxLife: 0.7,
                velocity: [0, 10, 0]
              }
            ],
            enemies: runtime.enemies.map((ship) =>
              ship.id === latestNpc.id
                ? {
                    ...ship,
                    aiState: "retreat",
                    aiTargetId: undefined,
                    provokedByPlayer: true,
                    distressThreatId: "player",
                    distressCalledAt: runtime.clock
                  }
                : ship.role === "patrol" && lawNotification?.tone === "wanted"
                  ? { ...ship, aiState: "attack", aiTargetId: "player", scanProgress: 1 }
                  : ship
            )
          };
          audioSystem.play("loot");
        } else if (action === "report") {
          const factionId = reportRewardFaction(latest, latestNpc);
          reputation = updateReputation(reputation, factionId, 1);
          message = `${result.message} Reputation improved.`;
          audioSystem.play("mission-complete");
        }
        return {
          ...patch,
          player,
          reputation,
          factionHeat,
          runtime: {
            ...runtime,
            message,
            lawNotification
          },
          npcInteraction: {
            npcId: latestNpc.id,
            openedFrom,
            openedAt: latest.npcInteraction?.npcId === latestNpc.id ? latest.npcInteraction.openedAt : latest.runtime.clock,
            lastAction: action,
            message
          }
        };
      });
    } catch (error) {
      const message = economyErrorMessage(error);
      set((latest) => ({
        ...offlineEconomyPatch(latest, message),
        npcInteraction: {
          npcId: npc.id,
          openedFrom,
          openedAt: latest.npcInteraction?.npcId === npc.id ? latest.npcInteraction.openedAt : latest.runtime.clock,
          lastAction: action,
          message: `${action.toUpperCase()} failed: ${message}`
        },
        runtime: {
          ...latest.runtime,
          message: `${action.toUpperCase()} failed: ${message}`
        }
      }));
    }
  },
  setOnboardingCollapsed: (collapsed) => {
    set((state) => state.onboardingState ? { onboardingState: { ...state.onboardingState, collapsed } } : {});
  },
  skipOnboarding: () => {
    set((state) => state.onboardingState
      ? {
          onboardingState: {
            ...state.onboardingState,
            enabled: false,
            collapsed: true,
            completedAtGameTime: state.onboardingState.completedAtGameTime ?? state.gameClock
          },
          runtime: { ...state.runtime, message: "Flight checklist hidden." }
        }
      : {});
  },
  syncOnboardingProgress: () => {
    const patch = createOnboardingStorePatch(get());
    if (patch) set(patch);
  },
  setScreen: (screen) => set((state) => ({
    previousScreen: state.screen,
    screen,
    economyNpcWatch: screen === "economyWatch" ? state.economyNpcWatch : undefined,
    npcInteraction: screen === "flight" || screen === "economyWatch" ? state.npcInteraction : undefined
  })),
  setStationTab: (stationTab) => set({ stationTab, galaxyMapMode: stationTab === "Galaxy Map" ? "station-route" : get().galaxyMapMode }),
  openGalaxyMap: (galaxyMapMode) => set((state) => ({ previousScreen: state.screen, screen: "galaxyMap", galaxyMapMode })),
  setInput: (patch) => set((state) => ({ input: { ...state.input, ...patch } })),
  consumeMouse: () => {
    const { mouseDX: dx, mouseDY: dy } = get().input;
    set((state) => ({ input: { ...state.input, mouseDX: 0, mouseDY: 0 } }));
    return { dx, dy };
  },
  tick: (delta) => {
    const state = get();
    if (state.screen !== "flight" && state.screen !== "economyWatch") return;
    const now = state.runtime.clock + delta;
    const gameClock = state.gameClock + delta;
    const marketState = state.economyService.status === "connected" ? state.marketState : advanceMarketState(state.marketState, delta);
    let factionHeat = applyFactionHeatDecay(state.factionHeat, delta, gameClock);
    const input = state.input;
    const { dx, dy } = state.consumeMouse();

    if (state.screen === "economyWatch") {
      const watch = state.economyNpcWatch;
      const watchedNpc = watch ? state.runtime.enemies.find((ship) => ship.id === watch.npcId) : undefined;
      if (!watch || !isWatchableEconomyNpc(watchedNpc)) {
        get().stopEconomyNpcWatch("NPC signal lost.");
        return;
      }
      if (input.pause) {
        get().stopEconomyNpcWatch();
        return;
      }
      const runtime = {
        ...state.runtime,
        clock: now,
        storyNotification: state.runtime.storyNotification && state.runtime.storyNotification.expiresAt > gameClock
          ? state.runtime.storyNotification
          : undefined,
        lawNotification: state.runtime.lawNotification && state.runtime.lawNotification.expiresAt > gameClock
          ? state.runtime.lawNotification
          : undefined
      };
      const expiration = applyExpiredMissions({
        player: state.player,
        reputation: state.reputation,
        activeMissions: state.activeMissions,
        failedMissionIds: state.failedMissionIds,
        runtime,
        gameClock,
        marketState
      });
      if (expiration.expiredMissionIds.length > 0) audioSystem.play("mission-fail");
      const expiredStoryMission = expiration.expiredMissionIds
        .map((missionId) => state.activeMissions.find((mission) => mission.id === missionId))
        .find((mission) => mission?.storyCritical);
      const storyNotification = expiredStoryMission
        ? createStoryNotification("failed", expiredStoryMission.title, expiration.runtime.message, gameClock)
        : expiration.runtime.storyNotification;
      const nextWatch = {
        ...watch,
        cameraMode: input.toggleCamera ? (watch.cameraMode === "cockpit" ? "chase" as const : "cockpit" as const) : watch.cameraMode,
        lookYaw: clamp(watch.lookYaw - dx * 0.0024, -1.35, 1.35),
        lookPitch: clamp(watch.lookPitch - dy * 0.0024, -0.82, 0.82)
      };
      if (input.toggleCamera) audioSystem.play("ui-click");
      set({
        gameClock,
        marketState: expiration.marketState ?? marketState,
        player: expiration.player,
        reputation: expiration.reputation,
        factionHeat,
        activeMissions: expiration.activeMissions,
        failedMissionIds: expiration.failedMissionIds,
        runtime: {
          ...expiration.runtime,
          storyNotification,
          lawNotification: runtime.lawNotification
        },
        economyNpcWatch: nextWatch,
        input: emptyFlightInput()
      });
      return;
    }

    if (state.autopilot) {
      const controlInput: FlightInput = { ...input, mouseDX: dx, mouseDY: dy };
      const result = advanceAutopilotPatch({ state, delta, now, gameClock, marketState, controlInput });
      if (result) {
        for (const event of result.audioEvents ?? []) audioSystem.play(event);
        const navigatedPatch = withPatrolInterdiction(state, result.patch);
        const stationAutoSave = result.autoSave ? writeStationAutoSave({ ...state, ...navigatedPatch } as GameStore) : {};
        set({ ...navigatedPatch, ...stationAutoSave });
        return;
      }
    }

    let player = state.player;
    const equipmentEffects = getPlayerRuntimeEffects(player);
    const primaryWeapon = getActivePrimaryWeapon(player.equipment);
    const secondaryWeapon = getActiveSecondaryWeapon(player.equipment);
    const pitch = clamp(player.rotation[0] + dy * 0.0022 * player.stats.handling, -1.15, 1.15);
    const yaw = player.rotation[1] - dx * 0.0022 * player.stats.handling;
    const roll = clamp(player.rotation[2] + (input.rollLeft ? 1 : 0) * delta * 2.4 - (input.rollRight ? 1 : 0) * delta * 2.4, -0.9, 0.9) * 0.94;
    const throttle = clamp(player.throttle + (input.throttleUp ? delta * 0.55 : 0) - (input.throttleDown ? delta * 0.75 : 0), 0, 1);
    const afterburning = input.afterburner && player.energy > 12 && throttle > 0.08;
    const forward = forwardFromRotation([pitch, yaw, roll]);
    const velocity = integrateVelocity({
      currentVelocity: player.velocity,
      forward,
      targetThrottle: throttle,
      maxSpeed: player.stats.speed,
      afterburning,
      delta,
      acceleration: afterburning ? 4.6 : 2.85,
      damping: throttle <= 0.02 ? 0.55 : 0.82,
      afterburnerMultiplier: equipmentEffects.afterburnerMultiplier
    });
    player = {
      ...player,
      rotation: [pitch, yaw, roll],
      throttle,
      velocity,
      position: add(player.position, scale(velocity, delta)),
      energy: clamp(
        player.energy + delta * equipmentEffects.energyRegenPerSecond - (afterburning ? delta * equipmentEffects.afterburnerEnergyDrain : 0),
        0,
        player.stats.energy
      )
    };
    player = regenerateShield(player, player.stats.shield, now, delta, 8);
    if (equipmentEffects.hullRegenPerSecond > 0 && now - player.lastDamageAt >= equipmentEffects.hullRegenDelay && player.hull < player.stats.hull) {
      player = { ...player, hull: clamp(player.hull + equipmentEffects.hullRegenPerSecond * delta, 0, player.stats.hull) };
    }

    const convoyFires: Array<{ position: Vec3; targetPosition: Vec3; targetId: string; damage: number; projectileSpeed: number }> = [];
    let runtime: RuntimeState = {
      ...state.runtime,
      clock: now,
      enemies: state.runtime.enemies.map((ship) => ({
        ...ship,
        fireCooldown: ship.fireCooldown - delta,
        deathTimer: ship.deathTimer === undefined ? undefined : ship.deathTimer - delta
      })),
      convoys: state.runtime.convoys.map((convoy) => {
        const advanced = advanceConvoyEntity(convoy, state.runtime.enemies, delta, now);
        if (advanced.fire) convoyFires.push(advanced.fire);
        return advanced.convoy;
      }),
      salvage: state.runtime.salvage,
      loot: state.runtime.loot.map((loot) => ({
        ...loot,
        position: add(loot.position, scale(loot.velocity, delta)),
        velocity: scale(loot.velocity, Math.pow(0.08, delta))
      })),
      projectiles: state.runtime.projectiles.map((projectile) => ({ ...projectile, life: projectile.life - delta })),
      effects: state.runtime.effects
        .map((effect) => ({
          ...effect,
          life: effect.life - delta,
          position: add(effect.position, scale(effect.velocity ?? [0, 0, 0], delta)),
          endPosition: effect.endPosition ? add(effect.endPosition, scale(effect.velocity ?? [0, 0, 0], delta)) : undefined
        }))
        .filter((effect) => effect.life > 0),
      message: state.runtime.message
    };
    for (const fire of convoyFires) {
      runtime.projectiles.push({
        id: projectileId("convoy-laser"),
        owner: "npc",
        kind: "laser",
        position: fire.position,
        direction: normalize(sub(fire.targetPosition, fire.position)),
        speed: fire.projectileSpeed,
        damage: fire.damage,
        life: 1.8,
        targetId: fire.targetId
      });
    }
    let explorationState = state.explorationState;
    let knownPlanetIds = state.knownPlanetIds;
    let primaryCooldown = Math.max(0, state.primaryCooldown - delta);
    let secondaryCooldown = Math.max(0, state.secondaryCooldown - delta);
    let pendingDialogueSceneId: string | undefined;
    const target = runtime.enemies.find((ship) => ship.id === state.targetId && ship.hull > 0);
    let activeMissions = state.activeMissions;
    let echoLockMessage: string | undefined;
    const echoLockAdvance = advanceStoryEchoLock({
      runtime,
      activeMissions,
      player,
      targetId: state.targetId,
      delta,
      echoLockRangeBonus: equipmentEffects.echoLockRangeBonus,
      echoLockRateMultiplier: equipmentEffects.echoLockRateMultiplier
    });
    runtime = echoLockAdvance.runtime;
    activeMissions = echoLockAdvance.activeMissions;
    echoLockMessage = echoLockAdvance.message;
    let echoLockBlockedMessage: string | undefined;

    const nearestAsteroid = runtime.asteroids
      .filter((asteroid) => asteroid.amount > 0)
      .map((asteroid) => ({ asteroid, dist: distance(player.position, asteroid.position) }))
      .sort((a, b) => a.dist - b.dist)[0];

    const miningWeapon = getActiveMiningWeapon(player.equipment);
    const miningRange = miningWeapon?.range ?? 0;
    const miningActive = !!(
      input.firePrimary &&
      miningWeapon &&
      nearestAsteroid &&
      nearestAsteroid.dist < miningRange &&
      player.energy > MINING_MIN_ENERGY
    );
    if (miningActive && nearestAsteroid) {
      audioSystem.play("mining");
      const cargoAvailable = Math.max(0, player.stats.cargoCapacity - getOccupiedCargo(player.cargo, state.activeMissions));
      if (cargoAvailable <= 0) {
        runtime = { ...runtime, message: "Cargo hold full." };
      } else {
        runtime.effects.push({
          id: projectileId("mining-beam"),
          kind: "mining-beam",
          position: add(player.position, scale(forward, 12)),
          endPosition: nearestAsteroid.asteroid.position,
          color: getOreColor(nearestAsteroid.asteroid.resource),
          secondaryColor: "#eaffff",
          label: commodityById[nearestAsteroid.asteroid.resource].name,
          particleCount: 3,
          spread: 12,
          size: 1,
          life: 0.12,
          maxLife: 0.12
        });

        let miningMessage = `Mining ${commodityById[nearestAsteroid.asteroid.resource].name} vein · ${Math.round(nearestAsteroid.asteroid.miningProgress * 100)}%`;
        runtime = {
          ...runtime,
          asteroids: runtime.asteroids.map((asteroid) => {
            if (asteroid.id !== nearestAsteroid.asteroid.id) return asteroid;
            const progress = asteroid.miningProgress + getMiningProgressIncrement(asteroid.resource, delta) * equipmentEffects.miningProgressMultiplier;
            if (progress < 1) {
              miningMessage = `Mining ${commodityById[asteroid.resource].name} vein · ${Math.round(progress * 100)}%`;
              return { ...asteroid, miningProgress: progress };
            }

            const miningYield = Math.max(1, Math.round(MINING_YIELD_PER_CYCLE + equipmentEffects.miningYieldBonus));
            const chunk = Math.min(miningYield, asteroid.amount);
            const result = addCargoWithinCapacity(player, asteroid.resource, chunk, state.activeMissions);
            if (result.collected <= 0) {
              miningMessage = "Cargo hold full.";
              return asteroid;
            }

            player = result.player;
            runtime.effects.push({
              id: projectileId("ore-pop"),
              kind: "hit",
              position: add(asteroid.position, [asteroid.radius * 0.6, 0, 0]),
              color: getOreColor(asteroid.resource),
              secondaryColor: "#ffffff",
              label: `+${result.collected} ${commodityById[asteroid.resource].name}`,
              particleCount: 8,
              spread: 18,
              size: 9 + result.collected,
              life: 0.55,
              maxLife: 0.55,
              velocity: [0, 18, 0]
            });
            miningMessage = `Mined ${result.collected} ${commodityById[asteroid.resource].name}. Cargo ${getOccupiedCargo(player.cargo, state.activeMissions)}/${player.stats.cargoCapacity}.`;
            return { ...asteroid, amount: asteroid.amount - result.collected, miningProgress: 0 };
          }),
          message: miningMessage
        };
        const baseMiningDrain = miningWeapon.id === "mining-beam" ? MINING_ENERGY_DRAIN_PER_SECOND : miningWeapon.energyCost;
        player = { ...player, energy: clamp(player.energy - delta * baseMiningDrain * equipmentEffects.miningEnergyDrainMultiplier, 0, player.stats.energy) };
        primaryCooldown = Math.max(primaryCooldown, MINING_COOLDOWN_SECONDS);
      }
    } else if (input.firePrimary && primaryWeapon && primaryCooldown <= 0) {
      const primaryEnergyCost = Math.ceil(primaryWeapon.energyCost * equipmentEffects.weaponEnergyCostMultiplier);
      if (player.energy >= primaryEnergyCost) {
        runtime.projectiles.push({
          id: projectileId("laser"),
          owner: "player",
          kind: "laser",
          position: add(player.position, scale(forward, 16)),
          direction: target ? normalize(sub(target.position, player.position)) : forward,
          speed: primaryWeapon.speed,
          damage: Math.round(primaryWeapon.damage * equipmentEffects.weaponDamageMultiplier),
          life: primaryWeapon.speed > 0 ? primaryWeapon.range / primaryWeapon.speed : 1.4,
          targetId: target?.id
        });
        audioSystem.play("laser");
        player = { ...player, energy: player.energy - primaryEnergyCost };
        primaryCooldown = getWeaponCooldown(primaryWeapon, player.equipment);
      } else {
        runtime = { ...runtime, message: "Insufficient weapon energy." };
      }
    }

    if (input.fireSecondary && secondaryWeapon && secondaryCooldown <= 0 && player.missiles > 0) {
      runtime.projectiles.push({
        id: projectileId("missile"),
        owner: "player",
        kind: "missile",
        position: add(player.position, scale(forward, 18)),
        direction: target ? normalize(sub(target.position, player.position)) : forward,
        speed: secondaryWeapon.speed,
        damage: Math.round(secondaryWeapon.damage * equipmentEffects.weaponDamageMultiplier),
        life: secondaryWeapon.speed > 0 ? secondaryWeapon.range / secondaryWeapon.speed : 3.6,
        targetId: target?.id
      });
      audioSystem.play("missile");
      player = { ...player, missiles: player.missiles - 1 };
      secondaryCooldown = getWeaponCooldown(secondaryWeapon, player.equipment);
    }

    runtime.enemies = runtime.enemies.map((ship) => resolveCivilianDistress(ship, runtime.enemies, now));
    const pirates = sortPirateTargets(runtime.enemies);
    const graceActive = now < runtime.graceUntil;
    let reputation = state.reputation;
    let contrabandScanMessage: string | undefined;
    let lawNotification = state.runtime.lawNotification && state.runtime.lawNotification.expiresAt > gameClock
      ? state.runtime.lawNotification
      : undefined;
    const patrolSupportSpawns: FlightEntity[] = [];
    let patrolSupportMessage: string | undefined;
    const localLawFactionId = systemById[state.currentSystemId].factionId;
    runtime.enemies = runtime.enemies.map((ship) => {
      if (ship.hull <= 0 || ship.deathTimer !== undefined) return ship;
      const wantedByPatrol = ship.role === "patrol" && (isFactionWanted(factionHeat, ship.factionId, gameClock) || isFactionWanted(factionHeat, localLawFactionId, gameClock));
      const aiShip = wantedByPatrol ? { ...ship, aiState: "attack" as const, aiTargetId: "player", scanProgress: 1 } : ship;
      if (aiShip.economyStatus && !isHostileToPlayer(aiShip) && !hasLocalCombatThreat(aiShip, runtime.enemies, now)) {
        return regenerateShield(
          {
            ...aiShip,
            position: add(aiShip.position, scale(aiShip.velocity, delta))
          },
          aiShip.maxShield,
          now,
          delta,
          5
        );
      }
      const ai = resolveCombatAiStep({
        ship: aiShip,
        systemId: state.currentSystemId,
        risk: systemById[state.currentSystemId].risk,
        playerPosition: player.position,
        playerHasContraband: (player.cargo["illegal-contraband"] ?? 0) > 0,
        contrabandScanProgressMultiplier: equipmentEffects.contrabandScanProgressMultiplier,
        delta,
        now,
        graceUntil: runtime.graceUntil,
        pirates,
        ships: runtime.enemies,
        convoys: runtime.convoys
      });
      let moved = {
        ...ai.ship,
        velocity: scale(ai.desiredDirection, ai.speed),
        position: add(ship.position, scale(ai.desiredDirection, ai.speed * delta))
      };
      moved = resolveCivilianDistress(moved, runtime.enemies, now);
      if (ai.scanComplete) {
        const law = getContrabandLaw(state.currentSystemId);
        const contrabandAmount = player.cargo["illegal-contraband"] ?? 0;
        if (contrabandAmount > 0 && law.disposition === "fine-confiscate") {
          const fine = Math.ceil(contrabandAmount * CONTRABAND_FINE_PER_UNIT * equipmentEffects.contrabandFineMultiplier);
          const paid = Math.min(player.credits, fine);
          const cargo = { ...player.cargo };
          delete cargo["illegal-contraband"];
          player = {
            ...player,
            cargo,
            credits: player.credits - paid
          };
          const incident = applyFactionIncident({
            factionHeat,
            factionId: localLawFactionId,
            kind: "contraband-fine",
            now: gameClock,
            fineCredits: fine - paid
          });
          factionHeat = incident.factionHeat;
          reputation = updateReputation(reputation, localLawFactionId, incident.reputationDelta);
          lawNotification = incident.notification;
          moved = { ...moved, scanProgress: undefined, aiState: "patrol", aiTargetId: undefined };
          contrabandScanMessage = `${law.label}: ${contrabandAmount} Illegal Contraband confiscated. Fine ${fine.toLocaleString()} cr.`;
        } else if (contrabandAmount > 0 && law.disposition === "hostile-pursuit") {
          const incident = applyFactionIncident({
            factionHeat,
            factionId: localLawFactionId,
            kind: "contraband-hostile",
            now: gameClock
          });
          factionHeat = incident.factionHeat;
          reputation = updateReputation(reputation, localLawFactionId, incident.reputationDelta);
          lawNotification = incident.notification;
          moved = { ...moved, aiState: "attack", aiTargetId: "player", scanProgress: 1 };
          contrabandScanMessage = `${law.label}: patrol has marked you hostile for Illegal Contraband.`;
        }
      }
      const supportRequest = createPatrolSupportRequest({
        ship: moved,
        enemies: runtime.enemies,
        convoys: runtime.convoys,
        systemId: state.currentSystemId,
        risk: systemById[state.currentSystemId].risk,
        playerPosition: player.position,
        now,
        existingSpawnCount: patrolSupportSpawns.length
      });
      if (supportRequest) {
        moved = supportRequest.requestedShip;
        patrolSupportSpawns.push(...supportRequest.ships);
        patrolSupportMessage = supportRequest.message;
        for (const position of supportRequest.effectPositions) {
          runtime.effects.push({
            id: projectileId("patrol-support"),
            kind: "nav-ring",
            position,
            color: "#64e4ff",
            secondaryColor: "#eaffff",
            label: "SUPPORT",
            particleCount: 0,
            spread: 1,
            size: 58,
            life: 0.8,
            maxLife: 0.8
          });
        }
      }
      if (ai.fire) {
        runtime.projectiles.push({
          id: projectileId(ai.fire.owner === "patrol" ? "patrol-laser" : "enemy-laser"),
          owner: ai.fire.owner,
          kind: "laser",
          position: moved.position,
          direction: normalize(sub(ai.fire.targetPosition, moved.position)),
          speed: ai.fire.projectileSpeed,
          damage: ai.fire.damage,
          life: 1.8,
          targetId: ai.fire.targetId
        });
        return { ...moved, fireCooldown: ai.fire.cooldownMin + Math.random() * (ai.fire.cooldownMax - ai.fire.cooldownMin) };
      }
      return regenerateShield(moved, moved.maxShield, now, delta, 5);
    });
    if (patrolSupportSpawns.length > 0) {
      runtime = {
        ...runtime,
        enemies: [...runtime.enemies, ...patrolSupportSpawns],
        message: runtime.message === state.runtime.message ? patrolSupportMessage ?? runtime.message : runtime.message
      };
    }

    if (runtime.explorationScan) {
      const signal = explorationSignalById[runtime.explorationScan.signalId];
      if (!signal || explorationState.completedSignalIds.includes(runtime.explorationScan.signalId) || !isExplorationSignalUnlocked(signal, explorationState)) {
        runtime = { ...runtime, explorationScan: undefined };
      } else if (!hasRequiredSignalEquipment(signal, player.equipment)) {
        runtime = {
          ...runtime,
          explorationScan: undefined,
          message: `${signal.title} requires ${requiredSignalEquipmentLabel(signal)}.`
        };
      } else {
        const scanDistance = distance(player.position, signal.position);
        const inRange = scanDistance <= getEffectiveSignalScanRange(signal, equipmentEffects);
        const inBand = inRange && isFrequencyInSignalBand(signal, runtime.explorationScan.frequency, equipmentEffects);
        const progress = clamp(
          runtime.explorationScan.progress + (inBand ? (delta * getEffectiveSignalScanRateMultiplier(equipmentEffects)) / signal.scanTime : -delta * 0.22),
          0,
          1
        );
        if (progress >= 1) {
          const result = applyExplorationReward({
            signalId: signal.id,
            player,
            reputation,
            explorationState,
            knownPlanetIds,
            activeMissions: state.activeMissions
          });
          player = result.player;
          reputation = result.reputation;
          explorationState = result.explorationState;
          knownPlanetIds = result.knownPlanetIds;
          pendingDialogueSceneId = getExplorationDialogueScene(signal.id)?.id;
          runtime = {
            ...runtime,
            explorationScan: undefined,
            message: result.message,
            effects: [
              ...runtime.effects,
              {
                id: projectileId("exploration-resolved"),
                kind: "nav-ring",
                position: signal.position,
                color: "#9bffe8",
                secondaryColor: "#fff6d6",
                label: "RESOLVED",
                particleCount: 0,
                spread: 1,
                size: 68,
                life: 0.7,
                maxLife: 0.7
              }
            ]
          };
          audioSystem.play("mission-complete");
        } else {
          runtime = {
            ...runtime,
            explorationScan: {
              ...runtime.explorationScan,
              progress,
              inBand,
              distance: scanDistance
            },
            message: inRange
              ? inBand
                ? `Frequency lock on ${signal.title}: ${Math.round(progress * 100)}%.`
                : `Tuning ${signal.title}: align frequency inside ${getEffectiveSignalScanBand(signal, equipmentEffects).join("-")}.`
              : `${signal.title} scan paused. Return within ${Math.round(getEffectiveSignalScanRange(signal, equipmentEffects))}m.`
          };
        }
      }
    }

    const remainingProjectiles: ProjectileEntity[] = [];
    const lootDrops: LootEntity[] = [];
    let destroyedPirates = runtime.destroyedPirates;
    const destroyedStoryTargets: Array<{ missionId: string; targetId: string; name: string }> = [];
    let destroyedBossName: string | undefined;
    let patrolsShouldAttackPlayer = false;
    let playerAggressionMessage: string | undefined;
    for (const projectile of runtime.projectiles) {
      if (projectile.life <= 0) continue;
      let direction = projectile.direction;
      if (projectile.kind === "missile" && projectile.targetId) {
        const missileTarget = runtime.enemies.find((ship) => ship.id === projectile.targetId && ship.hull > 0);
        if (missileTarget) direction = normalize(sub(missileTarget.position, projectile.position));
      }
      const movedProjectile = { ...projectile, direction, position: add(projectile.position, scale(direction, projectile.speed * delta)) };
      let consumed = false;
      if (projectile.owner === "enemy" && projectile.targetId) {
        runtime.convoys = runtime.convoys.map((convoy) => {
          if (convoy.id !== projectile.targetId || convoy.hull <= 0 || consumed || distance(movedProjectile.position, convoy.position) > 25) return convoy;
          const shielded = convoy.shield > 0;
          const damaged = applyDamage(convoy, projectile.damage, now);
          consumed = true;
          runtime.effects.push({
            id: projectileId(shielded ? "convoy-shield-hit" : "convoy-hit"),
            kind: shielded ? "shield-hit" : "hit",
            position: movedProjectile.position,
            color: shielded ? "#69e4ff" : "#ffb657",
            secondaryColor: "#ffffff",
            label: `-${Math.round(projectile.damage)}`,
            particleCount: 5,
            spread: 16,
            size: shielded ? 22 : 14,
            life: 0.34,
            maxLife: 0.34,
            velocity: [0, 8, 0]
          });
          return damaged;
        });
      }

      if (!consumed && projectile.targetId && projectile.owner !== "player") {
        runtime.enemies = runtime.enemies.map((ship) => {
          if (ship.id !== projectile.targetId || ship.hull <= 0 || ship.deathTimer !== undefined || consumed || distance(movedProjectile.position, ship.position) > 25) return ship;
          const shielded = ship.shield > 0;
          let damaged = applyDamage(ship, projectile.damage, now);
          if (projectile.owner === "enemy" && ["trader", "freighter", "courier", "miner"].includes(ship.role)) {
            const threat = runtime.enemies.find((enemy) =>
              enemy.id !== ship.id &&
              enemy.aiTargetId === ship.id &&
              enemy.hull > 0 &&
              enemy.deathTimer === undefined &&
              (enemy.storyTarget || enemy.role === "pirate" || enemy.role === "drone" || enemy.role === "relay")
            );
            damaged = { ...damaged, distressThreatId: threat?.id ?? ship.distressThreatId ?? "hostile-contact", distressCalledAt: now };
          }
          const echoProtection = protectEchoLockedStoryTargetDeath(damaged, ship, activeMissions);
          if (echoProtection.blocked) {
            damaged = echoProtection.ship;
            echoLockBlockedMessage = `Echo Lock required: hold ${ship.name} in range before lethal damage.`;
          }
          consumed = true;
          runtime.effects.push({
            id: projectileId(shielded ? "shield-hit" : "hit"),
            kind: shielded ? "shield-hit" : "hit",
            position: movedProjectile.position,
            color: shielded ? "#69e4ff" : "#ff8a6a",
            secondaryColor: shielded ? "#eaffff" : "#ffd166",
            label: `-${Math.round(projectile.damage)}`,
            particleCount: 5,
            spread: 12,
            size: 12,
            life: 0.34,
            maxLife: 0.34,
            velocity: [0, 10, 0]
          });
          if (damaged.hull <= 0 && ship.hull > 0) {
            if (ship.role === "pirate") destroyedPirates += 1;
            if (ship.boss) destroyedBossName = ship.name;
            if (ship.storyTarget && ship.missionId) destroyedStoryTargets.push({ missionId: ship.missionId, targetId: ship.id, name: ship.name });
            lootDrops.push(...lootDropsForDestroyedShip(ship, state.currentSystemId));
            runtime.effects.push({
              id: projectileId("explosion"),
              kind: "explosion",
              position: ship.position,
              color: ship.role === "pirate" ? "#ff784f" : ship.role === "patrol" ? "#64e4ff" : "#ffd166",
              secondaryColor: "#ffd166",
              label: "Destroyed",
              particleCount: 22,
              spread: 58,
              size: 46,
              life: 0.85,
              maxLife: 0.85,
              velocity: [0, 6, 0]
            });
            audioSystem.play("explosion");
            if (shouldReportEconomyNpcDestroyed(ship)) {
              void postNpcDestroyed({ npcId: ship.id, systemId: state.currentSystemId }).catch(() => undefined);
            }
            return { ...damaged, deathTimer: 0.42 };
          }
          return damaged;
        });
      }

      if (!consumed && projectile.owner === "enemy" && distance(movedProjectile.position, player.position) < 22) {
        const shielded = player.shield > 0;
        const previousShield = player.shield;
        const previousHullRatio = player.hull / player.stats.hull;
        player = applyDamage(player, projectile.damage, now);
        if (previousShield > 0 && player.shield <= 0) audioSystem.play("shield-break");
        if (previousHullRatio > 0.3 && player.hull / player.stats.hull <= 0.3) audioSystem.play("low-hull");
        runtime.effects.push({
          id: projectileId(shielded ? "shield-hit" : "player-hit"),
          kind: shielded ? "shield-hit" : "hit",
          position: player.position,
          color: shielded ? "#69e4ff" : "#ff6270",
          secondaryColor: shielded ? "#eaffff" : "#ffd166",
          label: `-${Math.round(projectile.damage)}`,
          particleCount: shielded ? 5 : 7,
          spread: shielded ? 18 : 14,
          size: shielded ? 28 : 16,
          life: 0.42,
          maxLife: 0.42,
          velocity: [0, 12, 0]
        });
        consumed = true;
      } else if (!consumed && projectile.owner === "player") {
        runtime.enemies = runtime.enemies.map((ship) => {
          const validTarget = ship.hull > 0 && ship.deathTimer === undefined;
          if (!validTarget || ship.hull <= 0 || ship.deathTimer !== undefined || consumed || distance(movedProjectile.position, ship.position) > 25) return ship;
          const shielded = ship.shield > 0;
          const wasHostile = isHostileToPlayer(ship);
          let damaged = applyDamage(ship, projectile.damage, now);
          const echoProtection = protectEchoLockedStoryTargetDeath(damaged, ship, activeMissions);
          if (echoProtection.blocked) {
            damaged = echoProtection.ship;
            echoLockBlockedMessage = `Echo Lock required: hold ${ship.name} in range before lethal damage.`;
          }
          const destroyedByHit = damaged.hull <= 0 && ship.hull > 0;
          const consequenceKind = !ship.storyTarget ? incidentKindForShip(ship.role, destroyedByHit) : undefined;
          if (consequenceKind && (!wasHostile || ship.provokedByPlayer || destroyedByHit)) {
            const warningActive = hasActiveFriendlyFireWarning(factionHeat, ship.factionId, gameClock);
            if (!destroyedByHit && !ship.provokedByPlayer && !warningActive) {
              const warning = applyFriendlyFireWarning(factionHeat, ship.factionId, ship.name, gameClock);
              factionHeat = warning.factionHeat;
              lawNotification = warning.notification;
              playerAggressionMessage = warning.notification.body;
              audioSystem.play("ui-click");
            } else {
              const incident = applyFactionIncident({
                factionHeat,
                factionId: ship.factionId,
                kind: consequenceKind,
                subjectName: ship.name,
                now: gameClock
              });
              factionHeat = incident.factionHeat;
              reputation = updateReputation(reputation, ship.factionId, incident.reputationDelta);
              lawNotification = incident.notification;
              patrolsShouldAttackPlayer = ship.role !== "smuggler";
              playerAggressionMessage = incident.notification.body;
              damaged = {
                ...damaged,
                aiState: "attack",
                aiTargetId: "player",
                provokedByPlayer: true,
                distressThreatId: "player",
                distressCalledAt: now
              };
              audioSystem.play(incident.wanted ? "mission-fail" : "ui-click");
            }
          }
          consumed = true;
          runtime.effects.push({
            id: projectileId(shielded ? "shield-hit" : "hit"),
            kind: shielded ? "shield-hit" : "hit",
            position: movedProjectile.position,
            color: shielded ? "#69e4ff" : "#ff8a6a",
            secondaryColor: shielded ? "#eaffff" : "#ffd166",
            label: `-${Math.round(projectile.damage)}`,
            particleCount: projectile.kind === "missile" ? 10 : 5,
            spread: projectile.kind === "missile" ? 22 : 12,
            size: projectile.kind === "missile" ? 22 : 12,
            life: 0.34,
            maxLife: 0.34,
            velocity: [0, 10, 0]
          });
          if (damaged.hull <= 0 && ship.hull > 0) {
            if (ship.role === "pirate") {
              destroyedPirates += 1;
              const bounty = bountyRewardForShip(ship);
              player = { ...player, credits: player.credits + bounty };
              reputation = updateReputation(reputation, localLawFactionId, ship.boss ? 3 : ship.elite ? 2 : 1);
              lawNotification = createBountyNotification(ship.name, bounty, gameClock);
              playerAggressionMessage = lawNotification.body;
              audioSystem.play("mission-complete");
            }
            if (ship.boss) destroyedBossName = ship.name;
            if (ship.storyTarget && ship.missionId) destroyedStoryTargets.push({ missionId: ship.missionId, targetId: ship.id, name: ship.name });
            lootDrops.push(...lootDropsForDestroyedShip(ship, state.currentSystemId));
            runtime.effects.push({
              id: projectileId("explosion"),
              kind: "explosion",
              position: ship.position,
              color: ship.role === "pirate" ? "#ff784f" : ship.role === "patrol" ? "#64e4ff" : "#ffd166",
              secondaryColor: "#ffd166",
              label: "Destroyed",
              particleCount: 22,
              spread: 58,
              size: 46,
              life: 0.85,
              maxLife: 0.85,
              velocity: [0, 6, 0]
            });
            audioSystem.play("explosion");
            if (shouldReportEconomyNpcDestroyed(ship)) {
              void postNpcDestroyed({ npcId: ship.id, systemId: state.currentSystemId }).catch(() => undefined);
            }
            return { ...damaged, deathTimer: 0.42 };
          }
          return damaged;
        });
      }
      if (!consumed) remainingProjectiles.push(movedProjectile);
    }
    if (patrolsShouldAttackPlayer) {
      runtime.enemies = runtime.enemies.map((ship) =>
        ship.role === "patrol" && ship.hull > 0 && ship.deathTimer === undefined
          ? { ...ship, aiState: "attack", aiTargetId: "player", scanProgress: 1 }
          : ship
      );
    }
    runtime.enemies = runtime.enemies.map((ship) => resolveCivilianDistress(ship, runtime.enemies, now));
    const civilianDistress = getActiveCivilianDistress(runtime.enemies, now)[0];
    const distressMessage = civilianDistress
      ? `Distress call: ${civilianDistress.civilian.name} under attack by ${civilianDistress.threat.name}.`
      : undefined;
    let npcObjective = state.npcObjective;
    let npcObjectiveMessage: string | undefined;
    if (npcObjective) {
      const objectiveNpc = runtime.enemies.find((ship) => ship.id === npcObjective?.npcId && ship.hull > 0 && ship.deathTimer === undefined);
      if (!objectiveNpc) {
        npcObjectiveMessage = "NPC objective failed: contact lost.";
        npcObjective = undefined;
      } else if (gameClock >= npcObjective.expiresAt) {
        npcObjectiveMessage = `${npcObjective.kind === "escort" ? "Escort" : "Rescue"} failed: response window expired.`;
        npcObjective = undefined;
      } else if (npcObjective.kind === "escort") {
        const closeEnough = distance(player.position, objectiveNpc.position) <= NPC_ESCORT_RANGE;
        const progressSeconds = closeEnough ? npcObjective.progressSeconds + delta : npcObjective.progressSeconds;
        const routeTargetId = objectiveNpc.economyTargetId ?? objectiveNpc.economyHomeStationId;
        const routeTarget = routeTargetId ? stationById[routeTargetId] : undefined;
        const arrivedAtRouteTarget = !!routeTarget && distance(objectiveNpc.position, routeTarget.position) < 190;
        if (progressSeconds >= NPC_ESCORT_PROGRESS_SECONDS || arrivedAtRouteTarget) {
          player = { ...player, credits: player.credits + npcObjective.rewardCredits };
          reputation = updateReputation(reputation, npcObjective.factionId, 1);
          npcObjectiveMessage = `Escort complete: ${objectiveNpc.name} paid ${npcObjective.rewardCredits.toLocaleString()} cr.`;
          npcObjective = undefined;
          audioSystem.play("mission-complete");
        } else {
          npcObjective = { ...npcObjective, progressSeconds };
          npcObjectiveMessage = closeEnough
            ? `Escort active: ${Math.ceil(NPC_ESCORT_PROGRESS_SECONDS - progressSeconds)}s coverage remaining.`
            : `Escort active: return within ${NPC_ESCORT_RANGE}m of ${objectiveNpc.name}.`;
        }
      } else {
        const threat = npcObjective.threatId
          ? runtime.enemies.find((ship) => ship.id === npcObjective?.threatId && ship.hull > 0 && ship.deathTimer === undefined)
          : undefined;
        const threatCleared = !threat || distance(threat.position, objectiveNpc.position) > NPC_RESCUE_CLEAR_RANGE;
        if (threatCleared) {
          const completedObjective = npcObjective;
          npcObjective = undefined;
          npcObjectiveMessage = `Rescue cleared: confirming ${objectiveNpc.name} with traffic control.`;
          void postEconomyNpcInteraction({
            action: "rescue",
            npcId: completedObjective.npcId,
            systemId: state.currentSystemId
          })
            .then((result) => {
              if (!result.ok) throw new Error(result.message);
              set((latest) => {
                const patch = result.snapshot
                  ? applyEconomySnapshotPatch(latest, result.snapshot, result.message)
                  : {
                      marketState: latest.marketState,
                      runtime: latest.runtime,
                      economyService: latest.economyService,
                      economyEvents: result.event ? [...latest.economyEvents, result.event].slice(-12) : latest.economyEvents,
                      economyPersonalOffers: latest.economyPersonalOffers
                    };
                return {
                  ...patch,
                  player: { ...latest.player, credits: latest.player.credits + completedObjective.rewardCredits },
                  reputation: updateReputation(latest.reputation, completedObjective.factionId, 1),
                  runtime: {
                    ...patch.runtime,
                    message: `${result.message} Rescue reward ${completedObjective.rewardCredits.toLocaleString()} cr.`
                  }
                };
              });
              audioSystem.play("mission-complete");
            })
            .catch((error) => {
              const message = economyErrorMessage(error);
              set((latest) => ({
                ...offlineEconomyPatch(latest, message),
                runtime: {
                  ...latest.runtime,
                  message: `RESCUE failed: ${message}`
                }
              }));
            });
        } else {
          npcObjectiveMessage = `Rescue active: clear ${threat.name}.`;
        }
      }
    }
    runtime = {
      ...runtime,
      projectiles: remainingProjectiles,
      enemies: runtime.enemies.filter((ship) => ship.hull > 0 || (ship.deathTimer ?? 0) > 0),
      loot: [...runtime.loot, ...lootDrops],
      destroyedPirates,
      message: playerAggressionMessage ?? echoLockBlockedMessage ?? echoLockMessage ?? npcObjectiveMessage ?? (destroyedBossName ? `${destroyedBossName} destroyed. Boss cargo scattered.` : runtime.message)
    };

    activeMissions = destroyedStoryTargets.length > 0
      ? activeMissions.map((mission) => {
          const targetKills = destroyedStoryTargets.filter((target) => target.missionId === mission.id);
          return targetKills.reduce((nextMission, target) => markStoryTargetDestroyed(nextMission, target.targetId), mission);
        })
      : activeMissions;
    let spawnedStoryTarget: FlightEntity | undefined;
    if (destroyedStoryTargets.length > 0) {
      const previousEnemyIds = new Set(runtime.enemies.map((ship) => ship.id));
      activeMissions.forEach((mission) => {
        runtime = addMissionRuntimeEntity(runtime, mission, state.currentSystemId);
      });
      spawnedStoryTarget = runtime.enemies.find((ship) => ship.storyTarget && !previousEnemyIds.has(ship.id));
      if (spawnedStoryTarget) {
        const effect = navEffect(spawnedStoryTarget.position, spawnedStoryTarget.boss ? "BOSS WAKE" : "STORY TARGET");
        runtime = {
          ...runtime,
          effects: [
            ...runtime.effects,
            {
              ...effect,
              color: spawnedStoryTarget.boss ? "#ff4e5f" : "#ff9bd5",
              secondaryColor: spawnedStoryTarget.boss ? "#ffd166" : "#9bffe8",
              size: spawnedStoryTarget.boss ? 92 : 62,
              life: spawnedStoryTarget.boss ? 0.9 : 0.45,
              maxLife: spawnedStoryTarget.boss ? 0.9 : 0.45
            }
          ]
        };
      }
    }
    const storyTargetMessage = destroyedStoryTargets.length > 0
      ? `${destroyedStoryTargets[destroyedStoryTargets.length - 1].name} destroyed. Story objective updated.${spawnedStoryTarget ? ` ${spawnedStoryTarget.name} emerged from the wake.` : ""}`
      : undefined;
    let storyNotification = state.runtime.storyNotification && state.runtime.storyNotification.expiresAt > gameClock
      ? state.runtime.storyNotification
      : undefined;
    if (storyTargetMessage) {
      const lastStoryTarget = destroyedStoryTargets[destroyedStoryTargets.length - 1];
      const storyMission = activeMissions.find((mission) => mission.id === lastStoryTarget?.missionId);
      if (storyMission?.storyCritical) {
        storyNotification = createStoryNotification("updated", storyMission.title, storyTargetMessage, gameClock);
      }
    }
    activeMissions = activeMissions.map((mission) => {
      const convoy = runtime.convoys.find((item) => item.missionId === mission.id);
      return convoy?.arrived && mission.escort && !mission.escort.arrived ? markEscortArrived(mission) : mission;
    });
    let failedMissionIds = state.failedMissionIds;
    for (const convoy of runtime.convoys.filter((item) => item.hull <= 0)) {
      const mission = activeMissions.find((candidate) => candidate.id === convoy.missionId);
      if (!mission) continue;
      const result = failMissionPure(mission, player, reputation, "Escort convoy destroyed");
      player = result.player;
      reputation = result.reputation;
      activeMissions = activeMissions.filter((candidate) => candidate.id !== mission.id);
      failedMissionIds = Array.from(new Set([...failedMissionIds, mission.id]));
      audioSystem.play("mission-fail");
      runtime.effects.push({
        id: projectileId("convoy-explosion"),
        kind: "explosion",
        position: convoy.position,
        color: "#ffb657",
        secondaryColor: "#ff4e5f",
        label: "Convoy lost",
        particleCount: 24,
        spread: 62,
        size: 44,
        life: 0.85,
        maxLife: 0.85
      });
      audioSystem.play("explosion");
      runtime.message = `${mission.title} failed: convoy destroyed.`;
      if (mission.storyCritical) {
        storyNotification = createStoryNotification("failed", mission.title, runtime.message, gameClock);
      }
    }
    runtime = { ...runtime, convoys: runtime.convoys.filter((convoy) => convoy.hull > 0 && !failedMissionIds.includes(convoy.missionId)) };
    const planetDiscovery = discoverNearbyPlanets(state.currentSystemId, player.position, knownPlanetIds);
    knownPlanetIds = planetDiscovery.knownPlanetIds;
    if (planetDiscovery.discovered.length > 0) {
      const names = planetDiscovery.discovered.map((planet) => planet.name).join(", ");
      runtime = {
        ...runtime,
        message: `Navigation scan complete: ${names} station beacon unlocked.`
      };
      audioSystem.play("ui-click");
    }

    if (input.interact) {
      get().interact();
      set((latest) => ({ input: { ...latest.input, interact: false } }));
      return;
    }
    if (input.cycleTarget) {
      get().cycleTarget();
      set((latest) => ({ input: { ...latest.input, cycleTarget: false } }));
    }
    if (input.toggleMap) {
      set({ screen: "galaxyMap", previousScreen: "flight", galaxyMapMode: "station-route" });
      set((latest) => ({ input: { ...latest.input, toggleMap: false } }));
    }
    if (input.toggleCamera) {
      get().toggleCamera();
      set((latest) => ({ input: { ...latest.input, toggleCamera: false } }));
    }
    if (input.pause) {
      set({ screen: "pause", previousScreen: "flight", input: { ...get().input, pause: false } });
    }

    const expiration = applyExpiredMissions({
      player,
      reputation,
      activeMissions,
      failedMissionIds,
      runtime,
      gameClock,
      marketState
    });
    if (expiration.expiredMissionIds.length > 0) audioSystem.play("mission-fail");
    const missionFailedThisFrame = expiration.failedMissionIds.length > failedMissionIds.length;
    const expiredStoryMission = expiration.expiredMissionIds
      .map((missionId) => activeMissions.find((mission) => mission.id === missionId))
      .find((mission) => mission?.storyCritical);
    if (expiredStoryMission) {
      storyNotification = createStoryNotification("failed", expiredStoryMission.title, expiration.runtime.message, gameClock);
    }
    const explorationMessageActive = !!state.runtime.explorationScan || !!runtime.explorationScan || explorationState !== state.explorationState;
    const dialoguePatch = pendingDialogueSceneId ? eventDialogueOpenPatch(state, pendingDialogueSceneId) : {};

    set({
      player: expiration.player,
      runtime: {
        ...expiration.runtime,
        message:
          expiration.player.hull <= 0
            ? "Hull integrity failed."
            : missionFailedThisFrame
              ? expiration.runtime.message
            : contrabandScanMessage
              ? contrabandScanMessage
            : storyTargetMessage
              ? storyTargetMessage
            : echoLockBlockedMessage
              ? echoLockBlockedMessage
            : echoLockMessage
              ? echoLockMessage
            : destroyedBossName
              ? `${destroyedBossName} destroyed. Boss cargo scattered.`
            : npcObjectiveMessage
              ? npcObjectiveMessage
            : lawNotification
              ? lawNotification.body
            : lootDrops.length
              ? "Target destroyed. Cargo canister released."
            : miningActive
              ? expiration.runtime.message
            : explorationMessageActive
              ? expiration.runtime.message
            : distressMessage && (!expiration.runtime.message || expiration.runtime.message.startsWith("Distress call") || expiration.runtime.message.startsWith("Patrol support wing"))
              ? distressMessage
            : graceActive
              ? `Pirates are sizing you up · weapons free in ${Math.ceil(runtime.graceUntil - now)}s`
              : expiration.runtime.message,
        storyNotification,
        lawNotification
      },
      gameClock,
      marketState: expiration.marketState ?? marketState,
      knownPlanetIds,
      activeMissions: expiration.activeMissions,
      failedMissionIds: expiration.failedMissionIds,
      reputation: expiration.reputation,
      factionHeat,
      npcObjective,
      npcInteraction: state.npcInteraction && runtime.enemies.some((ship) => ship.id === state.npcInteraction?.npcId && isEconomyNpc(ship))
        ? state.npcInteraction
        : undefined,
      explorationState,
      ...dialoguePatch,
      primaryCooldown,
      secondaryCooldown,
      screen: expiration.player.hull <= 0 ? "gameOver" : get().screen,
      targetId: runtime.enemies.some((ship) => ship.id === state.targetId && ship.hull > 0 && ship.deathTimer === undefined)
        ? state.targetId
        : sortTargetableShips(runtime.enemies)[0]?.id
    });
  },
  advanceGameClock: (delta) => {
    const state = get();
    if (delta <= 0) return;
    const gameClock = state.gameClock + delta;
    const factionHeat = applyFactionHeatDecay(state.factionHeat, delta, gameClock);
    const expiration = applyExpiredMissions({
      player: state.player,
      reputation: state.reputation,
      activeMissions: state.activeMissions,
      failedMissionIds: state.failedMissionIds,
      runtime: state.runtime,
      gameClock,
      marketState: state.economyService.status === "connected" ? state.marketState : advanceMarketState(state.marketState, delta)
    });
    if (expiration.expiredMissionIds.length > 0) audioSystem.play("mission-fail");
    const expiredStoryMission = expiration.expiredMissionIds
      .map((missionId) => state.activeMissions.find((mission) => mission.id === missionId))
      .find((mission) => mission?.storyCritical);
    const storyNotification = expiredStoryMission
      ? createStoryNotification("failed", expiredStoryMission.title, expiration.runtime.message, gameClock)
      : state.runtime.storyNotification && state.runtime.storyNotification.expiresAt > gameClock
        ? state.runtime.storyNotification
        : undefined;
    const lawNotification = state.runtime.lawNotification && state.runtime.lawNotification.expiresAt > gameClock
      ? state.runtime.lawNotification
      : undefined;
    set({
      gameClock,
      marketState: expiration.marketState ?? (state.economyService.status === "connected" ? state.marketState : advanceMarketState(state.marketState, delta)),
      player: expiration.player,
      reputation: expiration.reputation,
      factionHeat,
      activeMissions: expiration.activeMissions,
      failedMissionIds: expiration.failedMissionIds,
      runtime: { ...expiration.runtime, storyNotification, lawNotification }
    });
  },
  cycleTarget: () => {
    const targets = sortTargetableShips(get().runtime.enemies);
    if (targets.length === 0) return set({ targetId: undefined });
    const currentIndex = targets.findIndex((ship) => ship.id === get().targetId);
    set({ targetId: targets[(currentIndex + 1) % targets.length].id });
  },
  interact: () => {
    const state = get();
    const equipmentEffects = getPlayerRuntimeEffects(state.player);
    const pendingNpcAction = state.npcInteraction?.pendingAction;
    if (pendingNpcAction) {
      const npc = economyNpcById(state, state.npcInteraction?.npcId);
      if (!npc) {
        set({ runtime: { ...state.runtime, message: "NPC signal lost." }, npcInteraction: undefined });
        return;
      }
      if (distance(npc.position, state.player.position) <= NPC_INTERACTION_RANGE) {
        void get().executeNpcInteraction(pendingNpcAction, npc.id);
        return;
      }
      set({ runtime: { ...state.runtime, message: `Move within ${NPC_INTERACTION_RANGE}m of ${npc.name} to confirm ${npcRouteActionLabel(pendingNpcAction)}.` } });
      return;
    }
    const navigationTarget = getNearestNavigationTarget(state.currentSystemId, state.player.position, state.knownPlanetIds, {
      explorationState: state.explorationState,
      installedEquipment: state.player.equipment,
      runtimeEffects: equipmentEffects
    });
    const nearSalvage = state.runtime.salvage
      .filter((salvage) => !salvage.recovered)
      .map((salvage) => ({ salvage, dist: distance(salvage.position, state.player.position) }))
      .sort((a, b) => a.dist - b.dist)[0];
    if (nearSalvage && nearSalvage.dist < equipmentEffects.salvageInteractionRange) {
      const activeMissions = state.activeMissions.map((mission) =>
        mission.id === nearSalvage.salvage.missionId ? markSalvageRecovered(mission) : mission
      );
      set({
        activeMissions,
        runtime: {
          ...state.runtime,
          salvage: state.runtime.salvage.filter((salvage) => salvage.id !== nearSalvage.salvage.id),
          effects: [
            ...state.runtime.effects,
            {
              id: projectileId("salvage-recovered"),
              kind: "hit",
              position: nearSalvage.salvage.position,
              color: "#9b7bff",
              secondaryColor: "#eaffff",
              label: "Recovered",
              particleCount: 12,
              spread: 24,
              size: 16,
              life: 0.7,
              maxLife: 0.7,
              velocity: [0, 12, 0]
            }
          ],
          message: `Recovered ${nearSalvage.salvage.name}. Return to station.`
        }
      });
      audioSystem.play("loot");
      return;
    }
    const nearLoot = state.runtime.loot.filter((loot) => distance(loot.position, state.player.position) < equipmentEffects.lootInteractionRange);
    if (nearLoot.length > 0) {
      let player = state.player;
      const collectedIds = new Set<string>();
      let collectedCargo = 0;
      const collectedEquipment: string[] = [];
      for (const loot of nearLoot) {
        if (loot.kind === "equipment") {
          player = { ...player, equipmentInventory: addEquipmentToInventory(player.equipmentInventory, loot.equipmentId, loot.amount) };
          collectedEquipment.push(equipmentById[loot.equipmentId].name);
          collectedIds.add(loot.id);
        } else {
          const result = addCargoWithinCapacity(player, loot.commodityId, loot.amount, state.activeMissions);
          player = result.player;
          collectedCargo += result.collected;
          if (result.collected > 0) collectedIds.add(loot.id);
        }
      }
      const messageParts = [
        collectedCargo > 0 ? `Collected ${collectedCargo} cargo unit(s)` : "",
        collectedEquipment.length > 0 ? `Recovered ${collectedEquipment.join(", ")}` : ""
      ].filter(Boolean);
      set({
        player,
        runtime: {
          ...state.runtime,
          loot: state.runtime.loot.filter((loot) => !collectedIds.has(loot.id)),
          message: messageParts.length > 0 ? `${messageParts.join(" · ")}.` : "Cargo hold full."
        }
      });
      if (messageParts.length > 0) audioSystem.play("loot");
      return;
    }
    if (navigationTarget?.inRange && navigationTarget.kind === "exploration-signal") {
      const signal = navigationTarget.signal;
      const alreadyComplete = state.explorationState.completedSignalIds.includes(signal.id);
      if (alreadyComplete) {
        set({ runtime: { ...state.runtime, message: `${signal.title} already resolved.` } });
        return;
      }
      if (!hasRequiredSignalEquipment(signal, state.player.equipment)) {
        set({ runtime: { ...state.runtime, message: `${signal.title} requires ${requiredSignalEquipmentLabel(signal)}.` } });
        return;
      }
      const initialFrequency = Math.max(0, Math.min(100, Math.round((signal.scanBand[0] + signal.scanBand[1]) / 2) - 18));
      set({
        explorationState: {
          ...state.explorationState,
          discoveredSignalIds: addUniqueIds(state.explorationState.discoveredSignalIds, [signal.id])
        },
        runtime: {
          ...state.runtime,
          explorationScan: {
            signalId: signal.id,
            frequency: initialFrequency,
            progress: 0,
            inBand: false,
            distance: navigationTarget.distance
          },
          message: `Signal handshake opened: ${signal.title}. Tune frequency into ${getEffectiveSignalScanBand(signal, equipmentEffects).join("-")}.`
        }
      });
      audioSystem.play("ui-click");
      return;
    }
    if (navigationTarget?.inRange && navigationTarget.kind === "station") {
      get().dockAt(navigationTarget.station.id);
      return;
    }
    if (navigationTarget?.inRange && navigationTarget.kind === "stargate") {
      set({
        screen: "galaxyMap",
        previousScreen: "flight",
        galaxyMapMode: "gate",
        runtime: { ...state.runtime, message: "Stargate link established. Select a known system." },
        input: { ...emptyInput }
      });
      return;
    }
    if (navigationTarget?.inRange && navigationTarget.kind === "planet-signal") {
      const discovered = discoverNearbyPlanets(state.currentSystemId, state.player.position, state.knownPlanetIds);
      set({
        knownPlanetIds: discovered.knownPlanetIds,
        runtime: {
          ...state.runtime,
          message:
            discovered.discovered.length > 0
              ? `Navigation scan complete: ${discovered.discovered.map((planet) => planet.name).join(", ")} station beacon unlocked.`
              : "Unknown beacon already scanned."
        }
      });
      return;
    }
    const npc = nearestEconomyNpc(state);
    if (npc) {
      get().openNpcInteraction(npc.id, "flight");
      return;
    }
    set({ runtime: { ...state.runtime, message: "No interactable object in range." } });
  },
  adjustExplorationScanFrequency: (delta) => {
    const state = get();
    const scan = state.runtime.explorationScan;
    if (!scan) return;
    set({
      runtime: {
        ...state.runtime,
        explorationScan: {
          ...scan,
          frequency: clamp(scan.frequency + delta, 0, 100)
        }
      }
    });
  },
  cancelExplorationScan: () => {
    const state = get();
    if (!state.runtime.explorationScan) return;
    set({ runtime: { ...state.runtime, explorationScan: undefined, message: "Signal scan canceled." } });
  },
  openDialogueScene: (sceneId, replay = true) => {
    const state = get();
    set(dialogueOpenPatch(state, sceneId, replay));
  },
  advanceDialogue: () => {
    const state = get();
    const activeDialogue = state.activeDialogue;
    if (!activeDialogue) return;
    const scene = dialogueSceneById[activeDialogue.sceneId];
    if (!scene || activeDialogue.lineIndex >= scene.lines.length - 1) {
      set(closeOrAdvanceDialoguePatch(state));
      return;
    }
    set({ activeDialogue: { ...activeDialogue, lineIndex: activeDialogue.lineIndex + 1 } });
  },
  rewindDialogue: () => {
    const activeDialogue = get().activeDialogue;
    if (!activeDialogue || activeDialogue.lineIndex <= 0) return;
    set({ activeDialogue: { ...activeDialogue, lineIndex: activeDialogue.lineIndex - 1 } });
  },
  closeDialogue: () => set((state) => closeOrAdvanceDialoguePatch(state)),
  dockAt: (stationId) => {
    const state = get();
    const result = dockAtPatch(state, stationId);
    if (!result) return;
    let patch = withOnboardingProgress(state, result.patch);
    let next = { ...state, ...patch } as GameStore;
    const automation = applyStoryStationAutomation(next);
    patch = { ...patch, ...automation.patch };
    next = { ...next, ...automation.patch } as GameStore;
    const stationAutoSave = result.autoSave ? writeStationAutoSave(next) : {};
    for (const event of [...(result.audioEvents ?? []), ...automation.audioEvents]) audioSystem.play(event);
    set({ ...patch, ...stationAutoSave });
  },
  undock: () => {
    audioSystem.play("undock");
    set((state) => withOnboardingProgress(state, withPatrolInterdiction(state, undockPatch(state))));
  },
  startJumpToStation: (stationId) => {
    const state = get();
    const patch = startJumpToStationPatch(state, stationId);
    if (patch) set(withOnboardingProgress(state, withPatrolInterdiction(state, patch)));
  },
  startJumpToSystem: (systemId) => {
    const targetStation = getDefaultTargetStation(systemId);
    if (!targetStation) return;
    get().startJumpToStation(targetStation.id);
  },
  activateStargateJumpToStation: (stationId) => {
    const state = get();
    const result = activateStargateJumpToStationPatch(state, stationId);
    if (!result) return;
    for (const event of result.audioEvents ?? []) audioSystem.play(event);
    set(withOnboardingProgress(state, withPatrolInterdiction(state, result.patch)));
  },
  activateStargateJumpToSystem: (systemId) => {
    const targetStation = getDefaultTargetStation(systemId);
    if (!targetStation) return;
    get().activateStargateJumpToStation(targetStation.id);
  },
  cancelAutopilot: (reason = "Autopilot canceled. Manual control restored.") => {
    const state = get();
    if (!state.autopilot) return;
    set({
      autopilot: undefined,
      runtime: { ...state.runtime, message: reason },
      input: { ...emptyInput }
    });
  },
  jumpToSystem: (systemId) => {
    set((state) => {
      const patch = jumpToSystemPatch(state, systemId);
      return patch ? withOnboardingProgress(state, withPatrolInterdiction(state, patch)) : {};
    });
  },
  buy: (commodityId, amount = 1) => {
    const state = get();
    if (!state.currentStationId) return;
    const station = stationById[state.currentStationId];
    const system = systemById[state.currentSystemId];
    const serviceAccess = getStationServiceAccess({
      station,
      service: "commodity-buy",
      reputation: state.reputation,
      factionHeat: state.factionHeat,
      now: state.gameClock
    });
    if (!serviceAccess.ok) {
      set({ runtime: { ...state.runtime, message: serviceAccess.message } });
      return;
    }
    const reservedCargo = getOccupiedCargo(state.player.cargo, state.activeMissions) - getCargoUsed(state.player.cargo);
    const applyLocalBuy = (latest: GameStore, reason?: string) => {
      const localStation = stationById[latest.currentStationId ?? ""];
      const localSystem = systemById[latest.currentSystemId];
      if (!localStation || !localSystem) return;
      const localReservedCargo = getOccupiedCargo(latest.player.cargo, latest.activeMissions) - getCargoUsed(latest.player.cargo);
      const result = buyCommodity(latest.player, localStation, localSystem, commodityId, amount, latest.reputation.factions[localStation.factionId], latest.marketState, localReservedCargo);
      set({
        player: result.player,
        marketState: result.marketState ?? latest.marketState,
        economyService: reason ? { ...latest.economyService, status: "fallback", lastError: reason } : latest.economyService,
        runtime: { ...latest.runtime, message: result.message }
      });
    };
    if (state.economyService.status !== "connected") {
      applyLocalBuy(state);
      return;
    }
    void postPlayerTrade({
      action: "buy",
      stationId: station.id,
      systemId: system.id,
      commodityId,
      amount,
      player: state.player,
      reputation: state.reputation.factions[station.factionId],
      reservedCargo
    })
      .then((result) => {
        set((latest) => {
          const patch = result.snapshot ? applyEconomySnapshotPatch(latest, result.snapshot, result.message) : undefined;
          return {
            player: result.player,
            marketState: patch?.marketState ?? result.marketState,
            economyService: patch?.economyService ?? latest.economyService,
            economyPersonalOffers: patch?.economyPersonalOffers ?? latest.economyPersonalOffers,
            runtime: { ...(patch?.runtime ?? latest.runtime), message: result.message }
          };
        });
      })
      .catch((error) => applyLocalBuy(get(), error instanceof Error ? error.message : "Economy backend unavailable."));
  },
  sell: (commodityId, amount = 1) => {
    const state = get();
    if (!state.currentStationId) return;
    const station = stationById[state.currentStationId];
    const system = systemById[state.currentSystemId];
    const applyLocalSell = (latest: GameStore, reason?: string) => {
      const localStation = stationById[latest.currentStationId ?? ""];
      const localSystem = systemById[latest.currentSystemId];
      if (!localStation || !localSystem) return;
      const result = sellCommodity(latest.player, localStation, localSystem, commodityId, amount, latest.reputation.factions[localStation.factionId], latest.marketState);
      const completedCargo: CargoHold = { ...latest.runtime.mined };
      set({
        player: result.player,
        marketState: result.marketState ?? latest.marketState,
        economyService: reason ? { ...latest.economyService, status: "fallback", lastError: reason } : latest.economyService,
        runtime: { ...latest.runtime, mined: completedCargo, message: result.message }
      });
    };
    if (state.economyService.status !== "connected") {
      applyLocalSell(state);
      return;
    }
    void postPlayerTrade({
      action: "sell",
      stationId: station.id,
      systemId: system.id,
      commodityId,
      amount,
      player: state.player,
      reputation: state.reputation.factions[station.factionId]
    })
      .then((result) => {
        set((latest) => {
          const patch = result.snapshot ? applyEconomySnapshotPatch(latest, result.snapshot, result.message) : undefined;
          return {
            player: result.player,
            marketState: patch?.marketState ?? result.marketState,
            economyService: patch?.economyService ?? latest.economyService,
            economyPersonalOffers: patch?.economyPersonalOffers ?? latest.economyPersonalOffers,
            runtime: { ...(patch?.runtime ?? latest.runtime), mined: { ...latest.runtime.mined }, message: result.message }
          };
        });
      })
      .catch((error) => applyLocalSell(get(), error instanceof Error ? error.message : "Economy backend unavailable."));
  },
  buyEquipment: (equipmentId, amount = 1) => {
    const state = get();
    if (!state.currentStationId) return;
    const station = stationById[state.currentStationId];
    const system = systemById[state.currentSystemId];
    const access = getEquipmentPurchaseAccess({
      station,
      equipment: equipmentById[equipmentId],
      reputation: state.reputation,
      factionHeat: state.factionHeat,
      now: state.gameClock
    });
    if (!access.ok) {
      set({ runtime: { ...state.runtime, message: access.message } });
      return;
    }
    const result = buyEquipment(state.player, station, system, equipmentId, amount, state.reputation.factions[station.factionId], state.marketState);
    set({ player: result.player, marketState: result.marketState ?? state.marketState, runtime: { ...state.runtime, message: result.message } });
  },
  sellEquipment: (equipmentId, amount = 1) => {
    const state = get();
    if (!state.currentStationId) return;
    const station = stationById[state.currentStationId];
    const system = systemById[state.currentSystemId];
    const result = sellEquipment(state.player, station, system, equipmentId, amount, state.reputation.factions[station.factionId], state.marketState);
    set({ player: result.player, marketState: result.marketState ?? state.marketState, runtime: { ...state.runtime, message: result.message } });
  },
  acceptMission: (missionId) => {
    const state = get();
    const result = buildAcceptMissionPatch(state, missionId);
    if (result.audioEvent) audioSystem.play(result.audioEvent);
    set(result.patch);
  },
  completeMission: (missionId) => {
    const state = get();
    const result = buildCompleteMissionPatch(state, missionId);
    if (result.audioEvent) audioSystem.play(result.audioEvent);
    set(result.patch);
    if (result.dispatchDeliveryRequest && result.shouldPostDispatchDelivery && result.completeMessage) {
      const { dispatchDeliveryRequest, completeMessage } = result;
      void postEconomyDispatchDelivery(dispatchDeliveryRequest)
        .then((delivery) => {
          set((latest) => {
            const patch = delivery.snapshot ? applyEconomySnapshotPatch(latest, delivery.snapshot, delivery.message) : undefined;
            return {
              marketState: patch?.marketState ?? latest.marketState,
              runtime: { ...(patch?.runtime ?? latest.runtime), message: delivery.message },
              economyService: patch?.economyService ?? latest.economyService,
              economyEvents: patch?.economyEvents ?? (delivery.event ? [...latest.economyEvents, delivery.event].slice(-12) : latest.economyEvents),
              economyPersonalOffers: patch?.economyPersonalOffers ?? latest.economyPersonalOffers
            };
          });
        })
        .catch((error) => {
          set((latest) => ({
            economyService: {
              ...latest.economyService,
              status: "fallback",
              lastError: economyErrorMessage(error)
            },
            runtime: {
              ...latest.runtime,
              message: `${completeMessage} Economy backend delivery recorded locally.`
            }
          }));
        });
    }
  },
  repairAndRefill: () => {
    const state = get();
    const station = state.currentStationId ? stationById[state.currentStationId] : undefined;
    if (station) {
      const access = getStationServiceAccess({
        station,
        service: "repair",
        reputation: state.reputation,
        factionHeat: state.factionHeat,
        now: state.gameClock
      });
      if (!access.ok) {
        set({ runtime: { ...state.runtime, message: access.message } });
        return;
      }
    }
    const missingHull = state.player.stats.hull - state.player.hull;
    const missileNeed = 6 - state.player.missiles;
    const multiplier = station ? getRepairCostMultiplier(station.factionId, state.reputation, state.factionHeat, state.gameClock) : 1;
    const cost = Math.round((missingHull * 4 + missileNeed * 45) * multiplier);
    if (state.player.credits < cost) {
      set({ runtime: { ...state.runtime, message: "Not enough credits for repair and missile refill." } });
      return;
    }
    set({
      player: { ...state.player, hull: state.player.stats.hull, shield: state.player.stats.shield, missiles: 6, credits: state.player.credits - cost },
      runtime: { ...state.runtime, message: `Repaired and refilled for ${cost} credits.` }
    });
  },
  buyShip: (shipId) => {
    const state = get();
    const ship = shipById[shipId];
    if (!ship || state.player.ownedShips.includes(shipId)) return;
    const station = state.currentStationId ? stationById[state.currentStationId] : undefined;
    if (station) {
      const access = getShipPurchaseAccess({
        station,
        ship,
        reputation: state.reputation,
        factionHeat: state.factionHeat,
        now: state.gameClock,
        player: state.player
      });
      if (!access.ok) {
        set({ runtime: { ...state.runtime, message: access.message } });
        return;
      }
    }
    if (state.player.credits < ship.price) {
      set({ runtime: { ...state.runtime, message: "Not enough credits for that ship." } });
      return;
    }
    const storedCurrentShip = currentShipStorageRecord(state.player);
    const storedRecords = upsertShipRecord(state.player.ownedShipRecords, storedCurrentShip).filter((record) => record.shipId !== ship.id);
    const player = createPlayerShipLoadout(
      {
        ...state.player,
        credits: state.player.credits - ship.price,
        ownedShips: addOwnedShipId(state.player, shipId),
        ownedShipRecords: storedRecords
      },
      ship
    );
    set({
      player,
      runtime: { ...state.runtime, message: `${ship.name} purchased. Previous ship stored at PTD Home.` }
    });
  },
  switchShip: (shipId) => {
    const state = get();
    const record = state.player.ownedShipRecords?.find((candidate) => candidate.shipId === shipId);
    const ship = shipById[shipId];
    if (!record || !ship) {
      set({ runtime: { ...state.runtime, message: "That ship is not stored in your fleet." } });
      return;
    }
    if (state.currentStationId !== record.stationId) {
      const stationName = stationById[record.stationId]?.name ?? record.stationId;
      set({ runtime: { ...state.runtime, message: `That ship is stored at ${stationName}.` } });
      return;
    }
    const storedCurrentShip = currentShipStorageRecord(state.player);
    const ownedShipRecords = upsertShipRecord(state.player.ownedShipRecords, storedCurrentShip).filter((candidate) => candidate.shipId !== shipId);
    const player = normalizePlayerEquipmentStats({
      ...state.player,
      shipId,
      equipment: [...record.installedEquipment],
      hull: record.hull,
      shield: record.shield,
      energy: record.energy,
      ownedShips: addOwnedShipId(state.player, shipId),
      ownedShipRecords
    });
    audioSystem.play("ui-click");
    set({
      player,
      runtime: { ...state.runtime, message: `${ship.name} switched in from PTD Home.` }
    });
  },
  unlockBlueprint: (equipmentId) => {
    const state = get();
    const station = state.currentStationId ? stationById[state.currentStationId] : undefined;
    if (station) {
      const access = getStationServiceAccess({
        station,
        service: "blueprint-workshop",
        reputation: state.reputation,
        factionHeat: state.factionHeat,
        now: state.gameClock
      });
      if (!access.ok) {
        set({ runtime: { ...state.runtime, message: access.message } });
        return;
      }
    }
    const result = unlockBlueprintPure(state.player, equipmentId);
    if (result.ok) audioSystem.play("ui-click");
    set({
      player: result.player,
      runtime: { ...state.runtime, message: result.message }
    });
  },
  craftEquipment: (equipmentId) => {
    const state = get();
    const serviceStation = state.currentStationId ? stationById[state.currentStationId] : undefined;
    if (serviceStation) {
      const access = getStationServiceAccess({
        station: serviceStation,
        service: "blueprint-workshop",
        reputation: state.reputation,
        factionHeat: state.factionHeat,
        now: state.gameClock
      });
      if (!access.ok) {
        set({ runtime: { ...state.runtime, message: access.message } });
        return;
      }
    }
    if (!(equipmentId in equipmentById)) {
      set({ runtime: { ...state.runtime, message: "Unknown equipment blueprint." } });
      return;
    }
    const typedEquipmentId = equipmentId as EquipmentId;
    const equipment = equipmentById[typedEquipmentId];
    if (!isBlueprintUnlocked(state.player, typedEquipmentId)) {
      set({ runtime: { ...state.runtime, message: `${equipment.name} blueprint is locked.` } });
      return;
    }
    const station = state.currentStationId ? stationById[state.currentStationId] : undefined;
    if (station && station.techLevel < equipment.techLevel) {
      set({ runtime: { ...state.runtime, message: `Blueprint requires Tech Level ${equipment.techLevel} station.` } });
      return;
    }
    const cost = equipment.craftCost;
    if (!cost) {
      set({ runtime: { ...state.runtime, message: "That blueprint is not craftable." } });
      return;
    }
    if (state.player.credits < cost.credits) {
      set({ runtime: { ...state.runtime, message: "Not enough credits to craft that blueprint." } });
      return;
    }
    if (!hasCraftMaterials(state.player.cargo, cost.cargo)) {
      set({ runtime: { ...state.runtime, message: "Missing cargo materials for that blueprint." } });
      return;
    }
    audioSystem.play("ui-click");
    set({
      player: {
        ...state.player,
        credits: state.player.credits - cost.credits,
        cargo: removeCraftCargo(state.player.cargo, cost.cargo),
        equipmentInventory: addEquipmentToInventory(state.player.equipmentInventory, typedEquipmentId)
      },
      runtime: { ...state.runtime, message: `Crafted ${equipment.name}. Added to equipment inventory.` }
    });
  },
  installEquipmentFromInventory: (equipmentId) => {
    const state = get();
    const result = installEquipmentFromInventoryPure(state.player, equipmentId);
    if (result.ok) audioSystem.play("ui-click");
    set({
      player: result.player,
      runtime: { ...state.runtime, message: result.message }
    });
  },
  uninstallEquipmentToInventory: (equipmentId) => {
    const state = get();
    const result = uninstallEquipmentToInventoryPure(state.player, equipmentId);
    if (result.ok) audioSystem.play("ui-click");
    set({
      player: result.player,
      runtime: { ...state.runtime, message: result.message }
    });
  },
  toggleCamera: () => set((state) => ({ cameraMode: state.cameraMode === "chase" ? "cinematic" : "chase" }))
}));

if (typeof window !== "undefined" && import.meta.env.DEV) {
  Object.assign(window, {
    __GOF2_E2E__: {
      getState: () => useGameStore.getState(),
      setState: useGameStore.setState
    }
  });
}

export { cloneMissionTemplates, commodities, planetById, planets, shipById, ships, stationById, stations, systemById, systems };
