import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ConvoyEntity, FlightEntity } from "../src/types/game";

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

function pirate(position: [number, number, number] = [110, 0, 120], patch: Partial<FlightEntity> = {}): FlightEntity {
  return {
    id: "test-pirate",
    name: "Knife Wing Pirate",
    role: "pirate",
    factionId: "independent-pirates",
    position,
    velocity: [0, 0, 0],
    hull: 70,
    shield: 42,
    maxHull: 70,
    maxShield: 42,
    lastDamageAt: -999,
    fireCooldown: -1,
    aiProfileId: "raider",
    loadoutId: "pirate-raider",
    aiState: "attack",
    aiTargetId: "player",
    aiTimer: 0,
    ...patch
  };
}

function convoy(patch: Partial<ConvoyEntity> = {}): ConvoyEntity {
  return {
    id: "test-convoy",
    missionId: "test-escort",
    name: "Test Convoy",
    factionId: "free-belt-union",
    position: [0, 0, 140],
    velocity: [0, 0, 0],
    hull: 120,
    maxHull: 120,
    shield: 45,
    maxShield: 45,
    lastDamageAt: -999,
    fireCooldown: -1,
    convoyRole: "mission-tender",
    status: "en-route",
    destinationStationId: "helion-prime",
    destinationPosition: [0, 0, -760],
    arrived: false,
    ...patch
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
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
    expect(state.runtime.loot[0]).toMatchObject({ kind: "commodity", commodityId: "illegal-contraband", amount: 2, rarity: "epic" });
  });

  it("spawns a high-risk system boss with a guaranteed equipment drop", async () => {
    const store = await freshStore();
    store.getState().jumpToSystem("ashen-drift");
    const boss = store.getState().runtime.enemies.find((ship) => ship.boss);
    expect(boss).toMatchObject({
      name: "Ashen Warlord Kass Vey",
      aiProfileId: "boss-warlord",
      loadoutId: "pirate-boss-warlord"
    });

    store.setState((state) => ({
      targetId: boss!.id,
      runtime: {
        ...state.runtime,
        enemies: state.runtime.enemies.map((ship) => (ship.id === boss!.id ? { ...ship, position: [0, 0, 0] } : { ...ship, position: [900, 0, 900] })),
        projectiles: [
          {
            id: "test-boss-shot",
            owner: "player",
            kind: "laser",
            position: [0, 0, 0],
            direction: [0, 0, 0],
            speed: 0,
            damage: 999,
            life: 1,
            targetId: boss!.id
          }
        ],
        loot: []
      }
    }));

    store.getState().tick(0.05);

    const state = store.getState();
    expect(state.runtime.message).toContain("Boss cargo scattered");
    expect(state.runtime.loot).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "commodity", commodityId: "illegal-contraband", amount: 4, rarity: "epic" }),
      expect.objectContaining({ kind: "equipment", amount: 1 })
    ]));
  });

  it("requests patrol support once per cooldown when patrols engage threats", async () => {
    const store = await freshStore();
    store.setState((state) => ({
      currentSystemId: "ashen-drift",
      player: { ...state.player, position: [600, 0, 600] },
      runtime: {
        ...state.runtime,
        enemies: [patrol([0, 0, 120]), pirate([120, 0, 120])],
        convoys: [],
        projectiles: [],
        effects: [],
        message: "",
        clock: 0
      }
    }));

    store.getState().tick(0.2);

    const afterSupport = store.getState();
    expect(afterSupport.runtime.enemies.filter((ship) => ship.supportWing)).toHaveLength(2);
    expect(afterSupport.runtime.enemies.find((ship) => ship.id === "test-patrol")?.supportCooldownUntil).toBeGreaterThan(afterSupport.runtime.clock);

    store.getState().tick(0.2);
    expect(store.getState().runtime.enemies.filter((ship) => ship.supportWing)).toHaveLength(2);
  });

  it("puts convoys into distress and lets them fire at nearby attackers", async () => {
    const store = await freshStore();
    store.setState((state) => ({
      currentSystemId: "ashen-drift",
      player: { ...state.player, position: [900, 0, 900] },
      runtime: {
        ...state.runtime,
        enemies: [pirate([500, 0, 140], { aiTargetId: "test-convoy" })],
        convoys: [convoy()],
        projectiles: [],
        effects: [],
        message: "",
        clock: 0
      }
    }));

    store.getState().tick(0.01);

    const state = store.getState();
    expect(state.runtime.convoys[0]).toMatchObject({ status: "distress", threatId: "test-pirate" });
    expect(state.runtime.projectiles.some((projectile) => projectile.owner === "npc" && projectile.targetId === "test-pirate")).toBe(true);
  });

  it("lets player attacks destroy civilian NPCs and drop cargo or equipment", async () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    const store = await freshStore();
    const freighter = store.getState().runtime.enemies.find((ship) => ship.role === "freighter");
    expect(freighter).toBeDefined();

    store.setState((state) => ({
      targetId: freighter!.id,
      runtime: {
        ...state.runtime,
        enemies: state.runtime.enemies.map((ship) => (ship.id === freighter!.id ? { ...ship, position: [0, 0, 0] } : { ...ship, position: [900, 0, 900] })),
        projectiles: [
          {
            id: "test-freighter-shot",
            owner: "player",
            kind: "laser",
            position: [0, 0, 0],
            direction: [0, 0, 0],
            speed: 0,
            damage: 999,
            life: 1,
            targetId: freighter!.id
          }
        ],
        loot: []
      }
    }));

    store.getState().tick(0.05);

    const state = store.getState();
    expect(state.runtime.loot.some((loot) => loot.kind === "commodity")).toBe(true);
    expect(state.runtime.loot.some((loot) => loot.kind === "equipment")).toBe(true);
    expect(state.reputation.factions["free-belt-union"]).toBeLessThan(4);
    expect(state.runtime.enemies.find((ship) => ship.role === "patrol")?.aiTargetId).toBe("player");
    randomSpy.mockRestore();
  });
});
