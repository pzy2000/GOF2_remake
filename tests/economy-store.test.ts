import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAsteroidsForSystem } from "../src/systems/asteroids";
import { createInitialMarketState, getMarketEntry } from "../src/systems/economy";
import { getAvailableMarketGapMissions } from "../src/systems/marketMissions";
import type { EconomySnapshot } from "../src/types/economy";
import type { CommodityId, MarketState } from "../src/types/game";

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
          role: "miner",
          factionId: "free-belt-union",
          systemId: "helion-reach",
          position: [0, 0, -90],
          velocity: [0, 0, -10],
          hull: 125,
          shield: 58,
          maxHull: 125,
          maxShield: 58,
          cargoCapacity: 20,
          cargo: { iron: 1 },
          credits: 5000,
          lastTradeAt: 0,
          statusLabel: "MINING · Iron",
          task: {
            kind: "mining",
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
