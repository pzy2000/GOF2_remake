import { commodities, commodityById, stationById, stations, systemById } from "../data/world";
import type { CommodityId, MarketState, MissionDefinition, StationDefinition } from "../types/game";
import type { EconomyEvent } from "../types/economy";
import {
  canBuyCommodityAtStation,
  cloneMarketState,
  getCommodityPrice,
  getMarketEntry,
  getTradeHints
} from "./economy";

export type MarketPressureKind = "shortage" | "surplus" | "route";
export type MarketPressureSeverity = "strained" | "low" | "critical";

export interface MarketPressureSignal {
  kind: MarketPressureKind;
  stationId: string;
  systemId: string;
  commodityId: CommodityId;
  severity: MarketPressureSeverity;
  score: number;
  stockRatio: number;
  demandDelta: number;
  message: string;
}

export interface MarketSupplyBrief {
  shortages: MarketPressureSignal[];
  surpluses: MarketPressureSignal[];
  routes: ReturnType<typeof getTradeHints>;
  recentEvents: EconomyEvent[];
}

export const MARKET_GAP_MISSION_PREFIX = "market-gap:";

function stockRatioFor(marketState: MarketState, station: StationDefinition, commodityId: CommodityId): number {
  const entry = getMarketEntry(marketState, station.id, commodityId);
  return entry.maxStock > 0 ? entry.stock / entry.maxStock : 0;
}

function severityFor(score: number): MarketPressureSeverity {
  if (score >= 0.82) return "critical";
  if (score >= 0.58) return "low";
  return "strained";
}

function bucketFor(signal: MarketPressureSignal): string {
  return signal.severity;
}

function isContractCommodity(commodityId: CommodityId, station: StationDefinition): boolean {
  const commodity = commodityById[commodityId];
  return commodity.legal && canBuyCommodityAtStation(commodityId, station);
}

export function isMarketGapMissionId(id: string): boolean {
  return id.startsWith(MARKET_GAP_MISSION_PREFIX);
}

export function getMarketPressureSignals(marketState: MarketState): MarketPressureSignal[] {
  const signals: MarketPressureSignal[] = [];
  for (const station of stations) {
    for (const commodity of commodities) {
      if (!isContractCommodity(commodity.id, station)) continue;
      const entry = getMarketEntry(marketState, station.id, commodity.id);
      const stockRatio = stockRatioFor(marketState, station, commodity.id);
      const demandDelta = entry.demand - entry.baselineDemand;
      const shortageScore = Math.max(0, 1 - stockRatio / 0.42) * 0.72 + Math.max(0, demandDelta) * 0.32;
      if (stockRatio <= 0.22 || (stockRatio <= 0.36 && demandDelta >= 0.16)) {
        const severity = severityFor(shortageScore);
        signals.push({
          kind: "shortage",
          stationId: station.id,
          systemId: station.systemId,
          commodityId: commodity.id,
          severity,
          score: Number(shortageScore.toFixed(3)),
          stockRatio: Number(stockRatio.toFixed(3)),
          demandDelta: Number(demandDelta.toFixed(3)),
          message: `${station.name} is short on ${commodity.name}.`
        });
        continue;
      }
      const surplusScore = Math.max(0, (stockRatio - 0.58) / 0.42) * 0.72 + Math.max(0, -demandDelta) * 0.22;
      if (stockRatio >= 0.68 && entry.stock > entry.baselineStock) {
        signals.push({
          kind: "surplus",
          stationId: station.id,
          systemId: station.systemId,
          commodityId: commodity.id,
          severity: severityFor(surplusScore),
          score: Number(surplusScore.toFixed(3)),
          stockRatio: Number(stockRatio.toFixed(3)),
          demandDelta: Number(demandDelta.toFixed(3)),
          message: `${station.name} has excess ${commodity.name}.`
        });
      }
    }
  }
  return signals.sort((a, b) => b.score - a.score || a.stationId.localeCompare(b.stationId));
}

function bestSourceFor(marketState: MarketState, shortage: MarketPressureSignal): StationDefinition | undefined {
  return stations
    .filter((station) => station.id !== shortage.stationId && canBuyCommodityAtStation(shortage.commodityId, station))
    .map((station) => ({ station, ratio: stockRatioFor(marketState, station, shortage.commodityId) }))
    .filter((candidate) => candidate.ratio >= 0.42)
    .sort((a, b) => b.ratio - a.ratio || a.station.name.localeCompare(b.station.name))[0]?.station;
}

function missionAmount(marketState: MarketState, signal: MarketPressureSignal): number {
  const entry = getMarketEntry(marketState, signal.stationId, signal.commodityId);
  const targetStock = Math.ceil(entry.maxStock * 0.36);
  return Math.max(2, Math.min(8, targetStock - Math.floor(entry.stock)));
}

function missionReward(marketState: MarketState, signal: MarketPressureSignal, source: StationDefinition | undefined, amount: number): number {
  const station = stationById[signal.stationId];
  const system = systemById[signal.systemId];
  const unitValue = getCommodityPrice(signal.commodityId, station, system, 0, "sell", getMarketEntry(marketState, signal.stationId, signal.commodityId));
  const sourceSystem = source ? systemById[source.systemId] : system;
  const distancePremium = source && source.systemId !== station.systemId
    ? 1.18 + Math.hypot(sourceSystem.position[0] - system.position[0], sourceSystem.position[1] - system.position[1]) * 0.04
    : 1;
  const multiplier = 1.15 + signal.score * 1.25 + system.risk * 0.55;
  return Math.max(420, Math.round(unitValue * amount * multiplier * distancePremium));
}

export function createMarketGapMission(marketState: MarketState, signal: MarketPressureSignal): MissionDefinition | undefined {
  if (signal.kind !== "shortage") return undefined;
  const station = stationById[signal.stationId];
  if (!station) return undefined;
  const source = bestSourceFor(marketState, signal);
  const amount = missionAmount(marketState, signal);
  const reward = missionReward(marketState, signal, source, amount);
  const commodity = commodityById[signal.commodityId];
  const sourceText = source ? ` Brokers point to ${source.name} as the cleanest current source.` : " Any legal source is acceptable.";
  return {
    id: `${MARKET_GAP_MISSION_PREFIX}${station.id}:${signal.commodityId}:${bucketFor(signal)}`,
    title: `Market Gap: ${commodity.name} for ${station.name}`,
    type: "Cargo transport",
    originSystemId: station.systemId,
    destinationSystemId: station.systemId,
    destinationStationId: station.id,
    factionId: station.factionId,
    description: `${station.name} is running below reserve stock for ${commodity.name}.${sourceText}`,
    reward,
    deadlineSeconds: 780 + amount * 80 + Math.round(systemById[station.systemId].risk * 260),
    failureReputationDelta: -3,
    reputationRewards: { [station.factionId]: 3 },
    cargoRequired: { [signal.commodityId]: amount },
    consumeCargoOnComplete: true
  };
}

export function getAvailableMarketGapMissions({
  marketState,
  systemId,
  activeMissions,
  limit = 4
}: {
  marketState: MarketState;
  systemId: string;
  activeMissions: MissionDefinition[];
  limit?: number;
}): MissionDefinition[] {
  const activeIds = new Set(activeMissions.map((mission) => mission.id));
  return getMarketPressureSignals(marketState)
    .filter((signal) => signal.kind === "shortage" && signal.systemId === systemId)
    .map((signal) => createMarketGapMission(marketState, signal))
    .filter((mission): mission is MissionDefinition => !!mission && !activeIds.has(mission.id))
    .slice(0, limit);
}

export function getMarketGapMissionById(marketState: MarketState, missionId: string): MissionDefinition | undefined {
  if (!isMarketGapMissionId(missionId)) return undefined;
  return getMarketPressureSignals(marketState)
    .filter((signal) => signal.kind === "shortage")
    .map((signal) => createMarketGapMission(marketState, signal))
    .find((mission) => mission?.id === missionId);
}

export function applyMarketGapMissionDelivery(marketState: MarketState, mission: MissionDefinition): MarketState {
  if (!isMarketGapMissionId(mission.id) || !mission.cargoRequired) return marketState;
  const next = cloneMarketState(marketState);
  for (const [commodityId, amount] of Object.entries(mission.cargoRequired) as [CommodityId, number | undefined][]) {
    const delivered = amount ?? 0;
    if (delivered <= 0) continue;
    const entry = getMarketEntry(next, mission.destinationStationId, commodityId);
    entry.stock = Math.min(entry.maxStock, entry.stock + delivered);
    entry.demand = Math.max(entry.baselineDemand, entry.demand - delivered / Math.max(8, entry.maxStock) - 0.04);
    next[mission.destinationStationId] = { ...next[mission.destinationStationId], [commodityId]: entry };
  }
  return next;
}

export function getMarketSupplyBrief(marketState: MarketState, systemId: string, recentEvents: EconomyEvent[] = []): MarketSupplyBrief {
  const signals = getMarketPressureSignals(marketState).filter((signal) => signal.systemId === systemId);
  return {
    shortages: signals.filter((signal) => signal.kind === "shortage").slice(0, 3),
    surpluses: signals.filter((signal) => signal.kind === "surplus").slice(0, 3),
    routes: getTradeHints(marketState, 5).filter((hint) => stationById[hint.fromStationId]?.systemId === systemId || stationById[hint.toStationId]?.systemId === systemId).slice(0, 3),
    recentEvents: recentEvents.filter((event) => !event.systemId || event.systemId === systemId).slice(-4).reverse()
  };
}
