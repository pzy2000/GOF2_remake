import { describe, expect, it } from "vitest";
import { integrateVelocity } from "../src/systems/flight";

describe("flight integration", () => {
  it("accelerates toward target speed instead of snapping instantly", () => {
    const next = integrateVelocity({
      currentVelocity: [0, 0, 0],
      forward: [0, 0, -1],
      targetThrottle: 1,
      maxSpeed: 170,
      afterburning: false,
      delta: 1 / 60
    });
    const speed = Math.hypot(...next);
    expect(speed).toBeGreaterThan(0);
    expect(speed).toBeLessThan(170);
  });

  it("afterburner produces a stronger target velocity", () => {
    const normal = integrateVelocity({
      currentVelocity: [0, 0, -60],
      forward: [0, 0, -1],
      targetThrottle: 1,
      maxSpeed: 170,
      afterburning: false,
      delta: 0.25
    });
    const boosted = integrateVelocity({
      currentVelocity: [0, 0, -60],
      forward: [0, 0, -1],
      targetThrottle: 1,
      maxSpeed: 170,
      afterburning: true,
      delta: 0.25
    });
    expect(Math.hypot(...boosted)).toBeGreaterThan(Math.hypot(...normal));
  });
});
