import type {
  EconomyDispatchDeliveryRequest,
  EconomyDispatchDeliveryResponse,
  EconomyEvent,
  EconomyNpcInteractionRequest,
  EconomyNpcInteractionResponse,
  EconomyNpcResponse,
  EconomyServiceStatus,
  EconomySnapshot,
  NpcDestroyedRequest,
  PlayerTradeRequest,
  PlayerTradeResponse
} from "../types/economy";

const STATIC_FALLBACK_URL = "static economy fallback";
const STATIC_FALLBACK_REASON = "Economy backend disabled for static build.";
const HTTPS_HTTP_BLOCK_REASON = "Economy backend disabled: HTTPS pages cannot call an HTTP economy service.";

export interface EconomyServiceConfigInput {
  envUrl?: string;
  production: boolean;
  pageProtocol?: string;
}

export interface EconomyServiceConfig {
  enabled: boolean;
  requestBaseUrl: string;
  displayUrl: string;
  disabledReason?: string;
}

function normalizeConfiguredUrl(url: string): string {
  return url.trim().replace(/\/$/, "");
}

export function resolveEconomyServiceConfig({
  envUrl,
  production,
  pageProtocol
}: EconomyServiceConfigInput): EconomyServiceConfig {
  const configuredUrl = envUrl?.trim() ? normalizeConfiguredUrl(envUrl) : undefined;
  if (configuredUrl) {
    if (pageProtocol === "https:" && configuredUrl.startsWith("http:")) {
      return {
        enabled: false,
        requestBaseUrl: "",
        displayUrl: STATIC_FALLBACK_URL,
        disabledReason: HTTPS_HTTP_BLOCK_REASON
      };
    }
    return {
      enabled: true,
      requestBaseUrl: configuredUrl,
      displayUrl: configuredUrl
    };
  }
  if (production) {
    return {
      enabled: false,
      requestBaseUrl: "",
      displayUrl: STATIC_FALLBACK_URL,
      disabledReason: STATIC_FALLBACK_REASON
    };
  }
  return {
    enabled: true,
    requestBaseUrl: "",
    displayUrl: "/api/economy"
  };
}

export const ECONOMY_SERVICE_CONFIG = resolveEconomyServiceConfig({
  envUrl: import.meta.env.VITE_ECONOMY_API_URL as string | undefined,
  production: import.meta.env.PROD,
  pageProtocol: typeof window === "undefined" ? undefined : window.location.protocol
});

export const ECONOMY_SERVICE_URL = ECONOMY_SERVICE_CONFIG.displayUrl;

const REQUEST_TIMEOUT_MS = 1_400;

export class EconomyRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "EconomyRequestError";
    this.status = status;
  }
}

export function isEconomyServiceEnabled(): boolean {
  return ECONOMY_SERVICE_CONFIG.enabled;
}

export function createEconomyServiceStatus(): EconomyServiceStatus {
  return {
    status: ECONOMY_SERVICE_CONFIG.enabled ? "offline" : "fallback",
    url: ECONOMY_SERVICE_CONFIG.displayUrl,
    lastError: ECONOMY_SERVICE_CONFIG.disabledReason
  };
}

function economyServiceDisabledError(): EconomyRequestError {
  return new EconomyRequestError(ECONOMY_SERVICE_CONFIG.disabledReason ?? "Economy service offline.", 0);
}

function economyRequestUrl(path: string): string {
  return `${ECONOMY_SERVICE_CONFIG.requestBaseUrl}${path}`;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  if (!ECONOMY_SERVICE_CONFIG.enabled) throw economyServiceDisabledError();
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(economyRequestUrl(path), {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {})
      }
    });
    const data = await response.json() as T;
    if (!response.ok) {
      const message = typeof data === "object" && data && "message" in data ? String(data.message) : "Economy service request failed.";
      throw new EconomyRequestError(message, response.status);
    }
    return data;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

export function fetchEconomySnapshot(systemId: string): Promise<EconomySnapshot> {
  return requestJson<EconomySnapshot>(`/api/economy/snapshot?systemId=${encodeURIComponent(systemId)}`);
}

export function fetchEconomyNpc(npcId: string): Promise<EconomyNpcResponse> {
  return requestJson<EconomyNpcResponse>(`/api/economy/npc/${encodeURIComponent(npcId)}`);
}

export function isEconomyNotFoundError(error: unknown): boolean {
  return error instanceof EconomyRequestError && error.status === 404 && error.message === "Economy NPC not found.";
}

export function postEconomyReset(systemId: string): Promise<EconomySnapshot> {
  return requestJson<EconomySnapshot>(`/api/economy/reset?systemId=${encodeURIComponent(systemId)}`, {
    method: "POST"
  });
}

export function postPlayerTrade(request: PlayerTradeRequest): Promise<PlayerTradeResponse> {
  if (!ECONOMY_SERVICE_CONFIG.enabled) return Promise.reject(economyServiceDisabledError());
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    fetch(economyRequestUrl("/api/economy/player-trade"), {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request)
    })
      .then(async (response) => {
        const data = await response.json() as PlayerTradeResponse;
        if (!response.ok && !data.message) throw new Error("Economy service trade failed.");
        resolve(data);
      })
      .catch(reject)
      .finally(() => globalThis.clearTimeout(timeout));
  });
}

export async function postNpcDestroyed(request: NpcDestroyedRequest): Promise<void> {
  await requestJson<{ ok: boolean }>("/api/economy/npc-destroyed", {
    method: "POST",
    body: JSON.stringify(request)
  });
}

export function postEconomyNpcInteraction(
  request: EconomyNpcInteractionRequest
): Promise<EconomyNpcInteractionResponse> {
  return requestJson<EconomyNpcInteractionResponse>("/api/economy/npc-interaction", {
    method: "POST",
    body: JSON.stringify(request)
  });
}

export function postEconomyDispatchDelivery(
  request: EconomyDispatchDeliveryRequest
): Promise<EconomyDispatchDeliveryResponse> {
  return requestJson<EconomyDispatchDeliveryResponse>("/api/economy/dispatch-delivery", {
    method: "POST",
    body: JSON.stringify(request)
  });
}

export function connectEconomyEvents(
  onEvent: (event: EconomyEvent) => void,
  onError: (message: string) => void
): (() => void) | undefined {
  if (!ECONOMY_SERVICE_CONFIG.enabled) return undefined;
  if (typeof EventSource === "undefined") return undefined;
  const source = new EventSource(economyRequestUrl("/api/economy/events"));
  const handleEvent = (event: MessageEvent<string>) => {
    try {
      onEvent(JSON.parse(event.data) as EconomyEvent);
    } catch {
      onError("Economy stream emitted invalid data.");
    }
  };
  for (const eventName of [
    "connected",
    "snapshot",
    "market",
    "npc-task",
    "npc-mined",
    "npc-trade",
    "npc-destroyed",
    "npc-replacement",
    "npc-interaction",
    "dispatch-delivery",
    "reset"
  ]) {
    source.addEventListener(eventName, handleEvent);
  }
  source.onerror = () => onError("Economy service stream disconnected.");
  return () => source.close();
}
