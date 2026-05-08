import type {
  EconomyEvent,
  EconomySnapshot,
  NpcDestroyedRequest,
  PlayerTradeRequest,
  PlayerTradeResponse
} from "../types/economy";

export const ECONOMY_SERVICE_URL =
  (import.meta.env.VITE_ECONOMY_API_URL as string | undefined)?.replace(/\/$/, "") ?? "http://127.0.0.1:19777";

const REQUEST_TIMEOUT_MS = 1_400;

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${ECONOMY_SERVICE_URL}${path}`, {
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
      throw new Error(message);
    }
    return data;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

export function fetchEconomySnapshot(systemId: string): Promise<EconomySnapshot> {
  return requestJson<EconomySnapshot>(`/api/economy/snapshot?systemId=${encodeURIComponent(systemId)}`);
}

export function postEconomyReset(systemId: string): Promise<EconomySnapshot> {
  return requestJson<EconomySnapshot>(`/api/economy/reset?systemId=${encodeURIComponent(systemId)}`, {
    method: "POST"
  });
}

export function postPlayerTrade(request: PlayerTradeRequest): Promise<PlayerTradeResponse> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    fetch(`${ECONOMY_SERVICE_URL}/api/economy/player-trade`, {
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

export function connectEconomyEvents(
  onEvent: (event: EconomyEvent) => void,
  onError: (message: string) => void
): (() => void) | undefined {
  if (typeof EventSource === "undefined") return undefined;
  const source = new EventSource(`${ECONOMY_SERVICE_URL}/api/economy/events`);
  const handleEvent = (event: MessageEvent<string>) => {
    try {
      onEvent(JSON.parse(event.data) as EconomyEvent);
    } catch {
      onError("Economy stream emitted invalid data.");
    }
  };
  for (const eventName of ["connected", "snapshot", "market", "npc-task", "npc-mined", "npc-trade", "npc-destroyed", "reset"]) {
    source.addEventListener(eventName, handleEvent);
  }
  source.onerror = () => onError("Economy service stream disconnected.");
  return () => source.close();
}
