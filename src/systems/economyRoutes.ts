import { commodityById, stationById } from "../data/world";
import type { AsteroidEntity, CommodityId, EconomyNpcTaskKind, FlightEntity, Vec3 } from "../types/game";
import type { EconomyNpcEntity } from "../types/economy";

export type EconomyRouteTargetKind = "asteroid" | "station" | "transit" | "idle" | "unknown";

export interface EconomyNpcRouteSummary {
  npcId: string;
  name: string;
  taskKind: EconomyNpcTaskKind;
  statusLabel: string;
  commodityId?: CommodityId;
  cargoUnits: number;
  cargoCapacity: number;
  targetId?: string;
  targetKind: EconomyRouteTargetKind;
  targetName: string;
  routeLabel: string;
  detailLabel: string;
  progress?: number;
}

export interface EconomyFlightRouteCue {
  routeLabel: string;
  targetName: string;
  targetPosition: Vec3;
  targetKind: Exclude<EconomyRouteTargetKind, "transit" | "idle" | "unknown">;
}

function cargoUnits(cargo: Record<string, number | undefined> | undefined): number {
  return Object.values(cargo ?? {}).reduce<number>((total, amount) => total + (amount ?? 0), 0);
}

function commodityName(commodityId: CommodityId | undefined): string {
  return commodityId ? commodityById[commodityId]?.name ?? commodityId : "Cargo";
}

function stationName(stationId: string | undefined): string {
  return stationId ? stationById[stationId]?.name ?? stationId : "Unknown station";
}

function routeVerb(kind: EconomyNpcTaskKind): string {
  if (kind === "mining") return "Mining";
  if (kind === "buying") return "Buying";
  if (kind === "hauling") return "Hauling";
  if (kind === "selling") return "Selling";
  if (kind === "returning") return "Returning";
  if (kind === "destroyed") return "Destroyed";
  return "Idle";
}

export function getEconomyNpcRouteSummary(npc: EconomyNpcEntity): EconomyNpcRouteSummary {
  const task = npc.task;
  const heldCargo = cargoUnits(npc.cargo);
  const commodity = commodityName(task.commodityId);
  const base = {
    npcId: npc.id,
    name: npc.name,
    taskKind: task.kind,
    statusLabel: npc.statusLabel,
    commodityId: task.commodityId,
    cargoUnits: heldCargo,
    cargoCapacity: npc.cargoCapacity,
    progress: task.progress
  };

  if (task.kind === "mining") {
    return {
      ...base,
      targetId: task.asteroidId,
      targetKind: "asteroid",
      targetName: `${commodity} asteroid`,
      routeLabel: `Mining ${commodity}`,
      detailLabel: `Mining ${commodity}; hold ${heldCargo}/${npc.cargoCapacity}`
    };
  }
  if (task.kind === "buying") {
    const target = stationName(task.originStationId);
    return {
      ...base,
      targetId: task.originStationId,
      targetKind: "station",
      targetName: target,
      routeLabel: `Buying ${commodity}`,
      detailLabel: `Buying at ${target}; destination ${stationName(task.destinationStationId)}`
    };
  }
  if (task.kind === "hauling") {
    const target = stationName(task.destinationStationId);
    return {
      ...base,
      targetId: task.destinationStationId,
      targetKind: npc.systemId === "__transit__" ? "transit" : "station",
      targetName: target,
      routeLabel: `Hauling ${commodity}`,
      detailLabel: `Hauling ${commodity} to ${target}; hold ${heldCargo}/${npc.cargoCapacity}`
    };
  }
  if (task.kind === "selling") {
    const target = stationName(task.destinationStationId);
    return {
      ...base,
      targetId: task.destinationStationId,
      targetKind: "station",
      targetName: target,
      routeLabel: `Selling ${commodity}`,
      detailLabel: `Selling at ${target}; hold ${heldCargo}/${npc.cargoCapacity}`
    };
  }
  if (task.kind === "returning") {
    const target = stationName(task.destinationStationId ?? task.originStationId);
    return {
      ...base,
      targetId: task.destinationStationId ?? task.originStationId,
      targetKind: "station",
      targetName: target,
      routeLabel: "Returning",
      detailLabel: `Returning to ${target}; hold ${heldCargo}/${npc.cargoCapacity}`
    };
  }
  if (task.kind === "destroyed") {
    return {
      ...base,
      targetKind: "unknown",
      targetName: "Route interrupted",
      routeLabel: "Destroyed",
      detailLabel: "Cargo route interrupted"
    };
  }
  const target = stationName(task.originStationId);
  return {
    ...base,
    targetId: task.originStationId,
    targetKind: task.originStationId ? "station" : "idle",
    targetName: target,
    routeLabel: "Idle",
    detailLabel: task.originStationId ? `Holding near ${target}` : "Awaiting market signal"
  };
}

export function getEconomyFlightRouteCue(
  ship: Pick<FlightEntity, "economyTaskKind" | "economyTargetId" | "economyCommodityId" | "economyStatus">,
  asteroids: AsteroidEntity[],
  currentSystemId: string
): EconomyFlightRouteCue | undefined {
  const taskKind = ship.economyTaskKind;
  const targetId = ship.economyTargetId;
  if (!taskKind || !targetId || taskKind === "idle" || taskKind === "destroyed") return undefined;
  const commodity = commodityName(ship.economyCommodityId);
  const asteroid = asteroids.find((item) => item.id === targetId);
  if (asteroid) {
    return {
      routeLabel: ship.economyStatus ?? `${routeVerb(taskKind)} ${commodity}`,
      targetName: `${commodityName(asteroid.resource)} asteroid`,
      targetPosition: asteroid.position,
      targetKind: "asteroid"
    };
  }
  const station = stationById[targetId];
  if (!station || station.systemId !== currentSystemId) return undefined;
  return {
    routeLabel: ship.economyStatus ?? `${routeVerb(taskKind)} ${commodity}`,
    targetName: station.name,
    targetPosition: station.position,
    targetKind: "station"
  };
}
