import type { EncounterDefinition, EncounterStageDefinition, EncounterStageTrigger, StoryNotification, Vec3, VisualEffectEntity } from "../types/game";

export interface EncounterStageEvent {
  missionId: string;
  trigger: EncounterStageTrigger;
  targetId?: string;
  salvageId?: string;
}

export function getEncounterStageForEvent(encounter: EncounterDefinition | undefined, event: EncounterStageEvent): EncounterStageDefinition | undefined {
  if (!encounter || encounter.missionId !== event.missionId) return undefined;
  return encounter.stages.find((stage) =>
    stage.trigger === event.trigger &&
    (!stage.targetId || stage.targetId === event.targetId) &&
    (!stage.salvageId || stage.salvageId === event.salvageId)
  );
}

export function createEncounterStageNotification(
  stage: EncounterStageDefinition,
  missionTitle: string,
  gameClock: number,
  tone: StoryNotification["tone"] = "updated"
): StoryNotification {
  return {
    id: `encounter-${stage.id}-${Math.round(gameClock * 1000)}`,
    tone,
    title: stage.title || missionTitle,
    body: `${stage.objectiveText} ${stage.environmentCue}`,
    expiresAt: gameClock + (stage.trigger === "mission-completed" ? 6 : 5)
  };
}

export function createEncounterStageRuntime(missionId: string, stage: EncounterStageDefinition, gameClock: number) {
  return {
    missionId,
    stageId: stage.id,
    startedAt: gameClock,
    expiresAt: gameClock + (stage.trigger === "mission-completed" ? 8 : 6)
  };
}

export function createEncounterStageEffects(idPrefix: string, stage: EncounterStageDefinition, position: Vec3): VisualEffectEntity[] {
  const label = stage.effectLabel ?? stage.targetHint ?? stage.title;
  const cueKind = stage.visualCueKind ?? "signal";
  if (cueKind === "boss-entry") {
    return [
      {
        id: `${idPrefix}-boss-entry`,
        kind: "boss-burst",
        position,
        color: "#ff4e5f",
        secondaryColor: "#ffd166",
        label,
        particleCount: 34,
        spread: 116,
        size: 92,
        life: 1.18,
        maxLife: 1.18,
        velocity: [0, 8, 0]
      },
      {
        id: `${idPrefix}-boss-ring`,
        kind: "nav-ring",
        position,
        color: "#ff4e5f",
        secondaryColor: "#ffd166",
        label: "BOSS WAKE",
        particleCount: 0,
        spread: 1,
        size: 112,
        life: 1,
        maxLife: 1
      }
    ];
  }
  if (cueKind === "recovery") {
    return [
      {
        id: `${idPrefix}-recovery-pulse`,
        kind: "salvage-pulse",
        position,
        color: "#ffd166",
        secondaryColor: "#eaffff",
        label,
        particleCount: 22,
        spread: 44,
        size: 48,
        life: 1.15,
        maxLife: 1.15,
        velocity: [0, 14, 0]
      },
      {
        id: `${idPrefix}-recovery-ring`,
        kind: "nav-ring",
        position,
        color: "#ffd166",
        secondaryColor: "#9bffe8",
        label: "RECOVER",
        particleCount: 0,
        spread: 1,
        size: 88,
        life: 0.95,
        maxLife: 0.95
      }
    ];
  }
  return [
    {
      id: `${idPrefix}-${cueKind}`,
      kind: cueKind === "debrief" ? "kill-pulse" : "nav-ring",
      position,
      color: cueKind === "debrief" ? "#9bffe8" : "#ff9bd5",
      secondaryColor: cueKind === "debrief" ? "#ffd166" : "#9bffe8",
      label,
      particleCount: cueKind === "debrief" ? 14 : 0,
      spread: cueKind === "debrief" ? 38 : 1,
      size: cueKind === "debrief" ? 58 : 76,
      life: cueKind === "debrief" ? 0.8 : 0.65,
      maxLife: cueKind === "debrief" ? 0.8 : 0.65,
      velocity: cueKind === "debrief" ? [0, 10, 0] : undefined
    }
  ];
}
