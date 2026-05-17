import { describe, expect, it, vi } from "vitest";
import { createInitialPlayer } from "../src/state/domains/runtimeFactory";
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

describe("multiplayer store sync", () => {
  it("keeps local realtime flight fields when delayed profile updates arrive", async () => {
    vi.stubGlobal("localStorage", new MemoryStorage());
    const { mergeMultiplayerProfilePlayer } = await import("../src/state/gameStore");
    const local: PlayerState = {
      ...createInitialPlayer(),
      credits: 1200,
      position: [900, 12, -440],
      velocity: [12, 0, -7],
      rotation: [0.1, 1.4, 0.2],
      throttle: 0.82,
      hull: 41,
      shield: 22,
      energy: 31,
      missiles: 2,
      lastDamageAt: 40
    };
    const incoming: PlayerState = {
      ...createInitialPlayer(),
      credits: 4200,
      equipmentInventory: { "plasma-cannon": 1 },
      position: [-100, 0, 50],
      velocity: [0, 0, 0],
      rotation: [0, 0, 0],
      throttle: 0,
      hull: 100,
      shield: 100,
      energy: 100,
      missiles: 6,
      lastDamageAt: 0
    };

    const merged = mergeMultiplayerProfilePlayer(local, incoming);

    expect(merged.credits).toBe(4200);
    expect(merged.equipmentInventory?.["plasma-cannon"]).toBe(1);
    expect(merged.position).toEqual(local.position);
    expect(merged.velocity).toEqual(local.velocity);
    expect(merged.rotation).toEqual(local.rotation);
    expect(merged.throttle).toBe(local.throttle);
    expect(merged.hull).toBe(local.hull);
    expect(merged.shield).toBe(local.shield);
    expect(merged.energy).toBe(local.energy);
    expect(merged.missiles).toBe(local.missiles);
    expect(merged.lastDamageAt).toBe(local.lastDamageAt);
  });
});
