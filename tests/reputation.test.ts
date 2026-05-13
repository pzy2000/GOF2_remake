import { describe, expect, it } from "vitest";
import { createInitialReputation, reputationLabel, updateReputation } from "../src/systems/reputation";

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
});
