import { describe, expect, it } from "vitest";
import { stationById } from "../src/data/world";
import { getMarketEntry } from "../src/systems/economy";
import { getAvailableMarketGapMissions } from "../src/systems/marketMissions";
import {
  createEconomySnapshot,
  createInitialEconomyState,
  handleEconomyNpcInteraction,
  markEconomyNpcDestroyed,
  normalizeEconomyState,
  tickEconomyState
} from "../src/systems/economySimulation";

describe("NPC economy simulation", () => {
  it("creates stable individual NPC metadata with unique serials and ledgers", () => {
    const state = createInitialEconomyState();
    const serials = new Set(state.npcs.map((npc) => npc.serial));
    const miner = state.npcs.find((npc) => npc.id === "econ-helion-reach-miner-3")!;

    expect(serials.size).toBe(state.npcs.length);
    expect(miner).toMatchObject({
      serial: "HR-MN-04",
      homeStationId: "cinder-yard",
      lineageId: "econ-helion-reach-miner-3",
      generation: 0,
      ledger: {
        revenue: 0,
        expenses: 0,
        losses: 0,
        completedContracts: 0,
        failedContracts: 0,
        minedUnits: 0
      }
    });
    expect(["cautious", "balanced", "bold"]).toContain(miner.riskPreference);
  });

  it("keeps miners idle with a depleted status when their local belt is empty", () => {
    const state = createInitialEconomyState();
    const miner = state.npcs.find((npc) => npc.id === "econ-helion-reach-miner-3")!;
    state.resourceBelts["helion-reach"].asteroids = state.resourceBelts["helion-reach"].asteroids.map((asteroid) => ({
      ...asteroid,
      amount: 0,
      miningProgress: 0
    }));
    miner.systemId = "helion-reach";
    miner.cargo = {};
    miner.task = { kind: "idle", originStationId: "cinder-yard", startedAt: state.clock };

    tickEconomyState(state, 1);

    expect(miner.task).toMatchObject({ kind: "idle", originStationId: "cinder-yard" });
    expect(miner.statusLabel).toBe("IDLE · Belt depleted");
    expect(state.resourceBelts["helion-reach"].asteroids.every((asteroid) => asteroid.amount === 0)).toBe(true);
  });

  it("slowly regenerates depleted belts and sends idle miners back to work", () => {
    const state = createInitialEconomyState();
    const miner = state.npcs.find((npc) => npc.id === "econ-helion-reach-miner-3")!;
    state.resourceBelts["helion-reach"].asteroids = state.resourceBelts["helion-reach"].asteroids.map((asteroid) => ({
      ...asteroid,
      amount: 0,
      miningProgress: 0
    }));
    miner.systemId = "helion-reach";
    miner.cargo = {};
    miner.position = [...stationById["cinder-yard"].position];
    miner.task = { kind: "idle", originStationId: "cinder-yard", startedAt: 0 };

    tickEconomyState(state, 179);
    expect(state.resourceBelts["helion-reach"].asteroids.every((asteroid) => asteroid.amount === 0)).toBe(true);
    expect(miner.statusLabel).toBe("IDLE · Belt depleted");

    tickEconomyState(state, 1);

    expect(state.resourceBelts["helion-reach"].asteroids.reduce((total, asteroid) => total + asteroid.amount, 0)).toBe(1);
    expect(miner.task.kind).toBe("mining");
    expect(miner.statusLabel).toMatch(/^MINING · /);
  });

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
      contractId: "KB-TR-01-FREIGHT",
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
    expect(trader.task.contractId).toBe("KB-TR-01-FREIGHT");
    expect(trader.ledger.expenses).toBeGreaterThan(0);

    state.stationThroughput[destination.id] = { windowStart: state.clock, boughtByNpcs: 0, soldByNpcs: 13 };
    trader.systemId = destination.systemId;
    trader.position = [...destination.position];
    trader.cargo = { iron: 10 };
    trader.task = {
      kind: "selling",
      contractId: "KB-TR-01-FREIGHT",
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
    expect(trader.task.contractId).toBe("KB-TR-01-FREIGHT");
    expect(trader.ledger.revenue).toBeGreaterThan(0);
  });

  it("queues delayed replacement instead of reviving destroyed NPCs", () => {
    const state = createInitialEconomyState();
    const npc = state.npcs.find((candidate) => candidate.id === "econ-helion-reach-freighter-1")!;
    npc.cargo = { "basic-food": 3 };
    npc.task = {
      kind: "hauling",
      contractId: "HR-FR-02-FREIGHT",
      commodityId: "basic-food",
      originStationId: "helion-prime",
      destinationStationId: "mirr-lattice",
      startedAt: state.clock
    };

    markEconomyNpcDestroyed(state, { npcId: npc.id, systemId: "helion-reach" });

    expect(createEconomySnapshot(state, "helion-reach").visibleNpcs.some((candidate) => candidate.id === npc.id)).toBe(false);
    expect(state.replacementQueue).toHaveLength(1);
    expect(npc.ledger.failedContracts).toBe(1);
    expect(npc.ledger.losses).toBeGreaterThan(0);

    const replacementDueAt = state.replacementQueue[0].dueAt;
    tickEconomyState(state, replacementDueAt - state.clock - 0.1);
    expect(state.npcs.some((candidate) => candidate.id === "econ-helion-reach-freighter-1-g1")).toBe(false);

    tickEconomyState(state, 0.2);

    const replacement = state.npcs.find((candidate) => candidate.id === "econ-helion-reach-freighter-1-g1");
    expect(replacement).toMatchObject({
      role: "freighter",
      homeStationId: "helion-prime",
      lineageId: "econ-helion-reach-freighter-1",
      generation: 1
    });
    expect(replacement?.serial).not.toBe(npc.serial);
    expect(state.recentEvents.some((event) => event.type === "npc-replacement" && event.npcId === replacement?.id)).toBe(true);
  });

  it("records rob, rescue, and report NPC interactions", () => {
    const state = createInitialEconomyState();
    const npc = state.npcs.find((candidate) => candidate.id === "econ-helion-reach-freighter-1")!;
    npc.cargo = { "basic-food": 6, electronics: 2 };
    npc.task = {
      kind: "hauling",
      contractId: "HR-FR-02-FREIGHT",
      commodityId: "basic-food",
      originStationId: "helion-prime",
      destinationStationId: "mirr-lattice",
      startedAt: state.clock
    };

    const robbed = handleEconomyNpcInteraction(state, {
      action: "rob",
      npcId: npc.id,
      systemId: "helion-reach"
    });

    expect(robbed.ok).toBe(true);
    expect(robbed.cargoDropped).toEqual({ "basic-food": 2 });
    expect(npc.cargo["basic-food"]).toBe(4);
    expect(npc.ledger.losses).toBeGreaterThan(0);
    expect(npc.task.kind).toBe("returning");
    expect(robbed.event?.type).toBe("npc-interaction");

    const rescued = handleEconomyNpcInteraction(state, {
      action: "rescue",
      npcId: npc.id,
      systemId: "helion-reach"
    });
    expect(rescued.ok).toBe(true);
    expect(rescued.message).toContain("rescue confirmed");

    const reported = handleEconomyNpcInteraction(state, {
      action: "report",
      npcId: npc.id,
      systemId: "helion-reach"
    });
    expect(reported.ok).toBe(true);
    expect(reported.message).toContain("report filed");
  });

  it("normalizes old economy snapshots with individual NPC defaults", () => {
    const fresh = createInitialEconomyState();
    const oldNpc = {
      id: "econ-helion-reach-miner-3",
      name: "Ore Cutter",
      role: "miner" as const,
      factionId: "free-belt-union" as const,
      systemId: "helion-reach",
      position: [0, 0, 0] as [number, number, number],
      velocity: [0, 0, 0] as [number, number, number],
      hull: 125,
      shield: 58,
      maxHull: 125,
      maxShield: 58,
      cargoCapacity: 20,
      cargo: {},
      credits: 5000,
      task: { kind: "idle" as const, originStationId: "cinder-yard", startedAt: 0 },
      statusLabel: "IDLE",
      lastTradeAt: -999
    };

    const normalized = normalizeEconomyState({
      version: fresh.version,
      snapshotId: 8,
      eventSeq: 0,
      clock: 0,
      marketState: fresh.marketState,
      npcs: [oldNpc as never],
      resourceBelts: fresh.resourceBelts,
      recentEvents: [],
      stationThroughput: {}
    });

    expect(normalized.replacementQueue).toEqual([]);
    expect(normalized.npcs[0]).toMatchObject({
      serial: "HR-MN-04",
      homeStationId: "cinder-yard",
      riskPreference: expect.any(String),
      ledger: {
        revenue: 0,
        expenses: 0,
        losses: 0,
        completedContracts: 0,
        failedContracts: 0,
        minedUnits: 0
      }
    });
  });

  it("lets NPC deliveries ease shortages and remove generated market contracts", () => {
    const state = createInitialEconomyState();
    const freighter = state.npcs.find((npc) => npc.id === "econ-helion-reach-freighter-1")!;
    const station = stationById["helion-prime"];
    const entry = getMarketEntry(state.marketState, station.id, "basic-food");
    state.marketState[station.id] = {
      ...state.marketState[station.id],
      "basic-food": {
        ...entry,
        stock: 3,
        demand: entry.baselineDemand + 0.2
      }
    };
    expect(getAvailableMarketGapMissions({ marketState: state.marketState, systemId: "helion-reach", activeMissions: [] })).toHaveLength(1);

    freighter.systemId = station.systemId;
    freighter.position = [...station.position];
    freighter.cargo = { "basic-food": 20 };
    freighter.task = {
      kind: "selling",
      commodityId: "basic-food",
      destinationStationId: station.id,
      originStationId: "helion-prime",
      progress: 1,
      startedAt: state.clock
    };

    tickEconomyState(state, 1);

    expect(getMarketEntry(state.marketState, station.id, "basic-food").stock).toBeGreaterThan(3);
    expect(getAvailableMarketGapMissions({ marketState: state.marketState, systemId: "helion-reach", activeMissions: [] })).toHaveLength(0);
    expect(state.recentEvents.some((event) => event.type === "npc-trade" && event.commodityId === "basic-food")).toBe(true);
  });
});
