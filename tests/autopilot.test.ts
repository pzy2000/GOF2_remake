import { beforeEach, describe, expect, it, vi } from "vitest";
import { stationById } from "../src/data/world";
import { GATE_ACTIVATION_SECONDS, getDefaultTargetStation, getJumpGatePosition, shouldCancelAutopilot, WORMHOLE_SECONDS } from "../src/systems/autopilot";
import { distance } from "../src/systems/math";
import { readSave } from "../src/systems/save";
import type { FlightInput } from "../src/types/game";

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

const neutralInput: FlightInput = {
  throttleUp: false,
  throttleDown: false,
  rollLeft: false,
  rollRight: false,
  afterburner: false,
  firePrimary: false,
  fireSecondary: false,
  interact: false,
  cycleTarget: false,
  toggleMap: false,
  toggleCamera: false,
  pause: false,
  mouseDX: 0,
  mouseDY: 0
};

async function freshStore(storage: Storage = new MemoryStorage()) {
  vi.resetModules();
  vi.stubGlobal("localStorage", storage);
  const module = await import("../src/state/gameStore");
  module.useGameStore.getState().newGame();
  return module.useGameStore;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("autopilot jump flow", () => {
  it("chooses the first station as the default destination", () => {
    expect(getDefaultTargetStation("ashen-drift")?.id).toBe("ashen-freeport");
  });

  it("distinguishes manual cancel input from pause", () => {
    expect(shouldCancelAutopilot({ ...neutralInput, throttleUp: true })).toBe(true);
    expect(shouldCancelAutopilot({ ...neutralInput, fireSecondary: true })).toBe(true);
    expect(shouldCancelAutopilot({ ...neutralInput, mouseDX: 1 })).toBe(true);
    expect(shouldCancelAutopilot({ ...neutralInput, pause: true })).toBe(false);
  });

  it("auto-saves to the auto slot when docking manually", async () => {
    const storage = new MemoryStorage();
    const store = await freshStore(storage);
    store.getState().dockAt("helion-prime");
    const save = readSave(storage, "auto");
    expect(save?.currentStationId).toBe("helion-prime");
    expect(save?.currentSystemId).toBe("helion-reach");
    expect(store.getState().activeSaveSlotId).toBe("auto");
  });

  it("auto-saves to the auto slot when autopilot docking completes", async () => {
    const storage = new MemoryStorage();
    const store = await freshStore(storage);
    const station = stationById["helion-prime"];
    store.setState((state) => ({
      screen: "flight",
      autopilot: {
        phase: "docking",
        originSystemId: "helion-reach",
        targetSystemId: "helion-reach",
        targetStationId: station.id,
        targetPosition: station.position,
        timer: 0.9,
        cancelable: false
      },
      player: { ...state.player, position: station.position, velocity: [0, 0, 0] }
    }));
    store.getState().tick(0.05);
    const save = readSave(storage, "auto");
    expect(store.getState().screen).toBe("station");
    expect(save?.currentStationId).toBe("helion-prime");
    expect(save?.currentSystemId).toBe("helion-reach");
  });

  it("starts from a station by launching into flight toward the origin gate", async () => {
    const store = await freshStore();
    store.getState().dockAt("helion-prime");
    store.getState().startJumpToSystem("kuro-belt");
    const state = store.getState();
    expect(state.screen).toBe("flight");
    expect(state.currentStationId).toBeUndefined();
    expect(state.currentSystemId).toBe("helion-reach");
    expect(state.autopilot).toMatchObject({
      phase: "to-origin-gate",
      originSystemId: "helion-reach",
      targetSystemId: "kuro-belt",
      targetStationId: "kuro-deep",
      cancelable: true
    });
  });

  it("can route to a discovered non-primary station in another system", async () => {
    const store = await freshStore();
    store.setState((state) => ({ knownPlanetIds: [...state.knownPlanetIds, "lode-minor"] }));
    store.getState().dockAt("helion-prime");
    store.getState().startJumpToStation("lode-spindle");
    const state = store.getState();
    expect(state.screen).toBe("flight");
    expect(state.autopilot).toMatchObject({
      phase: "to-origin-gate",
      originSystemId: "helion-reach",
      targetSystemId: "kuro-belt",
      targetStationId: "lode-spindle",
      cancelable: true
    });
  });

  it("starts a manual gate jump from the active Stargate", async () => {
    const store = await freshStore();
    const gate = getJumpGatePosition("helion-reach");
    store.setState((state) => ({ knownPlanetIds: [...state.knownPlanetIds, "lode-minor"] }));
    store.setState((state) => ({
      screen: "galaxyMap",
      previousScreen: "flight",
      galaxyMapMode: "gate",
      player: { ...state.player, position: gate, velocity: [0, 0, 0] }
    }));
    store.getState().activateStargateJumpToStation("lode-spindle");
    const state = store.getState();
    expect(state.screen).toBe("flight");
    expect(state.autopilot).toMatchObject({
      phase: "gate-activation",
      originSystemId: "helion-reach",
      targetSystemId: "kuro-belt",
      targetStationId: "lode-spindle",
      cancelable: false
    });
  });

  it("moves from gate approach to activation and then wormhole transit", async () => {
    const store = await freshStore();
    store.getState().startJumpToSystem("kuro-belt");
    const gate = getJumpGatePosition("helion-reach");
    store.setState((state) => ({ player: { ...state.player, position: gate, velocity: [0, 0, 0] } }));
    store.getState().tick(0.1);
    expect(store.getState().autopilot?.phase).toBe("gate-activation");

    store.setState((state) => ({
      autopilot: state.autopilot ? { ...state.autopilot, phase: "gate-activation", timer: GATE_ACTIVATION_SECONDS - 0.01, cancelable: false } : undefined,
      player: { ...state.player, position: gate, velocity: [0, 0, 0] }
    }));
    store.getState().tick(0.05);
    expect(store.getState().autopilot?.phase).toBe("wormhole");
  });

  it("switches systems after wormhole transit and exits near the target station without auto-docking", async () => {
    const store = await freshStore();
    store.setState((state) => ({ knownPlanetIds: [...state.knownPlanetIds, "lode-minor"] }));
    store.getState().startJumpToStation("lode-spindle");
    store.setState((state) => ({
      autopilot: state.autopilot ? { ...state.autopilot, phase: "wormhole", timer: WORMHOLE_SECONDS - 0.01, cancelable: false } : undefined
    }));
    store.getState().tick(0.05);
    const state = store.getState();
    expect(state.currentSystemId).toBe("kuro-belt");
    expect(state.currentStationId).toBeUndefined();
    expect(state.targetId).toBeUndefined();
    expect(state.autopilot).toBeUndefined();
    expect(distance(state.player.position, stationById["lode-spindle"].position)).toBeLessThan(360);
    expect(state.knownSystems).toContain("ashen-drift");
    expect(state.knownPlanetIds).toContain("lode-minor");
  });

  it("cancels only during cancelable navigation phases and ignores invalid routes", async () => {
    const store = await freshStore();
    store.getState().startJumpToSystem("not-a-system");
    expect(store.getState().autopilot).toBeUndefined();

    store.getState().startJumpToSystem("kuro-belt");
    store.getState().setInput({ throttleUp: true });
    store.getState().tick(0.1);
    expect(store.getState().autopilot).toBeUndefined();

    store.getState().startJumpToSystem("kuro-belt");
    store.getState().setInput({ pause: true });
    store.getState().tick(0.1);
    expect(store.getState().screen).toBe("pause");
    expect(store.getState().autopilot).toBeDefined();
  });
});
