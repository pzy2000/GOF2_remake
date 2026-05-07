import { expect, test, type Page } from "@playwright/test";

type Gof2E2EState = {
  screen: string;
  currentSystemId: string;
  currentStationId?: string;
  autopilot?: {
    phase: string;
    targetStationId: string;
    targetSystemId: string;
  };
  player: {
    credits: number;
    cargo: Record<string, number | undefined>;
    unlockedBlueprintIds?: string[];
  };
  activeMissions: Array<{ id: string }>;
};

type ExplorationScanE2E = {
  signalId: string;
  frequency: number;
  progress: number;
  inBand: boolean;
  distance: number;
};

type ScanKeyboardState = {
  screen: string;
  afterburner: boolean;
  scan?: ExplorationScanE2E;
};

type TestSpeechHarness = {
  endCurrent: () => void;
  endLastCanceled: () => void;
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
  await expect(page.locator(".dock-hint")).toBeVisible();
  await expect(page.locator(".station-tech-label").first()).toContainText("TECH");
}

async function getGameState(page: Page): Promise<Gof2E2EState> {
  return page.evaluate(() => {
    const state = window.__GOF2_E2E__!.getState() as Gof2E2EState;
    return {
      screen: state.screen,
      currentSystemId: state.currentSystemId,
      currentStationId: state.currentStationId,
      autopilot: state.autopilot
        ? {
            phase: state.autopilot.phase,
            targetStationId: state.autopilot.targetStationId,
            targetSystemId: state.autopilot.targetSystemId
          }
        : undefined,
      player: {
        credits: state.player.credits,
        cargo: { ...state.player.cargo },
        unlockedBlueprintIds: [...(state.player.unlockedBlueprintIds ?? [])]
      },
      activeMissions: state.activeMissions.map((mission) => ({ id: mission.id }))
    };
  });
}

async function getScanKeyboardState(page: Page): Promise<ScanKeyboardState> {
  return page.evaluate(() => {
    const state = window.__GOF2_E2E__!.getState() as {
      screen: string;
      input: { afterburner: boolean };
      runtime: { explorationScan?: ExplorationScanE2E };
    };
    return {
      screen: state.screen,
      afterburner: state.input.afterburner,
      scan: state.runtime.explorationScan ? { ...state.runtime.explorationScan } : undefined
    };
  });
}

async function installSpeechSynthesisStub(page: Page) {
  await page.addInitScript(() => {
    type FakeUtterance = {
      text: string;
      lang: string;
      pitch: number;
      rate: number;
      volume: number;
      voice: SpeechSynthesisVoice | null;
      onend: (() => void) | null;
      onerror: (() => void) | null;
    };

    class FakeSpeechSynthesisUtterance implements FakeUtterance {
      lang = "";
      pitch = 1;
      rate = 1;
      volume = 1;
      voice: SpeechSynthesisVoice | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;

      constructor(public text: string) {}
    }

    const harness = {
      current: undefined as FakeUtterance | undefined,
      lastCanceled: undefined as FakeUtterance | undefined,
      endCurrent() {
        const utterance = this.current;
        this.current = undefined;
        synthesis.speaking = false;
        utterance?.onend?.();
      },
      endLastCanceled() {
        const utterance = this.lastCanceled;
        this.lastCanceled = undefined;
        utterance?.onend?.();
      }
    };
    const synthesis = {
      speaking: false,
      paused: false,
      getVoices: () => [{ lang: "en-US" }],
      speak: (utterance: FakeUtterance) => {
        harness.current = utterance;
        synthesis.speaking = true;
        synthesis.paused = false;
      },
      cancel: () => {
        if (harness.current) harness.lastCanceled = harness.current;
        harness.current = undefined;
        synthesis.speaking = false;
        synthesis.paused = false;
      },
      pause: () => {
        synthesis.paused = true;
      },
      resume: () => {
        synthesis.paused = false;
      }
    };

    Object.defineProperty(window, "SpeechSynthesisUtterance", { value: FakeSpeechSynthesisUtterance, configurable: true });
    Object.defineProperty(window, "speechSynthesis", { value: synthesis, configurable: true });
    Object.defineProperty(window, "__GOF2_TEST_SPEECH__", { value: harness, configurable: true });
  });
}

async function endCurrentVoice(page: Page) {
  await page.evaluate(() => {
    (window as unknown as { __GOF2_TEST_SPEECH__: TestSpeechHarness }).__GOF2_TEST_SPEECH__.endCurrent();
  });
}

async function endLastCanceledVoice(page: Page) {
  await page.evaluate(() => {
    (window as unknown as { __GOF2_TEST_SPEECH__: TestSpeechHarness }).__GOF2_TEST_SPEECH__.endLastCanceled();
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

async function acceptCleanCarrierMission(page: Page) {
  await dockAtStation(page, "helion-prime");
  await expect(page.getByRole("heading", { name: "Helion Prime Exchange" })).toBeVisible();
  await page.getByRole("button", { name: "Mission Board" }).click();
  const storyMission = page.getByTestId("mission-card-story-clean-carrier");
  await expect(storyMission).toContainText("Glass Wake 01: Clean Carrier");
  await storyMission.getByRole("button", { name: "Accept" }).click();
  await expect(page.getByTestId("dialogue-overlay")).toContainText("Clean Carrier Briefing");
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

async function expectGalaxyPlanetListReadable(page: Page, selectedTitle?: string) {
  const metrics = await page.evaluate(() => {
    const details = document.querySelector(".galaxy-details");
    const list = document.querySelector(".planet-list");
    const selected = document.querySelector(".planet-list button.selected");
    const selectedName = selected?.querySelector("span");
    const selectedMeta = selected?.querySelector("small");
    if (!details || !list || !selected || !selectedName || !selectedMeta) return null;
    const detailsRect = details.getBoundingClientRect();
    const listRect = list.getBoundingClientRect();
    const selectedRect = selected.getBoundingClientRect();
    const nameRect = selectedName.getBoundingClientRect();
    const metaRect = selectedMeta.getBoundingClientRect();
    const listStyle = getComputedStyle(list);
    return {
      detailsWidth: detailsRect.width,
      listRight: listRect.right,
      nameBottom: nameRect.bottom,
      nameHeight: nameRect.height,
      nameText: selectedName.textContent,
      nameTop: nameRect.top,
      metaBottom: metaRect.bottom,
      selectedRight: selectedRect.right,
      selectedBottom: selectedRect.bottom,
      selectedTop: selectedRect.top,
      scrollbarGutter: listStyle.scrollbarGutter
    };
  });

  expect(metrics).not.toBeNull();
  if (selectedTitle) expect(metrics!.nameText).toBe(selectedTitle);
  expect(metrics!.detailsWidth).toBeGreaterThanOrEqual(300);
  expect(metrics!.scrollbarGutter).toContain("stable");
  expect(metrics!.nameHeight).toBeGreaterThan(12);
  expect(metrics!.nameTop).toBeGreaterThanOrEqual(metrics!.selectedTop);
  expect(metrics!.nameBottom).toBeLessThan(metrics!.metaBottom);
  expect(metrics!.selectedRight).toBeLessThanOrEqual(metrics!.listRight);
  expect(metrics!.metaBottom).toBeLessThanOrEqual(metrics!.selectedBottom + 1);
}

test.describe("browser smoke", () => {
  test("starts flight and renders a non-empty WebGL scene", async ({ page }) => {
    await resetApp(page);
    await startNewGame(page);

    await expectWebGlCanvasHasPixels(page);
    await expect(page.locator(".ship-model-status")).toHaveCount(0);
  });

  test("tunes active frequency scans from the keyboard", async ({ page }) => {
    await resetApp(page);
    await startNewGame(page);

    await page.evaluate(() => {
      const state = window.__GOF2_E2E__!.getState() as { runtime: Record<string, unknown> };
      window.__GOF2_E2E__!.setState({
        screen: "flight",
        runtime: {
          ...state.runtime,
          explorationScan: {
            signalId: "quiet-signal-sundog-lattice",
            frequency: 27,
            progress: 0,
            inBand: false,
            distance: 0
          }
        }
      });
    });

    await expect(page.locator(".scan-panel")).toContainText("Frequency Scan");
    expect((await getScanKeyboardState(page)).scan?.frequency).toBe(27);

    await page.keyboard.press("ArrowRight");
    expect((await getScanKeyboardState(page)).scan?.frequency).toBe(28);

    await page.keyboard.press("Shift+ArrowRight");
    expect((await getScanKeyboardState(page)).scan?.frequency).toBe(33);
    expect((await getScanKeyboardState(page)).afterburner).toBe(false);

    await page.keyboard.press("ArrowLeft");
    expect((await getScanKeyboardState(page)).scan?.frequency).toBe(32);

    await page.keyboard.press("Shift+ArrowLeft");
    expect((await getScanKeyboardState(page)).scan?.frequency).toBe(27);

    await page.keyboard.press("Escape");
    await expect(page.locator(".scan-panel")).toHaveCount(0);
    expect(await getScanKeyboardState(page)).toMatchObject({
      screen: "flight",
      scan: undefined
    });

    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: "Flight Suspended" })).toBeVisible();
    expect(await getScanKeyboardState(page)).toMatchObject({
      screen: "pause",
      scan: undefined
    });
  });

  test("renders visible economy NPC mining status in flight", async ({ page }) => {
    await resetApp(page);
    await startNewGame(page);

    await page.evaluate(() => {
      const current = window.__GOF2_E2E__!.getState() as {
        runtime: {
          asteroids: Array<{ id: string; resource: string; position: [number, number, number] }>;
          enemies: unknown[];
        };
      };
      const asteroid = current.runtime.asteroids[0];
      window.__GOF2_E2E__!.setState({
        runtime: {
          ...current.runtime,
          enemies: [
            ...current.runtime.enemies,
            {
              id: "econ-e2e-miner",
              name: "Ore Cutter",
              role: "miner",
              factionId: "free-belt-union",
              position: [0, 12, 20],
              velocity: [0, 0, 0],
              hull: 125,
              shield: 58,
              maxHull: 125,
              maxShield: 58,
              lastDamageAt: -999,
              fireCooldown: 0.6,
              aiProfileId: "miner",
              aiState: "patrol",
              aiTimer: 0,
              economyTaskKind: "mining",
              economyStatus: "MINING · Iron",
              economyCargo: {},
              economyCommodityId: asteroid.resource,
              economyTargetId: asteroid.id
            }
          ]
        }
      });
    });

    await expect(page.getByText("MINING · Iron")).toBeVisible();
  });

  test("auto-advances voiced story dialogue when each line ends", async ({ page }) => {
    await installSpeechSynthesisStub(page);
    await resetApp(page);
    await startNewGame(page);
    await acceptCleanCarrierMission(page);

    const dialogue = page.getByTestId("dialogue-overlay");
    await expect(dialogue).toContainText("Captain, Helion traffic is handing you a clean sync key.");

    await endCurrentVoice(page);
    await expect(dialogue).toContainText("That is a lot of purity for one missing probe.");

    await endCurrentVoice(page);
    await expect(dialogue).toContainText("Purity is the point.");

    await endCurrentVoice(page);
    await expect(dialogue).toContainText("Advisory: a weak ghost ping is nested in the launch queue.");

    await endCurrentVoice(page);
    await expect(dialogue).toContainText("Then keep your receiver open and your mouth shut until Sera sees the key.");

    await endCurrentVoice(page);
    await expect(dialogue).toHaveCount(0);
  });

  test("does not auto-skip from canceled story dialogue speech", async ({ page }) => {
    await installSpeechSynthesisStub(page);
    await resetApp(page);
    await startNewGame(page);
    await acceptCleanCarrierMission(page);

    const dialogue = page.getByTestId("dialogue-overlay");
    await dialogue.getByRole("button", { name: "Next" }).click();
    await expect(dialogue).toContainText("That is a lot of purity for one missing probe.");

    await endLastCanceledVoice(page);
    await expect(dialogue).toContainText("That is a lot of purity for one missing probe.");
    await expect(dialogue).not.toContainText("Purity is the point.");

    await dialogue.getByRole("button", { name: "Skip" }).click();
    await endLastCanceledVoice(page);
    await expect(dialogue).toHaveCount(0);
  });

  test("covers station trade, mission accept, jump, save, and reload", async ({ page }) => {
    await resetApp(page);
    await startNewGame(page);

    await page.evaluate(() => {
      const state = window.__GOF2_E2E__!.getState() as { dockAt: (stationId: string) => void };
      state.dockAt("helion-prime");
    });
    await expect(page.getByRole("heading", { name: "Helion Prime Exchange" })).toBeVisible();
    await expect(page.locator(".station-header")).toContainText("Tech Level 2");

    const basicFoodRow = page.getByTestId("market-row-basic-food");
    await expect(basicFoodRow).toContainText("Basic Food");
    await expect(page.locator(".market-section-title", { hasText: "Equipment" })).toBeVisible();
    await expect(page.getByTestId("market-equipment-row-pulse-laser")).toContainText("Pulse Laser");
    await basicFoodRow.getByRole("button", { name: "Buy" }).click();
    expect((await getGameState(page)).player.cargo["basic-food"]).toBe(4);
    await basicFoodRow.getByRole("button", { name: "Sell" }).click();
    expect((await getGameState(page)).player.cargo["basic-food"]).toBe(3);

    await page.getByRole("button", { name: "Blueprint Workshop" }).click();
    const plasmaBlueprint = page.getByTestId("blueprint-card-plasma-cannon");
    await expect(plasmaBlueprint).toContainText("Researchable");
    await plasmaBlueprint.getByRole("button", { name: "Research" }).click();
    await expect(plasmaBlueprint).toContainText("Unlocked");
    expect((await getGameState(page)).player.unlockedBlueprintIds).toContain("plasma-cannon");

    await page.getByRole("button", { name: "Mission Board" }).click();
    const storyMission = page.getByTestId("mission-card-story-clean-carrier");
    await expect(storyMission).toContainText("Glass Wake 01: Clean Carrier");
    await storyMission.getByRole("button", { name: "Accept" }).click();
    await expect(page.getByTestId("dialogue-overlay")).toContainText("Clean Carrier Briefing");
    await expect(page.getByTestId("speaker-portrait-helion-handler")).toBeVisible();
    await expect(page.getByTestId("speaker-portrait-helion-handler")).toHaveAttribute("src", /\/assets\/generated\/portraits\/helion-handler\.webp$/);
    await expect(page.getByTestId("dialogue-overlay")).toContainText("Captain, Helion traffic is handing you a clean sync key. It has never touched");
    await page.getByTestId("dialogue-overlay").getByRole("button", { name: "Skip" }).click();
    await expect(page.getByTestId("dialogue-overlay")).toHaveCount(0);
    expect((await getGameState(page)).activeMissions.map((mission) => mission.id)).toContain("story-clean-carrier");

    await page.getByRole("button", { name: "Launch" }).click();
    await expect(page.locator(".flight-canvas canvas")).toBeVisible();
    await expect(page.locator(".hud-bottom-right")).toContainText("Launch vector clear");
    await expect(page.locator(".dock-hint")).toBeVisible();
    await page.evaluate(() => {
      const state = window.__GOF2_E2E__!.getState() as { jumpToSystem: (systemId: string) => void };
      state.jumpToSystem("kuro-belt");
    });
    await expect(page.locator(".hud-top-left")).toContainText("Kuro Belt");
    expect((await getGameState(page)).currentSystemId).toBe("kuro-belt");

    await page.getByRole("button", { name: "Save" }).click();
    await expect.poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem("gof2-by-pzy-save-slot:auto") ?? "null")?.currentSystemId)
    ).toBe("kuro-belt");
    await page.reload();
    await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.locator(".hud-top-left")).toContainText("Kuro Belt");
    await expect(page.getByTestId("dialogue-overlay")).toHaveCount(0);
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
      await expectGalaxyPlanetListReadable(page, "Helion Prime");
      await page.getByRole("button", { name: "Mirr Vale known" }).click();
      await expectRouteActionInsideStationBody(page);
      await expectGalaxyPlanetListReadable(page, "Mirr Glass");
    }
  });

  test("opens the flight galaxy map as a route planner from HUD and keyboard", async ({ page }) => {
    await resetApp(page);
    await startNewGame(page);

    await page.keyboard.press("KeyM");
    await expect(page.getByText("Route Planning")).toBeVisible();
    await expect(page.getByRole("button", { name: "Set Route" })).toBeVisible();
    await page.getByRole("button", { name: "Return" }).click();
    await expect(page.locator(".flight-canvas canvas")).toBeVisible();

    await page.locator(".hud-bottom-right").getByRole("button", { name: "Map" }).click();
    await expect(page.getByText("Route Planning")).toBeVisible();
    await page.getByRole("button", { name: "Mirr Vale known" }).click();
    await expect(page.locator(".planet-list button.selected")).toContainText("Tech Level 3");
    await expect(page.locator(".galaxy-actions")).toContainText("Mirr Glass · Mirr Lattice · Tech Level 3");

    const routeButton = page.getByRole("button", { name: "Set Route" });
    await expect(routeButton).toBeEnabled();
    await routeButton.click();

    await expect(page.locator(".flight-canvas canvas")).toBeVisible();
    await expect(page.locator(".hud-top-right")).toContainText("Autopilot: Aligning to gate");
    expect(await getGameState(page)).toMatchObject({
      screen: "flight",
      autopilot: {
        phase: "to-origin-gate",
        targetStationId: "mirr-lattice",
        targetSystemId: "mirr-vale"
      }
    });
  });

  test("delays market equipment details until hover intent or click", async ({ page }) => {
    await page.setViewportSize({ width: 2048, height: 1138 });
    await resetApp(page);
    await startNewGame(page);
    await dockAtStation(page, "hush-array");
    await expect(page.getByRole("heading", { name: "Hush Array" })).toBeVisible();

    const shieldMatrixTrigger = page.getByTestId("market-equipment-row-shield-matrix").locator(".equipment-row-trigger");
    const homingMissileTrigger = page.getByTestId("market-equipment-row-homing-missile").locator(".equipment-row-trigger");
    const shieldBoosterTrigger = page.getByTestId("market-equipment-row-shield-booster").locator(".equipment-row-trigger");
    const popover = page.locator("#equipment-popover");
    const popoverTitle = popover.locator("h3");

    await shieldMatrixTrigger.scrollIntoViewIfNeeded();
    await shieldMatrixTrigger.hover();
    await page.waitForTimeout(500);
    await expect(popover).toHaveCount(0);

    await expect(popoverTitle).toHaveText("Shield Matrix", { timeout: 2500 });
    await expect(page.getByTestId("equipment-comparison")).toContainText("Install Preview");

    await homingMissileTrigger.hover();
    await page.waitForTimeout(500);
    await expect(popover).toHaveCount(0);
    await expect(popoverTitle).toHaveText("Homing Missile", { timeout: 2500 });

    await shieldBoosterTrigger.click();
    await expect(popoverTitle).toHaveText("Shield Booster");
    await expect(popover).toHaveClass(/pinned/);
    await page.locator(".station-header").hover();
    await page.waitForTimeout(500);
    await expect(popoverTitle).toHaveText("Shield Booster");
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
