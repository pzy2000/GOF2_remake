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
    expect(store.getState().runtime.storyNotification).toMatchObject({
      tone: "start",
      title: "Glass Wake 01: Clean Carrier"
    });

    store.getState().closeDialogue();
    store.setState({
      currentSystemId: "mirr-vale",
      currentStationId: "mirr-lattice"
    });
    store.getState().completeMission("story-clean-carrier");
    expect(store.getState().activeDialogue?.sceneId).toBe("dialogue-story-clean-carrier-complete");
    expect(store.getState().dialogueState.seenSceneIds).toContain("dialogue-story-clean-carrier-complete");
    expect(store.getState().runtime.storyNotification).toMatchObject({
      tone: "complete",
      title: "Glass Wake 01: Clean Carrier"
    });

    store.getState().closeDialogue();
    store.setState({ activeMissions: [], completedMissionIds: [], currentSystemId: "helion-reach" });
    store.getState().acceptMission("story-clean-carrier");
    expect(store.getState().activeDialogue).toBeUndefined();
  });

  it("spawns and records story encounter targets", async () => {
    const store = await freshStore();
    store.getState().jumpToSystem("mirr-vale");
    store.setState({ completedMissionIds: ["story-clean-carrier"] });

    store.getState().acceptMission("story-probe-in-glass");

    const target = store.getState().runtime.enemies.find((ship) => ship.id === "glass-echo-drone");
    expect(target).toMatchObject({ storyTarget: true, missionId: "story-probe-in-glass", role: "drone" });

    store.setState((state) => ({
      targetId: "glass-echo-drone",
      player: { ...state.player, position: [0, 0, 0] },
      runtime: {
        ...state.runtime,
        enemies: state.runtime.enemies.map((ship) => (ship.id === "glass-echo-drone" ? { ...ship, position: [0, 0, 0] } : { ...ship, position: [900, 0, 900] })),
        projectiles: [
          {
            id: "story-target-shot",
            owner: "player",
            kind: "laser",
            position: [0, 0, 0],
            direction: [0, 0, 0],
            speed: 0,
            damage: 999,
            life: 1,
            targetId: "glass-echo-drone"
          }
        ]
      }
    }));
    store.getState().tick(0.05);

    expect(store.getState().activeMissions[0].storyTargetDestroyedIds).toContain("glass-echo-drone");
    expect(store.getState().runtime.message).toContain("Story objective updated");
    expect(store.getState().runtime.storyNotification).toMatchObject({
      tone: "updated",
      title: "Glass Wake 02: Probe in the Glass"
    });
  });

  it("shows a failed story notification when a story deadline expires", async () => {
    const store = await freshStore();
    const { missionTemplates } = await import("../src/data/world");
    const mission = missionTemplates.find((item) => item.id === "story-clean-carrier")!;
    store.setState({ currentSystemId: "helion-reach", currentStationId: "helion-prime" });

    store.getState().acceptMission("story-clean-carrier");
    store.getState().advanceGameClock((mission.deadlineSeconds ?? 0) + 1);

    expect(store.getState().failedMissionIds).toContain("story-clean-carrier");
    expect(store.getState().runtime.storyNotification).toMatchObject({
      tone: "failed",
      title: "Glass Wake 01: Clean Carrier"
    });
  });

  it("completes final story chapter after relay targets and salvage are done", async () => {
    const store = await freshStore();
    const { missionTemplates } = await import("../src/data/world");
    const { cloneMission } = await import("../src/systems/missions");
    const template = missionTemplates.find((mission) => mission.id === "story-quiet-crown-relay")!;
    const activeMission = {
      ...cloneMission(template),
      accepted: true,
      acceptedAt: 0,
      storyTargetDestroyedIds: [...template.storyEncounter!.requiredTargetIds],
      salvage: { ...template.salvage!, recovered: true }
    };
    store.setState({
      currentSystemId: "celest-gate",
      currentStationId: "celest-vault",
      activeMissions: [activeMission],
      completedMissionIds: ["story-clean-carrier", "story-probe-in-glass", "story-kuro-resonance", "story-bastion-calibration", "story-ashen-decoy-manifest", "story-knife-wing-relay", "story-witnesses-to-celest"]
    });

    store.getState().completeMission("story-quiet-crown-relay");

    expect(store.getState().completedMissionIds).toContain("story-quiet-crown-relay");
    expect(store.getState().activeDialogue?.sceneId).toBe("dialogue-story-quiet-crown-relay-complete");
  });
});
