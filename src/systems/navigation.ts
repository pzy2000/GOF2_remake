import { planetById, planets, stations, stationById, systemById, systems } from "../data/world";
import type { EquipmentId, ExplorationSignalDefinition, ExplorationState, PlanetDefinition, StationDefinition, Vec3 } from "../types/game";
import { getJumpGatePosition } from "./autopilot";
import { STATION_INTERACTION_RANGE } from "./equipment";
import type { EquipmentRuntimeEffects } from "./equipment";
import { getEffectiveSignalScanRange, getIncompleteExplorationSignals, getVisibleStationsForSystem, hasRequiredSignalEquipment, isExplorationSignalDiscovered, requiredSignalEquipmentLabel } from "./exploration";
import { distance } from "./math";

export const STARGATE_NAME = "Stargate";
export const STARGATE_INTERACTION_RANGE = STATION_INTERACTION_RANGE;
export const GALAXY_DISCOVERY_DISTANCE = 2.05;
export const STARGATE_ROUTE_DISTANCE = GALAXY_DISCOVERY_DISTANCE * 1.08;
export const PLANET_SCAN_RANGE = 320;

export interface StargateRouteLink {
  origin: (typeof systems)[number];
  target: (typeof systems)[number];
  known: boolean;
}

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
      kind: "exploration-signal";
      id: string;
      name: string;
      signal: ExplorationSignalDefinition;
      position: Vec3;
      distance: number;
      inRange: boolean;
      equipmentReady?: boolean;
      requiredEquipmentLabel?: string;
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

export type NavigationCueTone = "station" | "gate" | "unknown" | "exploration";

export interface NavigationTargetCue {
  targetId: string;
  kind: NavigationTarget["kind"];
  label: string;
  actionLabel: string;
  distanceLabel: string;
  tone: NavigationCueTone;
  inRange: boolean;
}

export interface NavigationOptions {
  explorationState?: ExplorationState;
  installedEquipment?: EquipmentId[];
  runtimeEffects?: EquipmentRuntimeEffects;
}

export function getNearestNavigationTarget(
  systemId: string,
  playerPosition: Vec3,
  knownPlanetIds: string[] = planets.map((planet) => planet.id),
  options: NavigationOptions = {}
): NavigationTarget | undefined {
  const knownPlanets = new Set(knownPlanetIds);
  const visibleStations = options.explorationState ? getVisibleStationsForSystem(systemId, options.explorationState) : stations.filter((station) => station.systemId === systemId && !station.hidden);
  const stationTarget = visibleStations
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
  const explorationTarget: NavigationTarget | undefined = options.explorationState
    ? getIncompleteExplorationSignals(systemId, options.explorationState)
        .map((signal) => {
          const dist = distance(playerPosition, signal.position);
          return {
            kind: "exploration-signal" as const,
            id: signal.id,
            name: isExplorationSignalDiscovered(signal.id, options.explorationState!) ? signal.title : signal.maskedTitle,
            signal,
            position: signal.position,
            distance: dist,
            inRange: dist <= getEffectiveSignalScanRange(signal, options.runtimeEffects ?? options.installedEquipment),
            equipmentReady: hasRequiredSignalEquipment(signal, options.installedEquipment),
            requiredEquipmentLabel: requiredSignalEquipmentLabel(signal) || undefined
          };
        })
        .sort((a, b) => a.distance - b.distance)[0]
    : undefined;

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

  return [stationTarget, signalTarget, explorationTarget, gateTarget].filter((target): target is NavigationTarget => !!target).sort((a, b) => a.distance - b.distance)[0];
}

export function formatNavigationDistance(distanceMeters: number): string {
  if (distanceMeters >= 1000) return `${(distanceMeters / 1000).toFixed(1)}km`;
  return `${Math.round(distanceMeters)}m`;
}

export function getNavigationTargetCue(target: NavigationTarget | undefined): NavigationTargetCue | undefined {
  if (!target) return undefined;
  if (target.kind === "station") {
    return {
      targetId: target.id,
      kind: target.kind,
      label: target.name,
      actionLabel: target.inRange ? "F Dock" : "Waypoint",
      distanceLabel: formatNavigationDistance(target.distance),
      tone: "station",
      inRange: target.inRange
    };
  }
  if (target.kind === "planet-signal") {
    return {
      targetId: target.id,
      kind: target.kind,
      label: target.name,
      actionLabel: target.inRange ? "F Scan" : "Beacon",
      distanceLabel: formatNavigationDistance(target.distance),
      tone: "unknown",
      inRange: target.inRange
    };
  }
  if (target.kind === "exploration-signal") {
    return {
      targetId: target.id,
      kind: target.kind,
      label: target.name,
      actionLabel: target.inRange ? target.equipmentReady === false ? "Scanner Required" : "F Scan" : "Signal",
      distanceLabel: formatNavigationDistance(target.distance),
      tone: "exploration",
      inRange: target.inRange && target.equipmentReady !== false
    };
  }
  return {
    targetId: target.id,
    kind: target.kind,
    label: target.name,
    actionLabel: target.inRange ? "F Activate" : "Stargate",
    distanceLabel: formatNavigationDistance(target.distance),
    tone: "gate",
    inRange: target.inRange
  };
}

export function getNavigationHintText(target: NavigationTarget | undefined): string | undefined {
  const cue = getNavigationTargetCue(target);
  if (!cue) return undefined;
  if (target?.kind === "exploration-signal" && target.inRange && target.equipmentReady === false) {
    return `${cue.actionLabel}: ${target.requiredEquipmentLabel ?? "upgraded scanner"}`;
  }
  return cue.inRange ? `${cue.actionLabel}: ${cue.label}` : `${cue.label} ${cue.distanceLabel}`;
}

export function isKnownSystem(knownSystems: string[], systemId: string): boolean {
  return knownSystems.includes(systemId);
}

export function areSystemsLinkedByStargate(originSystemId: string, targetSystemId: string): boolean {
  const origin = systemById[originSystemId];
  const target = systemById[targetSystemId];
  if (!origin || !target || origin.id === target.id) return false;
  return systemDistance(origin.position, target.position) <= STARGATE_ROUTE_DISTANCE;
}

export function getStargateRouteLinks(knownSystemIds: string[] = systems.map((system) => system.id)): StargateRouteLink[] {
  const known = new Set(knownSystemIds);
  return systems.flatMap((origin, originIndex) =>
    systems.slice(originIndex + 1).flatMap((target) => {
      if (!areSystemsLinkedByStargate(origin.id, target.id)) return [];
      return [{ origin, target, known: known.has(origin.id) && known.has(target.id) }];
    })
  );
}

export function findKnownStargateRoute(originSystemId: string, targetSystemId: string, knownSystemIds: string[]): string[] | undefined {
  const origin = systemById[originSystemId];
  const target = systemById[targetSystemId];
  const known = new Set(knownSystemIds);
  if (!origin || !target || !known.has(origin.id) || !known.has(target.id)) return undefined;
  if (origin.id === target.id) return [origin.id];

  const visited = new Set<string>([origin.id]);
  const queue: string[][] = [[origin.id]];
  while (queue.length > 0) {
    const path = queue.shift()!;
    const currentSystemId = path[path.length - 1];
    for (const candidate of systems) {
      if (visited.has(candidate.id) || !known.has(candidate.id) || !areSystemsLinkedByStargate(currentSystemId, candidate.id)) continue;
      const nextPath = [...path, candidate.id];
      if (candidate.id === target.id) return nextPath;
      visited.add(candidate.id);
      queue.push(nextPath);
    }
  }
  return undefined;
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
