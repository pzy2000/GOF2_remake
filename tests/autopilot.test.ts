import { beforeEach, describe, expect, it, vi } from "vitest";
import { stationById } from "../src/data/world";
import { GATE_ACTIVATION_SECONDS, getDefaultTargetStation, getJumpGatePosition, shouldCancelAutopilot, WORMHOLE_SECONDS } from "../src/systems/autopilot";
import { distance } from "../src/systems/math";
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
