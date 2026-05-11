import type { MarketState, MissionDefinition, PlayerState, ReputationState, RuntimeState } from "../../types/game";
import { failMission as failMissionPure, isMissionExpired } from "../../systems/missions";
import { applyEconomyDispatchMissionFailure, isEconomyDispatchMissionId } from "../../systems/marketMissions";

export interface ExpiredMissionResult {
  player: PlayerState;
  reputation: ReputationState;
  activeMissions: MissionDefinition[];
  failedMissionIds: string[];
  expiredMissionIds: string[];
  marketState?: MarketState;
  runtime: RuntimeState;
}

export function applyExpiredMissions(snapshot: {
  player: PlayerState;
  reputation: ReputationState;
  activeMissions: MissionDefinition[];
  failedMissionIds: string[];
  runtime: RuntimeState;
  gameClock: number;
  marketState?: MarketState;
}): ExpiredMissionResult {
  let { player, reputation, runtime } = snapshot;
  let marketState = snapshot.marketState;
  const failedMissionIds = [...snapshot.failedMissionIds];
  const expiredMissionIds: string[] = [];
  const activeMissions: MissionDefinition[] = [];
  let message = runtime.message;
  for (const mission of snapshot.activeMissions) {
    if (isMissionExpired(mission, snapshot.gameClock)) {
      const result = failMissionPure(mission, player, reputation, "Deadline expired");
      player = result.player;
      reputation = result.reputation;
      failedMissionIds.push(mission.id);
      expiredMissionIds.push(mission.id);
      if (marketState && isEconomyDispatchMissionId(mission.id)) {
        marketState = applyEconomyDispatchMissionFailure(marketState, mission);
      }
      message = `${mission.title} failed: deadline expired.`;
      runtime = {
        ...runtime,
        convoys: runtime.convoys.filter((convoy) => convoy.missionId !== mission.id),
        salvage: runtime.salvage.filter((salvage) => salvage.missionId !== mission.id)
      };
    } else {
      activeMissions.push(mission);
    }
  }
  return {
    player,
    reputation,
    activeMissions,
    failedMissionIds: Array.from(new Set(failedMissionIds)),
    expiredMissionIds,
    marketState,
    runtime: { ...runtime, message }
  };
}
