import { missionTemplates } from "../data/world";
import type { CargoHold, MissionDefinition, PlayerState, ReputationState } from "../types/game";
import { updateReputation } from "./reputation";

export function cloneMissionTemplates(): MissionDefinition[] {
  return missionTemplates.map((mission) => ({
    ...mission,
    cargoProvided: mission.cargoProvided ? { ...mission.cargoProvided } : undefined,
    cargoRequired: mission.cargoRequired ? { ...mission.cargoRequired } : undefined,
    accepted: false,
    completed: false
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

export function acceptMission(
  player: PlayerState,
  activeMissions: MissionDefinition[],
  mission: MissionDefinition
): { player: PlayerState; activeMissions: MissionDefinition[]; ok: boolean; message: string } {
  if (activeMissions.some((active) => active.id === mission.id)) {
    return { player, activeMissions, ok: false, message: "Mission already active." };
  }
  const accepted = { ...mission, accepted: true, completed: false };
  return {
    ok: true,
    message: `Accepted ${mission.title}.`,
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
  destroyedPirates: number
): boolean {
  if (!mission.accepted || mission.completed) return false;
  if (mission.destinationSystemId !== currentSystemId || mission.destinationStationId !== currentStationId) return false;
  if (mission.type === "Courier delivery") return true;
  if (mission.type === "Mining contract" && mission.targetCommodityId && mission.targetAmount) {
    return (player.cargo[mission.targetCommodityId] ?? 0) >= mission.targetAmount;
  }
  if (mission.type === "Pirate bounty" && mission.targetAmount) {
    return destroyedPirates >= mission.targetAmount;
  }
  return false;
}

export function completeMission(
  mission: MissionDefinition,
  player: PlayerState,
  reputation: ReputationState
): { player: PlayerState; reputation: ReputationState; completed: MissionDefinition } {
  let nextCargo = player.cargo;
  if (mission.type === "Mining contract" && mission.targetCommodityId && mission.targetAmount) {
    nextCargo = removeCargo(nextCargo, { [mission.targetCommodityId]: mission.targetAmount });
  }
  return {
    completed: { ...mission, completed: true },
    reputation: updateReputation(reputation, mission.factionId, mission.type === "Pirate bounty" ? 6 : 4),
    player: {
      ...player,
      cargo: nextCargo,
      credits: player.credits + mission.reward
    }
  };
}
