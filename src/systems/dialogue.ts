import { dialogueSceneById, dialogueScenes, type DialogueSceneDefinition } from "../data/dialogues";
import type { DialogueState, ExplorationState, MissionDefinition } from "../types/game";

export function createInitialDialogueState(): DialogueState {
  return { seenSceneIds: [] };
}

export function normalizeDialogueState(state?: Partial<DialogueState> | null): DialogueState {
  const knownSceneIds = new Set(dialogueScenes.map((scene) => scene.id));
  return {
    seenSceneIds: Array.from(new Set(state?.seenSceneIds ?? [])).filter((id) => knownSceneIds.has(id))
  };
}

export function getStoryMissionDialogueScene(missionId: string, phase: "accept" | "complete"): DialogueSceneDefinition | undefined {
  const kind = phase === "accept" ? "story-accept" : "story-complete";
  return dialogueScenes.find((scene) => scene.trigger.kind === kind && scene.trigger.missionId === missionId);
}

export function getExplorationDialogueScene(signalId: string): DialogueSceneDefinition | undefined {
  return dialogueScenes.find((scene) => scene.trigger.kind === "exploration-complete" && scene.trigger.signalId === signalId);
}

export function isDialogueSceneSeen(dialogueState: DialogueState, sceneId: string): boolean {
  return dialogueState.seenSceneIds.includes(sceneId);
}

export function markDialogueSceneSeen(dialogueState: DialogueState, sceneId: string): DialogueState {
  if (!dialogueSceneById[sceneId] || dialogueState.seenSceneIds.includes(sceneId)) return dialogueState;
  return { seenSceneIds: [...dialogueState.seenSceneIds, sceneId] };
}

export function isDialogueSceneUnlocked(
  scene: DialogueSceneDefinition,
  options: {
    activeMissions: MissionDefinition[];
    completedMissionIds: string[];
    explorationState: ExplorationState;
    dialogueState: DialogueState;
  }
): boolean {
  if (isDialogueSceneSeen(options.dialogueState, scene.id)) return true;
  if (scene.trigger.kind === "intro") return true;
  if (scene.trigger.kind === "story-accept") {
    const trigger = scene.trigger;
    return options.activeMissions.some((mission) => mission.id === trigger.missionId) || options.completedMissionIds.includes(trigger.missionId);
  }
  if (scene.trigger.kind === "story-complete") {
    return options.completedMissionIds.includes(scene.trigger.missionId);
  }
  return options.explorationState.completedSignalIds.includes(scene.trigger.signalId);
}

export function getDialogueLogEntries(options: {
  activeMissions: MissionDefinition[];
  completedMissionIds: string[];
  explorationState: ExplorationState;
  dialogueState: DialogueState;
}) {
  return dialogueScenes.map((scene) => ({
    scene,
    unlocked: isDialogueSceneUnlocked(scene, options),
    seen: isDialogueSceneSeen(options.dialogueState, scene.id)
  }));
}
