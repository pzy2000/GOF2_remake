import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FlightEntity, ProjectileEntity } from "../src/types/game";
import { createShipEntity } from "../src/state/domains/runtimeFactory";

const ULTIMATE_PROJECTILE_LIFE_LIMIT_SECONDS = 3;
const ULTIMATE_SUSTAINED_FIRE_PROJECTILE_BUDGET = 36;
const ULTIMATE_SUSTAINED_FIRE_EFFECT_BUDGET = 96;

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

function pirate(position: [number, number, number] = [0, 0, -5000], patch: Partial<FlightEntity> = {}): FlightEntity {
  return {
    ...createShipEntity("ultimate-pirate", "pirate", position, "helion-reach"),
    aiState: "attack",
    aiTargetId: "player",
    ...patch
  };
}

describe("sparrow ultimate ability", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("starts ready, activates for 30 seconds, then recharges in 20 seconds", async () => {
    const store = await freshStore();
    expect(store.getState().ultimateAbility.chargeSeconds).toBe(20);

    store.getState().setInput({ activateUltimate: true });
    store.getState().tick(0.1);
    expect(store.getState().ultimateAbility.activeUntil).toBeGreaterThan(store.getState().runtime.clock);
    expect(store.getState().ultimateAbility.chargeSeconds).toBe(0);

    store.getState().tick(30.1);
    expect(store.getState().ultimateAbility.activeUntil).toBeUndefined();
    expect(store.getState().ultimateAbility.chargeSeconds).toBeGreaterThan(0);

    store.getState().tick(20);
    expect(store.getState().ultimateAbility.chargeSeconds).toBe(20);
  });

  it("only activates on the starter ship", async () => {
    const store = await freshStore();
    store.setState((state) => ({ player: { ...state.player, shipId: "raptor-v" } }));

    store.getState().setInput({ activateUltimate: true });
    store.getState().tick(0.1);

    expect(store.getState().ultimateAbility.activeUntil).toBeUndefined();
  });

  it("prevents enemy projectile damage while active", async () => {
    const store = await freshStore();
    store.getState().setInput({ activateUltimate: true });
    store.getState().tick(0.1);
    const player = store.getState().player;
    const projectile: ProjectileEntity = {
      id: "enemy-shot",
      owner: "enemy",
      kind: "laser",
      position: player.position,
      direction: [0, 0, 1],
      speed: 0,
      damage: 40,
      life: 1,
      targetId: "player"
    };
    store.setState((state) => ({
      runtime: { ...state.runtime, projectiles: [projectile] }
    }));

    store.getState().tick(0.05);

    expect(store.getState().player.hull).toBe(player.hull);
    expect(store.getState().player.shield).toBe(player.shield);
    expect(store.getState().runtime.effects.some((effect) => effect.label === "IMMUNE")).toBe(true);
  });

  it("auto-fires both weapons at long range without spending missiles", async () => {
    const store = await freshStore();
    store.setState((state) => ({
      runtime: { ...state.runtime, enemies: [pirate([0, 0, -9000])], projectiles: [] },
      targetId: undefined,
      primaryCooldown: 0,
      secondaryCooldown: 0,
      player: { ...state.player, missiles: 2, energy: state.player.stats.energy }
    }));
    store.getState().setInput({ activateUltimate: true });
    store.getState().tick(0.1);

    store.setState((state) => ({
      runtime: { ...state.runtime, projectiles: [] },
      primaryCooldown: 0,
      secondaryCooldown: 0
    }));
    store.getState().tick(0.05);

    const playerShots = store.getState().runtime.projectiles.filter((projectile) => projectile.owner === "player");
    expect(playerShots.some((projectile) => projectile.kind === "laser" && projectile.targetId === "ultimate-pirate")).toBe(true);
    expect(playerShots.some((projectile) => projectile.kind === "missile" && projectile.targetId === "ultimate-pirate")).toBe(true);
    expect(store.getState().player.missiles).toBe(2);
    expect(playerShots.every((projectile) => projectile.life <= ULTIMATE_PROJECTILE_LIFE_LIMIT_SECONDS)).toBe(true);
  });

  it("keeps sustained ultimate fire below the normal visible object caps", async () => {
    const store = await freshStore();
    store.setState((state) => ({
      runtime: {
        ...state.runtime,
        enemies: [pirate([0, 0, -9000], { hull: 1_000_000, maxHull: 1_000_000, shield: 0, maxShield: 0, fireCooldown: 99 })],
        projectiles: [],
        effects: []
      },
      targetId: undefined,
      primaryCooldown: 0,
      secondaryCooldown: 0,
      player: { ...state.player, missiles: 2, energy: state.player.stats.energy }
    }));

    store.getState().setInput({ activateUltimate: true });
    store.getState().tick(0.1);

    for (let frame = 0; frame < 12 * 60; frame += 1) {
      store.getState().tick(1 / 60);
    }

    expect(store.getState().runtime.projectiles.length).toBeLessThanOrEqual(ULTIMATE_SUSTAINED_FIRE_PROJECTILE_BUDGET);
    expect(store.getState().runtime.effects.length).toBeLessThanOrEqual(ULTIMATE_SUSTAINED_FIRE_EFFECT_BUDGET);
  });

  it("still hits far locked targets with capped ultimate projectile lifetimes", async () => {
    const store = await freshStore();
    store.setState((state) => ({
      runtime: {
        ...state.runtime,
        enemies: [pirate([0, 0, -9000], { hull: 240, maxHull: 240, shield: 0, maxShield: 0, fireCooldown: 99 })],
        projectiles: [],
        effects: []
      },
      targetId: undefined,
      primaryCooldown: 0,
      secondaryCooldown: 0,
      player: { ...state.player, missiles: 2, energy: state.player.stats.energy }
    }));

    store.getState().setInput({ activateUltimate: true });
    store.getState().tick(0.1);

    for (let frame = 0; frame < 4 * 60; frame += 1) {
      store.getState().tick(1 / 60);
    }

    const target = store.getState().runtime.enemies.find((ship) => ship.id === "ultimate-pirate");
    expect(target?.hull).toBeLessThan(240);
  });
});
