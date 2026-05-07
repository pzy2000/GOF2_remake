import type { StoryArcDefinition, StoryChapterDefinition } from "../data/story";
import type { CargoHold, CommodityId, MissionDefinition, Vec3 } from "../types/game";
import { areMissionPrerequisitesMet, getStoryEncounterRemainingTargets } from "./missions";
import { distance } from "./math";

export type StoryChapterStatus = "locked" | "available" | "active" | "failed retry" | "complete";

export interface StoryChapterProgress {
  chapter: StoryChapterDefinition;
  mission?: MissionDefinition;
  status: StoryChapterStatus;
}

export interface StoryProgress {
  completedCount: number;
  totalCount: number;
  chapters: StoryChapterProgress[];
  current?: StoryChapterProgress;
}

export type StoryObjectiveStatus = "available" | "active" | "failed-retry" | "complete";

export type StoryObjectiveFocus =
  | "accept"
  | "travel"
  | "clear-targets"
  | "recover-salvage"
  | "escort"
  | "deliver"
  | "retry"
  | "complete";

export interface StoryObjectiveSummary {
  status: StoryObjectiveStatus;
  chapterLabel: string;
  chapterOrder?: number;
  missionId?: string;
  title: string;
  objectiveText: string;
  targetSystemId?: string;
  targetStationId?: string;
  targetPosition?: Vec3;
  targetPositionSystemId?: string;
  visualCueLabel?: string;
  focus: StoryObjectiveFocus;
  remainingTargetNames: string[];
  distanceMeters?: number;
}

export interface StoryObjectiveInput {
  arc: StoryArcDefinition;
  missions: MissionDefinition[];
  activeMissions: MissionDefinition[];
  completedMissionIds: string[];
  failedMissionIds: string[];
  currentSystemId?: string;
  currentStationId?: string;
  playerPosition?: Vec3;
  playerCargo?: CargoHold;
  getStationName?: (stationId: string) => string;
  getSystemName?: (systemId: string) => string;
  getCommodityName?: (commodityId: CommodityId) => string;
}

export function getStoryProgress(
  arc: StoryArcDefinition,
  missions: MissionDefinition[],
  activeMissions: MissionDefinition[],
  completedMissionIds: string[],
  failedMissionIds: string[]
): StoryProgress {
  const missionById = new Map(missions.map((mission) => [mission.id, mission]));
  const activeMissionIds = new Set(activeMissions.map((mission) => mission.id));
  const chapters = arc.chapters.map((chapter) => {
    const mission = missionById.get(chapter.missionId);
    let status: StoryChapterStatus = "locked";
    if (mission && completedMissionIds.includes(mission.id)) {
      status = "complete";
    } else if (mission && activeMissionIds.has(mission.id)) {
      status = "active";
    } else if (mission && failedMissionIds.includes(mission.id) && mission.retryOnFailure && areMissionPrerequisitesMet(mission, completedMissionIds)) {
      status = "failed retry";
    } else if (mission && areMissionPrerequisitesMet(mission, completedMissionIds)) {
      status = "available";
    }
    return { chapter, mission, status };
  });
  return {
    completedCount: chapters.filter((chapter) => chapter.status === "complete").length,
    totalCount: chapters.length,
    chapters,
    current: chapters.find((chapter) => chapter.status !== "complete")
  };
}

export function storyStatusLabel(status: StoryChapterStatus): string {
  if (status === "failed retry") return "Failed - retry available";
  return status[0].toUpperCase() + status.slice(1);
}

export function getStoryObjectiveSummary({
  arc,
  missions,
  activeMissions,
  completedMissionIds,
  failedMissionIds,
  currentSystemId,
  currentStationId,
  playerPosition,
  playerCargo = {},
  getStationName = (stationId) => stationId,
  getSystemName = (systemId) => systemId,
  getCommodityName = (commodityId) => commodityId
}: StoryObjectiveInput): StoryObjectiveSummary {
  const progress = getStoryProgress(arc, missions, activeMissions, completedMissionIds, failedMissionIds);
  const current = progress.current;
  if (!current) {
    return {
      status: "complete",
      chapterLabel: arc.title,
      title: arc.title,
      objectiveText: arc.epilogue,
      focus: "complete",
      remainingTargetNames: []
    };
  }

  const templateMission = current.mission;
  const activeMission = templateMission ? activeMissions.find((mission) => mission.id === templateMission.id) : undefined;
  const mission = activeMission ?? templateMission;
  const chapterLabel = `${arc.title.split(" ")[0]} Wake ${current.chapter.order.toString().padStart(2, "0")}`;
  if (!mission) {
    return {
      status: "available",
      chapterLabel,
      chapterOrder: current.chapter.order,
      title: current.chapter.title,
      objectiveText: "Signal source missing from mission registry.",
      focus: "accept",
      remainingTargetNames: []
    };
  }

  if (current.status === "failed retry") {
    return withDistance({
      status: "failed-retry",
      chapterLabel,
      chapterOrder: current.chapter.order,
      missionId: mission.id,
      title: mission.title,
      objectiveText: `Return to ${getSystemName(mission.originSystemId)} and retry ${mission.title}.`,
      targetSystemId: mission.originSystemId,
      focus: "retry",
      remainingTargetNames: []
    }, playerPosition);
  }

  if (current.status !== "active" || !activeMission) {
    return {
      status: "available",
      chapterLabel,
      chapterOrder: current.chapter.order,
      missionId: mission.id,
      title: mission.title,
      objectiveText: current.status === "locked"
        ? "Complete prior protocol entries to resolve the next trace."
        : `Accept ${mission.title} from the ${getSystemName(mission.originSystemId)} Mission Board.`,
      targetSystemId: mission.originSystemId,
      focus: "accept",
      remainingTargetNames: []
    };
  }

  const destinationName = getStationName(activeMission.destinationStationId);
  const remainingTargets = getStoryEncounterRemainingTargets(activeMission);
  if (remainingTargets.length > 0) {
    const focusTarget = remainingTargets[0];
    return withDistance({
      status: "active",
      chapterLabel,
      chapterOrder: current.chapter.order,
      missionId: activeMission.id,
      title: activeMission.title,
      objectiveText: `Clear ${remainingTargets.map((target) => target.name).join(", ")}; then report to ${destinationName}.`,
      targetSystemId: focusTarget.systemId,
      targetStationId: activeMission.destinationStationId,
      targetPosition: [...focusTarget.position],
      focus: "clear-targets",
      remainingTargetNames: remainingTargets.map((target) => target.name)
    }, playerPosition);
  }

  if (activeMission.salvage && !activeMission.salvage.recovered) {
    return withDistance({
      status: "active",
      chapterLabel,
      chapterOrder: current.chapter.order,
      missionId: activeMission.id,
      title: activeMission.title,
      objectiveText: `Recover ${activeMission.salvage.name}; then report to ${destinationName}.`,
      targetSystemId: activeMission.salvage.systemId,
      targetStationId: activeMission.destinationStationId,
      targetPosition: [...activeMission.salvage.position],
      focus: "recover-salvage",
      remainingTargetNames: []
    }, playerPosition);
  }

  if (activeMission.escort && !activeMission.escort.arrived) {
    return withDistance({
      status: "active",
      chapterLabel,
      chapterOrder: current.chapter.order,
      missionId: activeMission.id,
      title: activeMission.title,
      objectiveText: `Escort ${activeMission.escort.convoyName} to ${destinationName}.`,
      targetSystemId: activeMission.destinationSystemId,
      targetStationId: activeMission.destinationStationId,
      targetPosition: [...activeMission.escort.destinationPosition],
      focus: "escort",
      remainingTargetNames: []
    }, playerPosition);
  }

  if (activeMission.targetCommodityId && activeMission.targetAmount) {
    const held = playerCargo[activeMission.targetCommodityId] ?? 0;
    if (held < activeMission.targetAmount) {
      const commodityName = getCommodityName(activeMission.targetCommodityId);
      return {
        status: "active",
        chapterLabel,
        chapterOrder: current.chapter.order,
        missionId: activeMission.id,
        title: activeMission.title,
        objectiveText: `Mine ${activeMission.targetAmount - held} ${commodityName}; then report to ${destinationName}.`,
        targetSystemId: activeMission.destinationSystemId,
        targetStationId: activeMission.destinationStationId,
        focus: "travel",
        remainingTargetNames: []
      };
    }
  }

  const visualCue = activeMission.storyEncounter?.visualCue;
  const localVisualCue = visualCue && visualCue.systemId === currentSystemId ? visualCue : undefined;
  const atDestination = currentSystemId === activeMission.destinationSystemId && currentStationId === activeMission.destinationStationId;
  const destinationSystemName = getSystemName(activeMission.destinationSystemId);
  return withDistance({
    status: "active",
    chapterLabel,
    chapterOrder: current.chapter.order,
    missionId: activeMission.id,
    title: activeMission.title,
    objectiveText: atDestination
      ? `Complete ${activeMission.title} at ${destinationName}.`
      : `Travel to ${destinationName} in ${destinationSystemName}.`,
    targetSystemId: activeMission.destinationSystemId,
    targetStationId: activeMission.destinationStationId,
    targetPosition: localVisualCue ? [...localVisualCue.position] : undefined,
    targetPositionSystemId: localVisualCue?.systemId,
    visualCueLabel: localVisualCue?.label,
    focus: atDestination ? "deliver" : "travel",
    remainingTargetNames: []
  }, playerPosition);
}

function withDistance(summary: StoryObjectiveSummary, playerPosition: Vec3 | undefined): StoryObjectiveSummary {
  if (!summary.targetPosition || !playerPosition) return summary;
  return {
    ...summary,
    distanceMeters: Math.round(distance(playerPosition, summary.targetPosition))
  };
}
