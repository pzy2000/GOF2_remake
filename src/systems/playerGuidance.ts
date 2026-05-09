import { glassWakeProtocol, missionTemplates, shipById, ships, stationById, systemById } from "../data/world";
import type {
  AutoPilotState,
  CommodityId,
  ExplorationState,
  FactionHeatState,
  MarketState,
  MissionDefinition,
  OnboardingState,
  PlayerState,
  ReputationState,
  Screen,
  StationTab
} from "../types/game";
import { canCompleteMission, getAvailableMissionsForSystem } from "./missions";
import { getOnboardingView } from "./onboarding";
import { getExplorationChainSummaries, getExplorationObjectiveSummaryForSystem } from "./explorationObjectives";
import { getAvailableEconomyDispatchMissions, getDispatchMissionSourceStationId, isEconomyDispatchMissionId } from "./marketMissions";
import { getShipPurchaseAccess } from "./factionServices";
import { createInitialFactionHeat } from "./factionConsequences";
import { createInitialReputation } from "./reputation";
import { getStoryObjectiveSummary } from "./story";

export type GuidanceCategory = "first-flight" | "story" | "economy" | "exploration" | "blueprint" | "shipyard";

export interface GuidanceRecommendation {
  category: GuidanceCategory;
  title: string;
  objectiveText: string;
  targetSystemId?: string;
  targetStationId?: string;
  stationTab: StationTab;
  actionLabel: string;
  priorityReason: string;
}

export interface GuidanceInput {
  screen: Screen;
  currentSystemId: string;
  currentStationId?: string;
  player: PlayerState;
  activeMissions: MissionDefinition[];
  completedMissionIds: string[];
  failedMissionIds: string[];
  marketState: MarketState;
  knownSystems: string[];
  knownPlanetIds: string[];
  explorationState: ExplorationState;
  onboardingState?: OnboardingState;
  autopilot?: AutoPilotState;
  gameClock: number;
  activeScanSignalId?: string;
  destroyedPirates?: number;
  reputation?: ReputationState;
  factionHeat?: FactionHeatState;
}

export function getNextGuidanceRecommendation(input: GuidanceInput): GuidanceRecommendation | undefined {
  const onboardingView = getOnboardingView({
    onboardingState: input.onboardingState,
    screen: input.screen,
    currentSystemId: input.currentSystemId,
    currentStationId: input.currentStationId,
    player: input.player,
    activeMissions: input.activeMissions,
    completedMissionIds: input.completedMissionIds,
    autopilot: input.autopilot,
    gameClock: input.gameClock
  });
  if (onboardingView.visible && onboardingView.activeStep) {
    return {
      category: "first-flight",
      title: onboardingView.activeStep.title,
      objectiveText: onboardingView.activeStep.objective,
      targetSystemId: input.currentSystemId,
      targetStationId: input.currentStationId,
      stationTab: onboardingView.activeStep.id === "plot-clean-carrier-route" ? "Galaxy Map" : "Mission Board",
      actionLabel: onboardingView.activeStep.id === "plot-clean-carrier-route" ? "Open Map" : "Open Board",
      priorityReason: "First Flight checklist is still active."
    };
  }

  const story = storyRecommendation(input);
  if (story) return story;

  const activeDispatch = activeDispatchRecommendation(input);
  if (activeDispatch) return activeDispatch;

  const exploration = explorationRecommendation(input);
  if (exploration) return exploration;

  const blueprint = blueprintRecommendation(input);
  if (blueprint) return blueprint;

  const shipyard = shipyardRecommendation(input);
  if (shipyard) return shipyard;

  return availableEconomyRecommendation(input);
}

function storyRecommendation(input: GuidanceInput): GuidanceRecommendation | undefined {
  const storyObjective = getStoryObjectiveSummaryForGuidance(input);
  if (storyObjective.status === "complete") return undefined;
  const mission = storyObjective.missionId ? missionTemplates.find((candidate) => candidate.id === storyObjective.missionId) : undefined;
  const completeAtCurrentStation = mission
    ? canCompleteMission(mission, input.player, input.currentSystemId, input.currentStationId ?? "", input.destroyedPirates ?? 0, input.gameClock)
    : false;
  const accepting = storyObjective.focus === "accept" || storyObjective.focus === "retry";
  const targetStationId = accepting
    ? mission?.sourceStationId ?? mission?.destinationStationId ?? storyObjective.targetStationId
    : storyObjective.targetStationId ?? mission?.destinationStationId;
  const stationTab: StationTab = completeAtCurrentStation
    ? "Mission Board"
    : targetStationId && targetStationId !== input.currentStationId
      ? "Galaxy Map"
      : accepting
        ? "Mission Board"
        : "Captain's Log";
  return {
    category: "story",
    title: `${storyObjective.chapterLabel} · ${storyObjective.title}`,
    objectiveText: storyObjective.objectiveText,
    targetSystemId: storyObjective.targetSystemId ?? mission?.originSystemId ?? mission?.destinationSystemId,
    targetStationId,
    stationTab,
    actionLabel: stationTab === "Galaxy Map" ? "Open Map" : stationTab === "Mission Board" ? "Open Board" : "Open Log",
    priorityReason: completeAtCurrentStation
      ? "Main story can be completed here."
      : accepting
        ? "Main story has the next chapter ready."
        : "Main story is currently active."
  };
}

function activeDispatchRecommendation(input: GuidanceInput): GuidanceRecommendation | undefined {
  const mission = input.activeMissions.find((candidate) => isEconomyDispatchMissionId(candidate.id));
  if (!mission) return undefined;
  const sourceStationId = getDispatchMissionSourceStationId(mission);
  const cargoReady = Object.entries(mission.cargoRequired ?? {}).every(([commodityId, amount]) => (input.player.cargo[commodityId as CommodityId] ?? 0) >= (amount ?? 0));
  const routeStationId = cargoReady ? mission.destinationStationId : sourceStationId ?? mission.destinationStationId;
  return {
    category: "economy",
    title: mission.title,
    objectiveText: cargoReady
      ? `Deliver dispatch cargo to ${stationById[mission.destinationStationId]?.name ?? mission.destinationStationId}.`
      : `Source dispatch cargo from ${routeStationId ? stationById[routeStationId]?.name ?? routeStationId : "the listed station"}.`,
    targetSystemId: stationById[routeStationId]?.systemId ?? mission.destinationSystemId,
    targetStationId: routeStationId,
    stationTab: routeStationId && routeStationId !== input.currentStationId ? "Galaxy Map" : "Economy",
    actionLabel: routeStationId && routeStationId !== input.currentStationId ? "Open Map" : "Open Economy",
    priorityReason: "An accepted economy dispatch is waiting on cargo or delivery."
  };
}

function explorationRecommendation(input: GuidanceInput): GuidanceRecommendation | undefined {
  const summary = getExplorationObjectiveSummaryForSystem(input.currentSystemId, input.explorationState, {
    playerPosition: input.player.position,
    playerEquipment: input.player.equipment,
    activeScanSignalId: input.activeScanSignalId,
    playerUnlockedBlueprintIds: input.player.unlockedBlueprintIds
  });
  if (!summary || summary.status === "complete" || summary.status === "equipment-locked" || summary.status === "locked") return undefined;
  return {
    category: "exploration",
    title: summary.chainTitle,
    objectiveText: summary.objectiveText,
    targetSystemId: summary.systemId,
    stationTab: "Lounge",
    actionLabel: "Open Lounge",
    priorityReason: "A Quiet Signal in the current system can be advanced."
  };
}

function blueprintRecommendation(input: GuidanceInput): GuidanceRecommendation | undefined {
  const locked = getExplorationChainSummaries(input.explorationState, {
    playerEquipment: input.player.equipment,
    playerUnlockedBlueprintIds: input.player.unlockedBlueprintIds
  }).find((summary) => summary.systemId === input.currentSystemId && summary.status === "equipment-locked");
  if (!locked) return undefined;
  return {
    category: "blueprint",
    title: "Blueprint Workshop",
    objectiveText: `${locked.nextTitle} requires ${locked.requiredEquipmentLabel ?? "upgraded scanning equipment"}. Research or craft the scanner path before returning.`,
    targetSystemId: input.currentSystemId,
    targetStationId: input.currentStationId,
    stationTab: "Blueprint Workshop",
    actionLabel: "Open Workshop",
    priorityReason: "Quiet Signals are blocked by equipment."
  };
}

function shipyardRecommendation(input: GuidanceInput): GuidanceRecommendation | undefined {
  if (!input.currentStationId) return undefined;
  const station = stationById[input.currentStationId];
  if (!station) return undefined;
  const currentScore = shipScore(shipById[input.player.shipId]);
  const owned = new Set(input.player.ownedShips);
  const reputation = input.reputation ?? createInitialReputation();
  const factionHeat = input.factionHeat ?? createInitialFactionHeat();
  const candidate = ships
    .filter((ship) => ship.price > 0 && ship.price <= input.player.credits && !owned.has(ship.id) && shipScore(ship) > currentScore)
    .filter((ship) => getShipPurchaseAccess({ station, ship, reputation, factionHeat, now: input.gameClock, player: input.player }).ok)
    .sort((a, b) => b.price - a.price || shipScore(b) - shipScore(a))[0];
  if (!candidate) return undefined;
  return {
    category: "shipyard",
    title: candidate.name,
    objectiveText: `${station.name} can sell a clear hull upgrade for your current credits.`,
    targetSystemId: station.systemId,
    targetStationId: station.id,
    stationTab: "Shipyard",
    actionLabel: "Open Shipyard",
    priorityReason: "A legal and affordable ship upgrade is available here."
  };
}

function availableEconomyRecommendation(input: GuidanceInput): GuidanceRecommendation | undefined {
  const mission = getAvailableEconomyDispatchMissions({
    marketState: input.marketState,
    systemId: input.currentSystemId,
    activeMissions: input.activeMissions,
    knownSystemIds: input.knownSystems,
    knownPlanetIds: input.knownPlanetIds,
    explorationState: input.explorationState,
    limit: 1
  })[0] ?? getAvailableMissionsForSystem(missionTemplates, input.currentSystemId, input.activeMissions, input.completedMissionIds, input.failedMissionIds)
    .filter((candidate) => !candidate.storyArcId)[0];
  if (!mission) return undefined;
  return {
    category: "economy",
    title: mission.title,
    objectiveText: mission.description,
    targetSystemId: mission.originSystemId,
    targetStationId: mission.sourceStationId ?? mission.destinationStationId,
    stationTab: "Economy",
    actionLabel: "Open Economy",
    priorityReason: "A local economy route is available."
  };
}

function getStoryObjectiveSummaryForGuidance(input: GuidanceInput) {
  return getStoryObjectiveSummary({
    arc: glassWakeProtocol,
    missions: missionTemplates,
    activeMissions: input.activeMissions,
    completedMissionIds: input.completedMissionIds,
    failedMissionIds: input.failedMissionIds,
    currentSystemId: input.currentSystemId,
    currentStationId: input.currentStationId,
    playerPosition: input.player.position,
    playerCargo: input.player.cargo,
    getStationName: (stationId) => stationById[stationId]?.name ?? stationId,
    getSystemName: (systemId) => systemById[systemId]?.name ?? systemId
  });
}

function shipScore(ship: (typeof ships)[number] | undefined): number {
  if (!ship) return 0;
  return ship.stats.hull * 0.8
    + ship.stats.shield
    + ship.stats.energy * 0.65
    + ship.stats.cargoCapacity * 4
    + ship.stats.speed * 0.35
    + (ship.stats.primarySlots + ship.stats.secondarySlots) * 80
    + (ship.stats.utilitySlots + ship.stats.defenseSlots + ship.stats.engineeringSlots) * 45;
}
