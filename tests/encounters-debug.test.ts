import { describe, expect, it } from "vitest";
import { debugScenarios, encounterDefinitions, missionTemplates, shipById } from "../src/data/world";
import { createEncounterStageEffects, getEncounterStageForEvent } from "../src/systems/encounters";

describe("hero encounter and debug scenarios", () => {
  it("defines Glass Wake 02 as the first hero slice encounter", () => {
    const encounter = encounterDefinitions.find((candidate) => candidate.missionId === "story-probe-in-glass");
    expect(encounter?.stages.map((stage) => stage.trigger)).toEqual(["mission-accepted", "target-destroyed", "target-destroyed", "salvage-recovered", "mission-completed"]);
    expect(encounter?.stages[1].targetId).toBe("glass-echo-drone");
    expect(encounter?.stages[1]).toMatchObject({ visualCueKind: "boss-entry", hudTone: "boss" });
    expect(encounter?.stages[3]).toMatchObject({ salvageId: "glass-wake-probe-core", hudTone: "return" });
    expect(encounter?.performanceBudget.maxActiveEffects).toBeLessThanOrEqual(120);
  });

  it("resolves hero encounter stages and their effects by event", () => {
    const encounter = encounterDefinitions.find((candidate) => candidate.missionId === "story-probe-in-glass");
    const primeWake = getEncounterStageForEvent(encounter, {
      missionId: "story-probe-in-glass",
      trigger: "target-destroyed",
      targetId: "glass-echo-drone"
    });
    const coreSecured = getEncounterStageForEvent(encounter, {
      missionId: "story-probe-in-glass",
      trigger: "salvage-recovered",
      salvageId: "glass-wake-probe-core"
    });

    expect(primeWake?.id).toBe("prime-wake");
    expect(createEncounterStageEffects("test", primeWake!, [0, 0, 0]).some((effect) => effect.kind === "boss-burst")).toBe(true);
    expect(coreSecured?.id).toBe("core-secured");
    expect(createEncounterStageEffects("test", coreSecured!, [0, 0, 0]).some((effect) => effect.kind === "salvage-pulse")).toBe(true);
  });

  it("keeps debug scenarios tied to existing ships and missions", () => {
    for (const scenario of debugScenarios) {
      expect(shipById[scenario.shipId]).toBeTruthy();
      for (const missionId of scenario.activeMissionIds ?? []) {
        expect(missionTemplates.some((mission) => mission.id === missionId)).toBe(true);
      }
      for (const missionId of scenario.completedMissionIds ?? []) {
        expect(missionTemplates.some((mission) => mission.id === missionId)).toBe(true);
      }
    }
    const hero = debugScenarios.find((scenario) => scenario.id === "glass-wake-hero");
    expect(hero).toMatchObject({
      systemId: "mirr-vale",
      targetId: "glass-echo-drone",
      completedMissionIds: ["story-clean-carrier"]
    });
    expect(hero?.playerPosition).toBeDefined();
  });
});
