import type { FactionId } from "../types/game";

export const PTD_COMPANY_FACTION_ID = "ptd-company" satisfies FactionId;

export const factionNames: Record<FactionId, string> = {
  "solar-directorate": "Solar Directorate",
  "ptd-company": "PTD Company",
  "vossari-clans": "Vossari Clans",
  "mirr-collective": "Mirr Collective",
  "free-belt-union": "Free Belt Union",
  "independent-pirates": "Independent Pirates",
  "unknown-drones": "Unknown Drones"
};
