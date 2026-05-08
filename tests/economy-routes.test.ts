import { describe, expect, it } from "vitest";
import type { EconomyNpcEntity } from "../src/types/economy";
import { getEconomyEventSystemName, getEconomyFlightRouteSummary, getEconomyNpcRouteSummary } from "../src/systems/economyRoutes";

function npc(patch: Partial<EconomyNpcEntity>): EconomyNpcEntity {
  return {
    id: "econ-test",
    name: "Route Tester",
    serial: "HR-TR-01",
    role: "trader",
    factionId: "free-belt-union",
    systemId: "helion-reach",
    homeStationId: "helion-prime",
    riskPreference: "balanced",
    lineageId: "econ-test",
    generation: 0,
    position: [0, 0, 0],
    velocity: [0, 0, 0],
    hull: 80,
    shield: 40,
    maxHull: 80,
    maxShield: 40,
    cargoCapacity: 20,
    cargo: {},
    credits: 5000,
    ledger: { revenue: 0, expenses: 0, losses: 0, completedContracts: 0, failedContracts: 0, minedUnits: 0 },
    task: { kind: "idle", originStationId: "helion-prime", startedAt: 0 },
    statusLabel: "IDLE",
    lastTradeAt: 0,
    ...patch
  };
}

describe("economy NPC route summaries", () => {
  it("describes mining, buying, hauling, selling, and returning tasks", () => {
    expect(getEconomyNpcRouteSummary(npc({
      role: "miner",
      task: { kind: "mining", asteroidId: "asteroid-1", commodityId: "iron", originStationId: "kuro-deep", progress: 0.4, startedAt: 0 },
      statusLabel: "MINING · Iron"
    }))).toMatchObject({ taskKind: "mining", targetKind: "asteroid", routeLabel: "Mining Iron" });

    expect(getEconomyNpcRouteSummary(npc({
      task: { kind: "buying", commodityId: "basic-food", originStationId: "helion-prime", destinationStationId: "mirr-lattice", startedAt: 0 },
      statusLabel: "BUYING · Basic Food"
    }))).toMatchObject({ taskKind: "buying", targetKind: "station", targetName: "Helion Prime Exchange" });

    expect(getEconomyNpcRouteSummary(npc({
      systemId: "__transit__",
      cargo: { "basic-food": 4 },
      task: { kind: "hauling", commodityId: "basic-food", originStationId: "helion-prime", destinationStationId: "mirr-lattice", progress: 0.5, startedAt: 0 },
      statusLabel: "HAULING · Basic Food"
    }))).toMatchObject({ taskKind: "hauling", targetKind: "transit", targetName: "Mirr Lattice" });

    expect(getEconomyNpcRouteSummary(npc({
      cargo: { iron: 3 },
      task: { kind: "selling", commodityId: "iron", destinationStationId: "helion-prime", startedAt: 0 },
      statusLabel: "SELLING · Iron"
    }))).toMatchObject({ taskKind: "selling", targetKind: "station", cargoUnits: 3 });

    expect(getEconomyNpcRouteSummary(npc({
      cargo: { iron: 6 },
      task: { kind: "returning", commodityId: "iron", destinationStationId: "kuro-deep", startedAt: 0 },
      statusLabel: "RETURNING · 6/20"
    }))).toMatchObject({ taskKind: "returning", routeLabel: "Returning", targetName: "Kuro Deepworks" });
  });

  it("describes idle station holding and depleted belts for station economy rows", () => {
    expect(getEconomyFlightRouteSummary({
      economyTaskKind: "idle",
      economyTargetId: "cinder-yard",
      economyStatus: "IDLE · Belt depleted"
    }, [], "helion-reach")).toMatchObject({
      targetLabel: "Holding near Cinder Yard",
      detailLabels: ["Belt depleted"]
    });
  });

  it("labels global economy events by source system", () => {
    expect(getEconomyEventSystemName({ systemId: "mirr-vale" })).toBe("Mirr Vale");
    expect(getEconomyEventSystemName({ systemId: undefined })).toBe("Unknown system");
  });
});
