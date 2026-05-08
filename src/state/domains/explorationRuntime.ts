import { equipmentById, stationById, planets } from "../../data/world";
import type { CommodityId, ExplorationState, FactionId, MissionDefinition, PlayerState, ReputationState } from "../../types/game";
import { explorationSignalById } from "../../systems/exploration";
import { applyExplorationChainBlueprintRewards } from "../../systems/explorationObjectives";
import { updateReputation } from "../../systems/reputation";
import { addCargoWithinCapacity, addUniqueIds } from "./runtimeFactory";

export function applyExplorationReward(snapshot: {
  signalId: string;
  player: PlayerState;
  reputation: ReputationState;
  explorationState: ExplorationState;
  knownPlanetIds: string[];
  activeMissions: MissionDefinition[];
}) {
  const signal = explorationSignalById[snapshot.signalId];
  if (!signal || snapshot.explorationState.completedSignalIds.includes(signal.id)) {
    return {
      player: snapshot.player,
      reputation: snapshot.reputation,
      explorationState: snapshot.explorationState,
      knownPlanetIds: snapshot.knownPlanetIds,
      collectedCargo: 0,
      message: signal ? `${signal.title} already resolved.` : "Exploration signal lost."
    };
  }

  let player = snapshot.player;
  let reputation = snapshot.reputation;
  let collectedCargo = 0;
  if (signal.rewards.credits) player = { ...player, credits: player.credits + signal.rewards.credits };
  for (const [commodityId, amount] of Object.entries(signal.rewards.cargo ?? {})) {
    const result = addCargoWithinCapacity(player, commodityId as CommodityId, amount ?? 0, snapshot.activeMissions);
    player = result.player;
    collectedCargo += result.collected;
  }
  for (const [factionId, delta] of Object.entries(signal.rewards.reputation ?? {})) {
    reputation = updateReputation(reputation, factionId as FactionId, delta ?? 0);
  }

  const explorationState: ExplorationState = {
    discoveredSignalIds: addUniqueIds(snapshot.explorationState.discoveredSignalIds, [signal.id]),
    completedSignalIds: addUniqueIds(snapshot.explorationState.completedSignalIds, [signal.id]),
    revealedStationIds: signal.revealStationId
      ? addUniqueIds(snapshot.explorationState.revealedStationIds, [signal.revealStationId])
      : snapshot.explorationState.revealedStationIds,
    eventLogIds: addUniqueIds(snapshot.explorationState.eventLogIds, [signal.id])
  };
  const blueprintRewards = applyExplorationChainBlueprintRewards(player, explorationState);
  player = blueprintRewards.player;
  const knownPlanetIds = signal.revealPlanetIds?.length
    ? planets.filter((planet) => new Set([...snapshot.knownPlanetIds, ...(signal.revealPlanetIds ?? [])]).has(planet.id)).map((planet) => planet.id)
    : snapshot.knownPlanetIds;
  const rewardParts = [
    signal.rewards.credits ? `+${signal.rewards.credits} credits` : "",
    collectedCargo > 0 ? `+${collectedCargo} cargo` : "",
    ...blueprintRewards.unlockedBlueprintIds.map((equipmentId) => `${equipmentById[equipmentId]?.name ?? equipmentId} blueprint unlocked`),
    signal.revealStationId ? `${stationById[signal.revealStationId]?.name ?? signal.revealStationId} revealed` : ""
  ].filter(Boolean);
  return {
    player,
    reputation,
    explorationState,
    knownPlanetIds,
    collectedCargo,
    message: `${signal.title} resolved.${rewardParts.length ? ` ${rewardParts.join(" · ")}.` : ""}`
  };
}
