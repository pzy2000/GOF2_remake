import { describe, expect, it } from "vitest";
import { stationById } from "../src/data/world";
import { createInitialMarketState, getMarketEntry } from "../src/systems/economy";
import {
  applyEconomyDispatchMissionDelivery,
  applyMarketGapMissionDelivery,
  createMarketGapMission,
  getAvailableEconomyDispatchMissions,
  getAvailableMarketGapMissions,
  getAvailableSmugglingMissions,
  getEconomyDispatchMissionById,
  getMarketPressureSignals,
  isEconomyDispatchMissionId,
  isMarketGapMissionId,
  isMarketSmugglingMissionId
} from "../src/systems/marketMissions";
import type { CommodityId, MarketState } from "../src/types/game";

function setMarketEntry(marketState: MarketState, stationId: string, commodityId: CommodityId, patch: { stock?: number; demand?: number }) {
  const entry = getMarketEntry(marketState, stationId, commodityId);
  marketState[stationId] = {
    ...marketState[stationId],
    [commodityId]: {
      ...entry,
      ...patch
    }
  };
}

describe("market pressure and generated contracts", () => {
  it("detects shortages and surpluses from stock and demand pressure", () => {
    const marketState = createInitialMarketState();
    const foodEntry = getMarketEntry(marketState, "helion-prime", "basic-food");
    const ironEntry = getMarketEntry(marketState, "kuro-deep", "iron");
    setMarketEntry(marketState, "helion-prime", "basic-food", { stock: 0, demand: foodEntry.baselineDemand + 0.7 });
    setMarketEntry(marketState, "kuro-deep", "iron", { stock: ironEntry.maxStock, demand: ironEntry.baselineDemand - 0.2 });

    const signals = getMarketPressureSignals(marketState);

    expect(signals.find((signal) => signal.kind === "shortage" && signal.stationId === "helion-prime" && signal.commodityId === "basic-food")).toMatchObject({
      severity: "critical"
    });
    expect(signals.find((signal) => signal.kind === "surplus" && signal.stationId === "kuro-deep" && signal.commodityId === "iron")).toBeDefined();
  });

  it("does not generate low-tech contracts for unavailable commodities", () => {
    const marketState = createInitialMarketState();
    const station = stationById["helion-prime"];
    expect(station.techLevel).toBeLessThan(4);
    const entry = getMarketEntry(marketState, station.id, "data-cores");
    setMarketEntry(marketState, station.id, "data-cores", { stock: 0, demand: entry.baselineDemand + 0.8 });

    expect(getMarketPressureSignals(marketState).some((signal) => signal.stationId === station.id && signal.commodityId === "data-cores")).toBe(false);
    expect(getAvailableMarketGapMissions({ marketState, systemId: station.systemId, activeMissions: [] }).some((mission) => mission.cargoRequired?.["data-cores"])).toBe(false);
  });

  it("generates stable market-gap mission ids and scales rewards with severity", () => {
    const strainedMarket = createInitialMarketState();
    const criticalMarket = createInitialMarketState();
    const base = getMarketEntry(strainedMarket, "helion-prime", "electronics");
    setMarketEntry(strainedMarket, "helion-prime", "electronics", { stock: Math.floor(base.maxStock * 0.32), demand: base.baselineDemand + 0.18 });
    setMarketEntry(criticalMarket, "helion-prime", "electronics", { stock: 0, demand: base.baselineDemand + 0.7 });

    const strainedSignal = getMarketPressureSignals(strainedMarket).find((signal) => signal.stationId === "helion-prime" && signal.commodityId === "electronics")!;
    const criticalSignal = getMarketPressureSignals(criticalMarket).find((signal) => signal.stationId === "helion-prime" && signal.commodityId === "electronics")!;
    const strainedMission = createMarketGapMission(strainedMarket, strainedSignal)!;
    const criticalMission = createMarketGapMission(criticalMarket, criticalSignal)!;

    expect(isMarketGapMissionId(strainedMission.id)).toBe(true);
    expect(strainedMission.id).toBe(`market-gap:helion-prime:electronics:${strainedSignal.severity}`);
    expect(criticalMission.reward).toBeGreaterThan(strainedMission.reward);
  });

  it("applies delivery back into station stock without changing save schema", () => {
    const marketState = createInitialMarketState();
    const entry = getMarketEntry(marketState, "helion-prime", "basic-food");
    setMarketEntry(marketState, "helion-prime", "basic-food", { stock: 1, demand: entry.baselineDemand + 0.4 });
    const mission = getAvailableMarketGapMissions({ marketState, systemId: "helion-reach", activeMissions: [] })[0];

    const next = applyMarketGapMissionDelivery(marketState, mission);
    const before = getMarketEntry(marketState, "helion-prime", "basic-food");
    const after = getMarketEntry(next, "helion-prime", "basic-food");

    expect(after.stock).toBeGreaterThan(before.stock);
    expect(after.demand).toBeLessThan(before.demand);
  });

  it("generates smuggling dispatch missions from current-system restricted sources", () => {
    const marketState = createInitialMarketState();
    const sourceEntry = getMarketEntry(marketState, "black-arcade", "illegal-contraband");
    const destinationEntry = getMarketEntry(marketState, "vantara-bastion", "illegal-contraband");
    setMarketEntry(marketState, "black-arcade", "illegal-contraband", { stock: Math.max(4, sourceEntry.stock), demand: sourceEntry.baselineDemand });
    setMarketEntry(marketState, "vantara-bastion", "illegal-contraband", { stock: 0, demand: destinationEntry.baselineDemand + 0.5 });

    const [mission] = getAvailableSmugglingMissions({ marketState, systemId: "ashen-drift", activeMissions: [], limit: 2 });

    expect(mission).toBeDefined();
    expect(isMarketSmugglingMissionId(mission.id)).toBe(true);
    expect(isEconomyDispatchMissionId(mission.id)).toBe(true);
    expect(stationById[mission.sourceStationId!].systemId).toBe("ashen-drift");
    expect(mission.destinationStationId).toBe("vantara-bastion");
    expect(mission.cargoRequired?.["illegal-contraband"]).toBeGreaterThan(0);
    expect(mission.description).toContain("Hostile Pursuit");
  });

  it("resolves dispatch missions by id and filters hidden stations unless revealed", () => {
    const marketState = createInitialMarketState();
    const hiddenEntry = getMarketEntry(marketState, "parallax-hermitage", "data-cores");
    setMarketEntry(marketState, "parallax-hermitage", "data-cores", { stock: 0, demand: hiddenEntry.baselineDemand + 0.8 });

    const withoutHidden = getAvailableEconomyDispatchMissions({
      marketState,
      systemId: "mirr-vale",
      activeMissions: [],
      knownSystemIds: ["mirr-vale"],
      knownPlanetIds: ["hush-orbit"],
      explorationState: { discoveredSignalIds: [], completedSignalIds: [], revealedStationIds: [], eventLogIds: [] }
    });
    const withHidden = getAvailableEconomyDispatchMissions({
      marketState,
      systemId: "mirr-vale",
      activeMissions: [],
      knownSystemIds: ["mirr-vale"],
      knownPlanetIds: ["hush-orbit"],
      explorationState: { discoveredSignalIds: [], completedSignalIds: [], revealedStationIds: ["parallax-hermitage"], eventLogIds: [] }
    });

    expect(withoutHidden.some((mission) => mission.destinationStationId === "parallax-hermitage")).toBe(false);
    const hiddenMission = withHidden.find((mission) => mission.destinationStationId === "parallax-hermitage");
    expect(hiddenMission).toBeDefined();
    expect(getEconomyDispatchMissionById(marketState, hiddenMission!.id, {
      knownSystemIds: ["mirr-vale"],
      knownPlanetIds: ["hush-orbit"],
      explorationState: { discoveredSignalIds: [], completedSignalIds: [], revealedStationIds: ["parallax-hermitage"], eventLogIds: [] }
    })?.id).toBe(hiddenMission!.id);
  });

  it("applies smuggling delivery through the shared dispatch delivery helper", () => {
    const marketState = createInitialMarketState();
    const destination = getMarketEntry(marketState, "vantara-bastion", "illegal-contraband");
    setMarketEntry(marketState, "vantara-bastion", "illegal-contraband", { stock: 0, demand: destination.baselineDemand + 0.5 });
    const mission = getAvailableSmugglingMissions({ marketState, systemId: "ashen-drift", activeMissions: [], limit: 1 })[0];

    const next = applyEconomyDispatchMissionDelivery(marketState, mission);
    const after = getMarketEntry(next, mission.destinationStationId, "illegal-contraband");

    expect(after.stock).toBeGreaterThan(0);
    expect(after.demand).toBeLessThan(getMarketEntry(marketState, mission.destinationStationId, "illegal-contraband").demand);
  });
});
