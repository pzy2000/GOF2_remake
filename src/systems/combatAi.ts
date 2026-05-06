import { contrabandLawBySystem } from "../data/contraband";
import type { ContrabandLaw, FlightEntity, ProjectileEntity, Vec3 } from "../types/game";
import { getPirateLoadout } from "./difficulty";
import { add, distance, normalize, rightFromRotation, scale, sub } from "./math";
import { getIdlePatrolDirection } from "./patrol";

export const CONTRABAND_SCAN_RANGE = 520;
export const CONTRABAND_SCAN_SECONDS = 3;
export const CONTRABAND_FINE_PER_UNIT = 450;

export interface PirateAiProfileResult {
  aiProfileId: FlightEntity["aiProfileId"];
  elite: boolean;
}

export interface CombatAiStepInput {
  ship: FlightEntity;
  systemId: string;
  risk: number;
  playerPosition: Vec3;
  playerHasContraband: boolean;
  delta: number;
  now: number;
  graceUntil: number;
  pirates: FlightEntity[];
  convoys: Array<{
    id: string;
    position: Vec3;
    hull: number;
    arrived?: boolean;
  }>;
}

export interface CombatAiStep {
  ship: FlightEntity;
  desiredDirection: Vec3;
  speed: number;
  fire?: {
    owner: Extract<ProjectileEntity["owner"], "enemy" | "patrol">;
    targetPosition: Vec3;
    targetId?: string;
    damage: number;
    projectileSpeed: number;
    cooldownMin: number;
    cooldownMax: number;
  };
  scanComplete?: boolean;
}

interface CombatProfile {
  label: string;
  speedMultiplier: number;
  damageMultiplier: number;
  rangeMultiplier: number;
  strafe: number;
  projectileSpeed: number;
  cooldownMultiplier: number;
}

const pirateProfiles: FlightEntity["aiProfileId"][] = ["raider", "interceptor", "gunner"];

export const combatAiProfileLabels: Record<FlightEntity["aiProfileId"], string> = {
  raider: "Raider",
  interceptor: "Interceptor",
  gunner: "Gunner",
  "law-patrol": "Law Patrol",
  hauler: "Hauler",
  "elite-ace": "Elite Ace"
};

const combatProfiles: Record<FlightEntity["aiProfileId"], CombatProfile> = {
  raider: { label: "Raider", speedMultiplier: 1.04, damageMultiplier: 1, rangeMultiplier: 0.96, strafe: 0.25, projectileSpeed: 470, cooldownMultiplier: 1 },
  interceptor: { label: "Interceptor", speedMultiplier: 1.22, damageMultiplier: 0.82, rangeMultiplier: 0.9, strafe: 0.8, projectileSpeed: 500, cooldownMultiplier: 0.92 },
  gunner: { label: "Gunner", speedMultiplier: 0.86, damageMultiplier: 1.3, rangeMultiplier: 1.22, strafe: 0.42, projectileSpeed: 450, cooldownMultiplier: 1.12 },
  "law-patrol": { label: "Law Patrol", speedMultiplier: 1, damageMultiplier: 1, rangeMultiplier: 1, strafe: 0.12, projectileSpeed: 520, cooldownMultiplier: 1 },
  hauler: { label: "Hauler", speedMultiplier: 1, damageMultiplier: 0, rangeMultiplier: 0, strafe: 0, projectileSpeed: 0, cooldownMultiplier: 1 },
  "elite-ace": { label: "Elite Ace", speedMultiplier: 1.28, damageMultiplier: 1.55, rangeMultiplier: 1.18, strafe: 0.95, projectileSpeed: 560, cooldownMultiplier: 0.74 }
};

export function getContrabandLaw(systemId: string): ContrabandLaw {
  return contrabandLawBySystem[systemId] ?? {
    systemId,
    label: "Fine + Confiscate",
    disposition: "fine-confiscate",
    summary: "Unregistered customs jurisdiction confiscates cargo and issues a 450 cr/unit fine."
  };
}

export function getContrabandLawSummary(systemId: string): string {
  const law = getContrabandLaw(systemId);
  return `${law.label}: ${law.summary}`;
}

export function getPirateAiProfile(systemId: string, index: number, risk: number): PirateAiProfileResult {
  if (index === 0 && shouldSpawnElitePirate(systemId, risk)) {
    return { aiProfileId: "elite-ace", elite: true };
  }
  return { aiProfileId: pirateProfiles[index % pirateProfiles.length], elite: false };
}

export function shouldSpawnElitePirate(systemId: string, risk: number): boolean {
  if (risk < 0.55) return false;
  return deterministicRiskRoll(systemId) < Math.min(0.88, risk + 0.18);
}

export function sortPirateTargets(enemies: FlightEntity[]): FlightEntity[] {
  return enemies
    .filter((ship) => ship.role === "pirate" && ship.hull > 0 && ship.deathTimer === undefined)
    .sort((a, b) => Number(!!b.elite) - Number(!!a.elite) || a.id.localeCompare(b.id));
}

export function isHostileToPlayer(ship: FlightEntity): boolean {
  return ship.role === "pirate" || (ship.role === "patrol" && ship.aiState === "attack" && ship.aiTargetId === "player");
}

export function resolveCombatAiStep(input: CombatAiStepInput): CombatAiStep {
  const profile = combatProfiles[input.ship.aiProfileId] ?? combatProfiles.raider;
  if (input.ship.role === "patrol") return resolvePatrolStep(input, profile);
  if (input.ship.role === "trader") return resolveTraderStep(input, profile);
  return resolvePirateStep(input, profile);
}

function resolvePirateStep(input: CombatAiStepInput, profile: CombatProfile): CombatAiStep {
  const loadout = getPirateLoadout(input.systemId, input.risk);
  const convoyTarget = input.convoys
    .filter((convoy) => convoy.hull > 0 && !convoy.arrived)
    .map((convoy) => ({ convoy, dist: distance(input.ship.position, convoy.position) }))
    .sort((a, b) => a.dist - b.dist)[0]?.convoy;
  const targetPosition = convoyTarget && distance(input.ship.position, convoyTarget.position) < 900 ? convoyTarget.position : input.playerPosition;
  const toTarget = normalize(sub(targetPosition, input.ship.position));
  const distToTarget = distance(input.ship.position, targetPosition);
  const recentlyHit = input.now - input.ship.lastDamageAt < 0.7;
  let aiState: FlightEntity["aiState"] = "attack";
  let desiredDirection = normalize(add(toTarget, scale(sideVector(toTarget), profile.strafe)));

  if (input.ship.hull / input.ship.maxHull < 0.28) {
    aiState = "retreat";
    desiredDirection = scale(toTarget, -1);
  } else if (recentlyHit && distToTarget < 320) {
    aiState = "evade";
    desiredDirection = normalize(add(scale(toTarget, -0.55), scale(sideVector(toTarget), profile.strafe || 0.8)));
  }

  const speed = loadout.speed * profile.speedMultiplier;
  const attackRange = loadout.attackRange * profile.rangeMultiplier;
  const canFire = aiState === "attack" && input.now >= input.graceUntil && input.ship.fireCooldown <= 0 && distToTarget < attackRange;
  return {
    ship: {
      ...input.ship,
      aiState,
      aiTargetId: convoyTarget?.id ?? "player",
      aiTimer: nextAiTimer(input.ship, aiState, input.delta),
      scanProgress: undefined
    },
    desiredDirection,
    speed,
    fire: canFire
      ? {
          owner: "enemy",
          targetPosition,
          targetId: convoyTarget?.id,
          damage: Math.round(loadout.damage * profile.damageMultiplier),
          projectileSpeed: profile.projectileSpeed,
          cooldownMin: loadout.fireCooldownMin * profile.cooldownMultiplier,
          cooldownMax: loadout.fireCooldownMax * profile.cooldownMultiplier
        }
      : undefined
  };
}

function resolvePatrolStep(input: CombatAiStepInput, profile: CombatProfile): CombatAiStep {
  const activePirates = sortPirateTargets(input.pirates);
  const law = getContrabandLaw(input.systemId);
  const playerDistance = distance(input.ship.position, input.playerPosition);

  if (input.ship.aiState === "attack" && input.ship.aiTargetId === "player") {
    const toPlayer = normalize(sub(input.playerPosition, input.ship.position));
    const canFire = input.ship.fireCooldown <= 0 && playerDistance < 620;
    return {
      ship: { ...input.ship, aiState: "attack", aiTargetId: "player", aiTimer: input.ship.aiTimer + input.delta, scanProgress: 1 },
      desiredDirection: normalize(add(toPlayer, scale(sideVector(toPlayer), 0.22))),
      speed: 128,
      fire: canFire
        ? { owner: "enemy", targetPosition: input.playerPosition, damage: 12, projectileSpeed: profile.projectileSpeed, cooldownMin: 0.72, cooldownMax: 1.05 }
        : undefined
    };
  }

  if (activePirates[0]) {
    const pirate = activePirates[0];
    const toPirate = normalize(sub(pirate.position, input.ship.position));
    const distToPirate = distance(input.ship.position, pirate.position);
    const canFire = input.ship.fireCooldown <= 0 && distToPirate < 620;
    return {
      ship: {
        ...input.ship,
        aiState: distToPirate < 620 ? "attack" : "intercept",
        aiTargetId: pirate.id,
        aiTimer: nextAiTimer(input.ship, distToPirate < 620 ? "attack" : "intercept", input.delta),
        scanProgress: undefined
      },
      desiredDirection: normalize(add(toPirate, scale(sideVector(toPirate), profile.strafe))),
      speed: 118,
      fire: canFire
        ? { owner: "patrol", targetPosition: pirate.position, targetId: pirate.id, damage: 14, projectileSpeed: profile.projectileSpeed, cooldownMin: 0.65, cooldownMax: 0.65 }
        : undefined
    };
  }

  if (input.playerHasContraband && law.disposition !== "legal" && playerDistance <= CONTRABAND_SCAN_RANGE) {
    const scanProgress = Math.min(1, (input.ship.scanProgress ?? 0) + input.delta / CONTRABAND_SCAN_SECONDS);
    const toPlayer = normalize(sub(input.playerPosition, input.ship.position));
    return {
      ship: {
        ...input.ship,
        aiState: "scan",
        aiTargetId: "player",
        aiTimer: nextAiTimer(input.ship, "scan", input.delta),
        scanProgress
      },
      desiredDirection: playerDistance > 260 ? toPlayer : getIdlePatrolDirection(input.systemId, input.ship.position),
      speed: playerDistance > 260 ? 92 : 42,
      scanComplete: scanProgress >= 1
    };
  }

  return {
    ship: {
      ...input.ship,
      aiState: "patrol",
      aiTargetId: undefined,
      aiTimer: nextAiTimer(input.ship, "patrol", input.delta),
      scanProgress: undefined
    },
    desiredDirection: getIdlePatrolDirection(input.systemId, input.ship.position),
    speed: 118 * profile.speedMultiplier
  };
}

function resolveTraderStep(input: CombatAiStepInput, profile: CombatProfile): CombatAiStep {
  const nearestPirate = sortPirateTargets(input.pirates)
    .map((pirate) => ({ pirate, dist: distance(input.ship.position, pirate.position) }))
    .sort((a, b) => a.dist - b.dist)[0]?.pirate;
  if (nearestPirate) {
    const away = scale(normalize(sub(nearestPirate.position, input.ship.position)), -1);
    return {
      ship: {
        ...input.ship,
        aiState: "evade",
        aiTargetId: nearestPirate.id,
        aiTimer: nextAiTimer(input.ship, "evade", input.delta),
        scanProgress: undefined
      },
      desiredDirection: away,
      speed: 118 * profile.speedMultiplier
    };
  }
  return {
    ship: {
      ...input.ship,
      aiState: "patrol",
      aiTargetId: undefined,
      aiTimer: nextAiTimer(input.ship, "patrol", input.delta),
      scanProgress: undefined
    },
    desiredDirection: normalize(add(getIdlePatrolDirection(input.systemId, input.ship.position), [0.18, 0, -0.08])),
    speed: 105 * profile.speedMultiplier
  };
}

function nextAiTimer(ship: FlightEntity, state: FlightEntity["aiState"], delta: number): number {
  return ship.aiState === state ? ship.aiTimer + delta : 0;
}

function sideVector(direction: Vec3): Vec3 {
  return rightFromRotation([0, Math.atan2(direction[0], -direction[2]), 0]);
}

function deterministicRiskRoll(systemId: string): number {
  let hash = 0;
  for (let index = 0; index < systemId.length; index += 1) {
    hash = (hash * 31 + systemId.charCodeAt(index)) % 997;
  }
  return (hash % 100) / 100;
}
