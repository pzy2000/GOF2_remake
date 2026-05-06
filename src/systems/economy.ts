import { commodityById } from "../data/world";
import type {
  CargoHold,
  CommodityId,
  PlayerState,
  StarSystemDefinition,
  StationDefinition,
  StationArchetype
} from "../types/game";

const archetypeBias: Record<StationArchetype, Partial<Record<CommodityId, number>>> = {
  "Trade Hub": {
    "basic-food": 0.92,
    "drinking-water": 0.94,
    "luxury-goods": 1.18,
    "electronics": 1.1,
    "ship-components": 1.14
  },
  "Mining Station": {
    iron: 0.72,
    titanium: 0.82,
    cesogen: 0.9,
    gold: 0.96,
    voidglass: 1.12,
    "mechanical-parts": 1.12,
    "energy-cells": 1.18
  },
  "Research Station": {
    "data-cores": 1.22,
    optics: 1.18,
    microchips: 1.16,
    "rare-plants": 1.12,
    voidglass: 1.3
  },
  "Military Outpost": {
    "ship-components": 1.24,
    "medical-supplies": 1.16,
    "radioactive-materials": 0.9,
    "illegal-contraband": 1.6
  },
  "Frontier Port": {
    "basic-food": 1.16,
    "drinking-water": 1.18,
    "medical-supplies": 1.26,
    gold: 1.12,
    "illegal-contraband": 0.9
  },
  "Pirate Black Market": {
    "illegal-contraband": 0.66,
    "luxury-goods": 1.24,
    "rare-animals": 1.22,
    "data-cores": 1.18
  }
};

const oreMarketArchetypes = new Set<StationArchetype>(["Mining Station", "Pirate Black Market"]);

export function canBuyCommodityAtStation(commodityId: CommodityId, station: StationDefinition): boolean {
  const commodity = commodityById[commodityId];
  return commodity.category !== "ore" || oreMarketArchetypes.has(station.archetype);
}

export function isCommodityVisibleInMarket(
  commodityId: CommodityId,
  station: StationDefinition,
  cargo: CargoHold
): boolean {
  const commodity = commodityById[commodityId];
  return (
    canBuyCommodityAtStation(commodityId, station) ||
    (commodity.category === "ore" && (cargo[commodityId] ?? 0) > 0)
  );
}

export function getCargoUsed(cargo: CargoHold): number {
  return Object.entries(cargo).reduce((total, [commodityId, amount]) => {
    const commodity = commodityById[commodityId as CommodityId];
    return total + (amount ?? 0) * (commodity?.mass ?? 1);
  }, 0);
}

export function getCommodityPrice(
  commodityId: CommodityId,
  station: StationDefinition,
  system: StarSystemDefinition,
  reputation = 0,
  mode: "buy" | "sell" = "buy"
): number {
  const commodity = commodityById[commodityId];
  const systemMultiplier = system.marketBias[commodityId] ?? 1;
  const stationMultiplier = archetypeBias[station.archetype][commodityId] ?? 1;
  const riskPremium = commodity.legal ? 1 + system.risk * commodity.volatility : 1 + system.risk * 0.7;
  const repAdjustment = mode === "buy" ? 1 - Math.max(0, reputation) * 0.0015 : 0.82 + Math.max(0, reputation) * 0.001;
  return Math.max(1, Math.round(commodity.basePrice * systemMultiplier * stationMultiplier * riskPremium * repAdjustment));
}

export interface TransactionResult {
  ok: boolean;
  player: PlayerState;
  total: number;
  message: string;
}

export function buyCommodity(
  player: PlayerState,
  station: StationDefinition,
  system: StarSystemDefinition,
  commodityId: CommodityId,
  amount: number,
  reputation = 0
): TransactionResult {
  const unitPrice = getCommodityPrice(commodityId, station, system, reputation, "buy");
  const total = unitPrice * amount;
  const cargoUsed = getCargoUsed(player.cargo);
  if (amount <= 0) return { ok: false, player, total: 0, message: "Select a positive amount." };
  if (!canBuyCommodityAtStation(commodityId, station)) {
    return { ok: false, player, total, message: "Not stocked at this station." };
  }
  if (cargoUsed + amount > player.stats.cargoCapacity) return { ok: false, player, total, message: "Cargo hold full." };
  if (player.credits < total) return { ok: false, player, total, message: "Not enough credits." };
  return {
    ok: true,
    total,
    message: `Bought ${amount} ${commodityById[commodityId].name}.`,
    player: {
      ...player,
      credits: player.credits - total,
      cargo: { ...player.cargo, [commodityId]: (player.cargo[commodityId] ?? 0) + amount }
    }
  };
}

export function sellCommodity(
  player: PlayerState,
  station: StationDefinition,
  system: StarSystemDefinition,
  commodityId: CommodityId,
  amount: number,
  reputation = 0
): TransactionResult {
  const held = player.cargo[commodityId] ?? 0;
  const actualAmount = Math.min(held, amount);
  if (actualAmount <= 0) return { ok: false, player, total: 0, message: "No cargo to sell." };
  const unitPrice = getCommodityPrice(commodityId, station, system, reputation, "sell");
  const total = unitPrice * actualAmount;
  const nextCargo = { ...player.cargo, [commodityId]: held - actualAmount };
  if (nextCargo[commodityId] === 0) delete nextCargo[commodityId];
  return {
    ok: true,
    total,
    message: `Sold ${actualAmount} ${commodityById[commodityId].name}.`,
    player: {
      ...player,
      credits: player.credits + total,
      cargo: nextCargo
    }
  };
}
