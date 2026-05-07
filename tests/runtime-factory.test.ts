import { describe, expect, it } from "vitest";
import { missionTemplates } from "../src/data/world";
import type { EconomyNpcEntity } from "../src/types/economy";
import { cloneMission } from "../src/systems/missions";
import {
  addMissionRuntimeEntity,
  createRuntimeForSystem,
  materializeEconomyNpc
} from "../src/state/domains/runtimeFactory";

describe("runtime factory domain helpers", () => {
  it("creates base system runtime with faction doctrine and high-risk boss content", () => {
    const helion = createRuntimeForSystem("helion-reach");
    expect(helion.enemies.some((ship) => ship.role === "patrol" && ship.loadoutId === "directorate-patrol")).toBe(true);
    expect(helion.enemies.some((ship) => ship.role === "freighter" && ship.loadoutId === "union-freighter")).toBe(true);
    expect(helion.enemies.some((ship) => ship.boss)).toBe(false);

    const ashen = createRuntimeForSystem("ashen-drift");
    expect(ashen.enemies.find((ship) => ship.boss)).toMatchObject({
      id: "ashen-drift-boss-warlord",
      name: "Ashen Warlord Kass Vey",
      aiProfileId: "boss-warlord",
      loadoutId: "pirate-boss-warlord"
    });
  });

  it("materializes backend economy NPCs without losing economy metadata", () => {
    const npc: EconomyNpcEntity = {
      id: "econ-test-freighter",
      name: "Union Freighter Test",
      role: "freighter",
      factionId: "free-belt-union",
      systemId: "helion-reach",
      position: [10, 0, 20],
      velocity: [1, 0, -1],
      hull: 170,
      shield: 70,
      maxHull: 170,
      maxShield: 70,
      cargoCapacity: 32,
      cargo: { electronics: 3 },
      credits: 1400,
      task: {
        kind: "hauling",
        commodityId: "electronics",
        destinationStationId: "helion-prime",
        startedAt: 0
      },
      statusLabel: "HAULING",
      lastTradeAt: -999
    };

    expect(materializeEconomyNpc(npc)).toMatchObject({
      id: "econ-test-freighter",
      role: "freighter",
      factionId: "free-belt-union",
      aiProfileId: "freighter",
      loadoutId: "union-freighter",
      economyTaskKind: "hauling",
      economyStatus: "HAULING",
      economyCommodityId: "electronics",
      economyTargetId: "helion-prime",
      economyCargo: { electronics: 3 }
    });
  });

  it("adds mission runtime entities once for story targets and salvage", () => {
    const template = missionTemplates.find((mission) => mission.id === "story-probe-in-glass");
    expect(template).toBeDefined();
    const mission = {
      ...cloneMission(template!),
      accepted: true,
      acceptedAt: 0
    };
    const runtime = createRuntimeForSystem("mirr-vale");

    const withMission = addMissionRuntimeEntity(runtime, mission, "mirr-vale");
    expect(withMission.enemies.find((ship) => ship.id === "glass-echo-drone")).toMatchObject({
      role: "drone",
      storyTarget: true,
      missionId: "story-probe-in-glass",
      storyTargetKind: "drone",
      loadoutId: "unknown-drone"
    });
    expect(withMission.salvage.find((salvage) => salvage.id === "glass-wake-probe-core")).toMatchObject({
      missionId: "story-probe-in-glass",
      commodityId: "data-cores"
    });

    const repeated = addMissionRuntimeEntity(withMission, mission, "mirr-vale");
    expect(repeated.enemies.filter((ship) => ship.id === "glass-echo-drone")).toHaveLength(1);
    expect(repeated.salvage.filter((salvage) => salvage.id === "glass-wake-probe-core")).toHaveLength(1);
  });
});
