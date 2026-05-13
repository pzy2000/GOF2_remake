import { describe, expect, it } from "vitest";
import { blueprintDefinitions, commodities, contrabandLawBySystem, dialogueSceneById, dialogueScenes, dialogueSpeakerById, dialogueSpeakers, equipmentById, equipmentList, explorationSignals, glassWakeProtocol, missionTemplates, planetById, planets, ships, stationById, stations, systems } from "../src/data/world";
import { EXPLORATION_CHAIN_BLUEPRINT_REWARDS } from "../src/systems/explorationObjectives";
import { fallbackAssetManifest } from "../src/systems/assets";
import { createAsteroidsForSystem } from "../src/systems/asteroids";
import { getEquipmentSlotUsage, getShipSlotCapacity } from "../src/systems/equipment";
import { distance } from "../src/systems/math";
import { validateContentData } from "../src/data/validate";
import { createInitialMarketState } from "../src/systems/economy";
import { voiceProfiles } from "../src/systems/voice";
import { localizeDialogueLineText, localizeDialogueSceneTitle, localizeDialogueSpeakerName, localizeDialogueSpeakerRole } from "../src/systems/dialogueLocalization";
import type { PlanetDefinition, StationDefinition } from "../src/types/game";

function idsAreUnique(ids: string[]): boolean {
  return new Set(ids).size === ids.length;
}

const STATION_VISUAL_RADIUS = 150;
const PLANET_PAIR_CLEARANCE = 160;
const JUMP_GATE_VISUAL_RADIUS = 140;
const ASTEROID_PLANET_CLEARANCE = 100;
const STATION_PAIR_DISTANCE = 300;
const requiredDialogueLocales = ["zh-CN", "ja", "fr"] as const;
const runtimeDialogueLocales = ["zh-CN", "zh-TW", "ja", "fr"] as const;

function formatClearance(clearance: number): string {
  return clearance.toFixed(1);
}

function expectRequiredDialogueLocalization(localized: Partial<Record<(typeof requiredDialogueLocales)[number], string>> | undefined, label: string) {
  for (const locale of requiredDialogueLocales) {
    expect(localized?.[locale]?.trim(), `${label} missing ${locale}`).toBeTruthy();
  }
}

describe("content data", () => {
  it("keeps primary content ids unique", () => {
    expect(idsAreUnique(commodities.map((item) => item.id))).toBe(true);
    expect(idsAreUnique(ships.map((item) => item.id))).toBe(true);
    expect(idsAreUnique(planets.map((item) => item.id))).toBe(true);
    expect(idsAreUnique(stations.map((item) => item.id))).toBe(true);
    expect(idsAreUnique(systems.map((item) => item.id))).toBe(true);
    expect(idsAreUnique(missionTemplates.map((item) => item.id))).toBe(true);
    expect(idsAreUnique(blueprintDefinitions.map((item) => item.equipmentId))).toBe(true);
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
      expect(system.star.type).toBeTruthy();
      expect(system.star.assetKey).toBe(system.id);
      expect(system.star.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(system.star.lightIntensity).toBeGreaterThan(0);
      expect(system.star.visualSize).toBeGreaterThan(0);
      expect(system.star.direction).toHaveLength(3);
      expect(Math.hypot(...system.star.direction)).toBeGreaterThan(0);
      expect(fallbackAssetManifest.starSprites[system.star.assetKey]).toMatch(/^\/assets\/generated\/stars\/star-.+\.png$/);
    }
    expect(new Set(systems.map((system) => system.star.type)).size).toBe(systems.length);
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
    const chainIds = new Set(explorationSignals.map((signal) => signal.chainId ?? signal.id));
    const blueprintIds = new Set(blueprintDefinitions.map((blueprint) => blueprint.equipmentId));
    const equipmentIds = new Set(equipmentList.map((equipment) => equipment.id));
    const chains = new Map<string, typeof explorationSignals>();
    for (const signal of explorationSignals) {
      const chainId = signal.chainId ?? signal.id;
      chains.set(chainId, [...(chains.get(chainId) ?? []), signal]);
    }
    expect(chains.size).toBe(7);
    for (const signals of chains.values()) {
      expect(signals).toHaveLength(3);
      expect(signals.map((signal) => signal.stage).sort()).toEqual([1, 2, 3]);
      const deepSignal = signals.find((signal) => signal.stage === 3);
      expect(deepSignal?.requiredEquipmentAny).toEqual(expect.arrayContaining(["survey-array", "echo-nullifier"]));
      expect(deepSignal?.prerequisiteSignalIds).toHaveLength(1);
    }
    expect(stationById["obsidian-foundry"]).toMatchObject({ hidden: true, systemId: "kuro-belt", techLevel: 4 });
    expect(stationById["moth-vault"]).toMatchObject({ hidden: true, systemId: "ashen-drift", techLevel: 5 });
    expect(stationById["crownshade-observatory"]).toMatchObject({ hidden: true, systemId: "celest-gate", techLevel: 5 });
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
      for (const equipmentId of signal.requiredEquipmentAny ?? []) {
        expect(equipmentIds.has(equipmentId)).toBe(true);
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
    for (const [chainId, equipmentId] of Object.entries(EXPLORATION_CHAIN_BLUEPRINT_REWARDS)) {
      expect(chainIds.has(chainId)).toBe(true);
      expect(blueprintIds.has(equipmentId)).toBe(true);
      expect(equipmentById[equipmentId]).toBeDefined();
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

  it("keeps hidden arsenal equipment tied to real hidden stations", () => {
    const exclusiveEquipment = equipmentList.filter((equipment) => (equipment.exclusiveStationIds ?? []).length > 0);
    expect(exclusiveEquipment.map((equipment) => equipment.id).sort()).toEqual([
      "crownshade-singularity-core",
      "moth-choir-torpedo",
      "obsidian-bulwark",
      "parallax-lance"
    ]);
    for (const equipment of exclusiveEquipment) {
      expect(equipment.dropWeight ?? 0).toBe(0);
      expect(equipment.craftCost).toBeUndefined();
      for (const stationId of equipment.exclusiveStationIds ?? []) {
        const station = stationById[stationId];
        const system = systems.find((item) => item.id === station.systemId);
        expect(station.hidden).toBe(true);
        expect(system?.hiddenStationIds).toContain(stationId);
        expect(system?.stationIds).not.toContain(stationId);
      }
    }
  });

  it("defines a valid blueprint progression tree for every craftable equipment item", () => {
    const blueprintIds = new Set(blueprintDefinitions.map((blueprint) => blueprint.equipmentId));
    const craftableEquipment = equipmentList.filter((equipment) => !!equipment.craftCost);
    expect(blueprintDefinitions).toHaveLength(craftableEquipment.length);
    for (const equipment of craftableEquipment) expect(blueprintIds.has(equipment.id)).toBe(true);
    for (const path of ["combat", "defense", "exploration", "engineering"]) {
      const pathBlueprints = blueprintDefinitions.filter((blueprint) => blueprint.path === path);
      expect(pathBlueprints.some((blueprint) => blueprint.starterUnlocked)).toBe(true);
      expect(pathBlueprints.some((blueprint) => (blueprint.prerequisiteEquipmentIds ?? []).length > 0)).toBe(true);
    }
    for (const blueprint of blueprintDefinitions) {
      expect(equipmentById[blueprint.equipmentId]).toBeDefined();
      for (const prerequisiteId of blueprint.prerequisiteEquipmentIds ?? []) {
        expect(blueprintIds.has(prerequisiteId)).toBe(true);
        expect(prerequisiteId).not.toBe(blueprint.equipmentId);
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
    expect(glassWakeProtocol.chapters).toHaveLength(13);
    expect(glassWakeProtocol.epilogue).toContain("Listener Scar");
    const missionById = new Map(missionTemplates.map((mission) => [mission.id, mission]));
    for (const [index, chapter] of glassWakeProtocol.chapters.entries()) {
      const mission = missionById.get(chapter.missionId);
      expect(mission).toBeDefined();
      expect(mission?.storyArcId).toBe(glassWakeProtocol.id);
      expect(mission?.storyChapterId).toBe(chapter.id);
      expect(mission?.deadlineSeconds).toBeUndefined();
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
      for (const target of mission?.storyEncounter?.targets ?? []) {
        if (target.echoLock) {
          expect(mission?.storyEncounter?.requiredTargetIds).toContain(target.id);
          expect(target.echoLock.rangeMeters).toBeGreaterThan(0);
          expect(target.echoLock.requiredSeconds).toBeGreaterThan(0);
          expect(target.echoLock.label.trim().length).toBeGreaterThan(0);
        }
      }
    }
    expect(missionById.get("story-name-in-the-wake")?.storyEncounter?.targets.some((target) => !!target.echoLock)).toBe(true);
    expect(missionById.get("story-listener-scar")?.storyEncounter?.targets.some((target) => !!target.echoLock)).toBe(true);
  });

  it("defines voiced dialogue coverage for story chapters and exploration signals", () => {
    const speakerIds = new Set(dialogueSpeakers.map((speaker) => speaker.id));
    const voiceProfileIds = new Set(Object.keys(voiceProfiles));
    const speakerProfileIds = dialogueSpeakers.map((speaker) => speaker.voiceProfile);
    expect(idsAreUnique(speakerProfileIds)).toBe(true);
    for (const speaker of dialogueSpeakers) {
      expect(fallbackAssetManifest.speakerPortraits[speaker.id]).toMatch(/^\/assets\/generated\/portraits\/.+\.webp$/);
      expect(voiceProfileIds.has(speaker.voiceProfile)).toBe(true);
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

  it("defines required localized dialogue copy for every runtime scene", () => {
    for (const speaker of dialogueSpeakers) {
      expectRequiredDialogueLocalization(speaker.nameI18n, `speaker ${speaker.id} name`);
      expectRequiredDialogueLocalization(speaker.roleI18n, `speaker ${speaker.id} role`);
    }

    for (const scene of dialogueScenes) {
      expectRequiredDialogueLocalization(scene.titleI18n, `dialogue scene ${scene.id} title`);
      for (const [index, line] of scene.lines.entries()) {
        expectRequiredDialogueLocalization(line.textI18n, `dialogue scene ${scene.id} line ${index}`);
      }
    }
  });

  it("localizes Clean Carrier dialogue from structured copy instead of glossary fragments", () => {
    const scene = dialogueSceneById["dialogue-story-clean-carrier-accept"];
    const line = scene.lines[0];
    const speaker = dialogueSpeakerById[line.speakerId];

    for (const locale of runtimeDialogueLocales) {
      expect(localizeDialogueSceneTitle(scene, locale)).not.toBe(scene.title);
      expect(localizeDialogueLineText(line, locale)).not.toBe(line.text);
      expect(localizeDialogueSpeakerRole(speaker, locale)).not.toBe(speaker.role);
      expect(localizeDialogueSpeakerName(speaker, locale).trim()).toBeTruthy();
    }

    const simplified = `${localizeDialogueSceneTitle(scene, "zh-CN")} ${localizeDialogueLineText(line, "zh-CN")} ${localizeDialogueSpeakerRole(speaker, "zh-CN")}`;
    expect(simplified).toContain("洁净同步钥");
    expect(simplified).not.toMatch(/Clean Carrier|Helion traffic|pirate repeater|private courier|Mirr filter|traffic handler/);
  });
});
