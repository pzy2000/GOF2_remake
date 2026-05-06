import { create } from "zustand";
import { commodities, commodityById, equipmentById, missionTemplates, planetById, planets, shipById, ships, stationById, stations, systemById, systems } from "../data/world";
import type {
  AssetManifest,
  AsteroidEntity,
  AutoPilotState,
  CargoHold,
  CommodityId,
  ConvoyEntity,
  EquipmentId,
  FactionId,
  FlightEntity,
  FlightInput,
  GalaxyMapMode,
  ExplorationState,
  LootEntity,
  MarketState,
  MissionDefinition,
  PlayerState,
  ProjectileEntity,
  RuntimeState,
  SalvageEntity,
  SaveGameData,
  SaveSlotId,
  SaveSlotSummary,
  Screen,
  StationTab,
  Vec3
} from "../types/game";
import { fallbackAssetManifest } from "../systems/assets";
import { add, clamp, distance, forwardFromRotation, normalize, orbitPoint, scale, sub } from "../systems/math";
import { applyDamage, regenerateShield } from "../systems/combat";
import {
  getMiningProgressIncrement,
  getOreColor,
  getOreHardness,
  getOreRarity,
  getPirateSpawnCount,
  getPirateSpawnPosition,
  STARTER_GRACE_SECONDS
} from "../systems/difficulty";
import { integrateVelocity } from "../systems/flight";
import {
  GATE_ACTIVATION_SECONDS,
  GATE_ARRIVAL_DISTANCE,
  getDefaultTargetStation,
  getJumpGatePosition,
  getStationArrivalPosition,
  integrateAutopilotStep,
  shouldCancelAutopilot,
  STATION_DOCK_DISTANCE,
  WORMHOLE_SECONDS,
  rotationToward
} from "../systems/autopilot";
import { advanceMarketState, buyCommodity, createInitialMarketState, getCargoUsed, getOccupiedCargo, sellCommodity } from "../systems/economy";
import { createInitialReputation, updateReputation } from "../systems/reputation";
import {
  acceptMission as acceptMissionPure,
  canCompleteMission,
  cloneMission,
  cloneMissionTemplates,
  completeMission as completeMissionPure,
  failMission as failMissionPure,
  areMissionPrerequisitesMet,
  isMissionExpired,
  markEscortArrived,
  markSalvageRecovered
} from "../systems/missions";
import { deleteSave as deleteSaveSlot, getLatestSaveSlotId, readSave, readSaveSlots, writeSave } from "../systems/save";
import { audioSystem } from "../systems/audio";
import {
  CONTRABAND_FINE_PER_UNIT,
  getContrabandLaw,
  getPirateAiProfile,
  isHostileToPlayer,
  resolveCombatAiStep,
  sortPirateTargets
} from "../systems/combatAi";
import {
  getActivePrimaryWeapon,
  getActiveSecondaryWeapon,
  getEffectiveShipStats,
  getEquipmentEffects,
  getWeaponCooldown,
  hasMiningBeam,
  installEquipmentFromInventory as installEquipmentFromInventoryPure,
  createPlayerShipLoadout,
  uninstallEquipmentToInventory as uninstallEquipmentToInventoryPure,
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
  isFrequencyInSignalBand,
  isHiddenStationRevealed,
  normalizeExplorationState
} from "../systems/exploration";
import {
  getInitialKnownSystems,
  getInitialKnownPlanetIds,
  getNearestNavigationTarget,
  discoverNearbyPlanets,
  isKnownSystem,
  revealNeighborSystems,
  STARGATE_INTERACTION_RANGE
} from "../systems/navigation";

const emptyInput: FlightInput = {
  throttleUp: false,
  throttleDown: false,
  rollLeft: false,
  rollRight: false,
  afterburner: false,
  firePrimary: false,
  fireSecondary: false,
  interact: false,
  cycleTarget: false,
  toggleMap: false,
  toggleCamera: false,
  pause: false,
  mouseDX: 0,
  mouseDY: 0
};

const oreCycle: CommodityId[] = ["iron", "titanium", "cesogen", "gold", "voidglass"];
const SHIP_STORAGE_STATION_ID = "ptd-home";

function createInitialPlayer(): PlayerState {
  const starter = shipById["sparrow-mk1"];
  const stats = getEffectiveShipStats(starter.stats, starter.equipment);
  return {
    shipId: starter.id,
    stats,
    hull: stats.hull,
    shield: stats.shield,
    energy: stats.energy,
    credits: 1500,
    cargo: { "basic-food": 3, "drinking-water": 2 },
    equipment: starter.equipment,
    equipmentInventory: {},
    missiles: 6,
    ownedShips: [starter.id],
    ownedShipRecords: [],
    position: [0, 0, 120],
    velocity: [0, 0, 0],
    rotation: [0, 0, 0],
    throttle: 0.25,
    lastDamageAt: -999
  };
}

function createShipEntity(id: string, role: FlightEntity["role"], position: Vec3, systemId = "helion-reach", index = 0): FlightEntity {
  const pirateProfile = role === "pirate" ? getPirateAiProfile(systemId, index, systemById[systemId]?.risk ?? 0) : undefined;
  const roleStats = {
    pirate: { hull: 70, shield: 42, factionId: "independent-pirates" as const },
    patrol: { hull: 115, shield: 85, factionId: "solar-directorate" as const },
    trader: { hull: 85, shield: 55, factionId: "free-belt-union" as const }
  }[role];
  const elite = !!pirateProfile?.elite;
  const hull = elite ? Math.round(roleStats.hull * 1.72) : roleStats.hull;
  const shield = elite ? Math.round(roleStats.shield * 1.88) : roleStats.shield;
  return {
    id,
    name: elite ? "Elite Knife Wing Ace" : role === "pirate" ? "Knife Wing Pirate" : role === "patrol" ? "Directorate Patrol" : "Belt Trader",
    role,
    factionId: roleStats.factionId,
    position,
    velocity: [0, 0, 0],
    hull,
    shield,
    maxHull: hull,
    maxShield: shield,
    lastDamageAt: -999,
    fireCooldown: 0.6,
    aiProfileId: pirateProfile?.aiProfileId ?? (role === "patrol" ? "law-patrol" : role === "trader" ? "hauler" : "raider"),
    aiState: "patrol",
    aiTimer: 0,
    elite
  };
}

function createConvoyEntity(mission: MissionDefinition): ConvoyEntity | undefined {
  if (!mission.escort || mission.escort.arrived || mission.failed || mission.completed) return undefined;
  return {
    id: mission.escort.convoyId,
    missionId: mission.id,
    name: mission.escort.convoyName,
    factionId: mission.factionId,
    position: [...mission.escort.originPosition],
    velocity: [0, 0, 0],
    hull: mission.escort.hull,
    maxHull: mission.escort.hull,
    shield: 45,
    maxShield: 45,
    lastDamageAt: -999,
    destinationStationId: mission.destinationStationId,
    destinationPosition: [...mission.escort.destinationPosition],
    arrived: false
  };
}

function createSalvageEntity(mission: MissionDefinition): SalvageEntity | undefined {
  if (!mission.salvage || mission.salvage.recovered || mission.failed || mission.completed) return undefined;
  return {
    id: mission.salvage.salvageId,
    missionId: mission.id,
    name: mission.salvage.name,
    commodityId: mission.salvage.commodityId,
    amount: mission.salvage.amount,
    position: [...mission.salvage.position],
    recovered: false
  };
}

function missionRuntimeEntities(systemId: string, activeMissions: MissionDefinition[]) {
  return {
    convoys: activeMissions
      .filter((mission) => mission.originSystemId === systemId || mission.destinationSystemId === systemId)
      .map(createConvoyEntity)
      .filter(Boolean) as ConvoyEntity[],
    salvage: activeMissions
      .filter((mission) => mission.salvage?.systemId === systemId)
      .map(createSalvageEntity)
      .filter(Boolean) as SalvageEntity[]
  };
}

function createRuntimeForSystem(systemId: string, activeMissions: MissionDefinition[] = []): RuntimeState {
  const system = systemById[systemId];
  const pirateCount = getPirateSpawnCount(systemId, system.risk);
  const asteroids: AsteroidEntity[] = Array.from({ length: systemId === "kuro-belt" ? 16 : 10 }, (_, index) => ({
    id: `${systemId}-asteroid-${index}`,
    resource: oreCycle[index % oreCycle.length],
    position: orbitPoint(index + system.risk * 10, 240 + index * 22),
    radius: 20 + (index % 4) * 7,
    amount: 4 + (index % 5) * 2,
    miningProgress: 0,
    rarity: getOreRarity(oreCycle[index % oreCycle.length]),
    hardness: getOreHardness(oreCycle[index % oreCycle.length])
  }));
  const missionEntities = missionRuntimeEntities(systemId, activeMissions);
  return {
    enemies: [
      ...Array.from({ length: pirateCount }, (_, index) =>
        createShipEntity(`${systemId}-pirate-${index}`, "pirate", getPirateSpawnPosition(systemId, index), systemId, index)
      ),
      createShipEntity(`${systemId}-patrol-0`, "patrol", [-190, 55, -360], systemId),
      createShipEntity(`${systemId}-trader-0`, "trader", [180, -25, -430], systemId)
    ],
    convoys: missionEntities.convoys,
    salvage: missionEntities.salvage,
    asteroids,
    loot: [],
    projectiles: [],
    effects: [],
    destroyedPirates: 0,
    mined: {},
    clock: 0,
    graceUntil: STARTER_GRACE_SECONDS,
    message: "Flight systems online.",
    explorationScan: undefined
  };
}

function projectileId(prefix: string): string {
  return `${prefix}-${Math.round(performance.now() * 1000)}-${Math.random().toString(16).slice(2)}`;
}

function addMissionRuntimeEntity(runtime: RuntimeState, mission: MissionDefinition, systemId: string): RuntimeState {
  const convoy = (mission.originSystemId === systemId || mission.destinationSystemId === systemId) ? createConvoyEntity(mission) : undefined;
  const salvage = mission.salvage?.systemId === systemId ? createSalvageEntity(mission) : undefined;
  return {
    ...runtime,
    convoys: convoy && !runtime.convoys.some((item) => item.id === convoy.id) ? [...runtime.convoys, convoy] : runtime.convoys,
    salvage: salvage && !runtime.salvage.some((item) => item.id === salvage.id) ? [...runtime.salvage, salvage] : runtime.salvage
  };
}

function addCargoWithinCapacity(
  player: PlayerState,
  commodityId: CommodityId,
  amount: number,
  activeMissions: MissionDefinition[] = []
): { player: PlayerState; collected: number } {
  const available = Math.max(0, player.stats.cargoCapacity - getOccupiedCargo(player.cargo, activeMissions));
  const collected = Math.min(available, amount);
  if (collected <= 0) return { player, collected: 0 };
  return {
    collected,
    player: {
      ...player,
      cargo: { ...player.cargo, [commodityId]: (player.cargo[commodityId] ?? 0) + collected }
    }
  };
}

function applyExpiredMissions(snapshot: {
  player: PlayerState;
  reputation: ReturnType<typeof createInitialReputation>;
  activeMissions: MissionDefinition[];
  failedMissionIds: string[];
  runtime: RuntimeState;
  gameClock: number;
}) {
  let { player, reputation, runtime } = snapshot;
  const failedMissionIds = [...snapshot.failedMissionIds];
  const activeMissions: MissionDefinition[] = [];
  let message = runtime.message;
  for (const mission of snapshot.activeMissions) {
    if (isMissionExpired(mission, snapshot.gameClock)) {
      const result = failMissionPure(mission, player, reputation, "Deadline expired");
      player = result.player;
      reputation = result.reputation;
      failedMissionIds.push(mission.id);
      message = `${mission.title} failed: deadline expired.`;
      audioSystem.play("mission-fail");
      runtime = {
        ...runtime,
        convoys: runtime.convoys.filter((convoy) => convoy.missionId !== mission.id),
        salvage: runtime.salvage.filter((salvage) => salvage.missionId !== mission.id)
      };
    } else {
      activeMissions.push(mission);
    }
  }
  return {
    player,
    reputation,
    activeMissions,
    failedMissionIds: Array.from(new Set(failedMissionIds)),
    runtime: { ...runtime, message }
  };
}

function tickRuntimeEffects(runtime: RuntimeState, delta: number, clock: number): RuntimeState {
  return {
    ...runtime,
    clock,
    effects: runtime.effects
      .map((effect) => ({
        ...effect,
        life: effect.life - delta,
        position: add(effect.position, scale(effect.velocity ?? [0, 0, 0], delta)),
        endPosition: effect.endPosition ? add(effect.endPosition, scale(effect.velocity ?? [0, 0, 0], delta)) : undefined
      }))
      .filter((effect) => effect.life > 0)
  };
}

function navEffect(position: Vec3, label: string): RuntimeState["effects"][number] {
  return {
    id: projectileId("nav-ring"),
    kind: "nav-ring",
    position,
    color: "#6ee7ff",
    secondaryColor: "#d9f8ff",
    label,
    particleCount: 0,
    spread: 1,
    size: 54,
    life: 0.18,
    maxLife: 0.18
  };
}

function gateSpoolEffect(position: Vec3, progress: number): RuntimeState["effects"][number] {
  return {
    id: projectileId("gate-spool"),
    kind: "gate-spool",
    position,
    color: progress > 0.82 ? "#ffffff" : "#63e6ff",
    secondaryColor: "#8f7bff",
    label: progress > 0.95 ? "JUMP" : undefined,
    particleCount: 18,
    spread: 120,
    size: 92 + progress * 38,
    life: 0.22,
    maxLife: 0.22
  };
}

function wormholeEffect(position: Vec3): RuntimeState["effects"][number] {
  return {
    id: projectileId("wormhole"),
    kind: "wormhole",
    position,
    color: "#6ee7ff",
    secondaryColor: "#8f7bff",
    particleCount: 24,
    spread: 180,
    size: 120,
    life: 0.28,
    maxLife: 0.28
  };
}

function launchPositionForStation(stationId: string | undefined, fallback: Vec3): Vec3 {
  const station = stationId ? stationById[stationId] : undefined;
  const planet = station ? planetById[station.planetId] : undefined;
  const awayFromPlanet = station && planet ? normalize(sub(station.position, planet.position)) : [0, 0, 1] as Vec3;
  return station ? add(station.position, add(scale(awayFromPlanet, 280), [0, 18, 0])) : fallback;
}

function isKnownStation(stationId: string, knownPlanetIds: string[], explorationState: ExplorationState): boolean {
  const station = stationById[stationId];
  if (!station || !knownPlanetIds.includes(station.planetId)) return false;
  return !station.hidden || isHiddenStationRevealed(station.id, explorationState);
}

function mergeKnownPlanetIds(knownPlanetIds: string[], knownSystemIds: string[], currentStationId?: string): string[] {
  const known = new Set([...knownPlanetIds, ...getInitialKnownPlanetIds(knownSystemIds, currentStationId)]);
  return planets.filter((planet) => known.has(planet.id)).map((planet) => planet.id);
}

function currentShipStorageRecord(player: PlayerState): NonNullable<PlayerState["ownedShipRecords"]>[number] {
  return {
    shipId: player.shipId,
    stationId: SHIP_STORAGE_STATION_ID,
    installedEquipment: [...player.equipment],
    hull: player.hull,
    shield: player.shield,
    energy: player.energy
  };
}

function upsertShipRecord(
  records: NonNullable<PlayerState["ownedShipRecords"]> = [],
  record: NonNullable<PlayerState["ownedShipRecords"]>[number]
): NonNullable<PlayerState["ownedShipRecords"]> {
  return [...records.filter((item) => item.shipId !== record.shipId), record];
}

function addOwnedShipId(player: PlayerState, shipId: string): string[] {
  return Array.from(new Set([...(player.ownedShips ?? [player.shipId]), shipId]));
}

function addUniqueIds(existing: string[], additions: string[]): string[] {
  return Array.from(new Set([...existing, ...additions]));
}

function applyExplorationReward(snapshot: {
  signalId: string;
  player: PlayerState;
  reputation: ReturnType<typeof createInitialReputation>;
  explorationState: ExplorationState;
  knownPlanetIds: string[];
  activeMissions: MissionDefinition[];
}) {
  const signal = explorationSignalById[snapshot.signalId];
  if (!signal || snapshot.explorationState.completedSignalIds.includes(signal.id)) {
    return {
      player: snapshot.player,
      reputation: snapshot.reputation,
      explorationState: snapshot.explorationState,
      knownPlanetIds: snapshot.knownPlanetIds,
      collectedCargo: 0,
      message: signal ? `${signal.title} already resolved.` : "Exploration signal lost."
    };
  }

  let player = snapshot.player;
  let reputation = snapshot.reputation;
  let collectedCargo = 0;
  if (signal.rewards.credits) player = { ...player, credits: player.credits + signal.rewards.credits };
  for (const [commodityId, amount] of Object.entries(signal.rewards.cargo ?? {})) {
    const result = addCargoWithinCapacity(player, commodityId as CommodityId, amount ?? 0, snapshot.activeMissions);
    player = result.player;
    collectedCargo += result.collected;
  }
  for (const [factionId, delta] of Object.entries(signal.rewards.reputation ?? {})) {
    reputation = updateReputation(reputation, factionId as FactionId, delta ?? 0);
  }

  const explorationState: ExplorationState = {
    discoveredSignalIds: addUniqueIds(snapshot.explorationState.discoveredSignalIds, [signal.id]),
    completedSignalIds: addUniqueIds(snapshot.explorationState.completedSignalIds, [signal.id]),
    revealedStationIds: signal.revealStationId
      ? addUniqueIds(snapshot.explorationState.revealedStationIds, [signal.revealStationId])
      : snapshot.explorationState.revealedStationIds,
    eventLogIds: addUniqueIds(snapshot.explorationState.eventLogIds, [signal.id])
  };
  const knownPlanetIds = signal.revealPlanetIds?.length
    ? planets.filter((planet) => new Set([...snapshot.knownPlanetIds, ...(signal.revealPlanetIds ?? [])]).has(planet.id)).map((planet) => planet.id)
    : snapshot.knownPlanetIds;
  const rewardParts = [
    signal.rewards.credits ? `+${signal.rewards.credits} credits` : "",
    collectedCargo > 0 ? `+${collectedCargo} cargo` : "",
    signal.revealStationId ? `${stationById[signal.revealStationId]?.name ?? signal.revealStationId} revealed` : ""
  ].filter(Boolean);
  return {
    player,
    reputation,
    explorationState,
    knownPlanetIds,
    collectedCargo,
    message: `${signal.title} resolved.${rewardParts.length ? ` ${rewardParts.join(" · ")}.` : ""}`
  };
}

interface GameStore {
  screen: Screen;
  previousScreen: Screen;
  stationTab: StationTab;
  galaxyMapMode: GalaxyMapMode;
  currentSystemId: string;
  currentStationId?: string;
  targetId?: string;
  cameraMode: "chase" | "cinematic";
  assetManifest: AssetManifest;
  player: PlayerState;
  runtime: RuntimeState;
  autopilot?: AutoPilotState;
  input: FlightInput;
  gameClock: number;
  marketState: MarketState;
  activeMissions: MissionDefinition[];
  completedMissionIds: string[];
  failedMissionIds: string[];
  reputation: ReturnType<typeof createInitialReputation>;
  knownSystems: string[];
  knownPlanetIds: string[];
  explorationState: ExplorationState;
  primaryCooldown: number;
  secondaryCooldown: number;
  hasSave: boolean;
  saveSlots: SaveSlotSummary[];
  activeSaveSlotId?: SaveSlotId;
  setAssetManifest: (manifest: AssetManifest) => void;
  newGame: () => void;
  loadGame: (slotId?: SaveSlotId) => boolean;
  saveGame: (slotId?: SaveSlotId) => void;
  deleteSave: (slotId: SaveSlotId) => void;
  refreshSaveSlots: () => void;
  setScreen: (screen: Screen) => void;
  setStationTab: (tab: StationTab) => void;
  openGalaxyMap: (mode: GalaxyMapMode) => void;
  setInput: (patch: Partial<FlightInput>) => void;
  consumeMouse: () => { dx: number; dy: number };
  tick: (delta: number) => void;
  advanceGameClock: (delta: number) => void;
  cycleTarget: () => void;
  interact: () => void;
  adjustExplorationScanFrequency: (delta: number) => void;
  cancelExplorationScan: () => void;
  dockAt: (stationId: string) => void;
  undock: () => void;
  startJumpToStation: (stationId: string) => void;
  startJumpToSystem: (systemId: string) => void;
  activateStargateJumpToStation: (stationId: string) => void;
  activateStargateJumpToSystem: (systemId: string) => void;
  cancelAutopilot: (reason?: string) => void;
  jumpToSystem: (systemId: string) => void;
  buy: (commodityId: CommodityId, amount?: number) => void;
  sell: (commodityId: CommodityId, amount?: number) => void;
  acceptMission: (missionId: string) => void;
  completeMission: (missionId: string) => void;
  repairAndRefill: () => void;
  buyShip: (shipId: string) => void;
  switchShip: (shipId: string) => void;
  craftEquipment: (equipmentId: string) => void;
  installEquipmentFromInventory: (equipmentId: EquipmentId) => void;
  uninstallEquipmentToInventory: (equipmentId: EquipmentId) => void;
  toggleCamera: () => void;
}

type SavePayloadOverrides = Partial<
  Pick<
    GameStore,
    | "currentSystemId"
    | "currentStationId"
    | "gameClock"
    | "player"
    | "activeMissions"
    | "completedMissionIds"
    | "failedMissionIds"
    | "marketState"
    | "reputation"
    | "knownSystems"
    | "knownPlanetIds"
    | "explorationState"
  >
>;

function savePayload(state: GameStore, overrides: SavePayloadOverrides = {}): Omit<SaveGameData, "version" | "savedAt"> {
  return {
    currentSystemId: overrides.currentSystemId ?? state.currentSystemId,
    currentStationId: Object.prototype.hasOwnProperty.call(overrides, "currentStationId") ? overrides.currentStationId : state.currentStationId,
    gameClock: overrides.gameClock ?? state.gameClock,
    player: overrides.player ?? state.player,
    activeMissions: overrides.activeMissions ?? state.activeMissions,
    completedMissionIds: overrides.completedMissionIds ?? state.completedMissionIds,
    failedMissionIds: overrides.failedMissionIds ?? state.failedMissionIds,
    marketState: overrides.marketState ?? state.marketState,
    reputation: overrides.reputation ?? state.reputation,
    knownSystems: overrides.knownSystems ?? state.knownSystems,
    knownPlanetIds: overrides.knownPlanetIds ?? state.knownPlanetIds,
    explorationState: overrides.explorationState ?? state.explorationState
  };
}

function writeStationAutoSave(state: GameStore, overrides: SavePayloadOverrides): Pick<GameStore, "hasSave" | "saveSlots" | "activeSaveSlotId"> {
  writeSave(savePayload(state, overrides), undefined, "auto");
  return {
    hasSave: true,
    saveSlots: readSaveSlots(),
    activeSaveSlotId: "auto"
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
  autopilot: undefined,
  input: emptyInput,
  gameClock: 0,
  marketState: createInitialMarketState(),
  activeMissions: [],
  completedMissionIds: [],
  failedMissionIds: [],
  reputation: createInitialReputation(),
  knownSystems: getInitialKnownSystems("helion-reach"),
  knownPlanetIds: getInitialKnownPlanetIds(getInitialKnownSystems("helion-reach")),
  explorationState: createInitialExplorationState(),
  primaryCooldown: 0,
  secondaryCooldown: 0,
  hasSave: readSave() !== null,
  saveSlots: readSaveSlots(),
  activeSaveSlotId: undefined,
  setAssetManifest: (assetManifest) => set({ assetManifest }),
  newGame: () =>
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
      autopilot: undefined,
      gameClock: 0,
      marketState: createInitialMarketState(),
      activeMissions: [],
      completedMissionIds: [],
      failedMissionIds: [],
      reputation: createInitialReputation(),
      knownSystems: getInitialKnownSystems("helion-reach"),
      knownPlanetIds: getInitialKnownPlanetIds(getInitialKnownSystems("helion-reach")),
      explorationState: createInitialExplorationState(),
      primaryCooldown: 0,
      secondaryCooldown: 0,
      activeSaveSlotId: undefined
    }),
  loadGame: (slotId) => {
    const resolvedSlotId = slotId ?? getLatestSaveSlotId();
    const save = readSave(undefined, resolvedSlotId);
    if (!save) return false;
    set({
      screen: "flight",
      previousScreen: "menu",
      galaxyMapMode: "browse",
      currentSystemId: save.currentSystemId,
      currentStationId: save.currentStationId,
      gameClock: save.gameClock,
      player: normalizePlayerEquipmentStats(save.player),
      activeMissions: save.activeMissions,
      completedMissionIds: save.completedMissionIds,
      failedMissionIds: save.failedMissionIds,
      marketState: save.marketState,
      reputation: save.reputation,
      knownSystems: save.knownSystems,
      knownPlanetIds: save.knownPlanetIds,
      explorationState: normalizeExplorationState(save.explorationState),
      runtime: createRuntimeForSystem(save.currentSystemId, save.activeMissions),
      autopilot: undefined,
      hasSave: true,
      saveSlots: readSaveSlots(),
      activeSaveSlotId: resolvedSlotId,
      targetId: undefined
    });
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
  setScreen: (screen) => set((state) => ({ previousScreen: state.screen, screen })),
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
    if (state.screen !== "flight") return;
    const now = state.runtime.clock + delta;
    const gameClock = state.gameClock + delta;
    const marketState = advanceMarketState(state.marketState, delta);
    const input = state.input;
    const { dx, dy } = state.consumeMouse();

    if (state.autopilot) {
      let runtime = tickRuntimeEffects(state.runtime, delta, now);
      if (input.pause) {
        set({ screen: "pause", previousScreen: "flight", runtime, input: { ...get().input, pause: false } });
        return;
      }

      const controlInput: FlightInput = { ...input, mouseDX: dx, mouseDY: dy };
      if (state.autopilot.cancelable && shouldCancelAutopilot(controlInput)) {
        set({
          autopilot: undefined,
          runtime: { ...runtime, message: "Autopilot canceled. Manual control restored." },
          input: { ...emptyInput }
        });
        return;
      }

      let player = state.player;
      let autopilot: AutoPilotState | undefined = { ...state.autopilot, timer: state.autopilot.timer + delta };
      let currentSystemId = state.currentSystemId;
      let currentStationId = state.currentStationId;
      let screen: Screen = "flight";
      let previousScreen = state.previousScreen;
      let knownSystems = state.knownSystems;
      let knownPlanetIds = state.knownPlanetIds;
      let targetId = state.targetId;
      let enteredStationId: string | undefined;
      const targetSystem = systemById[autopilot.targetSystemId];
      const targetStation = stationById[autopilot.targetStationId];

      if (!targetSystem || !targetStation) {
        set({
          autopilot: undefined,
          runtime: { ...runtime, message: "Autopilot route failed. Manual control restored." },
          input: { ...emptyInput }
        });
        return;
      }

      if (autopilot.phase === "to-origin-gate") {
        const gatePosition = getJumpGatePosition(currentSystemId);
        const step = integrateAutopilotStep({
          player,
          targetPosition: gatePosition,
          delta,
          maxSpeed: 680,
          arriveDistance: GATE_ARRIVAL_DISTANCE
        });
        player = step.player;
        runtime.effects.push(navEffect(gatePosition, `Gate ${Math.round(step.distanceToTarget)}m`));
        runtime.message = `Autopilot: aligning to jump gate · ${Math.round(step.distanceToTarget)}m`;
        autopilot = { ...autopilot, targetPosition: gatePosition };
        if (step.distanceToTarget <= GATE_ARRIVAL_DISTANCE) {
          audioSystem.play("jump-gate");
          autopilot = {
            ...autopilot,
            phase: "gate-activation",
            targetPosition: gatePosition,
            timer: 0,
            cancelable: false
          };
          runtime.message = "Gate approach locked. Spooling jump field.";
        }
      } else if (autopilot.phase === "gate-activation") {
        const gatePosition = getJumpGatePosition(currentSystemId);
        const progress = clamp(autopilot.timer / GATE_ACTIVATION_SECONDS, 0, 1);
        const step = integrateAutopilotStep({
          player,
          targetPosition: gatePosition,
          delta,
          maxSpeed: 260,
          arriveDistance: 10
        });
        player = step.player;
        runtime.effects.push(gateSpoolEffect(gatePosition, progress));
        runtime.message = `Gate spool-up ${Math.round(progress * 100)}%`;
        if (progress >= 1) {
          audioSystem.play("wormhole");
          autopilot = {
            ...autopilot,
            phase: "wormhole",
            targetPosition: gatePosition,
            timer: 0,
            cancelable: false
          };
          runtime.effects.push(wormholeEffect(player.position));
          runtime.message = "Wormhole transit engaged.";
        }
      } else if (autopilot.phase === "wormhole") {
        const progress = clamp(autopilot.timer / WORMHOLE_SECONDS, 0, 1);
        const forward = forwardFromRotation(player.rotation);
        player = {
          ...player,
          position: add(player.position, scale(forward, (760 + progress * 380) * delta)),
          velocity: scale(forward, 820 + progress * 360),
          throttle: 1,
          energy: clamp(player.energy + delta * 42, 0, player.stats.energy)
        };
        runtime.effects.push(wormholeEffect(player.position));
        runtime.message = `Wormhole transit ${Math.round(progress * 100)}%`;
        if (progress >= 1) {
          currentSystemId = targetSystem.id;
          currentStationId = undefined;
          knownSystems = revealNeighborSystems(knownSystems, targetSystem.id);
          knownPlanetIds = mergeKnownPlanetIds(knownPlanetIds, knownSystems, targetStation.id);
          targetId = undefined;
          const arrivalPosition = getStationArrivalPosition(targetStation.id) ?? add(targetStation.position, [0, 36, 240]);
          const exitDirection = normalize(sub(targetStation.position, arrivalPosition));
          player = {
            ...player,
            position: arrivalPosition,
            velocity: scale(exitDirection, 120),
            rotation: rotationToward(exitDirection),
            throttle: 0.25
          };
          runtime = {
            ...createRuntimeForSystem(targetSystem.id, state.activeMissions),
            message: `Arrived near ${targetStation.name}. Press E to dock.`,
            effects: [wormholeEffect(player.position)]
          };
          autopilot = undefined;
        }
      } else if (autopilot.phase === "to-destination-station") {
        const step = integrateAutopilotStep({
          player,
          targetPosition: targetStation.position,
          delta,
          maxSpeed: 620,
          arriveDistance: STATION_DOCK_DISTANCE
        });
        player = step.player;
        runtime.effects.push(navEffect(targetStation.position, `Dock ${Math.round(step.distanceToTarget)}m`));
        runtime.message = `Autopilot: approaching ${targetStation.name} · ${Math.round(step.distanceToTarget)}m`;
        if (step.distanceToTarget <= STATION_DOCK_DISTANCE) {
          autopilot = undefined;
          player = { ...player, velocity: [0, 0, 0], throttle: 0 };
          runtime.message = `Arrived near ${targetStation.name}. Press E to dock.`;
        }
      } else if (autopilot.phase === "docking") {
        const step = integrateAutopilotStep({
          player,
          targetPosition: targetStation.position,
          delta,
          maxSpeed: 170,
          arriveDistance: 150
        });
        player = step.player;
        runtime.message = `Docking with ${targetStation.name}...`;
        if (autopilot.timer >= 0.9 || step.distanceToTarget <= 220) {
          screen = "station";
          previousScreen = "flight";
          currentStationId = targetStation.id;
          enteredStationId = targetStation.id;
          autopilot = undefined;
          player = { ...player, velocity: [0, 0, 0], throttle: 0 };
          runtime.message = `Docking complete at ${targetStation.name}.`;
        }
      }

      const expiration = applyExpiredMissions({
        player,
        reputation: state.reputation,
        activeMissions: state.activeMissions,
        failedMissionIds: state.failedMissionIds,
        runtime,
        gameClock
      });
      const stationAutoSave = enteredStationId
        ? writeStationAutoSave(state, {
            currentSystemId,
            currentStationId: enteredStationId,
            gameClock,
            player: expiration.player,
            activeMissions: expiration.activeMissions,
            failedMissionIds: expiration.failedMissionIds,
            marketState,
            reputation: expiration.reputation,
            knownSystems,
            knownPlanetIds
          })
        : {};

      set({
        player: expiration.player,
        runtime: expiration.runtime,
        autopilot,
        currentSystemId,
        currentStationId,
        screen,
        previousScreen,
        knownSystems,
        knownPlanetIds,
        targetId,
        gameClock,
        marketState,
        activeMissions: expiration.activeMissions,
        failedMissionIds: expiration.failedMissionIds,
        reputation: expiration.reputation,
        ...stationAutoSave,
        primaryCooldown: Math.max(0, state.primaryCooldown - delta),
        secondaryCooldown: Math.max(0, state.secondaryCooldown - delta),
        input:
          screen === "station"
            ? { ...emptyInput }
            : { ...get().input, interact: false, cycleTarget: false, toggleMap: false, toggleCamera: false, pause: false, mouseDX: 0, mouseDY: 0 }
      });
      return;
    }

    let player = state.player;
    const equipmentEffects = getEquipmentEffects(player.equipment);
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

    let runtime: RuntimeState = {
      ...state.runtime,
      clock: now,
      enemies: state.runtime.enemies.map((ship) => ({
        ...ship,
        fireCooldown: ship.fireCooldown - delta,
        deathTimer: ship.deathTimer === undefined ? undefined : ship.deathTimer - delta
      })),
      convoys: state.runtime.convoys.map((convoy) => {
        if (convoy.arrived || convoy.hull <= 0) return convoy;
        const toDestination = sub(convoy.destinationPosition, convoy.position);
        const distToDestination = distance(convoy.position, convoy.destinationPosition);
        if (distToDestination < 170) {
          return { ...convoy, arrived: true, velocity: [0, 0, 0] };
        }
        const direction = normalize(toDestination);
        const velocity = scale(direction, 128);
        return regenerateShield({ ...convoy, velocity, position: add(convoy.position, scale(velocity, delta)) }, convoy.maxShield, now, delta, 5);
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
    let explorationState = state.explorationState;
    let knownPlanetIds = state.knownPlanetIds;
    let primaryCooldown = Math.max(0, state.primaryCooldown - delta);
    let secondaryCooldown = Math.max(0, state.secondaryCooldown - delta);
    const target = runtime.enemies.find((ship) => ship.id === state.targetId && ship.hull > 0);

    const nearestAsteroid = runtime.asteroids
      .filter((asteroid) => asteroid.amount > 0)
      .map((asteroid) => ({ asteroid, dist: distance(player.position, asteroid.position) }))
      .sort((a, b) => a.dist - b.dist)[0];

    const miningRange = equipmentById["mining-beam"].weapon?.range ?? 360;
    const miningActive = !!(
      input.firePrimary &&
      hasMiningBeam(player.equipment) &&
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
            const progress = asteroid.miningProgress + getMiningProgressIncrement(asteroid.resource, delta);
            if (progress < 1) {
              miningMessage = `Mining ${commodityById[asteroid.resource].name} vein · ${Math.round(progress * 100)}%`;
              return { ...asteroid, miningProgress: progress };
            }

            const chunk = Math.min(MINING_YIELD_PER_CYCLE, asteroid.amount);
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
        player = { ...player, energy: clamp(player.energy - delta * MINING_ENERGY_DRAIN_PER_SECOND, 0, player.stats.energy) };
        primaryCooldown = Math.max(primaryCooldown, MINING_COOLDOWN_SECONDS);
      }
    } else if (input.firePrimary && primaryWeapon && primaryCooldown <= 0 && player.energy >= primaryWeapon.energyCost) {
      runtime.projectiles.push({
        id: projectileId("laser"),
        owner: "player",
        kind: "laser",
        position: add(player.position, scale(forward, 16)),
        direction: target ? normalize(sub(target.position, player.position)) : forward,
        speed: primaryWeapon.speed,
        damage: primaryWeapon.damage,
        life: primaryWeapon.speed > 0 ? primaryWeapon.range / primaryWeapon.speed : 1.4,
        targetId: target?.id
      });
      audioSystem.play("laser");
      player = { ...player, energy: player.energy - primaryWeapon.energyCost };
      primaryCooldown = getWeaponCooldown(primaryWeapon, player.equipment);
    }

    if (input.fireSecondary && secondaryWeapon && secondaryCooldown <= 0 && player.missiles > 0) {
      runtime.projectiles.push({
        id: projectileId("missile"),
        owner: "player",
        kind: "missile",
        position: add(player.position, scale(forward, 18)),
        direction: target ? normalize(sub(target.position, player.position)) : forward,
        speed: secondaryWeapon.speed,
        damage: secondaryWeapon.damage,
        life: secondaryWeapon.speed > 0 ? secondaryWeapon.range / secondaryWeapon.speed : 3.6,
        targetId: target?.id
      });
      audioSystem.play("missile");
      player = { ...player, missiles: player.missiles - 1 };
      secondaryCooldown = getWeaponCooldown(secondaryWeapon, player.equipment);
    }

    const pirates = sortPirateTargets(runtime.enemies);
    const graceActive = now < runtime.graceUntil;
    let reputation = state.reputation;
    let contrabandScanMessage: string | undefined;
    runtime.enemies = runtime.enemies.map((ship) => {
      if (ship.hull <= 0 || ship.deathTimer !== undefined) return ship;
      const ai = resolveCombatAiStep({
        ship,
        systemId: state.currentSystemId,
        risk: systemById[state.currentSystemId].risk,
        playerPosition: player.position,
        playerHasContraband: (player.cargo["illegal-contraband"] ?? 0) > 0,
        delta,
        now,
        graceUntil: runtime.graceUntil,
        pirates,
        convoys: runtime.convoys
      });
      let moved = {
        ...ai.ship,
        velocity: scale(ai.desiredDirection, ai.speed),
        position: add(ship.position, scale(ai.desiredDirection, ai.speed * delta))
      };
      if (ai.scanComplete) {
        const law = getContrabandLaw(state.currentSystemId);
        const contrabandAmount = player.cargo["illegal-contraband"] ?? 0;
        if (contrabandAmount > 0 && law.disposition === "fine-confiscate") {
          const fine = contrabandAmount * CONTRABAND_FINE_PER_UNIT;
          const cargo = { ...player.cargo };
          delete cargo["illegal-contraband"];
          player = {
            ...player,
            cargo,
            credits: Math.max(0, player.credits - fine)
          };
          reputation = updateReputation(reputation, systemById[state.currentSystemId].factionId, -2);
          moved = { ...moved, scanProgress: undefined, aiState: "patrol", aiTargetId: undefined };
          contrabandScanMessage = `${law.label}: ${contrabandAmount} Illegal Contraband confiscated. Fine ${fine.toLocaleString()} cr.`;
        } else if (contrabandAmount > 0 && law.disposition === "hostile-pursuit") {
          moved = { ...moved, aiState: "attack", aiTargetId: "player", scanProgress: 1 };
          contrabandScanMessage = `${law.label}: patrol has marked you hostile for Illegal Contraband.`;
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

    if (runtime.explorationScan) {
      const signal = explorationSignalById[runtime.explorationScan.signalId];
      if (!signal || explorationState.completedSignalIds.includes(runtime.explorationScan.signalId)) {
        runtime = { ...runtime, explorationScan: undefined };
      } else {
        const scanDistance = distance(player.position, signal.position);
        const inRange = scanDistance <= getEffectiveSignalScanRange(signal, player.equipment);
        const inBand = inRange && isFrequencyInSignalBand(signal, runtime.explorationScan.frequency, player.equipment);
        const progress = clamp(
          runtime.explorationScan.progress + (inBand ? delta / signal.scanTime : -delta * 0.22),
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
                : `Tuning ${signal.title}: align frequency inside ${getEffectiveSignalScanBand(signal, player.equipment).join("-")}.`
              : `${signal.title} scan paused. Return within ${Math.round(getEffectiveSignalScanRange(signal, player.equipment))}m.`
          };
        }
      }
    }

    const remainingProjectiles: ProjectileEntity[] = [];
    const lootDrops: LootEntity[] = [];
    let destroyedPirates = runtime.destroyedPirates;
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
      } else if (projectile.owner === "enemy" && distance(movedProjectile.position, player.position) < 22) {
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
      } else if (projectile.owner === "player" || projectile.owner === "patrol") {
        runtime.enemies = runtime.enemies.map((ship) => {
          const validTarget = projectile.owner === "patrol" ? ship.role === "pirate" : ship.role === "pirate" || isHostileToPlayer(ship);
          if (!validTarget || ship.hull <= 0 || ship.deathTimer !== undefined || consumed || distance(movedProjectile.position, ship.position) > 25) return ship;
          const shielded = ship.shield > 0;
          const damaged = applyDamage(ship, projectile.damage, now);
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
            if (ship.role === "pirate") destroyedPirates += 1;
            const eliteLoot = ship.role === "pirate" && ship.elite;
            lootDrops.push({
              id: projectileId("loot"),
              commodityId: ship.role === "pirate" ? "illegal-contraband" : "mechanical-parts",
              amount: eliteLoot ? 2 : ship.role === "pirate" ? 1 : 2,
              position: ship.position,
              velocity: [18 - Math.random() * 36, 24 + Math.random() * 18, 18 - Math.random() * 36],
              rarity: eliteLoot ? "epic" : ship.role === "pirate" ? "rare" : "uncommon"
            });
            runtime.effects.push({
              id: projectileId("explosion"),
              kind: "explosion",
              position: ship.position,
              color: ship.role === "pirate" ? "#ff784f" : "#64e4ff",
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
            return { ...damaged, deathTimer: 0.42 };
          }
          return damaged;
        });
      }
      if (!consumed) remainingProjectiles.push(movedProjectile);
    }
    runtime = {
      ...runtime,
      projectiles: remainingProjectiles,
      enemies: runtime.enemies.filter((ship) => ship.hull > 0 || (ship.deathTimer ?? 0) > 0),
      loot: [...runtime.loot, ...lootDrops],
      destroyedPirates
    };

    let activeMissions = state.activeMissions.map((mission) => {
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
      set({ screen: "galaxyMap", previousScreen: "flight", galaxyMapMode: "browse" });
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
      gameClock
    });
    const missionFailedThisFrame = expiration.failedMissionIds.length > failedMissionIds.length;
    const explorationMessageActive = !!state.runtime.explorationScan || !!runtime.explorationScan || explorationState !== state.explorationState;

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
            : lootDrops.length
              ? "Target destroyed. Cargo canister released."
              : miningActive
                ? expiration.runtime.message
              : explorationMessageActive
                ? expiration.runtime.message
              : graceActive
                ? `Pirates are sizing you up · weapons free in ${Math.ceil(runtime.graceUntil - now)}s`
              : expiration.runtime.message
      },
      gameClock,
      marketState,
      knownPlanetIds,
      activeMissions: expiration.activeMissions,
      failedMissionIds: expiration.failedMissionIds,
      reputation: expiration.reputation,
      explorationState,
      primaryCooldown,
      secondaryCooldown,
      screen: expiration.player.hull <= 0 ? "gameOver" : get().screen,
      targetId: runtime.enemies.some((ship) => ship.id === state.targetId && ship.hull > 0 && ship.deathTimer === undefined)
        ? state.targetId
        : sortPirateTargets(runtime.enemies)[0]?.id
    });
  },
  advanceGameClock: (delta) => {
    const state = get();
    if (delta <= 0) return;
    const gameClock = state.gameClock + delta;
    const expiration = applyExpiredMissions({
      player: state.player,
      reputation: state.reputation,
      activeMissions: state.activeMissions,
      failedMissionIds: state.failedMissionIds,
      runtime: state.runtime,
      gameClock
    });
    set({
      gameClock,
      marketState: advanceMarketState(state.marketState, delta),
      player: expiration.player,
      reputation: expiration.reputation,
      activeMissions: expiration.activeMissions,
      failedMissionIds: expiration.failedMissionIds,
      runtime: expiration.runtime
    });
  },
  cycleTarget: () => {
    const pirates = sortPirateTargets(get().runtime.enemies);
    if (pirates.length === 0) return set({ targetId: undefined });
    const currentIndex = pirates.findIndex((ship) => ship.id === get().targetId);
    set({ targetId: pirates[(currentIndex + 1) % pirates.length].id });
  },
  interact: () => {
    const state = get();
    const equipmentEffects = getEquipmentEffects(state.player.equipment);
    const navigationTarget = getNearestNavigationTarget(state.currentSystemId, state.player.position, state.knownPlanetIds, {
      explorationState: state.explorationState,
      installedEquipment: state.player.equipment
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
      let collected = 0;
      for (const loot of nearLoot) {
        const result = addCargoWithinCapacity(player, loot.commodityId, loot.amount, state.activeMissions);
        player = result.player;
        collected += result.collected;
        if (result.collected > 0) collectedIds.add(loot.id);
      }
      set({
        player,
        runtime: {
          ...state.runtime,
          loot: state.runtime.loot.filter((loot) => !collectedIds.has(loot.id)),
          message: collected > 0 ? `Collected ${collected} cargo unit(s).` : "Cargo hold full."
        }
      });
      if (collected > 0) audioSystem.play("loot");
      return;
    }
    if (navigationTarget?.inRange && navigationTarget.kind === "exploration-signal") {
      const signal = navigationTarget.signal;
      const alreadyComplete = state.explorationState.completedSignalIds.includes(signal.id);
      if (alreadyComplete) {
        set({ runtime: { ...state.runtime, message: `${signal.title} already resolved.` } });
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
          message: `Signal handshake opened: ${signal.title}. Tune frequency into ${getEffectiveSignalScanBand(signal, state.player.equipment).join("-")}.`
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
  dockAt: (stationId) => {
    const state = get();
    const station = stationById[stationId];
    if (!station) return;
    if (station.hidden && !isHiddenStationRevealed(station.id, state.explorationState)) {
      set({ runtime: { ...state.runtime, message: "Station beacon is still masked." } });
      return;
    }
    const knownPlanetIds = state.knownPlanetIds.includes(station.planetId)
      ? state.knownPlanetIds
      : [...state.knownPlanetIds, station.planetId];
    const stationAutoSave = writeStationAutoSave(state, {
      currentSystemId: station.systemId,
      currentStationId: station.id,
      knownPlanetIds
    });
    audioSystem.play("dock");
    set({
      screen: "station",
      currentSystemId: station.systemId,
      currentStationId: station.id,
      knownPlanetIds,
      stationTab: "Market",
      previousScreen: "flight",
      autopilot: undefined,
      ...stationAutoSave
    });
  },
  undock: () =>
    set((state) => {
      audioSystem.play("undock");
      return {
        screen: "flight",
        currentStationId: undefined,
        previousScreen: "station",
        autopilot: undefined,
        player: { ...state.player, position: launchPositionForStation(state.currentStationId, state.player.position), throttle: 0.2 }
      };
    }),
  startJumpToStation: (stationId) => {
    const state = get();
    const targetStation = stationById[stationId];
    const targetSystem = targetStation ? systemById[targetStation.systemId] : undefined;
    if (!targetSystem || !targetStation || targetStation.id === state.currentStationId || !isKnownStation(stationId, state.knownPlanetIds, state.explorationState)) return;
    if (targetSystem.id !== state.currentSystemId && !isKnownSystem(state.knownSystems, targetSystem.id)) return;
    const originGate = getJumpGatePosition(state.currentSystemId);
    const launchPosition = state.screen === "station" ? launchPositionForStation(state.currentStationId, state.player.position) : state.player.position;
    const sameSystem = targetSystem.id === state.currentSystemId;
    const targetPosition = sameSystem ? targetStation.position : originGate;
    set({
      screen: "flight",
      previousScreen: state.screen,
      currentStationId: undefined,
      targetId: undefined,
      stationTab: "Galaxy Map",
      autopilot: {
        phase: sameSystem ? "to-destination-station" : "to-origin-gate",
        originSystemId: state.currentSystemId,
        targetSystemId: targetSystem.id,
        targetStationId: targetStation.id,
        targetPosition,
        timer: 0,
        cancelable: true
      },
      player: {
        ...state.player,
        position: launchPosition,
        velocity: [0, 0, 0],
        rotation: rotationToward(sub(targetPosition, launchPosition)),
        throttle: 0.55
      },
      runtime: {
        ...state.runtime,
        graceUntil: Math.max(state.runtime.graceUntil, state.runtime.clock + 5),
        effects: [...state.runtime.effects, navEffect(targetPosition, sameSystem ? targetStation.name : "Jump Gate")],
        message: sameSystem
          ? `Autopilot: plotting local route to ${targetStation.name}. Manual input cancels.`
          : `Autopilot: plotting jump to ${targetStation.name}. Manual input cancels.`
      },
      input: { ...emptyInput },
      primaryCooldown: 0,
      secondaryCooldown: 0
    });
  },
  startJumpToSystem: (systemId) => {
    const targetStation = getDefaultTargetStation(systemId);
    if (!targetStation) return;
    get().startJumpToStation(targetStation.id);
  },
  activateStargateJumpToStation: (stationId) => {
    const state = get();
    const targetStation = stationById[stationId];
    const targetSystem = targetStation ? systemById[targetStation.systemId] : undefined;
    const originGate = getJumpGatePosition(state.currentSystemId);
    if (!targetSystem || !targetStation || !isKnownStation(stationId, state.knownPlanetIds, state.explorationState)) return;
    if (targetSystem.id !== state.currentSystemId && !isKnownSystem(state.knownSystems, targetSystem.id)) return;
    if (distance(state.player.position, originGate) >= STARGATE_INTERACTION_RANGE) {
      set({ runtime: { ...state.runtime, message: "Stargate link lost. Move closer to activate." }, screen: "flight", previousScreen: state.screen, galaxyMapMode: "browse" });
      return;
    }
    if (targetSystem.id === state.currentSystemId) {
      set({
        screen: "flight",
        previousScreen: state.screen,
        galaxyMapMode: "browse",
        currentStationId: undefined,
        targetId: undefined,
        stationTab: "Galaxy Map",
        autopilot: {
          phase: "to-destination-station",
          originSystemId: state.currentSystemId,
          targetSystemId: targetSystem.id,
          targetStationId: targetStation.id,
          targetPosition: targetStation.position,
          timer: 0,
          cancelable: true
        },
        player: {
          ...state.player,
          velocity: [0, 0, 0],
          rotation: rotationToward(sub(targetStation.position, state.player.position)),
          throttle: 0.45
        },
        runtime: {
          ...state.runtime,
          graceUntil: Math.max(state.runtime.graceUntil, state.runtime.clock + 5),
          effects: [...state.runtime.effects, navEffect(targetStation.position, targetStation.name)],
          message: `Stargate local vector set for ${targetStation.name}. Manual input cancels.`
        },
        input: { ...emptyInput },
        primaryCooldown: 0,
        secondaryCooldown: 0
      });
      return;
    }
    audioSystem.play("jump-gate");
    set({
      screen: "flight",
      previousScreen: state.screen,
      galaxyMapMode: "browse",
      currentStationId: undefined,
      targetId: undefined,
      stationTab: "Galaxy Map",
      autopilot: {
        phase: "gate-activation",
        originSystemId: state.currentSystemId,
        targetSystemId: targetSystem.id,
        targetStationId: targetStation.id,
        targetPosition: originGate,
        timer: 0,
        cancelable: false
      },
      player: {
        ...state.player,
        position: distance(state.player.position, originGate) < 12 ? originGate : state.player.position,
        velocity: [0, 0, 0],
        rotation: rotationToward(sub(originGate, state.player.position)),
        throttle: 0.25
      },
      runtime: {
        ...state.runtime,
        graceUntil: Math.max(state.runtime.graceUntil, state.runtime.clock + 5),
        effects: [...state.runtime.effects, gateSpoolEffect(originGate, 0.05)],
        message: `Stargate locked for ${targetStation.name}. Spooling jump field.`
      },
      input: { ...emptyInput },
      primaryCooldown: 0,
      secondaryCooldown: 0
    });
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
    if (!systemById[systemId]) return;
    set((state) => ({
      screen: state.screen === "galaxyMap" || state.screen === "station" ? "flight" : state.screen,
      previousScreen: state.screen,
      galaxyMapMode: "browse",
      currentSystemId: systemId,
      currentStationId: undefined,
      runtime: { ...createRuntimeForSystem(systemId, state.activeMissions), message: `Jumped to ${systemById[systemId].name}.` },
      autopilot: undefined,
      targetId: undefined,
      knownSystems: revealNeighborSystems(state.knownSystems, systemId),
      knownPlanetIds: mergeKnownPlanetIds(state.knownPlanetIds, revealNeighborSystems(state.knownSystems, systemId)),
      input: { ...emptyInput },
      player: { ...state.player, position: add(getJumpGatePosition(systemId), [0, 0, 150]), velocity: [0, 0, 0], rotation: [0, 0, 0], throttle: 0.25 }
    }));
  },
  buy: (commodityId, amount = 1) => {
    const state = get();
    if (!state.currentStationId) return;
    const station = stationById[state.currentStationId];
    const system = systemById[state.currentSystemId];
    const reservedCargo = getOccupiedCargo(state.player.cargo, state.activeMissions) - getCargoUsed(state.player.cargo);
    const result = buyCommodity(state.player, station, system, commodityId, amount, state.reputation.factions[station.factionId], state.marketState, reservedCargo);
    set({ player: result.player, marketState: result.marketState ?? state.marketState, runtime: { ...state.runtime, message: result.message } });
  },
  sell: (commodityId, amount = 1) => {
    const state = get();
    if (!state.currentStationId) return;
    const station = stationById[state.currentStationId];
    const system = systemById[state.currentSystemId];
    const result = sellCommodity(state.player, station, system, commodityId, amount, state.reputation.factions[station.factionId], state.marketState);
    const completedCargo: CargoHold = { ...state.runtime.mined };
    set({ player: result.player, marketState: result.marketState ?? state.marketState, runtime: { ...state.runtime, mined: completedCargo, message: result.message } });
  },
  acceptMission: (missionId) => {
    const state = get();
    const mission = missionTemplates.find((candidate) => candidate.id === missionId);
    if (!mission) return;
    if (state.completedMissionIds.includes(missionId) || (state.failedMissionIds.includes(missionId) && !mission.retryOnFailure)) {
      set({ runtime: { ...state.runtime, message: "That contract is no longer available." } });
      return;
    }
    if (!areMissionPrerequisitesMet(mission, state.completedMissionIds)) {
      set({ runtime: { ...state.runtime, message: "Mission prerequisites are not complete." } });
      return;
    }
    const result = acceptMissionPure(state.player, state.activeMissions, mission, state.gameClock);
    const runtime = result.mission ? addMissionRuntimeEntity(state.runtime, result.mission, state.currentSystemId) : state.runtime;
    if (result.ok) audioSystem.play("ui-click");
    set({
      player: result.player,
      activeMissions: result.activeMissions,
      failedMissionIds: result.ok && mission.retryOnFailure ? state.failedMissionIds.filter((id) => id !== missionId) : state.failedMissionIds,
      runtime: { ...runtime, message: result.message }
    });
  },
  completeMission: (missionId) => {
    const state = get();
    if (!state.currentStationId) return;
    const mission = state.activeMissions.find((candidate) => candidate.id === missionId);
    if (!mission || !canCompleteMission(mission, state.player, state.currentSystemId, state.currentStationId, state.runtime.destroyedPirates, state.gameClock)) {
      set({ runtime: { ...state.runtime, message: "Mission requirements are not complete." } });
      return;
    }
    const result = completeMissionPure(mission, state.player, state.reputation);
    audioSystem.play("mission-complete");
    set({
      player: result.player,
      reputation: result.reputation,
      activeMissions: state.activeMissions.filter((active) => active.id !== missionId),
      completedMissionIds: [...state.completedMissionIds, missionId],
      runtime: {
        ...state.runtime,
        convoys: state.runtime.convoys.filter((convoy) => convoy.missionId !== missionId),
        salvage: state.runtime.salvage.filter((salvage) => salvage.missionId !== missionId),
        message: `${mission.title} complete. +${mission.reward} credits.`
      }
    });
  },
  repairAndRefill: () => {
    const state = get();
    const missingHull = state.player.stats.hull - state.player.hull;
    const missileNeed = 6 - state.player.missiles;
    const cost = Math.round(missingHull * 4 + missileNeed * 45);
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
  craftEquipment: (equipmentId) => {
    const state = get();
    if (!(equipmentId in equipmentById)) {
      set({ runtime: { ...state.runtime, message: "Unknown equipment blueprint." } });
      return;
    }
    const typedEquipmentId = equipmentId as EquipmentId;
    const equipment = equipmentById[typedEquipmentId];
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

export { cloneMissionTemplates, commodities, planetById, planets, shipById, ships, stationById, stations, systemById, systems };
