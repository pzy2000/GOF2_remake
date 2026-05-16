import type {
  CoopMissionSession,
  MultiplayerAuthRequest,
  MultiplayerAuthResponse,
  MultiplayerClientEvent,
  MultiplayerPlayerProfile,
  MultiplayerProfileResponse,
  MultiplayerServerEvent,
  MultiplayerSession,
  MultiplayerSnapshotResponse,
  MultiplayerStoreProfile,
  MultiplayerTradeOffer,
  RemotePlayerSnapshot,
  TradeSession
} from "../types/multiplayer";

const STATIC_MULTIPLAYER_REASON = "Multiplayer server disabled for static build.";
const HTTPS_HTTP_BLOCK_REASON = "Multiplayer disabled: HTTPS pages cannot call an HTTP multiplayer server.";
const DEFAULT_LOCAL_MULTIPLAYER_PORT = 19778;
const REQUEST_TIMEOUT_MS = 1_800;
const MULTIPLAYER_SESSION_STORAGE_KEY = "gof2-multiplayer-session";

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

export function resolveMultiplayerServiceConfig({
  envUrl,
  production,
  pageProtocol,
  pageHostname,
  staticDisabled = false
}: MultiplayerServiceConfigInput): MultiplayerServiceConfig {
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
  if (staticDisabled || (production && pageProtocol === "https:")) {
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
  envUrl: import.meta.env.VITE_MULTIPLAYER_API_URL as string | undefined,
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

export function connectMultiplayerEvents(
  session: MultiplayerSession,
  onEvent: (event: MultiplayerServerEvent) => void,
  onError: (message: string) => void
): { send: (event: MultiplayerClientEvent) => void; close: () => void } | undefined {
  if (!MULTIPLAYER_SERVICE_CONFIG.enabled || typeof WebSocket === "undefined") return undefined;
  const socket = new WebSocket(socketUrl(`/api/multiplayer/events?token=${encodeURIComponent(session.token)}`));
  socket.addEventListener("message", (event) => {
    try {
      onEvent(JSON.parse(String(event.data)) as MultiplayerServerEvent);
    } catch {
      onError("Malformed multiplayer event.");
    }
  });
  socket.addEventListener("error", () => onError("Multiplayer socket error."));
  socket.addEventListener("close", () => onError("Multiplayer socket closed."));
  return {
    send: (event) => {
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(event));
    },
    close: () => socket.close()
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
