import type { Vec3 } from "../types/game";
import { add, clamp, lerp, scale } from "./math";

export interface VelocityIntegrationInput {
  currentVelocity: Vec3;
  forward: Vec3;
  targetThrottle: number;
  maxSpeed: number;
  afterburning: boolean;
  delta: number;
  acceleration?: number;
  damping?: number;
}

export function integrateVelocity({
  currentVelocity,
  forward,
  targetThrottle,
  maxSpeed,
  afterburning,
  delta,
  acceleration = 3.2,
  damping = 0.82
}: VelocityIntegrationInput): Vec3 {
  const boostMultiplier = afterburning ? 1.88 : 1;
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
