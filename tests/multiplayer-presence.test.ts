import { describe, expect, it } from "vitest";
import { getMultiplayerPresence } from "../src/systems/multiplayerPresence";
import type { MultiplayerSession, RemotePlayerSnapshot } from "../src/types/multiplayer";

const session: MultiplayerSession = {
  token: "token",
  playerId: "self",
  username: "self",
  displayName: "Self",
  serverUrl: "/api/multiplayer"
};

function remote(overrides: Partial<RemotePlayerSnapshot>): RemotePlayerSnapshot {
  return {
    playerId: "remote",
    username: "remote",
    displayName: "Remote",
    shipId: "sparrow-mk1",
    currentSystemId: "helion-reach",
    position: [0, 0, 0],
    velocity: [0, 0, 0],
    rotation: [0, 0, 0],
    hull: 100,
    shield: 100,
    updatedAt: 1,
    ...overrides
  };
}

describe("multiplayer presence", () => {
  it("classifies remote players by system, flight visibility, and docked station", () => {
    const presence = getMultiplayerPresence(session, [
      remote({ playerId: "flight", currentStationId: undefined }),
      remote({ playerId: "docked-here", currentStationId: "helion-prime" }),
      remote({ playerId: "docked-there", currentStationId: "helion-exchange" }),
      remote({ playerId: "other-system", currentSystemId: "ptd-home", currentStationId: undefined })
    ], "helion-reach", "helion-prime");

    expect(presence.online).toBe(true);
    expect(presence.systemPlayers.map((player) => player.playerId)).toEqual(["flight", "docked-here", "docked-there"]);
    expect(presence.visibleFlightPlayers.map((player) => player.playerId)).toEqual(["flight"]);
    expect(presence.stationPlayers.map((player) => player.playerId)).toEqual(["docked-here"]);
  });

  it("returns empty presence when there is no online session", () => {
    const presence = getMultiplayerPresence(undefined, [
      remote({ playerId: "flight", currentStationId: undefined })
    ], "helion-reach");

    expect(presence.online).toBe(false);
    expect(presence.systemPlayers).toEqual([]);
    expect(presence.visibleFlightPlayers).toEqual([]);
    expect(presence.stationPlayers).toEqual([]);
  });
});
