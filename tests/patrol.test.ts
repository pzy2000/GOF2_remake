import { describe, expect, it } from "vitest";
import { stationById } from "../src/data/world";
import { getJumpGatePosition } from "../src/systems/autopilot";
import {
  getIdlePatrolDirection,
  getPatrolOrbit,
  PATROL_MIN_ORBIT_RADIUS,
  PATROL_ORBIT_RADIUS_FACTOR
} from "../src/systems/patrol";
import type { Vec3 } from "../src/types/game";
import { normalize, sub } from "../src/systems/math";

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

describe("patrol orbit", () => {
  it("centers the Helion patrol orbit between the main station and Stargate", () => {
    const station = stationById["helion-prime"];
    const gate = getJumpGatePosition("helion-reach");
    const orbit = getPatrolOrbit("helion-reach");

    expect(orbit.center).toEqual([
      (station.position[0] + gate[0]) / 2,
      (station.position[1] + gate[1]) / 2,
      (station.position[2] + gate[2]) / 2
    ]);
  });

  it("uses a radius that contains the station-gate pair with room to patrol", () => {
    const station = stationById["helion-prime"];
    const gate = getJumpGatePosition("helion-reach");
    const stationGateDistanceXZ = Math.hypot(station.position[0] - gate[0], station.position[2] - gate[2]);
    const orbit = getPatrolOrbit("helion-reach");

    expect(orbit.radius).toBeGreaterThan(stationGateDistanceXZ / 2);
    expect(orbit.radius).toBeGreaterThanOrEqual(PATROL_MIN_ORBIT_RADIUS);
    expect(orbit.radius).toBeCloseTo(
      Math.max(PATROL_MIN_ORBIT_RADIUS, stationGateDistanceXZ * PATROL_ORBIT_RADIUS_FACTOR)
    );
  });

  it("steers idle patrols around the orbit instead of toward the player", () => {
    const orbit = getPatrolOrbit("helion-reach");
    const position: Vec3 = [orbit.center[0] + orbit.radius * 0.5, orbit.center[1] + 40, orbit.center[2]];
    const playerPosition: Vec3 = [position[0] + 1000, position[1], position[2]];
    const directionToPlayer = normalize(sub(playerPosition, position));
    const direction = getIdlePatrolDirection("helion-reach", position);

    expect(dot(direction, [1, 0, 0])).toBeGreaterThan(0);
    expect(dot(direction, [0, 0, 1])).toBeGreaterThan(0);
    expect(dot(direction, directionToPlayer)).toBeLessThan(0.75);
  });

  it("uses the first station as the Ashen Drift patrol anchor", () => {
    const gate = getJumpGatePosition("ashen-drift");
    const orbit = getPatrolOrbit("ashen-drift");
    const primaryStation = stationById["ashen-freeport"];
    const blackMarket = stationById["black-arcade"];

    expect(orbit.stationPosition).toEqual(primaryStation.position);
    expect(orbit.center).toEqual([
      (primaryStation.position[0] + gate[0]) / 2,
      (primaryStation.position[1] + gate[1]) / 2,
      (primaryStation.position[2] + gate[2]) / 2
    ]);
    expect(orbit.center[0]).not.toBeCloseTo((blackMarket.position[0] + gate[0]) / 2);
  });
});
