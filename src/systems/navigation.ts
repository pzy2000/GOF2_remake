import { planetById, planets, stations, stationById, systemById, systems } from "../data/world";
import type { PlanetDefinition, StationDefinition, Vec3 } from "../types/game";
import { getJumpGatePosition } from "./autopilot";
import { STATION_INTERACTION_RANGE } from "./equipment";
import { distance } from "./math";

export const STARGATE_NAME = "Stargate";
export const STARGATE_INTERACTION_RANGE = STATION_INTERACTION_RANGE;
export const GALAXY_DISCOVERY_DISTANCE = 2.05;
export const PLANET_SCAN_RANGE = 320;

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
      kind: "planet-signal";
      id: string;
      name: "Unknown Beacon";
      planet: PlanetDefinition;
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

export function getNearestNavigationTarget(systemId: string, playerPosition: Vec3, knownPlanetIds: string[] = planets.map((planet) => planet.id)): NavigationTarget | undefined {
  const knownPlanets = new Set(knownPlanetIds);
  const stationTarget = stations
    .filter((station) => station.systemId === systemId && knownPlanets.has(station.planetId))
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
  const signalTarget = planets
    .filter((planet) => planet.systemId === systemId && !knownPlanets.has(planet.id))
    .map((planet) => ({
      kind: "planet-signal" as const,
      id: `${planet.id}-signal`,
      name: "Unknown Beacon" as const,
      planet,
      position: planet.beaconPosition,
      distance: distance(playerPosition, planet.beaconPosition),
      inRange: distance(playerPosition, planet.beaconPosition) < PLANET_SCAN_RANGE
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

  return [stationTarget, signalTarget, gateTarget].filter((target): target is NavigationTarget => !!target).sort((a, b) => a.distance - b.distance)[0];
}

export function isKnownSystem(knownSystems: string[], systemId: string): boolean {
  return knownSystems.includes(systemId);
}

export function getInitialKnownSystems(systemId: string): string[] {
  return revealNeighborSystems([], systemId);
}

export function getInitialKnownPlanetIds(knownSystemIds: string[], currentStationId?: string): string[] {
  const known = new Set<string>();
  const knownSystems = new Set(knownSystemIds);
  for (const system of systems) {
    if (knownSystems.has(system.id) && system.planetIds[0]) known.add(system.planetIds[0]);
  }
  const currentStation = currentStationId ? stationById[currentStationId] : undefined;
  if (currentStation) known.add(currentStation.planetId);
  return planets.filter((planet) => known.has(planet.id)).map((planet) => planet.id);
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

export function discoverNearbyPlanets(
  systemId: string,
  playerPosition: Vec3,
  knownPlanetIds: string[]
): { knownPlanetIds: string[]; discovered: PlanetDefinition[] } {
  const known = new Set(knownPlanetIds);
  const discovered = planets.filter(
    (planet) => planet.systemId === systemId && !known.has(planet.id) && distance(playerPosition, planet.beaconPosition) <= PLANET_SCAN_RANGE
  );
  for (const planet of discovered) known.add(planet.id);
  return {
    knownPlanetIds: planets.filter((planet) => known.has(planet.id)).map((planet) => planet.id),
    discovered
  };
}

export function systemDistance(a: [number, number], b: [number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}
