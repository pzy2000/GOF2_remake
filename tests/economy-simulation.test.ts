import { describe, expect, it } from "vitest";
import { stationById } from "../src/data/world";
import { getMarketEntry } from "../src/systems/economy";
import { createInitialEconomyState, tickEconomyState } from "../src/systems/economySimulation";

describe("NPC economy simulation", () => {
  it("lets miners collect ore and sell it back into station inventory", () => {
    const state = createInitialEconomyState();
    const miner = state.npcs.find((npc) => npc.id === "econ-kuro-belt-miner-3")!;
    const asteroid = state.resourceBelts["kuro-belt"].asteroids.find((item) => item.resource === "iron")!;
    const station = stationById["kuro-deep"];
    const before = getMarketEntry(state.marketState, station.id, "iron");

    miner.systemId = "kuro-belt";
    miner.position = [...asteroid.position];
    miner.cargoCapacity = 1;
    miner.task = {
      kind: "mining",
      asteroidId: asteroid.id,
      commodityId: "iron",
      originStationId: station.id,
      progress: 0.95,
      startedAt: state.clock
    };

    tickEconomyState(state, 1);
    expect(miner.cargo.iron).toBe(1);
    expect(miner.task.kind).toBe("returning");
    expect(asteroid.amount).toBeLessThan(4);

    miner.position = [...station.position];
    tickEconomyState(state, 1);

    const after = getMarketEntry(state.marketState, station.id, "iron");
    expect(miner.cargo.iron).toBeUndefined();
    expect(after.stock).toBeGreaterThan(before.stock);
    expect(after.demand).toBeLessThan(before.demand);
    expect(state.recentEvents.some((event) => event.type === "npc-mined")).toBe(true);
    expect(state.recentEvents.some((event) => event.type === "npc-trade" && event.stationId === station.id)).toBe(true);
  });

  it("moves freight through bounded NPC buy and sell transactions", () => {
    const state = createInitialEconomyState();
    const trader = state.npcs.find((npc) => npc.id === "econ-kuro-belt-trader-0")!;
    const origin = stationById["kuro-deep"];
    const destination = stationById["helion-prime"];
    const originBefore = getMarketEntry(state.marketState, origin.id, "iron");

    trader.systemId = origin.systemId;
    trader.position = [...origin.position];
    trader.cargo = {};
    trader.task = {
      kind: "buying",
      commodityId: "iron",
      originStationId: origin.id,
      destinationStationId: destination.id,
      progress: 0,
      startedAt: state.clock
    };

    tickEconomyState(state, 1);

    const originAfter = getMarketEntry(state.marketState, origin.id, "iron");
    expect(trader.cargo.iron).toBeGreaterThan(0);
    expect(originAfter.stock).toBeLessThan(originBefore.stock);
    expect(trader.task.kind).toBe("hauling");

    state.stationThroughput[destination.id] = { windowStart: state.clock, boughtByNpcs: 0, soldByNpcs: 13 };
    trader.systemId = destination.systemId;
    trader.position = [...destination.position];
    trader.cargo = { iron: 10 };
    trader.task = {
      kind: "selling",
      commodityId: "iron",
      originStationId: origin.id,
      destinationStationId: destination.id,
      progress: 1,
      startedAt: state.clock
    };
    const destinationBefore = getMarketEntry(state.marketState, destination.id, "iron");

    tickEconomyState(state, 1);

    const destinationAfter = getMarketEntry(state.marketState, destination.id, "iron");
    expect(trader.cargo.iron).toBe(9);
    expect(destinationAfter.stock - destinationBefore.stock).toBeCloseTo(1, 1);
    expect(trader.task.kind).toBe("selling");
  });
});
