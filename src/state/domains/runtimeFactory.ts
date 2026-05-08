import { dialogueSceneById, equipmentById, equipmentList, missionTemplates, planetById, planets, shipById, stationById, systemById } from "../../data/world";
import type {
  ActiveDialogueState,
  CargoHold,
  CommodityId,
  ConvoyEntity,
  DialogueState,
  EquipmentId,
  ExplorationState,
  FlightEntity,
  LootEntity,
  MissionDefinition,
  PlayerState,
  RuntimeState,
  SalvageEntity,
  Vec3
} from "../../types/game";
import type { EconomyNpcEntity } from "../../types/economy";
import { createAsteroidsForSystem } from "../../systems/asteroids";
import { getJumpGatePosition } from "../../systems/autopilot";
import { getCombatLoadout } from "../../systems/combatDoctrine";
import { getPirateAiProfile } from "../../systems/combatAi";
import { getPirateSpawnCount, getPirateSpawnPosition, STARTER_GRACE_SECONDS } from "../../systems/difficulty";
import { getOccupiedCargo } from "../../systems/economy";
import { getEffectiveShipStats, getStarterBlueprintIds } from "../../systems/equipment";
import { isHiddenStationRevealed } from "../../systems/exploration";
import { isDialogueSceneSeen, markDialogueSceneSeen } from "../../systems/dialogue";
import { cloneMission } from "../../systems/missions";
import { getInitialKnownPlanetIds } from "../../systems/navigation";
import { add, normalize, scale, sub } from "../../systems/math";

export const SHIP_STORAGE_STATION_ID = "ptd-home";

export function createInitialPlayer(): PlayerState {
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
    unlockedBlueprintIds: getStarterBlueprintIds(),
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

export function createShipEntity(id: string, role: FlightEntity["role"], position: Vec3, systemId = "helion-reach", index = 0): FlightEntity {
  const pirateProfile = role === "pirate" ? getPirateAiProfile(systemId, index, systemById[systemId]?.risk ?? 0) : undefined;
  const roleStats = {
    pirate: { hull: 70, shield: 42, factionId: "independent-pirates" as const },
    patrol: { hull: 115, shield: 85, factionId: "solar-directorate" as const },
    trader: { hull: 85, shield: 55, factionId: "free-belt-union" as const },
    freighter: { hull: 170, shield: 70, factionId: "free-belt-union" as const },
    courier: { hull: 72, shield: 48, factionId: "solar-directorate" as const },
    miner: { hull: 125, shield: 58, factionId: "free-belt-union" as const },
    smuggler: { hull: 96, shield: 68, factionId: "vossari-clans" as const },
    drone: { hull: 92, shield: 86, factionId: "unknown-drones" as const },
    relay: { hull: 160, shield: 120, factionId: "unknown-drones" as const }
  }[role];
  const names: Record<FlightEntity["role"], string> = {
    pirate: "Knife Wing Pirate",
    patrol: "Directorate Patrol",
    trader: "Belt Trader",
    freighter: "Union Bulk Freighter",
    courier: "Gate Courier",
    miner: "Ore Cutter",
    smuggler: "Vossari Smuggler",
    drone: "Unknown Drone",
    relay: "Signal Relay"
  };
  const profiles: Record<Exclude<FlightEntity["role"], "pirate">, FlightEntity["aiProfileId"]> = {
    patrol: "law-patrol",
    trader: "hauler",
    freighter: "freighter",
    courier: "courier",
    miner: "miner",
    smuggler: "smuggler",
    drone: "drone-hunter",
    relay: "relay-core"
  };
  const elite = !!pirateProfile?.elite;
  const hull = elite ? Math.round(roleStats.hull * 1.72) : roleStats.hull;
  const shield = elite ? Math.round(roleStats.shield * 1.88) : roleStats.shield;
  const aiProfileId = pirateProfile?.aiProfileId ?? (role === "pirate" ? "raider" : profiles[role]);
  const loadout = getCombatLoadout({
    role,
    factionId: roleStats.factionId,
    aiProfileId,
    systemId,
    risk: systemById[systemId]?.risk ?? 0,
    elite
  });
  return {
    id,
    name: elite ? "Elite Knife Wing Ace" : names[role],
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
    aiProfileId,
    loadoutId: loadout.id,
    aiState: "patrol",
    aiTimer: 0,
    elite
  };
}

export function isEconomyTrafficRole(role: FlightEntity["role"]): role is EconomyNpcEntity["role"] {
  return role === "trader" || role === "freighter" || role === "courier" || role === "miner" || role === "smuggler";
}

function aiProfileForEconomyNpc(npc: EconomyNpcEntity): FlightEntity["aiProfileId"] {
  const profiles = {
    trader: "hauler",
    freighter: "freighter",
    courier: "courier",
    miner: "miner",
    smuggler: "smuggler"
  } satisfies Record<EconomyNpcEntity["role"], FlightEntity["aiProfileId"]>;
  if (npc.factionId === "solar-directorate" && npc.role !== "courier") return "law-patrol";
  return profiles[npc.role];
}

export function materializeEconomyNpc(npc: EconomyNpcEntity): FlightEntity {
  const aiProfileId = aiProfileForEconomyNpc(npc);
  const ledger = npc.ledger ?? { revenue: 0, expenses: 0, losses: 0, completedContracts: 0, failedContracts: 0, minedUnits: 0 };
  const loadout = getCombatLoadout({
    role: npc.role,
    factionId: npc.factionId,
    aiProfileId,
    systemId: npc.systemId,
    risk: systemById[npc.systemId]?.risk ?? 0
  });
  return {
    id: npc.id,
    name: npc.name,
    role: npc.role,
    factionId: npc.factionId,
    position: [...npc.position],
    velocity: [...npc.velocity],
    hull: npc.hull,
    shield: npc.shield,
    maxHull: npc.maxHull,
    maxShield: npc.maxShield,
    lastDamageAt: -999,
    fireCooldown: 0.6,
    aiProfileId,
    loadoutId: loadout.id,
    aiState: "patrol",
    aiTimer: 0,
    economySystemId: npc.systemId,
    economySerial: npc.serial ?? npc.id,
    economyHomeStationId: npc.homeStationId ?? npc.task.originStationId,
    economyRiskPreference: npc.riskPreference ?? "balanced",
    economyContractId: npc.task.contractId,
    economyLedger: { ...ledger },
    economyTaskKind: npc.task.kind,
    economyTaskProgress: npc.task.progress,
    economyStatus: npc.statusLabel,
    economyCargo: { ...npc.cargo },
    economyCommodityId: npc.task.commodityId,
    economyTargetId: npc.task.asteroidId ?? npc.task.destinationStationId ?? npc.task.originStationId
  };
}

function trafficPosition(systemId: string, index: number): Vec3 {
  const system = systemById[systemId];
  const station = stationById[system.stationIds[0]];
  const gate = getJumpGatePosition(systemId);
  const anchor = station ? scale(add(station.position, gate), 0.5) : gate;
  const angle = index * 1.72 + system.risk * 2.4;
  const radius = 220 + index * 58;
  return add(anchor, [Math.cos(angle) * radius, (index % 3 - 1) * 38, Math.sin(angle) * radius]);
}

function createTrafficForSystem(systemId: string): FlightEntity[] {
  const risk = systemById[systemId].risk;
  const roles: FlightEntity["role"][] = ["trader", "freighter", "courier", "miner"];
  if (risk >= 0.35 || systemId === "ashen-drift") roles.push("smuggler");
  return roles.map((role, index) => createShipEntity(`${systemId}-${role}-${index}`, role, trafficPosition(systemId, index), systemId, index));
}

export function shouldSpawnSystemBoss(systemId: string): boolean {
  return (systemById[systemId]?.risk ?? 0) >= 0.6;
}

function createBossEntity(systemId: string): FlightEntity | undefined {
  if (!shouldSpawnSystemBoss(systemId)) return undefined;
  const position = add(getPirateSpawnPosition(systemId, 4), [140, 70, -260]);
  const aiProfileId: FlightEntity["aiProfileId"] = "boss-warlord";
  const loadout = getCombatLoadout({
    role: "pirate",
    factionId: "independent-pirates",
    aiProfileId,
    systemId,
    risk: systemById[systemId]?.risk ?? 0,
    elite: true,
    boss: true
  });
  return {
    id: `${systemId}-boss-warlord`,
    name: systemId === "ashen-drift" ? "Ashen Warlord Kass Vey" : "Corsair Warlord",
    role: "pirate",
    factionId: "independent-pirates",
    position,
    velocity: [0, 0, 0],
    hull: 255,
    shield: 190,
    maxHull: 255,
    maxShield: 190,
    lastDamageAt: -999,
    fireCooldown: 0.35,
    aiProfileId,
    loadoutId: loadout.id,
    aiState: "patrol",
    aiTimer: 0,
    elite: true,
    boss: true
  };
}

export function createPatrolSupportShip(systemId: string, index: number, targetId: string | undefined, anchor: Vec3, now: number): FlightEntity {
  const gate = getJumpGatePosition(systemId);
  const offset: Vec3 = [index === 0 ? -42 : 42, 20 + index * 14, 58 + index * 18];
  const position = add(scale(add(anchor, gate), 0.5), offset);
  const aiProfileId: FlightEntity["aiProfileId"] = "patrol-support";
  const loadout = getCombatLoadout({
    role: "patrol",
    factionId: "solar-directorate",
    aiProfileId,
    systemId,
    risk: systemById[systemId]?.risk ?? 0
  });
  return {
    id: `${systemId}-patrol-support-${Math.round(now * 10)}-${index}`,
    name: "Patrol Support Wing",
    role: "patrol",
    factionId: "solar-directorate",
    position,
    velocity: [0, 0, 0],
    hull: 96,
    shield: 72,
    maxHull: 96,
    maxShield: 72,
    lastDamageAt: -999,
    fireCooldown: 0.2 + index * 0.18,
    aiProfileId,
    loadoutId: loadout.id,
    aiState: targetId === "player" ? "attack" : targetId ? "intercept" : "patrol",
    aiTargetId: targetId,
    aiTimer: 0,
    supportWing: true
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
    fireCooldown: 0.7,
    convoyRole: "mission-tender",
    status: "en-route",
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

function createStoryTargetEntity(mission: MissionDefinition, targetId: string): FlightEntity | undefined {
  const target = mission.storyEncounter?.targets.find((item) => item.id === targetId);
  if (!target || mission.failed || mission.completed || mission.storyTargetDestroyedIds?.includes(target.id)) return undefined;
  const aiProfileId = target.aiProfileId ?? (target.role === "relay" ? "relay-core" : target.role === "drone" ? "drone-hunter" : target.role === "smuggler" ? "smuggler" : target.elite ? "elite-ace" : "raider");
  const loadout = getCombatLoadout({
    role: target.role,
    factionId: target.factionId,
    aiProfileId,
    systemId: target.systemId,
    risk: systemById[target.systemId]?.risk ?? 0,
    elite: target.elite
  });
  return {
    id: target.id,
    name: target.name,
    role: target.role,
    factionId: target.factionId,
    position: [...target.position],
    velocity: [0, 0, 0],
    hull: target.hull,
    shield: target.shield,
    maxHull: target.hull,
    maxShield: target.shield,
    lastDamageAt: -999,
    fireCooldown: target.role === "relay" ? 1.1 : 0.55,
    aiProfileId,
    loadoutId: loadout.id,
    aiState: "patrol",
    aiTimer: 0,
    elite: target.elite,
    missionId: mission.id,
    storyTarget: true,
    storyTargetKind: target.kind
  };
}

function createStoryTargetsForMission(systemId: string, mission: MissionDefinition): FlightEntity[] {
  return (mission.storyEncounter?.targets ?? [])
    .filter((target) => target.systemId === systemId)
    .map((target) => createStoryTargetEntity(mission, target.id))
    .filter(Boolean) as FlightEntity[];
}

function storyEncounterEffectsForMission(systemId: string, mission: MissionDefinition): RuntimeState["effects"] {
  const cue = mission.storyEncounter?.visualCue;
  if (!cue || cue.systemId !== systemId || mission.failed || mission.completed) return [];
  return [
    {
      id: projectileId("glass-wake-ping"),
      kind: "nav-ring",
      position: [...cue.position],
      color: "#ff9bd5",
      secondaryColor: "#9bffe8",
      label: cue.label,
      particleCount: 0,
      spread: 1,
      size: 76,
      life: 1.35,
      maxLife: 1.35
    }
  ];
}

export function missionRuntimeEntities(systemId: string, activeMissions: MissionDefinition[]) {
  return {
    convoys: activeMissions
      .filter((mission) => mission.originSystemId === systemId || mission.destinationSystemId === systemId)
      .map(createConvoyEntity)
      .filter(Boolean) as ConvoyEntity[],
    salvage: activeMissions
      .filter((mission) => mission.salvage?.systemId === systemId)
      .map(createSalvageEntity)
      .filter(Boolean) as SalvageEntity[],
    storyTargets: activeMissions.flatMap((mission) => createStoryTargetsForMission(systemId, mission)),
    effects: activeMissions.flatMap((mission) => storyEncounterEffectsForMission(systemId, mission))
  };
}

export function createRuntimeForSystem(systemId: string, activeMissions: MissionDefinition[] = []): RuntimeState {
  const system = systemById[systemId];
  const pirateCount = getPirateSpawnCount(systemId, system.risk);
  const asteroids = createAsteroidsForSystem(systemId, system.risk);
  const missionEntities = missionRuntimeEntities(systemId, activeMissions);
  const boss = createBossEntity(systemId);
  return {
    enemies: [
      ...Array.from({ length: pirateCount }, (_, index) =>
        createShipEntity(`${systemId}-pirate-${index}`, "pirate", getPirateSpawnPosition(systemId, index), systemId, index)
      ),
      ...(boss ? [boss] : []),
      createShipEntity(`${systemId}-patrol-0`, "patrol", [-190, 55, -360], systemId),
      ...createTrafficForSystem(systemId),
      ...missionEntities.storyTargets
    ],
    convoys: missionEntities.convoys,
    salvage: missionEntities.salvage,
    asteroids,
    loot: [],
    projectiles: [],
    effects: missionEntities.effects,
    destroyedPirates: 0,
    mined: {},
    clock: 0,
    graceUntil: STARTER_GRACE_SECONDS,
    message: "Flight systems online.",
    explorationScan: undefined
  };
}

export function projectileId(prefix: string): string {
  return `${prefix}-${Math.round(performance.now() * 1000)}-${Math.random().toString(16).slice(2)}`;
}

export function tickRuntimeEffects(runtime: RuntimeState, delta: number, clock: number): RuntimeState {
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

export function navEffect(position: Vec3, label: string): RuntimeState["effects"][number] {
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

export function gateSpoolEffect(position: Vec3, progress: number): RuntimeState["effects"][number] {
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

export function wormholeEffect(position: Vec3): RuntimeState["effects"][number] {
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

export function launchTrailEffect(startPosition: Vec3, endPosition: Vec3): RuntimeState["effects"][number] {
  return {
    id: projectileId("launch-trail"),
    kind: "launch-trail",
    position: startPosition,
    endPosition,
    color: "#6ee7ff",
    secondaryColor: "#ffd166",
    label: "LAUNCH",
    particleCount: 10,
    spread: 28,
    size: 18,
    life: 1.1,
    maxLife: 1.1
  };
}

export function dockCorridorEffect(startPosition: Vec3, endPosition: Vec3, label = "DOCKING"): RuntimeState["effects"][number] {
  return {
    id: projectileId("dock-corridor"),
    kind: "dock-corridor",
    position: startPosition,
    endPosition,
    color: "#9bffe8",
    secondaryColor: "#dff8ff",
    label,
    particleCount: 0,
    spread: 1,
    size: 36,
    life: 0.2,
    maxLife: 0.2
  };
}

export function addCargoWithinCapacity(
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

export function addMissionRuntimeEntity(runtime: RuntimeState, mission: MissionDefinition, systemId: string): RuntimeState {
  const convoy = (mission.originSystemId === systemId || mission.destinationSystemId === systemId) ? createConvoyEntity(mission) : undefined;
  const salvage = mission.salvage?.systemId === systemId ? createSalvageEntity(mission) : undefined;
  const storyTargets = createStoryTargetsForMission(systemId, mission).filter((target) => !runtime.enemies.some((enemy) => enemy.id === target.id));
  const storyEffects = storyEncounterEffectsForMission(systemId, mission);
  return {
    ...runtime,
    enemies: storyTargets.length > 0 ? [...runtime.enemies, ...storyTargets] : runtime.enemies,
    convoys: convoy && !runtime.convoys.some((item) => item.id === convoy.id) ? [...runtime.convoys, convoy] : runtime.convoys,
    salvage: salvage && !runtime.salvage.some((item) => item.id === salvage.id) ? [...runtime.salvage, salvage] : runtime.salvage,
    effects: storyEffects.length > 0 ? [...runtime.effects, ...storyEffects] : runtime.effects
  };
}

export function launchPositionForStation(stationId: string | undefined, fallback: Vec3): Vec3 {
  const station = stationId ? stationById[stationId] : undefined;
  const planet = station ? planetById[station.planetId] : undefined;
  const awayFromPlanet = station && planet ? normalize(sub(station.position, planet.position)) : [0, 0, 1] as Vec3;
  return station ? add(station.position, add(scale(awayFromPlanet, 280), [0, 18, 0])) : fallback;
}

export function isKnownStation(stationId: string, knownPlanetIds: string[], explorationState: ExplorationState): boolean {
  const station = stationById[stationId];
  if (!station || !knownPlanetIds.includes(station.planetId)) return false;
  return !station.hidden || isHiddenStationRevealed(station.id, explorationState);
}

export function mergeKnownPlanetIds(knownPlanetIds: string[], knownSystemIds: string[], currentStationId?: string): string[] {
  const known = new Set([...knownPlanetIds, ...getInitialKnownPlanetIds(knownSystemIds, currentStationId)]);
  return planets.filter((planet) => known.has(planet.id)).map((planet) => planet.id);
}

export function currentShipStorageRecord(player: PlayerState): NonNullable<PlayerState["ownedShipRecords"]>[number] {
  return {
    shipId: player.shipId,
    stationId: SHIP_STORAGE_STATION_ID,
    installedEquipment: [...player.equipment],
    hull: player.hull,
    shield: player.shield,
    energy: player.energy
  };
}

export function upsertShipRecord(
  records: NonNullable<PlayerState["ownedShipRecords"]> = [],
  record: NonNullable<PlayerState["ownedShipRecords"]>[number]
): NonNullable<PlayerState["ownedShipRecords"]> {
  return [...records.filter((item) => item.shipId !== record.shipId), record];
}

export function addOwnedShipId(player: PlayerState, shipId: string): string[] {
  return Array.from(new Set([...(player.ownedShips ?? [player.shipId]), shipId]));
}

export function addUniqueIds(existing: string[], additions: string[]): string[] {
  return Array.from(new Set([...existing, ...additions]));
}

export function hydrateActiveMission(mission: MissionDefinition): MissionDefinition {
  const template = missionTemplates.find((candidate) => candidate.id === mission.id);
  if (!template) return cloneMission(mission);
  const templateClone = cloneMission(template);
  const savedClone = cloneMission(mission);
  return {
    ...templateClone,
    ...savedClone,
    storyEncounter: templateClone.storyEncounter,
    storyTargetDestroyedIds: savedClone.storyTargetDestroyedIds ?? [],
    storyEchoLockedTargetIds: savedClone.storyEchoLockedTargetIds ?? []
  };
}

export function dialogueOpenPatch(
  state: { dialogueState: DialogueState; activeDialogue?: ActiveDialogueState },
  sceneId: string,
  replay = false
): { dialogueState?: DialogueState; activeDialogue?: ActiveDialogueState } {
  if (!sceneId) return {};
  if (!dialogueSceneById[sceneId]) return {};
  if (!replay && (state.activeDialogue || isDialogueSceneSeen(state.dialogueState, sceneId))) return {};
  return {
    dialogueState: replay ? state.dialogueState : markDialogueSceneSeen(state.dialogueState, sceneId),
    activeDialogue: { sceneId, lineIndex: 0, replay }
  };
}

export function lootVelocity(): Vec3 {
  return [18 - Math.random() * 36, 24 + Math.random() * 18, 18 - Math.random() * 36];
}

export function systemTechCeiling(systemId: string): number {
  const system = systemById[systemId];
  return Math.max(1, ...system.stationIds.map((stationId) => stationById[stationId]?.techLevel ?? 1), ...(system.hiddenStationIds ?? []).map((stationId) => stationById[stationId]?.techLevel ?? 1));
}

export function createCommodityLootDrop(ship: FlightEntity): { commodityId: CommodityId; amount: number; rarity: "common" | "uncommon" | "rare" | "epic" | "legendary" } {
  if (ship.role === "relay") return { commodityId: "data-cores", amount: ship.storyTarget ? 2 : 1, rarity: "epic" };
  if (ship.role === "drone") return { commodityId: "microchips", amount: 1, rarity: "rare" };
  if (ship.boss) return { commodityId: "illegal-contraband", amount: 4, rarity: "epic" };
  if (ship.role === "pirate") return { commodityId: "illegal-contraband", amount: ship.elite ? 2 : 1, rarity: ship.elite ? "epic" : "rare" };
  if (ship.role === "smuggler") return { commodityId: Math.random() > 0.45 ? "illegal-contraband" : "data-cores", amount: 1, rarity: "rare" };
  if (ship.role === "freighter") return { commodityId: Math.random() > 0.5 ? "ship-components" : "mechanical-parts", amount: 2 + Math.floor(Math.random() * 2), rarity: "uncommon" };
  if (ship.role === "courier") return { commodityId: Math.random() > 0.5 ? "microchips" : "electronics", amount: 1, rarity: "uncommon" };
  if (ship.role === "miner") return { commodityId: Math.random() > 0.55 ? "titanium" : "iron", amount: 2, rarity: "uncommon" };
  if (ship.role === "patrol") return { commodityId: "ship-components", amount: 2, rarity: "rare" };
  return { commodityId: "mechanical-parts", amount: 2, rarity: "uncommon" };
}

export function equipmentDropForShip(ship: FlightEntity, systemId: string): EquipmentId | undefined {
  if (ship.boss) {
    const ceiling = Math.min(5, systemTechCeiling(systemId) + 1);
    return equipmentList
      .filter((equipment) => (equipment.dropWeight ?? 0) > 0 && equipment.techLevel <= ceiling)
      .sort((a, b) => b.techLevel - a.techLevel || (b.dropWeight ?? 0) - (a.dropWeight ?? 0))[0]?.id;
  }
  const chanceByRole: Record<FlightEntity["role"], number> = {
    pirate: ship.elite ? 0.45 : 0.26,
    patrol: 0.18,
    trader: 0.12,
    freighter: 0.18,
    courier: 0.14,
    miner: 0.12,
    smuggler: 0.32,
    drone: 0.22,
    relay: 0.34
  };
  if (Math.random() > chanceByRole[ship.role]) return undefined;
  const ceiling = Math.min(5, systemTechCeiling(systemId) + (ship.role === "pirate" || ship.role === "smuggler" || ship.role === "drone" || ship.role === "relay" ? 1 : 0));
  const candidates = equipmentList.filter((equipment) => (equipment.dropWeight ?? 0) > 0 && equipment.techLevel <= ceiling);
  const totalWeight = candidates.reduce((total, equipment) => total + (equipment.dropWeight ?? 0), 0);
  if (totalWeight <= 0) return undefined;
  let roll = Math.random() * totalWeight;
  for (const equipment of candidates) {
    roll -= equipment.dropWeight ?? 0;
    if (roll <= 0) return equipment.id;
  }
  return candidates[candidates.length - 1]?.id;
}

export function lootDropsForDestroyedShip(ship: FlightEntity, systemId: string): LootEntity[] {
  const commodity = createCommodityLootDrop(ship);
  const drops: LootEntity[] = [
    {
      id: projectileId("loot"),
      kind: "commodity" as const,
      commodityId: commodity.commodityId,
      amount: commodity.amount,
      position: ship.position,
      velocity: lootVelocity(),
      rarity: commodity.rarity
    }
  ];
  const equipmentId = equipmentDropForShip(ship, systemId);
  if (equipmentId) {
    drops.push({
      id: projectileId("equipment-loot"),
      kind: "equipment" as const,
      equipmentId,
      amount: 1,
      position: add(ship.position, [8 - Math.random() * 16, 6, 8 - Math.random() * 16]),
      velocity: lootVelocity(),
      rarity: equipmentById[equipmentId].techLevel >= 4 ? "epic" : equipmentById[equipmentId].techLevel >= 3 ? "rare" : "uncommon"
    });
  }
  return drops;
}
