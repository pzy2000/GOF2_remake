import { describe, expect, it } from "vitest";
import { commodities, contrabandLawBySystem, dialogueScenes, dialogueSpeakers, equipmentById, equipmentList, explorationSignals, glassWakeProtocol, missionTemplates, planetById, planets, ships, stationById, stations, systems } from "../src/data/world";
import { fallbackAssetManifest } from "../src/systems/assets";
import { createAsteroidsForSystem } from "../src/systems/asteroids";
import { getEquipmentSlotUsage, getShipSlotCapacity } from "../src/systems/equipment";
import { distance } from "../src/systems/math";
import { validateContentData } from "../src/data/validate";
import { createInitialMarketState } from "../src/systems/economy";
import type { PlanetDefinition, StationDefinition } from "../src/types/game";

function idsAreUnique(ids: string[]): boolean {
  return new Set(ids).size === ids.length;
}

const STATION_VISUAL_RADIUS = 150;
const PLANET_PAIR_CLEARANCE = 160;
const JUMP_GATE_VISUAL_RADIUS = 140;
const ASTEROID_PLANET_CLEARANCE = 100;
const STATION_PAIR_DISTANCE = 300;

function formatClearance(clearance: number): string {
  return clearance.toFixed(1);
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
    expect(idsAreUnique(dialogueSpeakers.map((item) => item.id))).toBe(true);
    expect(idsAreUnique(dialogueScenes.map((item) => item.id))).toBe(true);
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
      for (const equipment of equipmentList) {
        expect(market[station.id]?.[equipment.id]).toBeDefined();
      }
    }
  });

  it("assigns tech levels to stations, commodities, and equipment", () => {
    for (const station of stations) expect(station.techLevel).toBeGreaterThanOrEqual(1);
    for (const commodity of commodities) expect(commodity.techLevel).toBeGreaterThanOrEqual(1);
    for (const equipment of equipmentList) {
      expect(equipment.techLevel).toBeGreaterThanOrEqual(1);
      expect(equipment.marketPrice).toBeGreaterThan(0);
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

  it("keeps flight-space celestial layouts free of visual overlaps", () => {
    const violations: string[] = [];
    for (const system of systems) {
      const systemPlanets = system.planetIds.map((planetId) => planetById[planetId]).filter(Boolean) as PlanetDefinition[];
      const systemStations = stations.filter((station) => station.systemId === system.id) as StationDefinition[];

      for (const station of systemStations) {
        for (const planet of systemPlanets) {
          const clearance = distance(station.position, planet.position) - planet.radius - STATION_VISUAL_RADIUS;
          if (clearance <= 0) violations.push(`${system.id}: station ${station.id} overlaps planet ${planet.id} by ${formatClearance(clearance)}`);
        }
      }

      for (let left = 0; left < systemPlanets.length; left += 1) {
        for (let right = left + 1; right < systemPlanets.length; right += 1) {
          const first = systemPlanets[left];
          const second = systemPlanets[right];
          const clearance = distance(first.position, second.position) - first.radius - second.radius;
          if (clearance <= PLANET_PAIR_CLEARANCE) violations.push(`${system.id}: planets ${first.id} and ${second.id} are too close by ${formatClearance(clearance)}`);
        }
      }

      for (const planet of systemPlanets) {
        const gateClearance = distance(system.jumpGatePosition, planet.position) - planet.radius - JUMP_GATE_VISUAL_RADIUS;
        if (gateClearance <= 0) violations.push(`${system.id}: jump gate overlaps planet ${planet.id} by ${formatClearance(gateClearance)}`);
      }

      for (const asteroid of createAsteroidsForSystem(system.id, system.risk)) {
        for (const planet of systemPlanets) {
          const clearance = distance(asteroid.position, planet.position) - planet.radius - asteroid.radius;
          if (clearance <= ASTEROID_PLANET_CLEARANCE) {
            violations.push(`${system.id}: asteroid ${asteroid.id} is too close to planet ${planet.id} by ${formatClearance(clearance)}`);
          }
        }
      }

      for (let left = 0; left < systemStations.length; left += 1) {
        for (let right = left + 1; right < systemStations.length; right += 1) {
          const first = systemStations[left];
          const second = systemStations[right];
          const clearance = distance(first.position, second.position) - STATION_PAIR_DISTANCE;
          if (clearance <= 0) violations.push(`${system.id}: stations ${first.id} and ${second.id} overlap by ${formatClearance(clearance)}`);
        }
      }
    }

    expect(violations).toEqual([]);
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

  it("defines multi-stage Quiet Signals exploration chains for every system", () => {
    const signalIds = new Set(explorationSignals.map((signal) => signal.id));
    const missionIds = new Set(missionTemplates.map((mission) => mission.id));
    for (const system of systems) {
      const systemSignals = explorationSignals.filter((signal) => signal.systemId === system.id);
      expect(systemSignals.length).toBeGreaterThanOrEqual(2);
      expect(systemSignals.some((signal) => (signal.prerequisiteSignalIds ?? []).length === 0)).toBe(true);
    }
    for (const signal of explorationSignals) {
      for (const prerequisiteId of signal.prerequisiteSignalIds ?? []) {
        expect(signalIds.has(prerequisiteId)).toBe(true);
        expect(prerequisiteId).not.toBe(signal.id);
      }
      if (signal.stage !== undefined) expect(signal.stage).toBeGreaterThanOrEqual(1);
      if (signal.storyInfluence) expect(missionIds.has(signal.storyInfluence.missionId)).toBe(true);
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
    expect(glassWakeProtocol.epilogue).toContain("Quiet Crown core");
    const missionById = new Map(missionTemplates.map((mission) => [mission.id, mission]));
    for (const [index, chapter] of glassWakeProtocol.chapters.entries()) {
      const mission = missionById.get(chapter.missionId);
      expect(mission).toBeDefined();
      expect(mission?.storyArcId).toBe(glassWakeProtocol.id);
      expect(mission?.storyChapterId).toBe(chapter.id);
      expect(chapter.fieldObjective.length).toBeGreaterThan(20);
      expect(chapter.reveal.length).toBeGreaterThan(20);
      if (index === 0) {
        expect(mission?.prerequisiteMissionIds ?? []).toEqual([]);
        expect(mission?.storyEncounter?.visualCue?.label).toBe("GHOST PING");
      } else {
        expect(mission?.prerequisiteMissionIds).toContain(glassWakeProtocol.chapters[index - 1].missionId);
        expect(mission?.storyEncounter?.targets.length).toBeGreaterThan(0);
        expect(mission?.storyEncounter?.requiredTargetIds.length).toBeGreaterThan(0);
      }
    }
  });

  it("defines voiced dialogue coverage for story chapters and exploration signals", () => {
    const speakerIds = new Set(dialogueSpeakers.map((speaker) => speaker.id));
    for (const speaker of dialogueSpeakers) {
      expect(fallbackAssetManifest.speakerPortraits[speaker.id]).toMatch(/^\/assets\/generated\/portraits\/.+\.webp$/);
    }
    for (const scene of dialogueScenes) {
      expect(scene.lines.length).toBeGreaterThan(0);
      expect(scene.lines.every((line) => speakerIds.has(line.speakerId) && line.text.trim().length > 0)).toBe(true);
    }
    for (const chapter of glassWakeProtocol.chapters) {
      expect(dialogueScenes.some((scene) => scene.trigger.kind === "story-accept" && scene.trigger.missionId === chapter.missionId)).toBe(true);
      expect(dialogueScenes.some((scene) => scene.trigger.kind === "story-complete" && scene.trigger.missionId === chapter.missionId)).toBe(true);
    }
    for (const signal of explorationSignals) {
      expect(dialogueScenes.filter((scene) => scene.trigger.kind === "exploration-complete" && scene.trigger.signalId === signal.id)).toHaveLength(1);
    }
  });
});
