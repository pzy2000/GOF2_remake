import { describe, expect, it } from "vitest";
import { missionTemplates, shipById } from "../src/data/world";
import {
  CLEAN_CARRIER_MISSION_ID,
  createInitialOnboardingState,
  getOnboardingView,
  MIRR_LATTICE_STATION_ID,
  resolveOnboardingProgress
} from "../src/systems/onboarding";
import type { OnboardingStepId, PlayerState } from "../src/types/game";

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

const cleanCarrier = missionTemplates.find((mission) => mission.id === CLEAN_CARRIER_MISSION_ID)!;
const probeInGlass = missionTemplates.find((mission) => mission.id === "story-probe-in-glass")!;

describe("onboarding checklist", () => {
  it("derives first-flight progress from movement", () => {
    const state = createInitialOnboardingState(0);
    const progress = resolveOnboardingProgress({
      onboardingState: state,
      screen: "flight",
      currentSystemId: "helion-reach",
      player: player({ position: [0, 0, -80], velocity: [18, 0, 0] }),
      activeMissions: [],
      completedMissionIds: [],
      gameClock: 3
    });

    expect(progress.completedNow).toEqual(["first-flight"]);
    expect(progress.rewardStepIds).toEqual(["first-flight"]);
  });

  it("recognizes route planning through autopilot or Mirr fallback", () => {
    const completedStepIds: OnboardingStepId[] = ["first-flight", "dock-helion", "accept-clean-carrier"];
    const state = { ...createInitialOnboardingState(0), completedStepIds };
    const progress = resolveOnboardingProgress({
      onboardingState: state,
      screen: "flight",
      currentSystemId: "helion-reach",
      player: player(),
      activeMissions: [cleanCarrier],
      completedMissionIds: [],
      autopilot: {
        phase: "to-origin-gate",
        originSystemId: "helion-reach",
        targetSystemId: "mirr-vale",
        targetStationId: MIRR_LATTICE_STATION_ID,
        targetPosition: [0, 0, 0],
        timer: 0,
        cancelable: true
      },
      gameClock: 5
    });

    expect(progress.completedNow).toEqual(["plot-clean-carrier-route", "launch-for-mirr"]);
  });

  it("keeps the expanded checklist visible after Clean Carrier until GW02 is complete", () => {
    const state = createInitialOnboardingState(0);
    const progress = resolveOnboardingProgress({
      onboardingState: state,
      screen: "station",
      currentSystemId: "mirr-vale",
      currentStationId: MIRR_LATTICE_STATION_ID,
      player: player(),
      activeMissions: [],
      completedMissionIds: [CLEAN_CARRIER_MISSION_ID],
      gameClock: 10
    });

    expect(progress.finishedNow).toBe(false);
    expect(progress.onboardingState).toMatchObject({
      enabled: true,
      completedStepIds: [
        "first-flight",
        "dock-helion",
        "accept-clean-carrier",
        "plot-clean-carrier-route",
        "launch-for-mirr",
        "dock-mirr-lattice",
        "complete-clean-carrier"
      ]
    });
  });

  it("finishes the checklist after Probe in the Glass is completed", () => {
    const state = createInitialOnboardingState(0);
    const progress = resolveOnboardingProgress({
      onboardingState: state,
      screen: "station",
      currentSystemId: "mirr-vale",
      currentStationId: MIRR_LATTICE_STATION_ID,
      player: player(),
      activeMissions: [],
      completedMissionIds: [CLEAN_CARRIER_MISSION_ID, "story-probe-in-glass"],
      gameClock: 30
    });

    expect(progress.finishedNow).toBe(true);
    expect(progress.onboardingState).toMatchObject({ enabled: false, collapsed: true });
    expect(progress.onboardingState?.completedStepIds).toContain("complete-probe-in-glass");
  });

  it("tracks GW02 target and salvage progress before completion", () => {
    const activeProbe = {
      ...probeInGlass,
      accepted: true,
      acceptedAt: 12,
      storyTargetDestroyedIds: ["glass-echo-drone"],
      storyEchoLockedTargetIds: [],
      salvage: { ...probeInGlass.salvage!, recovered: false }
    };
    const state = createInitialOnboardingState(0);

    expect(resolveOnboardingProgress({
      onboardingState: state,
      screen: "flight",
      currentSystemId: "mirr-vale",
      player: player(),
      activeMissions: [activeProbe],
      completedMissionIds: [CLEAN_CARRIER_MISSION_ID],
      gameClock: 20
    }).onboardingState?.completedStepIds).toContain("destroy-glass-echo-drone");

    const recovered = { ...activeProbe, storyTargetDestroyedIds: ["glass-echo-drone", "glass-echo-prime"], salvage: { ...activeProbe.salvage!, recovered: true } };
    expect(resolveOnboardingProgress({
      onboardingState: state,
      screen: "flight",
      currentSystemId: "mirr-vale",
      player: player(),
      activeMissions: [recovered],
      completedMissionIds: [CLEAN_CARRIER_MISSION_ID],
      gameClock: 25
    }).onboardingState?.completedStepIds).toEqual(expect.arrayContaining(["defeat-glass-echo-prime", "recover-probe-core"]));
  });

  it("marks old clean-carrier completion as visible and incomplete in the view", () => {
    const view = getOnboardingView({
      onboardingState: {
        enabled: true,
        collapsed: false,
        completedStepIds: [
          "first-flight",
          "dock-helion",
          "accept-clean-carrier",
          "plot-clean-carrier-route",
          "launch-for-mirr",
          "dock-mirr-lattice",
          "complete-clean-carrier"
        ],
        claimedRewardStepIds: [],
        startedAtGameTime: 0,
        completedAtGameTime: 10
      },
      screen: "station",
      currentSystemId: "mirr-vale",
      currentStationId: MIRR_LATTICE_STATION_ID,
      player: player(),
      activeMissions: [],
      completedMissionIds: [CLEAN_CARRIER_MISSION_ID],
      gameClock: 10
    });

    expect(view.visible).toBe(true);
    expect(view.completedCount).toBe(7);
    expect(view.totalCount).toBeGreaterThan(7);
  });
});
