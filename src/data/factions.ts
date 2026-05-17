import type { FactionId } from "../types/game";

export const PTD_COMPANY_FACTION_ID = "ptd-company" satisfies FactionId;
export const UNKNOWN_DRONES_FACTION_ID = "unknown-drones" satisfies FactionId;

export type FactionRelationship = "friendly" | "neutral" | "enemy";

export const factionNames: Record<FactionId, string> = {
  "solar-directorate": "Solar Directorate",
  "ptd-company": "PTD Company",
  "vossari-clans": "Vossari Clans",
  "mirr-collective": "Mirr Collective",
  "free-belt-union": "Free Belt Union",
  "independent-pirates": "Independent Pirates",
  "unknown-drones": "Unknown Drones"
};

export const factionRelationshipOverrides: Partial<Record<FactionId, Partial<Record<FactionId, FactionRelationship>>>> = {
  "solar-directorate": {
    "mirr-collective": "friendly",
    "vossari-clans": "enemy",
    "independent-pirates": "enemy",
    "unknown-drones": "enemy"
  },
  "mirr-collective": {
    "solar-directorate": "friendly",
    "vossari-clans": "enemy",
    "independent-pirates": "enemy",
    "unknown-drones": "enemy"
  },
  "vossari-clans": {
    "solar-directorate": "enemy",
    "mirr-collective": "enemy",
    "independent-pirates": "friendly",
    "unknown-drones": "enemy"
  },
  "independent-pirates": {
    "solar-directorate": "enemy",
    "mirr-collective": "enemy",
    "vossari-clans": "friendly",
    "unknown-drones": "enemy"
  },
  "free-belt-union": {
    "unknown-drones": "enemy"
  },
  "ptd-company": {
    "unknown-drones": "enemy"
  },
  "unknown-drones": {
    "solar-directorate": "enemy",
    "ptd-company": "enemy",
    "vossari-clans": "enemy",
    "mirr-collective": "enemy",
    "free-belt-union": "enemy",
    "independent-pirates": "enemy"
  }
};
