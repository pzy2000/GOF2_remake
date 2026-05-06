import { missionTemplates } from "../data/world";
import type { CargoHold, MissionDefinition, PlayerState, ReputationState } from "../types/game";
import { getCargoUsed, getOccupiedCargo } from "./economy";
import { updateReputation } from "./reputation";

function cloneCargo(cargo?: CargoHold): CargoHold | undefined {
  return cargo ? { ...cargo } : undefined;
}

export function cloneMission(mission: MissionDefinition): MissionDefinition {
  return {
    ...mission,
    cargoProvided: cloneCargo(mission.cargoProvided),
    cargoRequired: cloneCargo(mission.cargoRequired),
    escort: mission.escort ? { ...mission.escort, originPosition: [...mission.escort.originPosition], destinationPosition: [...mission.escort.destinationPosition] } : undefined,
    salvage: mission.salvage ? { ...mission.salvage, position: [...mission.salvage.position] } : undefined
  };
}

export function cloneMissionTemplates(): MissionDefinition[] {
  return missionTemplates.map((mission) => ({
    ...cloneMission(mission),
    accepted: false,
    completed: false,
    failed: false,
    acceptedAt: undefined
  }));
}

export function addCargo(cargo: CargoHold, delta: CargoHold): CargoHold {
  const next = { ...cargo };
  for (const [commodityId, amount] of Object.entries(delta)) {
    next[commodityId as keyof CargoHold] = (next[commodityId as keyof CargoHold] ?? 0) + (amount ?? 0);
  }
  return next;
}

export function removeCargo(cargo: CargoHold, delta: CargoHold): CargoHold {
  const next = { ...cargo };
  for (const [commodityId, amount] of Object.entries(delta)) {
    const id = commodityId as keyof CargoHold;
    next[id] = Math.max(0, (next[id] ?? 0) - (amount ?? 0));
    if (next[id] === 0) delete next[id];
  }
  return next;
}

export function hasCargo(cargo: CargoHold, required: CargoHold): boolean {
  return Object.entries(required).every(([commodityId, amount]) => (cargo[commodityId as keyof CargoHold] ?? 0) >= (amount ?? 0));
}

export function getMissionDeadlineRemaining(mission: MissionDefinition, gameClock: number): number | undefined {
  if (!mission.deadlineSeconds || mission.acceptedAt === undefined) return undefined;
  return Math.max(0, mission.acceptedAt + mission.deadlineSeconds - gameClock);
}

export function isMissionExpired(mission: MissionDefinition, gameClock: number): boolean {
  const remaining = getMissionDeadlineRemaining(mission, gameClock);
  return remaining !== undefined && remaining <= 0 && !mission.completed && !mission.failed;
}

export function canAcceptMission(
  player: PlayerState,
  activeMissions: MissionDefinition[],
  mission: MissionDefinition
): { ok: boolean; message: string } {
  if (activeMissions.some((active) => active.id === mission.id)) {
    return { ok: false, message: "Mission already active." };
  }
  const cargoProvided = getCargoUsed(mission.cargoProvided ?? {});
  const passengerSpace = mission.passengerCount ?? 0;
  const occupied = getOccupiedCargo(player.cargo, activeMissions);
  if (occupied + cargoProvided + passengerSpace > player.stats.cargoCapacity) {
    return { ok: false, message: "Not enough free cargo space for this contract." };
  }
  return { ok: true, message: "Mission accepted." };
}

export function acceptMission(
  player: PlayerState,
  activeMissions: MissionDefinition[],
  mission: MissionDefinition,
  gameClock = 0
): { player: PlayerState; activeMissions: MissionDefinition[]; ok: boolean; message: string; mission?: MissionDefinition } {
  const availability = canAcceptMission(player, activeMissions, mission);
  if (!availability.ok) {
    return { player, activeMissions, ok: false, message: availability.message };
  }
  const accepted = {
    ...cloneMission(mission),
    accepted: true,
    completed: false,
    failed: false,
    acceptedAt: gameClock
  };
  return {
    ok: true,
    message: `Accepted ${mission.title}.`,
    mission: accepted,
    activeMissions: [...activeMissions, accepted],
    player: {
      ...player,
      cargo: mission.cargoProvided ? addCargo(player.cargo, mission.cargoProvided) : player.cargo
    }
  };
}

export function canCompleteMission(
  mission: MissionDefinition,
  player: PlayerState,
  currentSystemId: string,
  currentStationId: string,
  destroyedPirates: number,
  gameClock = 0
): boolean {
  if (!mission.accepted || mission.completed || mission.failed || isMissionExpired(mission, gameClock)) return false;
  if (mission.destinationSystemId !== currentSystemId || mission.destinationStationId !== currentStationId) return false;
  if (mission.type === "Courier delivery") return mission.cargoProvided ? hasCargo(player.cargo, mission.cargoProvided) : true;
  if (mission.type === "Cargo transport" && mission.cargoRequired) return hasCargo(player.cargo, mission.cargoRequired);
  if (mission.type === "Passenger transport") return true;
  if (mission.type === "Mining contract" && mission.targetCommodityId && mission.targetAmount) {
    return (player.cargo[mission.targetCommodityId] ?? 0) >= mission.targetAmount;
  }
  if (mission.type === "Pirate bounty" && mission.targetAmount) {
    return destroyedPirates >= mission.targetAmount;
  }
  if (mission.type === "Escort convoy") return mission.escort?.arrived === true;
  if (mission.type === "Recovery/salvage") return mission.salvage?.recovered === true;
  return false;
}

function cargoToConsume(mission: MissionDefinition): CargoHold {
  if (mission.type === "Courier delivery") return mission.cargoProvided ?? {};
  if (mission.type === "Cargo transport" && mission.consumeCargoOnComplete) return mission.cargoRequired ?? {};
  if (mission.type === "Mining contract" && mission.targetCommodityId && mission.targetAmount) {
    return { [mission.targetCommodityId]: mission.targetAmount };
  }
  return {};
}

export function completeMission(
  mission: MissionDefinition,
  player: PlayerState,
  reputation: ReputationState
): { player: PlayerState; reputation: ReputationState; completed: MissionDefinition } {
  const nextCargo = removeCargo(player.cargo, cargoToConsume(mission));
  return {
    completed: { ...cloneMission(mission), completed: true },
    reputation: updateReputation(reputation, mission.factionId, mission.type === "Pirate bounty" ? 6 : 4),
    player: {
      ...player,
      cargo: nextCargo,
      credits: player.credits + mission.reward
    }
  };
}

export function failMission(
  mission: MissionDefinition,
  player: PlayerState,
  reputation: ReputationState,
  reason: string
): { player: PlayerState; reputation: ReputationState; failed: MissionDefinition } {
  const reputationDelta = mission.failureReputationDelta ?? -4;
  const nextCargo = mission.cargoProvided ? removeCargo(player.cargo, mission.cargoProvided) : player.cargo;
  return {
    failed: { ...cloneMission(mission), failed: true, failureReason: reason },
    reputation: updateReputation(reputation, mission.factionId, reputationDelta),
    player: { ...player, cargo: nextCargo }
  };
}

export function markEscortArrived(mission: MissionDefinition): MissionDefinition {
  return mission.escort ? { ...cloneMission(mission), escort: { ...mission.escort, arrived: true } } : mission;
}

export function markSalvageRecovered(mission: MissionDefinition): MissionDefinition {
  return mission.salvage ? { ...cloneMission(mission), salvage: { ...mission.salvage, recovered: true } } : mission;
}
