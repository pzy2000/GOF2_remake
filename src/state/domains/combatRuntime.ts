import { equipmentById } from "../../data/world";
import type { ConvoyEntity, FlightEntity, LootEntity, Vec3 } from "../../types/game";
import { applyDamage, regenerateShield } from "../../systems/combat";
import { add, distance, normalize, scale, sub } from "../../systems/math";
import {
  createPatrolSupportShip,
  lootDropsForDestroyedShip,
  projectileId
} from "./runtimeFactory";

export const PATROL_SUPPORT_COOLDOWN_SECONDS = 42;
export const MAX_PATROL_SUPPORT_WINGS = 2;
export const CIVILIAN_DISTRESS_SECONDS = 18;

const CIVILIAN_DISTRESS_RANGE = 820;
const CIVILIAN_DISTRESS_CLOSE_COMBAT_RANGE = 360;
const CIVILIAN_DISTRESS_PATROL_RANGE = 940;

export interface ConvoyFireRequest {
  position: Vec3;
  targetPosition: Vec3;
  targetId: string;
  damage: number;
  projectileSpeed: number;
}

export interface PatrolSupportRequest {
  ships: FlightEntity[];
  effectPositions: Vec3[];
  message?: string;
  requestedShip: FlightEntity;
}

export function isPatrolSupportThreat(ship: FlightEntity): boolean {
  return !!ship.storyTarget || ship.role === "pirate" || ship.role === "drone" || ship.role === "relay" || ship.role === "smuggler";
}

export function isCivilianDistressRole(role: FlightEntity["role"]): boolean {
  return role === "trader" || role === "freighter" || role === "courier" || role === "miner";
}

export function isCivilianDistressThreat(ship: FlightEntity): boolean {
  return !!ship.storyTarget || ship.role === "pirate" || ship.role === "drone" || ship.role === "relay";
}

export function hasActiveCivilianDistress(ship: FlightEntity, now: number): boolean {
  return (
    isCivilianDistressRole(ship.role) &&
    !!ship.distressThreatId &&
    ship.distressCalledAt !== undefined &&
    now - ship.distressCalledAt <= CIVILIAN_DISTRESS_SECONDS
  );
}

function findCivilianThreat(ship: FlightEntity, enemies: FlightEntity[]): { ship: FlightEntity; dist: number; direct: boolean } | undefined {
  return enemies
    .filter((candidate) => candidate.id !== ship.id && candidate.hull > 0 && candidate.deathTimer === undefined && isCivilianDistressThreat(candidate))
    .map((candidate) => ({
      ship: candidate,
      dist: distance(candidate.position, ship.position),
      direct: candidate.aiTargetId === ship.id
    }))
    .filter((candidate) => candidate.direct || (candidate.dist < CIVILIAN_DISTRESS_CLOSE_COMBAT_RANGE && candidate.ship.aiState === "attack"))
    .filter((candidate) => candidate.dist < CIVILIAN_DISTRESS_RANGE || candidate.direct)
    .sort((a, b) => Number(b.direct) - Number(a.direct) || a.dist - b.dist)[0];
}

export function resolveCivilianDistress(ship: FlightEntity, enemies: FlightEntity[], now: number): FlightEntity {
  if (!isCivilianDistressRole(ship.role) || ship.hull <= 0 || ship.deathTimer !== undefined) return ship;

  const detectedThreat = findCivilianThreat(ship, enemies)?.ship;
  if (detectedThreat) {
    const keepCallTime = ship.distressThreatId === detectedThreat.id && hasActiveCivilianDistress(ship, now);
    return {
      ...ship,
      distressThreatId: detectedThreat.id,
      distressCalledAt: keepCallTime ? ship.distressCalledAt : now
    };
  }

  if (hasActiveCivilianDistress(ship, now)) return ship;
  if (ship.distressThreatId || ship.distressCalledAt !== undefined) {
    return { ...ship, distressThreatId: undefined, distressCalledAt: undefined };
  }
  return ship;
}

export interface CivilianDistressContact {
  civilian: FlightEntity;
  threat: FlightEntity;
  dist: number;
}

export function getActiveCivilianDistress(enemies: FlightEntity[], now: number): CivilianDistressContact[] {
  return enemies
    .filter((ship) => hasActiveCivilianDistress(ship, now))
    .map((civilian) => {
      const threat = enemies.find((candidate) => candidate.id === civilian.distressThreatId && candidate.hull > 0 && candidate.deathTimer === undefined && isCivilianDistressThreat(candidate));
      return threat
        ? {
            civilian,
            threat,
            dist: distance(civilian.position, threat.position)
          }
        : undefined;
    })
    .filter((contact): contact is CivilianDistressContact => !!contact)
    .sort((a, b) => a.dist - b.dist);
}

export function getCivilianDistressForPatrol(ship: FlightEntity, enemies: FlightEntity[], now: number): CivilianDistressContact | undefined {
  if (ship.role !== "patrol" || ship.hull <= 0 || ship.deathTimer !== undefined) return undefined;
  return getActiveCivilianDistress(enemies, now)
    .map((contact) => ({
      ...contact,
      dist: Math.min(distance(ship.position, contact.civilian.position), distance(ship.position, contact.threat.position))
    }))
    .filter((contact) => contact.dist < CIVILIAN_DISTRESS_PATROL_RANGE)
    .sort((a, b) => a.dist - b.dist)[0];
}

export function hasLocalCombatThreat(ship: FlightEntity, enemies: FlightEntity[], now?: number): boolean {
  if (now !== undefined && hasActiveCivilianDistress(ship, now)) return true;
  return enemies.some((candidate) => {
    if (candidate.id === ship.id || candidate.hull <= 0 || candidate.deathTimer !== undefined) return false;
    const close = distance(candidate.position, ship.position) < 780;
    if (!close) return false;
    if (ship.role === "smuggler" && candidate.role === "patrol") return true;
    return candidate.role === "pirate" || candidate.role === "drone" || candidate.role === "relay" || !!candidate.storyTarget;
  });
}

function nearestConvoyThreat(convoy: ConvoyEntity, enemies: FlightEntity[]): { ship: FlightEntity; dist: number } | undefined {
  return enemies
    .filter((ship) => ship.hull > 0 && ship.deathTimer === undefined && (isPatrolSupportThreat(ship) || ship.aiTargetId === convoy.id))
    .map((ship) => ({ ship, dist: distance(ship.position, convoy.position) }))
    .filter((candidate) => candidate.dist < 840 || candidate.ship.aiTargetId === convoy.id)
    .sort((a, b) => a.dist - b.dist)[0];
}

export function advanceConvoyEntity(
  convoy: ConvoyEntity,
  enemies: FlightEntity[],
  delta: number,
  now: number
): { convoy: ConvoyEntity; fire?: ConvoyFireRequest } {
  if (convoy.arrived || convoy.hull <= 0) return { convoy };
  const toDestination = sub(convoy.destinationPosition, convoy.position);
  const distToDestination = distance(convoy.position, convoy.destinationPosition);
  if (distToDestination < 170) {
    return { convoy: { ...convoy, arrived: true, status: "arrived", velocity: [0, 0, 0], threatId: undefined } };
  }

  const threat = nearestConvoyThreat(convoy, enemies);
  const recentlyDamaged = now - convoy.lastDamageAt < 4.5;
  const status: ConvoyEntity["status"] = threat || recentlyDamaged
    ? (threat && threat.dist < 520) || recentlyDamaged
      ? "distress"
      : "under-attack"
    : "en-route";
  const routeDirection = normalize(toDestination);
  const lateral = normalize([routeDirection[2], 0, -routeDirection[0]]);
  const evasiveSign = threat && threat.ship.position[0] > convoy.position[0] ? -1 : 1;
  const direction = status === "en-route" ? routeDirection : normalize(add(routeDirection, scale(lateral, 0.34 * evasiveSign)));
  const speed = status === "distress" ? 92 : status === "under-attack" ? 110 : 128;
  const velocity = scale(direction, speed);
  const fireCooldown = (convoy.fireCooldown ?? 0) - delta;
  const canFire = !!threat && threat.dist < 620 && fireCooldown <= 0;
  const next = regenerateShield(
    {
      ...convoy,
      velocity,
      position: add(convoy.position, scale(velocity, delta)),
      status,
      threatId: threat?.ship.id,
      distressCalledAt: status === "distress" ? convoy.distressCalledAt ?? now : convoy.distressCalledAt,
      fireCooldown: canFire ? 0.9 + Math.random() * 0.45 : fireCooldown
    },
    convoy.maxShield,
    now,
    delta,
    5
  );
  return {
    convoy: next,
    fire: canFire && threat
      ? {
          position: next.position,
          targetPosition: threat.ship.position,
          targetId: threat.ship.id,
          damage: 8,
          projectileSpeed: 430
        }
      : undefined
  };
}

export function shouldRequestPatrolSupport(ship: FlightEntity, enemies: FlightEntity[], convoys: ConvoyEntity[], now: number): boolean {
  if (ship.role !== "patrol" || ship.supportWing || ship.hull <= 0 || ship.deathTimer !== undefined) return false;
  if ((ship.supportCooldownUntil ?? -Infinity) > now) return false;
  const hullRatio = ship.hull / ship.maxHull;
  if (hullRatio < 0.45 && ship.aiState !== "patrol") return true;
  if (ship.aiTargetId === "player" && ship.aiState === "attack") return true;
  const target = enemies.find((enemy) => enemy.id === ship.aiTargetId);
  if (target && isPatrolSupportThreat(target)) return true;
  if (getCivilianDistressForPatrol(ship, enemies, now)) return true;
  return convoys.some((convoy) => convoy.status === "distress" && distance(ship.position, convoy.position) < 900);
}

export function createPatrolSupportRequest({
  ship,
  enemies,
  convoys,
  systemId,
  risk,
  playerPosition,
  now,
  existingSpawnCount
}: {
  ship: FlightEntity;
  enemies: FlightEntity[];
  convoys: ConvoyEntity[];
  systemId: string;
  risk: number;
  playerPosition: Vec3;
  now: number;
  existingSpawnCount: number;
}): PatrolSupportRequest | undefined {
  if (!shouldRequestPatrolSupport(ship, enemies, convoys, now)) return undefined;
  const civilianDistress = getCivilianDistressForPatrol(ship, enemies, now);
  const activeSupportCount = enemies.filter((enemy) => enemy.supportWing && enemy.hull > 0 && enemy.deathTimer === undefined).length + existingSpawnCount;
  const desiredSupportCount = risk >= 0.55 || !!civilianDistress || convoys.some((convoy) => convoy.status === "distress") ? 2 : 1;
  const spawnCount = Math.max(0, Math.min(desiredSupportCount, MAX_PATROL_SUPPORT_WINGS - activeSupportCount));
  if (spawnCount <= 0) return undefined;
  const supportTargetId = ship.aiTargetId ?? civilianDistress?.threat.id;
  const targetShip = enemies.find((enemy) => enemy.id === supportTargetId);
  const anchor = targetShip?.position ?? (supportTargetId === "player" ? playerPosition : ship.position);
  const ships = Array.from({ length: spawnCount }, (_, index) =>
    createPatrolSupportShip(systemId, activeSupportCount + index, supportTargetId, anchor, now)
  );
  return {
    ships,
    effectPositions: ships.map((support) => support.position),
    message: supportTargetId === "player"
      ? "Patrol support wing has marked you hostile."
      : civilianDistress
        ? "Patrol support wing responding to distress."
        : "Patrol support wing inbound.",
    requestedShip: {
      ...ship,
      supportRequestedAt: now,
      supportCooldownUntil: now + PATROL_SUPPORT_COOLDOWN_SECONDS
    }
  };
}

export function applyShipHitEffectInput(ship: FlightEntity, damage: number, now: number) {
  const shielded = ship.shield > 0;
  return {
    shielded,
    damaged: applyDamage(ship, damage, now)
  };
}

export function createDestroyedShipLoot(ship: FlightEntity, systemId: string): LootEntity[] {
  return lootDropsForDestroyedShip(ship, systemId) as LootEntity[];
}

export function createDestroyedShipEffect(ship: FlightEntity) {
  return {
    id: projectileId("explosion"),
    kind: "explosion" as const,
    position: ship.position,
    color: ship.role === "pirate" ? "#ff784f" : ship.role === "patrol" ? "#64e4ff" : "#ffd166",
    secondaryColor: "#ffd166",
    label: "Destroyed",
    particleCount: 22,
    spread: 58,
    size: 46,
    life: 0.85,
    maxLife: 0.85,
    velocity: [0, 6, 0] as Vec3
  };
}

export function lootNameForEquipmentDrop(equipmentId: keyof typeof equipmentById): string {
  return equipmentById[equipmentId]?.name ?? equipmentId;
}
