import { describe, expect, it } from "vitest";
import type { ConvoyEntity, FlightEntity } from "../src/types/game";
import {
  advanceConvoyEntity,
  createPatrolSupportRequest,
  getActiveCivilianDistress,
  resolveCivilianDistress
} from "../src/state/domains/combatRuntime";
import { createShipEntity } from "../src/state/domains/runtimeFactory";

function convoy(patch: Partial<ConvoyEntity> = {}): ConvoyEntity {
  return {
    id: "convoy-test",
    missionId: "mission-test",
    name: "Test Tender",
    factionId: "free-belt-union",
    position: [0, 0, 0],
    velocity: [0, 0, 0],
    hull: 120,
    maxHull: 120,
    shield: 45,
    maxShield: 45,
    lastDamageAt: -999,
    fireCooldown: -1,
    convoyRole: "mission-tender",
    status: "en-route",
    destinationStationId: "helion-prime",
    destinationPosition: [0, 0, -760],
    arrived: false,
    ...patch
  };
}

function pirate(patch: Partial<FlightEntity> = {}): FlightEntity {
  return {
    ...createShipEntity("pirate-test", "pirate", [70, 0, 0], "ashen-drift"),
    aiState: "attack",
    aiTargetId: "player",
    ...patch
  };
}

describe("combat runtime domain helpers", () => {
  it("moves attacked convoys into distress and requests defensive fire", () => {
    const result = advanceConvoyEntity(convoy(), [pirate()], 0.1, 12);

    expect(result.convoy.status).toBe("distress");
    expect(result.convoy.threatId).toBe("pirate-test");
    expect(result.convoy.distressCalledAt).toBe(12);
    expect(result.fire).toMatchObject({
      targetId: "pirate-test",
      damage: 8
    });
  });

  it("creates patrol support with cooldown instead of open-ended spawning", () => {
    const patrol = {
      ...createShipEntity("patrol-test", "patrol", [0, 0, 0], "ashen-drift"),
      aiState: "attack",
      aiTargetId: "pirate-test"
    } satisfies FlightEntity;
    const threat = pirate({ id: "pirate-test", position: [120, 0, 0] });

    const request = createPatrolSupportRequest({
      ship: patrol,
      enemies: [threat],
      convoys: [],
      systemId: "ashen-drift",
      risk: 0.7,
      playerPosition: [0, 0, 0],
      now: 100,
      existingSpawnCount: 0
    });

    expect(request?.ships).toHaveLength(2);
    expect(request?.ships.every((ship) => ship.supportWing && ship.loadoutId === "directorate-support")).toBe(true);
    expect(request?.requestedShip.supportCooldownUntil).toBeGreaterThan(100);

    const repeated = createPatrolSupportRequest({
      ship: request!.requestedShip,
      enemies: [threat, ...request!.ships],
      convoys: [],
      systemId: "ashen-drift",
      risk: 0.7,
      playerPosition: [0, 0, 0],
      now: 101,
      existingSpawnCount: 0
    });
    expect(repeated).toBeUndefined();
  });

  it("marks civilian distress from a direct pirate target and clears it after timeout", () => {
    const freighter = createShipEntity("freighter-test", "freighter", [0, 0, 0], "ashen-drift");
    const threat = pirate({ id: "pirate-test", aiTargetId: "freighter-test", position: [70, 0, 0] });

    const distressed = resolveCivilianDistress(freighter, [freighter, threat], 12);

    expect(distressed.distressThreatId).toBe("pirate-test");
    expect(distressed.distressCalledAt).toBe(12);
    expect(getActiveCivilianDistress([distressed, threat], 12)[0]).toMatchObject({
      civilian: { id: "freighter-test" },
      threat: { id: "pirate-test" }
    });

    const cleared = resolveCivilianDistress(distressed, [distressed, pirate({ id: "pirate-test", aiTargetId: "player", position: [900, 0, 0] })], 31);
    expect(cleared.distressThreatId).toBeUndefined();
    expect(cleared.distressCalledAt).toBeUndefined();
  });

  it("lets patrol support respond to civilian distress without bypassing cooldown limits", () => {
    const patrol = createShipEntity("patrol-test", "patrol", [0, 0, 0], "ashen-drift");
    const civilian = {
      ...createShipEntity("miner-test", "miner", [80, 0, 0], "ashen-drift"),
      distressThreatId: "pirate-test",
      distressCalledAt: 100
    } satisfies FlightEntity;
    const threat = pirate({ id: "pirate-test", aiTargetId: "miner-test", position: [120, 0, 0] });

    const request = createPatrolSupportRequest({
      ship: patrol,
      enemies: [patrol, civilian, threat],
      convoys: [],
      systemId: "ashen-drift",
      risk: 0.2,
      playerPosition: [0, 0, 0],
      now: 105,
      existingSpawnCount: 0
    });

    expect(request?.message).toBe("Patrol support wing responding to distress.");
    expect(request?.ships).toHaveLength(2);
    expect(request?.ships.every((ship) => ship.aiTargetId === "pirate-test")).toBe(true);

    const repeated = createPatrolSupportRequest({
      ship: request!.requestedShip,
      enemies: [patrol, civilian, threat, ...request!.ships],
      convoys: [],
      systemId: "ashen-drift",
      risk: 0.2,
      playerPosition: [0, 0, 0],
      now: 106,
      existingSpawnCount: 0
    });
    expect(repeated).toBeUndefined();
  });
});
