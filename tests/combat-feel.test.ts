import { describe, expect, it } from "vitest";
import {
  canRhythmFireAtTarget,
  createKillEffects,
  resolveAssistedShotDirection,
  selectSoftLockTarget
} from "../src/systems/combatFeel";
import { defaultFlightTuning } from "../src/systems/flightTuning";
import type { FlightEntity, PlayerState } from "../src/types/game";

function enemy(id: string, patch: Partial<FlightEntity> = {}): FlightEntity {
  return {
    id,
    name: id,
    role: "pirate",
    factionId: "independent-pirates",
    position: [0, 0, -320],
    velocity: [0, 0, 0],
    hull: 80,
    shield: 20,
    maxHull: 80,
    maxShield: 20,
    lastDamageAt: -999,
    fireCooldown: 0,
    aiProfileId: "raider",
    aiState: "attack",
    aiTimer: 0,
    ...patch
  };
}

const player: Pick<PlayerState, "position" | "rotation"> = {
  position: [0, 0, 0],
  rotation: [0, 0, 0]
};

describe("combat feel", () => {
  it("selects only live targets inside the forward soft-lock cone", () => {
    const selected = selectSoftLockTarget(player, [
      enemy("behind", { position: [0, 0, 220] }),
      enemy("dead", { position: [0, 0, -120], hull: 0 }),
      enemy("dying", { position: [0, 0, -100], deathTimer: 0.2 }),
      enemy("front", { position: [16, 0, -260] })
    ]);

    expect(selected?.id).toBe("front");
  });

  it("keeps assisted aim inside the configured maximum correction angle", () => {
    const wideTarget = enemy("wide", { position: [400, 0, -300] });
    const fallback = [0, 0, -1] as const;

    expect(resolveAssistedShotDirection({ position: [0, 0, 0] }, wideTarget, [...fallback])).toEqual([...fallback]);

    const nearForward = enemy("near-forward", { position: [32, 0, -420], velocity: [20, 0, 0] });
    const assisted = resolveAssistedShotDirection({ position: [0, 0, 0] }, nearForward, [...fallback]);
    expect(assisted[2]).toBeLessThan(-0.98);
    expect(assisted[0]).toBeGreaterThan(0);
  });

  it("creates larger multi-stage kill feedback for bosses", () => {
    const normal = createKillEffects("normal", enemy("normal"));
    const boss = createKillEffects("boss", enemy("boss", { boss: true, maxHull: 420, hull: 420 }));

    expect(boss.length).toBeGreaterThan(normal.length);
    expect(boss[0].size).toBeGreaterThan(normal[0].size);
    expect(boss.some((effect) => effect.kind === "kill-pulse")).toBe(true);
  });

  it("gates enemy fire by attack windows and firing cone", () => {
    expect(canRhythmFireAtTarget([0, 0, 0], [0, 0, -1], [0, 0, -300], 0.4, false)).toBe(true);
    expect(canRhythmFireAtTarget([0, 0, 0], [0, 0, -1], [0, 0, -300], defaultFlightTuning.combatRhythm.attackWindowSeconds + 0.25, false)).toBe(false);
    expect(canRhythmFireAtTarget([0, 0, 0], [1, 0, 0], [0, 0, -300], 0.4, false)).toBe(false);
  });
});
