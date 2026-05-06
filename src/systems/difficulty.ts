import type { CommodityId, OreRarity } from "../types/game";

export const STARTER_GRACE_SECONDS = 8;

export interface PirateLoadout {
  damage: number;
  fireCooldownMin: number;
  fireCooldownMax: number;
  speed: number;
  attackRange: number;
}

export function getPirateSpawnCount(systemId: string, risk: number): number {
  if (systemId === "helion-reach") return 1;
  if (systemId === "ashen-drift") return 3;
  if (risk < 0.3) return 1;
  if (risk < 0.55) return 2;
  return 3;
}

export function getPirateSpawnPosition(systemId: string, index: number): [number, number, number] {
  const baseDistance = systemId === "helion-reach" ? -620 : -390;
  const spread = systemId === "helion-reach" ? 280 : 210;
  return [Math.sin(index + 1.2) * spread, 45 * (index % 2), baseDistance - index * 150];
}

export function getPirateLoadout(systemId: string, risk: number): PirateLoadout {
  if (systemId === "helion-reach") {
    return {
      damage: 7,
      fireCooldownMin: 1.35,
      fireCooldownMax: 1.8,
      speed: 78,
      attackRange: 520
    };
  }
  return {
    damage: Math.round(8 + risk * 6),
    fireCooldownMin: Math.max(0.72, 1.25 - risk * 0.45),
    fireCooldownMax: Math.max(1.05, 1.75 - risk * 0.4),
    speed: 86 + risk * 24,
    attackRange: 560 + risk * 120
  };
}

export function canPirateFire({
  systemId,
  risk,
  now,
  graceUntil,
  distanceToPlayer,
  fireCooldown
}: {
  systemId: string;
  risk: number;
  now: number;
  graceUntil: number;
  distanceToPlayer: number;
  fireCooldown: number;
}): boolean {
  const loadout = getPirateLoadout(systemId, risk);
  return now >= graceUntil && fireCooldown <= 0 && distanceToPlayer < loadout.attackRange;
}

export function getOreHardness(resource: CommodityId): number {
  const hardness: Partial<Record<CommodityId, number>> = {
    iron: 0.72,
    titanium: 1.08,
    cesogen: 1.18,
    gold: 1.42,
    voidglass: 1.72
  };
  return hardness[resource] ?? 1;
}

export function getOreRarity(resource: CommodityId): OreRarity {
  const rarity: Partial<Record<CommodityId, OreRarity>> = {
    iron: "common",
    titanium: "uncommon",
    cesogen: "rare",
    gold: "epic",
    voidglass: "legendary"
  };
  return rarity[resource] ?? "common";
}

export function getOreColor(resource: CommodityId): string {
  const colors: Partial<Record<CommodityId, string>> = {
    iron: "#b96d4f",
    titanium: "#c8d5e6",
    cesogen: "#55c9ff",
    gold: "#ffd166",
    voidglass: "#9b7bff"
  };
  return colors[resource] ?? "#f6c94f";
}

export function getMiningProgressIncrement(resource: CommodityId, delta: number): number {
  return (delta * 0.95) / getOreHardness(resource);
}
