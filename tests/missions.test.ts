import { describe, expect, it } from "vitest";
import { missionTemplates, shipById } from "../src/data/world";
import {
  acceptMission,
  areMissionPrerequisitesMet,
  canCompleteMission,
  completeMission,
  failMission,
  getAvailableMissionsForSystem,
  isMissionAvailable,
  isMissionExpired,
  markEscortArrived,
  markSalvageRecovered
} from "../src/systems/missions";
import { getOccupiedCargo } from "../src/systems/economy";
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

  it("consumes player-provided cargo for cargo transport", () => {
    const mission = { ...missionTemplates.find((item) => item.id === "cargo-helion-ashen")!, accepted: true, acceptedAt: 0 };
    const loaded = { ...player(), cargo: { "basic-food": 3, "medical-supplies": 2 } };
    expect(canCompleteMission(mission, loaded, "ashen-drift", "ashen-freeport", 0, 20)).toBe(true);
    const completed = completeMission(mission, loaded, createInitialReputation());
    expect(completed.player.cargo["basic-food"]).toBeUndefined();
    expect(completed.player.cargo["medical-supplies"]).toBeUndefined();
    expect(completed.player.credits).toBe(1420);
  });

  it("uses cargo capacity for passenger missions and releases it on completion", () => {
    const mission = missionTemplates.find((item) => item.id === "passenger-helion-celest")!;
    const accepted = acceptMission({ ...player(), stats: { ...player().stats, cargoCapacity: 3 } }, [], mission);
    expect(accepted.ok).toBe(false);

    const roomy = acceptMission(player(), [], mission, 12);
    expect(roomy.ok).toBe(true);
    expect(getOccupiedCargo(roomy.player.cargo, roomy.activeMissions)).toBe(4);
    expect(canCompleteMission(roomy.activeMissions[0], roomy.player, "celest-gate", "celest-vault", 0, 20)).toBe(true);
    const completed = completeMission(roomy.activeMissions[0], roomy.player, createInitialReputation());
    expect(getOccupiedCargo(completed.player.cargo, [])).toBe(0);
  });

  it("completes escort and salvage missions through progress flags", () => {
    const escort = { ...missionTemplates.find((item) => item.id === "escort-vantara")!, accepted: true, acceptedAt: 0 };
    expect(canCompleteMission(escort, player(), "vantara", "vantara-bastion", 0, 10)).toBe(false);
    const arrived = markEscortArrived(escort);
    expect(canCompleteMission(arrived, player(), "vantara", "vantara-bastion", 0, 10)).toBe(true);

    const salvage = { ...missionTemplates.find((item) => item.id === "salvage-mirr")!, accepted: true, acceptedAt: 0 };
    expect(canCompleteMission(salvage, player(), "mirr-vale", "mirr-lattice", 0, 10)).toBe(false);
    const recovered = markSalvageRecovered(salvage);
    expect(canCompleteMission(recovered, player(), "mirr-vale", "mirr-lattice", 0, 10)).toBe(true);
  });

  it("fails expired missions and applies reputation penalties", () => {
    const mission = { ...missionTemplates.find((item) => item.id === "courier-helion-kuro")!, accepted: true, acceptedAt: 0 };
    expect(isMissionExpired(mission, mission.deadlineSeconds! + 1)).toBe(true);
    const result = failMission(mission, { ...player(), cargo: { "data-cores": 1 } }, createInitialReputation(), "Deadline expired");
    expect(result.failed.failed).toBe(true);
    expect(result.player.cargo["data-cores"]).toBeUndefined();
    expect(result.reputation.factions["solar-directorate"]).toBeLessThan(createInitialReputation().factions["solar-directorate"]);
  });

  it("does not complete courier delivery if mission cargo is missing", () => {
    const mission = { ...missionTemplates.find((item) => item.id === "courier-helion-kuro")!, accepted: true, acceptedAt: 0 };
    expect(canCompleteMission(mission, player(), "kuro-belt", "kuro-deep", 0, 10)).toBe(false);
  });

  it("gates story missions behind completed prerequisite missions", () => {
    const first = missionTemplates.find((item) => item.id === "story-clean-carrier")!;
    const second = missionTemplates.find((item) => item.id === "story-probe-in-glass")!;
    const sideContract = missionTemplates.find((item) => item.id === "courier-helion-kuro")!;

    expect(areMissionPrerequisitesMet(first, [])).toBe(true);
    expect(areMissionPrerequisitesMet(second, [])).toBe(false);
    expect(areMissionPrerequisitesMet(second, [first.id])).toBe(true);
    expect(isMissionAvailable(sideContract, [], [], [])).toBe(true);
    expect(isMissionAvailable(second, [], [first.id], [])).toBe(true);
    expect(isMissionAvailable(second, [], [], [])).toBe(false);
  });

  it("keeps retryable failed story missions available without reopening completed missions", () => {
    const first = missionTemplates.find((item) => item.id === "story-clean-carrier")!;
    const second = missionTemplates.find((item) => item.id === "story-probe-in-glass")!;
    const available = getAvailableMissionsForSystem(missionTemplates, "mirr-vale", [], [first.id], [second.id]);

    expect(second.retryOnFailure).toBe(true);
    expect(available.map((mission) => mission.id)).toContain(second.id);
    expect(isMissionAvailable(second, [], [first.id, second.id], [second.id])).toBe(false);
  });
});
