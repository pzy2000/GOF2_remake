import type { FactionId, ReputationState } from "../types/game";
import { factionNames, PTD_COMPANY_FACTION_ID } from "../data/factions";

export function createInitialReputation(): ReputationState {
  return {
    factions: {
      "solar-directorate": 8,
      "ptd-company": 100,
      "vossari-clans": 0,
      "mirr-collective": 0,
      "free-belt-union": 4,
      "independent-pirates": -20,
      "unknown-drones": -5
    }
  };
}

export function normalizeReputation(input?: Partial<ReputationState> | null): ReputationState {
  const initial = createInitialReputation();
  const factions = { ...initial.factions };
  for (const factionId of Object.keys(factionNames) as FactionId[]) {
    const value = input?.factions?.[factionId];
    factions[factionId] = factionId === PTD_COMPANY_FACTION_ID
      ? 100
      : Math.max(-100, Math.min(100, typeof value === "number" && Number.isFinite(value) ? value : initial.factions[factionId]));
  }
  return { factions };
}

export function updateReputation(state: ReputationState, factionId: FactionId, delta: number): ReputationState {
  if (factionId === PTD_COMPANY_FACTION_ID) {
    return {
      factions: {
        ...state.factions,
        [PTD_COMPANY_FACTION_ID]: 100
      }
    };
  }
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
