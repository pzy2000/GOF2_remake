import { commodities, commodityById, stationById, stations, systemById } from "../data/world";
import type { CommodityId, ExplorationState, MarketState, MissionDefinition, StationDefinition } from "../types/game";
import type { EconomyEvent } from "../types/economy";
import { getContrabandLawSummary } from "./combatAi";
import {
  canBuyCommodityAtStation,
  cloneMarketState,
  getCommodityPrice,
  getMarketEntry,
  getTradeHints
} from "./economy";
import { isHiddenStationRevealed } from "./exploration";

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
export const MARKET_SMUGGLE_MISSION_PREFIX = "market-smuggle:";

export interface DispatchVisibilityOptions {
  knownSystemIds?: string[];
  knownPlanetIds?: string[];
  explorationState?: ExplorationState;
}

export interface EconomyDispatchMissionOptions extends DispatchVisibilityOptions {
  marketState: MarketState;
  systemId: string;
  activeMissions: MissionDefinition[];
  limit?: number;
}

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

export function isMarketSmugglingMissionId(id: string): boolean {
  return id.startsWith(MARKET_SMUGGLE_MISSION_PREFIX);
}

export function isEconomyDispatchMissionId(id: string): boolean {
  return isMarketGapMissionId(id) || isMarketSmugglingMissionId(id);
}

function isStationVisible(station: StationDefinition, options: DispatchVisibilityOptions = {}): boolean {
  if (options.knownSystemIds && !options.knownSystemIds.includes(station.systemId)) return false;
  if (options.knownPlanetIds && !options.knownPlanetIds.includes(station.planetId)) return false;
  if (station.hidden && (!options.explorationState || !isHiddenStationRevealed(station.id, options.explorationState))) return false;
  return true;
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

function bestSourceFor(marketState: MarketState, shortage: MarketPressureSignal, options: DispatchVisibilityOptions = {}): StationDefinition | undefined {
  return stations
    .filter((station) => station.id !== shortage.stationId && isStationVisible(station, options) && canBuyCommodityAtStation(shortage.commodityId, station))
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

export function createMarketGapMission(marketState: MarketState, signal: MarketPressureSignal, options: DispatchVisibilityOptions = {}): MissionDefinition | undefined {
  if (signal.kind !== "shortage") return undefined;
  const station = stationById[signal.stationId];
  if (!station || !isStationVisible(station, options)) return undefined;
  const source = bestSourceFor(marketState, signal, options);
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
    sourceStationId: source?.id,
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
  limit = 4,
  ...visibility
}: {
  marketState: MarketState;
  systemId: string;
  activeMissions: MissionDefinition[];
  limit?: number;
} & DispatchVisibilityOptions): MissionDefinition[] {
  const activeIds = new Set(activeMissions.map((mission) => mission.id));
  return getMarketPressureSignals(marketState)
    .filter((signal) => signal.kind === "shortage" && signal.systemId === systemId)
    .map((signal) => createMarketGapMission(marketState, signal, visibility))
    .filter((mission): mission is MissionDefinition => !!mission && !activeIds.has(mission.id))
    .slice(0, limit);
}

export function getMarketGapMissionById(marketState: MarketState, missionId: string, options: DispatchVisibilityOptions = {}): MissionDefinition | undefined {
  if (!isMarketGapMissionId(missionId)) return undefined;
  return getMarketPressureSignals(marketState)
    .filter((signal) => signal.kind === "shortage")
    .map((signal) => createMarketGapMission(marketState, signal, options))
    .find((mission) => mission?.id === missionId);
}

function smugglingAmount(marketState: MarketState, source: StationDefinition, destination: StationDefinition): number {
  const sourceEntry = getMarketEntry(marketState, source.id, "illegal-contraband");
  const destinationEntry = getMarketEntry(marketState, destination.id, "illegal-contraband");
  const reserveNeed = Math.max(2, Math.ceil(destinationEntry.maxStock * 0.28) - Math.floor(destinationEntry.stock));
  return Math.max(2, Math.min(6, Math.floor(sourceEntry.stock), reserveNeed));
}

function smugglingReward(marketState: MarketState, source: StationDefinition, destination: StationDefinition, amount: number): number {
  const sourceSystem = systemById[source.systemId];
  const destinationSystem = systemById[destination.systemId];
  const sourceEntry = getMarketEntry(marketState, source.id, "illegal-contraband");
  const destinationEntry = getMarketEntry(marketState, destination.id, "illegal-contraband");
  const buyPrice = getCommodityPrice("illegal-contraband", source, sourceSystem, 0, "buy", sourceEntry);
  const sellPrice = getCommodityPrice("illegal-contraband", destination, destinationSystem, 0, "sell", destinationEntry);
  const riskPremium = 1.15 + destinationSystem.risk * 1.35 + (destinationSystem.id !== sourceSystem.id ? 0.24 : 0);
  return Math.max(900, Math.round((sellPrice * amount + Math.max(0, sellPrice - buyPrice) * amount) * riskPremium));
}

function createSmugglingMission(marketState: MarketState, source: StationDefinition, destination: StationDefinition): MissionDefinition | undefined {
  const sourceSystem = systemById[source.systemId];
  const destinationSystem = systemById[destination.systemId];
  const sourceEntry = getMarketEntry(marketState, source.id, "illegal-contraband");
  if (sourceEntry.stock < 2) return undefined;
  const destinationEntry = getMarketEntry(marketState, destination.id, "illegal-contraband");
  const buyPrice = getCommodityPrice("illegal-contraband", source, sourceSystem, 0, "buy", sourceEntry);
  const sellPrice = getCommodityPrice("illegal-contraband", destination, destinationSystem, 0, "sell", destinationEntry);
  const profit = sellPrice - buyPrice;
  const demandDelta = destinationEntry.demand - destinationEntry.baselineDemand;
  if (profit <= 0 && demandDelta < 0.18) return undefined;
  const amount = smugglingAmount(marketState, source, destination);
  if (amount <= 0) return undefined;
  return {
    id: `${MARKET_SMUGGLE_MISSION_PREFIX}${source.id}:${destination.id}:illegal-contraband`,
    title: `Smuggling Run: Illegal Contraband to ${destination.name}`,
    type: "Cargo transport",
    originSystemId: source.systemId,
    destinationSystemId: destination.systemId,
    destinationStationId: destination.id,
    factionId: source.factionId,
    sourceStationId: source.id,
    description: `Move unregistered cargo from ${source.name} to ${destination.name}. ${getContrabandLawSummary(destination.systemId)}`,
    reward: smugglingReward(marketState, source, destination, amount),
    deadlineSeconds: 900 + Math.round((sourceSystem.risk + destinationSystem.risk) * 460),
    failureReputationDelta: -4,
    reputationRewards: { [source.factionId]: 2 },
    cargoRequired: { "illegal-contraband": amount },
    consumeCargoOnComplete: true
  };
}

export function getAvailableSmugglingMissions({
  marketState,
  systemId,
  activeMissions,
  limit = 2,
  ...visibility
}: EconomyDispatchMissionOptions): MissionDefinition[] {
  const activeIds = new Set(activeMissions.map((mission) => mission.id));
  const sources = stations.filter((station) =>
    station.systemId === systemId &&
    isStationVisible(station, visibility) &&
    canBuyCommodityAtStation("illegal-contraband", station)
  );
  const missions = sources.flatMap((source) =>
    stations
      .filter((destination) => destination.id !== source.id && isStationVisible(destination, visibility))
      .map((destination) => createSmugglingMission(marketState, source, destination))
      .filter((mission): mission is MissionDefinition => !!mission && !activeIds.has(mission.id))
  );
  return missions
    .sort((a, b) => b.reward - a.reward || a.destinationStationId.localeCompare(b.destinationStationId))
    .slice(0, limit);
}

export function getAvailableEconomyDispatchMissions(options: EconomyDispatchMissionOptions): MissionDefinition[] {
  const legalLimit = Math.max(0, Math.ceil((options.limit ?? 6) * 0.67));
  const smugglingLimit = Math.max(0, (options.limit ?? 6) - legalLimit);
  return [
    ...getAvailableMarketGapMissions({ ...options, limit: legalLimit }),
    ...getAvailableSmugglingMissions({ ...options, limit: smugglingLimit })
  ].slice(0, options.limit ?? 6);
}

export function getEconomyDispatchMissionById(marketState: MarketState, missionId: string, options: DispatchVisibilityOptions = {}): MissionDefinition | undefined {
  if (isMarketGapMissionId(missionId)) return getMarketGapMissionById(marketState, missionId, options);
  if (!isMarketSmugglingMissionId(missionId)) return undefined;
  const [, sourceId, destinationId] = missionId.match(/^market-smuggle:([^:]+):([^:]+):illegal-contraband$/) ?? [];
  const source = sourceId ? stationById[sourceId] : undefined;
  const destination = destinationId ? stationById[destinationId] : undefined;
  if (!source || !destination || !isStationVisible(source, options) || !isStationVisible(destination, options)) return undefined;
  return createSmugglingMission(marketState, source, destination);
}

export function getDispatchMissionSourceStationId(mission: MissionDefinition): string | undefined {
  if (mission.sourceStationId) return mission.sourceStationId;
  if (isMarketSmugglingMissionId(mission.id)) return mission.id.match(/^market-smuggle:([^:]+):/)?.[1];
  return undefined;
}

export function applyCargoDeliveryToMarket(marketState: MarketState, stationId: string, cargoDelivered: Partial<Record<CommodityId, number | undefined>>): MarketState {
  const next = cloneMarketState(marketState);
  for (const [commodityId, amount] of Object.entries(cargoDelivered) as [CommodityId, number | undefined][]) {
    const delivered = amount ?? 0;
    if (delivered <= 0) continue;
    const entry = getMarketEntry(next, stationId, commodityId);
    entry.stock = Math.min(entry.maxStock, entry.stock + delivered);
    entry.demand = Math.max(entry.baselineDemand, entry.demand - delivered / Math.max(8, entry.maxStock) - 0.04);
    next[stationId] = { ...next[stationId], [commodityId]: entry };
  }
  return next;
}

export function applyEconomyDispatchMissionDelivery(marketState: MarketState, mission: MissionDefinition): MarketState {
  if (!isEconomyDispatchMissionId(mission.id) || !mission.cargoRequired) return marketState;
  return applyCargoDeliveryToMarket(marketState, mission.destinationStationId, mission.cargoRequired);
}

export function applyMarketGapMissionDelivery(marketState: MarketState, mission: MissionDefinition): MarketState {
  if (!isMarketGapMissionId(mission.id) || !mission.cargoRequired) return marketState;
  return applyEconomyDispatchMissionDelivery(marketState, mission);
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
