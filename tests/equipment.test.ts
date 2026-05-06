import { beforeEach, describe, expect, it, vi } from "vitest";
import { equipmentById, shipById } from "../src/data/world";
import {
  BASE_AFTERBURNER_ENERGY_DRAIN,
  BASE_AFTERBURNER_MULTIPLIER,
  getActivePrimaryWeapon,
  getActiveSecondaryWeapon,
  getEffectiveShipStats,
  getEquipmentEffects,
  getWeaponCooldown,
  hasMiningBeam,
  normalizePlayerEquipmentStats
} from "../src/systems/equipment";
import { createInitialMarketState } from "../src/systems/economy";
import { createInitialReputation } from "../src/systems/reputation";
import { writeSave } from "../src/systems/save";
import type { CargoHold, EquipmentId, PlayerState } from "../src/types/game";

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

function playerForShip(shipId = "sparrow-mk1"): PlayerState {
  const ship = shipById[shipId];
  return {
    shipId: ship.id,
    stats: ship.stats,
    hull: ship.stats.hull,
    shield: ship.stats.shield,
    energy: ship.stats.energy,
    credits: 5000,
    cargo: {},
    equipment: ship.equipment,
    missiles: 6,
    ownedShips: [ship.id],
    position: [0, 0, 0],
    velocity: [0, 0, 0],
    rotation: [0, 0, 0],
    throttle: 0,
    lastDamageAt: -999
  };
}

function equip(player: PlayerState, equipment: EquipmentId[]): PlayerState {
  return normalizePlayerEquipmentStats({ ...player, equipment });
}

function primeAsteroid(
  store: Awaited<ReturnType<typeof freshStore>>,
  equipment: EquipmentId[],
  cargo: CargoHold = {}
) {
  store.setState((state) => {
    const player = equip(
      {
        ...state.player,
        cargo,
        position: [0, 0, 0],
        velocity: [0, 0, 0],
        throttle: 0,
        energy: state.player.stats.energy
      },
      equipment
    );
    return {
      player,
      runtime: {
        ...state.runtime,
        clock: 0,
        loot: [],
        projectiles: [],
        effects: [],
        message: "",
        asteroids: state.runtime.asteroids.map((asteroid, index) =>
          index === 0
            ? { ...asteroid, resource: "iron", position: [0, 0, 90], amount: 4, miningProgress: 0.99, radius: 20 }
            : { ...asteroid, amount: 0 }
        )
      },
      input: { ...state.input, firePrimary: true }
    };
  });
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("equipment definitions and helpers", () => {
  it("defines a catalog entry for every equipment id", () => {
    const ids: EquipmentId[] = [
      "pulse-laser",
      "plasma-cannon",
      "homing-missile",
      "mining-beam",
      "shield-booster",
      "cargo-expansion",
      "afterburner",
      "scanner",
      "armor-plating",
      "energy-reactor",
      "repair-drone",
      "targeting-computer"
    ];
    expect(ids.every((id) => equipmentById[id]?.displayStats.length > 0)).toBe(true);
  });

  it("applies passive stat and runtime modifiers", () => {
    const base = shipById["sparrow-mk1"].stats;
    const equipment: EquipmentId[] = ["shield-booster", "cargo-expansion", "armor-plating", "energy-reactor"];
    expect(getEffectiveShipStats(base, equipment)).toMatchObject({
      hull: 130,
      shield: 105,
      energy: 125,
      cargoCapacity: 30
    });

    const effects = getEquipmentEffects(["afterburner", "scanner", "energy-reactor", "repair-drone", "targeting-computer"]);
    expect(effects.afterburnerMultiplier).toBe(2.05);
    expect(effects.afterburnerEnergyDrain).toBe(50);
    expect(effects.energyRegenPerSecond).toBe(20);
    expect(effects.hullRegenPerSecond).toBe(2);
    expect(effects.lootInteractionRange).toBe(150);
    expect(effects.salvageInteractionRange).toBe(170);
    expect(effects.miningHudRange).toBe(470);
    expect(effects.weaponCooldownMultiplier).toBeCloseTo(0.88);
    expect(getEquipmentEffects([]).afterburnerMultiplier).toBe(BASE_AFTERBURNER_MULTIPLIER);
    expect(getEquipmentEffects([]).afterburnerEnergyDrain).toBe(BASE_AFTERBURNER_ENERGY_DRAIN);
  });

  it("selects active equipment-driven weapons", () => {
    expect(getActivePrimaryWeapon(["pulse-laser", "plasma-cannon"])?.id).toBe("plasma-cannon");
    expect(getActivePrimaryWeapon(["pulse-laser"])?.id).toBe("pulse-laser");
    expect(getActiveSecondaryWeapon(["pulse-laser"])).toBeUndefined();
    expect(getActiveSecondaryWeapon(["homing-missile"])?.id).toBe("homing-missile");
    expect(hasMiningBeam(["mining-beam"])).toBe(true);
    expect(getWeaponCooldown(equipmentById["pulse-laser"].weapon!, ["pulse-laser", "targeting-computer"])).toBeCloseTo(0.1408);
  });
});

describe("equipment gameplay wiring", () => {
  it("crafting passive equipment updates effective ship stats", async () => {
    const store = await freshStore();
    store.setState((state) => ({ player: { ...state.player, credits: 5000 } }));

    store.getState().craftEquipment("shield-booster");
    store.getState().craftEquipment("cargo-expansion");

    const state = store.getState();
    expect(state.player.stats.shield).toBe(105);
    expect(state.player.stats.cargoCapacity).toBe(30);
    expect(state.player.credits).toBe(3400);
  });

  it("ship purchases apply stock equipment effects immediately", async () => {
    const store = await freshStore();
    store.setState((state) => ({ player: { ...state.player, credits: 50000 } }));

    store.getState().buyShip("horizon-ark");

    const state = store.getState();
    expect(state.player.stats.shield).toBe(245);
    expect(state.player.stats.energy).toBe(235);
    expect(state.player.shield).toBe(245);
    expect(state.player.energy).toBe(235);
  });

  it("loadGame normalizes old saved stats without a save version bump", async () => {
    const storage = new MemoryStorage();
    const ship = shipById["horizon-ark"];
    writeSave(
      {
        currentSystemId: "helion-reach",
        gameClock: 0,
        player: { ...playerForShip("horizon-ark"), stats: ship.stats, shield: 220, energy: 210 },
        activeMissions: [],
        completedMissionIds: [],
        failedMissionIds: [],
        marketState: createInitialMarketState(),
        reputation: createInitialReputation(),
        knownSystems: ["helion-reach"]
      },
      storage,
      "manual-1"
    );
    const store = await freshStore(storage);

    expect(store.getState().loadGame("manual-1")).toBe(true);

    const player = store.getState().player;
    expect(player.stats.shield).toBe(245);
    expect(player.stats.energy).toBe(235);
    expect(player.shield).toBe(220);
    expect(player.energy).toBe(210);
  });

  it("uses installed primary and secondary weapons only", async () => {
    const store = await freshStore();
    store.setState((state) => ({
      player: equip({ ...state.player, energy: state.player.stats.energy }, ["pulse-laser", "plasma-cannon"]),
      runtime: { ...state.runtime, projectiles: [] },
      input: { ...state.input, firePrimary: true }
    }));
    store.getState().tick(0.05);
    expect(store.getState().runtime.projectiles.find((projectile) => projectile.owner === "player")?.damage).toBe(34);

    store.setState((state) => ({
      player: equip({ ...state.player, missiles: 6 }, ["pulse-laser"]),
      runtime: { ...state.runtime, projectiles: [] },
      input: { ...state.input, firePrimary: false, fireSecondary: true },
      secondaryCooldown: 0
    }));
    store.getState().tick(0.05);
    expect(store.getState().player.missiles).toBe(6);
    expect(store.getState().runtime.projectiles.some((projectile) => projectile.kind === "missile" && projectile.owner === "player")).toBe(false);
  });

  it("requires Mining Beam for asteroid extraction", async () => {
    const store = await freshStore();
    primeAsteroid(store, ["pulse-laser"]);

    store.getState().tick(0.1);
    expect(store.getState().player.cargo.iron).toBeUndefined();
    expect(store.getState().runtime.asteroids[0].amount).toBe(4);

    primeAsteroid(store, ["mining-beam"]);
    store.getState().tick(0.1);
    expect(store.getState().player.cargo.iron).toBe(2);
    expect(store.getState().runtime.asteroids[0].amount).toBe(2);
  });

  it("reduces cooldowns and repairs hull through installed systems", async () => {
    const store = await freshStore();
    store.setState((state) => ({
      player: equip({ ...state.player, hull: 70, lastDamageAt: -20, energy: state.player.stats.energy }, ["pulse-laser", "targeting-computer", "repair-drone"]),
      runtime: { ...state.runtime, projectiles: [] },
      input: { ...state.input, firePrimary: true },
      primaryCooldown: 0
    }));

    store.getState().tick(1);

    const state = store.getState();
    expect(state.primaryCooldown).toBeCloseTo(0.1408);
    expect(state.player.hull).toBe(72);
  });
});
