import { beforeEach, describe, expect, it, vi } from "vitest";
import { explorationSignalById, stationById } from "../src/data/world";

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

async function completeSignal(store: Awaited<ReturnType<typeof freshStore>>, signalId: string) {
  const signal = explorationSignalById[signalId];
  store.setState((state) => ({
    screen: "flight",
    currentSystemId: signal.systemId,
    currentStationId: undefined,
    player: {
      ...state.player,
      position: signal.position,
      velocity: [0, 0, 0],
      throttle: 0
    },
    runtime: {
      ...state.runtime,
      enemies: [],
      projectiles: [],
      effects: [],
      message: "",
      explorationScan: undefined
    }
  }));
  store.getState().interact();
  const scan = store.getState().runtime.explorationScan;
  expect(scan?.signalId).toBe(signal.id);
  store.getState().adjustExplorationScanFrequency(Math.round((signal.scanBand[0] + signal.scanBand[1]) / 2) - (scan?.frequency ?? 0));
  store.getState().tick(signal.scanTime + 0.1);
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("exploration store flow", () => {
  it("completes a frequency scan once and applies rewards", async () => {
    const store = await freshStore();
    await completeSignal(store, "quiet-signal-sundog-lattice");

    const state = store.getState();
    expect(state.explorationState.discoveredSignalIds).toContain("quiet-signal-sundog-lattice");
    expect(state.explorationState.completedSignalIds).toContain("quiet-signal-sundog-lattice");
    expect(state.explorationState.eventLogIds).toContain("quiet-signal-sundog-lattice");
    expect(state.player.credits).toBe(2120);
    expect(state.player.cargo.optics).toBe(2);
    expect(state.runtime.explorationScan).toBeUndefined();
    expect(state.activeDialogue?.sceneId).toBe("dialogue-exploration-quiet-signal-sundog-lattice");
    expect(state.dialogueState.seenSceneIds).toContain("dialogue-exploration-quiet-signal-sundog-lattice");

    const creditsAfterFirstScan = state.player.credits;
    store.getState().closeDialogue();
    store.getState().interact();
    store.getState().tick(3);
    expect(store.getState().player.credits).toBe(creditsAfterFirstScan);
    expect(store.getState().activeDialogue).toBeUndefined();
  });

  it("reveals Parallax Hermitage and unlocks Hush Orbit from the Mirr anomaly", async () => {
    const store = await freshStore();
    store.setState((state) => ({
      knownPlanetIds: state.knownPlanetIds.filter((id) => id !== "hush-orbit")
    }));

    await completeSignal(store, "quiet-signal-folded-reflection");

    const state = store.getState();
    expect(state.explorationState.revealedStationIds).toContain("parallax-hermitage");
    expect(state.knownPlanetIds).toContain("hush-orbit");
    expect(stationById["parallax-hermitage"].hidden).toBe(true);

    store.getState().startJumpToStation("parallax-hermitage");
    expect(store.getState().autopilot?.targetStationId).toBe("parallax-hermitage");
  });

  it("marks full-hold scans complete without overfilling cargo", async () => {
    const store = await freshStore();
    store.setState((state) => ({
      player: {
        ...state.player,
        cargo: { "basic-food": state.player.stats.cargoCapacity }
      }
    }));

    await completeSignal(store, "quiet-signal-locked-keel-cache");

    const state = store.getState();
    expect(state.explorationState.completedSignalIds).toContain("quiet-signal-locked-keel-cache");
    expect(state.player.cargo["ship-components"]).toBeUndefined();
    expect(state.player.cargo["energy-cells"]).toBeUndefined();
  });
});
