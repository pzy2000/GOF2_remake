import type { CommodityId, EquipmentId, FactionId } from "../types/game";
import { commodities, commodityById } from "./commodities";
import { equipmentById, equipmentList } from "./equipment";
import { factionNames } from "./factions";
import { missionTemplates } from "./missions";
import { ships } from "./ships";
import { stationById, stations, systemById, systems } from "./systems";

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
  requireUnique(stations.map((item) => item.id), "station", errors);
  requireUnique(systems.map((item) => item.id), "system", errors);
  requireUnique(missionTemplates.map((item) => item.id), "mission", errors);
  requireUnique(equipmentList.map((item) => item.id), "equipment", errors);

  for (const ship of ships) {
    for (const equipmentId of ship.equipment) {
      if (!hasEquipment(equipmentId)) errors.push(`Ship ${ship.id} references unknown equipment ${equipmentId}`);
    }
  }

  for (const station of stations) {
    if (!systemById[station.systemId]) errors.push(`Station ${station.id} references unknown system ${station.systemId}`);
    if (!hasFaction(station.factionId)) errors.push(`Station ${station.id} references unknown faction ${station.factionId}`);
  }

  for (const system of systems) {
    if (!hasFaction(system.factionId)) errors.push(`System ${system.id} references unknown faction ${system.factionId}`);
    for (const stationId of system.stationIds) {
      const station = stationById[stationId];
      if (!station) errors.push(`System ${system.id} references unknown station ${stationId}`);
      if (station && station.systemId !== system.id) errors.push(`Station ${station.id} is listed in ${system.id} but belongs to ${station.systemId}`);
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
  }

  return { ok: errors.length === 0, errors };
}
