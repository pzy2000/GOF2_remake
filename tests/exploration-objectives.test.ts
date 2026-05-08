import { describe, expect, it } from "vitest";
import { createInitialExplorationState } from "../src/systems/exploration";
import {
  EXPLORATION_CHAIN_BLUEPRINT_REWARDS,
  applyExplorationChainBlueprintRewards,
  getExplorationObjectiveSummaryForSignal,
  getExplorationObjectiveSummaryForSystem,
  getMissingExplorationChainRewardBlueprintIds
} from "../src/systems/explorationObjectives";
import type { ExplorationState, PlayerState } from "../src/types/game";

function player(unlockedBlueprintIds: PlayerState["unlockedBlueprintIds"] = ["scanner"]): PlayerState {
  return {
    shipId: "sparrow-mk1",
    stats: {
      hull: 100,
      shield: 50,
      energy: 100,
      speed: 100,
      handling: 1,
      cargoCapacity: 20,
      primarySlots: 1,
      secondarySlots: 1,
      utilitySlots: 1,
      defenseSlots: 1,
      engineeringSlots: 1
    },
    hull: 100,
    shield: 50,
    energy: 100,
    credits: 1000,
    cargo: {},
    equipment: [],
    missiles: 0,
    ownedShips: ["sparrow-mk1"],
    position: [0, 0, 0],
    velocity: [0, 0, 0],
    rotation: [0, 0, 0],
    throttle: 0,
    lastDamageAt: -999,
    unlockedBlueprintIds
  };
}

describe("exploration objective summaries", () => {
  it("summarizes available, discovered, scanning, locked, and complete signal states", () => {
    const empty = createInitialExplorationState();
    expect(getExplorationObjectiveSummaryForSignal("quiet-signal-sundog-lattice", empty)).toMatchObject({
      chainId: "helion-sundog-chain",
      status: "available",
      nextSignalId: "quiet-signal-sundog-lattice",
      completedCount: 0,
      totalCount: 3
    });
    expect(getExplorationObjectiveSummaryForSignal("quiet-signal-meridian-afterimage", empty)).toMatchObject({
      status: "locked",
      nextSignalId: "quiet-signal-meridian-afterimage"
    });

    const discovered: ExplorationState = {
      ...empty,
      discoveredSignalIds: ["quiet-signal-sundog-lattice"]
    };
    expect(getExplorationObjectiveSummaryForSignal("quiet-signal-sundog-lattice", discovered)).toMatchObject({
      status: "discovered",
      nextTitle: "Sundog Lattice"
    });
    expect(getExplorationObjectiveSummaryForSignal("quiet-signal-sundog-lattice", discovered, {
      activeScanSignalId: "quiet-signal-sundog-lattice"
    })).toMatchObject({ status: "scanning" });

    const complete: ExplorationState = {
      discoveredSignalIds: ["quiet-signal-sundog-lattice", "quiet-signal-meridian-afterimage", "quiet-signal-sundog-crown-shard"],
      completedSignalIds: ["quiet-signal-sundog-lattice", "quiet-signal-meridian-afterimage", "quiet-signal-sundog-crown-shard"],
      revealedStationIds: [],
      eventLogIds: ["quiet-signal-sundog-lattice", "quiet-signal-meridian-afterimage", "quiet-signal-sundog-crown-shard"]
    };
    expect(getExplorationObjectiveSummaryForSystem("helion-reach", complete)).toMatchObject({
      status: "complete",
      unlockedBlueprintIds: ["survey-array"]
    });
  });

  it("returns current-system next objective and chain reward unlocks", () => {
    const explorationState: ExplorationState = {
      ...createInitialExplorationState(),
      completedSignalIds: ["quiet-signal-sundog-lattice"],
      discoveredSignalIds: ["quiet-signal-sundog-lattice"],
      eventLogIds: ["quiet-signal-sundog-lattice"]
    };
    const summary = getExplorationObjectiveSummaryForSystem("helion-reach", explorationState, {
      playerPosition: [0, 0, 0]
    });

    expect(summary).toMatchObject({
      chainId: "helion-sundog-chain",
      nextSignalId: "quiet-signal-meridian-afterimage",
      status: "available",
      completedCount: 1,
      totalCount: 3
    });
    expect(summary?.distanceMeters).toBeGreaterThan(0);
    expect(EXPLORATION_CHAIN_BLUEPRINT_REWARDS["helion-sundog-chain"]).toBe("survey-array");
  });

  it("derives completed-chain blueprint rewards without adding save fields", () => {
    const explorationState: ExplorationState = {
      discoveredSignalIds: ["quiet-signal-sundog-lattice", "quiet-signal-meridian-afterimage"],
      completedSignalIds: ["quiet-signal-sundog-lattice", "quiet-signal-meridian-afterimage"],
      revealedStationIds: [],
      eventLogIds: ["quiet-signal-sundog-lattice", "quiet-signal-meridian-afterimage"]
    };

    expect(getMissingExplorationChainRewardBlueprintIds(explorationState, ["scanner"])).toEqual(["survey-array"]);
    const result = applyExplorationChainBlueprintRewards(player(["scanner"]), explorationState);
    expect(result.unlockedBlueprintIds).toEqual(["survey-array"]);
    expect(result.player.unlockedBlueprintIds).toEqual(["scanner", "survey-array"]);
    expect(applyExplorationChainBlueprintRewards(result.player, explorationState).unlockedBlueprintIds).toEqual([]);
  });

  it("marks deep signals equipment-locked until an upgraded scanner is installed", () => {
    const explorationState: ExplorationState = {
      discoveredSignalIds: ["quiet-signal-sundog-lattice", "quiet-signal-meridian-afterimage"],
      completedSignalIds: ["quiet-signal-sundog-lattice", "quiet-signal-meridian-afterimage"],
      revealedStationIds: [],
      eventLogIds: ["quiet-signal-sundog-lattice", "quiet-signal-meridian-afterimage"]
    };

    expect(getExplorationObjectiveSummaryForSignal("quiet-signal-sundog-crown-shard", explorationState, {
      playerEquipment: ["scanner"]
    })).toMatchObject({
      status: "equipment-locked",
      nextSignalId: "quiet-signal-sundog-crown-shard"
    });
    expect(getExplorationObjectiveSummaryForSignal("quiet-signal-sundog-crown-shard", explorationState, {
      playerEquipment: ["survey-array"]
    })).toMatchObject({
      status: "available",
      nextSignalId: "quiet-signal-sundog-crown-shard"
    });
  });

  it("preserves stage-two rewards and grants the deep-route reward after all deep signals", () => {
    const stageTwoComplete: ExplorationState = {
      discoveredSignalIds: ["quiet-signal-sundog-lattice", "quiet-signal-meridian-afterimage"],
      completedSignalIds: ["quiet-signal-sundog-lattice", "quiet-signal-meridian-afterimage"],
      revealedStationIds: [],
      eventLogIds: ["quiet-signal-sundog-lattice", "quiet-signal-meridian-afterimage"]
    };
    expect(getMissingExplorationChainRewardBlueprintIds(stageTwoComplete, ["scanner"])).toEqual(["survey-array"]);

    const allDeepComplete: ExplorationState = {
      discoveredSignalIds: [
        "quiet-signal-sundog-lattice",
        "quiet-signal-meridian-afterimage",
        "quiet-signal-sundog-crown-shard",
        "quiet-signal-foundry-ark-wreck",
        "quiet-signal-anvil-listener-spoor",
        "quiet-signal-obsidian-foundry-wake",
        "quiet-signal-ghost-iff-challenge",
        "quiet-signal-redoubt-silence-test",
        "quiet-signal-redoubt-ghost-permit",
        "quiet-signal-folded-reflection",
        "quiet-signal-parallax-deep-index",
        "quiet-signal-parallax-outer-index",
        "quiet-signal-dead-letter-convoy",
        "quiet-signal-false-mercy-ledger",
        "quiet-signal-moth-vault-ledger",
        "quiet-signal-crownside-whisper",
        "quiet-signal-pearl-witness-chorus",
        "quiet-signal-crownshade-occlusion",
        "quiet-signal-locked-keel-cache",
        "quiet-signal-keel-ghost-route",
        "quiet-signal-keel-archive-prism"
      ],
      completedSignalIds: [
        "quiet-signal-sundog-lattice",
        "quiet-signal-meridian-afterimage",
        "quiet-signal-sundog-crown-shard",
        "quiet-signal-foundry-ark-wreck",
        "quiet-signal-anvil-listener-spoor",
        "quiet-signal-obsidian-foundry-wake",
        "quiet-signal-ghost-iff-challenge",
        "quiet-signal-redoubt-silence-test",
        "quiet-signal-redoubt-ghost-permit",
        "quiet-signal-folded-reflection",
        "quiet-signal-parallax-deep-index",
        "quiet-signal-parallax-outer-index",
        "quiet-signal-dead-letter-convoy",
        "quiet-signal-false-mercy-ledger",
        "quiet-signal-moth-vault-ledger",
        "quiet-signal-crownside-whisper",
        "quiet-signal-pearl-witness-chorus",
        "quiet-signal-crownshade-occlusion",
        "quiet-signal-locked-keel-cache",
        "quiet-signal-keel-ghost-route",
        "quiet-signal-keel-archive-prism"
      ],
      revealedStationIds: ["parallax-hermitage", "obsidian-foundry", "moth-vault", "crownshade-observatory"],
      eventLogIds: []
    };

    expect(getMissingExplorationChainRewardBlueprintIds(allDeepComplete, [
      "scanner",
      "survey-array",
      "repair-drone",
      "shield-matrix",
      "targeting-computer",
      "torpedo-rack",
      "quantum-reactor",
      "plasma-cannon"
    ])).toEqual(["relic-cartographer"]);
  });
});
