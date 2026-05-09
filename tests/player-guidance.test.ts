import { describe, expect, it } from "vitest";
import { explorationSignals, missionTemplates, shipById } from "../src/data/world";
import { createInitialMarketState } from "../src/systems/economy";
import { createInitialExplorationState } from "../src/systems/exploration";
import { createInitialFactionHeat } from "../src/systems/factionConsequences";
import { getNextGuidanceRecommendation, type GuidanceInput } from "../src/systems/playerGuidance";
import { createInitialReputation } from "../src/systems/reputation";
import type { ExplorationState, MissionDefinition, PlayerState } from "../src/types/game";

const storyMissionIds = missionTemplates.filter((mission) => mission.storyArcId).map((mission) => mission.id);

function player(patch: Partial<PlayerState> = {}): PlayerState {
  const ship = shipById["sparrow-mk1"];
  return {
    shipId: ship.id,
    stats: ship.stats,
    hull: ship.stats.hull,
    shield: ship.stats.shield,
    energy: ship.stats.energy,
    credits: 1500,
    cargo: {},
    equipment: ship.equipment,
    missiles: 6,
    ownedShips: [ship.id],
    position: [0, 0, 120],
    velocity: [0, 0, 0],
    rotation: [0, 0, 0],
    throttle: 0.25,
    lastDamageAt: 0,
    ...patch
  } as PlayerState;
}

function acceptedMission(id: string, patch: Partial<MissionDefinition> = {}): MissionDefinition {
  const mission = missionTemplates.find((candidate) => candidate.id === id);
  if (!mission) throw new Error(`Missing mission ${id}`);
  return {
    ...mission,
    accepted: true,
    completed: false,
    failed: false,
    acceptedAt: 0,
    storyTargetDestroyedIds: mission.storyEncounter ? [] : mission.storyTargetDestroyedIds,
    storyEchoLockedTargetIds: mission.storyEncounter ? [] : mission.storyEchoLockedTargetIds,
    ...patch
  };
}

function input(patch: Partial<GuidanceInput> = {}): GuidanceInput {
  return {
    screen: "station",
    currentSystemId: "mirr-vale",
    currentStationId: "mirr-lattice",
    player: player(),
    activeMissions: [],
    completedMissionIds: [],
    failedMissionIds: [],
    marketState: createInitialMarketState(),
    knownSystems: ["helion-reach", "mirr-vale", "kuro-belt"],
    knownPlanetIds: ["helion-prime-world", "mirr-lattice-world", "kuro-ironfield"],
    explorationState: createInitialExplorationState(),
    gameClock: 0,
    reputation: createInitialReputation(),
    factionHeat: createInitialFactionHeat(),
    ...patch
  };
}

describe("player guidance recommendations", () => {
  it("recommends Glass Wake 02 after Clean Carrier is complete", () => {
    const recommendation = getNextGuidanceRecommendation(input({
      completedMissionIds: ["story-clean-carrier"]
    }));

    expect(recommendation).toMatchObject({
      category: "story",
      title: "Glass Wake 02 · Glass Wake 02: Probe in the Glass",
      targetSystemId: "mirr-vale",
      targetStationId: "mirr-lattice",
      stationTab: "Mission Board"
    });
  });

  it("keeps an active story objective above dispatch and exploration hooks", () => {
    const dispatch: MissionDefinition = {
      ...acceptedMission("story-clean-carrier"),
      id: "market-gap:mirr-lattice:electronics:critical",
      title: "Market Gap: Electronics for Mirr Lattice",
      storyArcId: undefined,
      storyChapterId: undefined,
      destinationSystemId: "mirr-vale",
      destinationStationId: "mirr-lattice",
      cargoRequired: { electronics: 2 },
      cargoProvided: undefined
    };
    const recommendation = getNextGuidanceRecommendation(input({
      activeMissions: [acceptedMission("story-probe-in-glass"), dispatch],
      completedMissionIds: ["story-clean-carrier"]
    }));

    expect(recommendation?.category).toBe("story");
    expect(recommendation?.title).toContain("Probe in the Glass");
  });

  it("recommends accepted economy dispatch after the story is complete", () => {
    const dispatch: MissionDefinition = {
      ...acceptedMission("story-clean-carrier"),
      id: "market-gap:mirr-lattice:electronics:critical",
      title: "Market Gap: Electronics for Mirr Lattice",
      storyArcId: undefined,
      storyChapterId: undefined,
      destinationSystemId: "mirr-vale",
      destinationStationId: "mirr-lattice",
      cargoRequired: { electronics: 2 },
      cargoProvided: undefined
    };
    const recommendation = getNextGuidanceRecommendation(input({
      activeMissions: [dispatch],
      completedMissionIds: storyMissionIds
    }));

    expect(recommendation).toMatchObject({
      category: "economy",
      stationTab: "Economy",
      targetStationId: "mirr-lattice"
    });
  });

  it("recommends Blueprint Workshop when the current Quiet Signal is equipment locked", () => {
    const explorationState: ExplorationState = {
      ...createInitialExplorationState(),
      completedSignalIds: ["quiet-signal-sundog-lattice", "quiet-signal-meridian-afterimage"],
      discoveredSignalIds: ["quiet-signal-sundog-lattice", "quiet-signal-meridian-afterimage"],
      revealedStationIds: [],
      eventLogIds: []
    };
    const recommendation = getNextGuidanceRecommendation(input({
      currentSystemId: "helion-reach",
      currentStationId: "helion-prime",
      completedMissionIds: storyMissionIds,
      explorationState
    }));

    expect(recommendation).toMatchObject({
      category: "blueprint",
      stationTab: "Blueprint Workshop"
    });
    expect(recommendation?.objectiveText).toContain("requires");
  });

  it("recommends an affordable legal ship upgrade at the current station", () => {
    const recommendation = getNextGuidanceRecommendation(input({
      currentSystemId: "helion-reach",
      currentStationId: "helion-prime",
      completedMissionIds: storyMissionIds,
      explorationState: {
        ...createInitialExplorationState(),
        completedSignalIds: explorationSignals.map((signal) => signal.id),
        discoveredSignalIds: explorationSignals.map((signal) => signal.id),
        revealedStationIds: [],
        eventLogIds: []
      },
      player: player({ credits: 7000 })
    }));

    expect(recommendation).toMatchObject({
      category: "shipyard",
      title: "Mule LX",
      stationTab: "Shipyard"
    });
  });
});
