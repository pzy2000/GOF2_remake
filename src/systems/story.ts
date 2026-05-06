import type { StoryArcDefinition, StoryChapterDefinition } from "../data/story";
import type { MissionDefinition } from "../types/game";
import { areMissionPrerequisitesMet } from "./missions";

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
