import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAsteroidsForSystem } from "../src/systems/asteroids";
import { createInitialMarketState, getMarketEntry } from "../src/systems/economy";
import { getFactionHeatRecord } from "../src/systems/factionConsequences";
import { getAvailableMarketGapMissions } from "../src/systems/marketMissions";
import type { EconomyNpcInteractionResponse, EconomyNpcResponse, EconomySnapshot } from "../src/types/economy";
import type { CommodityId, FlightEntity, MarketState } from "../src/types/game";

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  key(index: number) {
    return Array.from(this.data.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

async function freshStore() {
  vi.resetModules();
  vi.stubGlobal("localStorage", new MemoryStorage());
  const module = await import("../src/state/gameStore");
  module.useGameStore.getState().newGame();
  return module.useGameStore;
}

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

function watchableEconomyMiner(targetId: string): FlightEntity {
  return {
    id: "econ-watch-miner",
    name: "Ore Cutter",
    role: "miner",
    factionId: "free-belt-union",
    position: [20, 8, -40],
    velocity: [0, 0, -28],
    hull: 125,
    shield: 58,
    maxHull: 125,
    maxShield: 58,
    lastDamageAt: -999,
    fireCooldown: 0.6,
    aiProfileId: "miner",
    aiState: "patrol",
    aiTimer: 0,
    economySerial: "HR-MN-04",
    economyHomeStationId: "cinder-yard",
    economyRiskPreference: "balanced",
    economyContractId: "HR-MN-04-MINING",
    economyLedger: { revenue: 0, expenses: 0, losses: 0, completedContracts: 0, failedContracts: 0, minedUnits: 0 },
    economyTaskKind: "mining",
    economyStatus: "MINING · Iron",
    economyCargo: {},
    economyCommodityId: "iron",
    economyTargetId: targetId
  };
}

function watchableEconomyFreighter(patch: Partial<FlightEntity> = {}): FlightEntity {
  return {
    id: "econ-watch-freighter",
    name: "Union Bulk Freighter",
    role: "freighter",
    factionId: "free-belt-union",
    position: [24, 0, 118],
    velocity: [0, 0, -18],
    hull: 170,
    shield: 70,
    maxHull: 170,
    maxShield: 70,
    lastDamageAt: -999,
    fireCooldown: 0.6,
    aiProfileId: "freighter",
    aiState: "patrol",
    aiTimer: 0,
    economySerial: "HR-FR-02",
    economyHomeStationId: "helion-prime",
    economyRiskPreference: "balanced",
    economyContractId: "HR-FR-02-FREIGHT",
    economyLedger: { revenue: 0, expenses: 0, losses: 0, completedContracts: 0, failedContracts: 0, minedUnits: 0 },
    economyTaskKind: "hauling",
    economyTaskProgress: 0.2,
    economyStatus: "HAULING · Basic Food",
    economyCargo: { "basic-food": 6 },
    economyCommodityId: "basic-food",
    economyTargetId: "helion-prime",
    ...patch
  };
}

function snapshotWithoutVisibleNpcs(snapshotId = 52, recentEvents: EconomySnapshot["recentEvents"] = []): EconomySnapshot {
  return {
    version: 1,
    snapshotId,
    clock: 20,
    marketState: createInitialMarketState(),
    status: "connected",
    recentEvents,
    resourceBelts: [],
    visibleNpcs: []
  };
}

function watchedTransitNpcResponse(snapshotId = 52): EconomyNpcResponse {
  return {
    version: 1,
    snapshotId,
    clock: 20,
    status: "connected",
    npc: {
      id: "econ-watch-miner",
      name: "Ore Cutter",
      serial: "HR-MN-04",
      role: "miner",
      factionId: "free-belt-union",
      systemId: "__transit__",
      homeStationId: "cinder-yard",
      riskPreference: "balanced",
      lineageId: "econ-watch-miner",
      generation: 0,
      position: [0, 0, 0],
      velocity: [0, 0, 0],
      hull: 125,
      shield: 58,
      maxHull: 125,
      maxShield: 58,
      cargoCapacity: 20,
      cargo: { iron: 4 },
      credits: 5000,
      ledger: { revenue: 0, expenses: 0, losses: 0, completedContracts: 0, failedContracts: 0, minedUnits: 4 },
      lastTradeAt: 0,
      statusLabel: "HAULING · Iron",
      task: {
        kind: "hauling",
        contractId: "HR-MN-04-FREIGHT",
        commodityId: "iron",
        originStationId: "cinder-yard",
        destinationStationId: "helion-prime",
        progress: 0.45,
        startedAt: 12
      }
    }
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("economy store integration", () => {
  it("applies backend snapshots as market and visible economy NPC authority", async () => {
    const store = await freshStore();
    const marketState = createInitialMarketState();
    const asteroids = createAsteroidsForSystem("helion-reach", 0.18);
    const snapshot: EconomySnapshot = {
      version: 1,
      snapshotId: 42,
      clock: 12,
      marketState,
      status: "connected",
      recentEvents: [],
      resourceBelts: [{ systemId: "helion-reach", asteroids }],
      visibleNpcs: [
        {
          id: "econ-helion-reach-miner-test",
          name: "Ore Cutter",
          serial: "HR-MN-99",
          role: "miner",
          factionId: "free-belt-union",
          systemId: "helion-reach",
          homeStationId: "cinder-yard",
          riskPreference: "balanced",
          lineageId: "econ-helion-reach-miner-test",
          generation: 0,
          position: [0, 0, -90],
          velocity: [0, 0, -10],
          hull: 125,
          shield: 58,
          maxHull: 125,
          maxShield: 58,
          cargoCapacity: 20,
          cargo: { iron: 1 },
          credits: 5000,
          ledger: { revenue: 0, expenses: 0, losses: 0, completedContracts: 0, failedContracts: 0, minedUnits: 1 },
          lastTradeAt: 0,
          statusLabel: "MINING · Iron",
          task: {
            kind: "mining",
            contractId: "HR-MN-99-MINING",
            asteroidId: asteroids[0].id,
            commodityId: "iron",
            originStationId: "cinder-yard",
            progress: 0.4,
            startedAt: 10
          }
        }
      ]
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(snapshot), { status: 200, headers: { "Content-Type": "application/json" } }))
    );

    await store.getState().refreshEconomySnapshot();

    const state = store.getState();
    expect(state.economyService).toMatchObject({ status: "connected", snapshotId: 42 });
    expect(state.runtime.enemies.find((ship) => ship.id === "econ-helion-reach-miner-test")).toMatchObject({
      role: "miner",
      loadoutId: "union-miner",
      economyStatus: "MINING · Iron",
      economyTaskKind: "mining",
      economyTargetId: asteroids[0].id
    });
    expect(state.runtime.enemies.some((ship) => ship.id === "helion-reach-trader-0")).toBe(false);
    expect(state.runtime.asteroids[0].id).toBe(asteroids[0].id);
  });

  it("keeps local market fallback usable when the backend is offline", async () => {
    const store = await freshStore();
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("offline");
    }));

    await store.getState().refreshEconomySnapshot();
    store.getState().dockAt("helion-prime");
    store.getState().buy("basic-food", 1);

    const state = store.getState();
    expect(state.economyService.status).toBe("offline");
    expect(state.player.cargo["basic-food"]).toBe(4);
    expect(state.runtime.message).toContain("Bought 1 Basic Food");
  });

  it("applies an economy backend reset snapshot without touching player cargo", async () => {
    const store = await freshStore();
    const marketState = createInitialMarketState();
    const snapshot: EconomySnapshot = {
      version: 1,
      snapshotId: 1,
      clock: 0,
      marketState,
      status: "connected",
      recentEvents: [],
      resourceBelts: [],
      visibleNpcs: []
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toContain("/api/economy/reset?systemId=helion-reach");
      return new Response(JSON.stringify(snapshot), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);
    store.setState((state) => ({ player: { ...state.player, cargo: { ...state.player.cargo, iron: 2 } } }));

    await store.getState().resetEconomyBackend();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(store.getState().economyService).toMatchObject({ status: "connected", snapshotId: 1, lastEvent: "Economy state reset." });
    expect(store.getState().runtime.message).toBe("Economy backend reset.");
    expect(store.getState().player.cargo.iron).toBe(2);
  });

  it("keeps the local market available when economy reset fails", async () => {
    const store = await freshStore();
    const marketState = createInitialMarketState();
    const entry = getMarketEntry(marketState, "helion-prime", "basic-food");
    setMarketEntry(marketState, "helion-prime", "basic-food", { stock: 3, demand: entry.baselineDemand + 0.4 });
    store.setState({ marketState });
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("reset offline");
    }));

    await store.getState().resetEconomyBackend();

    expect(store.getState().economyService).toMatchObject({ status: "offline", lastError: "reset offline" });
    expect(store.getState().runtime.message).toContain("Economy reset failed");
    expect(getMarketEntry(store.getState().marketState, "helion-prime", "basic-food").stock).toBe(3);
  });

  it("watches a station economy NPC and returns to the economy tab without undocking", async () => {
    const store = await freshStore();
    store.getState().dockAt("helion-prime");
    const playerBefore = store.getState().player;
    const asteroid = store.getState().runtime.asteroids[0];
    store.setState((state) => ({
      stationTab: "Economy",
      runtime: {
        ...state.runtime,
        enemies: [...state.runtime.enemies, watchableEconomyMiner(asteroid.id)]
      }
    }));

    store.getState().startEconomyNpcWatch("econ-watch-miner");

    expect(store.getState()).toMatchObject({
      screen: "economyWatch",
      currentStationId: "helion-prime",
      stationTab: "Economy",
      economyNpcWatch: {
        npcId: "econ-watch-miner",
        returnStationId: "helion-prime",
        cameraMode: "cockpit"
      }
    });
    expect(store.getState().player.position).toEqual(playerBefore.position);
    expect(store.getState().player.cargo).toEqual(playerBefore.cargo);

    store.getState().setInput({ pause: true });
    store.getState().tick(1 / 60);

    expect(store.getState().screen).toBe("station");
    expect(store.getState().stationTab).toBe("Economy");
    expect(store.getState().currentStationId).toBe("helion-prime");
    expect(store.getState().economyNpcWatch).toBeUndefined();
  });

  it("uses mouse input for watch camera look and auto-returns when the NPC signal disappears", async () => {
    const store = await freshStore();
    store.getState().dockAt("helion-prime");
    const rotationBefore = store.getState().player.rotation;
    const asteroid = store.getState().runtime.asteroids[0];
    store.setState((state) => ({
      runtime: {
        ...state.runtime,
        enemies: [...state.runtime.enemies, watchableEconomyMiner(asteroid.id)]
      }
    }));

    store.getState().startEconomyNpcWatch("econ-watch-miner");
    store.getState().setInput({ mouseDX: 80, mouseDY: -40, toggleCamera: true });
    store.getState().tick(1 / 60);

    expect(store.getState().player.rotation).toEqual(rotationBefore);
    expect(store.getState().economyNpcWatch).toMatchObject({
      cameraMode: "chase"
    });
    expect(store.getState().economyNpcWatch?.lookYaw).not.toBe(0);
    expect(store.getState().economyNpcWatch?.lookPitch).not.toBe(0);

    store.setState((state) => ({
      runtime: {
        ...state.runtime,
        enemies: state.runtime.enemies.filter((ship) => ship.id !== "econ-watch-miner")
      }
    }));
    store.getState().tick(1 / 60);

    expect(store.getState().screen).toBe("station");
    expect(store.getState().stationTab).toBe("Economy");
    expect(store.getState().runtime.message).toBe("NPC signal lost.");
  });

  it("keeps a watched NPC when watch starts during an in-flight snapshot refresh", async () => {
    const store = await freshStore();
    store.getState().dockAt("helion-prime");
    const asteroid = store.getState().runtime.asteroids[0];
    store.setState((state) => ({
      runtime: {
        ...state.runtime,
        enemies: [...state.runtime.enemies, watchableEconomyMiner(asteroid.id)]
      }
    }));
    let resolveSnapshot: (response: Response) => void = () => undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Promise<Response>((resolve) => {
        resolveSnapshot = resolve;
      }))
    );

    const refresh = store.getState().refreshEconomySnapshot();
    store.getState().startEconomyNpcWatch("econ-watch-miner");
    resolveSnapshot(new Response(JSON.stringify(snapshotWithoutVisibleNpcs(52)), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }));
    await refresh;
    store.getState().tick(1 / 60);

    const state = store.getState();
    expect(state.screen).toBe("economyWatch");
    expect(state.economyNpcWatch?.npcId).toBe("econ-watch-miner");
    expect(state.runtime.enemies.find((ship) => ship.id === "econ-watch-miner")).toBeDefined();
  });

  it("keeps economy watch active when the watched NPC is only returned by the remote lookup", async () => {
    const store = await freshStore();
    store.getState().dockAt("helion-prime");
    const asteroid = store.getState().runtime.asteroids[0];
    store.setState((state) => ({
      runtime: {
        ...state.runtime,
        enemies: [...state.runtime.enemies, watchableEconomyMiner(asteroid.id)]
      }
    }));
    store.getState().startEconomyNpcWatch("econ-watch-miner");
    const snapshot = snapshotWithoutVisibleNpcs(53, [
      {
        id: "econ-watch-event",
        type: "npc-task",
        clock: 19,
        message: "Ore Cutter entered transit to Helion Prime.",
        systemId: "__transit__",
        npcId: "econ-watch-miner",
        commodityId: "iron",
        snapshotId: 53
      }
    ]);
    const npcResponse = watchedTransitNpcResponse(53);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/economy/snapshot")) {
          return new Response(JSON.stringify(snapshot), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        if (url.includes("/api/economy/npc/econ-watch-miner")) {
          return new Response(JSON.stringify(npcResponse), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify({ message: "Unexpected economy request." }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      })
    );

    await store.getState().refreshEconomySnapshot();
    store.getState().tick(1 / 60);

    const state = store.getState();
    expect(state.screen).toBe("economyWatch");
    expect(state.economyNpcWatch?.npcId).toBe("econ-watch-miner");
    expect(state.runtime.enemies.find((ship) => ship.id === "econ-watch-miner")).toMatchObject({
      economySystemId: "__transit__",
      economyTaskKind: "hauling",
      economyTaskProgress: 0.45,
      economyCargo: { iron: 4 }
    });
    expect(state.economyEvents[0]?.message).toContain("entered transit");
  });

  it("preserves the cached watched NPC on temporary remote lookup failure", async () => {
    const store = await freshStore();
    store.getState().dockAt("helion-prime");
    const asteroid = store.getState().runtime.asteroids[0];
    store.setState((state) => ({
      runtime: {
        ...state.runtime,
        enemies: [...state.runtime.enemies, watchableEconomyMiner(asteroid.id)]
      }
    }));
    store.getState().startEconomyNpcWatch("econ-watch-miner");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/economy/snapshot")) {
          return new Response(JSON.stringify(snapshotWithoutVisibleNpcs(54)), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }
        if (url.includes("/api/economy/npc/econ-watch-miner")) {
          return new Response(JSON.stringify({ message: "watch offline" }), {
            status: 503,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ message: "Unexpected economy request." }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      })
    );

    await store.getState().refreshEconomySnapshot();
    store.getState().tick(1 / 60);

    const state = store.getState();
    expect(state.screen).toBe("economyWatch");
    expect(state.runtime.enemies.find((ship) => ship.id === "econ-watch-miner")).toBeDefined();
    expect(state.economyService).toMatchObject({ status: "offline", lastError: "watch offline" });
  });

  it("preserves the cached watched NPC when an old backend returns route-not-found for the watch endpoint", async () => {
    const store = await freshStore();
    store.getState().dockAt("helion-prime");
    const asteroid = store.getState().runtime.asteroids[0];
    store.setState((state) => ({
      runtime: {
        ...state.runtime,
        enemies: [...state.runtime.enemies, watchableEconomyMiner(asteroid.id)]
      }
    }));
    store.getState().startEconomyNpcWatch("econ-watch-miner");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/economy/snapshot")) {
          return new Response(JSON.stringify(snapshotWithoutVisibleNpcs(56)), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }
        if (url.includes("/api/economy/npc/econ-watch-miner")) {
          return new Response(JSON.stringify({ message: "Route not found." }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ message: "Unexpected economy request." }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      })
    );

    await store.getState().refreshEconomySnapshot();
    store.getState().tick(1 / 60);

    const state = store.getState();
    expect(state.screen).toBe("economyWatch");
    expect(state.runtime.enemies.find((ship) => ship.id === "econ-watch-miner")).toBeDefined();
    expect(state.economyService).toMatchObject({ status: "offline", lastError: "Route not found." });
  });

  it("returns from economy watch when the remote watched NPC lookup returns 404", async () => {
    const store = await freshStore();
    store.getState().dockAt("helion-prime");
    const asteroid = store.getState().runtime.asteroids[0];
    store.setState((state) => ({
      runtime: {
        ...state.runtime,
        enemies: [...state.runtime.enemies, watchableEconomyMiner(asteroid.id)]
      }
    }));
    store.getState().startEconomyNpcWatch("econ-watch-miner");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/economy/snapshot")) {
          return new Response(JSON.stringify(snapshotWithoutVisibleNpcs(55)), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }
        if (url.includes("/api/economy/npc/econ-watch-miner")) {
          return new Response(JSON.stringify({ message: "Economy NPC not found." }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ message: "Unexpected economy request." }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      })
    );

    await store.getState().refreshEconomySnapshot();

    const state = store.getState();
    expect(state.screen).toBe("station");
    expect(state.stationTab).toBe("Economy");
    expect(state.economyNpcWatch).toBeUndefined();
    expect(state.runtime.message).toBe("NPC signal lost.");
  });

  it("accepts generated market gap contracts and applies delivery to local market pressure", async () => {
    const store = await freshStore();
    const marketState = createInitialMarketState();
    const entry = getMarketEntry(marketState, "helion-prime", "basic-food");
    setMarketEntry(marketState, "helion-prime", "basic-food", { stock: 1, demand: entry.baselineDemand + 0.45 });
    store.setState({ marketState });
    store.getState().dockAt("helion-prime");

    const mission = getAvailableMarketGapMissions({
      marketState: store.getState().marketState,
      systemId: "helion-reach",
      activeMissions: []
    })[0];
    expect(mission.id).toMatch(/^market-gap:/);

    store.getState().acceptMission(mission.id);
    expect(store.getState().activeMissions[0]).toMatchObject({ id: mission.id, accepted: true });

    store.setState((state) => ({
      player: {
        ...state.player,
        cargo: {
          ...state.player.cargo,
          "basic-food": mission.cargoRequired!["basic-food"]
        }
      }
    }));
    const before = getMarketEntry(store.getState().marketState, "helion-prime", "basic-food");
    store.getState().completeMission(mission.id);
    const after = getMarketEntry(store.getState().marketState, "helion-prime", "basic-food");

    expect(store.getState().activeMissions.some((active) => active.id === mission.id)).toBe(false);
    expect(store.getState().completedMissionIds).not.toContain(mission.id);
    expect(after.stock).toBeGreaterThan(before.stock);
    expect(after.demand).toBeLessThan(before.demand);
    expect(store.getState().runtime.message).toContain("Market pressure eased");
  });

  it("keeps accepted market gap missions through economy snapshot refreshes", async () => {
    const store = await freshStore();
    const marketState = createInitialMarketState();
    const entry = getMarketEntry(marketState, "helion-prime", "basic-food");
    setMarketEntry(marketState, "helion-prime", "basic-food", { stock: 1, demand: entry.baselineDemand + 0.45 });
    store.setState({ marketState });
    const mission = getAvailableMarketGapMissions({ marketState, systemId: "helion-reach", activeMissions: [] })[0];
    store.getState().acceptMission(mission.id);

    const snapshot: EconomySnapshot = {
      version: 1,
      snapshotId: 77,
      clock: 15,
      marketState: createInitialMarketState(),
      status: "connected",
      recentEvents: [
        {
          id: "econ-event-test",
          type: "npc-trade",
          clock: 14,
          message: "Union Bulk Freighter sold 4 Basic Food at Helion Prime.",
          systemId: "helion-reach",
          stationId: "helion-prime",
          commodityId: "basic-food",
          amount: 4,
          snapshotId: 77
        }
      ],
      resourceBelts: [],
      visibleNpcs: []
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(snapshot), { status: 200, headers: { "Content-Type": "application/json" } }))
    );

    await store.getState().refreshEconomySnapshot();

    expect(store.getState().activeMissions.some((active) => active.id === mission.id)).toBe(true);
    expect(store.getState().economyEvents[0]?.message).toContain("Basic Food");
  });
});
