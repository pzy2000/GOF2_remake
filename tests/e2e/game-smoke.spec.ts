import { expect, test, type Page } from "@playwright/test";
import { explorationSignalById } from "../../src/data/world";

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
  current?: {
    text: string;
    lang: string;
  };
  endCurrent: () => void;
  endLastCanceled: () => void;
};

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

async function startNewGame(page: Page) {
  await expect(page.getByRole("heading", { name: "GOF2 by pzy" })).toBeVisible();
  await page.getByRole("button", { name: "New Game" }).click();
  await expect(page.locator(".flight-canvas canvas")).toBeVisible();
  await expect(page.locator(".hud-top-left")).toContainText("Helion Reach");
  await expect(page.locator(".dock-hint")).toBeVisible();
  await expect(page.locator(".station-tech-label").first()).toContainText("TECH");
  await page.evaluate(() => {
    const state = window.__GOF2_E2E__!.getState() as { stopEconomyStream: () => void };
    state.stopEconomyStream();
    window.__GOF2_E2E__!.setState({
      economyService: {
        status: "offline",
        url: "http://127.0.0.1:19777",
        lastError: "E2E economy backend disabled."
      }
    });
  });
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

async function completeExplorationSignal(page: Page, signalId: string) {
  const signal = explorationSignalById[signalId];
  const frequency = Math.round((signal.scanBand[0] + signal.scanBand[1]) / 2);
  await page.evaluate(({ systemId, position, frequency, scanTime }) => {
    const e2e = window.__GOF2_E2E__!;
    const state = e2e.getState() as {
      player: Record<string, unknown>;
      runtime: Record<string, unknown>;
    };
    e2e.setState({
      screen: "flight",
      currentSystemId: systemId,
      currentStationId: undefined,
      player: {
        ...state.player,
        position,
        velocity: [0, 0, 0],
        throttle: 0
      },
      runtime: {
        ...state.runtime,
        enemies: [],
        projectiles: [],
        effects: [],
        explorationScan: undefined,
        message: ""
      }
    });
    const active = e2e.getState() as {
      interact: () => void;
      adjustExplorationScanFrequency: (delta: number) => void;
      tick: (delta: number) => void;
      closeDialogue: () => void;
      runtime: { explorationScan?: { frequency: number } };
    };
    active.interact();
    const scan = (e2e.getState() as typeof active).runtime.explorationScan;
    if (!scan) throw new Error("Exploration scan did not start.");
    (e2e.getState() as typeof active).adjustExplorationScanFrequency(frequency - scan.frequency);
    (e2e.getState() as typeof active).tick(scanTime + 0.2);
    (e2e.getState() as typeof active).closeDialogue();
  }, {
    systemId: signal.systemId,
    position: signal.position,
    frequency,
    scanTime: signal.scanTime
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

async function getCurrentVoice(page: Page): Promise<{ text: string; lang: string } | undefined> {
  return page.evaluate(() => {
    const utterance = (window as unknown as { __GOF2_TEST_SPEECH__: TestSpeechHarness }).__GOF2_TEST_SPEECH__.current;
    return utterance ? { text: utterance.text, lang: utterance.lang } : undefined;
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

  test("persists Simplified Chinese language selection across menu, HUD, station, and settings", async ({ page }) => {
    await installSpeechSynthesisStub(page);
    await resetApp(page);
    await page.getByLabel("Select language").selectOption("zh-CN");
    await expect(page.getByRole("button", { name: "新游戏" })).toBeVisible();

    await page.reload();
    await page.waitForFunction(() => !!window.__GOF2_E2E__);
    await expect(page.getByRole("button", { name: "新游戏" })).toBeVisible();
    await page.getByRole("button", { name: "新游戏" }).click();
    await expect(page.locator(".hud-top-left")).toContainText("船体");
    await expect(page.locator(".hud-bottom-right")).toContainText("通讯");
    const englishResidue = /Credits|Cargo|Missiles|Throttle|Speed|Patrol support active|Nearest station|Target Hull|Target Shield|Law Patrol|Directorate precision kit|Economy offline|local fallback|Basic Food|TECH/;
    await expect(page.locator(".hud")).not.toContainText(englishResidue);
    await expect(page.locator(".dock-hint")).not.toContainText(/E Dock|Waypoint|TECH|Helion Prime Exchange/);
    await expect(page.locator(".station-tech-label").first()).toContainText("科技");

    await dockAtStation(page, "helion-prime");
    await expect(page.getByRole("button", { name: "发射" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "赫利昂主星交易所" })).toBeVisible();
    await expect(page.locator(".station-header")).toContainText("太阳理事会");
    await expect(page.getByTestId("market-row-basic-food")).toContainText("基础食品");
    await expect(page.getByTestId("market-row-basic-food")).toContainText("持有");
    await expect(page.getByTestId("market-row-basic-food")).toContainText("出口");
    await expect(page.getByTestId("market-row-drinking-water")).toContainText("饮用水");
    await expect(page.locator(".station-screen")).not.toContainText(/Helion Prime Exchange|Solar Directorate|Trade Hub|Basic Food|Drinking Water|Electronics|Medical Supplies|Energy Cells|Hold|Export|Import|Balanced/);
    await page.getByRole("button", { name: "任务板" }).click();
    await page.getByTestId("mission-card-story-clean-carrier").getByRole("button", { name: "接受" }).click();
    const dialogue = page.getByTestId("dialogue-overlay");
    await expect(dialogue).toContainText("洁净航载简报");
    await expect(dialogue).toContainText("洁净同步钥");
    await expect(dialogue).not.toContainText(/Clean Carrier Briefing|Helion traffic|pirate repeater|private courier|Mirr filter/);
    await expect.poll(() => getCurrentVoice(page)).toMatchObject({
      lang: "zh-CN",
      text: expect.stringContaining("洁净同步钥")
    });
    await dialogue.getByRole("button", { name: "跳过" }).click();
    await expect(dialogue).toHaveCount(0);
    await page.evaluate(() => {
      window.__GOF2_E2E__!.setState({ screen: "settings" });
    });
    await expect(page.getByLabel("选择语言")).toHaveValue("zh-CN");
    await page.getByLabel("选择语言").selectOption("en");
    await expect(page.getByRole("button", { name: "Back" })).toBeVisible();
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

    await expect(page.locator(".target-label.npc-label", { hasText: "MINING · Iron" })).toBeVisible();
  });

  test("surfaces civilian distress and patrol support in flight", async ({ page }) => {
    await resetApp(page);
    await startNewGame(page);

    await page.evaluate(() => {
      const current = window.__GOF2_E2E__!.getState() as {
        player: Record<string, unknown>;
        runtime: Record<string, unknown>;
      };
      window.__GOF2_E2E__!.setState({
        currentSystemId: "ashen-drift",
        player: { ...current.player, position: [900, 0, 900] },
        runtime: {
          ...current.runtime,
          clock: 0,
          graceUntil: 0,
          message: "",
          effects: [],
          projectiles: [],
          convoys: [],
          enemies: [
            {
              id: "e2e-patrol",
              name: "Directorate Patrol",
              role: "patrol",
              factionId: "solar-directorate",
              position: [0, 0, 30],
              velocity: [0, 0, 0],
              hull: 115,
              shield: 85,
              maxHull: 115,
              maxShield: 85,
              lastDamageAt: -999,
              fireCooldown: 1,
              aiProfileId: "law-patrol",
              aiState: "patrol",
              aiTimer: 0
            },
            {
              id: "e2e-freighter",
              name: "Tender Freighter",
              role: "freighter",
              factionId: "free-belt-union",
              position: [0, 12, 20],
              velocity: [0, 0, 0],
              hull: 140,
              shield: 70,
              maxHull: 140,
              maxShield: 70,
              lastDamageAt: -999,
              fireCooldown: 1,
              aiProfileId: "freighter",
              aiState: "patrol",
              aiTimer: 0,
              economyStatus: "HAULING · Basic Food",
              economyTaskKind: "hauling",
              economyCargo: { "basic-food": 4 },
              distressThreatId: "e2e-pirate",
              distressCalledAt: 0
            },
            {
              id: "e2e-pirate",
              name: "Knife Wing Pirate",
              role: "pirate",
              factionId: "independent-pirates",
              position: [60, 0, 20],
              velocity: [0, 0, 0],
              hull: 70,
              shield: 42,
              maxHull: 70,
              maxShield: 42,
              lastDamageAt: -999,
              fireCooldown: 1,
              aiProfileId: "raider",
              loadoutId: "pirate-raider",
              aiState: "attack",
              aiTargetId: "e2e-freighter",
              aiTimer: 0
            }
          ]
        }
      });
    });

    await expect(page.locator(".civilian-distress-label")).toContainText("DISTRESS");

    await page.evaluate(() => {
      const state = window.__GOF2_E2E__!.getState() as { tick: (delta: number) => void };
      state.tick(0.2);
    });

    await page.waitForFunction(() => {
      const state = window.__GOF2_E2E__!.getState() as { runtime: { enemies: Array<{ supportWing?: boolean; aiTargetId?: string }>; message: string } };
      return state.runtime.enemies.some((ship) => ship.supportWing && ship.aiTargetId === "e2e-pirate") && state.runtime.message.includes("Distress call");
    });
  });

  test("surfaces the station economy cockpit and flight NPC route lines", async ({ page }) => {
    await resetApp(page);
    await startNewGame(page);
    await dockAtStation(page, "helion-prime");

    await page.evaluate(() => {
      const state = window.__GOF2_E2E__!.getState() as {
        stopEconomyStream: () => void;
        currentSystemId: string;
        marketState: Record<string, Record<string, { stock: number; demand: number; baselineDemand: number }>>;
        runtime: {
          asteroids: Array<{ id: string; resource: string; position: [number, number, number] }>;
          enemies: unknown[];
        };
      };
      state.stopEconomyStream();
      const asteroid = state.runtime.asteroids[0];
      const basicFood = state.marketState["helion-prime"]["basic-food"];
      window.__GOF2_E2E__!.setState({
        economyService: {
          status: "connected",
          url: "http://127.0.0.1:19777",
          snapshotId: 101,
          lastEvent: "Ore Cutter mined 1 Iron."
        },
        economyEvents: [
          {
            id: "econ-e2e-event",
            type: "npc-mined",
            clock: 12,
            message: "Ore Cutter mined 1 Iron.",
            systemId: "helion-reach",
            npcId: "econ-e2e-miner",
            commodityId: "iron",
            amount: 1,
            snapshotId: 101
          },
          {
            id: "econ-e2e-global-event",
            type: "npc-task",
            clock: 13,
            message: "Vossari Smuggler plotted Luxury Goods freight to Mirr Lattice.",
            systemId: "mirr-vale",
            npcId: "econ-e2e-smuggler",
            commodityId: "luxury-goods",
            snapshotId: 102
          }
        ],
        marketState: {
          ...state.marketState,
          "helion-prime": {
            ...state.marketState["helion-prime"],
            "basic-food": {
              ...basicFood,
              stock: 0,
              demand: basicFood.baselineDemand + 0.7
            }
          }
        },
        runtime: {
          ...state.runtime,
          enemies: [
            ...state.runtime.enemies,
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
            },
            {
              id: "econ-e2e-depleted-miner",
              name: "Ore Cutter",
              role: "miner",
              factionId: "free-belt-union",
              position: [80, 18, -40],
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
              economyTaskKind: "idle",
              economyStatus: "IDLE · Belt depleted",
              economyCargo: {},
              economyTargetId: "cinder-yard"
            }
          ]
        }
      });
    });

    await page.getByRole("button", { name: "Economy" }).click();
    const economy = page.getByTestId("economy-tab");
    await expect(economy).toContainText("CONNECTED");
    await expect(economy).toContainText("Snapshot 101");
    await expect(economy).toContainText("Ore Cutter");
    await expect(economy).toContainText("MINING · Iron");
    await expect(economy).toContainText("Holding near Cinder Yard");
    await expect(economy).toContainText("Belt depleted");
    await expect(economy).toContainText("Shortage");
    const eventsList = economy.locator(".economy-events-list");
    await expect(eventsList).toContainText("Ore Cutter mined 1 Iron.");
    await expect(eventsList).toContainText("[Helion Reach]");
    await expect(eventsList).toContainText("[Mirr Vale]");
    expect(await eventsList.evaluate((element) => getComputedStyle(element).overflowY)).toBe("auto");
    const resetButton = page.getByRole("button", { name: "Reset Economy" });
    await expect(resetButton).toBeVisible();
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("Reset");
      await dialog.dismiss();
    });
    await resetButton.click();
    await economy.locator(".economy-npc-row", { hasText: "MINING · Iron" }).getByRole("button", { name: "Watch" }).click();
    const watchOverlay = page.getByTestId("economy-watch-overlay");
    await expect(page.locator(".flight-canvas canvas")).toBeVisible();
    await expect(watchOverlay).toContainText("Watching");
    await expect(watchOverlay).toContainText("Ore Cutter");
    await expect(watchOverlay).toContainText("Cockpit");
    await page.keyboard.press("KeyC");
    await expect(watchOverlay).toContainText("Chase");
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("economy-tab")).toContainText("Ore Cutter");

    await page.getByRole("button", { name: "Launch" }).click();
    await expect(page.locator(".economy-route-label")).toContainText("MINING · Iron");
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

  test("surfaces Glass Wake tracker, map pins, and flight waypoint", async ({ page }) => {
    await resetApp(page);
    await startNewGame(page);
    await acceptCleanCarrierMission(page);

    await expect(page.getByTestId("story-notification")).toContainText("Glass Wake 01: Clean Carrier");
    await page.getByTestId("dialogue-overlay").getByRole("button", { name: "Skip" }).click();
    await expect(page.getByTestId("dialogue-overlay")).toHaveCount(0);

    await page.getByRole("button", { name: "Launch" }).click();
    await expect(page.getByTestId("story-tracker")).toContainText("Glass Wake 01");
    await expect(page.getByTestId("story-tracker")).toContainText("Mirr Lattice");
    await expect(page.locator(".story-waypoint-label")).toContainText("Main Story");

    await page.keyboard.press("KeyM");
    await expect(page.getByText("Route Planning")).toBeVisible();
    await expect(page.locator(".galaxy-system.story-pin")).toContainText("Main Story");
    await page.getByRole("button", { name: "Mirr Vale known" }).click();
    await expect(page.getByTestId("story-map-brief")).toContainText("Glass Wake 01");
    await expect(page.locator(".planet-list button.story-destination")).toContainText("Main Story");
  });

  test("surfaces wanted heat in HUD, galaxy map, and station fine payment", async ({ page }) => {
    await resetApp(page);
    await startNewGame(page);

    await page.evaluate(() => {
      const state = window.__GOF2_E2E__!.getState() as {
        player: Record<string, unknown>;
        runtime: Record<string, unknown>;
      };
      window.__GOF2_E2E__!.setState({
        currentSystemId: "helion-reach",
        currentStationId: undefined,
        screen: "flight",
        player: { ...state.player, credits: 5000 },
        factionHeat: {
          factions: {
            "solar-directorate": { heat: 45, fineCredits: 3000, offenseCount: 1, wantedUntil: 120 }
          }
        },
        runtime: { ...state.runtime, message: "" }
      });
    });

    await expect(page.getByTestId("legal-status")).toContainText("Wanted");
    await expect(page.getByTestId("legal-status")).toContainText("Fine");

    await page.evaluate(() => {
      window.__GOF2_E2E__!.setState({ screen: "galaxyMap", previousScreen: "flight", galaxyMapMode: "station-route" });
    });
    await expect(page.getByTestId("law-map-brief")).toContainText("Wanted");
    await expect(page.getByRole("button", { name: "Helion Reach known" }).locator(".law-map-pin")).toContainText("Wanted");

    await page.evaluate(() => {
      window.__GOF2_E2E__!.setState({
        screen: "station",
        currentStationId: "helion-prime",
        stationTab: "Lounge"
      });
    });
    const solarRow = page.locator(".faction-consequence").filter({ hasText: "Solar Directorate" });
    await expect(solarRow).toContainText("Wanted");
    await expect(solarRow).toContainText("3,000");
    await solarRow.getByRole("button", { name: "Pay Fine" }).click();
    await expect(solarRow).toContainText("Clear");
    await expect(solarRow).not.toContainText("3,000");
  });

  test("surfaces and completes the Quiet Signals exploration loop", async ({ page }) => {
    await resetApp(page);
    await startNewGame(page);
    await dockAtStation(page, "helion-prime");

    await page.getByRole("button", { name: "Lounge" }).click();
    const stationBrief = page.getByTestId("station-exploration-brief");
    await expect(stationBrief).toContainText("Quiet Signals");
    await expect(stationBrief).toContainText("Prismatic Trade Echo");

    await page.getByRole("button", { name: "Galaxy Map" }).click();
    await expect(page.getByRole("button", { name: "Helion Reach known" }).locator(".exploration-map-pin")).toContainText("Quiet Signals");
    await expect(page.getByTestId("exploration-map-brief")).toContainText("Sundog Lattice Chain");

    await completeExplorationSignal(page, "quiet-signal-sundog-lattice");
    expect((await getGameState(page)).player.unlockedBlueprintIds).not.toContain("survey-array");
    await completeExplorationSignal(page, "quiet-signal-meridian-afterimage");

    const state = await getGameState(page);
    expect(state.player.unlockedBlueprintIds).toContain("survey-array");
    await expect(page.locator(".hud-bottom-right")).toContainText("Survey Array blueprint unlocked");

    await dockAtStation(page, "helion-prime");
    await page.getByRole("button", { name: "Captain's Log" }).click();
    await expect(page.getByTestId("exploration-chain-helion-sundog-chain")).toContainText("Chain complete");
    await expect(page.getByTestId("exploration-chain-helion-sundog-chain")).toContainText("Survey Array");
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
