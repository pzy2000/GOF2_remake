import { contrabandLawBySystem } from "../data/contraband";
import type { ContrabandLaw, FlightEntity, ProjectileEntity, Vec3 } from "../types/game";
import { getCombatLoadout } from "./combatDoctrine";
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
  ships: FlightEntity[];
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
    owner: Extract<ProjectileEntity["owner"], "enemy" | "patrol" | "npc">;
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
const CIVILIAN_DISTRESS_SECONDS = 18;
const CIVILIAN_DISTRESS_PATROL_RANGE = 940;

export const combatAiProfileLabels: Record<FlightEntity["aiProfileId"], string> = {
  raider: "Raider",
  interceptor: "Interceptor",
  gunner: "Gunner",
  "law-patrol": "Law Patrol",
  "patrol-support": "Patrol Support",
  hauler: "Hauler",
  freighter: "Freighter",
  courier: "Courier",
  miner: "Miner",
  smuggler: "Smuggler",
  "elite-ace": "Elite Ace",
  "boss-warlord": "Pirate Warlord",
  "drone-hunter": "Unknown Drone",
  "relay-core": "Relay Core"
};

const combatProfiles: Record<FlightEntity["aiProfileId"], CombatProfile> = {
  raider: { label: "Raider", speedMultiplier: 1.04, damageMultiplier: 1, rangeMultiplier: 0.96, strafe: 0.25, projectileSpeed: 470, cooldownMultiplier: 1 },
  interceptor: { label: "Interceptor", speedMultiplier: 1.22, damageMultiplier: 0.82, rangeMultiplier: 0.9, strafe: 0.8, projectileSpeed: 500, cooldownMultiplier: 0.92 },
  gunner: { label: "Gunner", speedMultiplier: 0.86, damageMultiplier: 1.3, rangeMultiplier: 1.22, strafe: 0.42, projectileSpeed: 450, cooldownMultiplier: 1.12 },
  "law-patrol": { label: "Law Patrol", speedMultiplier: 1, damageMultiplier: 1, rangeMultiplier: 1, strafe: 0.12, projectileSpeed: 520, cooldownMultiplier: 1 },
  "patrol-support": { label: "Patrol Support", speedMultiplier: 1.08, damageMultiplier: 0.95, rangeMultiplier: 1.02, strafe: 0.35, projectileSpeed: 540, cooldownMultiplier: 0.92 },
  hauler: { label: "Hauler", speedMultiplier: 0.9, damageMultiplier: 0.58, rangeMultiplier: 0.78, strafe: 0.12, projectileSpeed: 410, cooldownMultiplier: 1.25 },
  freighter: { label: "Freighter", speedMultiplier: 0.78, damageMultiplier: 0.72, rangeMultiplier: 0.82, strafe: 0.1, projectileSpeed: 420, cooldownMultiplier: 1.18 },
  courier: { label: "Courier", speedMultiplier: 1.2, damageMultiplier: 0.62, rangeMultiplier: 0.78, strafe: 0.52, projectileSpeed: 460, cooldownMultiplier: 0.96 },
  miner: { label: "Miner", speedMultiplier: 0.82, damageMultiplier: 0.68, rangeMultiplier: 0.72, strafe: 0.06, projectileSpeed: 390, cooldownMultiplier: 1.35 },
  smuggler: { label: "Smuggler", speedMultiplier: 1.14, damageMultiplier: 0.92, rangeMultiplier: 0.95, strafe: 0.66, projectileSpeed: 500, cooldownMultiplier: 0.9 },
  "elite-ace": { label: "Elite Ace", speedMultiplier: 1.28, damageMultiplier: 1.55, rangeMultiplier: 1.18, strafe: 0.95, projectileSpeed: 560, cooldownMultiplier: 0.74 },
  "boss-warlord": { label: "Pirate Warlord", speedMultiplier: 0.98, damageMultiplier: 1.55, rangeMultiplier: 1.12, strafe: 0.62, projectileSpeed: 540, cooldownMultiplier: 0.78 },
  "drone-hunter": { label: "Unknown Drone", speedMultiplier: 1.34, damageMultiplier: 1.1, rangeMultiplier: 1.05, strafe: 0.9, projectileSpeed: 540, cooldownMultiplier: 0.82 },
  "relay-core": { label: "Relay Core", speedMultiplier: 0, damageMultiplier: 0.88, rangeMultiplier: 1.05, strafe: 0, projectileSpeed: 430, cooldownMultiplier: 1.35 }
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
    .sort((a, b) => Number(!!b.boss) - Number(!!a.boss) || Number(!!b.elite) - Number(!!a.elite) || a.id.localeCompare(b.id));
}

export function sortTargetableShips(enemies: FlightEntity[]): FlightEntity[] {
  const priority: Record<FlightEntity["role"], number> = {
    relay: 0,
    drone: 1,
    pirate: 2,
    smuggler: 3,
    patrol: 4,
    freighter: 5,
    trader: 6,
    courier: 7,
    miner: 8
  };
  return enemies
    .filter((ship) => ship.hull > 0 && ship.deathTimer === undefined)
    .sort((a, b) => Number(!!b.storyTarget) - Number(!!a.storyTarget) || Number(!!b.boss) - Number(!!a.boss) || priority[a.role] - priority[b.role] || Number(!!b.elite) - Number(!!a.elite) || a.id.localeCompare(b.id));
}

export function isHostileToPlayer(ship: FlightEntity): boolean {
  return !!ship.storyTarget || ship.role === "pirate" || ship.role === "drone" || ship.role === "relay" || (ship.aiState === "attack" && ship.aiTargetId === "player");
}

function isCivilianRole(ship: FlightEntity): boolean {
  return ship.role === "trader" || ship.role === "freighter" || ship.role === "courier" || ship.role === "miner";
}

function isCivilianDistressThreat(ship: FlightEntity): boolean {
  return !!ship.storyTarget || ship.role === "pirate" || ship.role === "drone" || ship.role === "relay";
}

function getPatrolDistressTarget(input: CombatAiStepInput): FlightEntity | undefined {
  return input.ships
    .filter((ship) =>
      isCivilianRole(ship) &&
      ship.hull > 0 &&
      ship.deathTimer === undefined &&
      !!ship.distressThreatId &&
      ship.distressCalledAt !== undefined &&
      input.now - ship.distressCalledAt <= CIVILIAN_DISTRESS_SECONDS
    )
    .map((civilian) => {
      const threat = input.ships.find((ship) => ship.id === civilian.distressThreatId && ship.hull > 0 && ship.deathTimer === undefined && isCivilianDistressThreat(ship));
      if (!threat) return undefined;
      return {
        threat,
        civilianDistance: distance(input.ship.position, civilian.position),
        threatDistance: distance(input.ship.position, threat.position)
      };
    })
    .filter((contact): contact is { threat: FlightEntity; civilianDistance: number; threatDistance: number } => !!contact)
    .filter((contact) => Math.min(contact.civilianDistance, contact.threatDistance) < CIVILIAN_DISTRESS_PATROL_RANGE)
    .sort((a, b) => Math.min(a.civilianDistance, a.threatDistance) - Math.min(b.civilianDistance, b.threatDistance))[0]?.threat;
}

export function resolveCombatAiStep(input: CombatAiStepInput): CombatAiStep {
  const profile = combatProfiles[input.ship.aiProfileId] ?? combatProfiles.raider;
  if (input.ship.role === "patrol") return resolvePatrolStep(input, profile);
  if (input.ship.role === "drone") return resolveDroneStep(input, profile);
  if (input.ship.role === "relay") return resolveRelayStep(input, profile);
  if (input.ship.storyTarget && input.ship.role === "smuggler") return resolveDroneStep(input, profile);
  if (input.ship.role !== "pirate") return resolveCivilianStep(input, profile);
  return resolvePirateStep(input, profile);
}

function resolvePirateStep(input: CombatAiStepInput, profile: CombatProfile): CombatAiStep {
  const loadout = getCombatLoadout({ ...input.ship, systemId: input.systemId, risk: input.risk });
  const civilianTarget = input.ships
    .filter((ship) => ["trader", "freighter", "courier", "miner"].includes(ship.role) && ship.hull > 0 && ship.deathTimer === undefined)
    .map((ship) => ({ ship, dist: distance(input.ship.position, ship.position) }))
    .filter((candidate) => candidate.dist < 820)
    .sort((a, b) => a.dist - b.dist)[0]?.ship;
  const convoyTarget = input.convoys
    .filter((convoy) => convoy.hull > 0 && !convoy.arrived)
    .map((convoy) => ({ convoy, dist: distance(input.ship.position, convoy.position) }))
    .sort((a, b) => a.dist - b.dist)[0]?.convoy;
  const nearbyConvoy = convoyTarget && distance(input.ship.position, convoyTarget.position) < 900 ? convoyTarget : undefined;
  const shipTarget = nearbyConvoy ? undefined : civilianTarget;
  const targetPosition = nearbyConvoy?.position ?? shipTarget?.position ?? input.playerPosition;
  const toTarget = normalize(sub(targetPosition, input.ship.position));
  const distToTarget = distance(input.ship.position, targetPosition);
  const recentlyHit = input.now - input.ship.lastDamageAt < 0.7;
  let aiState: FlightEntity["aiState"] = "attack";
  let desiredDirection = normalize(add(toTarget, scale(sideVector(toTarget), profile.strafe)));

  if (input.ship.hull / input.ship.maxHull < loadout.retreatHullRatio) {
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
      aiTargetId: nearbyConvoy?.id ?? shipTarget?.id ?? "player",
      aiTimer: nextAiTimer(input.ship, aiState, input.delta),
      scanProgress: undefined
    },
    desiredDirection,
    speed,
    fire: canFire
      ? {
          owner: "enemy",
          targetPosition,
          targetId: nearbyConvoy?.id ?? shipTarget?.id,
          damage: Math.round(loadout.damage * profile.damageMultiplier),
          projectileSpeed: profile.projectileSpeed,
          cooldownMin: loadout.fireCooldownMin * profile.cooldownMultiplier,
          cooldownMax: loadout.fireCooldownMax * profile.cooldownMultiplier
        }
      : undefined
  };
}

function resolvePatrolStep(input: CombatAiStepInput, profile: CombatProfile): CombatAiStep {
  const loadout = getCombatLoadout({ ...input.ship, systemId: input.systemId, risk: input.risk });
  const activePirates = sortPirateTargets(input.pirates);
  const distressTarget = getPatrolDistressTarget(input);
  const outlawTarget = distressTarget ?? [
    ...activePirates,
    ...input.ships.filter((ship) => ["smuggler", "drone", "relay"].includes(ship.role) && ship.hull > 0 && ship.deathTimer === undefined)
  ]
    .map((ship) => ({ ship, dist: distance(input.ship.position, ship.position) }))
    .sort((a, b) => a.dist - b.dist)[0]?.ship;
  const law = getContrabandLaw(input.systemId);
  const playerDistance = distance(input.ship.position, input.playerPosition);

  if (input.ship.aiState === "attack" && input.ship.aiTargetId === "player") {
    const toPlayer = normalize(sub(input.playerPosition, input.ship.position));
    const attackRange = loadout.attackRange * profile.rangeMultiplier;
    const canFire = input.ship.fireCooldown <= 0 && playerDistance < attackRange;
    return {
      ship: { ...input.ship, aiState: "attack", aiTargetId: "player", aiTimer: input.ship.aiTimer + input.delta, scanProgress: 1 },
      desiredDirection: normalize(add(toPlayer, scale(sideVector(toPlayer), 0.22))),
      speed: loadout.speed * profile.speedMultiplier,
      fire: canFire
        ? { owner: "enemy", targetPosition: input.playerPosition, damage: Math.round(loadout.damage * profile.damageMultiplier), projectileSpeed: profile.projectileSpeed, cooldownMin: loadout.fireCooldownMin * profile.cooldownMultiplier, cooldownMax: loadout.fireCooldownMax * profile.cooldownMultiplier }
        : undefined
    };
  }

  if (outlawTarget) {
    const pirate = outlawTarget;
    const toPirate = normalize(sub(pirate.position, input.ship.position));
    const distToPirate = distance(input.ship.position, pirate.position);
    const canFire = input.ship.fireCooldown <= 0 && distToPirate < loadout.attackRange * profile.rangeMultiplier;
    return {
      ship: {
        ...input.ship,
        aiState: distToPirate < 620 ? "attack" : "intercept",
        aiTargetId: pirate.id,
        aiTimer: nextAiTimer(input.ship, distToPirate < 620 ? "attack" : "intercept", input.delta),
        scanProgress: undefined
      },
      desiredDirection: normalize(add(toPirate, scale(sideVector(toPirate), profile.strafe))),
      speed: loadout.speed * profile.speedMultiplier,
      fire: canFire
        ? { owner: "patrol", targetPosition: pirate.position, targetId: pirate.id, damage: Math.round(loadout.damage * profile.damageMultiplier), projectileSpeed: profile.projectileSpeed, cooldownMin: loadout.fireCooldownMin * profile.cooldownMultiplier, cooldownMax: loadout.fireCooldownMax * profile.cooldownMultiplier }
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
    speed: loadout.speed * profile.speedMultiplier
  };
}

function resolveDroneStep(input: CombatAiStepInput, profile: CombatProfile): CombatAiStep {
  const loadout = getCombatLoadout({ ...input.ship, systemId: input.systemId, risk: input.risk });
  const convoyTarget = input.convoys
    .filter((convoy) => convoy.hull > 0 && !convoy.arrived)
    .map((convoy) => ({ convoy, dist: distance(input.ship.position, convoy.position) }))
    .filter((candidate) => candidate.dist < 980)
    .sort((a, b) => a.dist - b.dist)[0]?.convoy;
  const targetPosition = convoyTarget?.position ?? input.playerPosition;
  const targetId = convoyTarget?.id ?? "player";
  const toTarget = normalize(sub(targetPosition, input.ship.position));
  const distToTarget = distance(input.ship.position, targetPosition);
  const recentlyHit = input.now - input.ship.lastDamageAt < 0.6;
  const aiState: FlightEntity["aiState"] = distToTarget < loadout.attackRange ? (recentlyHit ? "evade" : "attack") : "intercept";
  const desiredDirection = aiState === "evade"
    ? normalize(add(scale(toTarget, -0.45), scale(sideVector(toTarget), profile.strafe)))
    : normalize(add(toTarget, scale(sideVector(toTarget), profile.strafe)));
  const canFire = input.ship.fireCooldown <= 0 && distToTarget < loadout.attackRange * profile.rangeMultiplier;
  return {
    ship: {
      ...input.ship,
      aiState,
      aiTargetId: targetId,
      aiTimer: nextAiTimer(input.ship, aiState, input.delta),
      scanProgress: undefined
    },
    desiredDirection,
    speed: loadout.speed * profile.speedMultiplier,
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

function resolveRelayStep(input: CombatAiStepInput, profile: CombatProfile): CombatAiStep {
  const loadout = getCombatLoadout({ ...input.ship, systemId: input.systemId, risk: input.risk });
  const convoyTarget = input.convoys
    .filter((convoy) => convoy.hull > 0 && !convoy.arrived)
    .map((convoy) => ({ convoy, dist: distance(input.ship.position, convoy.position) }))
    .filter((candidate) => candidate.dist < 720)
    .sort((a, b) => a.dist - b.dist)[0]?.convoy;
  const playerDistance = distance(input.ship.position, input.playerPosition);
  const targetPosition = convoyTarget?.position ?? input.playerPosition;
  const targetId = convoyTarget?.id ?? "player";
  const targetDistance = convoyTarget ? distance(input.ship.position, convoyTarget.position) : playerDistance;
  const canFire = input.ship.fireCooldown <= 0 && targetDistance < loadout.attackRange * profile.rangeMultiplier;
  return {
    ship: {
      ...input.ship,
      aiState: canFire ? "attack" : "patrol",
      aiTargetId: targetId,
      aiTimer: nextAiTimer(input.ship, canFire ? "attack" : "patrol", input.delta),
      scanProgress: undefined
    },
    desiredDirection: [0, 0, 0],
    speed: 0,
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

function resolveCivilianStep(input: CombatAiStepInput, profile: CombatProfile): CombatAiStep {
  const loadout = getCombatLoadout({ ...input.ship, systemId: input.systemId, risk: input.risk });
  if (input.ship.aiState === "attack" && input.ship.aiTargetId === "player") {
    const toPlayer = normalize(sub(input.playerPosition, input.ship.position));
    const playerDistance = distance(input.ship.position, input.playerPosition);
    const canFire = input.ship.fireCooldown <= 0 && playerDistance < loadout.attackRange * profile.rangeMultiplier;
    return {
      ship: { ...input.ship, aiState: "attack", aiTargetId: "player", aiTimer: nextAiTimer(input.ship, "attack", input.delta), scanProgress: undefined },
      desiredDirection: normalize(add(toPlayer, scale(sideVector(toPlayer), profile.strafe))),
      speed: loadout.speed * profile.speedMultiplier,
      fire: canFire
        ? {
            owner: "enemy",
            targetPosition: input.playerPosition,
            damage: Math.round(loadout.damage * profile.damageMultiplier),
            projectileSpeed: profile.projectileSpeed,
            cooldownMin: loadout.fireCooldownMin * profile.cooldownMultiplier,
            cooldownMax: loadout.fireCooldownMax * profile.cooldownMultiplier
          }
        : undefined
    };
  }

  const nearestThreat = [
    ...sortPirateTargets(input.pirates),
    ...(input.ship.role === "smuggler" ? input.ships.filter((ship) => ship.role === "patrol" && ship.hull > 0 && ship.deathTimer === undefined) : [])
  ]
    .map((pirate) => ({ pirate, dist: distance(input.ship.position, pirate.position) }))
    .sort((a, b) => a.dist - b.dist)[0]?.pirate;
  if (nearestThreat && distance(input.ship.position, nearestThreat.position) < 780) {
    const toThreat = normalize(sub(nearestThreat.position, input.ship.position));
    const threatDistance = distance(input.ship.position, nearestThreat.position);
    const canFire = input.ship.fireCooldown <= 0 && threatDistance < loadout.attackRange * profile.rangeMultiplier;
    return {
      ship: {
        ...input.ship,
        aiState: threatDistance < 620 ? "attack" : "intercept",
        aiTargetId: nearestThreat.id,
        aiTimer: nextAiTimer(input.ship, threatDistance < 620 ? "attack" : "intercept", input.delta),
        scanProgress: undefined
      },
      desiredDirection: normalize(add(toThreat, scale(sideVector(toThreat), profile.strafe))),
      speed: loadout.speed * profile.speedMultiplier,
      fire: canFire
        ? {
            owner: "npc",
            targetPosition: nearestThreat.position,
            targetId: nearestThreat.id,
            damage: Math.round(loadout.damage * profile.damageMultiplier),
            projectileSpeed: profile.projectileSpeed,
            cooldownMin: loadout.fireCooldownMin * profile.cooldownMultiplier,
            cooldownMax: loadout.fireCooldownMax * profile.cooldownMultiplier
          }
        : undefined
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
    speed: loadout.speed * profile.speedMultiplier
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
