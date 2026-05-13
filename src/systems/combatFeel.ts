import type { FlightEntity, PlayerState, ProjectileEntity, Vec3, VisualEffectEntity } from "../types/game";
import type { FlightTuning } from "./flightTuning";
import { add, clamp, distance, forwardFromRotation, lerpVec3, normalize, scale, sub } from "./math";
import { defaultFlightTuning } from "./flightTuning";

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function coneDot(degrees: number): number {
  return Math.cos((degrees * Math.PI) / 180);
}

function isAliveTarget(ship: FlightEntity): boolean {
  return ship.hull > 0 && ship.deathTimer === undefined;
}

export function selectSoftLockTarget(player: Pick<PlayerState, "position" | "rotation">, enemies: FlightEntity[], tuning: FlightTuning = defaultFlightTuning): FlightEntity | undefined {
  const forward = forwardFromRotation(player.rotation);
  const minDot = coneDot(tuning.targeting.softLockConeDegrees);
  return enemies
    .filter(isAliveTarget)
    .map((ship) => {
      const offset = sub(ship.position, player.position);
      const dist = distance(player.position, ship.position);
      const alignment = dot(forward, normalize(offset));
      return { ship, dist, alignment };
    })
    .filter((candidate) => candidate.dist <= tuning.targeting.softLockDistance && candidate.alignment >= minDot)
    .sort((a, b) => {
      const priorityA = a.alignment * 1000 - a.dist + (a.ship.storyTarget ? 180 : 0) + (a.ship.boss ? 120 : 0);
      const priorityB = b.alignment * 1000 - b.dist + (b.ship.storyTarget ? 180 : 0) + (b.ship.boss ? 120 : 0);
      return priorityB - priorityA;
    })[0]?.ship;
}

export function resolveAssistedShotDirection(
  player: Pick<PlayerState, "position">,
  target: Pick<FlightEntity, "position" | "velocity"> | undefined,
  fallbackForward: Vec3,
  tuning: FlightTuning = defaultFlightTuning
): Vec3 {
  const fallback = normalize(fallbackForward);
  if (!target) return fallback;
  const predictedPosition = add(target.position, scale(target.velocity, tuning.targeting.leadTimeSeconds));
  const desired = normalize(sub(predictedPosition, player.position));
  if (dot(fallback, desired) < coneDot(tuning.targeting.maxAssistAngleDegrees)) return fallback;
  return normalize(lerpVec3(fallback, desired, clamp(tuning.targeting.softLockStrength, 0, 1)));
}

export function isTargetInsideFireCone(origin: Vec3, aimDirection: Vec3, targetPosition: Vec3, coneDegrees: number): boolean {
  return dot(normalize(aimDirection), normalize(sub(targetPosition, origin))) >= coneDot(coneDegrees);
}

export function isInsideAttackWindow(aiTimer: number, boss: boolean | undefined, tuning: FlightTuning = defaultFlightTuning): boolean {
  const windowSeconds = tuning.combatRhythm.attackWindowSeconds * (boss ? tuning.combatRhythm.bossBurstMultiplier : 1);
  return aiTimer % tuning.combatRhythm.attackCycleSeconds <= windowSeconds;
}

export function canRhythmFireAtTarget(
  origin: Vec3,
  aimDirection: Vec3,
  targetPosition: Vec3,
  aiTimer: number,
  boss: boolean | undefined,
  tuning: FlightTuning = defaultFlightTuning
): boolean {
  return isInsideAttackWindow(aiTimer, boss, tuning) && isTargetInsideFireCone(origin, aimDirection, targetPosition, tuning.combatRhythm.fireConeDegrees);
}

export function createProjectileTrail(id: string, projectile: ProjectileEntity, endPosition: Vec3, tuning: FlightTuning = defaultFlightTuning): VisualEffectEntity {
  const length = projectile.kind === "missile" ? 34 : 24;
  const start = add(endPosition, scale(projectile.direction, -length));
  const color = projectile.kind === "missile" ? "#ffb657" : projectile.owner === "player" ? "#64e4ff" : "#ff4c6a";
  return {
    id,
    kind: "projectile-trail",
    position: start,
    endPosition,
    color,
    secondaryColor: "#ffffff",
    particleCount: 0,
    spread: 1,
    size: projectile.kind === "missile" ? tuning.vfx.projectileTrailSize * 1.4 : tuning.vfx.projectileTrailSize,
    life: tuning.vfx.projectileTrailLife,
    maxLife: tuning.vfx.projectileTrailLife
  };
}

export function createImpactEffects(
  idPrefix: string,
  position: Vec3,
  damage: number,
  shielded: boolean,
  missile: boolean,
  tuning: FlightTuning = defaultFlightTuning
): VisualEffectEntity[] {
  const baseSize = shielded ? 22 : missile ? 22 * tuning.feedback.missileImpactScale : 12;
  const effects: VisualEffectEntity[] = [
    {
      id: `${idPrefix}-impact`,
      kind: shielded ? "shield-hit" : "hit",
      position,
      color: shielded ? "#69e4ff" : "#ff8a6a",
      secondaryColor: shielded ? "#eaffff" : "#ffd166",
      label: `-${Math.round(damage)}`,
      particleCount: missile ? 10 : 5,
      spread: missile ? 22 * tuning.feedback.missileImpactScale : 12,
      size: baseSize,
      life: 0.34,
      maxLife: 0.34,
      velocity: [0, 10, 0]
    }
  ];
  if (shielded) {
    effects.push({
      id: `${idPrefix}-shield-break`,
      kind: "shield-break",
      position,
      color: "#69e4ff",
      secondaryColor: "#eaffff",
      particleCount: tuning.vfx.shieldBreakParticles,
      spread: 30,
      size: 28,
      life: 0.38,
      maxLife: 0.38
    });
  }
  return effects;
}

export function createKillEffects(idPrefix: string, ship: FlightEntity, tuning: FlightTuning = defaultFlightTuning): VisualEffectEntity[] {
  const bossScale = ship.boss ? tuning.feedback.bossExplosionScale : 1;
  const color = ship.role === "pirate" ? "#ff784f" : ship.role === "patrol" ? "#64e4ff" : "#ffd166";
  const effects: VisualEffectEntity[] = [
    {
      id: `${idPrefix}-explosion`,
      kind: "explosion",
      position: ship.position,
      color,
      secondaryColor: "#ffd166",
      label: ship.boss ? "Boss destroyed" : "Destroyed",
      particleCount: Math.min(tuning.performance.maxExplosionParticles, ship.boss ? tuning.vfx.bossExplosionParticles : 22),
      spread: 58 * bossScale,
      size: 46 * bossScale,
      life: 0.85 * (ship.boss ? 1.25 : 1),
      maxLife: 0.85 * (ship.boss ? 1.25 : 1),
      velocity: [0, 6, 0]
    },
    {
      id: `${idPrefix}-kill-pulse`,
      kind: "kill-pulse",
      position: ship.position,
      color: ship.boss ? "#ffd166" : "#ffdf6e",
      secondaryColor: ship.boss ? "#ff4e5f" : "#ffffff",
      particleCount: ship.boss ? 18 : 10,
      spread: ship.boss ? 74 : 38,
      size: ship.boss ? 86 : 42,
      life: tuning.speedFeel.killPulseSeconds * (ship.boss ? 1.55 : 1),
      maxLife: tuning.speedFeel.killPulseSeconds * (ship.boss ? 1.55 : 1)
    }
  ];
  if (ship.boss) {
    effects.push({
      id: `${idPrefix}-boss-shock`,
      kind: "explosion",
      position: add(ship.position, [0, 8, 0]),
      color: "#ff4e5f",
      secondaryColor: "#eaffff",
      particleCount: tuning.vfx.bossExplosionParticles,
      spread: 96,
      size: 78,
      life: 1.08,
      maxLife: 1.08,
      velocity: [0, 10, 0]
    });
  }
  return effects;
}

export function createSpeedLineEffects(idPrefix: string, player: Pick<PlayerState, "position" | "velocity" | "rotation">, afterburning: boolean, now: number, tuning: FlightTuning = defaultFlightTuning): VisualEffectEntity[] {
  const speed = distance(player.velocity, [0, 0, 0]);
  if (speed < tuning.speedFeel.speedLineThreshold) return [];
  const forward = forwardFromRotation(player.rotation);
  const count = Math.min(tuning.speedFeel.speedLineMaxCount, Math.max(1, Math.floor((speed - tuning.speedFeel.speedLineThreshold) / 75) + (afterburning ? 2 : 0)));
  const multiplier = afterburning ? tuning.speedFeel.afterburnerSpeedLineMultiplier : 1;
  return Array.from({ length: count }, (_, index) => {
    const phase = now * 9 + index * 2.17;
    const side = Math.sin(phase) * 52;
    const height = Math.cos(phase * 1.31) * 32;
    const start = add(player.position, [side, height, 60 + index * 18]);
    return {
      id: `${idPrefix}-${index}`,
      kind: "speed-line" as const,
      position: start,
      endPosition: add(start, scale(forward, -110 * multiplier)),
      color: afterburning ? "#7ee7ff" : "#dff8ff",
      secondaryColor: "#ffffff",
      particleCount: 0,
      spread: 1,
      size: afterburning ? 3.4 : 2.1,
      life: 0.16,
      maxLife: 0.16
    };
  });
}

export function createSalvagePulse(idPrefix: string, position: Vec3, tuning: FlightTuning = defaultFlightTuning): VisualEffectEntity {
  return {
    id: `${idPrefix}-salvage-pulse`,
    kind: "salvage-pulse",
    position,
    color: "#ffd166",
    secondaryColor: "#eaffff",
    label: "Recovered",
    particleCount: 16,
    spread: 34,
    size: tuning.vfx.salvagePulseSize,
    life: tuning.vfx.salvagePulseLife,
    maxLife: tuning.vfx.salvagePulseLife,
    velocity: [0, 12, 0]
  };
}
