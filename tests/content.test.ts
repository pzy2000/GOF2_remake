import { describe, expect, it } from "vitest";
import { commodities, contrabandLawBySystem, equipmentById, explorationSignals, glassWakeProtocol, missionTemplates, planetById, planets, ships, stationById, stations, systems } from "../src/data/world";
import { fallbackAssetManifest } from "../src/systems/assets";
import { getEquipmentSlotUsage, getShipSlotCapacity } from "../src/systems/equipment";
import { validateContentData } from "../src/data/validate";
import { createInitialMarketState } from "../src/systems/economy";

function idsAreUnique(ids: string[]): boolean {
  return new Set(ids).size === ids.length;
}

describe("content data", () => {
  it("keeps primary content ids unique", () => {
    expect(idsAreUnique(commodities.map((item) => item.id))).toBe(true);
    expect(idsAreUnique(ships.map((item) => item.id))).toBe(true);
    expect(idsAreUnique(planets.map((item) => item.id))).toBe(true);
    expect(idsAreUnique(stations.map((item) => item.id))).toBe(true);
    expect(idsAreUnique(systems.map((item) => item.id))).toBe(true);
    expect(idsAreUnique(missionTemplates.map((item) => item.id))).toBe(true);
    expect(idsAreUnique(explorationSignals.map((item) => item.id))).toBe(true);
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

  it("models every existing system with valid planets and one station per planet", () => {
    expect(planets).toHaveLength(27);
    for (const system of systems) {
      if (system.id === "ptd-home") {
        expect(system.planetIds).toEqual(["ptd-home-world"]);
        expect(system.stationIds).toEqual(["ptd-home"]);
      } else {
        expect(system.planetIds.length).toBeGreaterThanOrEqual(3);
        expect(system.planetIds.length).toBeLessThanOrEqual(8);
      }
      expect(system.stationIds).toHaveLength(system.planetIds.length);
      for (const planetId of system.planetIds) {
        const planet = planetById[planetId];
        const station = stationById[planet.stationId];
        expect(planet.systemId).toBe(system.id);
        expect(station.systemId).toBe(system.id);
        expect(station.planetId).toBe(planet.id);
      }
    }
  });

  it("has generated skybox and planet texture manifest entries for the expanded catalog", () => {
    for (const system of systems) {
      expect(fallbackAssetManifest.systemSkyboxes[system.skyboxKey]).toMatch(/\.webp$/);
    }
    for (const planet of planets) {
      expect(fallbackAssetManifest.planetTextures[planet.textureKey]).toMatch(/\.webp$/);
    }
  });

  it("models PTD Home as the single home ship-storage station", () => {
    const system = systems.find((item) => item.id === "ptd-home")!;
    const planet = planetById["ptd-home-world"];
    const station = stationById["ptd-home"];
    expect(system.name).toBe("PTD Home");
    expect(planet.name).toBe("PTD Home");
    expect(station.name).toBe("PTD Home");
    expect(station.systemId).toBe(system.id);
    expect(station.planetId).toBe(planet.id);
  });

  it("defines one Quiet Signals exploration target for every system", () => {
    expect(explorationSignals).toHaveLength(systems.length);
    for (const system of systems) {
      expect(explorationSignals.filter((signal) => signal.systemId === system.id)).toHaveLength(1);
    }
    for (const signal of explorationSignals) {
      for (const commodityId of Object.keys(signal.rewards.cargo ?? {})) {
        expect(commodities.some((commodity) => commodity.id === commodityId)).toBe(true);
      }
      if (signal.revealStationId) {
        const station = stationById[signal.revealStationId];
        const system = systems.find((item) => item.id === signal.systemId);
        expect(station.hidden).toBe(true);
        expect(system?.stationIds).not.toContain(station.id);
        expect(system?.hiddenStationIds).toContain(station.id);
      }
    }
  });

  it("keeps stock ship loadouts within their slot capacities", () => {
    for (const ship of ships) {
      const usage = getEquipmentSlotUsage(ship.equipment);
      const capacity = getShipSlotCapacity(ship.stats);
      expect(usage.primary).toBeLessThanOrEqual(capacity.primary);
      expect(usage.secondary).toBeLessThanOrEqual(capacity.secondary);
      expect(usage.utility).toBeLessThanOrEqual(capacity.utility);
      expect(usage.defense).toBeLessThanOrEqual(capacity.defense);
      expect(usage.engineering).toBeLessThanOrEqual(capacity.engineering);
    }
  });

  it("uses valid commodities for equipment blueprint material costs", () => {
    for (const equipment of Object.values(equipmentById)) {
      for (const commodityId of Object.keys(equipment.craftCost?.cargo ?? {})) {
        expect(commodities.some((commodity) => commodity.id === commodityId)).toBe(true);
      }
    }
  });

  it("defines contraband law for every system and describes it on Illegal Contraband", () => {
    for (const system of systems) {
      expect(contrabandLawBySystem[system.id]).toBeDefined();
    }
    const contraband = commodities.find((commodity) => commodity.id === "illegal-contraband");
    expect(contraband?.description).toContain("Helion Reach");
    expect(contraband?.description).toContain("PTD Home");
  });

  it("connects every Glass Wake chapter to a valid story mission chain", () => {
    expect(glassWakeProtocol.chapters).toHaveLength(8);
    const missionById = new Map(missionTemplates.map((mission) => [mission.id, mission]));
    for (const [index, chapter] of glassWakeProtocol.chapters.entries()) {
      const mission = missionById.get(chapter.missionId);
      expect(mission).toBeDefined();
      expect(mission?.storyArcId).toBe(glassWakeProtocol.id);
      expect(mission?.storyChapterId).toBe(chapter.id);
      if (index === 0) {
        expect(mission?.prerequisiteMissionIds ?? []).toEqual([]);
      } else {
        expect(mission?.prerequisiteMissionIds).toContain(glassWakeProtocol.chapters[index - 1].missionId);
      }
    }
  });
});
