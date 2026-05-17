import type { FactionId, FlightEntityRole, ReputationState } from "../types/game";
import {
  factionNames,
  factionRelationshipOverrides,
  type FactionRelationship,
  PTD_COMPANY_FACTION_ID,
  UNKNOWN_DRONES_FACTION_ID
} from "../data/factions";

export const DEFAULT_DRONE_KILL_REPUTATION_CAP = 3;

const reputationObserverFactionIds: FactionId[] = [
  "solar-directorate",
  "vossari-clans",
  "mirr-collective",
  "free-belt-union",
  "independent-pirates"
];

const droneKillRewardFactionIds: FactionId[] = [
  "solar-directorate",
  "vossari-clans",
  "mirr-collective",
  "free-belt-union"
];

const factionShortNames: Record<FactionId, string> = {
  "solar-directorate": "Solar",
  "ptd-company": "PTD",
  "vossari-clans": "Vossari",
  "mirr-collective": "Mirr",
  "free-belt-union": "Union",
  "independent-pirates": "Pirates",
  "unknown-drones": "Drones"
};

export interface FactionKillReputationTarget {
  factionId: FactionId;
  role?: FlightEntityRole;
  elite?: boolean;
  boss?: boolean;
}

export interface FactionKillReputationOptions {
  droneReputationCap?: number;
  droneReputationUsed?: Partial<Record<FactionId, number>>;
}

export interface FactionKillReputationResult {
  baseDelta: number;
  deltas: Partial<Record<FactionId, number>>;
  droneReputationUsage: Partial<Record<FactionId, number>>;
}

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

export function getFactionRelationship(observerFactionId: FactionId, targetFactionId: FactionId): FactionRelationship {
  if (observerFactionId === targetFactionId) return "friendly";
  return (
    factionRelationshipOverrides[observerFactionId]?.[targetFactionId] ??
    factionRelationshipOverrides[targetFactionId]?.[observerFactionId] ??
    "neutral"
  );
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

export function applyReputationDeltas(
  state: ReputationState,
  deltas: Partial<Record<FactionId, number>>
): { reputation: ReputationState; appliedDeltas: Partial<Record<FactionId, number>> } {
  let reputation = state;
  const appliedDeltas: Partial<Record<FactionId, number>> = {};
  for (const factionId of Object.keys(factionNames) as FactionId[]) {
    const delta = deltas[factionId] ?? 0;
    if (delta === 0) continue;
    const before = reputation.factions[factionId] ?? 0;
    reputation = updateReputation(reputation, factionId, delta);
    const appliedDelta = (reputation.factions[factionId] ?? 0) - before;
    if (appliedDelta !== 0) appliedDeltas[factionId] = appliedDelta;
  }
  return { reputation, appliedDeltas };
}

export function getFactionKillReputationDeltas(
  target: FactionKillReputationTarget,
  options: FactionKillReputationOptions = {}
): FactionKillReputationResult {
  const baseDelta = target.boss ? 3 : target.elite ? 2 : 1;
  const deltas: Partial<Record<FactionId, number>> = {};
  const droneReputationUsage: Partial<Record<FactionId, number>> = {};

  if (target.factionId === UNKNOWN_DRONES_FACTION_ID) {
    const cap = options.droneReputationCap ?? DEFAULT_DRONE_KILL_REPUTATION_CAP;
    for (const factionId of droneKillRewardFactionIds) {
      const used = Math.max(0, options.droneReputationUsed?.[factionId] ?? 0);
      const allowedDelta = Math.min(baseDelta, Math.max(0, cap - used));
      if (allowedDelta > 0) {
        deltas[factionId] = allowedDelta;
        droneReputationUsage[factionId] = allowedDelta;
      }
    }
    return { baseDelta, deltas, droneReputationUsage };
  }

  if (target.factionId !== PTD_COMPANY_FACTION_ID) {
    addDelta(deltas, target.factionId, -baseDelta);
  }

  for (const observerFactionId of reputationObserverFactionIds) {
    if (observerFactionId === target.factionId) continue;
    const relationship = getFactionRelationship(observerFactionId, target.factionId);
    if (relationship === "enemy") addDelta(deltas, observerFactionId, baseDelta);
    if (relationship === "friendly") addDelta(deltas, observerFactionId, -baseDelta);
  }

  return { baseDelta, deltas, droneReputationUsage };
}

export function formatReputationDeltaSummary(deltas: Partial<Record<FactionId, number>>): string | undefined {
  const parts = (Object.keys(factionNames) as FactionId[])
    .map((factionId) => {
      const delta = deltas[factionId] ?? 0;
      return delta === 0 ? undefined : `${factionShortNames[factionId]} ${delta > 0 ? "+" : ""}${delta}`;
    })
    .filter((part): part is string => !!part);
  return parts.length ? parts.join(" · ") : undefined;
}

export function getFactionRelationshipSummary(factionId: FactionId): { friends: FactionId[]; enemies: FactionId[] } {
  const relatedFactionIds = (Object.keys(factionNames) as FactionId[]).filter((otherFactionId) => otherFactionId !== factionId);
  return {
    friends: relatedFactionIds.filter((otherFactionId) => getFactionRelationship(factionId, otherFactionId) === "friendly"),
    enemies: relatedFactionIds.filter((otherFactionId) => getFactionRelationship(factionId, otherFactionId) === "enemy")
  };
}

export function reputationLabel(value: number): string {
  if (value >= 50) return "Allied";
  if (value >= 15) return "Friendly";
  if (value > -10) return "Neutral";
  if (value > -40) return "Hostile";
  return "Kill-on-sight";
}

function addDelta(deltas: Partial<Record<FactionId, number>>, factionId: FactionId, delta: number): void {
  if (delta === 0) return;
  const next = (deltas[factionId] ?? 0) + delta;
  if (next === 0) delete deltas[factionId];
  else deltas[factionId] = next;
}
