import { describe, expect, it } from "vitest";
import { glassWakeProtocol, missionTemplates, shipById } from "../src/data/world";
import { createInitialDialogueState } from "../src/systems/dialogue";
import { createInitialMarketState } from "../src/systems/economy";
import { createInitialExplorationState } from "../src/systems/exploration";
import { createInitialReputation } from "../src/systems/reputation";
import {
  deleteSave,
  getLatestSaveSlotId,
  LEGACY_SAVE_VERSION,
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
      currentSystemId: "helion-reach",
      gameClock: 123,
      player: player(),
      activeMissions: [],
      completedMissionIds: ["courier-helion-kuro"],
      failedMissionIds: ["bounty-ashen"],
      marketState: createInitialMarketState(),
      reputation: createInitialReputation(),
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
        explorationState: {
          discoveredSignalIds: ["quiet-signal-sundog-lattice"],
          completedSignalIds: ["quiet-signal-sundog-lattice"],
          revealedStationIds: ["parallax-hermitage"],
          eventLogIds: ["quiet-signal-sundog-lattice"]
        },
        dialogueState: { seenSceneIds: ["dialogue-story-clean-carrier-accept"] }
      }),
      storage,
      "manual-1"
    );
    expect(storage.getItem(`${SAVE_SLOT_PREFIX}manual-1`)).toContain("helion-reach");
    expect(storage.getItem(SAVE_INDEX_KEY)).toContain("manual-1");
    const loaded = readSave(storage, "manual-1");
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
});
