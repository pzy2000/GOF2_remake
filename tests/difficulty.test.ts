import { describe, expect, it } from "vitest";
import { canPirateFire, getMiningProgressIncrement, getOreHardness, getPirateSpawnCount, STARTER_GRACE_SECONDS } from "../src/systems/difficulty";

describe("difficulty tuning", () => {
  it("spawns only one pirate in Helion Reach and more in dangerous systems", () => {
    expect(getPirateSpawnCount("helion-reach", 0.18)).toBe(1);
    expect(getPirateSpawnCount("ashen-drift", 0.68)).toBeGreaterThan(getPirateSpawnCount("kuro-belt", 0.32));
  });

  it("prevents pirate fire during the starter grace window", () => {
    expect(
      canPirateFire({
        systemId: "helion-reach",
        risk: 0.18,
        now: STARTER_GRACE_SECONDS - 0.1,
        graceUntil: STARTER_GRACE_SECONDS,
        distanceToPlayer: 120,
        fireCooldown: -1
      })
    ).toBe(false);
    expect(
      canPirateFire({
        systemId: "helion-reach",
        risk: 0.18,
        now: STARTER_GRACE_SECONDS + 0.1,
        graceUntil: STARTER_GRACE_SECONDS,
        distanceToPlayer: 120,
        fireCooldown: -1
      })
    ).toBe(true);
  });

  it("makes rare ore harder and slower to mine", () => {
    expect(getOreHardness("voidglass")).toBeGreaterThan(getOreHardness("iron"));
    expect(getMiningProgressIncrement("iron", 1)).toBeGreaterThan(getMiningProgressIncrement("voidglass", 1));
  });
});
