import type { CommodityId, EquipmentId, FactionId } from "../types/game";
import { commodities, commodityById } from "./commodities";
import { contrabandLawBySystem } from "./contraband";
import { dialogueScenes, dialogueSpeakers } from "./dialogues";
import { blueprintDefinitions, equipmentById, equipmentList } from "./equipment";
import { explorationSignals } from "./exploration";
import { factionNames } from "./factions";
import { missionTemplates } from "./missions";
import { ships } from "./ships";
import { storyArcs } from "./story";
import { planetById, planets, stationById, stations, systemById, systems } from "./systems";

export interface ContentValidationResult {
  ok: boolean;
  errors: string[];
}

function requireUnique(ids: string[], label: string, errors: string[]) {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) errors.push(`Duplicate ${label} id: ${id}`);
    seen.add(id);
  }
}

function hasFaction(id: string): id is FactionId {
  return id in factionNames;
}

function hasCommodity(id: string): id is CommodityId {
  return id in commodityById;
}

function hasEquipment(id: string): id is EquipmentId {
  return id in equipmentById;
}

const requiredDialogueLocales = ["zh-CN", "ja", "fr"] as const;

function requireDialogueLocalization(localized: Partial<Record<(typeof requiredDialogueLocales)[number], string>> | undefined, label: string, errors: string[]) {
  for (const locale of requiredDialogueLocales) {
    if (!localized?.[locale]?.trim()) errors.push(`${label} is missing ${locale} localization`);
  }
}

export function validateContentData(): ContentValidationResult {
  const errors: string[] = [];

  requireUnique(commodities.map((item) => item.id), "commodity", errors);
  requireUnique(ships.map((item) => item.id), "ship", errors);
  requireUnique(planets.map((item) => item.id), "planet", errors);
  requireUnique(stations.map((item) => item.id), "station", errors);
  requireUnique(systems.map((item) => item.id), "system", errors);
  requireUnique(missionTemplates.map((item) => item.id), "mission", errors);
  requireUnique(equipmentList.map((item) => item.id), "equipment", errors);
  requireUnique(blueprintDefinitions.map((item) => item.equipmentId), "blueprint", errors);
  requireUnique(explorationSignals.map((item) => item.id), "exploration signal", errors);
  requireUnique(dialogueSpeakers.map((item) => item.id), "dialogue speaker", errors);
  requireUnique(dialogueScenes.map((item) => item.id), "dialogue scene", errors);
  requireUnique(storyArcs.map((item) => item.id), "story arc", errors);
  for (const arc of storyArcs) {
    requireUnique(arc.chapters.map((item) => item.id), `${arc.id} chapter`, errors);
    requireUnique(arc.chapters.map((item) => item.missionId), `${arc.id} chapter mission`, errors);
  }

  const missionIds = new Set(missionTemplates.map((mission) => mission.id));
  const speakerIds = new Set(dialogueSpeakers.map((speaker) => speaker.id));
  const explorationSignalIds = new Set(explorationSignals.map((signal) => signal.id));

  for (const ship of ships) {
    for (const equipmentId of ship.equipment) {
      if (!hasEquipment(equipmentId)) errors.push(`Ship ${ship.id} references unknown equipment ${equipmentId}`);
    }
  }

  for (const station of stations) {
    if (station.techLevel < 1 || station.techLevel > 5) errors.push(`Station ${station.id} has invalid tech level`);
    if (!systemById[station.systemId]) errors.push(`Station ${station.id} references unknown system ${station.systemId}`);
    const planet = planetById[station.planetId];
    if (!planet) errors.push(`Station ${station.id} references unknown planet ${station.planetId}`);
    if (planet && planet.systemId !== station.systemId) errors.push(`Station ${station.id} belongs to ${station.systemId} but planet ${planet.id} belongs to ${planet.systemId}`);
    if (planet && planet.stationId !== station.id && !station.hidden) errors.push(`Station ${station.id} is not the station listed by planet ${planet.id}`);
    if (!hasFaction(station.factionId)) errors.push(`Station ${station.id} references unknown faction ${station.factionId}`);
  }

  for (const planet of planets) {
    if (!systemById[planet.systemId]) errors.push(`Planet ${planet.id} references unknown system ${planet.systemId}`);
    const station = stationById[planet.stationId];
    if (!station) errors.push(`Planet ${planet.id} references unknown station ${planet.stationId}`);
    if (station && station.planetId !== planet.id) errors.push(`Planet ${planet.id} is not the planet listed by station ${station.id}`);
    if (station && station.systemId !== planet.systemId) errors.push(`Planet ${planet.id} belongs to ${planet.systemId} but station ${station.id} belongs to ${station.systemId}`);
  }

  for (const system of systems) {
    if (!hasFaction(system.factionId)) errors.push(`System ${system.id} references unknown faction ${system.factionId}`);
    if (!contrabandLawBySystem[system.id]) errors.push(`System ${system.id} is missing contraband law`);
    if (system.id === "ptd-home") {
      if (system.planetIds.length !== 1) errors.push("System ptd-home must have exactly one planet");
    } else if (system.planetIds.length < 3 || system.planetIds.length > 8) {
      errors.push(`System ${system.id} must have 3-8 planets`);
    }
    const systemStationIds = new Set(system.stationIds);
    for (const planetId of system.planetIds) {
      const planet = planetById[planetId];
      if (!planet) errors.push(`System ${system.id} references unknown planet ${planetId}`);
      if (planet && planet.systemId !== system.id) errors.push(`Planet ${planet.id} is listed in ${system.id} but belongs to ${planet.systemId}`);
      if (planet && !systemStationIds.has(planet.stationId)) errors.push(`System ${system.id} planet ${planet.id} station ${planet.stationId} is missing from stationIds`);
    }
    for (const stationId of system.stationIds) {
      const station = stationById[stationId];
      if (!station) errors.push(`System ${system.id} references unknown station ${stationId}`);
      if (station && station.systemId !== system.id) errors.push(`Station ${station.id} is listed in ${system.id} but belongs to ${station.systemId}`);
      if (station && !system.planetIds.includes(station.planetId)) errors.push(`System ${system.id} station ${station.id} planet ${station.planetId} is missing from planetIds`);
      if (station?.hidden) errors.push(`Hidden station ${station.id} must not be listed in stationIds`);
    }
    for (const stationId of system.hiddenStationIds ?? []) {
      const station = stationById[stationId];
      if (!station) errors.push(`System ${system.id} references unknown hidden station ${stationId}`);
      if (station && station.systemId !== system.id) errors.push(`Hidden station ${station.id} is listed in ${system.id} but belongs to ${station.systemId}`);
      if (station && !station.hidden) errors.push(`System ${system.id} hidden station ${station.id} must be marked hidden`);
      if (station && !system.planetIds.includes(station.planetId)) errors.push(`System ${system.id} hidden station ${station.id} planet ${station.planetId} is missing from planetIds`);
    }
    for (const commodityId of Object.keys(system.marketBias)) {
      if (!hasCommodity(commodityId)) errors.push(`System ${system.id} has unknown market commodity ${commodityId}`);
    }
  }

  for (const mission of missionTemplates) {
    if (!systemById[mission.originSystemId]) errors.push(`Mission ${mission.id} references unknown origin system ${mission.originSystemId}`);
    if (!systemById[mission.destinationSystemId]) errors.push(`Mission ${mission.id} references unknown destination system ${mission.destinationSystemId}`);
    const destinationStation = stationById[mission.destinationStationId];
    if (!destinationStation) errors.push(`Mission ${mission.id} references unknown destination station ${mission.destinationStationId}`);
    if (destinationStation && destinationStation.systemId !== mission.destinationSystemId) {
      errors.push(`Mission ${mission.id} destination station ${destinationStation.id} is not in ${mission.destinationSystemId}`);
    }
    if (!hasFaction(mission.factionId)) errors.push(`Mission ${mission.id} references unknown faction ${mission.factionId}`);
    for (const factionId of Object.keys(mission.reputationRewards ?? {})) {
      if (!hasFaction(factionId)) errors.push(`Mission ${mission.id} references unknown reputation reward faction ${factionId}`);
    }
    for (const cargo of [mission.cargoProvided, mission.cargoRequired]) {
      for (const commodityId of Object.keys(cargo ?? {})) {
        if (!hasCommodity(commodityId)) errors.push(`Mission ${mission.id} references unknown cargo ${commodityId}`);
      }
    }
    if (mission.targetCommodityId && !hasCommodity(mission.targetCommodityId)) {
      errors.push(`Mission ${mission.id} references unknown target commodity ${mission.targetCommodityId}`);
    }
    if (mission.salvage?.commodityId && !hasCommodity(mission.salvage.commodityId)) {
      errors.push(`Mission ${mission.id} references unknown salvage commodity ${mission.salvage.commodityId}`);
    }
    if (mission.salvage?.systemId && !systemById[mission.salvage.systemId]) {
      errors.push(`Mission ${mission.id} references unknown salvage system ${mission.salvage.systemId}`);
    }
    for (const prerequisiteMissionId of mission.prerequisiteMissionIds ?? []) {
      if (!missionIds.has(prerequisiteMissionId)) errors.push(`Mission ${mission.id} references unknown prerequisite mission ${prerequisiteMissionId}`);
    }
  }

  for (const equipment of equipmentList) {
    if (equipment.techLevel < 1 || equipment.techLevel > 5) errors.push(`Equipment ${equipment.id} has invalid tech level`);
    if (equipment.marketPrice <= 0) errors.push(`Equipment ${equipment.id} must have a positive market price`);
    for (const commodityId of Object.keys(equipment.craftCost?.cargo ?? {})) {
      if (!hasCommodity(commodityId)) errors.push(`Equipment ${equipment.id} craft cost references unknown cargo ${commodityId}`);
    }
  }

  const blueprintIds = new Set(blueprintDefinitions.map((blueprint) => blueprint.equipmentId));
  const craftableEquipmentIds = equipmentList.filter((equipment) => !!equipment.craftCost).map((equipment) => equipment.id);
  for (const equipmentId of craftableEquipmentIds) {
    if (!blueprintIds.has(equipmentId)) errors.push(`Craftable equipment ${equipmentId} is missing a blueprint`);
  }
  for (const blueprint of blueprintDefinitions) {
    if (!hasEquipment(blueprint.equipmentId)) errors.push(`Blueprint references unknown equipment ${blueprint.equipmentId}`);
    if (blueprint.tier < 1) errors.push(`Blueprint ${blueprint.equipmentId} has invalid tier`);
    if (blueprint.unlockCost.credits < 0) errors.push(`Blueprint ${blueprint.equipmentId} has invalid unlock credits`);
    for (const prerequisiteId of blueprint.prerequisiteEquipmentIds ?? []) {
      if (!blueprintIds.has(prerequisiteId)) errors.push(`Blueprint ${blueprint.equipmentId} requires unknown blueprint ${prerequisiteId}`);
      if (prerequisiteId === blueprint.equipmentId) errors.push(`Blueprint ${blueprint.equipmentId} cannot require itself`);
    }
    for (const commodityId of Object.keys(blueprint.unlockCost.cargo ?? {})) {
      if (!hasCommodity(commodityId)) errors.push(`Blueprint ${blueprint.equipmentId} unlock cost references unknown cargo ${commodityId}`);
    }
  }
  for (const blueprint of blueprintDefinitions) {
    const visiting = new Set<string>();
    const visit = (equipmentId: string): boolean => {
      if (visiting.has(equipmentId)) return true;
      visiting.add(equipmentId);
      const candidate = blueprintDefinitions.find((item) => item.equipmentId === equipmentId);
      const cyclic = (candidate?.prerequisiteEquipmentIds ?? []).some(visit);
      visiting.delete(equipmentId);
      return cyclic;
    };
    if (visit(blueprint.equipmentId)) errors.push(`Blueprint ${blueprint.equipmentId} has a prerequisite cycle`);
  }

  for (const commodity of commodities) {
    if (commodity.techLevel < 1 || commodity.techLevel > 5) errors.push(`Commodity ${commodity.id} has invalid tech level`);
  }

  for (const signal of explorationSignals) {
    if (!systemById[signal.systemId]) errors.push(`Exploration signal ${signal.id} references unknown system ${signal.systemId}`);
    if (signal.scanBand[0] < 0 || signal.scanBand[1] > 100 || signal.scanBand[0] >= signal.scanBand[1]) {
      errors.push(`Exploration signal ${signal.id} has invalid scan band`);
    }
    if (signal.scanRange <= 0 || signal.scanTime <= 0) errors.push(`Exploration signal ${signal.id} has invalid scan parameters`);
    if (signal.stage !== undefined && signal.stage < 1) errors.push(`Exploration signal ${signal.id} has invalid chain stage`);
    for (const prerequisiteId of signal.prerequisiteSignalIds ?? []) {
      if (!explorationSignalIds.has(prerequisiteId)) errors.push(`Exploration signal ${signal.id} requires unknown signal ${prerequisiteId}`);
      if (prerequisiteId === signal.id) errors.push(`Exploration signal ${signal.id} cannot require itself`);
    }
    if (signal.storyInfluence && !missionIds.has(signal.storyInfluence.missionId)) {
      errors.push(`Exploration signal ${signal.id} influences unknown mission ${signal.storyInfluence.missionId}`);
    }
    for (const commodityId of Object.keys(signal.rewards.cargo ?? {})) {
      if (!hasCommodity(commodityId)) errors.push(`Exploration signal ${signal.id} rewards unknown cargo ${commodityId}`);
    }
    for (const factionId of Object.keys(signal.rewards.reputation ?? {})) {
      if (!hasFaction(factionId)) errors.push(`Exploration signal ${signal.id} rewards unknown reputation ${factionId}`);
    }
    if (signal.revealStationId) {
      const system = systemById[signal.systemId];
      const station = stationById[signal.revealStationId];
      if (!station) errors.push(`Exploration signal ${signal.id} reveals unknown station ${signal.revealStationId}`);
      if (station && !station.hidden) errors.push(`Exploration signal ${signal.id} reveal station ${station.id} must be hidden`);
      if (station && station.systemId !== signal.systemId) errors.push(`Exploration signal ${signal.id} reveal station ${station.id} is not in ${signal.systemId}`);
      if (system && !system.hiddenStationIds?.includes(signal.revealStationId)) {
        errors.push(`Exploration signal ${signal.id} reveal station ${signal.revealStationId} is missing from hiddenStationIds`);
      }
    }
    for (const planetId of signal.revealPlanetIds ?? []) {
      const planet = planetById[planetId];
      if (!planet) errors.push(`Exploration signal ${signal.id} reveals unknown planet ${planetId}`);
      if (planet && planet.systemId !== signal.systemId) errors.push(`Exploration signal ${signal.id} reveal planet ${planet.id} is not in ${signal.systemId}`);
    }
  }

  for (const arc of storyArcs) {
    for (const chapter of arc.chapters) {
      const mission = missionTemplates.find((candidate) => candidate.id === chapter.missionId);
      if (!mission) {
        errors.push(`Story chapter ${chapter.id} references unknown mission ${chapter.missionId}`);
        continue;
      }
      if (mission.storyArcId !== arc.id) errors.push(`Story chapter ${chapter.id} mission ${mission.id} is not tagged for arc ${arc.id}`);
      if (mission.storyChapterId !== chapter.id) errors.push(`Story chapter ${chapter.id} mission ${mission.id} has story chapter ${mission.storyChapterId}`);
      if (mission.storyEncounter) {
        if (!mission.storyEncounter.fieldObjective.trim()) errors.push(`Story mission ${mission.id} has empty field objective`);
        const targetIds = mission.storyEncounter.targets.map((target) => target.id);
        requireUnique(targetIds, `${mission.id} story target`, errors);
        for (const requiredTargetId of mission.storyEncounter.requiredTargetIds) {
          if (!targetIds.includes(requiredTargetId)) errors.push(`Story mission ${mission.id} requires unknown story target ${requiredTargetId}`);
        }
        if (mission.storyEncounter.visualCue && !systemById[mission.storyEncounter.visualCue.systemId]) {
          errors.push(`Story mission ${mission.id} visual cue references unknown system ${mission.storyEncounter.visualCue.systemId}`);
        }
        for (const target of mission.storyEncounter.targets) {
          if (!systemById[target.systemId]) errors.push(`Story mission ${mission.id} target ${target.id} references unknown system ${target.systemId}`);
          if (!hasFaction(target.factionId)) errors.push(`Story mission ${mission.id} target ${target.id} references unknown faction ${target.factionId}`);
          if (target.hull <= 0 || target.shield < 0) errors.push(`Story mission ${mission.id} target ${target.id} has invalid durability`);
          if (!target.objective.trim()) errors.push(`Story mission ${mission.id} target ${target.id} has empty objective`);
        }
      }
    }
  }

  for (const speaker of dialogueSpeakers) {
    if (speaker.factionId && !hasFaction(speaker.factionId)) errors.push(`Dialogue speaker ${speaker.id} references unknown faction ${speaker.factionId}`);
    requireDialogueLocalization(speaker.nameI18n, `Dialogue speaker ${speaker.id} name`, errors);
    requireDialogueLocalization(speaker.roleI18n, `Dialogue speaker ${speaker.id} role`, errors);
  }

  for (const scene of dialogueScenes) {
    if (scene.lines.length === 0) errors.push(`Dialogue scene ${scene.id} has no lines`);
    requireDialogueLocalization(scene.titleI18n, `Dialogue scene ${scene.id} title`, errors);
    for (const line of scene.lines) {
      if (!speakerIds.has(line.speakerId)) errors.push(`Dialogue scene ${scene.id} references unknown speaker ${line.speakerId}`);
      if (!line.text.trim()) errors.push(`Dialogue scene ${scene.id} has an empty line`);
      requireDialogueLocalization(line.textI18n, `Dialogue scene ${scene.id} line`, errors);
    }
    if (scene.trigger.kind === "story-accept" || scene.trigger.kind === "story-complete") {
      const trigger = scene.trigger;
      if (!missionIds.has(trigger.missionId)) errors.push(`Dialogue scene ${scene.id} references unknown mission ${trigger.missionId}`);
      const chapter = storyArcs.flatMap((arc) => arc.chapters).find((item) => item.id === trigger.chapterId);
      if (!chapter) errors.push(`Dialogue scene ${scene.id} references unknown story chapter ${trigger.chapterId}`);
      if (chapter && chapter.missionId !== trigger.missionId) errors.push(`Dialogue scene ${scene.id} chapter ${chapter.id} does not match mission ${trigger.missionId}`);
    } else if (!explorationSignalIds.has(scene.trigger.signalId)) {
      errors.push(`Dialogue scene ${scene.id} references unknown exploration signal ${scene.trigger.signalId}`);
    }
  }

  return { ok: errors.length === 0, errors };
}
