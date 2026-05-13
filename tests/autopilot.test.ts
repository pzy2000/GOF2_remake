import { beforeEach, describe, expect, it, vi } from "vitest";
import { stationById } from "../src/data/world";
import { GATE_ACTIVATION_SECONDS, getDefaultTargetStation, getJumpGatePosition, shouldCancelAutopilot, WORMHOLE_SECONDS } from "../src/systems/autopilot";
import { distance } from "../src/systems/math";
import { readSave } from "../src/systems/save";
import type { FlightEntity, FlightInput } from "../src/types/game";

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
  activateUltimate: false,
  interact: false,
  cycleTarget: false,
  toggleMap: false,
  toggleCamera: false,
  pause: false,
  mouseDX: 0,
  mouseDY: 0
};

function economyFreighterTarget(position: [number, number, number]): FlightEntity {
  return {
    id: "econ-route-freighter",
    name: "Route Freighter",
    role: "freighter",
    factionId: "free-belt-union",
    position,
    velocity: [0, 0, 0],
    hull: 170,
    shield: 70,
    maxHull: 170,
    maxShield: 70,
    lastDamageAt: -999,
    fireCooldown: 0.6,
    aiProfileId: "freighter",
    aiState: "patrol",
    aiTimer: 0,
    economySerial: "HR-FR-ROUTE",
    economyHomeStationId: "helion-prime",
    economyRiskPreference: "balanced",
    economyContractId: "HR-FR-ROUTE",
    economyLedger: { revenue: 0, expenses: 0, losses: 0, completedContracts: 0, failedContracts: 0, minedUnits: 0 },
    economyTaskKind: "hauling",
    economyTaskProgress: 0.2,
    economyStatus: "HAULING · Basic Food",
    economyCargo: { "basic-food": 6 },
    economyCommodityId: "basic-food",
    economyTargetId: "helion-prime"
  };
}

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
    expect(shouldCancelAutopilot({ ...neutralInput, mouseDX: 1 })).toBe(false);
    expect(shouldCancelAutopilot({ ...neutralInput, afterburner: true })).toBe(false);
    expect(shouldCancelAutopilot({ ...neutralInput, pause: true })).toBe(false);
  });

  it("uses afterburner as an autopilot boost without canceling", async () => {
    const normal = await freshStore();
    normal.getState().startJumpToSystem("kuro-belt");
    normal.getState().tick(0.2);
    const normalSpeed = Math.hypot(...normal.getState().player.velocity);

    const boosted = await freshStore();
    boosted.getState().startJumpToSystem("kuro-belt");
    boosted.getState().setInput({ afterburner: true });
    boosted.getState().tick(0.2);
    const boostedState = boosted.getState();

    expect(boostedState.autopilot).toBeDefined();
    expect(Math.hypot(...boostedState.player.velocity)).toBeGreaterThan(normalSpeed);
    expect(boostedState.player.energy).toBeLessThan(boostedState.player.stats.energy);
  });

  it("uses the same boost and cancel rules while routing to an NPC", async () => {
    const normal = await freshStore();
    const npc = economyFreighterTarget([3800, 0, 0]);
    normal.setState((state) => ({
      screen: "flight",
      player: { ...state.player, position: [0, 0, 0], velocity: [0, 0, 0] },
      runtime: { ...state.runtime, enemies: [npc] },
      autopilot: {
        phase: "to-npc",
        originSystemId: "helion-reach",
        targetSystemId: "helion-reach",
        targetPosition: npc.position,
        targetNpcId: npc.id,
        targetName: npc.name,
        pendingNpcAction: "escort",
        timer: 0,
        cancelable: true
      }
    }));
    normal.getState().tick(0.2);
    const normalSpeed = Math.hypot(...normal.getState().player.velocity);

    const boosted = await freshStore();
    boosted.setState((state) => ({
      screen: "flight",
      player: { ...state.player, position: [0, 0, 0], velocity: [0, 0, 0] },
      runtime: { ...state.runtime, enemies: [npc] },
      autopilot: {
        phase: "to-npc",
        originSystemId: "helion-reach",
        targetSystemId: "helion-reach",
        targetPosition: npc.position,
        targetNpcId: npc.id,
        targetName: npc.name,
        pendingNpcAction: "escort",
        timer: 0,
        cancelable: true
      }
    }));
    boosted.getState().setInput({ afterburner: true, mouseDX: 30 });
    boosted.getState().tick(0.2);

    expect(boosted.getState().autopilot?.phase).toBe("to-npc");
    expect(Math.hypot(...boosted.getState().player.velocity)).toBeGreaterThan(normalSpeed);
    expect(boosted.getState().player.energy).toBeLessThan(boosted.getState().player.stats.energy);

    boosted.getState().setInput({ throttleUp: true });
    boosted.getState().tick(0.1);

    expect(boosted.getState().autopilot).toBeUndefined();
    expect(boosted.getState().runtime.message).toContain("Autopilot canceled");
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

  it("renders docking corridor feedback before autopilot completes docking", async () => {
    const store = await freshStore();
    const station = stationById["helion-prime"];
    store.setState((state) => ({
      screen: "flight",
      autopilot: {
        phase: "docking",
        originSystemId: "helion-reach",
        targetSystemId: "helion-reach",
        targetStationId: station.id,
        targetPosition: station.position,
        timer: 0.1,
        cancelable: false
      },
      player: { ...state.player, position: [station.position[0], station.position[1], station.position[2] + 420], velocity: [0, 0, 0] }
    }));
    store.getState().tick(0.05);
    expect(store.getState().screen).toBe("flight");
    expect(store.getState().runtime.effects.some((effect) => effect.kind === "dock-corridor" && effect.label === "DOCKING")).toBe(true);
  });

  it("shows launch feedback when leaving a station", async () => {
    const store = await freshStore();
    store.getState().dockAt("helion-prime");
    store.getState().undock();
    const state = store.getState();
    expect(state.screen).toBe("flight");
    expect(state.currentStationId).toBeUndefined();
    expect(state.runtime.message).toContain("Launch vector clear");
    expect(state.runtime.effects.some((effect) => effect.kind === "launch-trail" && effect.label === "LAUNCH")).toBe(true);
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
      routeSystemIds: ["helion-reach", "kuro-belt"],
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
      routeSystemIds: ["helion-reach", "kuro-belt"],
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
      routeSystemIds: ["helion-reach", "kuro-belt"],
      targetStationId: "lode-spindle",
      cancelable: false
    });
  });

  it("starts a manual multi-hop route from the active Stargate", async () => {
    const store = await freshStore();
    const gate = getJumpGatePosition("helion-reach");
    store.setState((state) => ({
      knownSystems: ["helion-reach", "mirr-vale", "celest-gate"],
      knownPlanetIds: [...new Set([...state.knownPlanetIds, "mirr-glass", "celest-crown"])],
      screen: "galaxyMap",
      previousScreen: "flight",
      galaxyMapMode: "gate",
      player: { ...state.player, position: gate, velocity: [0, 0, 0] }
    }));
    store.getState().activateStargateJumpToStation("celest-vault");

    expect(store.getState().autopilot).toMatchObject({
      phase: "gate-activation",
      originSystemId: "helion-reach",
      targetSystemId: "celest-gate",
      routeSystemIds: ["helion-reach", "mirr-vale", "celest-gate"],
      targetStationId: "celest-vault",
      cancelable: false
    });

    store.setState((state) => ({
      autopilot: state.autopilot ? { ...state.autopilot, phase: "wormhole", timer: WORMHOLE_SECONDS - 0.01, cancelable: false } : undefined
    }));
    store.getState().tick(0.05);

    expect(store.getState().currentSystemId).toBe("mirr-vale");
    expect(store.getState().autopilot).toMatchObject({
      phase: "to-origin-gate",
      originSystemId: "mirr-vale",
      targetSystemId: "celest-gate",
      routeSystemIds: ["helion-reach", "mirr-vale", "celest-gate"]
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
    expect(store.getState().runtime.effects.some((effect) => effect.kind === "gate-spool")).toBe(true);
  });

  it("switches systems after wormhole transit and continues to the target station without auto-docking", async () => {
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
    expect(state.autopilot).toMatchObject({
      phase: "to-destination-station",
      originSystemId: "kuro-belt",
      targetSystemId: "kuro-belt",
      routeSystemIds: ["helion-reach", "kuro-belt"],
      targetStationId: "lode-spindle"
    });
    expect(state.runtime.message).toBe("Arrived in Kuro Belt. Autopilot continuing to Lode Spindle.");
    expect(distance(state.player.position, getJumpGatePosition("kuro-belt"))).toBeLessThan(180);
    expect(state.knownSystems).toContain("ashen-drift");
    expect(state.knownPlanetIds).toContain("lode-minor");

    store.setState((latest) => ({
      player: { ...latest.player, position: stationById["lode-spindle"].position, velocity: [0, 0, 0] }
    }));
    store.getState().tick(0.05);
    expect(store.getState().currentStationId).toBeUndefined();
    expect(store.getState().autopilot).toBeUndefined();
    expect(store.getState().runtime.message).toBe("Arrived near Lode Spindle. Press E to dock.");
  });

  it("continues through each known Stargate leg before approaching a distant station", async () => {
    const store = await freshStore();
    store.setState((state) => ({
      knownSystems: ["helion-reach", "mirr-vale", "celest-gate"],
      knownPlanetIds: [...new Set([...state.knownPlanetIds, "mirr-glass", "celest-crown"])]
    }));
    store.getState().startJumpToStation("celest-vault");
    expect(store.getState().autopilot).toMatchObject({
      phase: "to-origin-gate",
      originSystemId: "helion-reach",
      targetSystemId: "celest-gate",
      routeSystemIds: ["helion-reach", "mirr-vale", "celest-gate"],
      targetStationId: "celest-vault"
    });

    store.setState((state) => ({
      autopilot: state.autopilot ? { ...state.autopilot, phase: "wormhole", timer: WORMHOLE_SECONDS - 0.01, cancelable: false } : undefined
    }));
    store.getState().tick(0.05);
    expect(store.getState().currentSystemId).toBe("mirr-vale");
    expect(store.getState().autopilot).toMatchObject({
      phase: "to-origin-gate",
      originSystemId: "mirr-vale",
      targetSystemId: "celest-gate",
      routeSystemIds: ["helion-reach", "mirr-vale", "celest-gate"]
    });
    expect(distance(store.getState().player.position, getJumpGatePosition("mirr-vale"))).toBeLessThan(180);

    store.setState((state) => ({
      autopilot: state.autopilot ? { ...state.autopilot, phase: "wormhole", timer: WORMHOLE_SECONDS - 0.01, cancelable: false } : undefined
    }));
    store.getState().tick(0.05);
    expect(store.getState().currentSystemId).toBe("celest-gate");
    expect(store.getState().autopilot).toMatchObject({
      phase: "to-destination-station",
      originSystemId: "celest-gate",
      targetSystemId: "celest-gate",
      routeSystemIds: ["helion-reach", "mirr-vale", "celest-gate"],
      targetStationId: "celest-vault"
    });
    expect(distance(store.getState().player.position, getJumpGatePosition("celest-gate"))).toBeLessThan(180);

    store.setState((state) => ({
      player: { ...state.player, position: stationById["celest-vault"].position, velocity: [0, 0, 0] }
    }));
    store.getState().tick(0.05);
    expect(store.getState().currentStationId).toBeUndefined();
    expect(store.getState().autopilot).toBeUndefined();
    expect(store.getState().runtime.message).toBe("Arrived near Celest Vault. Press E to dock.");
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
    store.getState().setInput({ afterburner: true, mouseDX: 8, mouseDY: 8 });
    store.getState().tick(0.1);
    expect(store.getState().autopilot).toBeDefined();

    store.getState().startJumpToSystem("kuro-belt");
    store.getState().setInput({ pause: true });
    store.getState().tick(0.1);
    expect(store.getState().screen).toBe("pause");
    expect(store.getState().autopilot).toBeDefined();
  });
});
