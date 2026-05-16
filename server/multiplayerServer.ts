import { createHash, pbkdf2Sync, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { Socket } from "node:net";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createInitialFactionHeat } from "../src/systems/factionConsequences";
import { createInitialMarketState } from "../src/systems/economy";
import { createInitialDialogueState } from "../src/systems/dialogue";
import { createInitialExplorationState } from "../src/systems/exploration";
import { createInitialOnboardingState } from "../src/systems/onboarding";
import { createInitialPlayer } from "../src/state/domains/runtimeFactory";
import { getInitialKnownPlanetIds, getInitialKnownSystems } from "../src/systems/navigation";
import { createInitialReputation } from "../src/systems/reputation";
import type { EquipmentId, MissionDefinition } from "../src/types/game";
import type {
  CoopMissionSession,
  MultiplayerAuthRequest,
  MultiplayerPlayerProfile,
  MultiplayerServerEvent,
  MultiplayerSession,
  MultiplayerSnapshotResponse,
  MultiplayerStoreProfile,
  RemotePlayerSnapshot,
  TradeSession,
  MultiplayerTradeOffer
} from "../src/types/multiplayer";

export interface MultiplayerHttpServerOptions {
  stateFile?: string;
  autosaveMs?: number;
}

interface AccountSession {
  token: string;
  createdAt: number;
  lastSeenAt: number;
}

interface MultiplayerAccount {
  playerId: string;
  username: string;
  displayName: string;
  passwordSalt: string;
  passwordHash: string;
  sessions: AccountSession[];
  profile: MultiplayerPlayerProfile;
}

export interface MultiplayerServiceState {
  version: number;
  accounts: MultiplayerAccount[];
  trades: TradeSession[];
  coopMissions: CoopMissionSession[];
  snapshots: Record<string, RemotePlayerSnapshot>;
  snapshotId: number;
}

export interface MultiplayerHttpServer {
  server: Server;
  stateFile: string;
  getState: () => MultiplayerServiceState;
  setState: (next: MultiplayerServiceState) => void;
  save: () => void;
  close: () => Promise<void>;
}

type WsClient = {
  id: string;
  playerId: string;
  socket: Socket;
  pending: Buffer;
};

const DEFAULT_PORT = 19778;
const DEFAULT_STATE_FILE = ".gof2/multiplayer-state.json";
const PASSWORD_ITERATIONS = 120_000;
const PASSWORD_KEY_LENGTH = 32;
const COOP_REWARD_MULTIPLIER = 0.35;

function nowIso(): string {
  return new Date().toISOString();
}

function sanitizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function publicSession(account: MultiplayerAccount, token: string, serverUrl: string): MultiplayerSession {
  return {
    token,
    playerId: account.playerId,
    username: account.username,
    displayName: account.displayName,
    serverUrl
  };
}

function hashPassword(password: string, salt: string): string {
  return pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, PASSWORD_KEY_LENGTH, "sha256").toString("hex");
}

function verifyPassword(password: string, salt: string, expected: string): boolean {
  const actual = Buffer.from(hashPassword(password, salt), "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}

function createProfile(playerId: string, username: string, displayName: string): MultiplayerPlayerProfile {
  const knownSystems = getInitialKnownSystems("helion-reach");
  return {
    playerId,
    username,
    displayName,
    updatedAt: nowIso(),
    screen: "flight",
    currentSystemId: "helion-reach",
    currentStationId: undefined,
    gameClock: 0,
    player: createInitialPlayer(),
    activeMissions: [],
    completedMissionIds: [],
    failedMissionIds: [],
    marketState: createInitialMarketState(),
    reputation: createInitialReputation(),
    factionHeat: createInitialFactionHeat(),
    knownSystems,
    knownPlanetIds: getInitialKnownPlanetIds(knownSystems),
    explorationState: createInitialExplorationState(),
    dialogueState: createInitialDialogueState(),
    onboardingState: createInitialOnboardingState(0)
  };
}

function normalizeTradeOffer(offer?: Partial<MultiplayerTradeOffer>): MultiplayerTradeOffer {
  const equipment: Partial<Record<EquipmentId, number>> = {};
  for (const [equipmentId, rawAmount] of Object.entries(offer?.equipment ?? {}) as [EquipmentId, number | undefined][]) {
    const amount = Math.max(0, Math.floor(rawAmount ?? 0));
    if (amount > 0) equipment[equipmentId] = amount;
  }
  return {
    credits: Math.max(0, Math.floor(offer?.credits ?? 0)),
    equipment
  };
}

function normalizeProfile(account: Pick<MultiplayerAccount, "playerId" | "username" | "displayName">, profile?: Partial<MultiplayerPlayerProfile>): MultiplayerPlayerProfile {
  const fallback = createProfile(account.playerId, account.username, account.displayName);
  const merged = { ...fallback, ...(profile ?? {}) };
  return {
    ...merged,
    playerId: account.playerId,
    username: account.username,
    displayName: account.displayName,
    updatedAt: merged.updatedAt ?? nowIso()
  };
}

export function normalizeMultiplayerState(raw: Partial<MultiplayerServiceState> | undefined): MultiplayerServiceState {
  const accounts = (raw?.accounts ?? []).map((account) => ({
    ...account,
    username: sanitizeUsername(account.username),
    displayName: account.displayName || account.username,
    sessions: account.sessions ?? [],
    profile: normalizeProfile(account, account.profile)
  }));
  return {
    version: 1,
    accounts,
    trades: raw?.trades ?? [],
    coopMissions: raw?.coopMissions ?? [],
    snapshots: raw?.snapshots ?? {},
    snapshotId: raw?.snapshotId ?? 0
  };
}

export function resetMultiplayerState(): MultiplayerServiceState {
  return normalizeMultiplayerState(undefined);
}

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
    "Access-Control-Allow-Headers": "authorization,content-type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(data));
}

function writeNoContent(response: ServerResponse): void {
  response.writeHead(204, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization,content-type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  });
  response.end();
}

function loadState(stateFile: string): MultiplayerServiceState {
  try {
    return normalizeMultiplayerState(JSON.parse(readFileSync(stateFile, "utf8")) as Partial<MultiplayerServiceState>);
  } catch {
    return resetMultiplayerState();
  }
}

function saveState(stateFile: string, state: MultiplayerServiceState): void {
  mkdirSync(dirname(stateFile), { recursive: true });
  writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`);
}

function getUrl(request: IncomingMessage): URL {
  return new URL(request.url ?? "/", "http://127.0.0.1");
}

function tokenFromRequest(request: IncomingMessage, url = getUrl(request)): string | undefined {
  const header = request.headers.authorization;
  const auth = Array.isArray(header) ? header[0] : header;
  if (auth?.startsWith("Bearer ")) return auth.slice("Bearer ".length).trim();
  return url.searchParams.get("token") ?? undefined;
}

function accountByToken(state: MultiplayerServiceState, token: string | undefined): MultiplayerAccount | undefined {
  if (!token) return undefined;
  const account = state.accounts.find((candidate) => candidate.sessions.some((session) => session.token === token));
  const session = account?.sessions.find((candidate) => candidate.token === token);
  if (session) session.lastSeenAt = Date.now();
  return account;
}

function accountByPlayerId(state: MultiplayerServiceState, playerId: string): MultiplayerAccount | undefined {
  return state.accounts.find((account) => account.playerId === playerId);
}

function ensureAuthenticated(state: MultiplayerServiceState, request: IncomingMessage): MultiplayerAccount | undefined {
  return accountByToken(state, tokenFromRequest(request));
}

function cleanPublicSnapshot(
  state: MultiplayerServiceState,
  selfPlayerId: string,
  remotePlayers = Object.values(state.snapshots).filter((snapshot) => snapshot.playerId !== selfPlayerId)
): MultiplayerSnapshotResponse {
  const onlinePlayerIds = new Set([...Object.keys(state.snapshots), ...remotePlayers.map((snapshot) => snapshot.playerId)]);
  return {
    ok: true,
    message: "Multiplayer snapshot.",
    remotePlayers,
    tradeSessions: state.trades.filter((trade) => trade.playerIds.includes(selfPlayerId) && trade.status !== "completed" && trade.status !== "canceled"),
    coopMissionSessions: state.coopMissions.filter((session) =>
      (session.hostPlayerId === selfPlayerId || session.guestPlayerId === selfPlayerId) &&
      session.status !== "completed" &&
      session.status !== "canceled" &&
      (onlinePlayerIds.has(session.hostPlayerId) || onlinePlayerIds.has(session.guestPlayerId))
    )
  };
}

function snapshotFromProfile(profile: MultiplayerPlayerProfile): RemotePlayerSnapshot {
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
    updatedAt: Date.parse(profile.updatedAt) || Date.now()
  };
}

function sameStation(a: MultiplayerAccount | undefined, b: MultiplayerAccount | undefined, stationId: string): boolean {
  return !!a && !!b && a.profile.currentStationId === stationId && b.profile.currentStationId === stationId;
}

function validateOffer(account: MultiplayerAccount, offer: MultiplayerTradeOffer): string | undefined {
  if (account.profile.player.credits < offer.credits) return "Not enough credits for that offer.";
  for (const [equipmentId, amount] of Object.entries(offer.equipment) as [EquipmentId, number | undefined][]) {
    if ((account.profile.player.equipmentInventory?.[equipmentId] ?? 0) < (amount ?? 0)) {
      return "Equipment offer exceeds inventory.";
    }
  }
  return undefined;
}

function applyOutgoingOffer(account: MultiplayerAccount, offer: MultiplayerTradeOffer): void {
  const inventory = { ...(account.profile.player.equipmentInventory ?? {}) };
  for (const [equipmentId, amount] of Object.entries(offer.equipment) as [EquipmentId, number | undefined][]) {
    inventory[equipmentId] = Math.max(0, (inventory[equipmentId] ?? 0) - (amount ?? 0));
    if (inventory[equipmentId] === 0) delete inventory[equipmentId];
  }
  account.profile = {
    ...account.profile,
    updatedAt: nowIso(),
    player: {
      ...account.profile.player,
      credits: account.profile.player.credits - offer.credits,
      equipmentInventory: inventory
    }
  };
}

function applyIncomingOffer(account: MultiplayerAccount, offer: MultiplayerTradeOffer): void {
  const inventory = { ...(account.profile.player.equipmentInventory ?? {}) };
  for (const [equipmentId, amount] of Object.entries(offer.equipment) as [EquipmentId, number | undefined][]) {
    inventory[equipmentId] = (inventory[equipmentId] ?? 0) + (amount ?? 0);
  }
  account.profile = {
    ...account.profile,
    updatedAt: nowIso(),
    player: {
      ...account.profile.player,
      credits: account.profile.player.credits + offer.credits,
      equipmentInventory: inventory
    }
  };
}

function tryCommitTrade(state: MultiplayerServiceState, trade: TradeSession): { ok: boolean; message: string } {
  const [aId, bId] = trade.playerIds;
  const accountA = accountByPlayerId(state, aId);
  const accountB = accountByPlayerId(state, bId);
  if (!sameStation(accountA, accountB, trade.stationId)) return { ok: false, message: "Both pilots must stay docked at the same station." };
  const offerA = normalizeTradeOffer(trade.offers[aId]);
  const offerB = normalizeTradeOffer(trade.offers[bId]);
  const invalidA = accountA ? validateOffer(accountA, offerA) : "Trade pilot missing.";
  const invalidB = accountB ? validateOffer(accountB, offerB) : "Trade pilot missing.";
  if (invalidA || invalidB || !accountA || !accountB) return { ok: false, message: invalidA ?? invalidB ?? "Trade validation failed." };
  applyOutgoingOffer(accountA, offerA);
  applyOutgoingOffer(accountB, offerB);
  applyIncomingOffer(accountA, offerB);
  applyIncomingOffer(accountB, offerA);
  trade.status = "completed";
  trade.message = "Trade completed.";
  trade.updatedAt = Date.now();
  state.snapshotId += 1;
  return { ok: true, message: trade.message };
}

function encodeWsPayload(data: MultiplayerServerEvent): Buffer {
  const payload = Buffer.from(JSON.stringify(data));
  if (payload.length < 126) return Buffer.concat([Buffer.from([0x81, payload.length]), payload]);
  if (payload.length <= 0xffff) {
    const header = Buffer.allocUnsafe(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(payload.length, 2);
    return Buffer.concat([header, payload]);
  }
  const header = Buffer.allocUnsafe(10);
  header[0] = 0x81;
  header[1] = 127;
  header.writeBigUInt64BE(BigInt(payload.length), 2);
  return Buffer.concat([header, payload]);
}

function decodeWsMessages(buffer: Buffer): { messages: string[]; remaining: Buffer } {
  const messages: string[] = [];
  let offset = 0;
  while (offset + 2 <= buffer.length) {
    const frameStart = offset;
    const first = buffer[offset];
    const opcode = first & 0x0f;
    const second = buffer[offset + 1];
    const masked = (second & 0x80) !== 0;
    let length = second & 0x7f;
    offset += 2;
    if (length === 126) {
      if (offset + 2 > buffer.length) {
        offset = frameStart;
        break;
      }
      length = buffer.readUInt16BE(offset);
      offset += 2;
    } else if (length === 127) {
      if (offset + 8 > buffer.length) {
        offset = frameStart;
        break;
      }
      length = Number(buffer.readBigUInt64BE(offset));
      offset += 8;
    }
    if (masked && offset + 4 > buffer.length) {
      offset = frameStart;
      break;
    }
    const mask = masked ? buffer.subarray(offset, offset + 4) : undefined;
    if (masked) offset += 4;
    if (offset + length > buffer.length) {
      offset = frameStart;
      break;
    }
    const payload = Buffer.from(buffer.subarray(offset, offset + length));
    offset += length;
    if (opcode === 0x8) {
      offset = buffer.length;
      break;
    }
    if (mask) {
      for (let index = 0; index < payload.length; index += 1) payload[index] ^= mask[index % 4];
    }
    if (opcode === 0x1) messages.push(payload.toString("utf8"));
  }
  return { messages, remaining: buffer.subarray(offset) };
}

export function createMultiplayerHttpServer(options: MultiplayerHttpServerOptions = {}): MultiplayerHttpServer {
  const stateFile = resolve(options.stateFile ?? DEFAULT_STATE_FILE);
  let state = loadState(stateFile);
  let lastSavedAt = 0;
  const clients = new Map<string, WsClient>();

  const save = () => {
    saveState(stateFile, state);
    lastSavedAt = Date.now();
  };

  const maybeSave = () => {
    if (Date.now() - lastSavedAt >= (options.autosaveMs ?? 1_000)) save();
  };

  const send = (client: WsClient, event: MultiplayerServerEvent) => {
    if (client.socket.destroyed) return;
    client.socket.write(encodeWsPayload(event));
  };

  const broadcast = (event: MultiplayerServerEvent, playerIds?: string[]) => {
    const allowed = playerIds ? new Set(playerIds) : undefined;
    for (const client of clients.values()) {
      if (!allowed || allowed.has(client.playerId)) send(client, event);
    }
  };

  const broadcastProfile = (account: MultiplayerAccount) => {
    broadcast({ type: "profile-updated", profile: account.profile }, [account.playerId]);
  };

  const activeRemoteSnapshots = (selfPlayerId: string): RemotePlayerSnapshot[] => {
    const seen = new Set<string>();
    const snapshots: RemotePlayerSnapshot[] = [];
    for (const client of clients.values()) {
      if (client.playerId === selfPlayerId || seen.has(client.playerId)) continue;
      const account = accountByPlayerId(state, client.playerId);
      if (!account) continue;
      seen.add(client.playerId);
      snapshots.push(state.snapshots[client.playerId] ?? snapshotFromProfile(account.profile));
    }
    return snapshots;
  };

  const updateProfile = (account: MultiplayerAccount, patch: MultiplayerStoreProfile): MultiplayerPlayerProfile => {
    account.profile = {
      ...account.profile,
      ...patch,
      playerId: account.playerId,
      username: account.username,
      displayName: account.displayName,
      updatedAt: nowIso()
    };
    for (const session of state.coopMissions) {
      if (session.status !== "active" || session.hostPlayerId !== account.playerId) continue;
      const mission = patch.activeMissions.find((candidate) => candidate.id === session.missionId);
      if (!mission) continue;
      session.mission = mission;
      session.updatedAt = Date.now();
      session.message = "Host mission state synchronized.";
      broadcast({ type: "coop-updated", session }, [session.hostPlayerId, session.guestPlayerId]);
    }
    if (Array.from(clients.values()).some((client) => client.playerId === account.playerId)) {
      const snapshot = snapshotFromProfile(account.profile);
      state.snapshots[account.playerId] = snapshot;
      broadcast({ type: "remote-player", player: snapshot });
    }
    state.snapshotId += 1;
    maybeSave();
    return account.profile;
  };

  const server = createServer(async (request, response) => {
    if (request.method === "OPTIONS") {
      writeNoContent(response);
      return;
    }

    const url = getUrl(request);
    try {
      if (request.method === "GET" && url.pathname === "/health") {
        writeJson(response, 200, { ok: true, accounts: state.accounts.length, online: clients.size, snapshotId: state.snapshotId });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/multiplayer/register") {
        const body = await readJsonBody<MultiplayerAuthRequest>(request);
        const username = sanitizeUsername(body.username ?? "");
        if (!username || !body.password || body.password.length < 4) {
          writeJson(response, 400, { ok: false, message: "Username and password are required." });
          return;
        }
        if (state.accounts.some((account) => account.username === username)) {
          writeJson(response, 409, { ok: false, message: "Username already exists." });
          return;
        }
        const playerId = randomUUID();
        const salt = randomBytes(16).toString("hex");
        const token = randomBytes(32).toString("hex");
        const displayName = body.displayName?.trim() || username;
        const account: MultiplayerAccount = {
          playerId,
          username,
          displayName,
          passwordSalt: salt,
          passwordHash: hashPassword(body.password, salt),
          sessions: [{ token, createdAt: Date.now(), lastSeenAt: Date.now() }],
          profile: createProfile(playerId, username, displayName)
        };
        state.accounts.push(account);
        state.snapshotId += 1;
        save();
        writeJson(response, 200, {
          ok: true,
          message: "Registered.",
          session: publicSession(account, token, url.origin),
          profile: account.profile
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/multiplayer/login") {
        const body = await readJsonBody<MultiplayerAuthRequest>(request);
        const username = sanitizeUsername(body.username ?? "");
        const account = state.accounts.find((candidate) => candidate.username === username);
        if (!account || !verifyPassword(body.password ?? "", account.passwordSalt, account.passwordHash)) {
          writeJson(response, 401, { ok: false, message: "Invalid username or password." });
          return;
        }
        const token = randomBytes(32).toString("hex");
        account.sessions = [...account.sessions.slice(-4), { token, createdAt: Date.now(), lastSeenAt: Date.now() }];
        save();
        writeJson(response, 200, {
          ok: true,
          message: "Logged in.",
          session: publicSession(account, token, url.origin),
          profile: account.profile
        });
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/multiplayer/session") {
        const account = ensureAuthenticated(state, request);
        if (!account) {
          writeJson(response, 401, { ok: false, message: "Session expired." });
          return;
        }
        writeJson(response, 200, {
          ok: true,
          message: "Session restored.",
          session: publicSession(account, tokenFromRequest(request)!, url.origin),
          profile: account.profile
        });
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/multiplayer/snapshot") {
        const account = ensureAuthenticated(state, request);
        if (!account) {
          writeJson(response, 401, { ok: false, message: "Session expired." });
          return;
        }
        writeJson(response, 200, cleanPublicSnapshot(state, account.playerId, activeRemoteSnapshots(account.playerId)));
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/multiplayer/profile") {
        const account = ensureAuthenticated(state, request);
        if (!account) {
          writeJson(response, 401, { ok: false, message: "Session expired." });
          return;
        }
        const body = await readJsonBody<MultiplayerStoreProfile>(request);
        const profile = updateProfile(account, body);
        broadcastProfile(account);
        writeJson(response, 200, { ok: true, message: "Profile saved.", profile });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/multiplayer/trade/create") {
        const account = ensureAuthenticated(state, request);
        const body = await readJsonBody<{ partnerPlayerId: string; stationId: string }>(request);
        const partner = accountByPlayerId(state, body.partnerPlayerId);
        if (!account || !sameStation(account, partner, body.stationId)) {
          writeJson(response, 400, { ok: false, message: "Both pilots must be docked at the same station." });
          return;
        }
        const existing = state.trades.find((trade) =>
          trade.status === "pending" &&
          trade.stationId === body.stationId &&
          trade.playerIds.includes(account.playerId) &&
          trade.playerIds.includes(body.partnerPlayerId)
        );
        const trade = existing ?? {
          id: randomUUID(),
          stationId: body.stationId,
          playerIds: [account.playerId, body.partnerPlayerId] as [string, string],
          offers: {
            [account.playerId]: normalizeTradeOffer(),
            [body.partnerPlayerId]: normalizeTradeOffer()
          },
          confirmedBy: [],
          status: "pending" as const,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        if (!existing) state.trades.push(trade);
        save();
        broadcast({ type: "trade-updated", trade }, trade.playerIds);
        writeJson(response, 200, { ok: true, message: "Trade opened.", trade });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/multiplayer/trade/update") {
        const account = ensureAuthenticated(state, request);
        const body = await readJsonBody<{ tradeId: string; offer: MultiplayerTradeOffer }>(request);
        const trade = state.trades.find((candidate) => candidate.id === body.tradeId);
        if (!account || !trade || !trade.playerIds.includes(account.playerId) || trade.status !== "pending") {
          writeJson(response, 404, { ok: false, message: "Trade not found." });
          return;
        }
        const offer = normalizeTradeOffer(body.offer);
        const invalid = validateOffer(account, offer);
        if (invalid) {
          writeJson(response, 400, { ok: false, message: invalid });
          return;
        }
        trade.offers = { ...trade.offers, [account.playerId]: offer };
        trade.confirmedBy = [];
        trade.updatedAt = Date.now();
        save();
        broadcast({ type: "trade-updated", trade }, trade.playerIds);
        writeJson(response, 200, { ok: true, message: "Trade offer updated.", trade });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/multiplayer/trade/confirm") {
        const account = ensureAuthenticated(state, request);
        const body = await readJsonBody<{ tradeId: string }>(request);
        const trade = state.trades.find((candidate) => candidate.id === body.tradeId);
        if (!account || !trade || !trade.playerIds.includes(account.playerId) || trade.status !== "pending") {
          writeJson(response, 404, { ok: false, message: "Trade not found." });
          return;
        }
        trade.confirmedBy = Array.from(new Set([...trade.confirmedBy, account.playerId]));
        if (trade.confirmedBy.length === 2) {
          const result = tryCommitTrade(state, trade);
          if (!result.ok) {
            trade.confirmedBy = [];
            trade.message = result.message;
            trade.updatedAt = Date.now();
          }
        }
        save();
        broadcast({ type: "trade-updated", trade }, trade.playerIds);
        for (const playerId of trade.playerIds) {
          const updated = accountByPlayerId(state, playerId);
          if (updated) broadcastProfile(updated);
        }
        writeJson(response, 200, { ok: true, message: trade.message ?? "Trade confirmed.", trade });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/multiplayer/trade/cancel") {
        const account = ensureAuthenticated(state, request);
        const body = await readJsonBody<{ tradeId: string }>(request);
        const trade = state.trades.find((candidate) => candidate.id === body.tradeId);
        if (!account || !trade || !trade.playerIds.includes(account.playerId)) {
          writeJson(response, 404, { ok: false, message: "Trade not found." });
          return;
        }
        trade.status = "canceled";
        trade.message = "Trade canceled.";
        trade.updatedAt = Date.now();
        save();
        broadcast({ type: "trade-updated", trade }, trade.playerIds);
        writeJson(response, 200, { ok: true, message: "Trade canceled.", trade });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/multiplayer/mission-invite") {
        const account = ensureAuthenticated(state, request);
        const body = await readJsonBody<{ guestPlayerId: string; stationId: string; mission: MissionDefinition }>(request);
        const guest = accountByPlayerId(state, body.guestPlayerId);
        if (!account || !sameStation(account, guest, body.stationId)) {
          writeJson(response, 400, { ok: false, message: "Both pilots must be docked at the same station." });
          return;
        }
        if (!body.mission?.id) {
          writeJson(response, 400, { ok: false, message: "Mission is required." });
          return;
        }
        const session: CoopMissionSession = {
          id: randomUUID(),
          missionInstanceId: randomUUID(),
          missionId: body.mission.id,
          stationId: body.stationId,
          hostPlayerId: account.playerId,
          guestPlayerId: body.guestPlayerId,
          mission: body.mission,
          status: "pending",
          collaboratorRewardCredits: Math.max(1, Math.round(body.mission.reward * COOP_REWARD_MULTIPLIER)),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          message: "Mission invite pending."
        };
        state.coopMissions.push(session);
        save();
        broadcast({ type: "coop-updated", session }, [account.playerId, body.guestPlayerId]);
        writeJson(response, 200, { ok: true, message: "Mission invite sent.", session });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/multiplayer/mission-invite/respond") {
        const account = ensureAuthenticated(state, request);
        const body = await readJsonBody<{ sessionId: string; accept: boolean }>(request);
        const session = state.coopMissions.find((candidate) => candidate.id === body.sessionId);
        if (!account || !session || session.guestPlayerId !== account.playerId || session.status !== "pending") {
          writeJson(response, 404, { ok: false, message: "Mission invite not found." });
          return;
        }
        session.status = body.accept ? "active" : "canceled";
        session.message = body.accept ? "Co-op mission joined." : "Mission invite declined.";
        session.updatedAt = Date.now();
        save();
        broadcast({ type: "coop-updated", session }, [session.hostPlayerId, session.guestPlayerId]);
        writeJson(response, 200, { ok: true, message: session.message, session });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/multiplayer/mission/complete") {
        const account = ensureAuthenticated(state, request);
        const body = await readJsonBody<{ sessionId: string }>(request);
        const session = state.coopMissions.find((candidate) => candidate.id === body.sessionId);
        if (!account || !session || session.hostPlayerId !== account.playerId || session.status !== "active") {
          writeJson(response, 404, { ok: false, message: "Active co-op mission not found." });
          return;
        }
        const guest = accountByPlayerId(state, session.guestPlayerId);
        if (guest) {
          guest.profile = {
            ...guest.profile,
            updatedAt: nowIso(),
            player: {
              ...guest.profile.player,
              credits: guest.profile.player.credits + session.collaboratorRewardCredits
            }
          };
        }
        session.status = "completed";
        session.message = `Co-op mission complete. Collaborator paid ${session.collaboratorRewardCredits} credits.`;
        session.updatedAt = Date.now();
        state.snapshotId += 1;
        save();
        broadcast({ type: "coop-updated", session }, [session.hostPlayerId, session.guestPlayerId]);
        if (guest) broadcastProfile(guest);
        writeJson(response, 200, { ok: true, message: session.message, session });
        return;
      }

      writeJson(response, 404, { ok: false, message: "Route not found." });
    } catch (error) {
      writeJson(response, 500, { ok: false, message: error instanceof Error ? error.message : "Multiplayer server error." });
    }
  });

  server.on("upgrade", (request, socket) => {
    const tcpSocket = socket as Socket;
    const url = getUrl(request);
    if (url.pathname !== "/api/multiplayer/events") {
      tcpSocket.destroy();
      return;
    }
    const account = accountByToken(state, tokenFromRequest(request, url));
    const key = request.headers["sec-websocket-key"];
    if (!account || typeof key !== "string") {
      tcpSocket.destroy();
      return;
    }
    const accept = createHash("sha1")
      .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
      .digest("base64");
    tcpSocket.write([
      "HTTP/1.1 101 Switching Protocols",
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Accept: ${accept}`,
      "",
      ""
    ].join("\r\n"));
    const client: WsClient = { id: randomUUID(), playerId: account.playerId, socket: tcpSocket, pending: Buffer.alloc(0) };
    clients.set(client.id, client);
    send(client, { type: "session", session: publicSession(account, tokenFromRequest(request, url)!, url.origin), profile: account.profile });
    send(client, { type: "remote-players", players: activeRemoteSnapshots(account.playerId) });
    const cleanupClient = () => {
      if (!clients.delete(client.id)) return;
      if (!Array.from(clients.values()).some((candidate) => candidate.playerId === account.playerId)) {
        delete state.snapshots[account.playerId];
        broadcast({ type: "remote-player-left", playerId: account.playerId });
      }
    };
    tcpSocket.on("data", (chunk) => {
      client.pending = Buffer.concat([client.pending, Buffer.from(chunk)]);
      const decoded = decodeWsMessages(client.pending);
      client.pending = decoded.remaining;
      for (const message of decoded.messages) {
        try {
          const event = JSON.parse(message) as { type?: string; snapshot?: RemotePlayerSnapshot; profile?: MultiplayerStoreProfile };
          if (event.type === "player-snapshot" && event.snapshot) {
            const snapshot: RemotePlayerSnapshot = {
              ...event.snapshot,
              playerId: account.playerId,
              username: account.username,
              displayName: account.displayName,
              updatedAt: Date.now()
            };
            state.snapshots[account.playerId] = snapshot;
            account.profile.currentSystemId = snapshot.currentSystemId;
            account.profile.currentStationId = snapshot.currentStationId;
            account.profile.player = {
              ...account.profile.player,
              shipId: snapshot.shipId,
              position: [...snapshot.position],
              velocity: [...snapshot.velocity],
              rotation: [...snapshot.rotation],
              hull: snapshot.hull,
              shield: snapshot.shield
            };
            account.profile.updatedAt = nowIso();
            broadcast({ type: "remote-player", player: snapshot });
            maybeSave();
          } else if (event.type === "profile" && event.profile) {
            updateProfile(account, event.profile);
            broadcastProfile(account);
          }
        } catch {
          send(client, { type: "error", message: "Malformed multiplayer event." });
        }
      }
    });
    tcpSocket.on("close", cleanupClient);
    tcpSocket.on("end", cleanupClient);
    tcpSocket.on("error", cleanupClient);
  });

  return {
    server,
    stateFile,
    getState: () => state,
    setState: (next) => {
      state = next;
    },
    save,
    close: () =>
      new Promise((resolveClose, reject) => {
        for (const client of clients.values()) client.socket.destroy();
        clients.clear();
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
  const port = Number(process.env.GOF2_MULTIPLAYER_PORT ?? DEFAULT_PORT);
  const host = process.env.GOF2_MULTIPLAYER_HOST ?? "127.0.0.1";
  const stateFile = process.env.GOF2_MULTIPLAYER_STATE_FILE;
  const app = createMultiplayerHttpServer({ stateFile });
  app.server.listen(port, host, () => {
    console.log(`GOF2 multiplayer server listening on http://${host}:${port}`);
    console.log(`Multiplayer state: ${app.stateFile}`);
  });
}
