import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { missionTemplates } from "../src/data/world";
import { createInitialPlayer } from "../src/state/domains/runtimeFactory";
import type { MultiplayerAuthResponse, MultiplayerPlayerProfile, RemotePlayerSnapshot, TradeSession } from "../src/types/multiplayer";
import { createMultiplayerHttpServer, type MultiplayerHttpServer } from "../server/multiplayerServer";

let activeServer: MultiplayerHttpServer | undefined;
let activeTempDir: string | undefined;

async function startServer() {
  activeTempDir = mkdtempSync(join(tmpdir(), "gof2-multiplayer-"));
  activeServer = createMultiplayerHttpServer({
    stateFile: join(activeTempDir, "multiplayer-state.json"),
    autosaveMs: 0
  });
  await new Promise<void>((resolve) => activeServer!.server.listen(0, "127.0.0.1", resolve));
  const address = activeServer.server.address();
  if (!address || typeof address === "string") throw new Error("Expected TCP test server.");
  return {
    app: activeServer,
    baseUrl: `http://127.0.0.1:${address.port}`,
    wsUrl: `ws://127.0.0.1:${address.port}`
  };
}

async function register(baseUrl: string, username: string): Promise<MultiplayerAuthResponse> {
  const response = await fetch(`${baseUrl}/api/multiplayer/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password: "pass1234", displayName: username.toUpperCase() })
  });
  expect(response.ok).toBe(true);
  return await response.json() as MultiplayerAuthResponse;
}

async function updateProfile(baseUrl: string, token: string, patch: Partial<MultiplayerPlayerProfile>) {
  const session = await fetch(`${baseUrl}/api/multiplayer/session`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const current = await session.json() as MultiplayerAuthResponse;
  const response = await fetch(`${baseUrl}/api/multiplayer/profile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      ...current.profile!,
      ...patch
    })
  });
  expect(response.ok).toBe(true);
  return await response.json() as { ok: boolean; profile: MultiplayerPlayerProfile };
}

function openSocket(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    socket.addEventListener("open", () => resolve(socket), { once: true });
    socket.addEventListener("error", () => reject(new Error("socket failed")), { once: true });
  });
}

function waitForSocketMessage<T>(socket: WebSocket, predicate: (event: T) => boolean): Promise<T> {
  return new Promise((resolve) => {
    const listener = (message: MessageEvent) => {
      const parsed = JSON.parse(String(message.data)) as T;
      if (!predicate(parsed)) return;
      socket.removeEventListener("message", listener);
      resolve(parsed);
    };
    socket.addEventListener("message", listener);
  });
}

afterEach(async () => {
  if (activeServer) await activeServer.close();
  activeServer = undefined;
  if (activeTempDir) rmSync(activeTempDir, { recursive: true, force: true });
  activeTempDir = undefined;
});

describe("multiplayer HTTP and WebSocket server", () => {
  it("registers, logs in, restores sessions, and stores password hashes", async () => {
    const { app, baseUrl } = await startServer();
    const first = await register(baseUrl, "pilot-a");
    expect(first.session?.token).toBeTruthy();
    expect(first.profile?.player.credits).toBe(1500);

    const badLogin = await fetch(`${baseUrl}/api/multiplayer/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "pilot-a", password: "wrong" })
    });
    expect(badLogin.status).toBe(401);

    const login = await fetch(`${baseUrl}/api/multiplayer/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "pilot-a", password: "pass1234" })
    });
    expect(login.ok).toBe(true);
    const loggedIn = await login.json() as MultiplayerAuthResponse;
    expect(loggedIn.session?.playerId).toBe(first.session?.playerId);

    const restored = await fetch(`${baseUrl}/api/multiplayer/session`, {
      headers: { Authorization: `Bearer ${loggedIn.session!.token}` }
    });
    expect(restored.ok).toBe(true);
    expect(app.getState().accounts[0].passwordHash).not.toBe("pass1234");
  });

  it("broadcasts remote player snapshots over WebSocket without creating combat entities", async () => {
    const { baseUrl, wsUrl } = await startServer();
    const alice = await register(baseUrl, "alice");
    const bob = await register(baseUrl, "bob");
    const aliceSocket = await openSocket(`${wsUrl}/api/multiplayer/events?token=${alice.session!.token}`);
    const bobSocket = await openSocket(`${wsUrl}/api/multiplayer/events?token=${bob.session!.token}`);
    await waitForSocketMessage<{ type: string }>(bobSocket, (event) => event.type === "session");

    const snapshot: RemotePlayerSnapshot = {
      playerId: alice.session!.playerId,
      username: "alice",
      displayName: "ALICE",
      shipId: "sparrow-mk1",
      currentSystemId: "helion-reach",
      position: [12, 0, 42],
      velocity: [1, 0, 0],
      rotation: [0, 0.2, 0],
      hull: 80,
      shield: 40,
      updatedAt: Date.now()
    };
    const remoteEvent = waitForSocketMessage<{ type: string; player?: RemotePlayerSnapshot }>(
      bobSocket,
      (event) => event.type === "remote-player" && event.player?.playerId === alice.session!.playerId
    );
    aliceSocket.send(JSON.stringify({ type: "player-snapshot", snapshot }));
    const received = await remoteEvent;

    expect(received.player).toMatchObject({ playerId: alice.session!.playerId, currentSystemId: "helion-reach" });
    expect(activeServer!.getState().snapshots[alice.session!.playerId]).toBeDefined();
    aliceSocket.close();
    bobSocket.close();
  });

  it("commits station trades atomically and rejects non-station trades", async () => {
    const { baseUrl } = await startServer();
    const alice = await register(baseUrl, "trade-a");
    const bob = await register(baseUrl, "trade-b");
    const alicePlayer = { ...createInitialPlayer(), credits: 2000, equipmentInventory: { "plasma-cannon": 1 } };
    const bobPlayer = { ...createInitialPlayer(), credits: 900, equipmentInventory: { "shield-booster": 1 } };
    await updateProfile(baseUrl, alice.session!.token, { currentStationId: "helion-prime", player: alicePlayer });
    await updateProfile(baseUrl, bob.session!.token, { currentStationId: "mirr-lattice", currentSystemId: "mirr-vale", player: bobPlayer });

    const rejected = await fetch(`${baseUrl}/api/multiplayer/trade/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${alice.session!.token}` },
      body: JSON.stringify({ partnerPlayerId: bob.session!.playerId, stationId: "helion-prime" })
    });
    expect(rejected.status).toBe(400);

    await updateProfile(baseUrl, bob.session!.token, { currentStationId: "helion-prime", currentSystemId: "helion-reach", player: bobPlayer });
    const created = await fetch(`${baseUrl}/api/multiplayer/trade/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${alice.session!.token}` },
      body: JSON.stringify({ partnerPlayerId: bob.session!.playerId, stationId: "helion-prime" })
    });
    expect(created.ok).toBe(true);
    const trade = (await created.json() as { trade: TradeSession }).trade;

    await fetch(`${baseUrl}/api/multiplayer/trade/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${alice.session!.token}` },
      body: JSON.stringify({ tradeId: trade.id, offer: { credits: 300, equipment: { "plasma-cannon": 1 } } })
    });
    await fetch(`${baseUrl}/api/multiplayer/trade/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${bob.session!.token}` },
      body: JSON.stringify({ tradeId: trade.id, offer: { credits: 120, equipment: { "shield-booster": 1 } } })
    });
    await fetch(`${baseUrl}/api/multiplayer/trade/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${alice.session!.token}` },
      body: JSON.stringify({ tradeId: trade.id })
    });
    const committed = await fetch(`${baseUrl}/api/multiplayer/trade/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${bob.session!.token}` },
      body: JSON.stringify({ tradeId: trade.id })
    });
    const committedTrade = await committed.json() as { trade: TradeSession };
    expect(committedTrade.trade.status).toBe("completed");

    const aliceAfter = activeServer!.getState().accounts.find((account) => account.playerId === alice.session!.playerId)!.profile.player;
    const bobAfter = activeServer!.getState().accounts.find((account) => account.playerId === bob.session!.playerId)!.profile.player;
    expect(aliceAfter.credits).toBe(1820);
    expect(aliceAfter.equipmentInventory?.["plasma-cannon"]).toBeUndefined();
    expect(aliceAfter.equipmentInventory?.["shield-booster"]).toBe(1);
    expect(bobAfter.credits).toBe(1080);
    expect(bobAfter.equipmentInventory?.["plasma-cannon"]).toBe(1);
  });

  it("keeps co-op story progress on the host and pays collaborators only", async () => {
    const { baseUrl } = await startServer();
    const host = await register(baseUrl, "host");
    const guest = await register(baseUrl, "guest");
    const mission = missionTemplates.find((candidate) => candidate.id === "story-clean-carrier")!;
    await updateProfile(baseUrl, host.session!.token, {
      currentStationId: "helion-prime",
      activeMissions: [{ ...mission, accepted: true, acceptedAt: 0 }]
    });
    await updateProfile(baseUrl, guest.session!.token, { currentStationId: "helion-prime" });

    const invite = await fetch(`${baseUrl}/api/multiplayer/mission-invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${host.session!.token}` },
      body: JSON.stringify({ guestPlayerId: guest.session!.playerId, stationId: "helion-prime", mission })
    });
    expect(invite.ok).toBe(true);
    const session = (await invite.json() as { session: { id: string; collaboratorRewardCredits: number } }).session;
    await fetch(`${baseUrl}/api/multiplayer/mission-invite/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${guest.session!.token}` },
      body: JSON.stringify({ sessionId: session.id, accept: true })
    });
    const completed = await fetch(`${baseUrl}/api/multiplayer/mission/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${host.session!.token}` },
      body: JSON.stringify({ sessionId: session.id })
    });
    expect(completed.ok).toBe(true);
    const guestProfile = activeServer!.getState().accounts.find((account) => account.playerId === guest.session!.playerId)!.profile;
    expect(guestProfile.completedMissionIds).not.toContain(mission.id);
    expect(guestProfile.player.credits).toBe(1500 + session.collaboratorRewardCredits);
  });
});
