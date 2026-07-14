import { describe, expect, it } from "vitest";
import {
  MAX_SAFE_FLIGHT_NUMBER,
  integrateVelocity,
  isFiniteFlightNumber,
  isFiniteFlightVec3,
  sanitizeFlightNumber,
  sanitizeFlightVec3,
  sanitizePlayerFlightState
} from "../src/systems/flight";
import type { PlayerState } from "../src/types/game";

function playerState(): PlayerState {
  return {
    shipId: "sparrow-mk1",
    stats: {
      hull: 100,
      shield: 80,
      energy: 100,
      speed: 170,
      handling: 1.35,
      cargoCapacity: 18,
      primarySlots: 1,
      secondarySlots: 1,
      utilitySlots: 1,
      defenseSlots: 1,
      engineeringSlots: 1
    },
    hull: 100,
    shield: 80,
    energy: 100,
    credits: 1500,
    cargo: {},
    equipment: ["pulse-laser"],
    missiles: 6,
    ownedShips: ["sparrow-mk1"],
    position: [0, 0, 86],
    velocity: [0, 0, -41],
    rotation: [0, 0, 0],
    throttle: 0.25,
    lastDamageAt: -999
  };
}

describe("flight integration", () => {
  it("accelerates toward target speed instead of snapping instantly", () => {
    const next = integrateVelocity({
      currentVelocity: [0, 0, 0],
      forward: [0, 0, -1],
      targetThrottle: 1,
      maxSpeed: 170,
      afterburning: false,
      delta: 1 / 60
    });
    const speed = Math.hypot(...next);
    expect(speed).toBeGreaterThan(0);
    expect(speed).toBeLessThan(170);
  });

  it("afterburner produces a stronger target velocity", () => {
    const normal = integrateVelocity({
      currentVelocity: [0, 0, -60],
      forward: [0, 0, -1],
      targetThrottle: 1,
      maxSpeed: 170,
      afterburning: false,
      delta: 0.25
    });
    const boosted = integrateVelocity({
      currentVelocity: [0, 0, -60],
      forward: [0, 0, -1],
      targetThrottle: 1,
      maxSpeed: 170,
      afterburning: true,
      delta: 0.25
    });
    expect(Math.hypot(...boosted)).toBeGreaterThan(Math.hypot(...normal));
  });

  it("accepts only finite numbers and Vec3 components inside the safe integer boundary", () => {
    expect(isFiniteFlightNumber(MAX_SAFE_FLIGHT_NUMBER)).toBe(true);
    expect(isFiniteFlightNumber(-MAX_SAFE_FLIGHT_NUMBER)).toBe(true);
    expect(isFiniteFlightNumber(Number.MAX_VALUE)).toBe(false);
    expect(isFiniteFlightNumber(Number.NaN)).toBe(false);
    expect(isFiniteFlightNumber(Number.POSITIVE_INFINITY)).toBe(false);
    expect(sanitizeFlightNumber(Number.MAX_VALUE, 0, 0, 1)).toBe(1);
    expect(isFiniteFlightVec3([1, 2, 3])).toBe(true);
    expect(isFiniteFlightVec3([1, Number.MAX_VALUE, 3])).toBe(false);
    expect(sanitizeFlightVec3([1, Number.MAX_VALUE, Number.NaN], [4, 5, 6])).toEqual([1, 5, 6]);
  });

  it("repairs the flight fields from the #12 and #55 overlays without changing valid state", () => {
    const valid = playerState();
    expect(sanitizePlayerFlightState(valid, valid.stats)).toBe(valid);

    const corrupted = {
      ...valid,
      stats: {
        ...valid.stats,
        energy: -Number.MAX_VALUE,
        speed: "invalid-speed-value" as unknown as number
      },
      hull: "invalid-hull-value" as unknown as number,
      position: [Number.MAX_VALUE, -Number.MAX_VALUE, Number.MAX_VALUE] as PlayerState["position"],
      rotation: [Number.NaN, Number.POSITIVE_INFINITY, 0] as PlayerState["rotation"],
      throttle: Number.MAX_VALUE
    };
    const repaired = sanitizePlayerFlightState(corrupted, valid.stats);

    expect(repaired).not.toBe(corrupted);
    expect(repaired.position).toEqual([0, 0, 0]);
    expect(repaired.rotation).toEqual([0, 0, 0]);
    expect(repaired.throttle).toBe(1);
    expect(repaired.stats.speed).toBe(170);
    expect(repaired.stats.energy).toBe(0);
    expect(repaired.energy).toBe(0);
    expect(repaired.hull).toBe(100);
    expect(repaired.velocity).toEqual(valid.velocity);
  });
});
