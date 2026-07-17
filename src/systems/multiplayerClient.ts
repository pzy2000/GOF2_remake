import type {
  CoopMissionSession,
  MultiplayerAuthRequest,
  MultiplayerAuthResponse,
  MultiplayerClientEvent,
  MultiplayerNetworkMode,
  MultiplayerPeerInfo,
  MultiplayerPeerSignal,
  MultiplayerPlayerProfile,
  MultiplayerProfileResponse,
  MultiplayerServerEvent,
  MultiplayerSession,
  MultiplayerSettings,
  MultiplayerSnapshotResponse,
  MultiplayerStoreProfile,
  MultiplayerTradeOffer,
  RemotePlayerSnapshot,
  TradeSession
} from "../types/multiplayer";

const STATIC_MULTIPLAYER_REASON = "Multiplayer server disabled for static build.";
const HTTPS_HTTP_BLOCK_REASON = "Multiplayer disabled: HTTPS pages cannot call an HTTP multiplayer server.";
const DEFAULT_LOCAL_MULTIPLAYER_PORT = 19778;
const REQUEST_TIMEOUT_MS = import.meta.env.DEV ? 5_000 : 1_800;
const MULTIPLAYER_SESSION_STORAGE_KEY = "gof2-multiplayer-session";
export const MULTIPLAYER_SETTINGS_KEY = "gof2-by-pzy-multiplayer-settings";

const DEFAULT_MULTIPLAYER_SETTINGS: MultiplayerSettings = {
  networkMode: "client-server"
};

const DEFAULT_P2P_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:global.stun.twilio.com:3478" }
];

export const multiplayerNetworkModeLabels: Record<MultiplayerNetworkMode, string> = {
  "client-server": "Client/server",
  "peer-to-peer": "P2P movement"
};

export interface MultiplayerServiceConfigInput {
  envUrl?: string;
  production: boolean;
  pageProtocol?: string;
  pageHostname?: string;
  staticDisabled?: boolean;
}

export interface MultiplayerServiceConfig {
  enabled: boolean;
  requestBaseUrl: string;
  displayUrl: string;
  disabledReason?: string;
}

function normalizeConfiguredUrl(url: string): string {
  return url.trim().replace(/\/$/, "");
}

function storage(): Storage | undefined {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}

function isMultiplayerNetworkMode(value: unknown): value is MultiplayerNetworkMode {
  return value === "client-server" || value === "peer-to-peer";
}

export function getMultiplayerSettings(store: Storage | undefined = storage()): MultiplayerSettings {
  const raw = store?.getItem(MULTIPLAYER_SETTINGS_KEY);
  if (!raw) return DEFAULT_MULTIPLAYER_SETTINGS;
  try {
    const parsed = JSON.parse(raw) as Partial<MultiplayerSettings>;
    return {
      networkMode: isMultiplayerNetworkMode(parsed.networkMode)
        ? parsed.networkMode
        : DEFAULT_MULTIPLAYER_SETTINGS.networkMode
    };
  } catch {
    return DEFAULT_MULTIPLAYER_SETTINGS;
  }
}

export function saveMultiplayerNetworkMode(
  networkMode: MultiplayerNetworkMode,
  store: Storage | undefined = storage()
): MultiplayerSettings {
  const next: MultiplayerSettings = {
    networkMode: isMultiplayerNetworkMode(networkMode) ? networkMode : DEFAULT_MULTIPLAYER_SETTINGS.networkMode
  };
  store?.setItem(MULTIPLAYER_SETTINGS_KEY, JSON.stringify(next));
  return next;
}

function normalizeIceServer(value: unknown): RTCIceServer | undefined {
  if (typeof value === "string" && value.trim()) return { urls: value.trim() };
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<RTCIceServer>;
  if (typeof candidate.urls === "string" || Array.isArray(candidate.urls)) return candidate as RTCIceServer;
  return undefined;
}

function configuredIceServers(): RTCIceServer[] {
  let raw = import.meta.env.VITE_MULTIPLAYER_ICE_SERVERS as string | undefined;
  if (import.meta.env.DEV && typeof window !== "undefined") {
    raw = window.localStorage.getItem("gof2-e2e-multiplayer-ice-servers") ?? raw;
  }
  if (!raw?.trim()) return DEFAULT_P2P_ICE_SERVERS;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map(normalizeIceServer).filter((server): server is RTCIceServer => !!server);
    }
    const server = normalizeIceServer(parsed);
    return server ? [server] : DEFAULT_P2P_ICE_SERVERS;
  } catch {
    const servers = raw.split(",").map((entry) => normalizeIceServer(entry)).filter((server): server is RTCIceServer => !!server);
    return servers.length > 0 ? servers : DEFAULT_P2P_ICE_SERVERS;
  }
}

export function resolveMultiplayerServiceConfig({
  envUrl,
  production,
  pageProtocol,
  pageHostname,
  staticDisabled = false
}: MultiplayerServiceConfigInput): MultiplayerServiceConfig {
  if (staticDisabled) {
    return {
      enabled: false,
      requestBaseUrl: "",
      displayUrl: "multiplayer disabled",
      disabledReason: STATIC_MULTIPLAYER_REASON
    };
  }
  const configuredUrl = envUrl?.trim() ? normalizeConfiguredUrl(envUrl) : undefined;
  if (configuredUrl) {
    if (pageProtocol === "https:" && configuredUrl.startsWith("http:")) {
      return {
        enabled: false,
        requestBaseUrl: "",
        displayUrl: "multiplayer disabled",
        disabledReason: HTTPS_HTTP_BLOCK_REASON
      };
    }
    return {
      enabled: true,
      requestBaseUrl: configuredUrl,
      displayUrl: configuredUrl
    };
  }
  if (production && pageProtocol === "https:") {
    return {
      enabled: false,
      requestBaseUrl: "",
      displayUrl: "multiplayer disabled",
      disabledReason: STATIC_MULTIPLAYER_REASON
    };
  }
  if (production) {
    const localHost = pageHostname?.trim() || "127.0.0.1";
    const localUrl = `http://${localHost}:${DEFAULT_LOCAL_MULTIPLAYER_PORT}`;
    return {
      enabled: true,
      requestBaseUrl: localUrl,
      displayUrl: localUrl
    };
  }
  return {
    enabled: true,
    requestBaseUrl: "",
    displayUrl: "/api/multiplayer"
  };
}

export const MULTIPLAYER_SERVICE_CONFIG = resolveMultiplayerServiceConfig({
  envUrl: (import.meta.env.VITE_MULTIPLAYER_API_URL as string | undefined) || devMultiplayerApiUrl(),
  production: import.meta.env.PROD,
  pageProtocol: typeof window === "undefined" ? undefined : window.location.protocol,
  pageHostname: typeof window === "undefined" ? undefined : window.location.hostname,
  staticDisabled: import.meta.env.VITE_MULTIPLAYER_STATIC_DISABLED === "true"
});

export class MultiplayerRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "MultiplayerRequestError";
    this.status = status;
  }
}

function multiplayerDisabledError(): MultiplayerRequestError {
  return new MultiplayerRequestError(MULTIPLAYER_SERVICE_CONFIG.disabledReason ?? "Multiplayer server offline.", 0);
}

function requestUrl(path: string): string {
  return `${MULTIPLAYER_SERVICE_CONFIG.requestBaseUrl}${path}`;
}

function socketUrl(path: string): string {
  const base = MULTIPLAYER_SERVICE_CONFIG.requestBaseUrl;
  if (base.startsWith("https://")) return `${base.replace(/^https:\/\//, "wss://")}${path}`;
  if (base.startsWith("http://")) return `${base.replace(/^http:\/\//, "ws://")}${path}`;
  const origin = typeof window === "undefined" ? "ws://127.0.0.1" : window.location.origin.replace(/^http/, "ws");
  return `${origin}${path}`;
}

function devMultiplayerApiUrl(): string | undefined {
  if (!import.meta.env.DEV || typeof window === "undefined") return undefined;
  try {
    return window.localStorage.getItem("gof2-e2e-multiplayer-api-url") ?? undefined;
  } catch {
    return undefined;
  }
}

async function requestJson<T>(path: string, init?: RequestInit & { token?: string }): Promise<T> {
  if (!MULTIPLAYER_SERVICE_CONFIG.enabled) throw multiplayerDisabledError();
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(requestUrl(path), {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(init?.token ? { Authorization: `Bearer ${init.token}` } : {}),
        ...(init?.headers ?? {})
      }
    });
    const data = await response.json() as T & { message?: string };
    if (!response.ok) {
      throw new MultiplayerRequestError(data.message ?? "Multiplayer request failed.", response.status);
    }
    return data as T;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

export function isMultiplayerServiceEnabled(): boolean {
  return MULTIPLAYER_SERVICE_CONFIG.enabled;
}

export function multiplayerDisplayUrl(): string {
  return MULTIPLAYER_SERVICE_CONFIG.displayUrl;
}

export function saveMultiplayerSession(session: MultiplayerSession | undefined): void {
  if (typeof localStorage === "undefined") return;
  if (!session) {
    localStorage.removeItem(MULTIPLAYER_SESSION_STORAGE_KEY);
    return;
  }
  localStorage.setItem(MULTIPLAYER_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function readMultiplayerSession(): MultiplayerSession | undefined {
  if (typeof localStorage === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(MULTIPLAYER_SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) as MultiplayerSession : undefined;
  } catch {
    return undefined;
  }
}

export async function registerMultiplayerAccount(request: MultiplayerAuthRequest): Promise<MultiplayerAuthResponse> {
  const response = await requestJson<MultiplayerAuthResponse>("/api/multiplayer/register", {
    method: "POST",
    body: JSON.stringify(request)
  });
  saveMultiplayerSession(response.session);
  return response;
}

export async function loginMultiplayerAccount(request: MultiplayerAuthRequest): Promise<MultiplayerAuthResponse> {
  const response = await requestJson<MultiplayerAuthResponse>("/api/multiplayer/login", {
    method: "POST",
    body: JSON.stringify(request)
  });
  saveMultiplayerSession(response.session);
  return response;
}

export async function restoreMultiplayerSession(session?: MultiplayerSession): Promise<MultiplayerAuthResponse> {
  const token = session?.token ?? readMultiplayerSession()?.token;
  if (!token) throw new MultiplayerRequestError("No multiplayer session saved.", 0);
  const response = await requestJson<MultiplayerAuthResponse>("/api/multiplayer/session", { token });
  saveMultiplayerSession(response.session);
  return response;
}

export function postMultiplayerProfile(token: string, profile: MultiplayerStoreProfile): Promise<MultiplayerProfileResponse> {
  return requestJson<MultiplayerProfileResponse>("/api/multiplayer/profile", {
    method: "POST",
    token,
    body: JSON.stringify(profile)
  });
}

export function fetchMultiplayerSnapshot(token: string): Promise<MultiplayerSnapshotResponse> {
  return requestJson<MultiplayerSnapshotResponse>("/api/multiplayer/snapshot", { token });
}

export function createTradeSession(token: string, partnerPlayerId: string, stationId: string): Promise<{ ok: boolean; message: string; trade: TradeSession }> {
  return requestJson<{ ok: boolean; message: string; trade: TradeSession }>("/api/multiplayer/trade/create", {
    method: "POST",
    token,
    body: JSON.stringify({ partnerPlayerId, stationId })
  });
}

export function updateTradeOffer(token: string, tradeId: string, offer: MultiplayerTradeOffer): Promise<{ ok: boolean; message: string; trade: TradeSession }> {
  return requestJson<{ ok: boolean; message: string; trade: TradeSession }>("/api/multiplayer/trade/update", {
    method: "POST",
    token,
    body: JSON.stringify({ tradeId, offer })
  });
}

export function confirmTradeSession(token: string, tradeId: string): Promise<{ ok: boolean; message: string; trade: TradeSession }> {
  return requestJson<{ ok: boolean; message: string; trade: TradeSession }>("/api/multiplayer/trade/confirm", {
    method: "POST",
    token,
    body: JSON.stringify({ tradeId })
  });
}

export function cancelTradeSession(token: string, tradeId: string): Promise<{ ok: boolean; message: string; trade: TradeSession }> {
  return requestJson<{ ok: boolean; message: string; trade: TradeSession }>("/api/multiplayer/trade/cancel", {
    method: "POST",
    token,
    body: JSON.stringify({ tradeId })
  });
}

export function createCoopMissionInvite(
  token: string,
  guestPlayerId: string,
  stationId: string,
  mission: CoopMissionSession["mission"]
): Promise<{ ok: boolean; message: string; session: CoopMissionSession }> {
  return requestJson<{ ok: boolean; message: string; session: CoopMissionSession }>("/api/multiplayer/mission-invite", {
    method: "POST",
    token,
    body: JSON.stringify({ guestPlayerId, stationId, mission })
  });
}

export function respondToCoopMissionInvite(token: string, sessionId: string, accept: boolean): Promise<{ ok: boolean; message: string; session: CoopMissionSession }> {
  return requestJson<{ ok: boolean; message: string; session: CoopMissionSession }>("/api/multiplayer/mission-invite/respond", {
    method: "POST",
    token,
    body: JSON.stringify({ sessionId, accept })
  });
}

export function completeCoopMission(token: string, sessionId: string): Promise<{ ok: boolean; message: string; session: CoopMissionSession }> {
  return requestJson<{ ok: boolean; message: string; session: CoopMissionSession }>("/api/multiplayer/mission/complete", {
    method: "POST",
    token,
    body: JSON.stringify({ sessionId })
  });
}

export interface MultiplayerTransportConnection {
  send: (event: MultiplayerClientEvent) => void;
  close: () => void;
}

export interface MultiplayerTransportOptions {
  networkMode?: MultiplayerNetworkMode;
}

type PeerConnectionEntry = {
  info: MultiplayerPeerInfo;
  connection: RTCPeerConnection;
  channel?: RTCDataChannel;
  pendingCandidates: RTCIceCandidateInit[];
};

function createPeerMovementTransport(
  session: MultiplayerSession,
  socket: WebSocket,
  onEvent: (event: MultiplayerServerEvent) => void,
  onError: (message: string) => void
) {
  const peers = new Map<string, PeerConnectionEntry>();
  const iceServers = configuredIceServers();
  let lastSnapshot: RemotePlayerSnapshot | undefined;

  function sendSocketEvent(event: MultiplayerClientEvent): void {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(event));
  }

  function closePeer(playerId: string): void {
    const peer = peers.get(playerId);
    if (!peer) return;
    peer.channel?.close();
    peer.connection.close();
    peers.delete(playerId);
  }

  function attachChannel(peer: PeerConnectionEntry, channel: RTCDataChannel): void {
    peer.channel = channel;
    channel.binaryType = "arraybuffer";
    channel.addEventListener("open", () => {
      if (lastSnapshot && channel.readyState === "open") channel.send(JSON.stringify(lastSnapshot));
    });
    channel.addEventListener("message", (event) => {
      try {
        const incoming = JSON.parse(String(event.data)) as RemotePlayerSnapshot;
        onEvent({
          type: "remote-player",
          source: "peer",
          player: {
            ...incoming,
            playerId: peer.info.playerId,
            username: peer.info.username,
            displayName: peer.info.displayName,
            updatedAt: Date.now()
          }
        });
      } catch {
        onError(`Malformed P2P movement packet from ${peer.info.displayName}.`);
      }
    });
    channel.addEventListener("error", () => onError(`P2P movement channel failed for ${peer.info.displayName}.`));
  }

  function signalPeer(signal: Omit<MultiplayerPeerSignal, "fromPlayerId" | "fromPeer">): void {
    sendSocketEvent({ type: "peer-signal", signal });
  }

  async function sendOffer(peer: PeerConnectionEntry): Promise<void> {
    const offer = await peer.connection.createOffer();
    await peer.connection.setLocalDescription(offer);
    const description = peer.connection.localDescription;
    if (!description) return;
    signalPeer({
      toPlayerId: peer.info.playerId,
      signalType: "offer",
      description: description.toJSON()
    });
  }

  async function flushCandidates(peer: PeerConnectionEntry): Promise<void> {
    if (!peer.connection.remoteDescription) return;
    const candidates = peer.pendingCandidates.splice(0);
    for (const candidate of candidates) await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
  }

  function ensurePeer(info: MultiplayerPeerInfo): PeerConnectionEntry | undefined {
    if (info.playerId === session.playerId) return undefined;
    const existing = peers.get(info.playerId);
    if (existing) return existing;
    if (typeof RTCPeerConnection === "undefined") {
      onError("P2P movement requires WebRTC support in this browser.");
      return undefined;
    }

    const connection = new RTCPeerConnection({ iceServers });
    const peer: PeerConnectionEntry = {
      info,
      connection,
      pendingCandidates: []
    };
    peers.set(info.playerId, peer);

    connection.addEventListener("icecandidate", (event) => {
      if (!event.candidate) return;
      signalPeer({
        toPlayerId: info.playerId,
        signalType: "ice",
        candidate: event.candidate.toJSON()
      });
    });
    connection.addEventListener("connectionstatechange", () => {
      if (connection.connectionState === "failed") {
        onError(`P2P connection failed for ${info.displayName}.`);
      }
      if (connection.connectionState === "closed") closePeer(info.playerId);
    });
    connection.addEventListener("iceconnectionstatechange", () => {
      if (connection.iceConnectionState === "failed") onError(`P2P ICE negotiation failed for ${info.displayName}.`);
    });
    connection.addEventListener("datachannel", (event) => attachChannel(peer, event.channel));

    if (session.playerId < info.playerId) {
      attachChannel(peer, connection.createDataChannel("movement", { ordered: false, maxRetransmits: 0 }));
      void sendOffer(peer).catch((error) => onError(error instanceof Error ? error.message : "P2P offer failed."));
    }
    return peer;
  }

  async function handleSignal(signal: MultiplayerPeerSignal): Promise<void> {
    const fromPlayerId = signal.fromPlayerId;
    if (!fromPlayerId || fromPlayerId === session.playerId) return;
    const peerInfo = signal.fromPeer ?? peers.get(fromPlayerId)?.info;
    if (!peerInfo) return;
    const peer = ensurePeer(peerInfo);
    if (!peer) return;
    if (signal.signalType === "offer" && signal.description) {
      await peer.connection.setRemoteDescription(new RTCSessionDescription(signal.description));
      await flushCandidates(peer);
      const answer = await peer.connection.createAnswer();
      await peer.connection.setLocalDescription(answer);
      const description = peer.connection.localDescription;
      if (description) {
        signalPeer({
          toPlayerId: fromPlayerId,
          signalType: "answer",
          description: description.toJSON()
        });
      }
      return;
    }
    if (signal.signalType === "answer" && signal.description) {
      await peer.connection.setRemoteDescription(new RTCSessionDescription(signal.description));
      await flushCandidates(peer);
      return;
    }
    if (signal.signalType === "ice" && signal.candidate) {
      if (!peer.connection.remoteDescription) {
        peer.pendingCandidates.push(signal.candidate);
        return;
      }
      await peer.connection.addIceCandidate(new RTCIceCandidate(signal.candidate));
    }
  }

  return {
    handleServerEvent(event: MultiplayerServerEvent): boolean {
      if (event.type === "peer-roster") {
        onEvent(event);
        event.peers.forEach((peer) => ensurePeer(peer));
        return true;
      }
      if (event.type === "peer-joined") {
        onEvent(event);
        ensurePeer(event.peer);
        return true;
      }
      if (event.type === "peer-left") {
        onEvent(event);
        closePeer(event.playerId);
        onEvent({ type: "remote-player-left", playerId: event.playerId });
        return true;
      }
      if (event.type === "peer-signal") {
        onEvent(event);
        void handleSignal(event.signal).catch((error) => onError(error instanceof Error ? error.message : "P2P signal failed."));
        return true;
      }
      return false;
    },
    broadcastSnapshot(snapshot: RemotePlayerSnapshot): void {
      lastSnapshot = snapshot;
      const payload = JSON.stringify(snapshot);
      for (const peer of peers.values()) {
        if (peer.channel?.readyState === "open") {
          peer.channel.send(payload);
        }
      }
    },
    close(): void {
      for (const playerId of [...peers.keys()]) closePeer(playerId);
    }
  };
}

export function connectMultiplayerEvents(
  session: MultiplayerSession,
  onEvent: (event: MultiplayerServerEvent) => void,
  onError: (message: string) => void,
  options: MultiplayerTransportOptions = {}
): MultiplayerTransportConnection | undefined {
  if (!MULTIPLAYER_SERVICE_CONFIG.enabled || typeof WebSocket === "undefined") return undefined;
  const socket = new WebSocket(socketUrl(`/api/multiplayer/events?token=${encodeURIComponent(session.token)}`));
  const networkMode = options.networkMode ?? DEFAULT_MULTIPLAYER_SETTINGS.networkMode;
  const peerTransport = networkMode === "peer-to-peer"
    ? createPeerMovementTransport(session, socket, onEvent, onError)
    : undefined;
  let closedByClient = false;
  socket.addEventListener("open", () => {
    if (networkMode === "peer-to-peer") socket.send(JSON.stringify({ type: "peer-ready" } satisfies MultiplayerClientEvent));
  });
  socket.addEventListener("message", (event) => {
    try {
      const parsed = JSON.parse(String(event.data)) as MultiplayerServerEvent;
      if (peerTransport?.handleServerEvent(parsed)) return;
      onEvent(parsed);
    } catch {
      onError("Malformed multiplayer event.");
    }
  });
  socket.addEventListener("error", () => onError("Multiplayer socket error."));
  socket.addEventListener("close", () => {
    peerTransport?.close();
    if (!closedByClient) onError("Multiplayer socket closed.");
  });
  return {
    send: (event) => {
      if (event.type === "player-snapshot" && peerTransport) {
        peerTransport.broadcastSnapshot(event.snapshot);
        return;
      }
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(event));
    },
    close: () => {
      closedByClient = true;
      peerTransport?.close();
      socket.close();
    }
  };
}

export function snapshotFromProfile(profile: MultiplayerPlayerProfile): RemotePlayerSnapshot {
  return {
    playerId: profile.playerId,
    username: profile.username,
    displayName: profile.displayName,
    shipId: profile.player.shipId,
    currentSystemId: profile.currentSystemId,
    currentStationId: profile.currentStationId,
    position: profile.player.position,
    velocity: profile.player.velocity,
    rotation: profile.player.rotation,
    hull: profile.player.hull,
    shield: profile.player.shield,
    updatedAt: Date.now()
  };
}
