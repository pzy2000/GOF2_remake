import { describe, expect, it } from "vitest";
import { factionNames } from "../src/data/factions";
import type { FactionId } from "../src/types/game";
import {
  applyReputationDeltas,
  createInitialReputation,
  formatReputationDeltaSummary,
  getFactionKillReputationDeltas,
  getFactionRelationship,
  getFactionRelationshipSummary,
  reputationLabel,
  updateReputation
} from "../src/systems/reputation";

describe("reputation", () => {
  it("updates faction standings with clamped values", () => {
    const start = createInitialReputation();
    expect(start.factions["ptd-company"]).toBe(100);
    const friendly = updateReputation(start, "solar-directorate", 20);
    expect(friendly.factions["solar-directorate"]).toBe(28);
    const clamped = updateReputation(friendly, "solar-directorate", 200);
    expect(clamped.factions["solar-directorate"]).toBe(100);
    expect(reputationLabel(clamped.factions["solar-directorate"])).toBe("Allied");

    const ptd = updateReputation(start, "ptd-company", -999);
    expect(ptd.factions["ptd-company"]).toBe(100);
  });

  it("defines symmetric 2v2 faction relationships with neutral non-core factions", () => {
    const factionIds = Object.keys(factionNames) as FactionId[];
    for (const observer of factionIds) {
      for (const target of factionIds) {
        expect(getFactionRelationship(observer, target)).toBe(getFactionRelationship(target, observer));
      }
    }

    expect(getFactionRelationship("solar-directorate", "mirr-collective")).toBe("friendly");
    expect(getFactionRelationship("vossari-clans", "independent-pirates")).toBe("friendly");
    expect(getFactionRelationship("solar-directorate", "vossari-clans")).toBe("enemy");
    expect(getFactionRelationship("mirr-collective", "independent-pirates")).toBe("enemy");
    expect(getFactionRelationship("free-belt-union", "solar-directorate")).toBe("neutral");
    expect(getFactionRelationship("ptd-company", "vossari-clans")).toBe("neutral");
    expect(getFactionRelationship("free-belt-union", "unknown-drones")).toBe("enemy");

    expect(getFactionRelationshipSummary("solar-directorate")).toMatchObject({
      friends: ["mirr-collective"],
      enemies: expect.arrayContaining(["vossari-clans", "independent-pirates", "unknown-drones"])
    });
  });

  it("calculates conservative kill reputation spillover for the 2v2 blocs", () => {
    const pirateKill = getFactionKillReputationDeltas({ factionId: "independent-pirates", role: "pirate" });
    expect(pirateKill.deltas).toMatchObject({
      "solar-directorate": 1,
      "mirr-collective": 1,
      "vossari-clans": -1,
      "independent-pirates": -1
    });

    const solarKill = getFactionKillReputationDeltas({ factionId: "solar-directorate", role: "patrol" });
    expect(solarKill.deltas).toMatchObject({
      "solar-directorate": -1,
      "mirr-collective": -1,
      "vossari-clans": 1,
      "independent-pirates": 1
    });

    const droneKill = getFactionKillReputationDeltas({
      factionId: "unknown-drones",
      role: "drone"
    }, {
      droneReputationUsed: {
        "solar-directorate": 2,
        "mirr-collective": 3
      }
    });
    expect(droneKill.deltas).toMatchObject({
      "solar-directorate": 1,
      "vossari-clans": 1,
      "free-belt-union": 1
    });
    expect(droneKill.deltas["mirr-collective"]).toBeUndefined();
    expect(droneKill.deltas["independent-pirates"]).toBeUndefined();
    expect(droneKill.deltas["ptd-company"]).toBeUndefined();
  });

  it("applies reputation deltas with PTD locked and formats actual standing changes", () => {
    const start = {
      factions: {
        ...createInitialReputation().factions,
        "vossari-clans": 100
      }
    };
    const result = applyReputationDeltas(start, {
      "solar-directorate": -200,
      "ptd-company": -50,
      "vossari-clans": 5,
      "independent-pirates": 1
    });

    expect(result.reputation.factions["solar-directorate"]).toBe(-100);
    expect(result.reputation.factions["ptd-company"]).toBe(100);
    expect(result.reputation.factions["vossari-clans"]).toBe(100);
    expect(result.reputation.factions["independent-pirates"]).toBe(-19);
    expect(result.appliedDeltas).toMatchObject({
      "solar-directorate": -108,
      "independent-pirates": 1
    });
    expect(formatReputationDeltaSummary(result.appliedDeltas)).toBe("Solar -108 · Pirates +1");
  });
});
