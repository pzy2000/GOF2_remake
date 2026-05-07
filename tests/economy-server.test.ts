import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { get } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { createEconomyHttpServer, type EconomyHttpServer } from "../server/economyServer";
import { shipById } from "../src/data/world";
import type { EconomySnapshot, PlayerTradeResponse } from "../src/types/economy";
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
});
