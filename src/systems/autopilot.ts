import { planetById, stationById, systemById } from "../data/world";
import type { FlightInput, PlayerState, StationDefinition, Vec3 } from "../types/game";
import { add, clamp, distance, length, lerp, normalize, scale, sub } from "./math";

export const GATE_ARRIVAL_DISTANCE = 95;
export const STATION_DOCK_DISTANCE = 245;
export const GATE_ACTIVATION_SECONDS = 2.4;
export const WORMHOLE_SECONDS = 2;

export function getDefaultTargetStation(systemId: string): StationDefinition | undefined {
  const stationId = systemById[systemId]?.stationIds[0];
  return stationId ? stationById[stationId] : undefined;
}

export function getJumpGatePosition(systemId: string): Vec3 {
  return systemById[systemId]?.jumpGatePosition ?? [620, 70, -1240];
}

export function getStationArrivalPosition(stationId: string): Vec3 | undefined {
  const station = stationById[stationId];
  if (!station) return undefined;
  const planet = planetById[station.planetId];
  const awayFromPlanet = planet ? normalize(sub(station.position, planet.position)) : [0, 0, 1] as Vec3;
  return add(station.position, add(scale(awayFromPlanet, 240), [0, 36, 0]));
}

export function shouldCancelAutopilot(input: FlightInput): boolean {
  return (
    input.throttleUp ||
    input.throttleDown ||
    input.rollLeft ||
    input.rollRight ||
    input.firePrimary ||
    input.fireSecondary
  );
}

export function rotationToward(direction: Vec3): Vec3 {
  const normalized = normalize(direction);
  const pitch = -Math.asin(clamp(normalized[1], -1, 1));
  const yaw = Math.atan2(normalized[0], -normalized[2]);
  return [pitch, yaw, 0];
}

export function integrateAutopilotStep({
  player,
  targetPosition,
  delta,
  maxSpeed = 560,
  arriveDistance = 80
}: {
  player: PlayerState;
  targetPosition: Vec3;
  delta: number;
  maxSpeed?: number;
  arriveDistance?: number;
}): { player: PlayerState; distanceToTarget: number; direction: Vec3 } {
  const toTarget = sub(targetPosition, player.position);
  const distanceToTarget = length(toTarget);
  const direction = normalize(toTarget);
  const slowDown = clamp((distanceToTarget - arriveDistance) / 420, 0.22, 1);
  const desiredVelocity = scale(direction, maxSpeed * slowDown);
  const follow = 1 - Math.exp(-4.8 * delta);
  let velocity: Vec3 = [
    lerp(player.velocity[0], desiredVelocity[0], follow),
    lerp(player.velocity[1], desiredVelocity[1], follow),
    lerp(player.velocity[2], desiredVelocity[2], follow)
  ];
  const stepDistance = length(scale(velocity, delta));
  const nextPosition =
    distanceToTarget <= Math.max(arriveDistance * 0.45, stepDistance)
      ? targetPosition
      : add(player.position, scale(velocity, delta));
  if (distance(nextPosition, targetPosition) <= arriveDistance * 0.35) {
    velocity = [0, 0, 0];
  }
  return {
    distanceToTarget: distance(nextPosition, targetPosition),
    direction,
    player: {
      ...player,
      position: nextPosition,
      velocity,
      rotation: rotationToward(direction),
      throttle: clamp(maxSpeed / Math.max(1, player.stats.speed), 0.35, 1)
    }
  };
}
