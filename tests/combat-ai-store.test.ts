import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FlightEntity } from "../src/types/game";

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

async function freshStore(storage = new MemoryStorage()) {
  vi.resetModules();
  vi.stubGlobal("localStorage", storage);
  const module = await import("../src/state/gameStore");
  module.useGameStore.getState().newGame();
  return module.useGameStore;
}

function patrol(position: [number, number, number] = [0, 0, 120]): FlightEntity {
  return {
    id: "test-patrol",
    name: "Directorate Patrol",
    role: "patrol",
    factionId: "solar-directorate",
    position,
    velocity: [0, 0, 0],
    hull: 115,
    shield: 85,
    maxHull: 115,
    maxShield: 85,
    lastDamageAt: -999,
    fireCooldown: -1,
    aiProfileId: "law-patrol",
    aiState: "patrol",
    aiTimer: 0
  };
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("combat AI store wiring", () => {
  it("fines and confiscates contraband in fine-and-confiscate systems", async () => {
    const store = await freshStore();
    store.setState((state) => ({
      currentSystemId: "helion-reach",
      player: { ...state.player, position: [0, 0, 0], credits: 1000, cargo: { "illegal-contraband": 2 } },
      runtime: { ...state.runtime, enemies: [patrol()], message: "", clock: 0 }
    }));

    store.getState().tick(3.2);

    const state = store.getState();
    expect(state.player.cargo["illegal-contraband"]).toBeUndefined();
    expect(state.player.credits).toBe(100);
    expect(state.reputation.factions["solar-directorate"]).toBe(6);
    expect(state.runtime.message).toContain("confiscated");
  });

  it("turns patrols hostile in hostile-pursuit systems without confiscating cargo", async () => {
    const store = await freshStore();
    store.setState((state) => ({
      currentSystemId: "vantara",
      player: { ...state.player, position: [0, 0, 0], cargo: { "illegal-contraband": 1 } },
      runtime: { ...state.runtime, enemies: [patrol()], projectiles: [], message: "", clock: 0 }
    }));

    store.getState().tick(3.2);
    expect(store.getState().player.cargo["illegal-contraband"]).toBe(1);
    expect(store.getState().runtime.enemies[0]).toMatchObject({ aiState: "attack", aiTargetId: "player" });

    store.getState().tick(0.2);
    expect(store.getState().runtime.projectiles.some((projectile) => projectile.owner === "enemy")).toBe(true);
  });

  it("does not punish contraband in legal systems", async () => {
    const store = await freshStore();
    store.setState((state) => ({
      currentSystemId: "ashen-drift",
      player: { ...state.player, position: [0, 0, 0], credits: 1000, cargo: { "illegal-contraband": 2 } },
      runtime: { ...state.runtime, enemies: [patrol()], message: "", clock: 0 }
    }));

    store.getState().tick(3.2);

    expect(store.getState().player.cargo["illegal-contraband"]).toBe(2);
    expect(store.getState().player.credits).toBe(1000);
    expect(store.getState().runtime.enemies[0].aiState).not.toBe("attack");
  });

  it("counts elite pirates as bounty kills and drops higher-value loot", async () => {
    const store = await freshStore();
    store.getState().jumpToSystem("ashen-drift");
    const elite = store.getState().runtime.enemies.find((ship) => ship.elite);
    expect(elite).toBeDefined();

    store.setState((state) => ({
      targetId: elite!.id,
      runtime: {
        ...state.runtime,
        enemies: state.runtime.enemies.map((ship) => (ship.id === elite!.id ? { ...ship, position: [0, 0, 0] } : { ...ship, position: [900, 0, 900] })),
        projectiles: [
          {
            id: "test-player-shot",
            owner: "player",
            kind: "laser",
            position: [0, 0, 0],
            direction: [0, 0, 0],
            speed: 0,
            damage: 999,
            life: 1,
            targetId: elite!.id
          }
        ],
        loot: []
      }
    }));

    store.getState().tick(0.05);

    const state = store.getState();
    expect(state.runtime.destroyedPirates).toBe(1);
    expect(state.runtime.loot[0]).toMatchObject({ commodityId: "illegal-contraband", amount: 2, rarity: "epic" });
  });
});
