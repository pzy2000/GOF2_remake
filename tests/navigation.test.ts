import { describe, expect, it } from "vitest";
import { stationById } from "../src/data/world";
import { getJumpGatePosition } from "../src/systems/autopilot";
import {
  getInitialKnownSystems,
  getNearestNavigationTarget,
  revealNeighborSystems,
  STARGATE_INTERACTION_RANGE
} from "../src/systems/navigation";

describe("navigation targets and discovery", () => {
  it("prefers the Stargate when it is closer than the station", () => {
    const gate = getJumpGatePosition("kuro-belt");
    const target = getNearestNavigationTarget("kuro-belt", gate);
    expect(target?.kind).toBe("stargate");
    expect(target?.name).toBe("Stargate");
    expect(target?.inRange).toBe(true);
  });

  it("prefers the nearest station when the ship is closer to it", () => {
    const station = stationById["kuro-deep"];
    const target = getNearestNavigationTarget("kuro-belt", station.position);
    expect(target?.kind).toBe("station");
    expect(target?.name).toBe("Kuro Deepworks");
    expect(target?.inRange).toBe(true);
  });

  it("tracks Stargate interaction range", () => {
    const gate = getJumpGatePosition("helion-reach");
    const target = getNearestNavigationTarget("helion-reach", [gate[0] + STARGATE_INTERACTION_RANGE + 8, gate[1], gate[2]]);
    expect(target?.kind).toBe("stargate");
    expect(target?.inRange).toBe(false);
  });

  it("starts with the current system and nearby systems known", () => {
    expect(getInitialKnownSystems("helion-reach")).toEqual(["helion-reach", "kuro-belt", "vantara", "mirr-vale"]);
  });

  it("reveals nearby systems after arriving through a gate", () => {
    expect(revealNeighborSystems(["helion-reach", "kuro-belt"], "kuro-belt")).toContain("ashen-drift");
  });
});
