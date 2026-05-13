import { describe, expect, it } from "vitest";
import { equipmentById, missionTemplates, shipById, stationById } from "../src/data/world";
import {
  applyFactionHeatDecay,
  applyFactionIncident,
  createInitialFactionHeat,
  getFactionHeatRecord,
  normalizeFactionHeat
} from "../src/systems/factionConsequences";
import {
  applyBlackMarketAmnesty,
  getBlackMarketAmnestyOffer,
  getEquipmentPurchaseAccess,
  getFactionRewardMultiplier,
  getFactionStandingTier,
  getMissionAcceptAccess,
  getRepairCostMultiplier,
  getShipPurchaseAccess,
  getStationServiceAccess
} from "../src/systems/factionServices";
import { createInitialReputation } from "../src/systems/reputation";
import type { PlayerState } from "../src/types/game";

function player(credits = 10000): PlayerState {
  return {
    shipId: "sparrow-mk1",
    stats: shipById["sparrow-mk1"].stats,
    hull: 100,
    shield: 80,
    energy: 100,
    credits,
    cargo: {},
    equipment: shipById["sparrow-mk1"].equipment,
    missiles: 6,
    ownedShips: ["sparrow-mk1"],
    position: [0, 0, 0],
    velocity: [0, 0, 0],
    rotation: [0, 0, 0],
    throttle: 0,
    lastDamageAt: -999
  };
}

describe("faction service access", () => {
  it("maps reputation to standing tiers and applies official service soft locks", () => {
    expect(getFactionStandingTier(50)).toBe("allied");
    expect(getFactionStandingTier(15)).toBe("friendly");
    expect(getFactionStandingTier(-9)).toBe("neutral");
    expect(getFactionStandingTier(-10)).toBe("hostile");
    expect(getFactionStandingTier(-40)).toBe("kill-on-sight");

    const station = stationById["helion-prime"];
    const reputation = createInitialReputation();
    const clearHeat = createInitialFactionHeat();
    expect(getStationServiceAccess({ station, service: "commodity-buy", reputation, factionHeat: clearHeat, now: 0 }).ok).toBe(true);

    const citation = applyFactionIncident({
      factionHeat: clearHeat,
      factionId: "solar-directorate",
      kind: "contraband-fine",
      fineCredits: 900,
      now: 5
    }).factionHeat;
    expect(getStationServiceAccess({ station, service: "commodity-buy", reputation, factionHeat: citation, now: 6 }).ok).toBe(true);
    expect(getStationServiceAccess({ station, service: "equipment-buy", reputation, factionHeat: citation, now: 6 }).ok).toBe(false);
    expect(getStationServiceAccess({ station, service: "repair", reputation, factionHeat: citation, now: 6 }).ok).toBe(false);

    const wanted = applyFactionIncident({
      factionHeat: clearHeat,
      factionId: "solar-directorate",
      kind: "contraband-hostile",
      now: 7
    }).factionHeat;
    expect(getStationServiceAccess({ station, service: "commodity-buy", reputation, factionHeat: wanted, now: 8 }).ok).toBe(false);
    expect(getStationServiceAccess({ station, service: "repair", reputation, factionHeat: wanted, now: 8 }).ok).toBe(false);

    const ptdStation = stationById["ptd-home"];
    expect(ptdStation.factionId).toBe("ptd-company");
    const ptdAccess = getStationServiceAccess({ station: ptdStation, service: "shipyard-buy", reputation, factionHeat: wanted, now: 8 });
    expect(ptdAccess.ok).toBe(true);
    expect(ptdAccess.standingTier).toBe("allied");
    expect(ptdAccess.heatLevel).toBe("clear");
    expect(getRepairCostMultiplier("ptd-company", reputation, wanted, 8)).toBe(0);
  });

  it("gates equipment, ships, and non-story mission acceptance by standing", () => {
    const station = stationById["pearl-consulate"];
    const neutral = createInitialReputation();
    const friendly = { factions: { ...neutral.factions, "solar-directorate": 15 } };
    const allied = { factions: { ...neutral.factions, "solar-directorate": 50 } };
    const pirateNeutral = { factions: { ...neutral.factions, "independent-pirates": 0 } };
    const factionHeat = createInitialFactionHeat();

    expect(getEquipmentPurchaseAccess({ station, equipment: equipmentById["energy-reactor"], reputation: neutral, factionHeat, now: 0 }).ok).toBe(true);
    expect(getEquipmentPurchaseAccess({ station, equipment: equipmentById["railgun"], reputation: neutral, factionHeat, now: 0 }).ok).toBe(false);
    expect(getEquipmentPurchaseAccess({ station, equipment: equipmentById["railgun"], reputation: friendly, factionHeat, now: 0 }).ok).toBe(true);
    expect(getEquipmentPurchaseAccess({ station, equipment: equipmentById["quantum-reactor"], reputation: friendly, factionHeat, now: 0 }).ok).toBe(false);
    expect(getEquipmentPurchaseAccess({ station, equipment: equipmentById["quantum-reactor"], reputation: allied, factionHeat, now: 0 }).ok).toBe(true);
    expect(getEquipmentPurchaseAccess({ station: stationById["parallax-hermitage"], equipment: equipmentById["parallax-lance"], reputation: neutral, factionHeat, now: 0 }).ok).toBe(true);
    expect(getEquipmentPurchaseAccess({ station, equipment: equipmentById["parallax-lance"], reputation: allied, factionHeat, now: 0 }).ok).toBe(false);

    expect(getShipPurchaseAccess({ station, ship: shipById["horizon-ark"], reputation: friendly, factionHeat, now: 0 }).ok).toBe(false);
    expect(getShipPurchaseAccess({ station, ship: shipById["horizon-ark"], reputation: allied, factionHeat, now: 0 }).ok).toBe(true);
    expect(getShipPurchaseAccess({ station: stationById["meridian-dock"], ship: shipById["horizon-ark"], reputation: allied, factionHeat, now: 0 }).ok).toBe(false);
    expect(getShipPurchaseAccess({ station: stationById["niobe-refinery"], ship: shipById["prospector-rig"], reputation: neutral, factionHeat, now: 0 }).ok).toBe(true);
    expect(getShipPurchaseAccess({ station: stationById["kuro-deep"], ship: shipById["prospector-rig"], reputation: neutral, factionHeat, now: 0 }).ok).toBe(false);
    expect(getShipPurchaseAccess({ station: stationById["black-arcade"], ship: shipById["veil-runner"], reputation: pirateNeutral, factionHeat, now: 0 }).ok).toBe(true);
    expect(getShipPurchaseAccess({ station: stationById["vantara-bastion"], ship: shipById["talon-s"], reputation: neutral, factionHeat, now: 0 }).ok).toBe(false);
    expect(getShipPurchaseAccess({ station: stationById["vantara-bastion"], ship: shipById["talon-s"], reputation: friendly, factionHeat, now: 0 }).ok).toBe(true);
    expect(getShipPurchaseAccess({ station: stationById["hush-array"], ship: shipById["wayfarer-x"], reputation: neutral, factionHeat, now: 0, player: player() }).ok).toBe(false);
    expect(getShipPurchaseAccess({
      station: stationById["hush-array"],
      ship: shipById["wayfarer-x"],
      reputation: neutral,
      factionHeat,
      now: 0,
      player: { ...player(), unlockedBlueprintIds: ["survey-array"] }
    }).ok).toBe(true);

    const passenger = missionTemplates.find((mission) => mission.id === "passenger-helion-celest")!;
    const story = missionTemplates.find((mission) => mission.id === "story-clean-carrier")!;
    expect(getMissionAcceptAccess({ station, mission: passenger, reputation: neutral, factionHeat, now: 0 }).ok).toBe(false);
    expect(getMissionAcceptAccess({ station, mission: passenger, reputation: friendly, factionHeat, now: 0 }).ok).toBe(true);
    expect(getMissionAcceptAccess({ station, mission: story, reputation: { factions: { ...neutral.factions, "solar-directorate": -80 } }, factionHeat, now: 0 }).ok).toBe(true);
  });

  it("applies mission perks only while clear and repair pricing by standing", () => {
    const neutral = createInitialReputation();
    const friendly = { factions: { ...neutral.factions, "solar-directorate": 15 } };
    const allied = { factions: { ...friendly.factions, "solar-directorate": 50 } };
    const hostile = { factions: { ...neutral.factions, "solar-directorate": -10 } };
    const killOnSight = { factions: { ...neutral.factions, "solar-directorate": -40 } };
    const clearHeat = createInitialFactionHeat();
    expect(getFactionRewardMultiplier("solar-directorate", friendly, clearHeat, 0)).toBe(1.1);
    expect(getRepairCostMultiplier("solar-directorate", allied, clearHeat, 0)).toBe(0);
    expect(getRepairCostMultiplier("solar-directorate", friendly, clearHeat, 0)).toBe(0.75);
    expect(getRepairCostMultiplier("solar-directorate", neutral, clearHeat, 0)).toBe(1);
    expect(getRepairCostMultiplier("solar-directorate", hostile, clearHeat, 0)).toBe(1.25);
    expect(getRepairCostMultiplier("solar-directorate", killOnSight, clearHeat, 0)).toBe(1.5);

    const watched = applyFactionIncident({
      factionHeat: clearHeat,
      factionId: "solar-directorate",
      kind: "patrol-hit",
      now: 1
    }).factionHeat;
    expect(getFactionRewardMultiplier("solar-directorate", allied, watched, 2)).toBe(1);
    expect(getRepairCostMultiplier("solar-directorate", allied, watched, 2)).toBe(0);
    expect(getRepairCostMultiplier("solar-directorate", hostile, watched, 2)).toBe(1.25);
  });

  it("brokers black-market amnesty and preserves old save compatibility for intercept cooldowns", () => {
    const station = stationById["black-arcade"];
    const incident = applyFactionIncident({
      factionHeat: createInitialFactionHeat(),
      factionId: "solar-directorate",
      kind: "patrol-destroyed",
      now: 10
    });
    const offer = getBlackMarketAmnestyOffer({ station, targetFactionId: "solar-directorate", factionHeat: incident.factionHeat, now: 11 });
    expect(offer.available).toBe(true);
    expect(offer.costCredits).toBeGreaterThan(500);

    const result = applyBlackMarketAmnesty({
      station,
      targetFactionId: "solar-directorate",
      factionHeat: incident.factionHeat,
      reputation: createInitialReputation(),
      player: player(20000),
      now: 11
    });
    expect(result.ok).toBe(true);
    expect(result.player.credits).toBe(20000 - offer.costCredits);
    expect(getFactionHeatRecord(result.factionHeat, "solar-directorate")).toMatchObject({ fineCredits: 0, heat: 19 });
    expect(getFactionHeatRecord(result.factionHeat, "solar-directorate").wantedUntil).toBeUndefined();
    expect(result.reputation.factions["solar-directorate"]).toBe(7);
    expect(result.reputation.factions["independent-pirates"]).toBe(-19);
    expect(getBlackMarketAmnestyOffer({ station, targetFactionId: "unknown-drones", factionHeat: incident.factionHeat, now: 11 }).available).toBe(false);

    const normalized = normalizeFactionHeat({
      factions: {
        "solar-directorate": { heat: 0, fineCredits: 0, offenseCount: 0, interceptCooldownUntil: 30 }
      }
    });
    expect(getFactionHeatRecord(normalized, "solar-directorate").interceptCooldownUntil).toBe(30);
    const decayed = applyFactionHeatDecay(normalized, 1, 31);
    expect(decayed.factions["solar-directorate"]).toBeUndefined();
  });
});
