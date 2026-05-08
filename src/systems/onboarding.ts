import type { AutoPilotState, MissionDefinition, OnboardingState, OnboardingStepId, PlayerState, Screen, Vec3 } from "../types/game";
import { distance } from "./math";

export const CLEAN_CARRIER_MISSION_ID = "story-clean-carrier";
export const HELION_START_STATION_ID = "helion-prime";
export const MIRR_LATTICE_STATION_ID = "mirr-lattice";
export const MIRR_VALE_SYSTEM_ID = "mirr-vale";

const START_POSITION: Vec3 = [0, 0, 120];
const FIRST_FLIGHT_DISTANCE_METERS = 140;

export interface OnboardingStepDefinition {
  id: OnboardingStepId;
  title: string;
  objective: string;
  rewardCredits: number;
}

export const onboardingSteps: OnboardingStepDefinition[] = [
  {
    id: "first-flight",
    title: "First Flight",
    objective: "Move clear of the launch vector and get used to steering.",
    rewardCredits: 50
  },
  {
    id: "dock-helion",
    title: "Dock at Helion",
    objective: "Approach Helion Prime Exchange and press E when the dock prompt appears.",
    rewardCredits: 75
  },
  {
    id: "accept-clean-carrier",
    title: "Accept Clean Carrier",
    objective: "Open the Mission Board and accept Glass Wake 01: Clean Carrier.",
    rewardCredits: 100
  },
  {
    id: "plot-clean-carrier-route",
    title: "Set the Mirr Route",
    objective: "Set a route to Mirr Lattice from the mission card or Galaxy Map.",
    rewardCredits: 75
  },
  {
    id: "launch-for-mirr",
    title: "Launch for Mirr",
    objective: "Launch with Clean Carrier active and follow the plotted route.",
    rewardCredits: 75
  },
  {
    id: "dock-mirr-lattice",
    title: "Dock at Mirr Lattice",
    objective: "Reach Mirr Vale and dock at Mirr Lattice.",
    rewardCredits: 100
  },
  {
    id: "complete-clean-carrier",
    title: "Complete the Delivery",
    objective: "Complete Clean Carrier at Mirr Lattice to finish the first flight loop.",
    rewardCredits: 125
  }
];

const onboardingStepIds = onboardingSteps.map((step) => step.id);
const onboardingStepIdSet = new Set<OnboardingStepId>(onboardingStepIds);

export interface OnboardingProgressInput {
  onboardingState?: OnboardingState;
  screen: Screen;
  currentSystemId: string;
  currentStationId?: string;
  player: Pick<PlayerState, "position" | "velocity">;
  activeMissions: MissionDefinition[];
  completedMissionIds: string[];
  autopilot?: AutoPilotState;
  gameClock: number;
}

export interface OnboardingProgressResult {
  onboardingState?: OnboardingState;
  completedNow: OnboardingStepId[];
  rewardStepIds: OnboardingStepId[];
  finishedNow: boolean;
  changed: boolean;
}

export interface OnboardingView {
  visible: boolean;
  collapsed: boolean;
  completedCount: number;
  totalCount: number;
  activeStep?: OnboardingStepDefinition;
  completedStepIds: OnboardingStepId[];
}

export function createInitialOnboardingState(gameClock = 0): OnboardingState {
  return {
    enabled: true,
    collapsed: false,
    completedStepIds: [],
    claimedRewardStepIds: [],
    startedAtGameTime: gameClock
  };
}

export function isOnboardingStepId(value: unknown): value is OnboardingStepId {
  return typeof value === "string" && onboardingStepIdSet.has(value as OnboardingStepId);
}

export function getOnboardingStepDefinition(stepId: OnboardingStepId): OnboardingStepDefinition {
  return onboardingSteps.find((step) => step.id === stepId) ?? onboardingSteps[0];
}

export function normalizeOnboardingState(
  value: Partial<OnboardingState> | undefined,
  options: { completedMissionIds?: string[]; gameClock?: number } = {}
): OnboardingState | undefined {
  const gameClock = options.gameClock ?? 0;
  const cleanCarrierComplete = options.completedMissionIds?.includes(CLEAN_CARRIER_MISSION_ID) ?? false;
  if (!value) {
    if (!cleanCarrierComplete) return createInitialOnboardingState(gameClock);
    return {
      enabled: false,
      collapsed: true,
      completedStepIds: [...onboardingStepIds],
      claimedRewardStepIds: [...onboardingStepIds],
      startedAtGameTime: gameClock,
      completedAtGameTime: gameClock
    };
  }
  return {
    enabled: value.enabled ?? !cleanCarrierComplete,
    collapsed: value.collapsed ?? false,
    completedStepIds: uniqueStepIds(value.completedStepIds),
    claimedRewardStepIds: uniqueStepIds(value.claimedRewardStepIds),
    startedAtGameTime: finiteNumber(value.startedAtGameTime, gameClock),
    completedAtGameTime: finiteNumber(value.completedAtGameTime, undefined)
  };
}

export function resolveOnboardingProgress(input: OnboardingProgressInput): OnboardingProgressResult {
  const state = input.onboardingState;
  if (!state?.enabled) {
    return {
      onboardingState: state,
      completedNow: [],
      rewardStepIds: [],
      finishedNow: false,
      changed: false
    };
  }
  const cleanCarrierAlreadyComplete = input.completedMissionIds.includes(CLEAN_CARRIER_MISSION_ID);
  if (cleanCarrierAlreadyComplete && state.completedStepIds.length === 0 && state.claimedRewardStepIds.length === 0) {
    return {
      onboardingState: {
        ...state,
        enabled: false,
        collapsed: true,
        completedStepIds: [...onboardingStepIds],
        claimedRewardStepIds: [...onboardingStepIds],
        completedAtGameTime: state.completedAtGameTime ?? input.gameClock
      },
      completedNow: [],
      rewardStepIds: [],
      finishedNow: false,
      changed: true
    };
  }
  const derived = deriveCompletedStepIds(input);
  const completedStepIds = mergeStepIds(state.completedStepIds, derived);
  const completedNow = completedStepIds.filter((stepId) => !state.completedStepIds.includes(stepId));
  const rewardStepIds = completedNow.filter((stepId) => !state.claimedRewardStepIds.includes(stepId));
  const claimedRewardStepIds = mergeStepIds(state.claimedRewardStepIds, rewardStepIds);
  const complete = onboardingStepIds.every((stepId) => completedStepIds.includes(stepId));
  const finishedNow = complete && state.enabled;
  const next: OnboardingState = {
    ...state,
    enabled: complete ? false : state.enabled,
    collapsed: complete ? true : state.collapsed,
    completedStepIds,
    claimedRewardStepIds,
    completedAtGameTime: complete ? state.completedAtGameTime ?? input.gameClock : state.completedAtGameTime
  };
  return {
    onboardingState: next,
    completedNow,
    rewardStepIds,
    finishedNow,
    changed: completedNow.length > 0 || rewardStepIds.length > 0 || next.enabled !== state.enabled || next.collapsed !== state.collapsed || next.completedAtGameTime !== state.completedAtGameTime
  };
}

export function getOnboardingView(input: OnboardingProgressInput): OnboardingView {
  const state = input.onboardingState;
  if (!state?.enabled) {
    return {
      visible: false,
      collapsed: state?.collapsed ?? true,
      completedCount: state?.completedStepIds.length ?? 0,
      totalCount: onboardingSteps.length,
      completedStepIds: state?.completedStepIds ?? []
    };
  }
  const completedStepIds = mergeStepIds(state.completedStepIds, deriveCompletedStepIds(input));
  const activeStep = onboardingSteps.find((step) => !completedStepIds.includes(step.id));
  return {
    visible: true,
    collapsed: state.collapsed,
    completedCount: completedStepIds.length,
    totalCount: onboardingSteps.length,
    activeStep,
    completedStepIds
  };
}

function deriveCompletedStepIds(input: OnboardingProgressInput): OnboardingStepId[] {
  const completed: OnboardingStepId[] = [];
  const cleanCarrierComplete = input.completedMissionIds.includes(CLEAN_CARRIER_MISSION_ID);
  const cleanCarrierActive = input.activeMissions.some((mission) => mission.id === CLEAN_CARRIER_MISSION_ID);
  const hasCleanCarrier = cleanCarrierActive || cleanCarrierComplete;
  const dockedHelion = input.currentStationId === HELION_START_STATION_ID || hasCleanCarrier;
  const plottedMirrRoute =
    cleanCarrierComplete ||
    input.currentSystemId === MIRR_VALE_SYSTEM_ID ||
    input.currentStationId === MIRR_LATTICE_STATION_ID ||
    input.autopilot?.targetStationId === MIRR_LATTICE_STATION_ID;
  const launchedForMirr = cleanCarrierComplete || (hasCleanCarrier && input.screen === "flight" && !input.currentStationId);
  const dockedMirr = cleanCarrierComplete || input.currentStationId === MIRR_LATTICE_STATION_ID;
  const movedFromStart =
    dockedHelion ||
    hasCleanCarrier ||
    distance(input.player.position, START_POSITION) >= FIRST_FLIGHT_DISTANCE_METERS ||
    Math.hypot(...input.player.velocity) >= 16;

  if (movedFromStart) completed.push("first-flight");
  if (dockedHelion) completed.push("dock-helion");
  if (hasCleanCarrier) completed.push("accept-clean-carrier");
  if (plottedMirrRoute) completed.push("plot-clean-carrier-route");
  if (launchedForMirr) completed.push("launch-for-mirr");
  if (dockedMirr) completed.push("dock-mirr-lattice");
  if (cleanCarrierComplete) completed.push("complete-clean-carrier");
  return completed;
}

function uniqueStepIds(values: unknown): OnboardingStepId[] {
  return Array.isArray(values) ? onboardingStepIds.filter((stepId) => values.includes(stepId)) : [];
}

function mergeStepIds(existing: OnboardingStepId[], added: OnboardingStepId[]): OnboardingStepId[] {
  return onboardingStepIds.filter((stepId) => existing.includes(stepId) || added.includes(stepId));
}

function finiteNumber(value: unknown, fallback: number): number;
function finiteNumber(value: unknown, fallback: undefined): number | undefined;
function finiteNumber(value: unknown, fallback: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
