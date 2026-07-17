import { expect, test, type Page } from "@playwright/test";

const THREE_NUMERIC_ERROR = /LineSegmentsGeometry|computeBoundingSphere|computed radius is NaN|\bNaN\b|\bInfinity\b/i;

async function startFlight(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("gof2-e2e-hook", "enabled");
    localStorage.setItem("gof2-e2e-disable-economy-backend", "true");
  });
  await page.goto("/?gof2E2E=1");
  await page.waitForFunction(() => typeof window.__GOF2_E2E__?.getState === "function");
  await page.evaluate(() => {
    const state = window.__GOF2_E2E__!.getState() as {
      newGame: () => void;
      closeDialogue: () => void;
      stopEconomyStream: () => void;
    };
    state.newGame();
    state.closeDialogue();
    state.stopEconomyStream();
  });
  await expect(page.locator(".flight-canvas canvas")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__GOF2_RENDER_HEARTBEAT_FRAME__ ?? 0)).toBeGreaterThan(0);
}

function collectNumericRenderErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => {
    if (THREE_NUMERIC_ERROR.test(String(error))) errors.push(String(error));
  });
  page.on("console", (message) => {
    if (message.type() === "error" && THREE_NUMERIC_ERROR.test(message.text())) errors.push(message.text());
  });
  return errors;
}

async function expectRendererToStayLive(page: Page, previousFrame: number, errors: string[]) {
  await expect.poll(() => page.evaluate(() => window.__GOF2_RENDER_HEARTBEAT_FRAME__ ?? 0)).toBeGreaterThan(previousFrame);
  await expect(page.locator("#root")).not.toBeEmpty();
  await expect(page.locator(".flight-canvas canvas")).toBeVisible();
  await page.waitForTimeout(400);
  expect(errors).toEqual([]);
}

test("#12 repairs invalid live speed, hull, energy capacity, and throttle before the flight tick", async ({ page }) => {
  const errors = collectNumericRenderErrors(page);
  await startFlight(page);
  const previousFrame = await page.evaluate(() => window.__GOF2_RENDER_HEARTBEAT_FRAME__ ?? 0);

  await page.evaluate(() => {
    const hook = window.__GOF2_E2E__!;
    const state = hook.getState() as { player: Record<string, unknown> };
    const player = state.player as { stats: Record<string, unknown> };
    hook.setState({
      screen: "flight",
      currentSystemId: "helion-reach",
      currentStationId: undefined,
      player: {
        ...player,
        stats: {
          ...player.stats,
          energy: -Number.MAX_VALUE,
          speed: "invalid-speed-value"
        },
        hull: "invalid-hull-value",
        position: [0, 0, 86.12266562375656],
        velocity: [0, 0, -41.29668764301197],
        rotation: [0, 0, 0],
        throttle: Number.MAX_VALUE
      }
    });
  });

  await expect.poll(() => page.evaluate(() => {
    const player = (window.__GOF2_E2E__!.getState() as {
      player: {
        stats: { speed: unknown; energy: unknown };
        hull: unknown;
        energy: unknown;
        throttle: unknown;
        position: unknown[];
        velocity: unknown[];
        rotation: unknown[];
      };
    }).player;
    const numbers = [
      player.stats.speed,
      player.stats.energy,
      player.hull,
      player.energy,
      player.throttle,
      ...player.position,
      ...player.velocity,
      ...player.rotation
    ];
    return {
      allBounded: numbers.every((value) => typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER),
      speed: player.stats.speed,
      energyLimit: player.stats.energy,
      hull: player.hull,
      energy: player.energy,
      throttle: player.throttle
    };
  })).toEqual({ allBounded: true, speed: 170, energyLimit: 0, hull: 100, energy: 0, throttle: 1 });
  await expectRendererToStayLive(page, previousFrame, errors);
});

test("#55 rejects oversized live positions before they reach Drei lines", async ({ page }) => {
  const errors = collectNumericRenderErrors(page);
  await startFlight(page);
  const previousFrame = await page.evaluate(() => window.__GOF2_RENDER_HEARTBEAT_FRAME__ ?? 0);

  await page.evaluate(() => {
    const hook = window.__GOF2_E2E__!;
    const state = hook.getState() as { player: Record<string, unknown> };
    hook.setState({
      screen: "flight",
      currentSystemId: "helion-reach",
      currentStationId: undefined,
      player: {
        ...state.player,
        position: [Number.MAX_VALUE, -Number.MAX_VALUE, Number.MAX_VALUE],
        velocity: [0, 0, -41.069737319475244],
        rotation: [0, 0, 0],
        throttle: 0.25
      }
    });
  });

  await expect.poll(() => page.evaluate(() => {
    const position = (window.__GOF2_E2E__!.getState() as { player: { position: unknown[] } }).player.position;
    return position.every((value) => typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER);
  })).toBe(true);
  await expectRendererToStayLive(page, previousFrame, errors);
});
