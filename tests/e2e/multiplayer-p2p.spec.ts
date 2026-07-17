import { expect, test, type Page } from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createMultiplayerHttpServer, type MultiplayerHttpServer } from "../../server/multiplayerServer";

let activeServer: MultiplayerHttpServer | undefined;
let activeTempDir: string | undefined;
let multiplayerBaseUrl = "";

test.beforeAll(async () => {
  activeTempDir = mkdtempSync(join(tmpdir(), "gof2-e2e-multiplayer-"));
  activeServer = createMultiplayerHttpServer({
    stateFile: join(activeTempDir, "multiplayer-state.json"),
    autosaveMs: 0
  });
  await new Promise<void>((resolve, reject) => {
    activeServer!.server.once("error", reject);
    activeServer!.server.listen(0, "127.0.0.1", () => {
      activeServer!.server.off("error", reject);
      const address = activeServer!.server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Expected TCP multiplayer server address."));
        return;
      }
      multiplayerBaseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

test.afterAll(async () => {
  if (activeServer) await activeServer.close();
  activeServer = undefined;
  if (activeTempDir) rmSync(activeTempDir, { recursive: true, force: true });
  activeTempDir = undefined;
});

async function resetMultiplayerPage(page: Page, networkMode: "client-server" | "peer-to-peer") {
  await page.addInitScript(({ mode, apiUrl }) => {
    localStorage.setItem("gof2-e2e-disable-economy-backend", "true");
    localStorage.setItem("gof2-by-pzy-multiplayer-settings", JSON.stringify({ networkMode: mode }));
    localStorage.setItem("gof2-e2e-multiplayer-api-url", apiUrl);
  }, { mode: networkMode, apiUrl: multiplayerBaseUrl });
  await page.goto("/?gof2E2E=1");
  await page.evaluate(({ mode, apiUrl }) => {
    localStorage.clear();
    localStorage.setItem("gof2-e2e-disable-economy-backend", "true");
    localStorage.setItem("gof2-by-pzy-multiplayer-settings", JSON.stringify({ networkMode: mode }));
    localStorage.setItem("gof2-e2e-multiplayer-api-url", apiUrl);
  }, { mode: networkMode, apiUrl: multiplayerBaseUrl });
  await page.reload();
  await page.waitForFunction(() => !!window.__GOF2_E2E__);
}

async function registerPilot(page: Page, username: string) {
  await page.evaluate(async (pilotName) => {
    const state = window.__GOF2_E2E__!.getState() as {
      multiplayerRegister: (request: { username: string; password: string; displayName: string }) => Promise<void>;
    };
    await state.multiplayerRegister({ username: pilotName, password: "pass1234", displayName: pilotName.toUpperCase() });
  }, username);
  await expect.poll(() =>
    page.evaluate(() => (window.__GOF2_E2E__!.getState() as { multiplayerStatus: string }).multiplayerStatus)
  ).toBe("connected");
  return page.evaluate(() => (window.__GOF2_E2E__!.getState() as { multiplayerSession?: { playerId: string } }).multiplayerSession!.playerId);
}

test("delayed profile sync cannot roll the local player back to an old position", async ({ page }) => {
  await resetMultiplayerPage(page, "client-server");
  await registerPilot(page, `rollback-${Date.now()}`);
  await page.waitForTimeout(150);

  let delayed = false;
  await page.route("**/api/multiplayer/profile", async (route) => {
    if (!delayed) {
      delayed = true;
      await new Promise((resolve) => setTimeout(resolve, 700));
    }
    await route.continue();
  });

  await page.evaluate(() => {
    const e2e = window.__GOF2_E2E__!;
    const state = e2e.getState() as {
      player: Record<string, unknown>;
      syncMultiplayerProfile: () => Promise<void>;
    };
    e2e.setState({
      player: {
        ...state.player,
        position: [10, 0, -10],
        velocity: [0, 0, 0],
        rotation: [0, 0.2, 0]
      }
    });
    void (e2e.getState() as typeof state).syncMultiplayerProfile();
    const latest = e2e.getState() as typeof state;
    e2e.setState({
      player: {
        ...latest.player,
        position: [900, 12, -440],
        velocity: [0, 0, 0],
        rotation: [0.1, 1.4, 0.2]
      }
    });
  });

  await page.waitForTimeout(1200);
  await expect.poll(() =>
    page.evaluate(() => (window.__GOF2_E2E__!.getState() as { player: { position: number[] } }).player.position)
  ).not.toEqual([10, 0, -10]);
  const position = await page.evaluate(() => (window.__GOF2_E2E__!.getState() as { player: { position: number[] } }).player.position);
  expect(position[0]).toBeGreaterThan(800);
  expect(position[2]).toBeLessThan(-300);
});

test("P2P mode sends movement over DataChannel between browser clients", async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  try {
    await resetMultiplayerPage(pageA, "peer-to-peer");
    await resetMultiplayerPage(pageB, "peer-to-peer");
    const aliceId = await registerPilot(pageA, `p2p-a-${Date.now()}`);
    await registerPilot(pageB, `p2p-b-${Date.now()}`);

    await expect.poll(async () => {
      await pageA.evaluate(() => {
        const e2e = window.__GOF2_E2E__!;
        const state = e2e.getState() as {
          player: Record<string, unknown>;
          sendMultiplayerSnapshot: () => void;
        };
        e2e.setState({
          player: {
            ...state.player,
            position: [321, 5, -123],
            velocity: [6, 0, -3],
            rotation: [0, 1.1, 0]
          }
        });
        (e2e.getState() as typeof state).sendMultiplayerSnapshot();
      });
      return pageB.evaluate((remoteId) => {
        const state = window.__GOF2_E2E__!.getState() as { remotePlayers: Array<{ playerId: string; position: number[] }> };
        return state.remotePlayers.find((player) => player.playerId === remoteId)?.position[0] ?? 0;
      }, aliceId);
    }, { timeout: 20_000, intervals: [250, 500, 750] }).toBeGreaterThan(300);
    const remotePosition = await pageB.evaluate((remoteId) => {
      const state = window.__GOF2_E2E__!.getState() as { remotePlayers: Array<{ playerId: string; position: number[] }> };
      return state.remotePlayers.find((player) => player.playerId === remoteId)?.position;
    }, aliceId);
    expect(remotePosition).toBeDefined();
    expect(remotePosition![0]).toBeGreaterThan(300);
    expect(remotePosition![1]).toBe(5);
    expect(remotePosition![2]).toBeLessThan(-100);

    expect(activeServer!.getState().snapshots[aliceId]?.position).not.toEqual([321, 5, -123]);
  } finally {
    await contextA.close();
    await contextB.close();
  }
});

test("P2P mode reports WebRTC failure without WebSocket movement fallback", async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  try {
    await pageA.addInitScript(() => {
      Object.defineProperty(window, "RTCPeerConnection", { value: undefined, configurable: true });
    });
    await resetMultiplayerPage(pageA, "peer-to-peer");
    await resetMultiplayerPage(pageB, "peer-to-peer");
    const aliceId = await registerPilot(pageA, `p2p-fail-a-${Date.now()}`);
    await registerPilot(pageB, `p2p-fail-b-${Date.now()}`);

    await expect.poll(() =>
      pageA.evaluate(() => (window.__GOF2_E2E__!.getState() as { multiplayerStatus: string }).multiplayerStatus)
    ).toBe("error");
    await expect.poll(() =>
      pageA.evaluate(() => (window.__GOF2_E2E__!.getState() as { multiplayerError?: string }).multiplayerError ?? "")
    ).toContain("WebRTC");

    await pageA.evaluate(() => {
      const e2e = window.__GOF2_E2E__!;
      const state = e2e.getState() as {
        player: Record<string, unknown>;
        sendMultiplayerSnapshot: () => void;
      };
      e2e.setState({ player: { ...state.player, position: [777, 0, -777] } });
      (e2e.getState() as typeof state).sendMultiplayerSnapshot();
    });
    await pageA.waitForTimeout(500);
    expect(activeServer!.getState().snapshots[aliceId]?.position).not.toEqual([777, 0, -777]);
  } finally {
    await contextA.close();
    await contextB.close();
  }
});
