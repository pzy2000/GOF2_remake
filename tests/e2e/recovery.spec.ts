import { expect, test, type Page } from "@playwright/test";

async function openTestApp(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("gof2-e2e-disable-economy-backend", "true");
  });
  await page.goto("/?gof2E2E=1");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("gof2-e2e-disable-economy-backend", "true");
  });
  await page.reload();
  await page.waitForFunction(() => !!window.__GOF2_E2E__);
  await page.evaluate(() => {
    const state = window.__GOF2_E2E__!.getState() as { stopEconomyStream: () => void };
    state.stopEconomyStream();
  });
}

async function expectRecovery(page: Page, reason: "invalid-route" | "unexpected-error") {
  const recovery = page.getByTestId("game-recovery");
  await expect(recovery).toBeVisible();
  await expect(recovery).toHaveAttribute("data-recovery-reason", reason);
  await expect(recovery.getByRole("heading", { name: "Unable to continue" })).toBeVisible();
  await expect(recovery.getByRole("button", { name: "Reload game" })).toBeVisible();
  await expect.poll(() => page.locator("#root").evaluate((root) => root.childElementCount)).toBeGreaterThan(0);
}

async function reloadFromRecovery(page: Page) {
  await page.getByRole("button", { name: "Reload game" }).click();
  await page.waitForFunction(() => !!window.__GOF2_E2E__);
  await expect(page.getByTestId("game-recovery")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "GOF2 by pzy" })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await openTestApp(page);
});

test("top-level boundary keeps a recovery action mounted without clearing saves", async ({ page }) => {
  const savedEntries = await page.evaluate(() => {
    const state = window.__GOF2_E2E__!.getState() as {
      newGame: () => void;
      closeDialogue: () => void;
      saveGame: (slot: "manual-1") => void;
    };
    state.newGame();
    state.closeDialogue();
    state.saveGame("manual-1");
    return Object.fromEntries(
      Object.entries(localStorage).filter(([key]) => key.startsWith("gof2-by-pzy-save"))
    );
  });

  await page.evaluate(() => {
    window.__GOF2_E2E__!.setState({ activeMissions: null });
  });

  await expectRecovery(page, "unexpected-error");
  await reloadFromRecovery(page);
  await expect.poll(() => page.evaluate(() => Object.fromEntries(
    Object.entries(localStorage).filter(([key]) => key.startsWith("gof2-by-pzy-save"))
  ))).toEqual(savedEntries);
});

test("invalid game routes render recovery instead of a blank or crashing screen", async ({ page }) => {
  const cases: Array<{ name: string; state: Record<string, unknown> }> = [
    {
      name: "empty station",
      state: { screen: "station", currentSystemId: "helion-reach", currentStationId: "" }
    },
    {
      name: "unknown station",
      state: { screen: "station", currentSystemId: "helion-reach", currentStationId: "helion-prime-decommissioned" }
    },
    {
      name: "non-string station",
      state: { screen: "station", currentSystemId: "helion-reach", currentStationId: { badStation: 404 } }
    },
    {
      name: "station from another system",
      state: { screen: "station", currentSystemId: "helion-reach", currentStationId: "kuro-deep" }
    },
    {
      name: "unknown system",
      state: { screen: "flight", currentSystemId: "helion-reach-missing", currentStationId: undefined }
    },
    {
      name: "non-string system",
      state: { screen: "flight", currentSystemId: { badSystem: 404 }, currentStationId: undefined }
    },
    {
      name: "unknown screen",
      state: { screen: "crash", currentSystemId: "helion-reach", currentStationId: undefined }
    }
  ];

  for (const scenario of cases) {
    await test.step(scenario.name, async () => {
      await page.evaluate((state) => window.__GOF2_E2E__!.setState(state), scenario.state);
      await expectRecovery(page, "invalid-route");
      await reloadFromRecovery(page);
    });
  }
});
