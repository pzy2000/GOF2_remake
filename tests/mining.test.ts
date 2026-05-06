import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CargoHold } from "../src/types/game";

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

function primeMiningTarget(
  store: Awaited<ReturnType<typeof freshStore>>,
  {
    amount = 4,
    miningProgress = 0,
    cargo = {}
  }: {
    amount?: number;
    miningProgress?: number;
    cargo?: CargoHold;
  } = {}
) {
  store.setState((state) => ({
    player: {
      ...state.player,
      cargo,
      position: [0, 0, 0],
      velocity: [0, 0, 0],
      throttle: 0,
      energy: state.player.stats.energy
    },
    runtime: {
      ...state.runtime,
      clock: 0,
      loot: [],
      effects: [],
      message: "",
      asteroids: state.runtime.asteroids.map((asteroid, index) =>
        index === 0
          ? {
              ...asteroid,
              resource: "iron",
              position: [0, 0, 90],
              amount,
              miningProgress,
              radius: 20
            }
          : { ...asteroid, amount: 0 }
      )
    },
    input: { ...state.input, firePrimary: true }
  }));
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("mining cargo collection", () => {
  it("puts mined ore directly into cargo without spawning ore loot", async () => {
    const store = await freshStore();
    primeMiningTarget(store);

    for (let tick = 0; tick < 8; tick += 1) {
      store.getState().tick(0.1);
    }

    const state = store.getState();
    expect(state.player.cargo.iron).toBe(2);
    expect(state.runtime.loot).toHaveLength(0);
    expect(state.runtime.asteroids[0].amount).toBe(2);
    expect(state.runtime.message).toContain("Mined 2 Iron");
  });

  it("does not consume an asteroid when the cargo hold is full", async () => {
    const store = await freshStore();
    primeMiningTarget(store, { cargo: { "basic-food": 18 }, miningProgress: 0.99 });

    store.getState().tick(0.1);

    const state = store.getState();
    expect(state.player.cargo.iron).toBeUndefined();
    expect(state.player.cargo["basic-food"]).toBe(18);
    expect(state.player.energy).toBe(state.player.stats.energy);
    expect(state.runtime.asteroids[0].amount).toBe(4);
    expect(state.runtime.asteroids[0].miningProgress).toBe(0.99);
    expect(state.runtime.loot).toHaveLength(0);
    expect(state.runtime.message).toBe("Cargo hold full.");
  });

  it("only mines the remaining cargo capacity when space is limited", async () => {
    const store = await freshStore();
    primeMiningTarget(store, { cargo: { "basic-food": 17 }, miningProgress: 0.99 });

    store.getState().tick(0.1);

    const state = store.getState();
    expect(state.player.cargo.iron).toBe(1);
    expect(state.runtime.asteroids[0].amount).toBe(3);
    expect(state.runtime.loot).toHaveLength(0);
    expect(state.runtime.message).toContain("Cargo 18/18");
  });
});
