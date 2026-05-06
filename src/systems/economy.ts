import { commodities, commodityById, stations, systemById } from "../data/world";
import type {
  CargoHold,
  CommodityId,
  MarketEntry,
  MarketState,
  MissionDefinition,
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
const restrictedMarketArchetypes = new Set<StationArchetype>(["Pirate Black Market", "Frontier Port"]);

export function canBuyCommodityAtStation(commodityId: CommodityId, station: StationDefinition): boolean {
  const commodity = commodityById[commodityId];
  if (commodity.category === "ore") return oreMarketArchetypes.has(station.archetype);
  if (!commodity.legal) return restrictedMarketArchetypes.has(station.archetype);
  return true;
}

export function isCommodityVisibleInMarket(
  commodityId: CommodityId,
  station: StationDefinition,
  cargo: CargoHold
): boolean {
  const commodity = commodityById[commodityId];
  return (
    canBuyCommodityAtStation(commodityId, station) ||
    (cargo[commodityId] ?? 0) > 0 ||
    commodity.category !== "ore"
  );
}

export function getCargoUsed(cargo: CargoHold): number {
  return Object.entries(cargo).reduce((total, [commodityId, amount]) => {
    const commodity = commodityById[commodityId as CommodityId];
    return total + (amount ?? 0) * (commodity?.mass ?? 1);
  }, 0);
}

export function getMissionCargoReserved(activeMissions: MissionDefinition[]): number {
  return activeMissions
    .filter((mission) => mission.accepted && !mission.completed && !mission.failed)
    .reduce((total, mission) => total + (mission.passengerCount ?? 0), 0);
}

export function getOccupiedCargo(cargo: CargoHold, activeMissions: MissionDefinition[] = []): number {
  return getCargoUsed(cargo) + getMissionCargoReserved(activeMissions);
}

function rawMarketMultiplier(commodityId: CommodityId, station: StationDefinition, system: StarSystemDefinition): number {
  return (system.marketBias[commodityId] ?? 1) * (archetypeBias[station.archetype][commodityId] ?? 1);
}

function entryForStationCommodity(station: StationDefinition, commodityId: CommodityId): MarketEntry {
  const system = systemById[station.systemId];
  const commodity = commodityById[commodityId];
  const maxStock = commodity.category === "ore" ? 34 : commodity.legal ? 46 : 18;
  const canBuy = canBuyCommodityAtStation(commodityId, station);
  const multiplier = rawMarketMultiplier(commodityId, station, system);
  const exportLane = multiplier < 0.96;
  const importLane = multiplier > 1.12;
  const stockRatio = !canBuy ? 0 : exportLane ? 0.82 : importLane ? 0.28 : 0.55;
  const demand = exportLane ? 0.72 : importLane ? 1.42 : 1;
  return {
    stock: Math.round(maxStock * stockRatio),
    maxStock,
    baselineStock: Math.round(maxStock * stockRatio),
    demand,
    baselineDemand: demand
  };
}

export function createInitialMarketState(): MarketState {
  return Object.fromEntries(
    stations.map((station) => [
      station.id,
      Object.fromEntries(commodities.map((commodity) => [commodity.id, entryForStationCommodity(station, commodity.id)]))
    ])
  ) as MarketState;
}

export function cloneMarketState(marketState: MarketState): MarketState {
  return Object.fromEntries(
    Object.entries(marketState).map(([stationId, market]) => [
      stationId,
      Object.fromEntries(
        Object.entries(market).map(([commodityId, entry]) => [
          commodityId,
          entry ? { ...entry } : entry
        ])
      )
    ])
  ) as MarketState;
}

export function getMarketEntry(
  marketState: MarketState,
  stationId: string,
  commodityId: CommodityId
): MarketEntry {
  const station = stations.find((candidate) => candidate.id === stationId);
  const fallback = station ? entryForStationCommodity(station, commodityId) : { stock: 0, maxStock: 1, baselineStock: 0, demand: 1, baselineDemand: 1 };
  return marketState[stationId]?.[commodityId] ?? fallback;
}

function marketPriceMultiplier(entry: MarketEntry | undefined, mode: "buy" | "sell", station: StationDefinition, commodityId: CommodityId): number {
  if (!entry) return 1;
  const stockRatio = entry.maxStock > 0 ? entry.stock / entry.maxStock : 0;
  const demandOffset = entry.demand - 1;
  const inventoryPressure = 1 - stockRatio;
  const multiplier =
    mode === "buy"
      ? 0.92 + inventoryPressure * 0.42 + demandOffset * 0.18
      : 0.74 + inventoryPressure * 0.34 + demandOffset * 0.2;
  const illegalPenalty =
    mode === "sell" && !commodityById[commodityId].legal && station.archetype !== "Pirate Black Market" && station.archetype !== "Frontier Port"
      ? 0.82
      : 1;
  return Math.max(0.42, multiplier * illegalPenalty);
}

export function getCommodityPrice(
  commodityId: CommodityId,
  station: StationDefinition,
  system: StarSystemDefinition,
  reputation = 0,
  mode: "buy" | "sell" = "buy",
  marketEntry?: MarketEntry
): number {
  const commodity = commodityById[commodityId];
  const systemMultiplier = system.marketBias[commodityId] ?? 1;
  const stationMultiplier = archetypeBias[station.archetype][commodityId] ?? 1;
  const riskPremium = commodity.legal ? 1 + system.risk * commodity.volatility : 1 + system.risk * 0.7;
  const repAdjustment = mode === "buy" ? 1 - Math.max(0, reputation) * 0.0015 : 0.82 + Math.max(0, reputation) * 0.001;
  const marketMultiplier = marketPriceMultiplier(marketEntry, mode, station, commodityId);
  return Math.max(1, Math.round(commodity.basePrice * systemMultiplier * stationMultiplier * riskPremium * repAdjustment * marketMultiplier));
}

export interface TransactionResult {
  ok: boolean;
  player: PlayerState;
  total: number;
  message: string;
  marketState?: MarketState;
}

export function buyCommodity(
  player: PlayerState,
  station: StationDefinition,
  system: StarSystemDefinition,
  commodityId: CommodityId,
  amount: number,
  reputation = 0,
  marketState?: MarketState,
  reservedCargo = 0
): TransactionResult {
  const entry = marketState ? getMarketEntry(marketState, station.id, commodityId) : undefined;
  const unitPrice = getCommodityPrice(commodityId, station, system, reputation, "buy", entry);
  const total = unitPrice * amount;
  const cargoUsed = getCargoUsed(player.cargo);
  if (amount <= 0) return { ok: false, player, total: 0, message: "Select a positive amount." };
  if (!canBuyCommodityAtStation(commodityId, station)) {
    return { ok: false, player, total, message: "Not stocked at this station." };
  }
  if (entry && entry.stock < amount) return { ok: false, player, total, message: "Station stock is depleted." };
  if (cargoUsed + reservedCargo + amount > player.stats.cargoCapacity) return { ok: false, player, total, message: "Cargo hold full." };
  if (player.credits < total) return { ok: false, player, total, message: "Not enough credits." };
  const nextMarket = marketState ? cloneMarketState(marketState) : undefined;
  if (nextMarket) {
    const nextEntry = getMarketEntry(nextMarket, station.id, commodityId);
    nextEntry.stock = Math.max(0, nextEntry.stock - amount);
    nextEntry.demand = Math.min(2.3, nextEntry.demand + amount / Math.max(10, nextEntry.maxStock) + 0.02);
    nextMarket[station.id] = { ...nextMarket[station.id], [commodityId]: nextEntry };
  }
  return {
    ok: true,
    total,
    message: `Bought ${amount} ${commodityById[commodityId].name}.`,
    marketState: nextMarket,
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
  reputation = 0,
  marketState?: MarketState
): TransactionResult {
  const held = player.cargo[commodityId] ?? 0;
  const actualAmount = Math.min(held, amount);
  if (actualAmount <= 0) return { ok: false, player, total: 0, message: "No cargo to sell." };
  const entry = marketState ? getMarketEntry(marketState, station.id, commodityId) : undefined;
  const unitPrice = getCommodityPrice(commodityId, station, system, reputation, "sell", entry);
  const total = unitPrice * actualAmount;
  const nextCargo = { ...player.cargo, [commodityId]: held - actualAmount };
  if (nextCargo[commodityId] === 0) delete nextCargo[commodityId];
  const nextMarket = marketState ? cloneMarketState(marketState) : undefined;
  if (nextMarket) {
    const nextEntry = getMarketEntry(nextMarket, station.id, commodityId);
    nextEntry.stock = Math.min(nextEntry.maxStock, nextEntry.stock + actualAmount);
    nextEntry.demand = Math.max(0.35, nextEntry.demand - actualAmount / Math.max(10, nextEntry.maxStock) - 0.015);
    nextMarket[station.id] = { ...nextMarket[station.id], [commodityId]: nextEntry };
  }
  return {
    ok: true,
    total,
    message: `Sold ${actualAmount} ${commodityById[commodityId].name}.`,
    marketState: nextMarket,
    player: {
      ...player,
      credits: player.credits + total,
      cargo: nextCargo
    }
  };
}

export function advanceMarketState(marketState: MarketState, seconds: number): MarketState {
  if (seconds <= 0) return marketState;
  const recovery = Math.min(1, (seconds / 60) * 0.16);
  const next = cloneMarketState(marketState);
  for (const market of Object.values(next)) {
    for (const entry of Object.values(market)) {
      if (!entry) continue;
      entry.stock += (entry.baselineStock - entry.stock) * recovery;
      entry.demand += (entry.baselineDemand - entry.demand) * recovery;
      entry.stock = Math.max(0, Math.min(entry.maxStock, Number(entry.stock.toFixed(3))));
      entry.demand = Math.max(0.25, Math.min(2.5, Number(entry.demand.toFixed(3))));
    }
  }
  return next;
}

export function getMarketTag(entry: MarketEntry, station: StationDefinition, system: StarSystemDefinition, commodityId: CommodityId): "Export" | "Import" | "Scarce" | "Balanced" {
  if (entry.stock <= 0 || entry.stock / entry.maxStock < 0.18) return "Scarce";
  const multiplier = rawMarketMultiplier(commodityId, station, system);
  if (multiplier < 0.96 && entry.stock / entry.maxStock >= 0.45) return "Export";
  if (multiplier > 1.12 || entry.demand > entry.baselineDemand + 0.18) return "Import";
  return "Balanced";
}

export interface TradeHint {
  commodityId: CommodityId;
  commodityName: string;
  fromStationId: string;
  fromStationName: string;
  toStationId: string;
  toStationName: string;
  profit: number;
}

export function getTradeHints(marketState: MarketState, limit = 3): TradeHint[] {
  const hints: TradeHint[] = [];
  for (const commodity of commodities) {
    for (const origin of stations) {
      if (!canBuyCommodityAtStation(commodity.id, origin)) continue;
      const originEntry = getMarketEntry(marketState, origin.id, commodity.id);
      if (originEntry.stock <= 0) continue;
      const originSystem = systemById[origin.systemId];
      const buyPrice = getCommodityPrice(commodity.id, origin, originSystem, 0, "buy", originEntry);
      for (const destination of stations) {
        if (destination.id === origin.id) continue;
        const destinationEntry = getMarketEntry(marketState, destination.id, commodity.id);
        const destinationSystem = systemById[destination.systemId];
        const sellPrice = getCommodityPrice(commodity.id, destination, destinationSystem, 0, "sell", destinationEntry);
        const profit = sellPrice - buyPrice;
        if (profit > 0) {
          hints.push({
            commodityId: commodity.id,
            commodityName: commodity.name,
            fromStationId: origin.id,
            fromStationName: origin.name,
            toStationId: destination.id,
            toStationName: destination.name,
            profit
          });
        }
      }
    }
  }
  return hints.sort((a, b) => b.profit - a.profit).slice(0, limit);
}
