import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { get } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { createEconomyHttpServer, type EconomyHttpServer } from "../server/economyServer";
import { shipById } from "../src/data/world";
import type { EconomyDispatchDeliveryResponse, EconomyNpcInteractionResponse, EconomyNpcResponse, EconomySnapshot, PlayerTradeResponse } from "../src/types/economy";
import type { PlayerState } from "../src/types/game";

let activeServer: EconomyHttpServer | undefined;
let activeTempDir: string | undefined;

function player(): PlayerState {
  const ship = shipById["sparrow-mk1"];
  return {
    shipId: ship.id,
    stats: ship.stats,
    hull: ship.stats.hull,
    shield: ship.stats.shield,
    energy: ship.stats.energy,
    credits: 1000,
    cargo: {},
    equipment: ship.equipment,
    missiles: 4,
    ownedShips: [ship.id],
    position: [0, 0, 0],
    velocity: [0, 0, 0],
    rotation: [0, 0, 0],
    throttle: 0,
    lastDamageAt: -999
  };
}

async function startServer() {
  activeTempDir = mkdtempSync(join(tmpdir(), "gof2-economy-"));
  activeServer = createEconomyHttpServer({
    stateFile: join(activeTempDir, "economy-state.json"),
    autoTick: false
  });
  await new Promise<void>((resolve) => activeServer!.server.listen(0, "127.0.0.1", resolve));
  const address = activeServer.server.address();
  if (!address || typeof address === "string") throw new Error("Expected TCP test server.");
  return {
    app: activeServer,
    baseUrl: `http://127.0.0.1:${address.port}`
  };
}

afterEach(async () => {
  if (activeServer) await activeServer.close();
  activeServer = undefined;
  if (activeTempDir) rmSync(activeTempDir, { recursive: true, force: true });
  activeTempDir = undefined;
});

describe("economy HTTP server", () => {
  it("serves current-system snapshots", async () => {
    const { baseUrl } = await startServer();
    const response = await fetch(`${baseUrl}/api/economy/snapshot?systemId=kuro-belt`);
    const snapshot = await response.json() as EconomySnapshot;

    expect(response.ok).toBe(true);
    expect(snapshot.status).toBe("connected");
    expect(snapshot.visibleNpcs.some((npc) => npc.role === "miner")).toBe(true);
    expect(snapshot.resourceBelts[0].asteroids.length).toBeGreaterThan(0);
    expect(snapshot.marketState["kuro-deep"]?.iron).toBeDefined();
  });

  it("serves watched NPC state outside the current-system snapshot", async () => {
    const { app, baseUrl } = await startServer();
    const npc = app.getState().npcs.find((candidate) => candidate.id === "econ-helion-reach-freighter-1");
    expect(npc).toBeDefined();
    npc!.systemId = "__transit__";
    npc!.cargo = { "basic-food": 4 };
    npc!.task = {
      kind: "hauling",
      commodityId: "basic-food",
      originStationId: "cinder-yard",
      destinationStationId: "mirr-lattice",
      progress: 0.45,
      startedAt: app.getState().clock
    };
    npc!.statusLabel = "HAULING · Basic Food";

    const response = await fetch(`${baseUrl}/api/economy/npc/econ-helion-reach-freighter-1`);
    const result = await response.json() as EconomyNpcResponse;

    expect(response.ok).toBe(true);
    expect(result.status).toBe("connected");
    expect(result.npc).toMatchObject({
      id: "econ-helion-reach-freighter-1",
      systemId: "__transit__",
      cargo: { "basic-food": 4 },
      task: {
        kind: "hauling",
        destinationStationId: "mirr-lattice",
        progress: 0.45
      }
    });
  });

  it("returns 404 for missing or destroyed watched NPCs", async () => {
    const { app, baseUrl } = await startServer();

    const missing = await fetch(`${baseUrl}/api/economy/npc/not-a-real-npc`);
    expect(missing.status).toBe(404);

    const npc = app.getState().npcs.find((candidate) => candidate.id === "econ-helion-reach-freighter-1");
    expect(npc).toBeDefined();
    npc!.hull = 0;
    npc!.task = { kind: "destroyed", startedAt: app.getState().clock };

    const destroyed = await fetch(`${baseUrl}/api/economy/npc/econ-helion-reach-freighter-1`);
    expect(destroyed.status).toBe(404);
  });

  it("emits an initial SSE connected event", async () => {
    const { baseUrl } = await startServer();
    const payload = await new Promise<string>((resolve, reject) => {
      const request = get(`${baseUrl}/api/economy/events`, (response) => {
        response.setEncoding("utf8");
        let body = "";
        response.on("data", (chunk) => {
          body += chunk;
          if (body.includes("event: connected") && body.includes("\n\n")) {
            request.destroy();
            resolve(body);
          }
        });
      });
      request.on("error", (error: NodeJS.ErrnoException) => {
        if (error.code !== "ECONNRESET") reject(error);
      });
    });

    expect(payload).toContain("Economy stream connected");
  });

  it("processes player trades through the authoritative market state", async () => {
    const { baseUrl } = await startServer();
    const response = await fetch(`${baseUrl}/api/economy/player-trade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "buy",
        stationId: "helion-prime",
        systemId: "helion-reach",
        commodityId: "basic-food",
        amount: 1,
        player: player(),
        reputation: 0,
        reservedCargo: 0
      })
    });
    const result = await response.json() as PlayerTradeResponse;

    expect(response.ok).toBe(true);
    expect(result.ok).toBe(true);
    expect(result.player.cargo["basic-food"]).toBe(1);
    expect(result.marketState["helion-prime"]?.["basic-food"]?.stock).toBeLessThan(
      result.snapshot!.marketState["helion-prime"]!["basic-food"]!.maxStock
    );
  });

  it("persists economy state to JSON and reloads it", async () => {
    const { app } = await startServer();
    app.tick(12);
    app.save();
    const stateFile = app.stateFile;
    await app.close();
    activeServer = undefined;

    activeServer = createEconomyHttpServer({ stateFile, autoTick: false });
    expect(activeServer.getState().clock).toBeGreaterThanOrEqual(12);
  });

  it("resets the authoritative economy state and returns a fresh snapshot", async () => {
    const { app, baseUrl } = await startServer();
    app.tick(12);
    expect(app.getState().clock).toBeGreaterThan(0);

    const response = await fetch(`${baseUrl}/api/economy/reset?systemId=helion-reach`, { method: "POST" });
    const snapshot = await response.json() as EconomySnapshot;

    expect(response.ok).toBe(true);
    expect(snapshot.clock).toBe(0);
    expect(snapshot.snapshotId).toBe(1);
    expect(snapshot.visibleNpcs.some((npc) => npc.id === "econ-helion-reach-miner-3")).toBe(true);
    expect(app.getState().recentEvents).toHaveLength(0);
  });

  it("processes NPC interaction requests and emits interaction events", async () => {
    const { app, baseUrl } = await startServer();
    const npc = app.getState().npcs.find((candidate) => candidate.id === "econ-helion-reach-freighter-1");
    expect(npc).toBeDefined();
    npc!.cargo = { "basic-food": 6 };

    const response = await fetch(`${baseUrl}/api/economy/npc-interaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "rob",
        npcId: npc!.id,
        systemId: "helion-reach"
      })
    });
    const result = await response.json() as EconomyNpcInteractionResponse;

    expect(response.ok).toBe(true);
    expect(result.ok).toBe(true);
    expect(result.event?.type).toBe("npc-interaction");
    expect(result.cargoDropped).toEqual({ "basic-food": 2 });
    expect(result.snapshot?.visibleNpcs.some((candidate) => candidate.id === npc!.id)).toBe(true);

    const missing = await fetch(`${baseUrl}/api/economy/npc-interaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "report",
        npcId: "missing-npc",
        systemId: "helion-reach"
      })
    });
    expect(missing.status).toBe(404);
  });

  it("processes dispatch delivery requests and returns updated snapshots", async () => {
    const { app, baseUrl } = await startServer();
    const entry = app.getState().marketState["helion-prime"]!["basic-food"]!;
    app.getState().marketState["helion-prime"] = {
      ...app.getState().marketState["helion-prime"],
      "basic-food": { ...entry, stock: 1, demand: entry.baselineDemand + 0.5 }
    };

    const response = await fetch(`${baseUrl}/api/economy/dispatch-delivery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        missionId: "market-gap:helion-prime:basic-food:critical",
        systemId: "helion-reach",
        stationId: "helion-prime",
        cargoDelivered: { "basic-food": 3 }
      })
    });
    const result = await response.json() as EconomyDispatchDeliveryResponse;

    expect(response.ok).toBe(true);
    expect(result.ok).toBe(true);
    expect(result.event?.type).toBe("dispatch-delivery");
    expect(result.snapshot?.marketState["helion-prime"]?.["basic-food"]?.stock).toBeGreaterThan(1);

    const invalid = await fetch(`${baseUrl}/api/economy/dispatch-delivery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        missionId: "story-clean-carrier",
        systemId: "helion-reach",
        stationId: "helion-prime",
        cargoDelivered: { "basic-food": 1 }
      })
    });
    expect(invalid.status).toBe(400);
  });
});
