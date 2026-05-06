import { describe, expect, it } from "vitest";
import {
  getContrabandLaw,
  getContrabandLawSummary,
  getPirateAiProfile,
  resolveCombatAiStep
} from "../src/systems/combatAi";
import { normalize, sub } from "../src/systems/math";
import type { FlightEntity, Vec3 } from "../src/types/game";

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function entity(role: FlightEntity["role"], patch: Partial<FlightEntity> = {}): FlightEntity {
  const base: FlightEntity = {
    id: `${role}-test`,
    name: role,
    role,
    factionId: role === "pirate" ? "independent-pirates" : role === "patrol" ? "solar-directorate" : "free-belt-union",
    position: [0, 0, 200],
    velocity: [0, 0, 0],
    hull: role === "pirate" ? 70 : 100,
    shield: 40,
    maxHull: role === "pirate" ? 70 : 100,
    maxShield: 40,
    lastDamageAt: -999,
    fireCooldown: 0,
    aiProfileId: role === "pirate" ? "raider" : role === "patrol" ? "law-patrol" : "hauler",
    aiState: "patrol",
    aiTimer: 0
  };
  return { ...base, ...patch };
}

describe("combat AI", () => {
  it("retreats low-hull pirates away from the player", () => {
    const pirate = entity("pirate", { hull: 12, position: [0, 0, 140] });
    const result = resolveCombatAiStep({
      ship: pirate,
      systemId: "ashen-drift",
      risk: 0.68,
      playerPosition: [0, 0, 0],
      playerHasContraband: false,
      delta: 0.2,
      now: 12,
      graceUntil: 0,
      pirates: [pirate],
      convoys: []
    });

    expect(result.ship.aiState).toBe("retreat");
    expect(dot(result.desiredDirection, normalize(sub([0, 0, 0], pirate.position)))).toBeLessThan(-0.8);
  });

  it("evades when a pirate is recently hit at close range", () => {
    const pirate = entity("pirate", { position: [90, 0, 0], lastDamageAt: 9.7 });
    const result = resolveCombatAiStep({
      ship: pirate,
      systemId: "ashen-drift",
      risk: 0.68,
      playerPosition: [0, 0, 0],
      playerHasContraband: false,
      delta: 0.2,
      now: 10,
      graceUntil: 0,
      pirates: [pirate],
      convoys: []
    });

    expect(result.ship.aiState).toBe("evade");
  });

  it("keeps patrols on orbit until pirates appear, then intercepts pirates", () => {
    const patrol = entity("patrol", { position: [-190, 55, -360] });
    const idle = resolveCombatAiStep({
      ship: patrol,
      systemId: "helion-reach",
      risk: 0.18,
      playerPosition: [0, 0, 0],
      playerHasContraband: false,
      delta: 0.2,
      now: 10,
      graceUntil: 0,
      pirates: [],
      convoys: []
    });
    expect(idle.ship.aiState).toBe("patrol");

    const pirate = entity("pirate", { id: "pirate-threat", position: [640, 0, -920] });
    const intercept = resolveCombatAiStep({
      ship: patrol,
      systemId: "helion-reach",
      risk: 0.18,
      playerPosition: [0, 0, 0],
      playerHasContraband: false,
      delta: 0.2,
      now: 10,
      graceUntil: 0,
      pirates: [pirate],
      convoys: []
    });
    expect(intercept.ship.aiState).toBe("intercept");
    expect(intercept.ship.aiTargetId).toBe("pirate-threat");
  });

  it("makes traders flee the nearest pirate", () => {
    const trader = entity("trader", { position: [0, 0, 0] });
    const pirate = entity("pirate", { id: "near-pirate", position: [0, 0, -100] });
    const result = resolveCombatAiStep({
      ship: trader,
      systemId: "ashen-drift",
      risk: 0.68,
      playerPosition: [800, 0, 0],
      playerHasContraband: false,
      delta: 0.2,
      now: 10,
      graceUntil: 0,
      pirates: [pirate],
      convoys: []
    });

    expect(result.ship.aiState).toBe("evade");
    expect(dot(result.desiredDirection, normalize(sub(pirate.position, trader.position)))).toBeLessThan(-0.8);
  });

  it("uses deterministic high-risk elite pirate profiles", () => {
    expect(getPirateAiProfile("ashen-drift", 0, 0.68)).toMatchObject({ aiProfileId: "elite-ace", elite: true });
    expect(getPirateAiProfile("ashen-drift", 1, 0.68).elite).toBe(false);
    expect(getPirateAiProfile("helion-reach", 0, 0.18).elite).toBe(false);
  });

  it("summarizes per-system contraband law", () => {
    expect(getContrabandLaw("ashen-drift").disposition).toBe("legal");
    expect(getContrabandLaw("vantara").disposition).toBe("hostile-pursuit");
    expect(getContrabandLawSummary("helion-reach")).toContain("Fine + Confiscate");
  });
});
