import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAsteroidsForSystem } from "../src/systems/asteroids";
import { createInitialMarketState, getMarketEntry } from "../src/systems/economy";
import { getFactionHeatRecord } from "../src/systems/factionConsequences";
import { getAvailableEconomyDispatchMissions, getAvailableMarketGapMissions, getAvailableSmugglingMissions } from "../src/systems/marketMissions";
import type { EconomyDispatchDeliveryResponse, EconomyNpcInteractionResponse, EconomyNpcResponse, EconomySnapshot } from "../src/types/economy";
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

function backendFreighterSnapshot(patch: Partial<EconomySnapshot["visibleNpcs"][number]> = {}, snapshotId = 64): EconomySnapshot {
  return {
    version: 1,
    snapshotId,
    clock: 20,
    marketState: createInitialMarketState(),
    status: "connected",
    recentEvents: [],
    resourceBelts: [],
    visibleNpcs: [
      {
        id: "econ-watch-freighter",
        name: "Union Bulk Freighter",
        serial: "HR-FR-02",
        role: "freighter",
        factionId: "free-belt-union",
        systemId: "helion-reach",
        homeStationId: "helion-prime",
        riskPreference: "balanced",
        lineageId: "econ-watch-freighter",
        generation: 0,
        position: [24, 0, 118],
        velocity: [0, 0, -18],
        hull: 170,
        shield: 70,
        maxHull: 170,
        maxShield: 70,
        cargoCapacity: 20,
        cargo: { "basic-food": 6 },
        credits: 5000,
        ledger: { revenue: 0, expenses: 0, losses: 0, completedContracts: 0, failedContracts: 0, minedUnits: 0 },
        lastTradeAt: 0,
        statusLabel: "HAULING 路 Basic Food",
        task: {
          kind: "hauling",
          contractId: "HR-FR-02-FREIGHT",
          commodityId: "basic-food",
          originStationId: "helion-prime",
          destinationStationId: "cinder-yard",
          progress: 0.2,
          startedAt: 10
        },
        ...patch
      }
    ]
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
  vi.doUnmock("../src/systems/economyClient");
});

describe("economy store integration", () => {
  it("does not touch network endpoints when the economy backend is disabled", async () => {
    const fetchEconomySnapshot = vi.fn(async () => {
      throw new Error("disabled snapshot should not be requested");
    });
    const connectEconomyEvents = vi.fn(() => {
      throw new Error("disabled stream should not be opened");
    });
    vi.doMock("../src/systems/economyClient", async (importOriginal) => {
      const actual = await importOriginal<typeof import("../src/systems/economyClient")>();
      return {
        ...actual,
        ECONOMY_SERVICE_CONFIG: {
          enabled: false,
          requestBaseUrl: "",
          displayUrl: "static economy fallback",
          disabledReason: "Economy backend disabled for static build."
        },
        ECONOMY_SERVICE_URL: "static economy fallback",
        createEconomyServiceStatus: () => ({
          status: "fallback",
          url: "static economy fallback",
          lastError: "Economy backend disabled for static build."
        }),
        isEconomyServiceEnabled: () => false,
        fetchEconomySnapshot,
        connectEconomyEvents
      };
    });
    const fetch = vi.fn();
    const eventSource = vi.fn();
    vi.stubGlobal("fetch", fetch);
    vi.stubGlobal("EventSource", eventSource);
    vi.resetModules();
    vi.stubGlobal("localStorage", new MemoryStorage());
    const module = await import("../src/state/gameStore");
    module.useGameStore.getState().newGame();
    const store = module.useGameStore;

    await store.getState().refreshEconomySnapshot();
    store.getState().startEconomyStream();
    store.getState().dockAt("helion-prime");
    store.getState().buy("basic-food", 1);

    const state = store.getState();
    expect(fetchEconomySnapshot).not.toHaveBeenCalled();
    expect(connectEconomyEvents).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(eventSource).not.toHaveBeenCalled();
    expect(state.economyService).toMatchObject({
      status: "fallback",
      url: "static economy fallback",
      lastError: "Economy backend disabled for static build."
    });
    expect(state.player.cargo["basic-food"]).toBe(4);
  });

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
          relationTier: "friendly",
          relationSummary: "Friendly - rescued 1",
          personalOfferId: "npc-favor:econ-helion-reach-miner-test:1",
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
      economyTargetId: asteroids[0].id,
      economyRelationTier: "friendly",
      economyRelationSummary: "Friendly - rescued 1",
      economyPersonalOfferId: "npc-favor:econ-helion-reach-miner-test:1"
    });
    expect(state.runtime.enemies.some((ship) => ship.id === "helion-reach-trader-0")).toBe(false);
    expect(state.runtime.asteroids[0].id).toBe(asteroids[0].id);
  });

  it("does not revive a locally destroyed economy NPC when a stale backend snapshot still lists it", async () => {
    const store = await freshStore();
    const destroyedPosition: FlightEntity["position"] = [320, 4, -220];
    const supportWing: FlightEntity = {
      id: "local-patrol-support",
      name: "Patrol Support Wing",
      role: "patrol",
      factionId: "solar-directorate",
      position: [80, 12, -60],
      velocity: [0, 0, 0],
      hull: 0,
      shield: 0,
      maxHull: 96,
      maxShield: 72,
      lastDamageAt: 1,
      fireCooldown: 0.2,
      aiProfileId: "patrol-support",
      aiState: "attack",
      aiTargetId: "player",
      aiTimer: 0,
      deathTimer: 0.42,
      supportWing: true
    };
    const staleSnapshot = backendFreighterSnapshot({ position: [24, 0, 118], hull: 170, shield: 70 }, 64);
    const acknowledgedSnapshot = snapshotWithoutVisibleNpcs(65);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(staleSnapshot), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify(acknowledgedSnapshot), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    store.setState((state) => ({
      currentSystemId: "helion-reach",
      runtime: {
        ...state.runtime,
        enemies: [
          watchableEconomyFreighter({ position: destroyedPosition, hull: 0, shield: 0, deathTimer: 0.42 }),
          supportWing
        ]
      }
    }));

    await store.getState().refreshEconomySnapshot();

    const staleState = store.getState();
    expect(staleState.runtime.enemies.find((ship) => ship.id === "econ-watch-freighter")).toMatchObject({
      hull: 0,
      shield: 0,
      deathTimer: 0.42,
      position: destroyedPosition
    });
    expect(staleState.runtime.enemies.find((ship) => ship.id === "local-patrol-support")).toMatchObject({
      supportWing: true,
      deathTimer: 0.42
    });

    await store.getState().refreshEconomySnapshot();
    expect(store.getState().runtime.enemies.find((ship) => ship.id === "econ-watch-freighter")).toMatchObject({
      hull: 0,
      deathTimer: 0.42,
      position: destroyedPosition
    });

    store.getState().tick(0.5);
    expect(store.getState().runtime.enemies.some((ship) => ship.id === "econ-watch-freighter")).toBe(false);
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

  it("opens a flight NPC interaction panel and handles hail plus escort objectives", async () => {
    const store = await freshStore();
    store.setState((state) => ({
      targetId: "econ-watch-freighter",
      runtime: {
        ...state.runtime,
        graceUntil: 999,
        enemies: [watchableEconomyFreighter()]
      }
    }));

    store.getState().interact();

    expect(store.getState().npcInteraction).toMatchObject({
      npcId: "econ-watch-freighter",
      openedFrom: "flight"
    });

    await store.getState().executeNpcInteraction("hail", "econ-watch-freighter");
    expect(store.getState().npcInteraction?.message).toContain("Freight run active");

    const creditsBefore = store.getState().player.credits;
    await store.getState().executeNpcInteraction("escort", "econ-watch-freighter");
    expect(store.getState().npcObjective).toMatchObject({ kind: "escort", npcId: "econ-watch-freighter" });

    store.getState().tick(25);

    expect(store.getState().npcObjective).toBeUndefined();
    expect(store.getState().player.credits).toBeGreaterThan(creditsBefore);
    expect(store.getState().runtime.message).toContain("Escort complete");
  });

  it("routes to a distant watched NPC before confirming escort with F", async () => {
    const store = await freshStore();
    store.setState((state) => ({
      screen: "economyWatch",
      currentStationId: "helion-prime",
      economyNpcWatch: {
        npcId: "econ-watch-freighter",
        returnStationId: "helion-prime",
        cameraMode: "cockpit",
        lookYaw: 0,
        lookPitch: 0,
        enteredAt: state.runtime.clock
      },
      player: { ...state.player, position: [0, 0, 0], velocity: [0, 0, 0] },
      runtime: {
        ...state.runtime,
        graceUntil: 999,
        enemies: [watchableEconomyFreighter({ position: [900, 0, 0], velocity: [0, 0, 0] })]
      }
    }));

    await store.getState().executeNpcInteraction("escort", "econ-watch-freighter");

    expect(store.getState()).toMatchObject({
      screen: "flight",
      currentStationId: undefined,
      npcObjective: undefined,
      autopilot: {
        phase: "to-npc",
        targetNpcId: "econ-watch-freighter",
        pendingNpcAction: "escort"
      }
    });
    expect(store.getState().runtime.message).not.toContain("Escort accepted");

    for (let i = 0; i < 40 && store.getState().autopilot; i += 1) {
      store.getState().tick(0.25);
    }

    expect(store.getState().autopilot).toBeUndefined();
    expect(store.getState().npcObjective).toBeUndefined();
    expect(store.getState().npcInteraction).toMatchObject({
      npcId: "econ-watch-freighter",
      openedFrom: "flight",
      lastAction: "escort"
    });
    expect(store.getState().npcInteraction?.message).toContain("Press F or confirm Escort");

    store.getState().interact();

    expect(store.getState().npcObjective).toMatchObject({ kind: "escort", npcId: "econ-watch-freighter" });
    expect(store.getState().runtime.message).toContain("Escort accepted");
  });

  it("robs an economy NPC through the backend and applies law consequences plus dropped cargo", async () => {
    const store = await freshStore();
    const response: EconomyNpcInteractionResponse = {
      ok: true,
      message: "Union Bulk Freighter surrendered 2 cargo unit(s) under threat.",
      cargoDropped: { "basic-food": 2 },
      event: {
        id: "npc-interaction-rob",
        type: "npc-interaction",
        clock: 12,
        message: "Union Bulk Freighter surrendered 2 cargo unit(s) under threat.",
        systemId: "helion-reach",
        npcId: "econ-watch-freighter",
        amount: 2,
        snapshotId: 77
      },
      snapshot: {
        version: 1,
        snapshotId: 77,
        clock: 12,
        status: "connected",
        marketState: createInitialMarketState(),
        resourceBelts: [],
        recentEvents: [],
        visibleNpcs: []
      }
    };
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })));
    store.setState((state) => ({
      runtime: {
        ...state.runtime,
        enemies: [watchableEconomyFreighter()]
      }
    }));

    await store.getState().executeNpcInteraction("rob", "econ-watch-freighter");

    const state = store.getState();
    expect(state.runtime.loot).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ commodityId: "basic-food", amount: 2 })
      ])
    );
    const heatRecord = getFactionHeatRecord(state.factionHeat, "free-belt-union");
    expect(heatRecord.fineCredits).toBeGreaterThan(0);
    expect(heatRecord.wantedUntil).toBeGreaterThan(state.gameClock);
    expect(state.npcInteraction?.message).toContain("Fine 1,800 cr");
  });

  it("routes to a distant NPC before rob can be confirmed", async () => {
    const store = await freshStore();
    const response: EconomyNpcInteractionResponse = {
      ok: true,
      message: "Union Bulk Freighter surrendered 2 cargo unit(s) under threat.",
      cargoDropped: { "basic-food": 2 },
      event: {
        id: "npc-interaction-rob",
        type: "npc-interaction",
        clock: 12,
        message: "Union Bulk Freighter surrendered 2 cargo unit(s) under threat.",
        systemId: "helion-reach",
        npcId: "econ-watch-freighter",
        amount: 2,
        snapshotId: 77
      },
      snapshot: snapshotWithoutVisibleNpcs(77)
    };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }));
    vi.stubGlobal("fetch", fetchMock);
    store.setState((state) => ({
      player: { ...state.player, position: [0, 0, 0], velocity: [0, 0, 0] },
      runtime: {
        ...state.runtime,
        enemies: [watchableEconomyFreighter({ position: [900, 0, 0], velocity: [0, 0, 0] })]
      }
    }));

    await store.getState().executeNpcInteraction("rob", "econ-watch-freighter");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(store.getState()).toMatchObject({
      npcInteraction: undefined,
      autopilot: {
        phase: "to-npc",
        targetNpcId: "econ-watch-freighter",
        pendingNpcAction: "rob"
      }
    });

    for (let i = 0; i < 40 && store.getState().autopilot; i += 1) {
      store.getState().tick(0.25);
    }
    store.getState().interact();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(store.getState().runtime.loot).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ commodityId: "basic-food", amount: 2 })
      ])
    );
    expect(getFactionHeatRecord(store.getState().factionHeat, "free-belt-union").fineCredits).toBeGreaterThan(0);
  });

  it("starts rescue objectives and rewards only after backend confirmation", async () => {
    const store = await freshStore();
    const rescueResponse: EconomyNpcInteractionResponse = {
      ok: true,
      message: "Union Bulk Freighter rescue confirmed. Patrol logs credited the captain.",
      event: {
        id: "npc-interaction-rescue",
        type: "npc-interaction",
        clock: 18,
        message: "Union Bulk Freighter rescue confirmed. Patrol logs credited the captain.",
        systemId: "helion-reach",
        npcId: "econ-watch-freighter",
        snapshotId: 78
      },
      snapshot: snapshotWithoutVisibleNpcs(78)
    };
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(rescueResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })));
    store.setState((state) => ({
      runtime: {
        ...state.runtime,
        enemies: [
          watchableEconomyFreighter({
            distressThreatId: "rescue-pirate",
            distressCalledAt: state.runtime.clock
          }),
          {
            id: "rescue-pirate",
            name: "Knife Wing Pirate",
            role: "pirate",
            factionId: "independent-pirates",
            position: [44, 0, 118],
            velocity: [0, 0, 0],
            hull: 70,
            shield: 42,
            maxHull: 70,
            maxShield: 42,
            lastDamageAt: -999,
            fireCooldown: 0.6,
            aiProfileId: "raider",
            aiState: "attack",
            aiTargetId: "econ-watch-freighter",
            aiTimer: 0
          }
        ]
      }
    }));

    await store.getState().executeNpcInteraction("rescue", "econ-watch-freighter");
    const creditsBefore = store.getState().player.credits;
    expect(store.getState().npcObjective).toMatchObject({ kind: "rescue", threatId: "rescue-pirate" });

    store.setState((state) => ({
      runtime: {
        ...state.runtime,
        enemies: state.runtime.enemies.filter((ship) => ship.id !== "rescue-pirate")
      }
    }));
    store.getState().tick(1);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await Promise.resolve();

    expect(store.getState().npcObjective).toBeUndefined();
    expect(store.getState().player.credits).toBeGreaterThan(creditsBefore);
    expect(store.getState().runtime.message).toContain("Rescue reward");
  });

  it("reports smuggler activity and keeps backend-required actions non-blocking while offline", async () => {
    const store = await freshStore();
    const reportResponse: EconomyNpcInteractionResponse = {
      ok: true,
      message: "Vossari Smuggler report filed with local traffic control.",
      event: {
        id: "npc-interaction-report",
        type: "npc-interaction",
        clock: 20,
        message: "Vossari Smuggler report filed with local traffic control.",
        systemId: "helion-reach",
        npcId: "econ-smuggler",
        snapshotId: 79
      },
      snapshot: snapshotWithoutVisibleNpcs(79)
    };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(reportResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }));
    vi.stubGlobal("fetch", fetchMock);
    store.setState((state) => ({
      runtime: {
        ...state.runtime,
        enemies: [
          watchableEconomyFreighter({
            id: "econ-smuggler",
            name: "Vossari Smuggler",
            role: "smuggler",
            factionId: "vossari-clans",
            aiProfileId: "smuggler",
            economyStatus: "HAULING · Luxury Goods",
            economyCargo: { "luxury-goods": 2 },
            economyCommodityId: "luxury-goods"
          })
        ]
      }
    }));

    await store.getState().executeNpcInteraction("report", "econ-smuggler");
    expect(store.getState().npcInteraction?.message).toContain("Reputation improved");

    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("offline");
    }));
    store.setState((state) => ({
      runtime: {
        ...state.runtime,
        enemies: [
          watchableEconomyFreighter({
            id: "econ-smuggler",
            name: "Vossari Smuggler",
            role: "smuggler",
            factionId: "vossari-clans",
            aiProfileId: "smuggler",
            economyStatus: "HAULING · Luxury Goods",
            economyCargo: { "luxury-goods": 2 },
            economyCommodityId: "luxury-goods"
          })
        ]
      }
    }));
    await store.getState().executeNpcInteraction("rob", "econ-smuggler");

    expect(store.getState().economyService).toMatchObject({ status: "offline", lastError: "offline" });
    expect(store.getState().npcInteraction?.message).toContain("ROB failed");
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
    expect(store.getState().activeMissions.find((active) => active.id === mission.id)).toMatchObject({ id: mission.id, accepted: true });

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

  it("stores backend personal calls and accepts them without mutating save schema", async () => {
    const store = await freshStore();
    const offer = {
      id: "npc-favor:econ-helion-reach-freighter-1:1",
      title: "Personal Call: HR-FR-02 needs Basic Food",
      type: "Cargo transport" as const,
      originSystemId: "helion-reach",
      destinationSystemId: "helion-reach",
      destinationStationId: "helion-prime",
      factionId: "free-belt-union" as const,
      sourceStationId: "mirr-lattice",
      description: "A rescued freighter is calling in a favor.",
      reward: 1200,
      deadlineSeconds: 1200,
      cargoRequired: { "basic-food": 3 },
      consumeCargoOnComplete: true
    };
    const snapshot: EconomySnapshot = {
      ...snapshotWithoutVisibleNpcs(81),
      personalOffers: [offer],
      npcRelationships: {
        "econ-helion-reach-freighter-1": {
          lineageId: "econ-helion-reach-freighter-1",
          trust: 2,
          hostility: 0,
          rescuedCount: 1,
          robbedCount: 0,
          reportedCount: 0,
          offerSeq: 1
        }
      }
    };
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(snapshot), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })));

    await store.getState().refreshEconomySnapshot();
    expect(store.getState().economyPersonalOffers[0]?.id).toBe(offer.id);

    store.getState().acceptMission(offer.id);

    expect(store.getState().activeMissions.find((active) => active.id === offer.id)).toMatchObject({ id: offer.id, accepted: true });
    expect(store.getState().runtime.message).toContain("Personal Call");
  });

  it("posts completed dispatch deliveries to the economy backend", async () => {
    const store = await freshStore();
    const marketState = createInitialMarketState();
    const entry = getMarketEntry(marketState, "helion-prime", "basic-food");
    setMarketEntry(marketState, "helion-prime", "basic-food", { stock: 1, demand: entry.baselineDemand + 0.45 });
    const backendMarket = createInitialMarketState();
    setMarketEntry(backendMarket, "helion-prime", "basic-food", { stock: 6, demand: entry.baselineDemand });
    const response: EconomyDispatchDeliveryResponse = {
      ok: true,
      message: "Dispatch delivery logged 4 cargo unit(s) at Helion Prime Exchange.",
      event: {
        id: "dispatch-delivery-test",
        type: "dispatch-delivery",
        clock: 22,
        message: "Dispatch delivery logged 4 cargo unit(s) at Helion Prime Exchange.",
        systemId: "helion-reach",
        stationId: "helion-prime",
        commodityId: "basic-food",
        amount: 4,
        snapshotId: 88
      },
      snapshot: {
        version: 1,
        snapshotId: 88,
        clock: 22,
        status: "connected",
        marketState: backendMarket,
        resourceBelts: [],
        recentEvents: [],
        visibleNpcs: []
      }
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toContain("/api/economy/dispatch-delivery");
      expect(JSON.parse(String(init?.body))).toMatchObject({ missionId: expect.stringMatching(/^market-gap:/), stationId: "helion-prime" });
      return new Response(JSON.stringify(response), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);
    store.setState((state) => ({
      marketState,
      economyService: { ...state.economyService, status: "connected", snapshotId: 44 }
    }));
    store.getState().dockAt("helion-prime");
    const mission = getAvailableEconomyDispatchMissions({ marketState, systemId: "helion-reach", activeMissions: [] })[0];
    store.getState().acceptMission(mission.id);
    store.setState((state) => ({
      player: { ...state.player, cargo: { ...state.player.cargo, "basic-food": mission.cargoRequired!["basic-food"] } }
    }));

    store.getState().completeMission(mission.id);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(store.getState().activeMissions.some((active) => active.id === mission.id)).toBe(false);
    expect(store.getState().economyService).toMatchObject({ status: "connected", snapshotId: 88 });
    expect(store.getState().runtime.message).toContain("Dispatch delivery logged");
  });

  it("keeps smuggling dispatch completion playable when backend delivery is offline", async () => {
    const store = await freshStore();
    const marketState = createInitialMarketState();
    const destinationEntry = getMarketEntry(marketState, "vantara-bastion", "illegal-contraband");
    setMarketEntry(marketState, "vantara-bastion", "illegal-contraband", { stock: 0, demand: destinationEntry.baselineDemand + 0.5 });
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("dispatch offline");
    }));
    store.setState((state) => ({
      currentSystemId: "ashen-drift",
      currentStationId: "black-arcade",
      reputation: { factions: { ...state.reputation.factions, "independent-pirates": 0 } },
      knownSystems: [...new Set([...state.knownSystems, "ashen-drift", "vantara"])],
      knownPlanetIds: [...new Set([...state.knownPlanetIds, "black-arc", "vantara-command"])],
      marketState,
      economyService: { ...state.economyService, status: "connected", snapshotId: 12 }
    }));
    const mission = getAvailableSmugglingMissions({ marketState, systemId: "ashen-drift", activeMissions: [], limit: 1 })[0];

    store.getState().acceptMission(mission.id);
    store.setState((state) => ({
      currentSystemId: mission.destinationSystemId,
      currentStationId: mission.destinationStationId,
      player: { ...state.player, cargo: { ...state.player.cargo, "illegal-contraband": mission.cargoRequired!["illegal-contraband"] } }
    }));
    const before = getMarketEntry(store.getState().marketState, mission.destinationStationId, "illegal-contraband");
    store.getState().completeMission(mission.id);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const after = getMarketEntry(store.getState().marketState, mission.destinationStationId, "illegal-contraband");

    expect(after.stock).toBeGreaterThan(before.stock);
    expect(store.getState().economyService).toMatchObject({ status: "fallback", lastError: "dispatch offline" });
    expect(store.getState().runtime.message).toContain("Economy backend delivery recorded locally");
  });
});
