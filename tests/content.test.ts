import { describe, expect, it } from "vitest";
import { commodities, missionTemplates, ships, stationById, stations, systems } from "../src/data/world";
import { validateContentData } from "../src/data/validate";
import { createInitialMarketState } from "../src/systems/economy";

function idsAreUnique(ids: string[]): boolean {
  return new Set(ids).size === ids.length;
}

describe("content data", () => {
  it("keeps primary content ids unique", () => {
    expect(idsAreUnique(commodities.map((item) => item.id))).toBe(true);
    expect(idsAreUnique(ships.map((item) => item.id))).toBe(true);
    expect(idsAreUnique(stations.map((item) => item.id))).toBe(true);
    expect(idsAreUnique(systems.map((item) => item.id))).toBe(true);
    expect(idsAreUnique(missionTemplates.map((item) => item.id))).toBe(true);
  });

  it("passes cross-reference validation", () => {
    const result = validateContentData();
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("initial market state covers every station and commodity", () => {
    const market = createInitialMarketState();
    for (const station of stations) {
      for (const commodity of commodities) {
        expect(market[station.id]?.[commodity.id]).toBeDefined();
      }
    }
  });

  it("system station lists point back to their owning system", () => {
    for (const system of systems) {
      for (const stationId of system.stationIds) {
        expect(stationById[stationId]?.systemId).toBe(system.id);
      }
    }
  });
});
