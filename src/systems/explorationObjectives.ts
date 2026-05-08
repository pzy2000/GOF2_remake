import { equipmentById, explorationSignals, stationById, systemById } from "../data/world";
import type { EquipmentId, ExplorationSignalDefinition, ExplorationState, PlayerState, Vec3 } from "../types/game";
import { hasRequiredSignalEquipment, isExplorationSignalDiscovered, isExplorationSignalUnlocked, requiredSignalEquipmentLabel } from "./exploration";
import { distance } from "./math";

export type ExplorationObjectiveStatus = "locked" | "equipment-locked" | "available" | "discovered" | "scanning" | "complete";

export interface ExplorationObjectiveSummary {
  systemId: string;
  chainId: string;
  chainTitle: string;
  status: ExplorationObjectiveStatus;
  nextSignalId?: string;
  nextTitle: string;
  objectiveText: string;
  distanceMeters?: number;
  completedCount: number;
  totalCount: number;
  revealedStationIds: string[];
  unlockedBlueprintIds: EquipmentId[];
  requiredEquipmentLabel?: string;
}

export interface ExplorationChainSummary extends ExplorationObjectiveSummary {
  id: string;
  title: string;
  systemName: string;
  signals: ExplorationSignalDefinition[];
  completed: ExplorationSignalDefinition[];
  next?: ExplorationSignalDefinition;
  rewardBlueprintId?: EquipmentId;
  rewardUnlocked: boolean;
}

interface ExplorationObjectiveOptions {
  playerPosition?: Vec3;
  playerEquipment?: EquipmentId[];
  activeScanSignalId?: string;
  playerUnlockedBlueprintIds?: EquipmentId[];
}

export const EXPLORATION_CHAIN_BLUEPRINT_REWARDS: Record<string, EquipmentId> = {
  "helion-sundog-chain": "survey-array",
  "kuro-foundry-chain": "repair-drone",
  "vantara-iff-chain": "shield-matrix",
  "mirr-parallax-chain": "targeting-computer",
  "ashen-dead-letter-chain": "torpedo-rack",
  "celest-crownside-chain": "quantum-reactor",
  "ptd-keel-chain": "plasma-cannon"
};

export const DEEP_EXPLORATION_REWARD_BLUEPRINT_ID: EquipmentId = "relic-cartographer";
const CHAIN_REWARD_STAGE = 2;

function signalChainId(signal: ExplorationSignalDefinition): string {
  return signal.chainId ?? signal.id;
}

function orderedSignals(signals: ExplorationSignalDefinition[]): ExplorationSignalDefinition[] {
  return [...signals].sort((a, b) => (a.stage ?? 1) - (b.stage ?? 1) || a.title.localeCompare(b.title));
}

function explorationChains(): Array<{ id: string; signals: ExplorationSignalDefinition[] }> {
  const chains = new Map<string, ExplorationSignalDefinition[]>();
  for (const signal of explorationSignals) {
    const chainId = signalChainId(signal);
    chains.set(chainId, [...(chains.get(chainId) ?? []), signal]);
  }
  return Array.from(chains.entries()).map(([id, signals]) => ({ id, signals: orderedSignals(signals) }));
}

function chainForSignal(signalId: string): { id: string; signals: ExplorationSignalDefinition[] } | undefined {
  const signal = explorationSignals.find((candidate) => candidate.id === signalId);
  if (!signal) return undefined;
  const chainId = signalChainId(signal);
  return explorationChains().find((chain) => chain.id === chainId);
}

function completedSignals(signals: ExplorationSignalDefinition[], explorationState: ExplorationState): ExplorationSignalDefinition[] {
  return signals.filter((signal) => explorationState.completedSignalIds.includes(signal.id));
}

function isChainComplete(signals: ExplorationSignalDefinition[], explorationState: ExplorationState): boolean {
  return signals.every((signal) => explorationState.completedSignalIds.includes(signal.id));
}

function isChainRewardMilestoneComplete(signals: ExplorationSignalDefinition[], explorationState: ExplorationState): boolean {
  return signals
    .filter((signal) => (signal.stage ?? 1) <= CHAIN_REWARD_STAGE)
    .every((signal) => explorationState.completedSignalIds.includes(signal.id));
}

function deepSignals(): ExplorationSignalDefinition[] {
  return explorationSignals.filter((signal) => (signal.stage ?? 1) >= 3 && (signal.requiredEquipmentAny ?? []).length > 0);
}

function isDeepExplorationComplete(explorationState: ExplorationState): boolean {
  const signals = deepSignals();
  return signals.length > 0 && signals.every((signal) => explorationState.completedSignalIds.includes(signal.id));
}

function revealedStationsFor(signals: ExplorationSignalDefinition[], explorationState: ExplorationState): string[] {
  return signals
    .filter((signal) => signal.revealStationId && explorationState.completedSignalIds.includes(signal.id))
    .map((signal) => signal.revealStationId!)
    .filter((stationId, index, all) => all.indexOf(stationId) === index);
}

function rewardBlueprintsForChain(chainId: string, signals: ExplorationSignalDefinition[], explorationState: ExplorationState): EquipmentId[] {
  const reward = EXPLORATION_CHAIN_BLUEPRINT_REWARDS[chainId];
  return reward && isChainRewardMilestoneComplete(signals, explorationState) ? [reward] : [];
}

function objectiveTextFor(status: ExplorationObjectiveStatus, chainTitle: string, nextTitle: string, rewardBlueprintIds: EquipmentId[], systemId: string, requiredEquipment?: string): string {
  const systemName = systemById[systemId]?.name ?? systemId;
  if (status === "complete") {
    const rewards = rewardBlueprintIds.map((id) => `${equipmentById[id]?.name ?? id} blueprint unlocked`).join(" · ");
    return rewards ? `Chain complete: ${chainTitle}. ${rewards}.` : `Chain complete: ${chainTitle}.`;
  }
  if (status === "locked") return `Complete the prior Quiet Signal stage to resolve ${nextTitle}.`;
  if (status === "equipment-locked") return `${nextTitle} requires ${requiredEquipment || "an upgraded scanner"}.`;
  if (status === "scanning") return `Scanning ${nextTitle}: tune frequency to finish the trace.`;
  if (status === "discovered") return `Return to ${nextTitle} and complete the scan.`;
  return `Locate ${nextTitle} in ${systemName}.`;
}

function buildChainSummary(
  chainId: string,
  signals: ExplorationSignalDefinition[],
  explorationState: ExplorationState,
  options: ExplorationObjectiveOptions = {}
): ExplorationChainSummary {
  const completed = completedSignals(signals, explorationState);
  const next = signals.find((signal) => !explorationState.completedSignalIds.includes(signal.id) && isExplorationSignalUnlocked(signal, explorationState));
  const firstIncomplete = signals.find((signal) => !explorationState.completedSignalIds.includes(signal.id));
  const activeSignal = next ?? firstIncomplete ?? signals[signals.length - 1];
  const complete = completed.length === signals.length;
  const discovered = activeSignal ? isExplorationSignalDiscovered(activeSignal.id, explorationState) : false;
  const equipmentReady = activeSignal ? hasRequiredSignalEquipment(activeSignal, options.playerEquipment) : true;
  const requiredEquipment = activeSignal ? requiredSignalEquipmentLabel(activeSignal) : undefined;
  const status: ExplorationObjectiveStatus = complete
    ? "complete"
    : !activeSignal || !isExplorationSignalUnlocked(activeSignal, explorationState)
      ? "locked"
      : !equipmentReady
        ? "equipment-locked"
        : options.activeScanSignalId === activeSignal.id
          ? "scanning"
          : discovered
            ? "discovered"
            : "available";
  const title = signals[0]?.chainTitle ?? signals[0]?.title ?? chainId;
  const systemId = signals[0]?.systemId ?? "";
  const rewardBlueprintIds = rewardBlueprintsForChain(chainId, signals, explorationState);
  const nextTitle = activeSignal
    ? status === "available" || (status === "equipment-locked" && !discovered)
      ? activeSignal.maskedTitle
      : activeSignal.title
    : title;
  const distanceMeters = activeSignal && options.playerPosition
    ? distance(options.playerPosition, activeSignal.position)
    : undefined;
  const rewardBlueprintId = EXPLORATION_CHAIN_BLUEPRINT_REWARDS[chainId];
  const unlocked = new Set(options.playerUnlockedBlueprintIds ?? []);
  return {
    id: chainId,
    systemId,
    systemName: systemById[systemId]?.name ?? systemId,
    chainId,
    chainTitle: title,
    title,
    status,
    nextSignalId: activeSignal?.id,
    nextTitle,
    objectiveText: objectiveTextFor(status, title, nextTitle, rewardBlueprintIds, systemId, requiredEquipment),
    distanceMeters,
    completedCount: completed.length,
    totalCount: signals.length,
    revealedStationIds: revealedStationsFor(signals, explorationState),
    unlockedBlueprintIds: rewardBlueprintIds,
    requiredEquipmentLabel: requiredEquipment,
    rewardBlueprintId,
    rewardUnlocked: !!rewardBlueprintId && (unlocked.has(rewardBlueprintId) || rewardBlueprintIds.includes(rewardBlueprintId)),
    signals,
    completed,
    next
  };
}

export function getExplorationChainSummaries(
  explorationState: ExplorationState,
  options: ExplorationObjectiveOptions = {}
): ExplorationChainSummary[] {
  return explorationChains()
    .map((chain) => buildChainSummary(chain.id, chain.signals, explorationState, options))
    .sort((a, b) => a.systemName.localeCompare(b.systemName) || a.title.localeCompare(b.title));
}

export function getExplorationObjectiveSummaryForSystem(
  systemId: string,
  explorationState: ExplorationState,
  options: ExplorationObjectiveOptions = {}
): ExplorationObjectiveSummary | undefined {
  const summaries = getExplorationChainSummaries(explorationState, options).filter((chain) => chain.systemId === systemId);
  return summaries.find((chain) => chain.status !== "complete") ?? summaries[0];
}

export function getExplorationObjectiveSummaryForSignal(
  signalId: string,
  explorationState: ExplorationState,
  options: ExplorationObjectiveOptions = {}
): ExplorationObjectiveSummary | undefined {
  const chain = chainForSignal(signalId);
  if (!chain) return undefined;
  const summary = buildChainSummary(chain.id, chain.signals, explorationState, options);
  const signal = chain.signals.find((candidate) => candidate.id === signalId);
  if (!signal) return summary;
  if (explorationState.completedSignalIds.includes(signal.id)) {
    return {
      ...summary,
      status: "complete",
      nextSignalId: signal.id,
      nextTitle: signal.title
    };
  }
  if (!isExplorationSignalUnlocked(signal, explorationState)) {
    return {
      ...summary,
      status: "locked",
      nextSignalId: signal.id,
      nextTitle: signal.title,
      objectiveText: objectiveTextFor("locked", summary.chainTitle, signal.title, [], signal.systemId),
      distanceMeters: options.playerPosition ? distance(options.playerPosition, signal.position) : undefined
    };
  }
  const equipmentReady = hasRequiredSignalEquipment(signal, options.playerEquipment);
  const requiredEquipment = requiredSignalEquipmentLabel(signal);
  const discovered = isExplorationSignalDiscovered(signal.id, explorationState);
  const status: ExplorationObjectiveStatus = !equipmentReady ? "equipment-locked" : options.activeScanSignalId === signal.id ? "scanning" : discovered ? "discovered" : "available";
  const nextTitle = status === "available" || (status === "equipment-locked" && !discovered) ? signal.maskedTitle : signal.title;
  return {
    ...summary,
    status,
    nextSignalId: signal.id,
    nextTitle,
    objectiveText: objectiveTextFor(status, summary.chainTitle, nextTitle, [], signal.systemId, requiredEquipment),
    requiredEquipmentLabel: requiredEquipment,
    distanceMeters: options.playerPosition ? distance(options.playerPosition, signal.position) : undefined
  };
}

export function getCompletedExplorationChainRewardBlueprintIds(explorationState: ExplorationState): EquipmentId[] {
  const chainRewards = getExplorationChainSummaries(explorationState).flatMap((summary) => summary.unlockedBlueprintIds);
  const deepRewards = isDeepExplorationComplete(explorationState) ? [DEEP_EXPLORATION_REWARD_BLUEPRINT_ID] : [];
  return Array.from(new Set([...chainRewards, ...deepRewards]));
}

export function getMissingExplorationChainRewardBlueprintIds(explorationState: ExplorationState, unlockedBlueprintIds: EquipmentId[] = []): EquipmentId[] {
  const unlocked = new Set(unlockedBlueprintIds);
  return getCompletedExplorationChainRewardBlueprintIds(explorationState).filter((id) => !unlocked.has(id));
}

export function applyExplorationChainBlueprintRewards(
  player: PlayerState,
  explorationState: ExplorationState
): { player: PlayerState; unlockedBlueprintIds: EquipmentId[] } {
  const current = player.unlockedBlueprintIds ?? [];
  const unlockedBlueprintIds = getMissingExplorationChainRewardBlueprintIds(explorationState, current);
  if (!unlockedBlueprintIds.length) return { player, unlockedBlueprintIds };
  return {
    player: {
      ...player,
      unlockedBlueprintIds: [...current, ...unlockedBlueprintIds]
    },
    unlockedBlueprintIds
  };
}

export function explorationRewardStationNames(summary: Pick<ExplorationObjectiveSummary, "revealedStationIds">): string[] {
  return summary.revealedStationIds.map((stationId) => stationById[stationId]?.name ?? stationId);
}
