import { describe, expect, it } from "vitest";
import { glassWakeProtocol, missionTemplates, shipById } from "../src/data/world";
import { createInitialDialogueState } from "../src/systems/dialogue";
import { createInitialMarketState } from "../src/systems/economy";
import { createInitialExplorationState } from "../src/systems/exploration";
import { createInitialFactionHeat } from "../src/systems/factionConsequences";
import { createInitialReputation } from "../src/systems/reputation";
import {
  deleteSave,
  getLatestSaveSlotId,
  LEGACY_SAVE_VERSION,
  parseSave,
  readSave,
  readSaveIndex,
  readSaveSlots,
  SAVE_INDEX_KEY,
  SAVE_KEY,
  SAVE_SLOT_PREFIX,
  SAVE_VERSION,
  writeSave
} from "../src/systems/save";
import { getStoryProgress } from "../src/systems/story";
import type { PlayerState, SaveGameData } from "../src/types/game";

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
  function payload(overrides: Partial<Omit<SaveGameData, "version" | "savedAt">> = {}): Omit<SaveGameData, "version" | "savedAt"> {
    return {
      screen: "flight",
      currentSystemId: "helion-reach",
      gameClock: 123,
      player: player(),
      activeMissions: [],
      completedMissionIds: ["courier-helion-kuro"],
      failedMissionIds: ["bounty-ashen"],
      marketState: createInitialMarketState(),
      reputation: createInitialReputation(),
      factionHeat: createInitialFactionHeat(),
      knownSystems: ["helion-reach", "kuro-belt"],
      knownPlanetIds: ["helion-prime-world", "kuro-anvil"],
      ...overrides,
      explorationState: overrides.explorationState ?? createInitialExplorationState(),
      dialogueState: overrides.dialogueState ?? createInitialDialogueState()
    };
  }

  it("round trips v2 save data through named slots", () => {
    const storage = new MemoryStorage();
    writeSave(
      payload({
        player: {
          ...player(),
          equipmentInventory: { "plasma-cannon": 1 },
          unlockedBlueprintIds: ["plasma-cannon"],
          ownedShipRecords: [
            {
              shipId: "mule-lx",
              stationId: "ptd-home",
              installedEquipment: shipById["mule-lx"].equipment,
              hull: 150,
              shield: 90,
              energy: 90
            }
          ]
        },
        screen: "station",
        currentStationId: "helion-prime",
        explorationState: {
          discoveredSignalIds: ["quiet-signal-sundog-lattice"],
          completedSignalIds: ["quiet-signal-sundog-lattice"],
          revealedStationIds: ["parallax-hermitage"],
          eventLogIds: ["quiet-signal-sundog-lattice"]
        },
        dialogueState: { seenSceneIds: ["dialogue-story-clean-carrier-accept"] },
        onboardingState: {
          enabled: true,
          collapsed: true,
          completedStepIds: ["first-flight"],
          claimedRewardStepIds: ["first-flight"],
          startedAtGameTime: 0
        }
      }),
      storage,
      "manual-1"
    );
    expect(storage.getItem(`${SAVE_SLOT_PREFIX}manual-1`)).toContain("helion-reach");
    expect(storage.getItem(SAVE_INDEX_KEY)).toContain("manual-1");
    const loaded = readSave(storage, "manual-1");
    expect(loaded?.screen).toBe("station");
    expect(readSaveSlots(storage).find((slot) => slot.id === "manual-1")?.screen).toBe("station");
    expect(loaded?.player.credits).toBe(4321);
    expect(loaded?.completedMissionIds).toEqual(["courier-helion-kuro"]);
    expect(loaded?.failedMissionIds).toEqual(["bounty-ashen"]);
    expect(loaded?.gameClock).toBe(123);
    expect(loaded?.marketState["helion-prime"]?.["basic-food"]).toBeDefined();
    expect(loaded?.knownPlanetIds).toEqual(["helion-prime-world", "kuro-anvil"]);
    expect(loaded?.player.equipmentInventory?.["plasma-cannon"]).toBe(1);
    expect(loaded?.player.unlockedBlueprintIds).toEqual(expect.arrayContaining(["pulse-laser", "homing-missile", "mining-beam", "scanner", "cargo-expansion", "shield-booster", "armor-plating", "plasma-cannon"]));
    expect(loaded?.player.ownedShipRecords?.[0]).toMatchObject({ shipId: "mule-lx", stationId: "ptd-home" });
    expect(loaded?.explorationState.completedSignalIds).toEqual(["quiet-signal-sundog-lattice"]);
    expect(loaded?.explorationState.revealedStationIds).toEqual(["parallax-hermitage"]);
    expect(loaded?.dialogueState.seenSceneIds).toEqual(["dialogue-story-clean-carrier-accept"]);
    expect(loaded?.onboardingState).toMatchObject({
      enabled: true,
      collapsed: true,
      completedStepIds: ["first-flight"],
      claimedRewardStepIds: ["first-flight"]
    });
    expect(loaded?.factionHeat).toEqual(createInitialFactionHeat());
    expect(loaded?.version).toBe(SAVE_VERSION);
  });

  it("continues from the latest valid slot and deletes slots from the index", () => {
    const storage = new MemoryStorage();
    writeSave(payload({ currentSystemId: "kuro-belt" }), storage, "manual-1");
    writeSave(payload({ currentSystemId: "celest-gate", player: { ...player(), credits: 9999 } }), storage, "manual-2");
    expect(getLatestSaveSlotId(storage)).toBe("manual-2");
    expect(readSave(storage)?.currentSystemId).toBe("celest-gate");

    deleteSave("manual-2", storage);
    expect(readSaveSlots(storage).find((slot) => slot.id === "manual-2")?.exists).toBe(false);
    expect(readSave(storage)?.currentSystemId).toBe("kuro-belt");
  });

  it("backfills completed exploration chain blueprint rewards without changing save version", () => {
    const storage = new MemoryStorage();
    storage.setItem(`${SAVE_SLOT_PREFIX}manual-1`, JSON.stringify({
      ...payload({
        player: {
          ...player(),
          unlockedBlueprintIds: ["scanner"]
        },
        explorationState: {
          discoveredSignalIds: ["quiet-signal-sundog-lattice", "quiet-signal-meridian-afterimage"],
          completedSignalIds: ["quiet-signal-sundog-lattice", "quiet-signal-meridian-afterimage"],
          revealedStationIds: [],
          eventLogIds: ["quiet-signal-sundog-lattice", "quiet-signal-meridian-afterimage"]
        }
      }),
      version: SAVE_VERSION,
      savedAt: "2026-05-08T00:00:00.000Z"
    } satisfies SaveGameData));
    storage.setItem(SAVE_INDEX_KEY, JSON.stringify({
      version: SAVE_VERSION,
      lastPlayedSlotId: "manual-1",
      slots: {
        "manual-1": { id: "manual-1", label: "Manual Slot 1", exists: true, savedAt: "2026-05-08T00:00:00.000Z" },
        "manual-2": { id: "manual-2", label: "Manual Slot 2", exists: false },
        "manual-3": { id: "manual-3", label: "Manual Slot 3", exists: false },
        auto: { id: "auto", label: "Auto / Quick Slot", exists: false }
      }
    }));

    const loaded = readSave(storage, "manual-1");
    expect(loaded?.version).toBe(SAVE_VERSION);
    expect(loaded?.player.unlockedBlueprintIds).toContain("survey-array");
  });

  it("migrates a v1 single save into the auto slot", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      SAVE_KEY,
      JSON.stringify({
        ...payload(),
        version: LEGACY_SAVE_VERSION,
        savedAt: "2026-01-01T00:00:00.000Z"
      })
    );
    const index = readSaveIndex(storage);
    expect(index.slots.auto?.exists).toBe(true);
    expect(index.lastPlayedSlotId).toBe("auto");
    expect(readSave(storage, "auto")?.version).toBe(SAVE_VERSION);
    expect(readSave(storage, "auto")?.factionHeat).toEqual(createInitialFactionHeat());
  });

  it("backfills docked screen state for older saves with a station id", () => {
    const storage = new MemoryStorage();
    const legacyPayload = {
      ...payload({
        currentStationId: "helion-prime"
      }),
      screen: undefined,
      version: SAVE_VERSION,
      savedAt: "2026-05-08T00:00:00.000Z"
    };
    storage.setItem(`${SAVE_SLOT_PREFIX}manual-1`, JSON.stringify(legacyPayload));
    storage.setItem(SAVE_INDEX_KEY, JSON.stringify({
      version: SAVE_VERSION,
      lastPlayedSlotId: "manual-1",
      slots: {
        "manual-1": { id: "manual-1", label: "Manual Slot 1", exists: true, savedAt: legacyPayload.savedAt },
        "manual-2": { id: "manual-2", label: "Manual Slot 2", exists: false },
        "manual-3": { id: "manual-3", label: "Manual Slot 3", exists: false },
        auto: { id: "auto", label: "Auto / Quick Slot", exists: false }
      }
    }));

    const loaded = readSave(storage, "manual-1");
    expect(loaded?.screen).toBe("station");
    expect(readSaveSlots(storage).find((slot) => slot.id === "manual-1")?.screen).toBe("station");
  });

  it("backfills faction heat when reading v2 saves", () => {
    const storage = new MemoryStorage();
    const v2Payload = {
      ...payload(),
      factionHeat: undefined,
      version: 2,
      savedAt: "2026-05-08T00:00:00.000Z"
    };
    storage.setItem(`${SAVE_SLOT_PREFIX}manual-1`, JSON.stringify(v2Payload));
    storage.setItem(SAVE_INDEX_KEY, JSON.stringify({
      version: 2,
      lastPlayedSlotId: "manual-1",
      slots: {
        "manual-1": { id: "manual-1", label: "Manual Slot 1", exists: true, savedAt: v2Payload.savedAt },
        "manual-2": { id: "manual-2", label: "Manual Slot 2", exists: false },
        "manual-3": { id: "manual-3", label: "Manual Slot 3", exists: false },
        auto: { id: "auto", label: "Auto / Quick Slot", exists: false }
      }
    }));

    const loaded = readSave(storage, "manual-1");
    expect(loaded?.version).toBe(SAVE_VERSION);
    expect(loaded?.factionHeat).toEqual(createInitialFactionHeat());
    expect(readSaveIndex(storage).version).toBe(SAVE_VERSION);
  });

  it("backfills permanent PTD Company reputation when reading older saves", () => {
    const storage = new MemoryStorage();
    const reputation = createInitialReputation();
    const { "ptd-company": _ptd, ...legacyFactions } = reputation.factions;
    const legacyPayload = {
      ...payload({ reputation: { factions: legacyFactions } as SaveGameData["reputation"] }),
      version: SAVE_VERSION,
      savedAt: "2026-05-08T00:00:00.000Z"
    };
    storage.setItem(`${SAVE_SLOT_PREFIX}manual-1`, JSON.stringify(legacyPayload));
    storage.setItem(SAVE_INDEX_KEY, JSON.stringify({
      version: SAVE_VERSION,
      lastPlayedSlotId: "manual-1",
      slots: {
        "manual-1": { id: "manual-1", label: "Manual Slot 1", exists: true, savedAt: legacyPayload.savedAt },
        "manual-2": { id: "manual-2", label: "Manual Slot 2", exists: false },
        "manual-3": { id: "manual-3", label: "Manual Slot 3", exists: false },
        auto: { id: "auto", label: "Auto / Quick Slot", exists: false }
      }
    }));

    expect(readSave(storage, "manual-1")?.reputation.factions["ptd-company"]).toBe(100);
  });

  it("migrates saves without planet discovery to primary planets and the current station planet", () => {
    const storage = new MemoryStorage();
    const legacyPayload = {
      ...payload({
        currentSystemId: "ashen-drift",
        currentStationId: "black-arcade",
        knownSystems: ["helion-reach", "ashen-drift"]
      }),
      knownPlanetIds: undefined,
      version: SAVE_VERSION,
      savedAt: "2026-01-01T00:00:00.000Z"
    };
    storage.setItem(`${SAVE_SLOT_PREFIX}auto`, JSON.stringify(legacyPayload));
    storage.setItem(
      SAVE_INDEX_KEY,
      JSON.stringify({
        version: SAVE_VERSION,
        slots: { auto: { id: "auto", label: "Auto / Quick Slot", exists: true, savedAt: legacyPayload.savedAt } },
        lastPlayedSlotId: "auto"
      })
    );
    const loaded = readSave(storage, "auto");
    expect(loaded?.knownPlanetIds).toEqual(["helion-prime-world", "ashen-harbor", "black-arc"]);
    expect(loaded?.explorationState).toEqual(createInitialExplorationState());
    expect(loaded?.dialogueState).toEqual(createInitialDialogueState());
  });

  it("ignores bad legacy saves without corrupting empty slots", () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, "{not json");
    const slots = readSaveSlots(storage);
    expect(slots.every((slot) => !slot.exists)).toBe(true);
  });

  it("rejects unrecoverable roots, systems, and players", () => {
    const valid = {
      ...payload(),
      version: SAVE_VERSION,
      savedAt: "2026-07-14T00:00:00.000Z"
    };

    expect(parseSave("null")).toBeNull();
    expect(parseSave(JSON.stringify({ ...valid, version: 999 }))).toBeNull();
    expect(parseSave(JSON.stringify({ ...valid, currentSystemId: "missing-system" }))).toBeNull();
    expect(parseSave(JSON.stringify({ ...valid, player: null }))).toBeNull();
    expect(parseSave(JSON.stringify({ ...valid, player: { ...valid.player, shipId: "missing-ship" } }))).toBeNull();
  });

  it("allowlists corrupted nested save data before domain normalization", () => {
    const cleanCarrier = missionTemplates.find((mission) => mission.id === "story-clean-carrier")!;
    const raw: Record<string, unknown> = JSON.parse(JSON.stringify({
      ...payload({
        screen: "station",
        currentStationId: "helion-prime",
        activeMissions: [{ ...cleanCarrier, accepted: true, acceptedAt: 10 }]
      }),
      version: SAVE_VERSION,
      savedAt: "2026-07-14T00:00:00.000Z"
    }));
    raw.savedAt = { invalid: "timestamp" };
    raw.currentStationId = "helion-prime-void";
    raw.unexpectedTopLevel = { player: { credits: Number.MAX_VALUE } };
    Object.defineProperty(raw, "__proto__", { value: { polluted: true }, enumerable: true });
    Object.defineProperty(raw, "constructor", { value: { prototype: { admin: true } }, enumerable: true });

    const rawPlayer = raw.player as Record<string, unknown>;
    rawPlayer.stats = { energy: Number.MIN_SAFE_INTEGER, primarySlots: { corrupt: true } };
    rawPlayer.hull = Number.MAX_VALUE;
    rawPlayer.shield = -500;
    rawPlayer.energy = "NaN";
    rawPlayer.credits = -10;
    rawPlayer.cargo = {
      "basic-food": Number.MAX_VALUE,
      "drinking-water": { amount: 2 },
      "unknown-cargo": 99,
      constructor: { prototype: { polluted: true } }
    };
    rawPlayer.equipment = ["pulse-laser", { invalid: true }, "mining-beam", "constructor"];
    rawPlayer.equipmentInventory = { afterburner: 2, unknown: 99 };
    rawPlayer.unlockedBlueprintIds = ["scanner", { invalid: true }, "constructor"];
    rawPlayer.position = [Number.MAX_VALUE, -Number.MAX_VALUE, Number.MAX_VALUE];
    rawPlayer.velocity = ["invalid", 0, -40];
    rawPlayer.rotation = [0, 0, 0, 1];
    rawPlayer.throttle = 100;

    const rawMission = (raw.activeMissions as Record<string, unknown>[])[0];
    rawMission.retryOnFailure = "invalid";
    rawMission.reward = Number.MAX_VALUE;
    rawMission.storyEncounter = {
      visualCue: { systemId: "missing", position: [0, "NaN", 0] },
      targets: [{ id: "corrupt" }]
    };
    raw.reputation = { factions: { "solar-directorate": { invalid: true }, "ptd-company": -100 } };
    raw.factionHeat = { factions: { "solar-directorate": { heat: "INF", fineCredits: -5 } } };
    raw.knownSystems = ["helion-reach", "missing-system", { invalid: true }];
    raw.knownPlanetIds = ["helion-prime-world", "missing-planet", { invalid: true }];
    raw.explorationState = { completedSignalIds: "invalid", discoveredSignalIds: ["missing-signal"] };
    raw.dialogueState = { seenSceneIds: ["missing-scene", { invalid: true }] };
    raw.onboardingState = { enabled: "yes", completedStepIds: ["first-flight", "missing-step"] };
    raw.marketState = {
      "helion-prime": {
        "basic-food": { stock: "many", maxStock: Number.MAX_VALUE, demand: -2 },
        constructor: { prototype: { polluted: true } }
      },
      "missing-station": { "basic-food": { stock: 99 } }
    };

    const loaded = parseSave(JSON.stringify(raw));
    expect(loaded).not.toBeNull();
    expect(loaded?.screen).toBe("flight");
    expect(loaded?.currentStationId).toBeUndefined();
    expect(loaded?.savedAt).toBe("1970-01-01T00:00:00.000Z");
    expect(loaded?.player.position).toEqual([0, 0, 120]);
    expect(loaded?.player.velocity).toEqual([0, 0, 0]);
    expect(loaded?.player.rotation).toEqual([0, 0, 0]);
    expect(loaded?.player.throttle).toBe(1);
    expect(loaded?.player.hull).toBe(loaded?.player.stats.hull);
    expect(loaded?.player.shield).toBe(0);
    expect(loaded?.player.energy).toBe(loaded?.player.stats.energy);
    expect(loaded?.player.credits).toBe(0);
    expect(loaded?.player.cargo).toEqual({ "basic-food": loaded?.player.stats.cargoCapacity });
    expect(loaded?.player.equipment).toEqual(["pulse-laser", "mining-beam"]);
    expect(loaded?.player.equipmentInventory).toEqual({ afterburner: 2 });
    expect(loaded?.activeMissions[0]).toMatchObject({
      id: "story-clean-carrier",
      reward: cleanCarrier.reward,
      retryOnFailure: true,
      storyEncounter: cleanCarrier.storyEncounter
    });
    expect(loaded?.knownSystems).toEqual(["helion-reach"]);
    expect(loaded?.knownPlanetIds).toEqual(["helion-prime-world"]);
    expect(loaded?.reputation.factions["ptd-company"]).toBe(100);
    expect(loaded?.factionHeat).toEqual(createInitialFactionHeat());
    expect(loaded?.explorationState).toEqual(createInitialExplorationState());
    expect(loaded?.dialogueState).toEqual(createInitialDialogueState());
    expect(Object.prototype.hasOwnProperty.call(loaded, "unexpectedTopLevel")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(loaded, "__proto__")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(loaded, "constructor")).toBe(false);
    expect((Object.prototype as { polluted?: boolean }).polluted).toBeUndefined();
  });

  it("rebuilds a safe fixed-slot index from the stored saves", () => {
    const storage = new MemoryStorage();
    const first = {
      ...payload({ currentSystemId: "kuro-belt" }),
      version: SAVE_VERSION,
      savedAt: "2026-07-12T00:00:00.000Z"
    };
    const second = {
      ...payload({ currentSystemId: "celest-gate" }),
      version: SAVE_VERSION,
      savedAt: "2026-07-13T00:00:00.000Z"
    };
    storage.setItem(`${SAVE_SLOT_PREFIX}manual-1`, JSON.stringify(first));
    storage.setItem(`${SAVE_SLOT_PREFIX}manual-2`, JSON.stringify(second));
    storage.setItem(`${SAVE_SLOT_PREFIX}manual-3`, JSON.stringify({ ...second, player: null }));
    storage.setItem(SAVE_INDEX_KEY, JSON.stringify({
      version: SAVE_VERSION,
      slots: {
        "manual-1": { id: "wrong", label: { bad: true }, exists: true, savedAt: { invalid: true } },
        "manual-2": { id: "manual-2", label: "spoofed", exists: "yes", savedAt: -1 },
        "__garbage_slot__": { exists: true }
      },
      lastPlayedSlotId: "__garbage_slot__",
      extraTopLevelGarbage: [{ nested: true }]
    }));

    const index = readSaveIndex(storage);
    expect(Object.keys(index.slots).sort()).toEqual(["auto", "manual-1", "manual-2", "manual-3"]);
    expect(index.slots["manual-1"]).toMatchObject({ id: "manual-1", label: "Manual Slot 1", exists: true });
    expect(index.slots["manual-2"]).toMatchObject({ id: "manual-2", label: "Manual Slot 2", exists: true });
    expect(index.slots["manual-3"]?.exists).toBe(false);
    expect(index.lastPlayedSlotId).toBe("manual-2");
    expect(getLatestSaveSlotId(storage)).toBe("manual-2");
    expect(storage.getItem(SAVE_INDEX_KEY)).not.toContain("__garbage_slot__");
    expect(storage.getItem(SAVE_INDEX_KEY)).not.toContain("extraTopLevelGarbage");
  });

  it("keeps invalid or missing save times at a stable oldest sentinel", () => {
    const storage = new MemoryStorage();
    const valid = {
      ...payload({ currentSystemId: "kuro-belt" }),
      version: SAVE_VERSION,
      savedAt: "2026-07-12T00:00:00.000Z"
    };
    const invalid = {
      ...payload({ currentSystemId: "celest-gate" }),
      version: SAVE_VERSION,
      savedAt: { invalid: "timestamp" }
    };
    const missing = {
      ...payload({ currentSystemId: "ashen-drift" }),
      version: SAVE_VERSION
    };
    storage.setItem(`${SAVE_SLOT_PREFIX}manual-1`, JSON.stringify(valid));
    storage.setItem(`${SAVE_SLOT_PREFIX}manual-2`, JSON.stringify(invalid));
    storage.setItem(`${SAVE_SLOT_PREFIX}manual-3`, JSON.stringify(missing));
    storage.setItem(SAVE_INDEX_KEY, JSON.stringify({ version: SAVE_VERSION, slots: {} }));

    expect(getLatestSaveSlotId(storage)).toBe("manual-1");
    const first = readSaveIndex(storage);
    const firstSerialized = storage.getItem(SAVE_INDEX_KEY);
    expect(first.slots["manual-2"]?.savedAt).toBe("1970-01-01T00:00:00.000Z");
    expect(first.slots["manual-3"]?.savedAt).toBe("1970-01-01T00:00:00.000Z");
    expect(readSaveIndex(storage)).toEqual(first);
    expect(storage.getItem(SAVE_INDEX_KEY)).toBe(firstSerialized);
    expect(getLatestSaveSlotId(storage)).toBe("manual-1");
  });

  it("round trips only legitimate static mission reward multipliers", () => {
    const storage = new MemoryStorage();
    const courier = missionTemplates.find((mission) => mission.id === "courier-helion-kuro")!;
    const acceptedCourier = { ...courier, reward: 935, accepted: true, acceptedAt: 10 };

    writeSave(payload({ activeMissions: [acceptedCourier] }), storage, "manual-1");
    expect(readSave(storage, "manual-1")?.activeMissions[0]?.reward).toBe(935);

    const corrupted = parseSave(JSON.stringify({
      ...payload({
        activeMissions: [
          { ...acceptedCourier, reward: 999_999_999 },
          { ...missionTemplates.find((mission) => mission.id === "story-clean-carrier")!, reward: 999_999_999, accepted: true }
        ]
      }),
      version: SAVE_VERSION,
      savedAt: "2026-07-14T00:00:00.000Z"
    }));
    expect(corrupted?.activeMissions.map((mission) => mission.reward)).toEqual([
      courier.reward,
      missionTemplates.find((mission) => mission.id === "story-clean-carrier")!.reward
    ]);
  });

  it("preserves allowlisted progress for dynamic economy dispatch missions", () => {
    const dispatchMission = {
      id: "market-gap:helion-prime:basic-food:critical",
      title: "Market Gap: Basic Food",
      type: "Cargo transport" as const,
      originSystemId: "kuro-belt",
      destinationSystemId: "helion-reach",
      destinationStationId: "helion-prime",
      sourceStationId: "kuro-deep",
      factionId: "solar-directorate" as const,
      description: "Deliver food to Helion.",
      reward: 1_200,
      deadlineSeconds: 900,
      acceptedAt: 25,
      failureReputationDelta: -3,
      reputationRewards: { "solar-directorate": 3 },
      cargoRequired: { "basic-food": 4 },
      consumeCargoOnComplete: true,
      accepted: true,
      completed: false,
      failed: false
    };
    const loaded = parseSave(JSON.stringify({
      ...payload({ activeMissions: [dispatchMission] }),
      version: SAVE_VERSION,
      savedAt: "2026-07-14T00:00:00.000Z"
    }));

    expect(loaded?.activeMissions).toEqual([dispatchMission]);
  });

  it("round trips active story missions and derives story progress from save fields", () => {
    const storage = new MemoryStorage();
    const activeStoryMission = {
      ...missionTemplates.find((mission) => mission.id === "story-probe-in-glass")!,
      accepted: true,
      acceptedAt: 99
    };
    writeSave(
      payload({
        activeMissions: [activeStoryMission],
        completedMissionIds: ["story-clean-carrier"],
        failedMissionIds: []
      }),
      storage,
      "manual-1"
    );

    const loaded = readSave(storage, "manual-1")!;
    const progress = getStoryProgress(glassWakeProtocol, missionTemplates, loaded.activeMissions, loaded.completedMissionIds, loaded.failedMissionIds);

    expect(loaded.activeMissions[0].storyArcId).toBe(glassWakeProtocol.id);
    expect(progress.completedCount).toBe(1);
    expect(progress.current?.chapter.id).toBe("glass-wake-02");
    expect("storyState" in loaded).toBe(false);
  });

  it("keeps old completed first-chapter saves from showing the onboarding checklist", () => {
    const storage = new MemoryStorage();
    writeSave(
      payload({
        completedMissionIds: ["story-clean-carrier"]
      }),
      storage,
      "manual-1"
    );

    const raw = JSON.parse(storage.getItem(`${SAVE_SLOT_PREFIX}manual-1`) ?? "{}");
    delete raw.onboardingState;
    storage.setItem(`${SAVE_SLOT_PREFIX}manual-1`, JSON.stringify(raw));

    const loaded = readSave(storage, "manual-1")!;
    expect(loaded.onboardingState).toMatchObject({
      enabled: false,
      collapsed: true,
      completedAtGameTime: loaded.gameClock
    });
    expect(loaded.onboardingState?.completedStepIds).toContain("complete-clean-carrier");
    expect(loaded.version).toBe(SAVE_VERSION);
  });
});
