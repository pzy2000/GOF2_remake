import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { planets, systems } from "../../src/data/world";
import type { Locale } from "../../src/i18n";

const shouldUpdateScreenshots = process.env.GOF2_UPDATE_README_SCREENSHOTS === "1";
const screenshotRoot = resolve(process.cwd(), "docs/screenshots");
const knownSystemIds = systems.map((system) => system.id);
const knownPlanetIds = planets.map((planet) => planet.id);
const screenshotLocales: Array<{ locale: Locale; dir: string }> = [
  { locale: "en", dir: "" },
  { locale: "zh-CN", dir: "zh-CN" },
  { locale: "zh-TW", dir: "zh-TW" },
  { locale: "ja", dir: "ja" },
  { locale: "fr", dir: "fr" }
];

test.describe("README screenshots", () => {
  test.skip(!shouldUpdateScreenshots, "Set GOF2_UPDATE_README_SCREENSHOTS=1 to refresh README screenshots.");
  test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

  for (const { locale, dir } of screenshotLocales) {
    test(`updates the README showcase image set for ${locale}`, async ({ page }) => {
      await resetApp(page);
      await expect(page.getByRole("heading", { name: "GOF2 by pzy" })).toBeVisible();
      await page.locator(".language-select select").selectOption(locale);
      await capture(page, dir, "main-menu.png");

      await page.locator(".menu-actions .primary").click();
      await expect(page.locator(".flight-canvas canvas")).toBeVisible();
      await expect(page.locator(".hud-top-left")).toBeVisible();
      await page.waitForTimeout(300);
      await capture(page, dir, "flight-hud.png");

      await setStation(page, "helion-reach", "helion-prime", "Market");
      await expect(page.locator(".table-panel")).toBeVisible();
      await capture(page, dir, "station-market.png");

      await setGalaxyMap(page);
      await expect(page.locator(".galaxy-panel")).toBeVisible();
      await capture(page, dir, "galaxy-map.png");

      await setStation(page, "vantara", "vantara-bastion", "Shipyard", { showcaseShipyard: true });
      await expect(page.locator(".shipyard-panel")).toBeVisible();
      await expect(page.locator(".shipyard-panel .ship-card").nth(2)).toBeVisible();
      await capture(page, dir, "shipyard-careers.png");
    });
  }
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

async function capture(page: Page, dir: string, filename: string) {
  await page.evaluate(() => document.fonts.ready);
  const path = resolve(screenshotRoot, dir, filename);
  mkdirSync(dirname(path), { recursive: true });
  await page.screenshot({
    path,
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
