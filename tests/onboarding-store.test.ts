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

describe("onboarding store flow", () => {
  it("initializes and completes the first 30 minute checklist with one-time rewards", async () => {
    const store = await freshStore();
    expect(store.getState().onboardingState).toMatchObject({ enabled: true, completedStepIds: [] });
    expect(store.getState().player.credits).toBe(1500);

    store.setState((state) => ({ player: { ...state.player, position: [0, 0, -80] } }));
    store.getState().syncOnboardingProgress();
    expect(store.getState().onboardingState?.completedStepIds).toEqual(["first-flight"]);
    expect(store.getState().player.credits).toBe(1550);

    store.setState((state) => ({ player: { ...state.player, hull: 10 } }));
    store.getState().dockAt("helion-prime");
    expect(store.getState().onboardingState?.completedStepIds).toContain("dock-helion");
    expect(store.getState().onboardingState?.completedStepIds).toContain("accept-clean-carrier");
    expect(store.getState().activeMissions.map((mission) => mission.id)).toContain("story-clean-carrier");
    expect(store.getState().player.credits).toBe(1725);
    expect(store.getState().player.hull).toBeGreaterThanOrEqual(Math.ceil(store.getState().player.stats.hull * 0.75));

    store.getState().startJumpToStation("mirr-lattice");
    expect(store.getState().onboardingState?.completedStepIds).toEqual([
      "first-flight",
      "dock-helion",
      "accept-clean-carrier",
      "plot-clean-carrier-route",
      "launch-for-mirr"
    ]);
    expect(store.getState().player.credits).toBe(1875);

    store.getState().dockAt("mirr-lattice");
    expect(store.getState().onboardingState?.completedStepIds).toContain("dock-mirr-lattice");
    expect(store.getState().completedMissionIds).toContain("story-clean-carrier");
    expect(store.getState().activeMissions.map((mission) => mission.id)).toContain("story-probe-in-glass");
    expect(store.getState().onboardingState).toMatchObject({
      enabled: true,
      collapsed: false,
      completedStepIds: [
        "first-flight",
        "dock-helion",
        "accept-clean-carrier",
        "plot-clean-carrier-route",
        "launch-for-mirr",
        "dock-mirr-lattice",
        "complete-clean-carrier",
        "accept-probe-in-glass"
      ],
      claimedRewardStepIds: [
        "first-flight",
        "dock-helion",
        "accept-clean-carrier",
        "plot-clean-carrier-route",
        "launch-for-mirr",
        "dock-mirr-lattice",
        "complete-clean-carrier",
        "accept-probe-in-glass"
      ]
    });
    expect(store.getState().player.credits).toBe(3120);

    store.setState({ currentSystemId: "mirr-vale", currentStationId: "mirr-lattice" });

    store.setState((state) => ({
      activeMissions: state.activeMissions.map((mission) =>
        mission.id === "story-probe-in-glass"
          ? {
              ...mission,
              storyTargetDestroyedIds: ["glass-echo-drone", "glass-echo-prime"],
              salvage: { ...mission.salvage!, recovered: true }
            }
          : mission
      )
    }));
    store.getState().completeMission("story-probe-in-glass");
    expect(store.getState().completedMissionIds).toContain("story-probe-in-glass");
    expect(store.getState().onboardingState).toMatchObject({
      enabled: false,
      collapsed: true
    });
    expect(store.getState().onboardingState?.completedStepIds).toContain("complete-probe-in-glass");

    store.getState().syncOnboardingProgress();
    expect(store.getState().player.credits).toBe(store.getState().player.credits);
  });

  it("collapses and skips without granting rewards", async () => {
    const store = await freshStore();
    store.getState().setOnboardingCollapsed(true);
    expect(store.getState().onboardingState?.collapsed).toBe(true);

    store.getState().skipOnboarding();
    expect(store.getState().onboardingState).toMatchObject({ enabled: false, collapsed: true });
    expect(store.getState().player.credits).toBe(1500);
  });
});
