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

describe("story mission store flow", () => {
  it("does not accept locked story chapters before their prerequisites", async () => {
    const store = await freshStore();
    store.setState({ currentSystemId: "mirr-vale" });

    store.getState().acceptMission("story-probe-in-glass");

    expect(store.getState().activeMissions.some((mission) => mission.id === "story-probe-in-glass")).toBe(false);
    expect(store.getState().runtime.message).toBe("Mission prerequisites are not complete.");
  });

  it("clears failed retryable story missions when accepting them again", async () => {
    const store = await freshStore();
    store.setState({
      currentSystemId: "mirr-vale",
      activeMissions: [],
      completedMissionIds: ["story-clean-carrier"],
      failedMissionIds: ["story-probe-in-glass"]
    });

    store.getState().acceptMission("story-probe-in-glass");

    expect(store.getState().activeMissions.some((mission) => mission.id === "story-probe-in-glass")).toBe(true);
    expect(store.getState().failedMissionIds).not.toContain("story-probe-in-glass");
  });

  it("opens story dialogue once on accept and complete", async () => {
    const store = await freshStore();
    store.setState({ currentSystemId: "helion-reach", currentStationId: "helion-prime" });

    store.getState().acceptMission("story-clean-carrier");
    expect(store.getState().activeDialogue?.sceneId).toBe("dialogue-story-clean-carrier-accept");
    expect(store.getState().dialogueState.seenSceneIds).toContain("dialogue-story-clean-carrier-accept");

    store.getState().closeDialogue();
    store.setState({
      currentSystemId: "mirr-vale",
      currentStationId: "mirr-lattice"
    });
    store.getState().completeMission("story-clean-carrier");
    expect(store.getState().activeDialogue?.sceneId).toBe("dialogue-story-clean-carrier-complete");
    expect(store.getState().dialogueState.seenSceneIds).toContain("dialogue-story-clean-carrier-complete");

    store.getState().closeDialogue();
    store.setState({ activeMissions: [], completedMissionIds: [], currentSystemId: "helion-reach" });
    store.getState().acceptMission("story-clean-carrier");
    expect(store.getState().activeDialogue).toBeUndefined();
  });
});
