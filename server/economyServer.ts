import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { EconomyDispatchDeliveryRequest, EconomyEvent, EconomyNpcInteractionRequest, NpcDestroyedRequest, PlayerTradeRequest } from "../src/types/economy";
import {
  createEconomyNpcResponse,
  createEconomySnapshot,
  handleEconomyDispatchDelivery,
  handleEconomyNpcInteraction,
  handlePlayerTrade,
  markEconomyNpcDestroyed,
  normalizeEconomyState,
  resetEconomyState,
  tickEconomyState,
  type EconomyServiceState
} from "../src/systems/economySimulation";

export interface EconomyHttpServerOptions {
  stateFile?: string;
  tickMs?: number;
  autosaveMs?: number;
  autoTick?: boolean;
}

export interface EconomyHttpServer {
  server: Server;
  stateFile: string;
  getState: () => EconomyServiceState;
  setState: (next: EconomyServiceState) => void;
  tick: (seconds: number) => void;
  save: () => void;
  close: () => Promise<void>;
}

type SseClient = {
  id: number;
  response: ServerResponse;
};

const DEFAULT_PORT = 19777;
const DEFAULT_STATE_FILE = ".gof2/economy-state.json";

function readJsonBody<T>(request: IncomingMessage): Promise<T> {
  return new Promise((resolveBody, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request body is too large."));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolveBody(body ? JSON.parse(body) as T : ({} as T));
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function writeJson(response: ServerResponse, statusCode: number, data: unknown): void {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(data));
}

function writeNoContent(response: ServerResponse): void {
  response.writeHead(204, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  });
  response.end();
}

function loadState(stateFile: string): EconomyServiceState {
  try {
    const raw = readFileSync(stateFile, "utf8");
    return normalizeEconomyState(JSON.parse(raw) as Partial<EconomyServiceState>);
  } catch {
    return resetEconomyState();
  }
}

function saveState(stateFile: string, state: EconomyServiceState): void {
  mkdirSync(dirname(stateFile), { recursive: true });
  writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`);
}

function writeSse(response: ServerResponse, event: string, data: unknown): void {
  response.write(`event: ${event}\n`);
  response.write(`data: ${JSON.stringify(data)}\n\n`);
}

function getUrl(request: IncomingMessage): URL {
  return new URL(request.url ?? "/", "http://127.0.0.1");
}

export function createEconomyHttpServer(options: EconomyHttpServerOptions = {}): EconomyHttpServer {
  const stateFile = resolve(options.stateFile ?? DEFAULT_STATE_FILE);
  let state = loadState(stateFile);
  let lastSavedAt = 0;
  let clientSeq = 0;
  const clients = new Set<SseClient>();

  const save = () => {
    saveState(stateFile, state);
    lastSavedAt = Date.now();
  };

  const broadcast = (event: EconomyEvent | { type: EconomyEvent["type"]; message: string; systemId?: string }) => {
    const payload = {
      ...event,
      snapshotId: state.snapshotId,
      clock: state.clock
    };
    for (const client of clients) writeSse(client.response, event.type, payload);
  };

  const tick = (seconds: number) => {
    tickEconomyState(state, seconds);
    broadcast({ type: "snapshot", message: "Economy simulation advanced." });
    if (Date.now() - lastSavedAt >= (options.autosaveMs ?? 2_000)) save();
  };

  const server = createServer(async (request, response) => {
    if (request.method === "OPTIONS") {
      writeNoContent(response);
      return;
    }

    const url = getUrl(request);
    try {
      if (request.method === "GET" && url.pathname === "/health") {
        writeJson(response, 200, { ok: true, snapshotId: state.snapshotId, clock: state.clock });
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/economy/snapshot") {
        writeJson(response, 200, createEconomySnapshot(state, url.searchParams.get("systemId") ?? undefined));
        return;
      }

      if (request.method === "GET" && url.pathname.startsWith("/api/economy/npc/")) {
        const npcId = decodeURIComponent(url.pathname.slice("/api/economy/npc/".length));
        const npcResponse = createEconomyNpcResponse(state, npcId);
        if (!npcId || !npcResponse) {
          writeJson(response, 404, { ok: false, message: "Economy NPC not found." });
          return;
        }
        writeJson(response, 200, npcResponse);
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/economy/events") {
        response.writeHead(200, {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive"
        });
        response.flushHeaders?.();
        const client: SseClient = { id: ++clientSeq, response };
        clients.add(client);
        writeSse(response, "connected", {
          type: "connected",
          message: "Economy stream connected.",
          snapshotId: state.snapshotId,
          clock: state.clock
        });
        request.on("close", () => {
          clients.delete(client);
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/economy/player-trade") {
        const body = await readJsonBody<PlayerTradeRequest>(request);
        const result = handlePlayerTrade(state, body);
        if (result.ok) {
          save();
          broadcast({ type: "market", message: result.message, systemId: body.systemId });
        }
        writeJson(response, result.ok ? 200 : 400, result);
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/economy/npc-destroyed") {
        const body = await readJsonBody<NpcDestroyedRequest>(request);
        const event = markEconomyNpcDestroyed(state, body);
        if (event) {
          save();
          broadcast(event);
        }
        writeJson(response, 200, { ok: true, event });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/economy/npc-interaction") {
        const body = await readJsonBody<EconomyNpcInteractionRequest>(request);
        const result = handleEconomyNpcInteraction(state, body);
        if (result.ok) {
          save();
          if (result.event) broadcast(result.event);
        }
        const statusCode = result.ok ? 200 : result.message === "Economy NPC not found." ? 404 : 400;
        writeJson(response, statusCode, result);
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/economy/dispatch-delivery") {
        const body = await readJsonBody<EconomyDispatchDeliveryRequest>(request);
        const result = handleEconomyDispatchDelivery(state, body);
        if (result.ok) {
          save();
          if (result.event) broadcast(result.event);
        }
        writeJson(response, result.ok ? 200 : 400, result);
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/economy/reset") {
        state = resetEconomyState();
        save();
        broadcast({ type: "reset", message: "Economy state reset." });
        writeJson(response, 200, createEconomySnapshot(state, url.searchParams.get("systemId") ?? undefined));
        return;
      }

      writeJson(response, 404, { ok: false, message: "Route not found." });
    } catch (error) {
      writeJson(response, 500, { ok: false, message: error instanceof Error ? error.message : "Economy server error." });
    }
  });

  const interval = options.autoTick === false ? undefined : setInterval(() => tick((options.tickMs ?? 1_000) / 1_000), options.tickMs ?? 1_000);
  server.on("close", () => {
    if (interval) clearInterval(interval);
    for (const client of clients) client.response.end();
    clients.clear();
  });

  return {
    server,
    stateFile,
    getState: () => state,
    setState: (next) => {
      state = next;
    },
    tick,
    save,
    close: () =>
      new Promise((resolveClose, reject) => {
        if (!server.listening) {
          resolveClose();
          return;
        }
        server.close((error) => {
          if (error) reject(error);
          else resolveClose();
        });
      })
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.GOF2_ECONOMY_PORT ?? DEFAULT_PORT);
  const host = process.env.GOF2_ECONOMY_HOST ?? "127.0.0.1";
  const stateFile = process.env.GOF2_ECONOMY_STATE_FILE;
  const app = createEconomyHttpServer({ stateFile });
  app.server.listen(port, host, () => {
    console.log(`GOF2 economy server listening on http://${host}:${port}`);
    console.log(`Economy state: ${app.stateFile}`);
  });
}
