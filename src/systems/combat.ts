import { clamp } from "./math";

export interface Damageable {
  hull: number;
  shield: number;
  maxShield?: number;
  lastDamageAt: number;
}

export function applyDamage<T extends Damageable>(target: T, damage: number, now = 0): T {
  const shieldDamage = Math.min(target.shield, damage);
  const hullDamage = Math.max(0, damage - shieldDamage);
  return {
    ...target,
    shield: clamp(target.shield - shieldDamage, 0, target.maxShield ?? Number.MAX_SAFE_INTEGER),
    hull: Math.max(0, target.hull - hullDamage),
    lastDamageAt: now
  };
}

export function regenerateShield<T extends Damageable>(
  target: T,
  maxShield: number,
  now: number,
  delta: number,
  regenPerSecond = 10,
  delaySeconds = 5
): T {
  if (now - target.lastDamageAt < delaySeconds || target.shield >= maxShield || target.hull <= 0) {
    return target;
  }
  return {
    ...target,
    shield: clamp(target.shield + regenPerSecond * delta, 0, maxShield)
  };
}
