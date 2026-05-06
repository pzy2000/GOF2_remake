import { describe, expect, it } from "vitest";
import { missionTemplates, shipById } from "../src/data/world";
import { acceptMission, canCompleteMission, completeMission } from "../src/systems/missions";
import { createInitialReputation } from "../src/systems/reputation";
import type { PlayerState } from "../src/types/game";

function player(): PlayerState {
  const ship = shipById["sparrow-mk1"];
  return {
    shipId: ship.id,
    stats: ship.stats,
    hull: ship.stats.hull,
    shield: ship.stats.shield,
    energy: ship.stats.energy,
    credits: 100,
    cargo: {},
    equipment: ship.equipment,
    missiles: 6,
    ownedShips: [ship.id],
    position: [0, 0, 0],
    velocity: [0, 0, 0],
    rotation: [0, 0, 0],
    throttle: 0,
    lastDamageAt: -999
  };
}

describe("missions", () => {
  it("accepts and completes a courier mission", () => {
    const mission = missionTemplates.find((item) => item.id === "courier-helion-kuro")!;
    const accepted = acceptMission(player(), [], mission);
    expect(accepted.ok).toBe(true);
    expect(accepted.player.cargo["data-cores"]).toBe(1);
    expect(canCompleteMission(accepted.activeMissions[0], accepted.player, "kuro-belt", "kuro-deep", 0)).toBe(true);
    const completed = completeMission(accepted.activeMissions[0], accepted.player, createInitialReputation());
    expect(completed.player.credits).toBe(950);
    expect(completed.completed.completed).toBe(true);
  });

  it("requires ore before completing a mining contract", () => {
    const mission = { ...missionTemplates.find((item) => item.id === "mining-kuro-iron")!, accepted: true };
    expect(canCompleteMission(mission, player(), "kuro-belt", "kuro-deep", 0)).toBe(false);
    expect(canCompleteMission(mission, { ...player(), cargo: { iron: 5 } }, "kuro-belt", "kuro-deep", 0)).toBe(true);
  });
});
