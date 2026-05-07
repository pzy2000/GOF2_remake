import { describe, expect, it } from "vitest";
import { explorationSignalById, planetById, stationById } from "../src/data/world";
import { getJumpGatePosition } from "../src/systems/autopilot";
import { createInitialExplorationState } from "../src/systems/exploration";
import {
  discoverNearbyPlanets,
  getInitialKnownPlanetIds,
  getInitialKnownSystems,
  getNavigationHintText,
  getNavigationTargetCue,
  getNearestNavigationTarget,
  PLANET_SCAN_RANGE,
  revealNeighborSystems,
  STARGATE_INTERACTION_RANGE
} from "../src/systems/navigation";

describe("navigation targets and discovery", () => {
  it("prefers the Stargate when it is closer than the station", () => {
    const gate = getJumpGatePosition("kuro-belt");
    const target = getNearestNavigationTarget("kuro-belt", gate);
    expect(target?.kind).toBe("stargate");
    expect(target?.name).toBe("Stargate");
    expect(target?.inRange).toBe(true);
  });

  it("prefers the nearest station when the ship is closer to it", () => {
    const station = stationById["kuro-deep"];
    const target = getNearestNavigationTarget("kuro-belt", station.position, ["kuro-anvil"]);
    expect(target?.kind).toBe("station");
    expect(target?.name).toBe("Kuro Deepworks");
    expect(target?.inRange).toBe(true);
  });

  it("shows undiscovered planet stations as scannable unknown beacons", () => {
    const planet = planetById["lode-minor"];
    const target = getNearestNavigationTarget("kuro-belt", planet.beaconPosition, ["kuro-anvil"]);
    expect(target?.kind).toBe("planet-signal");
    expect(target?.name).toBe("Unknown Beacon");
    expect(target?.inRange).toBe(true);
  });

  it("tracks Stargate interaction range", () => {
    const gate = getJumpGatePosition("helion-reach");
    const target = getNearestNavigationTarget("helion-reach", [gate[0] + STARGATE_INTERACTION_RANGE + 8, gate[1], gate[2]]);
    expect(target?.kind).toBe("stargate");
    expect(target?.inRange).toBe(false);
  });

  it("builds readable cue copy for in-range local POIs", () => {
    const station = stationById["kuro-deep"];
    const stationTarget = getNearestNavigationTarget("kuro-belt", station.position, ["kuro-anvil"]);
    expect(getNavigationTargetCue(stationTarget)).toMatchObject({
      actionLabel: "E Dock",
      label: "Kuro Deepworks",
      tone: "station",
      inRange: true
    });
    expect(getNavigationHintText(stationTarget)).toBe("E Dock: Kuro Deepworks");

    const gate = getJumpGatePosition("helion-reach");
    const gateTarget = getNearestNavigationTarget("helion-reach", gate, ["helion-prime-world"]);
    expect(getNavigationTargetCue(gateTarget)).toMatchObject({
      actionLabel: "E Activate",
      label: "Stargate",
      tone: "gate",
      inRange: true
    });
  });

  it("uses signal-specific cue copy outside interaction range", () => {
    const planet = planetById["lode-minor"];
    const beaconTarget = getNearestNavigationTarget("kuro-belt", [planet.beaconPosition[0] + PLANET_SCAN_RANGE + 20, planet.beaconPosition[1], planet.beaconPosition[2]], ["kuro-anvil"]);
    expect(getNavigationTargetCue(beaconTarget)).toMatchObject({
      actionLabel: "Beacon",
      label: "Unknown Beacon",
      tone: "unknown",
      inRange: false
    });
    expect(getNavigationHintText(beaconTarget)).toContain("Unknown Beacon");

    const signal = explorationSignalById["quiet-signal-sundog-lattice"];
    const signalTarget = {
      kind: "exploration-signal" as const,
      id: signal.id,
      name: signal.maskedTitle,
      signal,
      position: signal.position,
      distance: 330,
      inRange: false
    };
    expect(getNavigationTargetCue(signalTarget)).toMatchObject({
      actionLabel: "Signal",
      label: signal.maskedTitle,
      tone: "exploration",
      inRange: false
    });
  });

  it("hides locked exploration stages from local navigation until their prerequisite is complete", () => {
    const followUp = explorationSignalById["quiet-signal-meridian-afterimage"];
    const lockedTarget = getNearestNavigationTarget("helion-reach", followUp.position, ["helion-prime-world"], {
      explorationState: createInitialExplorationState()
    });
    expect(lockedTarget?.id).not.toBe(followUp.id);

    const unlockedTarget = getNearestNavigationTarget("helion-reach", followUp.position, ["helion-prime-world"], {
      explorationState: {
        ...createInitialExplorationState(),
        completedSignalIds: ["quiet-signal-sundog-lattice"]
      }
    });
    expect(unlockedTarget?.kind).toBe("exploration-signal");
    expect(unlockedTarget?.id).toBe(followUp.id);
  });

  it("starts with the current system and nearby systems known", () => {
    expect(getInitialKnownSystems("helion-reach")).toEqual(["helion-reach", "kuro-belt", "vantara", "mirr-vale", "ptd-home"]);
  });

  it("unlocks only the primary planet for each known system by default", () => {
    expect(getInitialKnownPlanetIds(["helion-reach", "kuro-belt", "vantara", "mirr-vale"])).toEqual([
      "helion-prime-world",
      "kuro-anvil",
      "vantara-command",
      "mirr-glass"
    ]);
  });

  it("reveals nearby systems after arriving through a gate", () => {
    expect(revealNeighborSystems(["helion-reach", "kuro-belt"], "kuro-belt")).toContain("ashen-drift");
  });

  it("discovers unknown planets when the ship flies into scan range", () => {
    const planet = planetById["lode-minor"];
    const known = discoverNearbyPlanets("kuro-belt", [planet.beaconPosition[0] + PLANET_SCAN_RANGE - 5, planet.beaconPosition[1], planet.beaconPosition[2]], [
      "kuro-anvil"
    ]);
    expect(known.discovered.map((item) => item.id)).toEqual(["lode-minor"]);
    expect(known.knownPlanetIds).toContain("lode-minor");
  });

  it("shows incomplete exploration signals as navigation targets", () => {
    const signal = explorationSignalById["quiet-signal-sundog-lattice"];
    const target = getNearestNavigationTarget("helion-reach", signal.position, ["helion-prime-world"], {
      explorationState: createInitialExplorationState()
    });
    expect(target?.kind).toBe("exploration-signal");
    expect(target?.name).toBe(signal.maskedTitle);
    expect(target?.inRange).toBe(true);
  });

  it("does not target completed exploration signals", () => {
    const signal = explorationSignalById["quiet-signal-sundog-lattice"];
    const target = getNearestNavigationTarget("helion-reach", signal.position, ["helion-prime-world"], {
      explorationState: {
        ...createInitialExplorationState(),
        completedSignalIds: [signal.id]
      }
    });
    expect(target?.kind).not.toBe("exploration-signal");
  });

  it("allows revealed hidden stations to become navigation targets", () => {
    const station = stationById["parallax-hermitage"];
    const target = getNearestNavigationTarget("mirr-vale", station.position, ["mirr-glass", "hush-orbit"], {
      explorationState: {
        ...createInitialExplorationState(),
        revealedStationIds: [station.id]
      }
    });
    expect(target?.kind).toBe("station");
    expect(target?.name).toBe("Parallax Hermitage");
    expect(target?.inRange).toBe(true);
  });
});
