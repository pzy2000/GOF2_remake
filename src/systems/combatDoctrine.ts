import type { CombatLoadoutId, FactionId, FlightAiProfileId, FlightEntityRole } from "../types/game";
import { getPirateLoadout } from "./difficulty";

export interface CombatLoadout {
  id: CombatLoadoutId;
  label: string;
  damage: number;
  fireCooldownMin: number;
  fireCooldownMax: number;
  speed: number;
  attackRange: number;
  retreatHullRatio: number;
}

export interface CombatDoctrineInput {
  role: FlightEntityRole;
  factionId: FactionId;
  aiProfileId: FlightAiProfileId;
  systemId: string;
  risk: number;
  elite?: boolean;
  boss?: boolean;
}

export const combatLoadoutLabels: Record<CombatLoadoutId, string> = {
  "pirate-raider": "Knife Wing raider kit",
  "pirate-interceptor": "Knife Wing interceptor kit",
  "pirate-gunner": "Knife Wing gunner kit",
  "pirate-elite-ace": "Ace overcharged kit",
  "pirate-boss-warlord": "Warlord siege kit",
  "directorate-patrol": "Directorate precision kit",
  "directorate-support": "Directorate support kit",
  "directorate-courier": "Directorate courier kit",
  "union-hauler": "Union hauler kit",
  "union-freighter": "Union bulk defense kit",
  "union-miner": "Union cutter kit",
  "vossari-smuggler": "Vossari burst kit",
  "mirr-defender": "Mirr lattice kit",
  "unknown-drone": "Glass hunter array",
  "unknown-relay": "Relay lance array"
};

const roleFallbacks: Record<
  Exclude<FlightEntityRole, "pirate">,
  Omit<CombatLoadout, "id" | "label">
> = {
  patrol: { damage: 14, fireCooldownMin: 0.62, fireCooldownMax: 0.86, speed: 124, attackRange: 650, retreatHullRatio: 0.18 },
  trader: { damage: 9, fireCooldownMin: 0.86, fireCooldownMax: 1.3, speed: 108, attackRange: 540, retreatHullRatio: 0.22 },
  freighter: { damage: 12, fireCooldownMin: 0.9, fireCooldownMax: 1.38, speed: 92, attackRange: 560, retreatHullRatio: 0.2 },
  courier: { damage: 8, fireCooldownMin: 0.68, fireCooldownMax: 1.05, speed: 152, attackRange: 520, retreatHullRatio: 0.28 },
  miner: { damage: 9, fireCooldownMin: 1, fireCooldownMax: 1.44, speed: 96, attackRange: 500, retreatHullRatio: 0.2 },
  smuggler: { damage: 13, fireCooldownMin: 0.62, fireCooldownMax: 0.98, speed: 148, attackRange: 600, retreatHullRatio: 0.16 },
  drone: { damage: 12, fireCooldownMin: 0.56, fireCooldownMax: 0.92, speed: 134, attackRange: 640, retreatHullRatio: 0.08 },
  relay: { damage: 10, fireCooldownMin: 0.9, fireCooldownMax: 1.35, speed: 0, attackRange: 590, retreatHullRatio: 0 }
};

export function getCombatLoadout(input: CombatDoctrineInput): CombatLoadout {
  if (input.role === "pirate") return pirateLoadout(input);

  const id = loadoutIdFor(input);
  const base = doctrineBaseFor(input);
  return {
    id,
    label: combatLoadoutLabels[id],
    ...base
  };
}

function pirateLoadout(input: CombatDoctrineInput): CombatLoadout {
  const base = getPirateLoadout(input.systemId, input.risk);
  const id = input.boss
    ? "pirate-boss-warlord"
    : input.elite || input.aiProfileId === "elite-ace"
      ? "pirate-elite-ace"
      : input.aiProfileId === "interceptor"
        ? "pirate-interceptor"
        : input.aiProfileId === "gunner"
          ? "pirate-gunner"
          : "pirate-raider";
  const bossBoost = input.boss ? 1.45 : 1;
  const eliteBoost = input.elite && !input.boss ? 1.14 : 1;
  return {
    id,
    label: combatLoadoutLabels[id],
    damage: Math.round(base.damage * bossBoost * eliteBoost),
    fireCooldownMin: input.boss ? Math.max(0.54, base.fireCooldownMin * 0.68) : base.fireCooldownMin,
    fireCooldownMax: input.boss ? Math.max(0.82, base.fireCooldownMax * 0.72) : base.fireCooldownMax,
    speed: base.speed + (input.boss ? 16 : input.elite ? 8 : 0),
    attackRange: base.attackRange + (input.boss ? 130 : input.elite ? 60 : 0),
    retreatHullRatio: input.boss ? 0.1 : input.elite ? 0.18 : 0.28
  };
}

function loadoutIdFor(input: CombatDoctrineInput): CombatLoadoutId {
  if (input.aiProfileId === "patrol-support") return "directorate-support";
  if (input.factionId === "unknown-drones") return input.role === "relay" ? "unknown-relay" : "unknown-drone";
  if (input.factionId === "mirr-collective") return "mirr-defender";
  if (input.factionId === "vossari-clans" || input.role === "smuggler") return "vossari-smuggler";
  if (input.factionId === "solar-directorate" && input.role === "courier") return "directorate-courier";
  if (input.factionId === "solar-directorate") return "directorate-patrol";
  if (input.role === "freighter") return "union-freighter";
  if (input.role === "miner") return "union-miner";
  return "union-hauler";
}

function doctrineBaseFor(input: CombatDoctrineInput): Omit<CombatLoadout, "id" | "label"> {
  const base = roleFallbacks[input.role as Exclude<FlightEntityRole, "pirate">];
  if (input.aiProfileId === "patrol-support") {
    return { damage: 13, fireCooldownMin: 0.58, fireCooldownMax: 0.82, speed: 138, attackRange: 650, retreatHullRatio: 0.2 };
  }
  if (input.factionId === "mirr-collective") {
    return { ...base, damage: base.damage + 1, attackRange: base.attackRange + 70, fireCooldownMin: Math.max(0.6, base.fireCooldownMin - 0.08) };
  }
  if (input.factionId === "solar-directorate") {
    return { ...base, damage: base.damage + 2, attackRange: base.attackRange + 45, fireCooldownMax: Math.max(base.fireCooldownMin, base.fireCooldownMax - 0.12) };
  }
  if (input.factionId === "free-belt-union") {
    return { ...base, damage: base.damage + 1, speed: Math.max(76, base.speed - 6), retreatHullRatio: Math.max(0.12, base.retreatHullRatio - 0.06) };
  }
  if (input.factionId === "vossari-clans") {
    return { ...base, damage: base.damage + 2, speed: base.speed + 12, fireCooldownMin: Math.max(0.5, base.fireCooldownMin - 0.08), attackRange: base.attackRange + 30 };
  }
  return base;
}
