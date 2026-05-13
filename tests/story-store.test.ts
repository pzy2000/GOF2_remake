import { beforeEach, describe, expect, it, vi } from "vitest";
import { dialogueSceneById } from "../src/data/world";

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

  it("auto-accepts the next available story mission when docking at its origin", async () => {
    const store = await freshStore();

    store.getState().dockAt("helion-prime");

    expect(store.getState().activeMissions.map((mission) => mission.id)).toContain("story-clean-carrier");
    expect(store.getState().activeDialogue?.sceneId).toBe("dialogue-story-clean-carrier-accept");
    expect(store.getState().dialogueState.seenSceneIds).toContain("dialogue-story-clean-carrier-accept");
    expect(store.getState().runtime.storyNotification).toMatchObject({
      tone: "start",
      title: "Glass Wake 01: Clean Carrier"
    });
  });

  it("auto-completes a ready active story mission and queues the next accept dialogue", async () => {
    const store = await freshStore();

    store.getState().dockAt("helion-prime");
    store.getState().closeDialogue();
    store.getState().dockAt("mirr-lattice");

    expect(store.getState().completedMissionIds).toContain("story-clean-carrier");
    expect(store.getState().activeMissions.map((mission) => mission.id)).toContain("story-probe-in-glass");
    expect(store.getState().activeDialogue?.sceneId).toBe("dialogue-story-clean-carrier-complete");
    expect(store.getState().activeDialogue?.queuedSceneIds).toContain("dialogue-story-probe-in-glass-accept");
    expect(store.getState().dialogueState.seenSceneIds).toContain("dialogue-story-clean-carrier-complete");

    store.getState().closeDialogue();

    expect(store.getState().activeDialogue?.sceneId).toBe("dialogue-story-probe-in-glass-accept");
    expect(store.getState().dialogueState.seenSceneIds).toContain("dialogue-story-probe-in-glass-accept");
  });

  it("rewinds within the active dialogue without dropping queued scenes", async () => {
    const store = await freshStore();
    store.setState({
      activeDialogue: {
        sceneId: "dialogue-story-clean-carrier-complete",
        lineIndex: 0,
        replay: false,
        queuedSceneIds: ["dialogue-story-probe-in-glass-accept"]
      }
    });

    store.getState().rewindDialogue();
    expect(store.getState().activeDialogue).toMatchObject({
      sceneId: "dialogue-story-clean-carrier-complete",
      lineIndex: 0,
      replay: false,
      queuedSceneIds: ["dialogue-story-probe-in-glass-accept"]
    });

    store.getState().advanceDialogue();
    expect(store.getState().activeDialogue?.lineIndex).toBe(1);

    store.getState().rewindDialogue();
    expect(store.getState().activeDialogue).toMatchObject({
      sceneId: "dialogue-story-clean-carrier-complete",
      lineIndex: 0,
      replay: false,
      queuedSceneIds: ["dialogue-story-probe-in-glass-accept"]
    });
  });

  it("advances into queued dialogue when the current scene ends", async () => {
    const store = await freshStore();
    const currentScene = dialogueSceneById["dialogue-story-clean-carrier-complete"];
    store.setState({
      dialogueState: { seenSceneIds: ["dialogue-story-clean-carrier-complete"] },
      activeDialogue: {
        sceneId: "dialogue-story-clean-carrier-complete",
        lineIndex: currentScene.lines.length - 1,
        replay: false,
        queuedSceneIds: ["dialogue-story-probe-in-glass-accept"]
      }
    });

    store.getState().advanceDialogue();

    expect(store.getState().activeDialogue).toMatchObject({
      sceneId: "dialogue-story-probe-in-glass-accept",
      lineIndex: 0,
      replay: false,
      queuedSceneIds: []
    });
    expect(store.getState().dialogueState.seenSceneIds).toContain("dialogue-story-probe-in-glass-accept");
  });

  it("auto-retries a failed retryable story mission at its origin station", async () => {
    const store = await freshStore();
    store.setState({
      screen: "flight",
      currentSystemId: "mirr-vale",
      currentStationId: undefined,
      activeDialogue: undefined,
      activeMissions: [],
      completedMissionIds: ["story-clean-carrier"],
      failedMissionIds: ["story-probe-in-glass"]
    });

    store.getState().dockAt("mirr-lattice");

    expect(store.getState().activeMissions.map((mission) => mission.id)).toContain("story-probe-in-glass");
    expect(store.getState().failedMissionIds).not.toContain("story-probe-in-glass");
    expect(store.getState().activeDialogue?.sceneId).toBe("dialogue-story-probe-in-glass-accept");
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
      title: "Prime Wake",
      body: expect.stringContaining("Defeat Glass Echo Prime")
    });

    const boss = store.getState().runtime.enemies.find((ship) => ship.id === "glass-echo-prime");
    expect(boss).toMatchObject({
      storyTarget: true,
      missionId: "story-probe-in-glass",
      role: "drone",
      boss: true
    });

    store.setState((state) => ({
      targetId: "glass-echo-prime",
      runtime: {
        ...state.runtime,
        enemies: state.runtime.enemies.map((ship) => (ship.id === "glass-echo-prime" ? { ...ship, position: [0, 0, 0] } : { ...ship, position: [900, 0, 900] })),
        projectiles: [
          {
            id: "story-boss-shot",
            owner: "player",
            kind: "laser",
            position: [0, 0, 0],
            direction: [0, 0, 0],
            speed: 0,
            damage: 999,
            life: 1,
            targetId: "glass-echo-prime"
          }
        ]
      }
    }));
    store.getState().tick(0.05);

    expect(store.getState().activeMissions[0].storyTargetDestroyedIds).toEqual(["glass-echo-drone", "glass-echo-prime"]);
    expect(store.getState().runtime.storyNotification).toMatchObject({
      tone: "updated",
      title: "Probe Core Exposed",
      body: expect.stringContaining("Recover the Glass Wake Probe Core")
    });
  });

  it("opens the first-run intro dialogue once when a new game starts", async () => {
    const store = await freshStore();

    expect(store.getState().activeDialogue?.sceneId).toBe("dialogue-story-glass-wake-intro");
    expect(store.getState().dialogueState.seenSceneIds).toContain("dialogue-story-glass-wake-intro");

    store.getState().closeDialogue();
    store.getState().newGame();

    expect(store.getState().activeDialogue).toBeUndefined();
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

  it("unlocks Act II after Quiet Crown and accepts chapter 09", async () => {
    const store = await freshStore();
    store.setState({
      currentSystemId: "celest-gate",
      currentStationId: "celest-vault",
      completedMissionIds: ["story-clean-carrier", "story-probe-in-glass", "story-kuro-resonance", "story-bastion-calibration", "story-ashen-decoy-manifest", "story-knife-wing-relay", "story-witnesses-to-celest", "story-quiet-crown-relay"]
    });

    store.getState().acceptMission("story-name-in-the-wake");

    expect(store.getState().activeMissions.some((mission) => mission.id === "story-name-in-the-wake")).toBe(true);
    expect(store.getState().activeDialogue?.sceneId).toBe("dialogue-story-name-in-the-wake-accept");
  });

  it("tracks Echo Lock progress, decay, and completion on a targeted story contact", async () => {
    const store = await freshStore();
    const { missionTemplates } = await import("../src/data/world");
    const { cloneMission } = await import("../src/systems/missions");
    const { createRuntimeForSystem } = await import("../src/state/domains/runtimeFactory");
    const template = missionTemplates.find((mission) => mission.id === "story-name-in-the-wake")!;
    const target = template.storyEncounter!.targets.find((item) => item.id === "keel-name-listener")!;
    const activeMission = { ...cloneMission(template), accepted: true, acceptedAt: 0, storyTargetDestroyedIds: [], storyEchoLockedTargetIds: [] };
    const runtime = createRuntimeForSystem("ptd-home", [activeMission]);
    store.setState((state) => ({
      currentSystemId: "ptd-home",
      currentStationId: undefined,
      activeMissions: [activeMission],
      targetId: target.id,
      player: { ...state.player, position: [target.position[0], target.position[1], target.position[2] - 120], velocity: [0, 0, 0], throttle: 0 },
      runtime: { ...runtime, graceUntil: 0, enemies: runtime.enemies.map((ship) => ship.id === target.id ? { ...ship, aiState: "patrol", velocity: [0, 0, 0] } : ship) }
    }));

    store.getState().tick(1);
    const partial = store.getState().runtime.storyEchoLock;
    expect(partial).toMatchObject({ missionId: activeMission.id, targetId: target.id, inRange: true });
    expect(partial!.progressSeconds).toBeGreaterThan(0);

    store.setState((state) => ({ player: { ...state.player, position: [2400, 0, 2400], velocity: [0, 0, 0], throttle: 0 } }));
    store.getState().tick(0.25);
    expect(store.getState().runtime.storyEchoLock?.progressSeconds).toBeLessThan(partial!.progressSeconds);

    store.setState((state) => ({ player: { ...state.player, position: [target.position[0], target.position[1], target.position[2] - 120], velocity: [0, 0, 0], throttle: 0 } }));
    store.getState().tick(target.echoLock!.requiredSeconds + 0.25);

    expect(store.getState().activeMissions[0].storyEchoLockedTargetIds).toContain(target.id);
    expect(store.getState().runtime.message).toContain("Echo Lock complete");
  });

  it("prevents lethal damage against Echo-locked story targets until Echo Lock completes", async () => {
    const store = await freshStore();
    const { missionTemplates } = await import("../src/data/world");
    const { cloneMission } = await import("../src/systems/missions");
    const { createRuntimeForSystem } = await import("../src/state/domains/runtimeFactory");
    const template = missionTemplates.find((mission) => mission.id === "story-name-in-the-wake")!;
    const target = template.storyEncounter!.targets.find((item) => item.id === "keel-name-listener")!;
    const activeMission = { ...cloneMission(template), accepted: true, acceptedAt: 0, storyTargetDestroyedIds: [], storyEchoLockedTargetIds: [] };
    const runtime = createRuntimeForSystem("ptd-home", [activeMission]);
    store.setState((state) => ({
      currentSystemId: "ptd-home",
      activeMissions: [activeMission],
      targetId: target.id,
      player: { ...state.player, position: target.position, velocity: [0, 0, 0], throttle: 0 },
      runtime: {
        ...runtime,
        graceUntil: 0,
        enemies: runtime.enemies.map((ship) => ship.id === target.id ? { ...ship, position: target.position, hull: 4, shield: 0, velocity: [0, 0, 0] } : ship),
        projectiles: [{
          id: "echo-lock-test-shot",
          owner: "player",
          kind: "laser",
          position: target.position,
          direction: [0, 0, 0],
          speed: 0,
          damage: 999,
          life: 1,
          targetId: target.id
        }]
      }
    }));

    store.getState().tick(0.05);

    const protectedTarget = store.getState().runtime.enemies.find((ship) => ship.id === target.id);
    expect(protectedTarget).toMatchObject({ hull: 1, deathTimer: undefined });
    expect(store.getState().activeMissions[0].storyTargetDestroyedIds).not.toContain(target.id);
    expect(store.getState().runtime.message).toContain("Echo Lock required");
  });

  it("unlocks the Echo Nullifier blueprint when chapter 13 completes", async () => {
    const store = await freshStore();
    const { missionTemplates } = await import("../src/data/world");
    const { cloneMission } = await import("../src/systems/missions");
    const template = missionTemplates.find((mission) => mission.id === "story-listener-scar")!;
    const echoTargetId = template.storyEncounter!.targets.find((target) => target.echoLock)!.id;
    const activeMission = {
      ...cloneMission(template),
      accepted: true,
      acceptedAt: 0,
      storyTargetDestroyedIds: [...template.storyEncounter!.requiredTargetIds],
      storyEchoLockedTargetIds: [echoTargetId],
      salvage: { ...template.salvage!, recovered: true }
    };
    store.setState((state) => ({
      currentSystemId: "celest-gate",
      currentStationId: "celest-vault",
      activeMissions: [activeMission],
      completedMissionIds: ["story-clean-carrier", "story-probe-in-glass", "story-kuro-resonance", "story-bastion-calibration", "story-ashen-decoy-manifest", "story-knife-wing-relay", "story-witnesses-to-celest", "story-quiet-crown-relay", "story-name-in-the-wake", "story-borrowed-hulls", "story-parallax-wound", "story-black-ledger-chorus"],
      player: { ...state.player, unlockedBlueprintIds: state.player.unlockedBlueprintIds?.filter((id) => id !== "echo-nullifier") }
    }));

    store.getState().completeMission("story-listener-scar");

    expect(store.getState().completedMissionIds).toContain("story-listener-scar");
    expect(store.getState().player.unlockedBlueprintIds).toContain("echo-nullifier");
    expect(store.getState().runtime.message).toContain("Echo Nullifier blueprint unlocked");
  });
});
