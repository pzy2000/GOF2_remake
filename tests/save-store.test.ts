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
  const module = await import("../src/state/gameStore");
  module.useGameStore.getState().newGame();
  return module.useGameStore;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("save store flow", () => {
  it("reloads saves made inside a station back into the station screen", async () => {
    const store = await freshStore();

    store.getState().dockAt("helion-prime");
    expect(store.getState().screen).toBe("station");

    store.setState({ screen: "menu", currentStationId: undefined });
    expect(store.getState().loadGame("auto")).toBe(true);

    expect(store.getState().screen).toBe("station");
    expect(store.getState().currentStationId).toBe("helion-prime");
  });
});
