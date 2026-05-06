import { stationById, systemById } from "../data/world";
import type { Vec3 } from "../types/game";
import { add, clamp, normalize, scale } from "./math";
import { getJumpGatePosition } from "./autopilot";

export const PATROL_MIN_ORBIT_RADIUS = 360;
export const PATROL_ORBIT_RADIUS_FACTOR = 0.62;

export interface PatrolOrbit {
  center: Vec3;
  radius: number;
  stationPosition: Vec3;
  gatePosition: Vec3;
}

function distanceXZ(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[2] - b[2]);
}

export function getPatrolOrbit(systemId: string): PatrolOrbit {
  const system = systemById[systemId];
  const gatePosition = getJumpGatePosition(systemId);
  const stationPosition = system ? stationById[system.stationIds[0]]?.position : undefined;

  if (!stationPosition) {
    return {
      center: gatePosition,
      radius: PATROL_MIN_ORBIT_RADIUS,
      stationPosition: gatePosition,
      gatePosition
    };
  }

  return {
    center: [
      (stationPosition[0] + gatePosition[0]) / 2,
      (stationPosition[1] + gatePosition[1]) / 2,
      (stationPosition[2] + gatePosition[2]) / 2
    ],
    radius: Math.max(
      PATROL_MIN_ORBIT_RADIUS,
      distanceXZ(stationPosition, gatePosition) * PATROL_ORBIT_RADIUS_FACTOR
    ),
    stationPosition,
    gatePosition
  };
}

export function getIdlePatrolDirection(systemId: string, position: Vec3): Vec3 {
  const orbit = getPatrolOrbit(systemId);
  const fromCenter: Vec3 = [position[0] - orbit.center[0], 0, position[2] - orbit.center[2]];
  const planarDistance = Math.hypot(fromCenter[0], fromCenter[2]);
  const outward =
    planarDistance > 0.0001
      ? scale(fromCenter, 1 / planarDistance)
      : normalize([orbit.gatePosition[0] - orbit.center[0], 0, orbit.gatePosition[2] - orbit.center[2]]);
  const tangent: Vec3 = [-outward[2], 0, outward[0]];
  const radialCorrection = clamp((orbit.radius - planarDistance) / orbit.radius, -0.75, 0.75);

  return normalize(add(tangent, scale(outward, radialCorrection)));
}
