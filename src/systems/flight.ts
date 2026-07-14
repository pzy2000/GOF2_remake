import type { PlayerState, ShipStats, Vec3 } from "../types/game";
import { add, clamp, lerp, scale } from "./math";

export const MAX_SAFE_FLIGHT_NUMBER = Number.MAX_SAFE_INTEGER;

const ZERO_VEC3: Vec3 = [0, 0, 0];

export function isFiniteFlightNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= MAX_SAFE_FLIGHT_NUMBER;
}

export function sanitizeFlightNumber(
  value: unknown,
  fallback = 0,
  min = -MAX_SAFE_FLIGHT_NUMBER,
  max = MAX_SAFE_FLIGHT_NUMBER
): number {
  const safeMin = isFiniteFlightNumber(min) ? min : -MAX_SAFE_FLIGHT_NUMBER;
  const safeMax = isFiniteFlightNumber(max) ? max : MAX_SAFE_FLIGHT_NUMBER;
  const lower = Math.min(safeMin, safeMax);
  const upper = Math.max(safeMin, safeMax);
  const safeFallback = typeof fallback === "number" && Number.isFinite(fallback) ? fallback : 0;
  const source = typeof value === "number" && Number.isFinite(value) ? value : safeFallback;
  return clamp(source, lower, upper);
}

export function isFiniteFlightVec3(value: unknown): value is Vec3 {
  return Array.isArray(value) && value.length === 3 && value.every(isFiniteFlightNumber);
}

export function sanitizeFlightVec3(value: unknown, fallback: Vec3 = ZERO_VEC3): Vec3 {
  const safeFallback = isFiniteFlightVec3(fallback) ? fallback : ZERO_VEC3;
  if (!Array.isArray(value)) return [...safeFallback];
  return [
    isFiniteFlightNumber(value[0]) ? value[0] : safeFallback[0],
    isFiniteFlightNumber(value[1]) ? value[1] : safeFallback[1],
    isFiniteFlightNumber(value[2]) ? value[2] : safeFallback[2]
  ];
}

function sameVec3(a: Vec3, b: Vec3): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

function nonNegativeFallback(value: unknown, fallback: number): number {
  return sanitizeFlightNumber(value, fallback, 0, MAX_SAFE_FLIGHT_NUMBER);
}

/**
 * Repairs the numeric fields consumed by the real-time flight loop. This is a
 * final runtime boundary for in-memory state (including multiplayer/dev-hook
 * updates); persisted saves are validated separately before hydration.
 */
export function sanitizePlayerFlightState(player: PlayerState, fallbackStats?: Partial<ShipStats>): PlayerState {
  const rawStats = player.stats as unknown as Record<string, unknown>;
  const hullLimit = nonNegativeFallback(rawStats?.hull, nonNegativeFallback(fallbackStats?.hull, nonNegativeFallback(player.hull, 0)));
  const shieldLimit = nonNegativeFallback(rawStats?.shield, nonNegativeFallback(fallbackStats?.shield, nonNegativeFallback(player.shield, 0)));
  const energyLimit = nonNegativeFallback(rawStats?.energy, nonNegativeFallback(fallbackStats?.energy, nonNegativeFallback(player.energy, 0)));
  const speed = nonNegativeFallback(rawStats?.speed, nonNegativeFallback(fallbackStats?.speed, 0));
  const handling = nonNegativeFallback(rawStats?.handling, nonNegativeFallback(fallbackStats?.handling, 1));
  const position = sanitizeFlightVec3(player.position);
  const velocity = sanitizeFlightVec3(player.velocity);
  const rotation = sanitizeFlightVec3(player.rotation);
  const throttle = sanitizeFlightNumber(player.throttle, 0, 0, 1);
  const hull = sanitizeFlightNumber(player.hull, hullLimit, 0, hullLimit);
  const shield = sanitizeFlightNumber(player.shield, shieldLimit, 0, shieldLimit);
  const energy = sanitizeFlightNumber(player.energy, energyLimit, 0, energyLimit);
  const lastDamageAt = sanitizeFlightNumber(player.lastDamageAt, 0);
  const statsChanged =
    player.stats.hull !== hullLimit ||
    player.stats.shield !== shieldLimit ||
    player.stats.energy !== energyLimit ||
    player.stats.speed !== speed ||
    player.stats.handling !== handling;
  const changed =
    statsChanged ||
    !sameVec3(player.position, position) ||
    !sameVec3(player.velocity, velocity) ||
    !sameVec3(player.rotation, rotation) ||
    player.throttle !== throttle ||
    player.hull !== hull ||
    player.shield !== shield ||
    player.energy !== energy ||
    player.lastDamageAt !== lastDamageAt;

  if (!changed) return player;
  return {
    ...player,
    stats: statsChanged
      ? { ...player.stats, hull: hullLimit, shield: shieldLimit, energy: energyLimit, speed, handling }
      : player.stats,
    position,
    velocity,
    rotation,
    throttle,
    hull,
    shield,
    energy,
    lastDamageAt
  };
}

export interface VelocityIntegrationInput {
  currentVelocity: Vec3;
  forward: Vec3;
  targetThrottle: number;
  maxSpeed: number;
  afterburning: boolean;
  delta: number;
  acceleration?: number;
  damping?: number;
  afterburnerMultiplier?: number;
}

export function integrateVelocity({
  currentVelocity,
  forward,
  targetThrottle,
  maxSpeed,
  afterburning,
  delta,
  acceleration = 3.2,
  damping = 0.82,
  afterburnerMultiplier = 1.88
}: VelocityIntegrationInput): Vec3 {
  const boostMultiplier = afterburning ? afterburnerMultiplier : 1;
  const desired = scale(forward, maxSpeed * clamp(targetThrottle, 0, 1) * boostMultiplier);
  const follow = 1 - Math.exp(-acceleration * delta);
  const steered = [
    lerp(currentVelocity[0], desired[0], follow),
    lerp(currentVelocity[1], desired[1], follow),
    lerp(currentVelocity[2], desired[2], follow)
  ] as Vec3;
  const drag = Math.pow(damping, delta);
  return add(scale(steered, drag), scale(desired, 1 - drag));
}
