import { expect, test, type Page } from "@playwright/test";

type Gof2E2EState = {
  currentSystemId: string;
  currentStationId?: string;
  player: {
    credits: number;
    cargo: Record<string, number | undefined>;
  };
  activeMissions: Array<{ id: string }>;
};

async function resetApp(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => !!window.__GOF2_E2E__);
}

async function startNewGame(page: Page) {
  await expect(page.getByRole("heading", { name: "GOF2 by pzy" })).toBeVisible();
  await page.getByRole("button", { name: "New Game" }).click();
  await expect(page.locator(".flight-canvas canvas")).toBeVisible();
  await expect(page.getByText("Helion Reach")).toBeVisible();
}

async function getGameState(page: Page): Promise<Gof2E2EState> {
  return page.evaluate(() => {
    const state = window.__GOF2_E2E__!.getState() as Gof2E2EState;
    return {
      currentSystemId: state.currentSystemId,
      currentStationId: state.currentStationId,
      player: {
        credits: state.player.credits,
        cargo: { ...state.player.cargo }
      },
      activeMissions: state.activeMissions.map((mission) => ({ id: mission.id }))
    };
  });
}

async function expectWebGlCanvasHasPixels(page: Page) {
  const canvas = page.locator(".flight-canvas canvas");
  await expect(canvas).toBeVisible();
  const screenshot = await canvas.screenshot();
  const uniqueBytes = new Set(screenshot).size;
  expect(screenshot.length).toBeGreaterThan(8_000);
  expect(uniqueBytes).toBeGreaterThan(80);
}

async function dockAtStation(page: Page, stationId: string) {
  await page.evaluate((targetStationId) => {
    const state = window.__GOF2_E2E__!.getState() as { dockAt: (stationId: string) => void };
    state.dockAt(targetStationId);
  }, stationId);
}

async function expectRouteActionInsideStationBody(page: Page) {
  const routeButton = page.getByRole("button", { name: "Set Route" });
  await expect(routeButton).toBeVisible();
  await expect(routeButton).toBeEnabled();

  const metrics = await page.evaluate(() => {
    const routeButton = [...document.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Set Route");
    const stationBody = document.querySelector(".station-body");
    const details = document.querySelector(".galaxy-details");
    const actions = document.querySelector(".galaxy-actions");
    if (!routeButton || !stationBody || !details || !actions) return null;
    const routeRect = routeButton.getBoundingClientRect();
    const bodyRect = stationBody.getBoundingClientRect();
    const detailsRect = details.getBoundingClientRect();
    const actionsRect = actions.getBoundingClientRect();
    return {
      actionsBottom: actionsRect.bottom,
      bodyBottom: bodyRect.bottom,
      bodyTop: bodyRect.top,
      detailsBottom: detailsRect.bottom,
      routeBottom: routeRect.bottom,
      routeTop: routeRect.top,
      viewportHeight: window.innerHeight
    };
  });

  expect(metrics).not.toBeNull();
  expect(metrics!.routeTop).toBeGreaterThanOrEqual(metrics!.bodyTop);
  expect(metrics!.routeBottom).toBeLessThanOrEqual(Math.min(metrics!.bodyBottom, metrics!.viewportHeight));
  expect(metrics!.actionsBottom).toBeLessThanOrEqual(metrics!.detailsBottom);
}

test.describe("browser smoke", () => {
  test("starts flight and renders a non-empty WebGL scene", async ({ page }) => {
    await resetApp(page);
    await startNewGame(page);

    await expectWebGlCanvasHasPixels(page);
    await expect(page.locator(".ship-model-status")).toHaveCount(0);
  });

  test("covers station trade, mission accept, jump, save, and reload", async ({ page }) => {
    await resetApp(page);
    await startNewGame(page);

    await page.evaluate(() => {
      const state = window.__GOF2_E2E__!.getState() as { dockAt: (stationId: string) => void };
      state.dockAt("helion-prime");
    });
    await expect(page.getByRole("heading", { name: "Helion Prime Exchange" })).toBeVisible();

    const basicFoodRow = page.getByTestId("market-row-basic-food");
    await expect(basicFoodRow).toContainText("Basic Food");
    await basicFoodRow.getByRole("button", { name: "Buy" }).click();
    expect((await getGameState(page)).player.cargo["basic-food"]).toBe(4);
    await basicFoodRow.getByRole("button", { name: "Sell" }).click();
    expect((await getGameState(page)).player.cargo["basic-food"]).toBe(3);

    await page.getByRole("button", { name: "Mission Board" }).click();
    const storyMission = page.getByTestId("mission-card-story-clean-carrier");
    await expect(storyMission).toContainText("Glass Wake 01: Clean Carrier");
    await storyMission.getByRole("button", { name: "Accept" }).click();
    expect((await getGameState(page)).activeMissions.map((mission) => mission.id)).toContain("story-clean-carrier");

    await page.getByRole("button", { name: "Launch" }).click();
    await expect(page.locator(".flight-canvas canvas")).toBeVisible();
    await page.evaluate(() => {
      const state = window.__GOF2_E2E__!.getState() as { jumpToSystem: (systemId: string) => void };
      state.jumpToSystem("kuro-belt");
    });
    await expect(page.locator(".hud-top-left")).toContainText("Kuro Belt");
    expect((await getGameState(page)).currentSystemId).toBe("kuro-belt");

    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Game saved to auto.")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.locator(".hud-top-left")).toContainText("Kuro Belt");
    expect((await getGameState(page)).currentSystemId).toBe("kuro-belt");
  });

  test("keeps the station galaxy route action visible at desktop zoom", async ({ page }) => {
    for (const viewport of [
      { width: 2048, height: 1138 },
      { width: 2048, height: 1330 }
    ]) {
      await page.setViewportSize(viewport);
      await resetApp(page);
      await startNewGame(page);
      await dockAtStation(page, "helion-prime");
      await expect(page.getByRole("heading", { name: "Helion Prime Exchange" })).toBeVisible();

      await page.getByRole("button", { name: "Galaxy Map" }).click();
      await page.getByRole("button", { name: "Mirr Vale known" }).click();
      await expectRouteActionInsideStationBody(page);
    }
  });

  test("keeps hangar content from overlapping save slots", async ({ page }) => {
    await page.setViewportSize({ width: 2048, height: 1138 });
    await resetApp(page);
    await startNewGame(page);
    await dockAtStation(page, "helion-prime");

    await page.getByRole("button", { name: "Hangar" }).click();
    await expect(page.getByRole("heading", { name: "Current Ship" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Save Slots" })).toBeVisible();

    const metrics = await page.evaluate(() => {
      const repairButton = [...document.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Repair Hull and Refill Missiles");
      const hangarGrid = document.querySelector(".hangar-build-grid");
      const saveSlots = document.querySelector(".save-slots-panel");
      if (!repairButton || !hangarGrid || !saveSlots) return null;
      const repairRect = repairButton.getBoundingClientRect();
      const hangarRect = hangarGrid.getBoundingClientRect();
      const saveRect = saveSlots.getBoundingClientRect();
      return {
        hangarBottom: hangarRect.bottom,
        repairBottom: repairRect.bottom,
        saveTop: saveRect.top
      };
    });

    expect(metrics).not.toBeNull();
    expect(metrics!.repairBottom).toBeLessThanOrEqual(metrics!.saveTop);
    expect(metrics!.hangarBottom).toBeLessThanOrEqual(metrics!.saveTop);
  });
});
