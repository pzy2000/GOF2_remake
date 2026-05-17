import type { MissionDefinition } from "../types/game";

function stableIds(ids: string[] | undefined): string[] {
  return Array.from(new Set(ids ?? [])).sort();
}

export function getCoopMissionProgressKey(mission: MissionDefinition): string {
  return JSON.stringify({
    id: mission.id,
    accepted: mission.accepted === true,
    completed: mission.completed === true,
    failed: mission.failed === true,
    failureReason: mission.failureReason,
    storyTargetDestroyedIds: stableIds(mission.storyTargetDestroyedIds),
    storyEchoLockedTargetIds: stableIds(mission.storyEchoLockedTargetIds),
    salvageRecovered: mission.salvage?.recovered === true,
    escortArrived: mission.escort?.arrived === true
  });
}

export function hasCoopMissionProgressChanged(current: MissionDefinition, next: MissionDefinition): boolean {
  return getCoopMissionProgressKey(current) !== getCoopMissionProgressKey(next);
}
