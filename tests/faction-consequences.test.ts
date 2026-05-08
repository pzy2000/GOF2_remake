import { describe, expect, it } from "vitest";
import {
  applyFactionHeatDecay,
  applyFactionIncident,
  applyFriendlyFireWarning,
  createInitialFactionHeat,
  getFactionHeatLevelLabel,
  hasActiveFriendlyFireWarning,
  incidentKindForShip,
  isFactionWanted,
  payFactionFine,
  WANTED_DURATION_SECONDS
} from "../src/systems/factionConsequences";

describe("faction consequences", () => {
  it("normalizes heat levels and decays heat without clearing unpaid fines", () => {
    let factionHeat = createInitialFactionHeat();
    const incident = applyFactionIncident({
      factionHeat,
      factionId: "solar-directorate",
      kind: "patrol-destroyed",
      subjectName: "Directorate Patrol",
      now: 10
    });
    factionHeat = incident.factionHeat;

    expect(getFactionHeatLevelLabel(incident.record)).toBe("Wanted");
    expect(isFactionWanted(factionHeat, "solar-directorate", 11)).toBe(true);

    const decayed = applyFactionHeatDecay(factionHeat, 3600, 10 + WANTED_DURATION_SECONDS + 1);
    const record = decayed.factions["solar-directorate"];
    expect(record?.heat).toBeLessThan(50);
    expect(record?.fineCredits).toBe(6000);
    expect(record?.wantedUntil).toBeUndefined();
  });

  it("warns on first friendly-fire hit and escalates while the warning is active", () => {
    let factionHeat = createInitialFactionHeat();
    const warning = applyFriendlyFireWarning(factionHeat, "free-belt-union", "Union Freighter", 5);
    factionHeat = warning.factionHeat;

    expect(hasActiveFriendlyFireWarning(factionHeat, "free-belt-union", 8)).toBe(true);
    expect(factionHeat.factions["free-belt-union"]?.heat).toBe(0);

    const kind = incidentKindForShip("freighter", false);
    expect(kind).toBe("civilian-hit");
    const incident = applyFactionIncident({
      factionHeat,
      factionId: "free-belt-union",
      kind: kind!,
      subjectName: "Union Freighter",
      now: 9
    });

    expect(incident.heatDelta).toBe(12);
    expect(incident.reputationDelta).toBe(-4);
    expect(incident.fineDelta).toBe(750);
    expect(incident.factionHeat.factions["free-belt-union"]?.warningUntil).toBeUndefined();
  });

  it("makes destroyed patrols wanted and lets fines clear wanted status", () => {
    const incident = applyFactionIncident({
      factionHeat: createInitialFactionHeat(),
      factionId: "solar-directorate",
      kind: "patrol-destroyed",
      subjectName: "Directorate Patrol",
      now: 20
    });

    expect(incident.wanted).toBe(true);
    expect(incident.record.heat).toBe(50);
    expect(incident.record.fineCredits).toBe(6000);

    const paid = payFactionFine(incident.factionHeat, "solar-directorate", 7000, 25);
    expect(paid.paid).toBe(true);
    expect(paid.credits).toBe(1000);
    expect(paid.record.fineCredits).toBe(0);
    expect(paid.record.heat).toBe(19);
    expect(isFactionWanted(paid.factionHeat, "solar-directorate", 26)).toBe(false);
  });

  it("records contraband hostile pursuit as wanted heat", () => {
    const incident = applyFactionIncident({
      factionHeat: createInitialFactionHeat(),
      factionId: "solar-directorate",
      kind: "contraband-hostile",
      now: 30
    });

    expect(incident.record.heat).toBe(45);
    expect(incident.reputationDelta).toBe(-6);
    expect(isFactionWanted(incident.factionHeat, "solar-directorate", 31)).toBe(true);
  });
});
