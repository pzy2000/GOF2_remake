import { beforeEach, describe, expect, it, vi } from "vitest";

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
  const audio = await import("../src/systems/audio");
  const play = vi.spyOn(audio.audioSystem, "play");
  const module = await import("../src/state/gameStore");
  module.useGameStore.getState().newGame();
  return { store: module.useGameStore, play };
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("store audio triggers", () => {
  it("plays laser audio when the player fires a primary weapon", async () => {
    const { store, play } = await freshStore();
    store.setState((state) => ({
      runtime: { ...state.runtime, asteroids: [] },
      input: { ...state.input, firePrimary: true }
    }));
    store.getState().tick(0.1);
    expect(play).toHaveBeenCalledWith("laser");
  });

  it("plays target-lock audio when a missile lock finishes acquiring", async () => {
    const { store, play } = await freshStore();
    store.setState((state) => ({
      runtime: {
        ...state.runtime,
        enemies: [
          {
            id: "lock-target",
            name: "Lock Target",
            role: "pirate",
            factionId: "independent-pirates",
            position: [0, 0, -280],
            velocity: [0, 0, 0],
            hull: 80,
            shield: 20,
            maxHull: 80,
            maxShield: 20,
            lastDamageAt: -999,
            fireCooldown: 0,
            aiProfileId: "raider",
            aiState: "attack",
            aiTimer: 0
          }
        ]
      }
    }));

    store.getState().tick(0.6);

    expect(play).toHaveBeenCalledWith("target-lock");
    expect(store.getState().runtime.effects.some((effect) => effect.label === "LOCKED")).toBe(true);
  });

  it("plays shield break and low hull warnings on heavy enemy damage", async () => {
    const { store, play } = await freshStore();
    store.setState((state) => ({
      player: { ...state.player, shield: 5, hull: 40 },
      runtime: {
        ...state.runtime,
        projectiles: [
          {
            id: "test-enemy-shot",
            owner: "enemy",
            kind: "laser",
            position: state.player.position,
            direction: [0, 0, 1],
            speed: 0,
            damage: 20,
            life: 1
          }
        ]
      }
    }));
    store.getState().tick(0.1);
    expect(play).toHaveBeenCalledWith("shield-break");
    expect(play).toHaveBeenCalledWith("low-hull");
  });
});
