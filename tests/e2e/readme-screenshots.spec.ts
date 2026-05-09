import { expect, test, type Page } from "@playwright/test";
import { resolve } from "node:path";
import { planets, systems } from "../../src/data/world";

const shouldUpdateScreenshots = process.env.GOF2_UPDATE_README_SCREENSHOTS === "1";
const screenshotDir = resolve(process.cwd(), "docs/screenshots");
const knownSystemIds = systems.map((system) => system.id);
const knownPlanetIds = planets.map((planet) => planet.id);

test.describe("README screenshots", () => {
  test.skip(!shouldUpdateScreenshots, "Set GOF2_UPDATE_README_SCREENSHOTS=1 to refresh README screenshots.");
  test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

  test("updates the README showcase image set", async ({ page }) => {
    await resetApp(page);
    await expect(page.getByRole("heading", { name: "GOF2 by pzy" })).toBeVisible();
    await capture(page, "main-menu.png");

    await page.getByRole("button", { name: "New Game" }).click();
    await expect(page.locator(".flight-canvas canvas")).toBeVisible();
    await expect(page.locator(".hud-top-left")).toContainText("Helion Reach");
    await page.waitForTimeout(300);
    await capture(page, "flight-hud.png");

    await setStation(page, "helion-reach", "helion-prime", "Market");
    await expect(page.getByRole("heading", { name: "Helion Prime Exchange" })).toBeVisible();
    await capture(page, "station-market.png");

    await setGalaxyMap(page);
    await expect(page.getByRole("heading", { name: "Galaxy Map" })).toBeVisible();
    await capture(page, "galaxy-map.png");

    await setStation(page, "vantara", "vantara-bastion", "Shipyard", { showcaseShipyard: true });
    await expect(page.getByRole("heading", { name: "Vantara Bastion" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Shipyard" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Prospector Rig" })).toBeVisible();
    await expect(page.getByText("Oreline Stabilizers")).toBeVisible();
    await capture(page, "shipyard-careers.png");
  });
});

async function resetApp(page: Page) {
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
}

async function capture(page: Page, filename: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: resolve(screenshotDir, filename),
    fullPage: false,
    animations: "disabled"
  });
}

async function setStation(
  page: Page,
  systemId: string,
  stationId: string,
  stationTab: string,
  options: { showcaseShipyard?: boolean } = {}
) {
  await page.evaluate(({ systemId, stationId, stationTab, knownSystemIds, knownPlanetIds, showcaseShipyard }) => {
    const e2e = window.__GOF2_E2E__!;
    const state = e2e.getState() as {
      player: Record<string, unknown> & { unlockedBlueprintIds?: string[] };
      reputation: { factions: Record<string, number> };
      runtime: Record<string, unknown>;
    };
    e2e.setState({
      screen: "station",
      previousScreen: "flight",
      currentSystemId: systemId,
      currentStationId: stationId,
      stationTab,
      knownSystems: knownSystemIds,
      knownPlanetIds,
      reputation: showcaseShipyard
        ? {
            ...state.reputation,
            factions: {
              ...state.reputation.factions,
              "solar-directorate": 60,
              "free-belt-union": 60,
              "independent-pirates": 60,
              "mirr-collective": 60,
              "vossari-clans": 60
            }
          }
        : state.reputation,
      player: {
        ...state.player,
        credits: showcaseShipyard ? 120_000 : state.player.credits,
        unlockedBlueprintIds: Array.from(new Set([...(state.player.unlockedBlueprintIds ?? []), "survey-array"]))
      },
      runtime: {
        ...state.runtime,
        message: showcaseShipyard ? "Career hulls available at qualified shipyards." : state.runtime.message
      }
    });
  }, { systemId, stationId, stationTab, knownSystemIds, knownPlanetIds, showcaseShipyard: !!options.showcaseShipyard });
  await page.waitForTimeout(250);
}

async function setGalaxyMap(page: Page) {
  await page.evaluate(({ knownSystemIds, knownPlanetIds }) => {
    const e2e = window.__GOF2_E2E__!;
    const state = e2e.getState() as {
      explorationState: { completedSignalIds: string[]; revealedStationIds: string[] };
    };
    e2e.setState({
      screen: "galaxyMap",
      previousScreen: "flight",
      galaxyMapMode: "station-route",
      knownSystems: knownSystemIds,
      knownPlanetIds,
      explorationState: {
        ...state.explorationState,
        revealedStationIds: Array.from(new Set([
          ...state.explorationState.revealedStationIds,
          "parallax-hermitage",
          "obsidian-foundry",
          "moth-vault",
          "crownshade-observatory"
        ]))
      }
    });
  }, { knownSystemIds, knownPlanetIds });
  await page.waitForTimeout(250);
}
