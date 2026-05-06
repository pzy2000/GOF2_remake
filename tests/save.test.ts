import { describe, expect, it } from "vitest";
import { shipById } from "../src/data/world";
import { createInitialReputation } from "../src/systems/reputation";
import { readSave, SAVE_KEY, writeSave } from "../src/systems/save";
import type { PlayerState } from "../src/types/game";

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

function player(): PlayerState {
  const ship = shipById["sparrow-mk1"];
  return {
    shipId: ship.id,
    stats: ship.stats,
    hull: 81,
    shield: 33,
    energy: 72,
    credits: 4321,
    cargo: { "basic-food": 2 },
    equipment: ship.equipment,
    missiles: 3,
    ownedShips: [ship.id],
    position: [1, 2, 3],
    velocity: [0, 0, -1],
    rotation: [0.1, 0.2, 0.3],
    throttle: 0.5,
    lastDamageAt: 10
  };
}

describe("save system", () => {
  it("round trips save data through Storage", () => {
    const storage = new MemoryStorage();
    writeSave(
      {
        currentSystemId: "helion-reach",
        player: player(),
        activeMissions: [],
        completedMissionIds: ["courier-helion-kuro"],
        reputation: createInitialReputation(),
        knownSystems: ["helion-reach", "kuro-belt"]
      },
      storage
    );
    expect(storage.getItem(SAVE_KEY)).toContain("helion-reach");
    const loaded = readSave(storage);
    expect(loaded?.player.credits).toBe(4321);
    expect(loaded?.completedMissionIds).toEqual(["courier-helion-kuro"]);
  });
});
