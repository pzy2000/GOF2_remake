import { stations, systemById, systems } from "../data/world";
import type { StationDefinition, Vec3 } from "../types/game";
import { getJumpGatePosition } from "./autopilot";
import { STATION_INTERACTION_RANGE } from "./equipment";
import { distance } from "./math";

export const STARGATE_NAME = "Stargate";
export const STARGATE_INTERACTION_RANGE = STATION_INTERACTION_RANGE;
export const GALAXY_DISCOVERY_DISTANCE = 2.05;

export type NavigationTarget =
  | {
      kind: "station";
      id: string;
      name: string;
      station: StationDefinition;
      position: Vec3;
      distance: number;
      inRange: boolean;
    }
  | {
      kind: "stargate";
      id: string;
      name: typeof STARGATE_NAME;
      systemId: string;
      position: Vec3;
      distance: number;
      inRange: boolean;
    };

export function getNearestNavigationTarget(systemId: string, playerPosition: Vec3): NavigationTarget | undefined {
  const stationTarget = stations
    .filter((station) => station.systemId === systemId)
    .map((station) => ({
      kind: "station" as const,
      id: station.id,
      name: station.name,
      station,
      position: station.position,
      distance: distance(playerPosition, station.position),
      inRange: distance(playerPosition, station.position) < STATION_INTERACTION_RANGE
    }))
    .sort((a, b) => a.distance - b.distance)[0];

  const gatePosition = getJumpGatePosition(systemId);
  const gateDistance = distance(playerPosition, gatePosition);
  const gateTarget: NavigationTarget = {
    kind: "stargate",
    id: `${systemId}-stargate`,
    name: STARGATE_NAME,
    systemId,
    position: gatePosition,
    distance: gateDistance,
    inRange: gateDistance < STARGATE_INTERACTION_RANGE
  };

  if (!stationTarget) return gateTarget;
  return gateTarget.distance < stationTarget.distance ? gateTarget : stationTarget;
}

export function isKnownSystem(knownSystems: string[], systemId: string): boolean {
  return knownSystems.includes(systemId);
}

export function getInitialKnownSystems(systemId: string): string[] {
  return revealNeighborSystems([], systemId);
}

export function revealNeighborSystems(knownSystems: string[], originSystemId: string): string[] {
  const origin = systemById[originSystemId];
  if (!origin) return knownSystems;
  const discovered = new Set(knownSystems);
  discovered.add(originSystemId);
  for (const system of systems) {
    if (systemDistance(origin.position, system.position) <= GALAXY_DISCOVERY_DISTANCE) {
      discovered.add(system.id);
    }
  }
  return systems.filter((system) => discovered.has(system.id)).map((system) => system.id);
}

export function systemDistance(a: [number, number], b: [number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}
