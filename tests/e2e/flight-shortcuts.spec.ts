import { expect, test, type Page } from "@playwright/test";

async function startFlight(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("gof2-e2e-disable-economy-backend", "true");
  });
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("gof2-e2e-disable-economy-backend", "true");
  });
  await page.reload();
  await page.waitForFunction(() => !!window.__GOF2_E2E__);
  await page.getByRole("button", { name: "New Game" }).click();
  await expect(page.locator(".flight-canvas canvas")).toBeVisible();
  await page.evaluate(() => {
    const state = window.__GOF2_E2E__!.getState() as { activeDialogue?: unknown; closeDialogue: () => void; stopEconomyStream: () => void };
    if (state.activeDialogue) state.closeDialogue();
    state.stopEconomyStream();
  });
}

test("flight command buttons expose visible shortcuts and route keys to the right screen", async ({ page }) => {
  await startFlight(page);

  await expect(page.locator(".ultimate-skill .shortcut-keycap")).toHaveAttribute("data-shortcut", "G");
  await expect(page.locator(".hud-bottom-right .button-shortcut[data-shortcut='M']")).toBeVisible();
  await expect(page.locator(".hud-bottom-right .button-shortcut[data-shortcut='Ctrl+S']")).toBeVisible();
  await expect(page.locator(".hud-bottom-right .button-shortcut[data-shortcut='Esc']")).toBeVisible();

  await page.keyboard.press("Control+S");
  await expect.poll(() => page.evaluate(() => (window.__GOF2_E2E__!.getState() as { hasSave: boolean }).hasSave)).toBe(true);

  await page.keyboard.press("m");
  await expect.poll(() => page.evaluate(() => (window.__GOF2_E2E__!.getState() as { screen: string }).screen)).toBe("galaxyMap");
  await expect(page.locator(".galaxy-controls .button-shortcut[data-shortcut='R']")).toBeVisible();
  await expect(page.locator(".galaxy-controls .button-shortcut[data-shortcut='Esc']")).toBeVisible();
  await expect(page.locator(".galaxy-actions .button-shortcut[data-shortcut='Enter']")).toBeVisible();

  await page.keyboard.down("w");
  await page.keyboard.up("w");
  await expect.poll(() => page.evaluate(() => (window.__GOF2_E2E__!.getState() as { input: { throttleUp: boolean } }).input.throttleUp)).toBe(false);

  await page.keyboard.press("Escape");
  await expect.poll(() => page.evaluate(() => (window.__GOF2_E2E__!.getState() as { screen: string }).screen)).toBe("flight");

  await page.keyboard.press("Escape");
  await expect.poll(() => page.evaluate(() => (window.__GOF2_E2E__!.getState() as { screen: string }).screen)).toBe("pause");
  await expect(page.locator(".menu-actions .button-shortcut[data-shortcut='Esc']")).toBeVisible();
  await expect(page.locator(".menu-actions .button-shortcut[data-shortcut='Ctrl+S']")).toBeVisible();
  await expect(page.locator(".menu-actions .button-shortcut[data-shortcut='Ctrl+R']")).toBeVisible();
  await expect(page.locator(".menu-actions .button-shortcut[data-shortcut='Ctrl+M']")).toBeVisible();
});
