import { describe, expect, it } from "vitest";
import {
  createStoryBeatEffects,
  createTargetLockReadyEffects,
  createWeaponDischargeEffects
} from "../src/systems/flightPresentation";

describe("flight presentation cues", () => {
  it("creates richer weapon discharge feedback for missiles than lasers", () => {
    const laser = createWeaponDischargeEffects("laser", [0, 0, 0], [0, 0, -1], "laser");
    const missile = createWeaponDischargeEffects("missile", [0, 0, 0], [0, 0, -1], "missile");

    expect(laser.map((effect) => effect.kind)).toEqual(["hit", "projectile-trail"]);
    expect(missile[0].particleCount).toBeGreaterThan(laser[0].particleCount ?? 0);
    expect(missile[1].size).toBeGreaterThan(laser[1].size);
  });

  it("builds target-lock cues around the locked target and lead pip", () => {
    const effects = createTargetLockReadyEffects("lock", [0, 0, -300], [24, 0, -360]);

    expect(effects[0]).toMatchObject({ kind: "nav-ring", label: "LOCKED", position: [0, 0, -300] });
    expect(effects[1]).toMatchObject({ kind: "projectile-trail", endPosition: [24, 0, -360] });
  });

  it("distinguishes accepted, updated, and completed story beat cues", () => {
    const accepted = createStoryBeatEffects("accepted", [0, 0, 0], "accepted");
    const updated = createStoryBeatEffects("updated", [0, 0, 0], "target-updated");
    const completed = createStoryBeatEffects("completed", [0, 0, 0], "completed");

    expect(accepted[0]).toMatchObject({ kind: "nav-ring", label: "OBJECTIVE" });
    expect(updated[0]).toMatchObject({ kind: "nav-ring", label: "WAKE" });
    expect(completed[0]).toMatchObject({ kind: "nav-ring", label: "CLEARED" });
    expect(completed[1].kind).toBe("kill-pulse");
  });
});
