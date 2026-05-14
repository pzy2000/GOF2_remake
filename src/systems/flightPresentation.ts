import type { Vec3, VisualEffectEntity } from "../types/game";
import { add, scale } from "./math";

export type WeaponDischargeKind = "laser" | "missile";
export type StoryBeatCueKind = "accepted" | "completed" | "target-updated";

export function createWeaponDischargeEffects(
  idPrefix: string,
  origin: Vec3,
  forward: Vec3,
  kind: WeaponDischargeKind
): VisualEffectEntity[] {
  const missile = kind === "missile";
  const muzzle = add(origin, scale(forward, missile ? 24 : 18));
  const flashColor = missile ? "#ffb657" : "#64e4ff";
  const coreColor = missile ? "#fff2c5" : "#eaffff";
  return [
    {
      id: `${idPrefix}-muzzle-flash`,
      kind: "hit",
      position: muzzle,
      color: flashColor,
      secondaryColor: coreColor,
      particleCount: missile ? 8 : 5,
      spread: missile ? 18 : 10,
      size: missile ? 14 : 9,
      life: missile ? 0.18 : 0.12,
      maxLife: missile ? 0.18 : 0.12,
      velocity: scale(forward, missile ? 18 : 10)
    },
    {
      id: `${idPrefix}-muzzle-lance`,
      kind: "projectile-trail",
      position: muzzle,
      endPosition: add(muzzle, scale(forward, missile ? 86 : 54)),
      color: flashColor,
      secondaryColor: coreColor,
      particleCount: 0,
      spread: 1,
      size: missile ? 5.6 : 3.8,
      life: missile ? 0.16 : 0.1,
      maxLife: missile ? 0.16 : 0.1
    }
  ];
}

export function createTargetLockReadyEffects(idPrefix: string, targetPosition: Vec3, leadPosition: Vec3): VisualEffectEntity[] {
  return [
    {
      id: `${idPrefix}-target-ring`,
      kind: "nav-ring",
      position: targetPosition,
      color: "#ffd166",
      secondaryColor: "#eaffff",
      label: "LOCKED",
      particleCount: 0,
      spread: 1,
      size: 48,
      life: 0.48,
      maxLife: 0.48
    },
    {
      id: `${idPrefix}-lead-thread`,
      kind: "projectile-trail",
      position: targetPosition,
      endPosition: leadPosition,
      color: "#ffd166",
      secondaryColor: "#ffffff",
      particleCount: 0,
      spread: 1,
      size: 2.8,
      life: 0.34,
      maxLife: 0.34
    }
  ];
}

export function createStoryBeatEffects(idPrefix: string, position: Vec3, kind: StoryBeatCueKind): VisualEffectEntity[] {
  const completed = kind === "completed";
  const updated = kind === "target-updated";
  const color = completed ? "#9bffe8" : updated ? "#ff9bd5" : "#ffd166";
  const secondaryColor = completed ? "#ffffff" : updated ? "#9bffe8" : "#fff2c5";
  return [
    {
      id: `${idPrefix}-story-ring`,
      kind: "nav-ring",
      position,
      color,
      secondaryColor,
      label: completed ? "CLEARED" : updated ? "WAKE" : "OBJECTIVE",
      particleCount: 0,
      spread: 1,
      size: completed ? 78 : updated ? 68 : 58,
      life: completed ? 0.9 : 0.62,
      maxLife: completed ? 0.9 : 0.62
    },
    {
      id: `${idPrefix}-story-pulse`,
      kind: completed ? "kill-pulse" : "salvage-pulse",
      position,
      color,
      secondaryColor,
      particleCount: completed ? 18 : 12,
      spread: completed ? 58 : 38,
      size: completed ? 60 : 34,
      life: completed ? 0.72 : 0.5,
      maxLife: completed ? 0.72 : 0.5,
      velocity: [0, completed ? 8 : 4, 0]
    }
  ];
}
