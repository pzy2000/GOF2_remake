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
  it("rejects an unrecoverable stored player without mutating the live game", async () => {
    const store = await freshStore();
    const before = store.getState();
    localStorage.setItem("gof2-by-pzy-save-slot:manual-1", JSON.stringify({
      version: 3,
      savedAt: "2026-07-14T00:00:00.000Z",
      screen: "flight",
      currentSystemId: "helion-reach",
      gameClock: 50,
      player: null
    }));

    expect(store.getState().loadGame("manual-1")).toBe(false);
    expect(store.getState().screen).toBe(before.screen);
    expect(store.getState().currentSystemId).toBe(before.currentSystemId);
    expect(store.getState().player).toEqual(before.player);
  });

  it("keeps offline new game and continue separate from multiplayer sessions", async () => {
    const store = await freshStore();

    store.setState({
      multiplayerStatus: "connected",
      multiplayerSession: {
        token: "token",
        playerId: "pilot-1",
        username: "pilot",
        displayName: "Pilot",
        serverUrl: "/api/multiplayer"
      },
      remotePlayers: [{
        playerId: "pilot-2",
        username: "wing",
        displayName: "Wing",
        shipId: "sparrow-mk1",
        currentSystemId: "helion-reach",
        position: [0, 0, 0],
        velocity: [0, 0, 0],
        rotation: [0, 0, 0],
        hull: 100,
        shield: 100,
        updatedAt: 1
      }]
    });

    store.getState().saveGame("auto");
    store.getState().newGame();
    expect(store.getState().multiplayerSession).toBeUndefined();
    expect(store.getState().remotePlayers).toEqual([]);

    store.setState({
      multiplayerStatus: "connected",
      multiplayerSession: {
        token: "token",
        playerId: "pilot-1",
        username: "pilot",
        displayName: "Pilot",
        serverUrl: "/api/multiplayer"
      },
      remotePlayers: [{
        playerId: "pilot-2",
        username: "wing",
        displayName: "Wing",
        shipId: "sparrow-mk1",
        currentSystemId: "helion-reach",
        position: [0, 0, 0],
        velocity: [0, 0, 0],
        rotation: [0, 0, 0],
        hull: 100,
        shield: 100,
        updatedAt: 1
      }]
    });

    expect(store.getState().loadGame("auto")).toBe(true);
    expect(store.getState().multiplayerSession).toBeUndefined();
    expect(store.getState().remotePlayers).toEqual([]);
  });

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
