import type { FactionId, ReputationState } from "../types/game";

export function createInitialReputation(): ReputationState {
  return {
    factions: {
      "solar-directorate": 8,
      "vossari-clans": 0,
      "mirr-collective": 0,
      "free-belt-union": 4,
      "independent-pirates": -20,
      "unknown-drones": -5
    }
  };
}

export function updateReputation(state: ReputationState, factionId: FactionId, delta: number): ReputationState {
  return {
    factions: {
      ...state.factions,
      [factionId]: Math.max(-100, Math.min(100, state.factions[factionId] + delta))
    }
  };
}

export function reputationLabel(value: number): string {
  if (value >= 50) return "Allied";
  if (value >= 15) return "Friendly";
  if (value > -10) return "Neutral";
  if (value > -40) return "Hostile";
  return "Kill-on-sight";
}
