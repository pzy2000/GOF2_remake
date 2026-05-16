import type { MultiplayerSession, RemotePlayerSnapshot } from "../types/multiplayer";

export interface MultiplayerPresence {
  online: boolean;
  systemPlayers: RemotePlayerSnapshot[];
  visibleFlightPlayers: RemotePlayerSnapshot[];
  stationPlayers: RemotePlayerSnapshot[];
}

export function getMultiplayerPresence(
  session: MultiplayerSession | undefined,
  remotePlayers: RemotePlayerSnapshot[],
  currentSystemId: string,
  currentStationId?: string
): MultiplayerPresence {
  if (!session) {
    return {
      online: false,
      systemPlayers: [],
      visibleFlightPlayers: [],
      stationPlayers: []
    };
  }
  const systemPlayers = remotePlayers.filter((remote) => remote.currentSystemId === currentSystemId);
  return {
    online: true,
    systemPlayers,
    visibleFlightPlayers: systemPlayers.filter((remote) => !remote.currentStationId),
    stationPlayers: currentStationId
      ? systemPlayers.filter((remote) => remote.currentStationId === currentStationId)
      : []
  };
}
