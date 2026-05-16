import type {
  EquipmentId,
  MissionDefinition,
  PlayerState,
  SaveGameData,
  Vec3
} from "./game";

export type MultiplayerConnectionStatus = "offline" | "connecting" | "connected" | "error";

export interface MultiplayerSession {
  token: string;
  playerId: string;
  username: string;
  displayName: string;
  serverUrl: string;
}

export interface MultiplayerPlayerProfile extends Omit<SaveGameData, "version" | "savedAt"> {
  playerId: string;
  username: string;
  displayName: string;
  updatedAt: string;
}

export interface MultiplayerAuthRequest {
  username: string;
  password: string;
  displayName?: string;
}

export interface MultiplayerAuthResponse {
  ok: boolean;
  message: string;
  session?: MultiplayerSession;
  profile?: MultiplayerPlayerProfile;
}

export interface MultiplayerProfileResponse {
  ok: boolean;
  message: string;
  profile?: MultiplayerPlayerProfile;
}

export interface RemotePlayerSnapshot {
  playerId: string;
  username: string;
  displayName: string;
  shipId: string;
  currentSystemId: string;
  currentStationId?: string;
  position: Vec3;
  velocity: Vec3;
  rotation: Vec3;
  hull: number;
  shield: number;
  updatedAt: number;
}

export type MultiplayerTradeStatus = "pending" | "confirmed" | "completed" | "canceled";

export type MultiplayerTradeOffer = {
  credits: number;
  equipment: Partial<Record<EquipmentId, number>>;
};

export interface TradeSession {
  id: string;
  stationId: string;
  playerIds: [string, string];
  offers: Record<string, MultiplayerTradeOffer>;
  confirmedBy: string[];
  status: MultiplayerTradeStatus;
  message?: string;
  createdAt: number;
  updatedAt: number;
}

export type CoopMissionStatus = "pending" | "active" | "completed" | "canceled";

export interface CoopMissionSession {
  id: string;
  missionInstanceId: string;
  missionId: string;
  stationId: string;
  hostPlayerId: string;
  guestPlayerId: string;
  mission: MissionDefinition;
  status: CoopMissionStatus;
  collaboratorRewardCredits: number;
  createdAt: number;
  updatedAt: number;
  message?: string;
}

export interface MultiplayerSnapshotResponse {
  ok: boolean;
  message: string;
  remotePlayers: RemotePlayerSnapshot[];
  tradeSessions: TradeSession[];
  coopMissionSessions: CoopMissionSession[];
}

export type MultiplayerClientEvent =
  | { type: "player-snapshot"; snapshot: RemotePlayerSnapshot }
  | { type: "profile"; profile: MultiplayerStoreProfile };

export type MultiplayerServerEvent =
  | { type: "session"; session: MultiplayerSession; profile: MultiplayerPlayerProfile }
  | { type: "remote-players"; players: RemotePlayerSnapshot[] }
  | { type: "remote-player"; player: RemotePlayerSnapshot }
  | { type: "remote-player-left"; playerId: string }
  | { type: "trade-updated"; trade: TradeSession }
  | { type: "coop-updated"; session: CoopMissionSession }
  | { type: "profile-updated"; profile: MultiplayerPlayerProfile }
  | { type: "error"; message: string };

export interface MultiplayerStoreProfile {
  player: PlayerState;
  currentSystemId: string;
  currentStationId?: string;
  gameClock: number;
  activeMissions: MissionDefinition[];
  completedMissionIds: string[];
  failedMissionIds: string[];
  marketState: SaveGameData["marketState"];
  reputation: SaveGameData["reputation"];
  factionHeat: SaveGameData["factionHeat"];
  knownSystems: string[];
  knownPlanetIds: string[];
  explorationState: SaveGameData["explorationState"];
  dialogueState: SaveGameData["dialogueState"];
  onboardingState?: SaveGameData["onboardingState"];
  screen?: SaveGameData["screen"];
}
