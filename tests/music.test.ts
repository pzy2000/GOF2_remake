import { describe, expect, it } from "vitest";
import { stationById } from "../src/data/world";
import { fallbackAssetManifest } from "../src/systems/assets";
import { resolveMusicCue } from "../src/systems/music";
import type { PlayerState, RuntimeState, Screen } from "../src/types/game";

const player = {
  position: [0, 0, 120],
  lastDamageAt: -999
} as PlayerState;

const baseRuntime = {
  clock: 0,
  enemies: [
    {
      role: "pirate",
      hull: 70,
      position: [0, 0, -620]
    }
  ],
  projectiles: []
} as unknown as RuntimeState;

function resolveCurrentCue({
  screen = "flight",
  currentSystemId = "helion-reach",
  currentStationId,
  runtime = baseRuntime
}: {
  screen?: Screen;
  currentSystemId?: string;
  currentStationId?: string;
  runtime?: RuntimeState;
} = {}) {
  return resolveMusicCue({
    screen,
    currentSystemId,
    currentStation: currentStationId ? stationById[currentStationId] : undefined,
    runtime,
    player,
    assetManifest: fallbackAssetManifest
  });
}

describe("music cue routing", () => {
  it("uses the current system theme in flight even when distant pirates exist", () => {
    const cue = resolveCurrentCue();

    expect(cue.id).toBe("system:helion-reach");
    expect(cue.mode).toBe("safe");
    expect(cue.trackUrl).toBe("/assets/music/magic-space.mp3");
  });

  it("changes system music after jumping to another system", () => {
    const cue = resolveCurrentCue({ currentSystemId: "kuro-belt" });

    expect(cue.id).toBe("system:kuro-belt");
    expect(cue.trackUrl).toBe("/assets/music/pynchon.mp3");
  });

  it("uses combat music only for close threats or active enemy fire", () => {
    const cue = resolveCurrentCue({
      runtime: {
        ...baseRuntime,
        enemies: baseRuntime.enemies.map((ship) => ({ ...ship, position: player.position }))
      } as unknown as RuntimeState
    });

    expect(cue.id).toBe("combat");
    expect(cue.mode).toBe("combat");
    expect(cue.trackUrl).toBe("/assets/music/infestation-control-room.mp3");
  });

  it("uses station archetype music while docked", () => {
    const cue = resolveCurrentCue({ screen: "station", currentSystemId: "kuro-belt", currentStationId: "kuro-deep" });

    expect(cue.id).toBe("station:Mining Station");
    expect(cue.mode).toBe("station");
    expect(cue.trackUrl).toBe("/assets/music/pynchon.mp3");
  });
});
