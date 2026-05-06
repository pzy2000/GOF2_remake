import type { CommodityId, EquipmentId, FactionId } from "../types/game";
import { commodities, commodityById } from "./commodities";
import { equipmentById, equipmentList } from "./equipment";
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

export function validateContentData(): ContentValidationResult {
  const errors: string[] = [];

  requireUnique(commodities.map((item) => item.id), "commodity", errors);
  requireUnique(ships.map((item) => item.id), "ship", errors);
  requireUnique(planets.map((item) => item.id), "planet", errors);
  requireUnique(stations.map((item) => item.id), "station", errors);
  requireUnique(systems.map((item) => item.id), "system", errors);
  requireUnique(missionTemplates.map((item) => item.id), "mission", errors);
  requireUnique(equipmentList.map((item) => item.id), "equipment", errors);
  requireUnique(storyArcs.map((item) => item.id), "story arc", errors);
  for (const arc of storyArcs) {
    requireUnique(arc.chapters.map((item) => item.id), `${arc.id} chapter`, errors);
    requireUnique(arc.chapters.map((item) => item.missionId), `${arc.id} chapter mission`, errors);
  }

  const missionIds = new Set(missionTemplates.map((mission) => mission.id));

  for (const ship of ships) {
    for (const equipmentId of ship.equipment) {
      if (!hasEquipment(equipmentId)) errors.push(`Ship ${ship.id} references unknown equipment ${equipmentId}`);
    }
  }

  for (const station of stations) {
    if (!systemById[station.systemId]) errors.push(`Station ${station.id} references unknown system ${station.systemId}`);
    const planet = planetById[station.planetId];
    if (!planet) errors.push(`Station ${station.id} references unknown planet ${station.planetId}`);
    if (planet && planet.systemId !== station.systemId) errors.push(`Station ${station.id} belongs to ${station.systemId} but planet ${planet.id} belongs to ${planet.systemId}`);
    if (planet && planet.stationId !== station.id) errors.push(`Station ${station.id} is not the station listed by planet ${planet.id}`);
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
    if (system.planetIds.length < 3 || system.planetIds.length > 8) errors.push(`System ${system.id} must have 3-8 planets`);
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

  for (const arc of storyArcs) {
    for (const chapter of arc.chapters) {
      const mission = missionTemplates.find((candidate) => candidate.id === chapter.missionId);
      if (!mission) {
        errors.push(`Story chapter ${chapter.id} references unknown mission ${chapter.missionId}`);
        continue;
      }
      if (mission.storyArcId !== arc.id) errors.push(`Story chapter ${chapter.id} mission ${mission.id} is not tagged for arc ${arc.id}`);
      if (mission.storyChapterId !== chapter.id) errors.push(`Story chapter ${chapter.id} mission ${mission.id} has story chapter ${mission.storyChapterId}`);
    }
  }

  return { ok: errors.length === 0, errors };
}
