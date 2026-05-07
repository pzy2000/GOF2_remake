import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAsteroidsForSystem } from "../src/systems/asteroids";
import { createInitialMarketState } from "../src/systems/economy";
import type { EconomySnapshot } from "../src/types/economy";

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
});
