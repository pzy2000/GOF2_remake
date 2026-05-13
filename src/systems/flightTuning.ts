import type { Vec3 } from "../types/game";

export interface FlightTuning {
  controls: {
    mouseSensitivity: number;
    rollRate: number;
    rollReturn: number;
    pitchLimit: number;
    rollLimit: number;
    throttleUpRate: number;
    throttleDownRate: number;
  };
  motion: {
    acceleration: number;
    afterburnerAcceleration: number;
    cruiseDamping: number;
    idleDamping: number;
    afterburnerMinEnergy: number;
    afterburnerMinThrottle: number;
  };
  camera: {
    chaseDistance: number;
    cinematicDistance: number;
    height: number;
    cinematicSideOffset: number;
    cinematicHeight: number;
    speedPullback: number;
    afterburnerPullback: number;
    lookAhead: number;
    lerp: number;
    baseFov: number;
    speedFovBoost: number;
    afterburnerFovBoost: number;
    hitShakeDuration: number;
    hitShakeAmplitude: number;
  };
  feedback: {
    playerHitPauseSeconds: number;
    playerHitEffectSize: number;
    missileImpactScale: number;
    bossExplosionScale: number;
  };
  performance: {
    maxVisibleProjectiles: number;
    maxVisibleEffects: number;
    maxExplosionParticles: number;
    targetDesktopFps: number;
    targetMobileFps: number;
  };
}

export const defaultFlightTuning: FlightTuning = {
  controls: {
    mouseSensitivity: 0.00235,
    rollRate: 2.65,
    rollReturn: 0.92,
    pitchLimit: 1.15,
    rollLimit: 0.9,
    throttleUpRate: 0.62,
    throttleDownRate: 0.82
  },
  motion: {
    acceleration: 3.15,
    afterburnerAcceleration: 4.9,
    cruiseDamping: 0.82,
    idleDamping: 0.52,
    afterburnerMinEnergy: 12,
    afterburnerMinThrottle: 0.08
  },
  camera: {
    chaseDistance: 92,
    cinematicDistance: 132,
    height: 30,
    cinematicSideOffset: 46,
    cinematicHeight: 56,
    speedPullback: 0.24,
    afterburnerPullback: 22,
    lookAhead: 108,
    lerp: 0.085,
    baseFov: 56,
    speedFovBoost: 7,
    afterburnerFovBoost: 5,
    hitShakeDuration: 0.65,
    hitShakeAmplitude: 1.45
  },
  feedback: {
    playerHitPauseSeconds: 0.045,
    playerHitEffectSize: 18,
    missileImpactScale: 1.45,
    bossExplosionScale: 1.6
  },
  performance: {
    maxVisibleProjectiles: 90,
    maxVisibleEffects: 120,
    maxExplosionParticles: 34,
    targetDesktopFps: 60,
    targetMobileFps: 30
  }
};

export function isAfterburnerAvailable(energy: number, throttle: number, tuning: FlightTuning = defaultFlightTuning): boolean {
  return energy > tuning.motion.afterburnerMinEnergy && throttle > tuning.motion.afterburnerMinThrottle;
}

export function resolveCameraOffset(forward: Vec3, speed: number, afterburning: boolean, cinematic: boolean, tuning: FlightTuning = defaultFlightTuning): Vec3 {
  const pullback = Math.min(64, speed * tuning.camera.speedPullback + (afterburning ? tuning.camera.afterburnerPullback : 0));
  const distance = cinematic ? tuning.camera.cinematicDistance : tuning.camera.chaseDistance;
  const height = cinematic ? tuning.camera.cinematicHeight : tuning.camera.height + pullback * 0.08;
  const side = cinematic ? tuning.camera.cinematicSideOffset : 0;
  return [
    -forward[0] * (distance + pullback) + side,
    height,
    -forward[2] * (distance + pullback)
  ];
}

export function resolveCameraFov(speed: number, afterburning: boolean, tuning: FlightTuning = defaultFlightTuning): number {
  const speedBoost = Math.min(tuning.camera.speedFovBoost, speed / 85);
  return tuning.camera.baseFov + speedBoost + (afterburning ? tuning.camera.afterburnerFovBoost : 0);
}
