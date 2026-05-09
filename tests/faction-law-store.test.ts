import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialFactionHeat, applyFactionIncident, getFactionHeatRecord } from "../src/systems/factionConsequences";
import { createInitialMarketState } from "../src/systems/economy";

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
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("faction law store integration", () => {
  it("soft-locks official station purchases while preserving sell and fine payment paths", async () => {
    const store = await freshStore();
    const incident = applyFactionIncident({
      factionHeat: createInitialFactionHeat(),
      factionId: "solar-directorate",
      kind: "patrol-destroyed",
      now: 0
    });
    store.setState((state) => ({
      currentStationId: "helion-prime",
      factionHeat: incident.factionHeat,
      player: { ...state.player, credits: 10000, cargo: { "basic-food": 1 } },
      marketState: createInitialMarketState()
    }));

    store.getState().buy("basic-food", 1);
    expect(store.getState().player.cargo["basic-food"]).toBe(1);
    expect(store.getState().runtime.message).toContain("Official services locked");

    const creditsBeforeSell = store.getState().player.credits;
    store.getState().sell("basic-food", 1);
    expect(store.getState().player.credits).toBeGreaterThan(creditsBeforeSell);

    store.getState().payFactionFine("solar-directorate");
    expect(getFactionHeatRecord(store.getState().factionHeat, "solar-directorate").fineCredits).toBe(0);
  });

  it("persists faction reward bonuses on accepted non-story missions", async () => {
    const store = await freshStore();
    store.setState((state) => ({
      currentStationId: "helion-prime",
      reputation: { factions: { ...state.reputation.factions, "solar-directorate": 15 } }
    }));

    store.getState().acceptMission("courier-helion-kuro");

    expect(store.getState().activeMissions[0]).toMatchObject({
      id: "courier-helion-kuro",
      reward: 935
    });
  });

  it("brokers black-market amnesty from pirate lounges", async () => {
    const store = await freshStore();
    const incident = applyFactionIncident({
      factionHeat: createInitialFactionHeat(),
      factionId: "solar-directorate",
      kind: "patrol-destroyed",
      now: 0
    });
    store.setState((state) => ({
      currentSystemId: "ashen-drift",
      currentStationId: "black-arcade",
      factionHeat: incident.factionHeat,
      player: { ...state.player, credits: 20000 }
    }));

    store.getState().brokerBlackMarketAmnesty("solar-directorate");

    const record = getFactionHeatRecord(store.getState().factionHeat, "solar-directorate");
    expect(record.fineCredits).toBe(0);
    expect(record.heat).toBe(19);
    expect(record.wantedUntil).toBeUndefined();
    expect(store.getState().player.credits).toBeLessThan(20000);
    expect(store.getState().reputation.factions["independent-pirates"]).toBe(-19);
  });

  it("spawns patrol interdiction support on launch and respects cooldown", async () => {
    const store = await freshStore();
    const incident = applyFactionIncident({
      factionHeat: createInitialFactionHeat(),
      factionId: "solar-directorate",
      kind: "contraband-hostile",
      now: 0
    });
    store.setState({
      currentStationId: "helion-prime",
      currentSystemId: "helion-reach",
      factionHeat: incident.factionHeat
    });

    store.getState().undock();
    const firstCount = store.getState().runtime.enemies.filter((ship) => ship.supportWing).length;
    expect(firstCount).toBeGreaterThan(0);
    expect(getFactionHeatRecord(store.getState().factionHeat, "solar-directorate").interceptCooldownUntil).toBe(120);

    store.getState().dockAt("helion-prime");
    store.getState().undock();
    expect(store.getState().runtime.enemies.filter((ship) => ship.supportWing).length).toBe(firstCount);
  });
});
