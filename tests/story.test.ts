import { describe, expect, it } from "vitest";
import { commodityById, glassWakeProtocol, missionTemplates, stationById, systemById } from "../src/data/world";
import { cloneMission, markEscortArrived, markSalvageRecovered, markStoryTargetDestroyed } from "../src/systems/missions";
import { getStoryObjectiveSummary } from "../src/systems/story";
import type { CargoHold, MissionDefinition } from "../src/types/game";

function summary({
  activeMissions = [],
  completedMissionIds = [],
  failedMissionIds = [],
  currentSystemId = "helion-reach",
  currentStationId,
  playerCargo = {}
}: {
  activeMissions?: MissionDefinition[];
  completedMissionIds?: string[];
  failedMissionIds?: string[];
  currentSystemId?: string;
  currentStationId?: string;
  playerCargo?: CargoHold;
} = {}) {
  return getStoryObjectiveSummary({
    arc: glassWakeProtocol,
    missions: missionTemplates,
    activeMissions,
    completedMissionIds,
    failedMissionIds,
    currentSystemId,
    currentStationId,
    playerCargo,
    getStationName: (stationId) => stationById[stationId]?.name ?? stationId,
    getSystemName: (systemId) => systemById[systemId]?.name ?? systemId,
    getCommodityName: (commodityId) => commodityById[commodityId]?.name ?? commodityId
  });
}

function acceptedMission(id: string): MissionDefinition {
  const mission = missionTemplates.find((candidate) => candidate.id === id);
  if (!mission) throw new Error(`Missing mission ${id}`);
  return { ...cloneMission(mission), accepted: true, acceptedAt: 0 };
}

describe("story objective summary", () => {
  it("points the first available chapter at the mission board", () => {
    expect(summary()).toMatchObject({
      status: "available",
      focus: "accept",
      missionId: "story-clean-carrier",
      chapterLabel: "Glass Wake 01",
      targetSystemId: "helion-reach"
    });
  });

  it("points active courier chapters at their destination station", () => {
    const mission = acceptedMission("story-clean-carrier");

    expect(summary({ activeMissions: [mission] })).toMatchObject({
      status: "active",
      focus: "travel",
      targetSystemId: "mirr-vale",
      targetStationId: "mirr-lattice",
      targetPositionSystemId: "helion-reach",
      visualCueLabel: "GHOST PING"
    });

    expect(summary({ activeMissions: [mission], currentSystemId: "mirr-vale", currentStationId: "mirr-lattice" })).toMatchObject({
      focus: "deliver",
      targetStationId: "mirr-lattice"
    });
  });

  it("prioritizes remaining story targets before salvage delivery", () => {
    const mission = acceptedMission("story-probe-in-glass");

    expect(summary({ activeMissions: [mission], completedMissionIds: ["story-clean-carrier"], currentSystemId: "mirr-vale" })).toMatchObject({
      status: "active",
      focus: "clear-targets",
      targetSystemId: "mirr-vale",
      remainingTargetNames: ["Glass Echo Drone"]
    });

    const cleared = markStoryTargetDestroyed(mission, "glass-echo-drone");
    expect(summary({ activeMissions: [cleared], completedMissionIds: ["story-clean-carrier"], currentSystemId: "mirr-vale" })).toMatchObject({
      focus: "recover-salvage",
      targetSystemId: "mirr-vale"
    });
  });

  it("tracks escort missions until the convoy arrives", () => {
    const mission = acceptedMission("story-bastion-calibration");
    const cleared = mission.storyEncounter!.requiredTargetIds.reduce((next, targetId) => markStoryTargetDestroyed(next, targetId), mission);

    expect(summary({ activeMissions: [cleared], completedMissionIds: ["story-clean-carrier", "story-probe-in-glass", "story-kuro-resonance"], currentSystemId: "vantara" })).toMatchObject({
      focus: "escort",
      targetSystemId: "vantara"
    });

    expect(summary({ activeMissions: [markEscortArrived(cleared)], completedMissionIds: ["story-clean-carrier", "story-probe-in-glass", "story-kuro-resonance"], currentSystemId: "vantara", currentStationId: "vantara-bastion" })).toMatchObject({
      focus: "deliver",
      targetStationId: "vantara-bastion"
    });
  });

  it("asks for missing mining cargo before delivery", () => {
    const mission = acceptedMission("story-kuro-resonance");
    const cleared = markStoryTargetDestroyed(mission, "kuro-listener-drone");

    expect(summary({ activeMissions: [cleared], completedMissionIds: ["story-clean-carrier", "story-probe-in-glass"], currentSystemId: "kuro-belt" })).toMatchObject({
      focus: "travel",
      targetSystemId: "kuro-belt"
    });
    expect(summary({ activeMissions: [cleared], completedMissionIds: ["story-clean-carrier", "story-probe-in-glass"], currentSystemId: "kuro-belt" }).objectiveText).toContain("Mine 3 Voidglass");

    expect(summary({ activeMissions: [cleared], completedMissionIds: ["story-clean-carrier", "story-probe-in-glass"], currentSystemId: "kuro-belt", currentStationId: "kuro-deep", playerCargo: { voidglass: 3 } })).toMatchObject({
      focus: "deliver"
    });
  });

  it("points failed retryable chapters back to the origin system", () => {
    expect(summary({ completedMissionIds: ["story-clean-carrier"], failedMissionIds: ["story-probe-in-glass"] })).toMatchObject({
      status: "failed-retry",
      focus: "retry",
      missionId: "story-probe-in-glass",
      targetSystemId: "mirr-vale"
    });
  });

  it("marks the arc complete after all chapters are complete", () => {
    const result = summary({ completedMissionIds: missionTemplates.filter((mission) => mission.storyCritical).map((mission) => mission.id) });
    expect(result).toMatchObject({
      status: "complete",
      focus: "complete",
      remainingTargetNames: []
    });
    expect(result.missionId).toBeUndefined();
  });
});
