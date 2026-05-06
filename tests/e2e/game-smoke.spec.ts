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
});
