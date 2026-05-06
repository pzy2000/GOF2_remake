import type { Vec3 } from "../types/game";

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: Vec3, value: number): Vec3 => [a[0] * value, a[1] * value, a[2] * value];
export const length = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
export const distance = (a: Vec3, b: Vec3): number => length(sub(a, b));
export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export function normalize(a: Vec3): Vec3 {
  const len = length(a);
  return len <= 0.0001 ? [0, 0, -1] : [a[0] / len, a[1] / len, a[2] / len];
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

export function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

export function forwardFromRotation(rotation: Vec3): Vec3 {
  const [pitch, yaw] = rotation;
  const cp = Math.cos(pitch);
  return normalize([Math.sin(yaw) * cp, -Math.sin(pitch), -Math.cos(yaw) * cp]);
}

export function rightFromRotation(rotation: Vec3): Vec3 {
  const yaw = rotation[1] + Math.PI / 2;
  return normalize([Math.sin(yaw), 0, -Math.cos(yaw)]);
}

export function orbitPoint(seed: number, radius: number): Vec3 {
  return [Math.sin(seed * 3.17) * radius, Math.cos(seed * 1.61) * radius * 0.38, -420 - Math.cos(seed * 2.41) * radius];
}
