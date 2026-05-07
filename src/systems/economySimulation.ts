import { commodityById, stationById, stations, systemById, systems } from "../data/world";
import type { CargoHold, CommodityId, FactionId, MarketState, PlayerState, Vec3 } from "../types/game";
import type {
  EconomyEvent,
  EconomyNpcEntity,
  EconomyResourceBelt,
  EconomySnapshot,
  NpcDestroyedRequest,
  NpcTask,
  PlayerTradeRequest,
  PlayerTradeResponse
} from "../types/economy";
import {
  advanceMarketState,
  buyCommodity,
  cloneMarketState,
  createInitialMarketState,
  getCargoUsed,
  getMarketEntry,
  getTradeHints,
  sellCommodity
} from "./economy";
import { createAsteroidsForSystem } from "./asteroids";
import { getJumpGatePosition } from "./autopilot";
import { getMiningProgressIncrement } from "./difficulty";
import { add, distance, normalize, scale, sub } from "./math";

export interface StationThroughputWindow {
  windowStart: number;
  boughtByNpcs: number;
  soldByNpcs: number;
}

export interface EconomyServiceState {
  version: number;
  snapshotId: number;
  eventSeq: number;
  clock: number;
  marketState: MarketState;
  npcs: EconomyNpcEntity[];
  resourceBelts: Record<string, EconomyResourceBelt>;
  recentEvents: EconomyEvent[];
  stationThroughput: Record<string, StationThroughputWindow>;
}

const ECONOMY_STATE_VERSION = 1;
const TRANSIT_SYSTEM_ID = "__transit__";
const NPC_BUY_LIMIT_PER_STATION_MINUTE = 12;
const NPC_SELL_LIMIT_PER_STATION_MINUTE = 14;
const RECENT_EVENT_LIMIT = 36;
const ARRIVE_STATION_DISTANCE = 155;
const ARRIVE_ASTEROID_DISTANCE = 70;

const roleProfiles: Record<
  EconomyNpcEntity["role"],
  {
    name: string;
    factionId: FactionId;
    cargoCapacity: number;
    credits: number;
    hull: number;
    shield: number;
    speed: number;
  }
> = {
  trader: { name: "Belt Trader", factionId: "free-belt-union", cargoCapacity: 18, credits: 8000, hull: 85, shield: 55, speed: 112 },
  freighter: { name: "Union Bulk Freighter", factionId: "free-belt-union", cargoCapacity: 42, credits: 16000, hull: 170, shield: 70, speed: 86 },
  courier: { name: "Gate Courier", factionId: "solar-directorate", cargoCapacity: 10, credits: 6000, hull: 72, shield: 48, speed: 150 },
  miner: { name: "Ore Cutter", factionId: "free-belt-union", cargoCapacity: 20, credits: 5000, hull: 125, shield: 58, speed: 95 },
  smuggler: { name: "Vossari Smuggler", factionId: "vossari-clans", cargoCapacity: 14, credits: 9000, hull: 96, shield: 68, speed: 138 }
};

function cloneCargo(cargo: CargoHold): CargoHold {
  return { ...cargo };
}

function cargoUnits(cargo: CargoHold): number {
  return Object.values(cargo).reduce((total, amount) => total + (amount ?? 0), 0);
}

function firstCargoEntry(cargo: CargoHold): [CommodityId, number] | undefined {
  return (Object.entries(cargo) as [CommodityId, number | undefined][]).find(([, amount]) => (amount ?? 0) > 0) as
    | [CommodityId, number]
    | undefined;
}

function hashText(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) % 100_003;
  }
  return hash;
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

function homeStationFor(systemId: string, role: EconomyNpcEntity["role"]): string {
  const system = systemById[systemId];
  if (role === "miner") {
    const miningStation = system.stationIds.map((id) => stationById[id]).find((station) => station?.archetype === "Mining Station");
    return miningStation?.id ?? system.stationIds[0];
  }
  if (role === "smuggler") {
    const blackMarket = [...system.stationIds, ...(system.hiddenStationIds ?? [])]
      .map((id) => stationById[id])
      .find((station) => station?.archetype === "Pirate Black Market");
    return blackMarket?.id ?? system.stationIds[0];
  }
  return system.stationIds[0];
}

function createNpc(systemId: string, role: EconomyNpcEntity["role"], index: number): EconomyNpcEntity {
  const profile = roleProfiles[role];
  const position = trafficPosition(systemId, index);
  const task: NpcTask = { kind: "idle", startedAt: 0, originStationId: homeStationFor(systemId, role) };
  return {
    id: `econ-${systemId}-${role}-${index}`,
    name: profile.name,
    role,
    factionId: profile.factionId,
    systemId,
    position,
    velocity: [0, 0, 0],
    hull: profile.hull,
    shield: profile.shield,
    maxHull: profile.hull,
    maxShield: profile.shield,
    cargoCapacity: profile.cargoCapacity,
    cargo: {},
    credits: profile.credits,
    task,
    statusLabel: "IDLE",
    lastTradeAt: -999
  };
}

export function createInitialEconomyState(): EconomyServiceState {
  const resourceBelts = Object.fromEntries(
    systems.map((system) => [
      system.id,
      {
        systemId: system.id,
        asteroids: createAsteroidsForSystem(system.id, system.risk)
      }
    ])
  ) as Record<string, EconomyResourceBelt>;

  const npcs = systems.flatMap((system) => {
    const roles: EconomyNpcEntity["role"][] = ["trader", "freighter", "courier", "miner"];
    if (system.risk >= 0.35 || system.id === "ashen-drift") roles.push("smuggler");
    return roles.map((role, index) => createNpc(system.id, role, index));
  });

  return {
    version: ECONOMY_STATE_VERSION,
    snapshotId: 1,
    eventSeq: 0,
    clock: 0,
    marketState: createInitialMarketState(),
    npcs,
    resourceBelts,
    recentEvents: [],
    stationThroughput: {}
  };
}

export function normalizeEconomyState(parsed: Partial<EconomyServiceState> | null | undefined): EconomyServiceState {
  if (!parsed || parsed.version !== ECONOMY_STATE_VERSION || !parsed.marketState || !Array.isArray(parsed.npcs)) {
    return createInitialEconomyState();
  }
  const fresh = createInitialEconomyState();
  return {
    ...fresh,
    ...parsed,
    snapshotId: parsed.snapshotId ?? fresh.snapshotId,
    eventSeq: parsed.eventSeq ?? 0,
    clock: parsed.clock ?? 0,
    marketState: parsed.marketState,
    npcs: parsed.npcs.map((npc) => ({ ...npc, cargo: cloneCargo(npc.cargo ?? {}) })),
    resourceBelts: parsed.resourceBelts ?? fresh.resourceBelts,
    recentEvents: (parsed.recentEvents ?? []).slice(-RECENT_EVENT_LIMIT),
    stationThroughput: parsed.stationThroughput ?? {}
  };
}

function pushEvent(
  state: EconomyServiceState,
  event: Omit<EconomyEvent, "id" | "clock" | "snapshotId">
): EconomyEvent {
  state.eventSeq += 1;
  const next: EconomyEvent = {
    ...event,
    id: `econ-event-${state.eventSeq}`,
    clock: Number(state.clock.toFixed(2)),
    snapshotId: state.snapshotId
  };
  state.recentEvents = [...state.recentEvents, next].slice(-RECENT_EVENT_LIMIT);
  return next;
}

function throughputFor(state: EconomyServiceState, stationId: string): StationThroughputWindow {
  const current = state.stationThroughput[stationId];
  if (!current || state.clock - current.windowStart >= 60) {
    const next = { windowStart: state.clock, boughtByNpcs: 0, soldByNpcs: 0 };
    state.stationThroughput[stationId] = next;
    return next;
  }
  return current;
}

function availableNpcBuyUnits(state: EconomyServiceState, stationId: string): number {
  return Math.max(0, NPC_BUY_LIMIT_PER_STATION_MINUTE - throughputFor(state, stationId).boughtByNpcs);
}

function availableNpcSellUnits(state: EconomyServiceState, stationId: string): number {
  return Math.max(0, NPC_SELL_LIMIT_PER_STATION_MINUTE - throughputFor(state, stationId).soldByNpcs);
}

function moveNpcToward(npc: EconomyNpcEntity, target: Vec3, delta: number, arriveDistance: number): boolean {
  const dist = distance(npc.position, target);
  if (dist <= arriveDistance) {
    npc.position = [...target];
    npc.velocity = [0, 0, 0];
    return true;
  }
  const speed = roleProfiles[npc.role].speed;
  const direction = normalize(sub(target, npc.position));
  const step = Math.min(dist, speed * delta);
  npc.velocity = scale(direction, speed);
  npc.position = add(npc.position, scale(direction, step));
  return distance(npc.position, target) <= arriveDistance;
}

function orbitHome(npc: EconomyNpcEntity, delta: number): void {
  const station = stationById[npc.task.originStationId ?? homeStationFor(npc.systemId, npc.role)];
  if (!station) return;
  const angle = statefulOrbitAngle(npc, delta);
  const target: Vec3 = add(station.position, [Math.cos(angle) * 180, 42 + (hashText(npc.id) % 70), Math.sin(angle) * 180]);
  moveNpcToward(npc, target, delta, 80);
}

function statefulOrbitAngle(npc: EconomyNpcEntity, delta: number): number {
  const base = (hashText(npc.id) % 628) / 100;
  return base + (npc.task.progress ?? 0) + delta * 0.18;
}

function chooseMiningAsteroid(state: EconomyServiceState, npc: EconomyNpcEntity) {
  const belt = state.resourceBelts[npc.systemId];
  const candidates = belt?.asteroids.filter((asteroid) => asteroid.amount > 0) ?? [];
  if (!candidates.length) return undefined;
  return candidates[hashText(npc.id) % candidates.length];
}

function startMiningTask(state: EconomyServiceState, npc: EconomyNpcEntity): void {
  const asteroid = chooseMiningAsteroid(state, npc);
  if (!asteroid) {
    npc.task = { kind: "idle", originStationId: homeStationFor(npc.systemId, npc.role), startedAt: state.clock };
    npc.statusLabel = "IDLE";
    return;
  }
  npc.task = {
    kind: "mining",
    asteroidId: asteroid.id,
    commodityId: asteroid.resource,
    originStationId: homeStationFor(npc.systemId, npc.role),
    progress: 0,
    startedAt: state.clock
  };
}

function fakePlayerForCargo(cargoCapacity: number, cargo: CargoHold = {}, credits = 1_000_000): PlayerState {
  return {
    shipId: "mule-lx",
    stats: {
      hull: 100,
      shield: 50,
      energy: 100,
      speed: 100,
      handling: 1,
      cargoCapacity,
      primarySlots: 1,
      secondarySlots: 1,
      utilitySlots: 1,
      defenseSlots: 1,
      engineeringSlots: 1
    },
    hull: 100,
    shield: 50,
    energy: 100,
    credits,
    cargo,
    equipment: [],
    equipmentInventory: {},
    missiles: 0,
    ownedShips: ["mule-lx"],
    position: [0, 0, 0],
    velocity: [0, 0, 0],
    rotation: [0, 0, 0],
    throttle: 0,
    lastDamageAt: -999
  };
}

function buyNpcCargo(state: EconomyServiceState, npc: EconomyNpcEntity, stationId: string, commodityId: CommodityId): number {
  const station = stationById[stationId];
  const system = station ? systemById[station.systemId] : undefined;
  if (!station || !system) return 0;
  const entry = getMarketEntry(state.marketState, station.id, commodityId);
  const amount = Math.min(
    Math.max(0, npc.cargoCapacity - cargoUnits(npc.cargo)),
    Math.floor(entry.stock),
    availableNpcBuyUnits(state, station.id),
    npc.role === "freighter" ? 8 : npc.role === "courier" ? 3 : 5
  );
  if (amount <= 0) return 0;
  const result = buyCommodity(fakePlayerForCargo(npc.cargoCapacity, cloneCargo(npc.cargo), npc.credits), station, system, commodityId, amount, 0, state.marketState);
  if (!result.ok || !result.marketState) return 0;
  state.marketState = result.marketState;
  npc.cargo = result.player.cargo;
  npc.credits = result.player.credits;
  npc.lastTradeAt = state.clock;
  throughputFor(state, station.id).boughtByNpcs += amount;
  pushEvent(state, {
    type: "npc-trade",
    systemId: station.systemId,
    stationId: station.id,
    npcId: npc.id,
    commodityId,
    amount,
    message: `${npc.name} bought ${amount} ${commodityById[commodityId].name} at ${station.name}.`
  });
  return amount;
}

function sellNpcCargo(state: EconomyServiceState, npc: EconomyNpcEntity, stationId: string): number {
  const station = stationById[stationId];
  const system = station ? systemById[station.systemId] : undefined;
  if (!station || !system) return 0;
  let totalSold = 0;
  for (const [commodityId, held] of Object.entries(npc.cargo) as [CommodityId, number | undefined][]) {
    const amount = Math.min(held ?? 0, availableNpcSellUnits(state, station.id), npc.role === "freighter" ? 10 : 5);
    if (amount <= 0) continue;
    const result = sellCommodity(fakePlayerForCargo(npc.cargoCapacity, cloneCargo(npc.cargo), npc.credits), station, system, commodityId, amount, 0, state.marketState);
    if (!result.ok || !result.marketState) continue;
    state.marketState = result.marketState;
    npc.cargo = result.player.cargo;
    npc.credits = result.player.credits;
    npc.lastTradeAt = state.clock;
    throughputFor(state, station.id).soldByNpcs += amount;
    totalSold += amount;
    pushEvent(state, {
      type: "npc-trade",
      systemId: station.systemId,
      stationId: station.id,
      npcId: npc.id,
      commodityId,
      amount,
      message: `${npc.name} sold ${amount} ${commodityById[commodityId].name} at ${station.name}.`
    });
  }
  return totalSold;
}

function chooseTradeRoute(state: EconomyServiceState, npc: EconomyNpcEntity) {
  const legalOnly = npc.role !== "smuggler";
  const hints = getTradeHints(state.marketState, 80).filter((hint) => {
    const origin = stationById[hint.fromStationId];
    const commodity = commodityById[hint.commodityId];
    return origin?.systemId === npc.systemId && (!legalOnly || commodity.legal);
  });
  if (!hints.length) return undefined;
  return hints[hashText(`${npc.id}-${Math.floor(state.clock / 30)}`) % Math.min(8, hints.length)];
}

function tickMiner(state: EconomyServiceState, npc: EconomyNpcEntity, delta: number): void {
  if (npc.task.kind === "idle") startMiningTask(state, npc);
  if (npc.task.kind === "mining") {
    const belt = state.resourceBelts[npc.systemId];
    const asteroid = belt?.asteroids.find((item) => item.id === npc.task.asteroidId && item.amount > 0);
    if (!asteroid || cargoUnits(npc.cargo) >= npc.cargoCapacity) {
      npc.task = { kind: "returning", destinationStationId: npc.task.originStationId ?? homeStationFor(npc.systemId, npc.role), startedAt: state.clock };
      return;
    }
    const arrived = moveNpcToward(npc, asteroid.position, delta, ARRIVE_ASTEROID_DISTANCE);
    if (!arrived) return;
    npc.task.progress = Math.min(1, (npc.task.progress ?? 0) + getMiningProgressIncrement(asteroid.resource, delta) * 0.72);
    if (npc.task.progress < 1) return;
    asteroid.amount = Math.max(0, asteroid.amount - 1);
    asteroid.miningProgress = 0;
    npc.cargo = { ...npc.cargo, [asteroid.resource]: (npc.cargo[asteroid.resource] ?? 0) + 1 };
    npc.task.progress = 0;
    pushEvent(state, {
      type: "npc-mined",
      systemId: npc.systemId,
      npcId: npc.id,
      commodityId: asteroid.resource,
      amount: 1,
      message: `${npc.name} mined 1 ${commodityById[asteroid.resource].name}.`
    });
    if (cargoUnits(npc.cargo) >= Math.ceil(npc.cargoCapacity * 0.7) || asteroid.amount <= 0) {
      npc.task = {
        kind: "returning",
        commodityId: asteroid.resource,
        destinationStationId: npc.task.originStationId ?? homeStationFor(npc.systemId, npc.role),
        startedAt: state.clock
      };
    }
  }
  if (npc.task.kind === "returning" || npc.task.kind === "selling") {
    const stationId = npc.task.destinationStationId ?? homeStationFor(npc.systemId, npc.role);
    const station = stationById[stationId];
    if (!station) return;
    const arrived = moveNpcToward(npc, station.position, delta, ARRIVE_STATION_DISTANCE);
    if (!arrived) return;
    sellNpcCargo(state, npc, station.id);
    npc.task = cargoUnits(npc.cargo) > 0
      ? { kind: "selling", destinationStationId: station.id, startedAt: state.clock }
      : { kind: "idle", originStationId: station.id, startedAt: state.clock };
  }
}

function beginTradeTask(state: EconomyServiceState, npc: EconomyNpcEntity): void {
  const route = chooseTradeRoute(state, npc);
  if (!route) {
    npc.task = { kind: "idle", originStationId: homeStationFor(npc.systemId, npc.role), progress: (npc.task.progress ?? 0) + 0.12, startedAt: state.clock };
    return;
  }
  npc.task = {
    kind: "buying",
    commodityId: route.commodityId,
    originStationId: route.fromStationId,
    destinationStationId: route.toStationId,
    progress: 0,
    startedAt: state.clock
  };
  pushEvent(state, {
    type: "npc-task",
    systemId: npc.systemId,
    stationId: route.fromStationId,
    npcId: npc.id,
    commodityId: route.commodityId,
    message: `${npc.name} plotted ${commodityById[route.commodityId].name} freight to ${stationById[route.toStationId].name}.`
  });
}

function tickTrader(state: EconomyServiceState, npc: EconomyNpcEntity, delta: number): void {
  if (npc.task.kind === "idle") {
    if ((state.clock + hashText(npc.id)) % 8 < delta * 2) {
      beginTradeTask(state, npc);
    } else {
      orbitHome(npc, delta);
    }
    return;
  }

  if (npc.task.kind === "buying") {
    const origin = npc.task.originStationId ? stationById[npc.task.originStationId] : undefined;
    if (!origin || !npc.task.commodityId) {
      npc.task = { kind: "idle", originStationId: homeStationFor(npc.systemId, npc.role), startedAt: state.clock };
      return;
    }
    if (npc.systemId !== origin.systemId) {
      npc.systemId = origin.systemId;
      npc.position = getJumpGatePosition(origin.systemId);
    }
    const arrived = moveNpcToward(npc, origin.position, delta, ARRIVE_STATION_DISTANCE);
    if (!arrived) return;
    const bought = buyNpcCargo(state, npc, origin.id, npc.task.commodityId);
    if (bought <= 0) {
      npc.task = { kind: "idle", originStationId: origin.id, startedAt: state.clock };
      return;
    }
    const destination = stationById[npc.task.destinationStationId ?? origin.id];
    npc.task = {
      kind: "hauling",
      commodityId: npc.task.commodityId,
      originStationId: origin.id,
      destinationStationId: destination.id,
      progress: 0,
      startedAt: state.clock
    };
    if (destination.systemId !== origin.systemId) {
      npc.systemId = TRANSIT_SYSTEM_ID;
      npc.position = [0, 0, 0];
      npc.velocity = [0, 0, 0];
    }
    return;
  }

  if (npc.task.kind === "hauling") {
    const destination = npc.task.destinationStationId ? stationById[npc.task.destinationStationId] : undefined;
    if (!destination) {
      npc.task = { kind: "idle", originStationId: homeStationFor(npc.systemId, npc.role), startedAt: state.clock };
      return;
    }
    if (npc.systemId === TRANSIT_SYSTEM_ID) {
      const travelSeconds = 18 + Math.abs(hashText(`${npc.id}-${destination.systemId}`) % 16);
      const progress = Math.min(1, (npc.task.progress ?? 0) + delta / travelSeconds);
      npc.task = { ...npc.task, progress };
      if (progress >= 1) {
        npc.systemId = destination.systemId;
        npc.position = getJumpGatePosition(destination.systemId);
        npc.velocity = [0, 0, 0];
      }
      return;
    }
    const arrived = moveNpcToward(npc, destination.position, delta, ARRIVE_STATION_DISTANCE);
    if (!arrived) return;
    npc.task = { ...npc.task, kind: "selling", startedAt: state.clock };
    return;
  }

  if (npc.task.kind === "selling") {
    const destination = npc.task.destinationStationId ? stationById[npc.task.destinationStationId] : undefined;
    if (!destination) return;
    const arrived = moveNpcToward(npc, destination.position, delta, ARRIVE_STATION_DISTANCE);
    if (!arrived) return;
    sellNpcCargo(state, npc, destination.id);
    npc.task = cargoUnits(npc.cargo) > 0
      ? { ...npc.task, startedAt: state.clock }
      : { kind: "idle", originStationId: destination.id, startedAt: state.clock };
  }
}

function updateNpcStatus(npc: EconomyNpcEntity): void {
  const entry = firstCargoEntry(npc.cargo);
  const commodityName = (npc.task.commodityId && commodityById[npc.task.commodityId]?.name) || (entry && commodityById[entry[0]]?.name);
  if (npc.task.kind === "mining") npc.statusLabel = `MINING · ${commodityName ?? "Ore"}`;
  else if (npc.task.kind === "returning") npc.statusLabel = `RETURNING · ${cargoUnits(npc.cargo)}/${npc.cargoCapacity}`;
  else if (npc.task.kind === "buying") npc.statusLabel = `BUYING · ${commodityName ?? "Cargo"}`;
  else if (npc.task.kind === "hauling") npc.statusLabel = `HAULING · ${commodityName ?? "Cargo"}`;
  else if (npc.task.kind === "selling") npc.statusLabel = `SELLING · ${commodityName ?? "Cargo"}`;
  else if (npc.task.kind === "destroyed") npc.statusLabel = "DESTROYED";
  else npc.statusLabel = "IDLE";
}

export function tickEconomyState(state: EconomyServiceState, delta: number): EconomyServiceState {
  if (delta <= 0) return state;
  state.clock = Number((state.clock + delta).toFixed(3));
  state.marketState = advanceMarketState(state.marketState, delta);
  for (const npc of state.npcs) {
    if (npc.task.kind === "destroyed" || npc.hull <= 0) {
      npc.task = { kind: "destroyed", startedAt: npc.task.startedAt };
      updateNpcStatus(npc);
      continue;
    }
    if (npc.role === "miner") tickMiner(state, npc, delta);
    else tickTrader(state, npc, delta);
    updateNpcStatus(npc);
  }
  state.snapshotId += 1;
  return state;
}

export function createEconomySnapshot(state: EconomyServiceState, systemId?: string): EconomySnapshot {
  const resourceBelts = systemId && state.resourceBelts[systemId]
    ? [{ ...state.resourceBelts[systemId], asteroids: state.resourceBelts[systemId].asteroids.map((asteroid) => ({ ...asteroid })) }]
    : [];
  return {
    version: state.version,
    snapshotId: state.snapshotId,
    clock: state.clock,
    marketState: cloneMarketState(state.marketState),
    visibleNpcs: state.npcs
      .filter((npc) => !systemId || npc.systemId === systemId)
      .filter((npc) => npc.task.kind !== "destroyed" && npc.hull > 0)
      .map((npc) => ({ ...npc, cargo: cloneCargo(npc.cargo), task: { ...npc.task } })),
    resourceBelts,
    recentEvents: state.recentEvents.slice(-12),
    status: "connected"
  };
}

export function handlePlayerTrade(state: EconomyServiceState, request: PlayerTradeRequest): PlayerTradeResponse {
  const station = stationById[request.stationId];
  const system = systemById[request.systemId] ?? (station ? systemById[station.systemId] : undefined);
  if (!station || !system) {
    return {
      ok: false,
      player: request.player,
      marketState: cloneMarketState(state.marketState),
      message: "Unknown station or system.",
      total: 0
    };
  }
  const result = request.action === "buy"
    ? buyCommodity(
        request.player,
        station,
        system,
        request.commodityId,
        request.amount,
        request.reputation ?? 0,
        state.marketState,
        request.reservedCargo ?? 0
      )
    : sellCommodity(request.player, station, system, request.commodityId, request.amount, request.reputation ?? 0, state.marketState);
  if (result.marketState) state.marketState = result.marketState;
  if (result.ok) {
    pushEvent(state, {
      type: "market",
      systemId: station.systemId,
      stationId: station.id,
      commodityId: request.commodityId,
      amount: request.amount,
      message: `Player ${request.action === "buy" ? "bought" : "sold"} ${request.amount} ${commodityById[request.commodityId].name} at ${station.name}.`
    });
    state.snapshotId += 1;
  }
  return {
    ok: result.ok,
    player: result.player,
    marketState: cloneMarketState(state.marketState),
    message: result.message,
    total: result.total,
    snapshot: createEconomySnapshot(state, station.systemId)
  };
}

export function markEconomyNpcDestroyed(state: EconomyServiceState, request: NpcDestroyedRequest): EconomyEvent | undefined {
  const npc = state.npcs.find((candidate) => candidate.id === request.npcId);
  if (!npc || npc.task.kind === "destroyed") return undefined;
  npc.hull = 0;
  npc.shield = 0;
  npc.velocity = [0, 0, 0];
  npc.task = { kind: "destroyed", startedAt: state.clock };
  updateNpcStatus(npc);
  state.snapshotId += 1;
  return pushEvent(state, {
    type: "npc-destroyed",
    systemId: request.systemId,
    npcId: npc.id,
    message: `${npc.name} was destroyed. Its cargo route was interrupted.`
  });
}

export function resetEconomyState(): EconomyServiceState {
  return createInitialEconomyState();
}
