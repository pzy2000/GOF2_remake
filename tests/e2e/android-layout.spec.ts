import { expect, test, type Page } from "@playwright/test";

type Viewport = { width: number; height: number };

async function resetAndroidLayoutApp(page: Page, viewport: Viewport) {
  await page.setViewportSize(viewport);
  await page.addInitScript(() => {
    localStorage.setItem("gof2-e2e-disable-economy-backend", "true");
    localStorage.setItem("gof2-by-pzy-graphics-settings", JSON.stringify({ quality: "low" }));
  });
  await page.goto("/?gof2E2E=1");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("gof2-e2e-disable-economy-backend", "true");
    localStorage.setItem("gof2-by-pzy-graphics-settings", JSON.stringify({ quality: "low" }));
    document.documentElement.style.setProperty("--safe-area-inset-left", "24px");
    document.documentElement.style.setProperty("--safe-area-inset-right", "32px");
    document.documentElement.style.setProperty("--safe-area-inset-top", "18px");
    document.documentElement.style.setProperty("--safe-area-inset-bottom", "20px");
  });
  await page.reload();
  await page.waitForFunction(() => !!window.__GOF2_E2E__);
}

async function startFlight(page: Page) {
  await page.getByRole("button", { name: /New (Offline )?Game/ }).click();
  await expect(page.locator(".flight-canvas canvas")).toBeVisible();
  await page.evaluate(() => {
    const state = window.__GOF2_E2E__!.getState() as {
      activeDialogue?: unknown;
      closeDialogue: () => void;
      stopEconomyStream: () => void;
    };
    if (state.activeDialogue) state.closeDialogue();
    state.stopEconomyStream();
  });
}

async function expectFlightControlsFit(page: Page, label: string) {
  const result = await page.evaluate(() => {
    const visibleRects = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)]
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { name: element.getAttribute("aria-label") ?? element.className, left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
      });
    const hud = visibleRects(".hud-panel");
    const controls = visibleRects("[data-testid='touch-flight-controls'] button, [data-testid='touch-throttle-pad'], [data-testid='touch-look-pad']");
    const collisions: string[] = [];
    for (const panel of hud) {
      for (const control of controls) {
        const width = Math.max(0, Math.min(panel.right, control.right) - Math.max(panel.left, control.left));
        const height = Math.max(0, Math.min(panel.bottom, control.bottom) - Math.max(panel.top, control.top));
        if (width * height > 1) collisions.push(`${panel.name} / ${control.name}`);
      }
    }
    return {
      controls,
      collisions,
      horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
      inside: [...hud, ...controls].every((rect) => rect.left >= -1 && rect.top >= -1 && rect.right <= innerWidth + 1 && rect.bottom <= innerHeight + 1)
    };
  });
  expect(result.horizontalOverflow, label).toBeLessThanOrEqual(1);
  expect(result.inside, label).toBe(true);
  expect(result.collisions, label).toEqual([]);
  expect(result.controls.length, label).toBeGreaterThanOrEqual(6);
  expect(result.controls.every((control) => control.width >= 48 && control.height >= 48), label).toBe(true);
}

async function expectRoutePlannerFits(page: Page, label: string) {
  await page.getByRole("button", { name: "Open map" }).click();
  await expect(page.getByText("Route Planning")).toBeVisible();
  await page.getByRole("button", { name: "Mirr Vale known" }).click();
  const route = page.getByRole("button", { name: "Set Route" });
  await route.scrollIntoViewIfNeeded();
  await expect(route).toBeVisible();
  const metrics = await route.evaluate((button) => {
    const rect = button.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, right: rect.right, width: rect.width, height: rect.height, viewportWidth: innerWidth, viewportHeight: innerHeight };
  });
  expect(metrics.top, label).toBeGreaterThanOrEqual(0);
  expect(metrics.bottom, label).toBeLessThanOrEqual(metrics.viewportHeight);
  expect(metrics.right, label).toBeLessThanOrEqual(metrics.viewportWidth);
  expect(metrics.width, label).toBeGreaterThanOrEqual(48);
  expect(metrics.height, label).toBeGreaterThanOrEqual(48);
}

async function expectMultiTouchAndCancel(page: Page) {
  const throttle = await page.getByTestId("touch-throttle-pad").boundingBox();
  const fire = await page.getByTestId("touch-fire-primary").boundingBox();
  expect(throttle).not.toBeNull();
  expect(fire).not.toBeNull();
  const session = await page.context().newCDPSession(page);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { id: 11, x: throttle!.x + throttle!.width / 2, y: throttle!.y + throttle!.height * 0.12, radiusX: 4, radiusY: 4, force: 1 },
      { id: 12, x: fire!.x + fire!.width / 2, y: fire!.y + fire!.height / 2, radiusX: 4, radiusY: 4, force: 1 }
    ]
  });
  await expect.poll(() => page.evaluate(() => {
    const input = (window.__GOF2_E2E__!.getState() as { input: { throttleUp: boolean; firePrimary: boolean } }).input;
    return { throttleUp: input.throttleUp, firePrimary: input.firePrimary };
  })).toEqual({ throttleUp: true, firePrimary: true });
  await session.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
  await expect.poll(() => page.evaluate(() => {
    const input = (window.__GOF2_E2E__!.getState() as { input: { throttleUp: boolean; firePrimary: boolean } }).input;
    return { throttleUp: input.throttleUp, firePrimary: input.firePrimary };
  })).toEqual({ throttleUp: false, firePrimary: false });
  await session.detach();
}

test.describe("Android target layouts", () => {
  test.use({ hasTouch: true, isMobile: true });

  test("2748x1172 at 420 dpi (1047x446 dp)", async ({ page }) => {
    const viewport = { width: 1047, height: 446 };
    await resetAndroidLayoutApp(page, viewport);
    await expect(page.getByRole("button", { name: /New (Offline )?Game/ })).toBeVisible();
    await startFlight(page);
    await expectFlightControlsFit(page, "1047x446");
    await expectRoutePlannerFits(page, "1047x446");
  });

  test("2480x2200 at 420 dpi (945x838 dp)", async ({ page }) => {
    const viewport = { width: 945, height: 838 };
    await resetAndroidLayoutApp(page, viewport);
    await startFlight(page);
    await expectFlightControlsFit(page, "945x838");
    await expectMultiTouchAndCancel(page);
    await expectRoutePlannerFits(page, "945x838");
  });

  test("keeps state and the WebGL canvas across outer-to-inner resize", async ({ page }) => {
    await resetAndroidLayoutApp(page, { width: 1047, height: 446 });
    await startFlight(page);
    await page.evaluate(() => {
      const canvas = document.querySelector<HTMLCanvasElement>(".flight-canvas canvas");
      if (canvas) canvas.dataset.androidResizeIdentity = "preserve";
      const state = window.__GOF2_E2E__!.getState() as { saveGame: (slot: "manual-1") => void };
      state.saveGame("manual-1");
    });
    await page.setViewportSize({ width: 945, height: 838 });
    await expect(page.locator("canvas[data-android-resize-identity='preserve']")).toBeVisible();
    await expect.poll(() => page.evaluate(() => {
      const state = window.__GOF2_E2E__!.getState() as { screen: string; hasSave: boolean };
      return { screen: state.screen, hasSave: state.hasSave };
    })).toEqual({ screen: "flight", hasSave: true });
    await expectFlightControlsFit(page, "resized 945x838");
  });

  test("menu and station remain scrollable after reverse rotation", async ({ page }) => {
    await resetAndroidLayoutApp(page, { width: 446, height: 1047 });
    const newGame = page.getByRole("button", { name: /New (Offline )?Game/ });
    await newGame.scrollIntoViewIfNeeded();
    await expect(newGame).toBeVisible();
    await startFlight(page);
    await page.evaluate(() => {
      const state = window.__GOF2_E2E__!.getState() as { dockAt: (stationId: string) => void };
      state.dockAt("helion-prime");
    });
    await page.setViewportSize({ width: 838, height: 945 });
    await expect(page.getByRole("heading", { name: "Helion Prime Exchange" })).toBeVisible();
    await page.evaluate(() => {
      const state = window.__GOF2_E2E__!.getState() as { activeDialogue?: unknown; closeDialogue: () => void };
      if (state.activeDialogue) state.closeDialogue();
    });
    await page.getByRole("button", { name: "Captain's Log" }).scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "Captain's Log" }).click();
    await expect(page.getByTestId("captain-log-next-up")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
});
