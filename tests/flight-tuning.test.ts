import { describe, expect, it } from "vitest";
import { defaultFlightTuning, isAfterburnerAvailable, resolveCameraFov, resolveCameraOffset } from "../src/systems/flightTuning";

describe("flight tuning", () => {
  it("centralizes afterburner thresholds and camera speed response", () => {
    expect(isAfterburnerAvailable(defaultFlightTuning.motion.afterburnerMinEnergy + 1, 0.2)).toBe(true);
    expect(isAfterburnerAvailable(defaultFlightTuning.motion.afterburnerMinEnergy, 0.2)).toBe(false);
    expect(resolveCameraFov(0, false)).toBe(defaultFlightTuning.camera.baseFov);
    expect(resolveCameraFov(400, true)).toBeGreaterThan(resolveCameraFov(400, false));
  });

  it("pulls the chase camera farther back at speed", () => {
    const idle = resolveCameraOffset([0, 0, -1], 0, false, false);
    const boosted = resolveCameraOffset([0, 0, -1], 300, true, false);
    expect(boosted[2]).toBeGreaterThan(idle[2]);
    expect(boosted[1]).toBeGreaterThan(idle[1]);
  });
});
