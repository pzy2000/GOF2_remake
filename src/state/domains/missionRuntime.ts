import type { MissionDefinition, PlayerState, ReputationState, RuntimeState } from "../../types/game";
import { failMission as failMissionPure, isMissionExpired } from "../../systems/missions";

export interface ExpiredMissionResult {
  player: PlayerState;
  reputation: ReputationState;
  activeMissions: MissionDefinition[];
  failedMissionIds: string[];
  expiredMissionIds: string[];
  runtime: RuntimeState;
}

export function applyExpiredMissions(snapshot: {
  player: PlayerState;
  reputation: ReputationState;
  activeMissions: MissionDefinition[];
  failedMissionIds: string[];
  runtime: RuntimeState;
  gameClock: number;
}): ExpiredMissionResult {
  let { player, reputation, runtime } = snapshot;
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
    runtime: { ...runtime, message }
  };
}
