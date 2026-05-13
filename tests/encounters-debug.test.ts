import { describe, expect, it } from "vitest";
import { debugScenarios, encounterDefinitions, missionTemplates, shipById } from "../src/data/world";

describe("hero encounter and debug scenarios", () => {
  it("defines Glass Wake 02 as the first hero slice encounter", () => {
    const encounter = encounterDefinitions.find((candidate) => candidate.missionId === "story-probe-in-glass");
    expect(encounter?.stages.map((stage) => stage.trigger)).toEqual(["mission-accepted", "target-destroyed", "target-destroyed"]);
    expect(encounter?.stages[1].targetId).toBe("glass-echo-drone");
    expect(encounter?.performanceBudget.maxActiveEffects).toBeLessThanOrEqual(120);
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
  });
});
