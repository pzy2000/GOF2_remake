import { describe, expect, it } from "vitest";
import { npcRoleIdentityProfiles, stationArchetypeIdentityProfiles } from "../src/systems/sceneIdentity";
import type { FlightEntityRole, StationArchetype } from "../src/types/game";

const stationArchetypes: StationArchetype[] = ["Trade Hub", "Mining Station", "Research Station", "Military Outpost", "Frontier Port", "Pirate Black Market"];
const npcRoles: FlightEntityRole[] = ["pirate", "patrol", "trader", "freighter", "courier", "miner", "smuggler", "drone", "relay"];

describe("scene identity profiles", () => {
  it("gives every station archetype a unique readable silhouette", () => {
    const signatures = stationArchetypes.map((archetype) => stationArchetypeIdentityProfiles[archetype].signature);

    expect(new Set(signatures).size).toBe(stationArchetypes.length);
    for (const archetype of stationArchetypes) {
      const profile = stationArchetypeIdentityProfiles[archetype];
      expect(profile.core.every((value) => value > 0)).toBe(true);
      expect(profile.ringRadius).toBeGreaterThan(profile.core[1]);
      expect(profile.spokeCount).toBeGreaterThanOrEqual(3);
      expect(profile.dockBayCount).toBeGreaterThanOrEqual(2);
      expect(profile.dockBayLength).toBeGreaterThan(50);
    }
  });

  it("preserves role-level NPC ship recognition beyond color alone", () => {
    const signatures = npcRoles.map((role) => npcRoleIdentityProfiles[role].signature);

    expect(new Set(signatures).size).toBe(npcRoles.length);
    for (const role of npcRoles) {
      const profile = npcRoleIdentityProfiles[role];
      expect(profile.hullColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(profile.tailColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(profile.glowColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(profile.engineColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(profile.cone.every((value) => value > 0)).toBe(true);
      expect(profile.wing.every((value) => value > 0)).toBe(true);
      expect(profile.dorsalScale.every((value) => value > 0)).toBe(true);
    }

    expect(npcRoleIdentityProfiles.courier.wing[0]).toBeGreaterThan(npcRoleIdentityProfiles.patrol.wing[0]);
    expect(npcRoleIdentityProfiles.miner.cargoPods).toBeGreaterThan(0);
    expect(npcRoleIdentityProfiles.pirate.bladeFins).toBeGreaterThan(npcRoleIdentityProfiles.trader.bladeFins);
    expect(npcRoleIdentityProfiles.trader.cargoPods).toBeGreaterThan(npcRoleIdentityProfiles.courier.cargoPods);
  });
});
