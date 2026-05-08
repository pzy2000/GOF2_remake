import { beforeEach, describe, expect, it, vi } from "vitest";
import { explorationSignalById, stationById } from "../src/data/world";
import { getIncompleteExplorationSignals, getVisibleStationsForSystem } from "../src/systems/exploration";

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
  it("keeps later anomaly stages locked until their prerequisite signal is resolved", async () => {
    const store = await freshStore();
    const followUp = explorationSignalById["quiet-signal-meridian-afterimage"];

    expect(getIncompleteExplorationSignals("helion-reach", store.getState().explorationState).map((signal) => signal.id)).not.toContain(followUp.id);

    store.setState((state) => ({
      screen: "flight",
      currentSystemId: followUp.systemId,
      currentStationId: undefined,
      player: {
        ...state.player,
        position: followUp.position,
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
    expect(store.getState().runtime.explorationScan?.signalId).not.toBe(followUp.id);

    await completeSignal(store, "quiet-signal-sundog-lattice");
    expect(getIncompleteExplorationSignals("helion-reach", store.getState().explorationState).map((signal) => signal.id)).toContain(followUp.id);

    await completeSignal(store, followUp.id);
    const state = store.getState();
    expect(state.explorationState.completedSignalIds).toContain("quiet-signal-sundog-lattice");
    expect(state.explorationState.completedSignalIds).toContain(followUp.id);
  });

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

  it("unlocks the chain blueprint reward when the final Quiet Signal stage resolves", async () => {
    const store = await freshStore();

    await completeSignal(store, "quiet-signal-sundog-lattice");
    store.getState().closeDialogue();
    expect(store.getState().player.unlockedBlueprintIds).not.toContain("survey-array");

    await completeSignal(store, "quiet-signal-meridian-afterimage");

    const state = store.getState();
    expect(state.explorationState.completedSignalIds).toEqual(expect.arrayContaining([
      "quiet-signal-sundog-lattice",
      "quiet-signal-meridian-afterimage"
    ]));
    expect(state.player.unlockedBlueprintIds).toContain("survey-array");
    expect(state.runtime.message).toContain("Survey Array blueprint unlocked");
  });

  it("requires upgraded scanner equipment before a deep signal can be scanned", async () => {
    const store = await freshStore();
    await completeSignal(store, "quiet-signal-sundog-lattice");
    store.getState().closeDialogue();
    await completeSignal(store, "quiet-signal-meridian-afterimage");
    store.getState().closeDialogue();

    const deepSignal = explorationSignalById["quiet-signal-sundog-crown-shard"];
    store.setState((state) => ({
      screen: "flight",
      currentSystemId: deepSignal.systemId,
      currentStationId: undefined,
      player: {
        ...state.player,
        equipment: ["scanner"],
        position: deepSignal.position,
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
    expect(store.getState().runtime.explorationScan).toBeUndefined();
    expect(store.getState().runtime.message).toContain("requires Survey Array or Echo Nullifier");

    store.setState((state) => ({
      player: {
        ...state.player,
        equipment: ["echo-nullifier"]
      },
      runtime: { ...state.runtime, message: "" }
    }));
    store.getState().interact();
    expect(store.getState().runtime.explorationScan?.signalId).toBe(deepSignal.id);
  });

  it("reveals new hidden stations from deep signal completions", async () => {
    const store = await freshStore();
    await completeSignal(store, "quiet-signal-foundry-ark-wreck");
    store.getState().closeDialogue();
    await completeSignal(store, "quiet-signal-anvil-listener-spoor");
    store.getState().closeDialogue();
    store.setState((state) => ({
      player: { ...state.player, equipment: ["survey-array"] }
    }));
    await completeSignal(store, "quiet-signal-obsidian-foundry-wake");

    const state = store.getState();
    expect(state.explorationState.revealedStationIds).toContain("obsidian-foundry");
    expect(stationById["obsidian-foundry"].hidden).toBe(true);
    expect(getVisibleStationsForSystem("kuro-belt", state.explorationState).map((station) => station.id)).toContain("obsidian-foundry");
  });

  it("unlocks the relic cartographer blueprint after the final deep signal resolves", async () => {
    const store = await freshStore();
    const completedSignalIds = [
      "quiet-signal-sundog-lattice",
      "quiet-signal-meridian-afterimage",
      "quiet-signal-sundog-crown-shard",
      "quiet-signal-foundry-ark-wreck",
      "quiet-signal-anvil-listener-spoor",
      "quiet-signal-obsidian-foundry-wake",
      "quiet-signal-ghost-iff-challenge",
      "quiet-signal-redoubt-silence-test",
      "quiet-signal-redoubt-ghost-permit",
      "quiet-signal-folded-reflection",
      "quiet-signal-parallax-deep-index",
      "quiet-signal-parallax-outer-index",
      "quiet-signal-dead-letter-convoy",
      "quiet-signal-false-mercy-ledger",
      "quiet-signal-moth-vault-ledger",
      "quiet-signal-crownside-whisper",
      "quiet-signal-pearl-witness-chorus",
      "quiet-signal-crownshade-occlusion",
      "quiet-signal-locked-keel-cache",
      "quiet-signal-keel-ghost-route"
    ];
    store.setState((state) => ({
      explorationState: {
        discoveredSignalIds: completedSignalIds,
        completedSignalIds,
        revealedStationIds: ["parallax-hermitage", "obsidian-foundry", "moth-vault", "crownshade-observatory"],
        eventLogIds: completedSignalIds
      },
      player: {
        ...state.player,
        equipment: ["survey-array"],
        unlockedBlueprintIds: [
          "pulse-laser",
          "homing-missile",
          "mining-beam",
          "scanner",
          "cargo-expansion",
          "shield-booster",
          "armor-plating",
          "survey-array",
          "repair-drone",
          "shield-matrix",
          "targeting-computer",
          "torpedo-rack",
          "quantum-reactor",
          "plasma-cannon"
        ]
      }
    }));

    await completeSignal(store, "quiet-signal-keel-archive-prism");

    expect(store.getState().player.unlockedBlueprintIds).toContain("relic-cartographer");
    expect(store.getState().runtime.message).toContain("Relic Cartographer blueprint unlocked");
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
