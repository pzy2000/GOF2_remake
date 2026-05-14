import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { inflateSync } from "node:zlib";
import { explorationSignalById, systems } from "../../src/data/world";

const updateMobileMatrix = process.env.GOF2_UPDATE_MOBILE_MATRIX === "1";
const mobileMatrixDir = resolve(process.cwd(), "docs/mobile-matrix");

type Gof2E2EState = {
  screen: string;
  currentSystemId: string;
  currentStationId?: string;
  autopilot?: {
    phase: string;
    targetStationId?: string;
    targetSystemId: string;
    targetNpcId?: string;
    pendingNpcAction?: string;
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
  allowSpeak: () => void;
  blockNextSpeak: (count?: number) => void;
  endCurrent: () => void;
  endLastCanceled: () => void;
};

type TestVoiceAudioHarness = {
  resumeCalls: number;
  playCalls: number;
  pauseCalls: number;
  state: AudioContextState;
  allowResume: boolean;
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

async function startNewGame(page: Page, options: { keepIntro?: boolean } = {}) {
  await expect(page.getByRole("heading", { name: "GOF2 by pzy" })).toBeVisible();
  await expect(async () => {
    const screen = await page.evaluate(() => (window.__GOF2_E2E__?.getState?.() as { screen?: string } | undefined)?.screen);
    if (screen !== "flight") await page.getByRole("button", { name: "New Game" }).click();
    await expect(page.locator(".flight-canvas canvas")).toBeVisible({ timeout: 2500 });
  }).toPass({ timeout: 15_000 });
  await expect(page.locator(".flight-canvas canvas")).toBeVisible();
  await expect(page.locator(".hud-top-left")).toContainText("Helion Reach");
  await expect(page.locator(".dock-hint")).toBeVisible();
  await expect(page.locator(".station-tech-label").first()).toContainText("TECH");
  if (!options.keepIntro) {
    await page.evaluate(() => {
      const state = window.__GOF2_E2E__!.getState() as { activeDialogue?: unknown; closeDialogue: () => void };
      if (state.activeDialogue) state.closeDialogue();
    });
    await expect(page.getByTestId("dialogue-overlay")).toHaveCount(0);
    await expect(page.getByTestId("space-dialogue-overlay")).toHaveCount(0);
  }
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

async function maybeCaptureMobileMatrix(page: Page, filename: string) {
  if (!updateMobileMatrix) return;
  await mkdir(mobileMatrixDir, { recursive: true });
  await page.screenshot({ path: resolve(mobileMatrixDir, filename), fullPage: false });
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
            targetSystemId: state.autopilot.targetSystemId,
            targetNpcId: state.autopilot.targetNpcId,
            pendingNpcAction: state.autopilot.pendingNpcAction
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

async function expectVerticalGap(
  upper: ReturnType<Page["locator"]>,
  lower: ReturnType<Page["locator"]>,
  minGap: number
) {
  const [upperBox, lowerBox] = await Promise.all([upper.boundingBox(), lower.boundingBox()]);
  expect(upperBox).not.toBeNull();
  expect(lowerBox).not.toBeNull();
  expect(lowerBox!.y - (upperBox!.y + upperBox!.height)).toBeGreaterThanOrEqual(minGap);
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
      onstart: (() => void) | null;
      onend: (() => void) | null;
      onerror: (() => void) | null;
    };

    class FakeSpeechSynthesisUtterance implements FakeUtterance {
      lang = "";
      pitch = 1;
      rate = 1;
      volume = 1;
      voice: SpeechSynthesisVoice | null = null;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;

      constructor(public text: string) {}
    }

    let blockedSpeakCount = 0;
    const harness = {
      current: undefined as FakeUtterance | undefined,
      lastCanceled: undefined as FakeUtterance | undefined,
      allowSpeak() {
        blockedSpeakCount = 0;
      },
      blockNextSpeak(count = 1) {
        blockedSpeakCount = Math.max(blockedSpeakCount, count);
      },
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
        if (blockedSpeakCount > 0) {
          blockedSpeakCount -= 1;
          synthesis.speaking = false;
          synthesis.paused = false;
          return;
        }
        synthesis.speaking = true;
        synthesis.paused = false;
        utterance.onstart?.();
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
    Object.defineProperty(window, "AudioContext", { value: undefined, configurable: true });
    Object.defineProperty(window, "webkitAudioContext", { value: undefined, configurable: true });
    Object.defineProperty(window, "__GOF2_TEST_SPEECH__", { value: harness, configurable: true });
  });
}

async function installSuspendedVoiceAudioStub(page: Page) {
  await page.addInitScript(() => {
    type TestNode = {
      gain: { value: number; setTargetAtTime: () => void; setValueAtTime: () => void; exponentialRampToValueAtTime: () => void };
      frequency: { value: number; setTargetAtTime: () => void; setValueAtTime: () => void; exponentialRampToValueAtTime: () => void };
      delayTime: { value: number; setTargetAtTime: () => void; setValueAtTime: () => void; exponentialRampToValueAtTime: () => void };
      Q: { value: number; setTargetAtTime: () => void; setValueAtTime: () => void; exponentialRampToValueAtTime: () => void };
      type: string;
      curve: Float32Array | null;
      buffer: unknown;
      connect: () => void;
      disconnect: () => void;
      start: () => void;
      stop: () => void;
    };
    const param = () => ({
      value: 0,
      setTargetAtTime: () => undefined,
      setValueAtTime: () => undefined,
      exponentialRampToValueAtTime: () => undefined
    });
    const node = (): TestNode => ({
      gain: param(),
      frequency: param(),
      delayTime: param(),
      Q: param(),
      type: "sine",
      curve: null,
      buffer: null,
      connect: () => undefined,
      disconnect: () => undefined,
      start: () => undefined,
      stop: () => undefined
    });
    const harness: TestVoiceAudioHarness = {
      resumeCalls: 0,
      playCalls: 0,
      pauseCalls: 0,
      state: "suspended",
      allowResume: false
    };
    class TestAudioContext {
      sampleRate = 24000;
      currentTime = 1;
      destination = node();
      get state() {
        return harness.state;
      }
      resume() {
        harness.resumeCalls += 1;
        if (harness.allowResume) harness.state = "running";
        return Promise.resolve();
      }
      createGain() { return node(); }
      createOscillator() { return node(); }
      createBiquadFilter() { return node(); }
      createWaveShaper() { return node(); }
      createDelay() { return node(); }
      createConvolver() { return node(); }
      createMediaElementSource() { return node(); }
      createBuffer(_channels: number, length: number) {
        return { getChannelData: () => new Float32Array(length) };
      }
    }
    class TestAudio {
      loop = false;
      preload = "";
      volume = 1;
      currentTime = 0;
      paused = true;
      onplaying: (() => void) | null = null;
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(public src: string) {}
      play() {
        harness.playCalls += 1;
        this.paused = false;
        window.setTimeout(() => this.onplaying?.(), 0);
        return Promise.resolve();
      }
      pause() {
        harness.pauseCalls += 1;
        this.paused = true;
      }
    }
    Object.defineProperty(window, "AudioContext", { value: TestAudioContext, configurable: true });
    Object.defineProperty(window, "webkitAudioContext", { value: undefined, configurable: true });
    Object.defineProperty(window, "Audio", { value: TestAudio, configurable: true });
    Object.defineProperty(window, "__GOF2_TEST_VOICE_AUDIO__", { value: harness, configurable: true });
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

async function blockNextVoiceStart(page: Page, count = 1) {
  await page.evaluate((blockedCount) => {
    (window as unknown as { __GOF2_TEST_SPEECH__: TestSpeechHarness }).__GOF2_TEST_SPEECH__.blockNextSpeak(blockedCount);
  }, count);
}

async function allowVoiceStart(page: Page) {
  await page.evaluate(() => {
    (window as unknown as { __GOF2_TEST_SPEECH__: TestSpeechHarness }).__GOF2_TEST_SPEECH__.allowSpeak();
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

async function expectStarSpriteResourceLoaded(page: Page, assetPath: string) {
  await page.waitForFunction(
    (path) => performance.getEntriesByType("resource").some((entry) => entry.name.includes(path)),
    assetPath
  );
}

function paeth(left: number, up: number, upperLeft: number): number {
  const estimate = left + up - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) return left;
  return upDistance <= upperLeftDistance ? up : upperLeft;
}

function decodePngPixels(bytes: Buffer) {
  const signature = "89504e470d0a1a0a";
  expect(bytes.subarray(0, 8).toString("hex")).toBe(signature);
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat: Buffer[] = [];
  for (let offset = 8; offset < bytes.length;) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    if (type === "IHDR") {
      width = bytes.readUInt32BE(dataStart);
      height = bytes.readUInt32BE(dataStart + 4);
      bitDepth = bytes[dataStart + 8];
      colorType = bytes[dataStart + 9];
    } else if (type === "IDAT") {
      idat.push(bytes.subarray(dataStart, dataStart + length));
    } else if (type === "IEND") {
      break;
    }
    offset = dataStart + length + 4;
  }
  expect(bitDepth).toBe(8);
  expect([2, 6]).toContain(colorType);
  const channels = colorType === 6 ? 4 : 3;
  const rowBytes = width * channels;
  const inflated = inflateSync(Buffer.concat(idat));
  const pixels = new Uint8Array(width * height * 4);
  let inputOffset = 0;
  let previous = new Uint8Array(rowBytes);
  for (let y = 0; y < height; y += 1) {
    const filter = inflated[inputOffset++];
    const row = new Uint8Array(rowBytes);
    for (let x = 0; x < rowBytes; x += 1) {
      const raw = inflated[inputOffset++];
      const left = x >= channels ? row[x - channels] : 0;
      const up = previous[x] ?? 0;
      const upperLeft = x >= channels ? previous[x - channels] : 0;
      const predictor =
        filter === 0 ? 0
          : filter === 1 ? left
            : filter === 2 ? up
              : filter === 3 ? Math.floor((left + up) / 2)
                : paeth(left, up, upperLeft);
      row[x] = (raw + predictor) & 0xff;
    }
    for (let x = 0; x < width; x += 1) {
      const source = x * channels;
      const target = (y * width + x) * 4;
      pixels[target] = row[source];
      pixels[target + 1] = row[source + 1];
      pixels[target + 2] = row[source + 2];
      pixels[target + 3] = channels === 4 ? row[source + 3] : 255;
    }
    previous = row;
  }
  return { width, height, pixels };
}

function getPngPixelMetrics(bytes: Buffer) {
  const { width, height, pixels } = decodePngPixels(bytes);
  const stride = Math.max(1, Math.floor((width * height) / 6000));
  const colors = new Set<string>();
  let brightPixels = 0;
  let litPixels = 0;
  for (let pixel = 0; pixel < width * height; pixel += stride) {
    const offset = pixel * 4;
    const red = pixels[offset];
    const green = pixels[offset + 1];
    const blue = pixels[offset + 2];
    const luma = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    if (luma > 4) litPixels += 1;
    if (luma > 30) brightPixels += 1;
    colors.add(`${red >> 4},${green >> 4},${blue >> 4}`);
  }
  return { brightPixels, litPixels, uniqueColors: colors.size };
}

async function expectWebGlCanvasHasBrightPixels(page: Page) {
  const canvas = page.locator(".flight-canvas canvas");
  await expect(canvas).toBeVisible();
  const metrics = getPngPixelMetrics(await canvas.screenshot());
  expect(metrics!.litPixels).toBeGreaterThan(160);
  expect(metrics!.brightPixels).toBeGreaterThan(12);
  expect(metrics!.uniqueColors).toBeGreaterThan(20);
}

async function dockAtStation(page: Page, stationId: string, options: { keepDialogue?: boolean } = {}) {
  await page.evaluate((targetStationId) => {
    const state = window.__GOF2_E2E__!.getState() as { dockAt: (stationId: string) => void };
    state.dockAt(targetStationId);
  }, stationId);
  if (!options.keepDialogue) {
    const dialogue = page.getByTestId("dialogue-overlay");
    if (await dialogue.count()) {
      await page.evaluate(() => {
        const state = window.__GOF2_E2E__!.getState() as { closeDialogue: () => void };
        state.closeDialogue();
      });
      await expect(dialogue).toHaveCount(0);
    }
  }
}

async function acceptCleanCarrierMission(page: Page) {
  await dockAtStation(page, "helion-prime", { keepDialogue: true });
  await expect(page.getByRole("heading", { name: "Helion Prime Exchange" })).toBeVisible();
  await expect(page.getByTestId("dialogue-overlay")).toContainText("Clean Carrier Briefing");
  expect((await getGameState(page)).activeMissions.map((mission) => mission.id)).toContain("story-clean-carrier");
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

  test("renders generated system star sprites in flight and galaxy map", async ({ page }) => {
    test.setTimeout(120_000);
    await resetApp(page);
    await startNewGame(page);

    for (const system of systems) {
      const assetPath = `/assets/generated/stars/star-${system.id}.png`;
      await page.evaluate(({ systemId, planetIds }) => {
        const e2e = window.__GOF2_E2E__!;
        const state = e2e.getState() as {
          knownPlanetIds: string[];
          knownSystems: string[];
          player: Record<string, unknown>;
          runtime: Record<string, unknown>;
        };
        e2e.setState({
          currentSystemId: systemId,
          currentStationId: undefined,
          knownSystems: Array.from(new Set([...state.knownSystems, systemId])),
          knownPlanetIds: Array.from(new Set([...state.knownPlanetIds, ...planetIds])),
          player: {
            ...state.player,
            position: [0, 0, 0],
            velocity: [0, 0, 0],
            throttle: 0
          },
          runtime: {
            ...state.runtime,
            enemies: [],
            projectiles: [],
            effects: []
          }
        });
      }, { systemId: system.id, planetIds: system.planetIds });
      await expectStarSpriteResourceLoaded(page, assetPath);
      await expectWebGlCanvasHasBrightPixels(page);
    }

    const systemIds = systems.map((system) => system.id);
    const planetIds = systems.flatMap((system) => system.planetIds);
    await page.evaluate(({ systemIds, planetIds }) => {
      window.__GOF2_E2E__!.setState({
        screen: "galaxyMap",
        previousScreen: "flight",
        galaxyMapMode: "station-route",
        knownSystems: systemIds,
        knownPlanetIds: planetIds
      });
    }, { systemIds, planetIds });
    await expect(page.locator(".galaxy-panel")).toBeVisible();

    const galaxyStars = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLButtonElement>(".galaxy-system")).map((button) => {
        const core = button.querySelector<HTMLElement>(".star-core");
        const rect = core?.getBoundingClientRect();
        const style = core ? getComputedStyle(core) : undefined;
        return {
          backgroundImage: style?.backgroundImage ?? "",
          height: rect?.height ?? 0,
          starType: button.dataset.starType,
          systemId: button.dataset.systemId,
          width: rect?.width ?? 0
        };
      })
    );

    expect(galaxyStars).toHaveLength(systems.length);
    for (const system of systems) {
      const star = galaxyStars.find((item) => item.systemId === system.id);
      expect(star).toBeDefined();
      expect(star!.starType).toBe(system.star.type);
      expect(star!.backgroundImage).toContain(`star-${system.id}.png`);
      expect(star!.width).toBeGreaterThan(18);
      expect(star!.height).toBeGreaterThan(18);
    }
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
    const flightDialogue = page.getByTestId("space-dialogue-overlay");
    await expect(flightDialogue).toBeVisible();
    await expect(page.getByTestId("dialogue-overlay")).toHaveCount(0);
    const englishResidue = /Credits|Cargo|Missiles|Throttle|Speed|Patrol support active|Nearest station|Target Hull|Target Shield|Law Patrol|Directorate precision kit|Economy offline|local fallback|Basic Food|TECH/;
    await expect(page.locator(".hud")).not.toContainText(englishResidue);
    await expect(page.locator(".dock-hint")).not.toContainText(/E Dock|Waypoint|TECH|Helion Prime Exchange/);
    await expect(page.locator(".station-tech-label").first()).toContainText("科技");
    await page.evaluate(() => {
      const state = window.__GOF2_E2E__!.getState() as { closeDialogue: () => void };
      state.closeDialogue();
    });
    await expect(flightDialogue).toHaveCount(0);

    await dockAtStation(page, "helion-prime", { keepDialogue: true });
    const dialogue = page.getByTestId("dialogue-overlay");
    await expect(dialogue).toContainText("洁净航载简报");
    await expect(dialogue).toContainText("洁净同步钥");
    await expect(dialogue).not.toContainText(/Clean Carrier Briefing|Helion traffic|pirate repeater|private courier|Mirr filter/);
    const currentVoice = await getCurrentVoice(page);
    if (currentVoice) {
      expect(currentVoice).toMatchObject({
        lang: "zh-CN",
        text: expect.stringContaining("洁净同步钥")
      });
    }
    await dialogue.getByRole("button", { name: "跳过" }).click();
    await expect(dialogue).toHaveCount(0);
    await expect(page.getByRole("button", { name: "发射" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "赫利昂主星交易所" })).toBeVisible();
    await expect(page.locator(".station-header")).toContainText("太阳理事会");
    await expect(page.getByTestId("market-row-basic-food")).toContainText("基础食品");
    await expect(page.getByTestId("market-row-basic-food")).toContainText("持有");
    await expect(page.getByTestId("market-row-basic-food")).toContainText("出口");
    await expect(page.getByTestId("market-row-drinking-water")).toContainText("饮用水");
    await expect(page.locator(".station-screen")).not.toContainText(/Helion Prime Exchange|Solar Directorate|Trade Hub|Basic Food|Drinking Water|Electronics|Medical Supplies|Energy Cells|Hold|Export|Import|Balanced/);
    await page.getByRole("button", { name: "任务板", exact: true }).click();
    await expect(page.getByTestId("mission-card-story-clean-carrier")).toContainText("Glass Wake 01: Clean Carrier");
    await page.evaluate(() => {
      window.__GOF2_E2E__!.setState({ screen: "settings" });
    });
    await expect(page.getByLabel("选择语言")).toHaveValue("zh-CN");
    await page.getByLabel("选择语言").selectOption("en");
    await expect(page.getByRole("button", { name: "Back" })).toBeVisible();
  });

  test("tunes active frequency scans from the keyboard", async ({ page }) => {
    test.setTimeout(75_000);
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
              economySerial: "HR-MN-04",
              economyHomeStationId: "cinder-yard",
              economyRiskPreference: "balanced",
              economyContractId: "HR-MN-04-MINING",
              economyLedger: { revenue: 0, expenses: 0, losses: 0, completedContracts: 0, failedContracts: 0, minedUnits: 1 },
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
            id: "econ-e2e-hauler-event",
            type: "npc-trade",
            clock: 12.5,
            message: "Union Bulk Freighter bought 4 Basic Food.",
            systemId: "helion-reach",
            stationId: "cinder-yard",
            npcId: "econ-e2e-hauler",
            commodityId: "basic-food",
            amount: 4,
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
              economySerial: "HR-MN-04",
              economyHomeStationId: "cinder-yard",
              economyRiskPreference: "balanced",
              economyContractId: "HR-MN-04-MINING",
              economyLedger: { revenue: 0, expenses: 0, losses: 0, completedContracts: 0, failedContracts: 0, minedUnits: 1 },
              economyTaskKind: "mining",
              economyTaskProgress: 0.42,
              economyStatus: "MINING · Iron",
              economyCargo: {},
              economyCommodityId: asteroid.resource,
              economyTargetId: asteroid.id
            },
            {
              id: "econ-e2e-hauler",
              name: "Union Bulk Freighter",
              role: "freighter",
              factionId: "free-belt-union",
              position: [460, 34, -260],
              velocity: [-64, 0, 24],
              hull: 132,
              shield: 21,
              maxHull: 170,
              maxShield: 70,
              lastDamageAt: -999,
              fireCooldown: 0.6,
              aiProfileId: "freighter",
              aiState: "patrol",
              aiTimer: 0,
              economySerial: "HR-FR-02",
              economyHomeStationId: "helion-prime",
              economyRiskPreference: "bold",
              economyContractId: "HR-FR-02-FREIGHT",
              economyLedger: { revenue: 1800, expenses: 900, losses: 0, completedContracts: 2, failedContracts: 0, minedUnits: 0 },
              economyTaskKind: "hauling",
              economyTaskProgress: 0.35,
              economyStatus: "HAULING · Basic Food",
              economyCargo: { "basic-food": 4 },
              economyCommodityId: "basic-food",
              economyTargetId: "helion-prime",
              distressThreatId: "e2e-watch-pirate",
              distressCalledAt: 0
            },
            {
              id: "e2e-watch-pirate",
              name: "Watch Pirate",
              role: "pirate",
              factionId: "independent-pirates",
              position: [520, 30, -230],
              velocity: [0, 0, 0],
              hull: 70,
              shield: 42,
              maxHull: 70,
              maxShield: 42,
              lastDamageAt: -999,
              fireCooldown: 0.6,
              aiProfileId: "raider",
              aiState: "attack",
              aiTargetId: "econ-e2e-hauler",
              aiTimer: 0
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
              economySerial: "HR-MN-09",
              economyHomeStationId: "cinder-yard",
              economyRiskPreference: "cautious",
              economyLedger: { revenue: 0, expenses: 0, losses: 0, completedContracts: 0, failedContracts: 0, minedUnits: 0 },
              economyTaskKind: "idle",
              economyTaskProgress: 0,
              economyStatus: "IDLE · Belt depleted",
              economyCargo: {},
              economyTargetId: "cinder-yard"
            }
          ]
        }
      });
    });

    await page.getByRole("button", { name: "Economy", exact: true }).click();
    const economy = page.getByTestId("economy-tab");
    await expect(economy).toContainText("CONNECTED");
    await expect(economy).toContainText("Snapshot 101");
    await expect(economy).toContainText("Ore Cutter");
    await expect(economy).toContainText("MINING · Iron");
    await expect(economy).toContainText("Holding near Cinder Yard");
    await expect(economy).toContainText("Belt depleted");
    await expect(economy).toContainText("HR-MN-04");
    await expect(economy).toContainText("Home");
    await expect(economy).toContainText("Contract");
    await expect(economy).toContainText("P/L");
    await expect(economy).toContainText("Shortage");
    const dispatchBoard = economy.getByTestId("economy-dispatch-board");
    await expect(dispatchBoard).toContainText("Dispatch Board");
    await expect(dispatchBoard).toContainText("Supply Run");
    await expect(dispatchBoard.getByRole("button", { name: "Accept" }).first()).toBeVisible();
    await expect(dispatchBoard.getByRole("button", { name: /Set Route/ }).first()).toBeVisible();
    const dispatchDashboardGap = await economy.evaluate((element) => {
      const dispatch = element.querySelector('[data-testid="economy-dispatch-board"]');
      const dashboard = element.querySelector(".economy-dashboard");
      if (!dispatch || !dashboard) return Number.NEGATIVE_INFINITY;
      return dashboard.getBoundingClientRect().top - dispatch.getBoundingClientRect().bottom;
    });
    expect(dispatchDashboardGap).toBeGreaterThanOrEqual(0);
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
    await expect(watchOverlay.getByRole("button", { name: "Hail" })).toBeVisible();
    await expect(watchOverlay.getByRole("button", { name: "Escort" })).toBeVisible();
    await expect(watchOverlay.getByRole("button", { name: "Rob" })).toBeVisible();
    await expect(watchOverlay.getByRole("button", { name: "Report" })).toBeVisible();
    await page.keyboard.press("KeyC");
    await expect(watchOverlay).toContainText("Chase");
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("economy-tab")).toContainText("Ore Cutter");

    await economy.locator(".economy-npc-row", { hasText: "HAULING · Basic Food" }).getByRole("button", { name: "Watch" }).click();
    await expect(watchOverlay).toContainText("Union Bulk Freighter");
    await expect(watchOverlay).toContainText("DISTRESS");
    await expect(watchOverlay).toContainText("Watch Pirate");
    await expect(watchOverlay.getByRole("button", { name: "Rescue" })).toBeEnabled();
    await expect(watchOverlay).toContainText("Hull");
    await expect(watchOverlay).toContainText("Shield");
    await expect(watchOverlay).toContainText("Identity");
    await expect(watchOverlay).toContainText("HR-FR-02");
    await expect(watchOverlay).toContainText("Home");
    await expect(watchOverlay).toContainText("Risk");
    await expect(watchOverlay).toContainText("Contract");
    await expect(watchOverlay).toContainText("P/L");
    await expect(watchOverlay).toContainText("Ledger");
    await expect(watchOverlay).toContainText("Cargo");
    await expect(watchOverlay).toContainText("ETA");
    await expect(watchOverlay).toContainText("Target Market");
    await expect(watchOverlay).toContainText("Stock");
    await expect(watchOverlay).toContainText("Demand");
    await expect(watchOverlay).toContainText("Union Bulk Freighter bought 4 Basic Food.");
    await page.evaluate(async () => {
      const state = window.__GOF2_E2E__!.getState() as {
        refreshEconomySnapshot: () => Promise<void>;
        marketState: Record<string, Record<string, { stock: number; demand: number; baselineDemand: number; maxStock?: number }>>;
        runtime: {
          asteroids: Array<{ id: string; resource: string; position: [number, number, number] }>;
        };
      };
      const asteroid = state.runtime.asteroids[0];
      const snapshot = {
        version: 1,
        snapshotId: 202,
        clock: 40,
        marketState: state.marketState,
        status: "connected",
        recentEvents: [
          {
            id: "econ-e2e-hauler-transit",
            type: "npc-task",
            clock: 40,
            message: "Union Bulk Freighter entered transit to Helion Prime.",
            systemId: "__transit__",
            stationId: "helion-prime",
            npcId: "econ-e2e-hauler",
            commodityId: "basic-food",
            snapshotId: 202
          }
        ],
        resourceBelts: [],
        visibleNpcs: [
          {
            id: "econ-e2e-miner",
            name: "Ore Cutter",
            serial: "HR-MN-04",
            role: "miner",
            factionId: "free-belt-union",
            systemId: "helion-reach",
            homeStationId: "cinder-yard",
            riskPreference: "balanced",
            lineageId: "econ-e2e-miner",
            generation: 0,
            position: [0, 12, 20],
            velocity: [0, 0, 0],
            hull: 125,
            shield: 58,
            maxHull: 125,
            maxShield: 58,
            cargoCapacity: 20,
            cargo: {},
            credits: 5000,
            ledger: { revenue: 0, expenses: 0, losses: 0, completedContracts: 0, failedContracts: 0, minedUnits: 1 },
            task: {
              kind: "mining",
              contractId: "HR-MN-04-MINING",
              asteroidId: asteroid.id,
              commodityId: asteroid.resource,
              originStationId: "cinder-yard",
              progress: 0.42,
              startedAt: 10
            },
            statusLabel: "MINING · Iron",
            lastTradeAt: -999
          }
        ]
      };
      const npcResponse = {
        version: 1,
        snapshotId: 202,
        clock: 40,
        status: "connected",
        npc: {
          id: "econ-e2e-hauler",
          name: "Union Bulk Freighter",
          serial: "HR-FR-02",
          role: "freighter",
          factionId: "free-belt-union",
          systemId: "__transit__",
          homeStationId: "helion-prime",
          riskPreference: "bold",
          lineageId: "econ-e2e-hauler",
          generation: 0,
          position: [0, 0, 0],
          velocity: [0, 0, 0],
          hull: 132,
          shield: 21,
          maxHull: 170,
          maxShield: 70,
          cargoCapacity: 42,
          cargo: { "basic-food": 4 },
          credits: 16000,
          ledger: { revenue: 1800, expenses: 900, losses: 0, completedContracts: 2, failedContracts: 0, minedUnits: 0 },
          task: {
            kind: "hauling",
            contractId: "HR-FR-02-FREIGHT",
            commodityId: "basic-food",
            originStationId: "cinder-yard",
            destinationStationId: "helion-prime",
            progress: 0.61,
            startedAt: 35
          },
          statusLabel: "HAULING · Basic Food",
          lastTradeAt: 12.5
        }
      };
      window.fetch = async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/economy/snapshot")) {
          return new Response(JSON.stringify(snapshot), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        if (url.includes("/api/economy/npc/econ-e2e-hauler")) {
          return new Response(JSON.stringify(npcResponse), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify({ message: "Unexpected economy request." }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      };
      await state.refreshEconomySnapshot();
    });
    await expect(watchOverlay).toContainText("Union Bulk Freighter");
    await expect(watchOverlay).toContainText("61%");
    await expect(watchOverlay).toContainText("Helion Prime");
    await expect(watchOverlay.getByRole("button", { name: "Return" })).toBeVisible();
    await watchOverlay.getByRole("button", { name: "Return" }).click();
    await expect(page.getByTestId("economy-tab")).toBeVisible();
    await expect(page.locator(".economy-npc-row", { hasText: "Union Bulk Freighter" })).toHaveCount(0);

    await page.getByRole("button", { name: "Launch" }).click();
    await expect(page.locator(".economy-route-label", { hasText: "MINING · Iron" })).toBeVisible();
  });

  test("routes from NPC watch before confirming escort with the keyboard", async ({ page }) => {
    await resetApp(page);
    await startNewGame(page);
    await page.evaluate(() => {
      const state = window.__GOF2_E2E__!.getState() as {
        dockAt: (stationId: string) => void;
        runtime: { enemies: unknown[] };
      };
      state.dockAt("helion-prime");
      window.__GOF2_E2E__!.setState({
        activeDialogue: undefined,
        stationTab: "Economy",
        economyService: { status: "connected", url: "http://127.0.0.1:19777", snapshotId: 303 },
        runtime: {
          ...state.runtime,
          graceUntil: 999,
          enemies: [
            {
              id: "econ-e2e-route-miner",
              name: "Route Ore Cutter",
              role: "miner",
              factionId: "free-belt-union",
              position: [3600, 40, -2000],
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
              economySerial: "HR-MN-ROUTE",
              economyHomeStationId: "cinder-yard",
              economyRiskPreference: "balanced",
              economyContractId: "HR-MN-ROUTE",
              economyLedger: { revenue: 0, expenses: 0, losses: 0, completedContracts: 0, failedContracts: 0, minedUnits: 0 },
              economyTaskKind: "mining",
              economyTaskProgress: 0.42,
              economyStatus: "MINING · Iron",
              economyCargo: {},
              economyCommodityId: "iron",
              economyTargetId: "helion-iron-1"
            }
          ]
        }
      });
    });

    await page.getByRole("button", { name: "Economy", exact: true }).click();
    const economy = page.getByTestId("economy-tab");
    await economy.locator(".economy-npc-row", { hasText: "Route Ore Cutter" }).getByRole("button", { name: "Watch" }).click();
    const watchOverlay = page.getByTestId("economy-watch-overlay");
    await expect(watchOverlay).toContainText("Route Ore Cutter");
    await watchOverlay.getByRole("button", { name: "Escort" }).click();

    await expect(page.locator(".flight-canvas canvas")).toBeVisible();
    await expect(page.locator(".hud-top-right")).toContainText("Autopilot: Intercepting NPC");
    await expect(page.locator("body")).not.toContainText("Escort accepted");
    expect(await getGameState(page)).toMatchObject({
      screen: "flight",
      autopilot: {
        phase: "to-npc",
        targetNpcId: "econ-e2e-route-miner",
        pendingNpcAction: "escort"
      }
    });

    await page.evaluate(() => {
      const state = window.__GOF2_E2E__!.getState() as {
        player: { position: [number, number, number]; velocity: [number, number, number] };
        runtime: { enemies: Array<{ id: string; position: [number, number, number] }> };
        tick: (delta: number) => void;
      };
      const npc = state.runtime.enemies.find((ship) => ship.id === "econ-e2e-route-miner")!;
      window.__GOF2_E2E__!.setState({
        player: {
          ...state.player,
          position: [npc.position[0] - 790, npc.position[1], npc.position[2]],
          velocity: [0, 0, 0]
        }
      });
      state.tick(0.1);
    });

    const interactionOverlay = page.getByTestId("npc-interaction-overlay");
    await expect(interactionOverlay).toContainText("Press E or confirm Escort");
    await page.keyboard.press("KeyE");
    await expect(interactionOverlay).toContainText("Escort accepted");
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

  test("renders flight space dialogue as non-blocking comms HUD", async ({ page }) => {
    await installSpeechSynthesisStub(page);
    await resetApp(page);
    await startNewGame(page, { keepIntro: true });

    const spaceDialogue = page.getByTestId("space-dialogue-overlay");
    await expect(spaceDialogue).toContainText("Launch clearance is green.");
    await expect(page.getByTestId("dialogue-overlay")).toHaveCount(0);
    await expect(spaceDialogue.getByRole("button")).toHaveCount(0);
    await expect(spaceDialogue).not.toContainText("Voice needs manual play");
    await expect(spaceDialogue).toHaveCSS("pointer-events", "none");

    await page.mouse.move(420, 320);
    await expect(spaceDialogue).toContainText("Launch clearance is green.");
    await endCurrentVoice(page);
    await expect(spaceDialogue).toContainText("Sparrow, keep the sync key sealed");
  });

  test("space dialogue falls back to timed autoplay when voice is blocked", async ({ page }) => {
    await installSpeechSynthesisStub(page);
    await resetApp(page);
    await blockNextVoiceStart(page, 3);
    await startNewGame(page, { keepIntro: true });

    const spaceDialogue = page.getByTestId("space-dialogue-overlay");
    await expect(spaceDialogue).toContainText("Launch clearance is green.");
    await expect(spaceDialogue).not.toContainText("Voice needs manual play");
    await expect(spaceDialogue.getByRole("button")).toHaveCount(0);
    await expect(spaceDialogue).toContainText("Sparrow, keep the sync key sealed", { timeout: 8_000 });
  });

  test("keeps a blocked first voiced story line until manual play", async ({ page }) => {
    await installSpeechSynthesisStub(page);
    await resetApp(page);
    await startNewGame(page);
    await blockNextVoiceStart(page, 3);
    await acceptCleanCarrierMission(page);

    const dialogue = page.getByTestId("dialogue-overlay");
    await expect(dialogue).toContainText("Captain, Helion traffic is handing you a clean sync key.");
    await expect(dialogue).toContainText("Voice needs manual play");
    await expect(dialogue).not.toContainText("That is a lot of purity for one missing probe.");

    await allowVoiceStart(page);
    await dialogue.getByRole("button", { name: "Play/Pause" }).click();
    await expect(dialogue).toContainText("Voice playing");

    await endCurrentVoice(page);
    await expect(dialogue).toContainText("That is a lot of purity for one missing probe.");
  });

  test("keeps Comms Archive replay in modal dialogue with controls", async ({ page }) => {
    await installSpeechSynthesisStub(page);
    await resetApp(page);
    await startNewGame(page);
    await acceptCleanCarrierMission(page);

    const dialogue = page.getByTestId("dialogue-overlay");
    await dialogue.getByRole("button", { name: "Skip" }).click();
    await expect(dialogue).toHaveCount(0);
    await page.getByRole("button", { name: "Captain's Log" }).click();
    await expect(page.getByText("Comms Archive")).toBeVisible();

    const cleanCarrierReplay = page.locator(".dialogue-replay-entry", { hasText: "Clean Carrier Briefing" });
    await cleanCarrierReplay.getByRole("button", { name: "Replay" }).click();
    await expect(dialogue).toContainText("Clean Carrier Briefing");
    await expect(dialogue.getByRole("button", { name: "Replay Voice" })).toBeVisible();
    await expect(dialogue.getByRole("button", { name: "Skip" })).toBeVisible();
    await expect(page.getByTestId("space-dialogue-overlay")).toHaveCount(0);
  });

  test("recovers first voiced story line when clip output starts with a suspended audio context", async ({ page }) => {
    await installSuspendedVoiceAudioStub(page);
    await resetApp(page);
    await startNewGame(page);
    await acceptCleanCarrierMission(page);

    const dialogue = page.getByTestId("dialogue-overlay");
    await expect(dialogue).toContainText("Captain, Helion traffic is handing you a clean sync key.");
    await expect(dialogue).toContainText("Voice needs manual play");
    await expect(dialogue).not.toContainText("That is a lot of purity for one missing probe.");

    await page.evaluate(() => {
      (window as unknown as { __GOF2_TEST_VOICE_AUDIO__: TestVoiceAudioHarness }).__GOF2_TEST_VOICE_AUDIO__.allowResume = true;
    });
    await dialogue.getByRole("button", { name: "Play/Pause" }).click();
    await expect(dialogue).toContainText("Voice playing");
    await expect.poll(async () => {
      return page.evaluate(() => (window as unknown as { __GOF2_TEST_VOICE_AUDIO__: TestVoiceAudioHarness }).__GOF2_TEST_VOICE_AUDIO__.state);
    }).toBe("running");
  });

  test("goes back to the previous voiced story line without stale auto-advance", async ({ page }) => {
    await installSpeechSynthesisStub(page);
    await resetApp(page);
    await startNewGame(page);
    await acceptCleanCarrierMission(page);

    const dialogue = page.getByTestId("dialogue-overlay");
    const backButton = dialogue.getByRole("button", { name: "Back" });
    await expect(dialogue).toContainText("Captain, Helion traffic is handing you a clean sync key.");
    await expect(backButton).toBeDisabled();

    await dialogue.getByRole("button", { name: "Next" }).click();
    await expect(dialogue).toContainText("That is a lot of purity for one missing probe.");
    await expect(backButton).toBeEnabled();

    await endLastCanceledVoice(page);
    await expect(dialogue).toContainText("That is a lot of purity for one missing probe.");
    await expect(dialogue).not.toContainText("Purity is the point.");

    await backButton.click();
    await expect(dialogue).toContainText("Captain, Helion traffic is handing you a clean sync key.");
    await expect(backButton).toBeDisabled();

    await endLastCanceledVoice(page);
    await expect(dialogue).toContainText("Captain, Helion traffic is handing you a clean sync key.");
    await expect(dialogue).not.toContainText("That is a lot of purity for one missing probe.");

    await endCurrentVoice(page);
    await expect(dialogue).toContainText("That is a lot of purity for one missing probe.");
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

    await page.evaluate(() => {
      const state = window.__GOF2_E2E__!.getState() as { closeDialogue: () => void };
      state.closeDialogue();
    });
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
    await expect(page.locator(".hud-top-right").getByTestId("story-tracker")).toHaveCount(0);
    await expect(page.locator(".hud-top-right").getByTestId("onboarding-guide")).toHaveCount(0);
    await expect(page.getByTestId("hud-left-stack").getByTestId("onboarding-guide")).toBeVisible();
    const trackerMetrics = await page.getByTestId("story-tracker").evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        visibleHeight: rect.height,
        scrollHeight: element.scrollHeight,
        viewportWidth: window.innerWidth
      };
    });
    expect(trackerMetrics.left).toBeLessThan(trackerMetrics.viewportWidth / 3);
    expect(trackerMetrics.right).toBeLessThan(trackerMetrics.viewportWidth / 2);
    expect(trackerMetrics.visibleHeight).toBeGreaterThanOrEqual(trackerMetrics.scrollHeight - 1);
    const rightHudMetrics = await page.locator(".hud-top-right").evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight
    }));
    expect(rightHudMetrics.clientHeight).toBeGreaterThanOrEqual(rightHudMetrics.scrollHeight - 1);
    const onboardingMetrics = await page.getByTestId("onboarding-guide").evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        visibleHeight: rect.height,
        scrollHeight: element.scrollHeight,
        viewportWidth: window.innerWidth
      };
    });
    expect(onboardingMetrics.left).toBeLessThan(onboardingMetrics.viewportWidth / 3);
    expect(onboardingMetrics.right).toBeLessThan(onboardingMetrics.viewportWidth / 2);
    expect(onboardingMetrics.visibleHeight).toBeGreaterThanOrEqual(onboardingMetrics.scrollHeight - 1);
    await expect(page.locator(".story-waypoint-label")).toContainText("Main Story");

    await page.keyboard.press("KeyM");
    await expect(page.getByText("Route Planning")).toBeVisible();
    await expect(page.locator(".galaxy-system.story-pin")).toContainText("Main Story");
    await page.getByRole("button", { name: "Mirr Vale known" }).click();
    await expect(page.getByTestId("story-map-brief")).toContainText("Glass Wake 01");
    await expect(page.locator(".planet-list button.story-destination")).toContainText("Main Story");
  });

  test("smokes the Glass Wake 01-02 intro, boss, salvage, and debrief path", async ({ page }) => {
    await resetApp(page);
    await startNewGame(page, { keepIntro: true });

    const dialogue = page.getByTestId("dialogue-overlay");
    const spaceDialogue = page.getByTestId("space-dialogue-overlay");
    await expect(spaceDialogue).toContainText("Launch clearance is green.");
    await expect(spaceDialogue).toHaveCSS("pointer-events", "none");
    await expect(page.getByTestId("dialogue-cinematic-glass-wake-intro")).toHaveCount(0);
    await expect(dialogue).toHaveCount(0);
    await page.evaluate(() => {
      const store = window.__GOF2_E2E__!.getState() as { closeDialogue: () => void };
      store.closeDialogue();
    });
    await expect(spaceDialogue).toHaveCount(0);

    await acceptCleanCarrierMission(page);
    await expect(page.getByTestId("dialogue-cinematic-glass-wake-intro")).toBeVisible();
    await dialogue.getByRole("button", { name: "Skip" }).click();
    await expect(dialogue).toHaveCount(0);

    await page.evaluate(() => {
      const store = window.__GOF2_E2E__!.getState() as {
        jumpToSystem: (systemId: string) => void;
        dockAt: (stationId: string) => void;
      };
      store.jumpToSystem("mirr-vale");
      store.dockAt("mirr-lattice");
    });
    await expect(dialogue).toContainText("Clean Carrier Debrief");
    await dialogue.getByRole("button", { name: "Skip" }).click();
    await expect(dialogue).toContainText("Probe in the Glass Briefing");
    await dialogue.getByRole("button", { name: "Skip" }).click();
    await expect(dialogue).toHaveCount(0);

    await page.getByRole("button", { name: "Launch" }).click();
    await expect(page.getByTestId("story-tracker")).toContainText("Glass Echo Drone");

    await page.evaluate(() => {
      const e2e = window.__GOF2_E2E__!;
      const state = e2e.getState() as {
        player: Record<string, unknown>;
        runtime: {
          enemies: Array<Record<string, unknown>>;
          projectiles: Array<Record<string, unknown>>;
        };
      };
      e2e.setState({
        targetId: "glass-echo-drone",
        player: { ...state.player, position: [0, 0, 0] },
        runtime: {
          ...state.runtime,
          enemies: state.runtime.enemies.map((ship) =>
            ship.id === "glass-echo-drone"
              ? { ...ship, position: [0, 0, 0] }
              : { ...ship, position: [900, 0, 900] }
          ),
          projectiles: [{
            id: "e2e-drone-shot",
            owner: "player",
            kind: "laser",
            position: [0, 0, 0],
            direction: [0, 0, 0],
            speed: 0,
            damage: 999,
            life: 1,
            targetId: "glass-echo-drone"
          }]
        }
      });
      (e2e.getState() as { tick: (delta: number) => void }).tick(0.05);
    });
    await expect(page.getByTestId("story-notification")).toContainText("Prime Wake");
    await expect(page.getByTestId("story-tracker")).toContainText("Glass Echo Prime");

    await page.evaluate(() => {
      const e2e = window.__GOF2_E2E__!;
      const state = e2e.getState() as {
        runtime: {
          enemies: Array<Record<string, unknown>>;
          projectiles: Array<Record<string, unknown>>;
        };
      };
      e2e.setState({
        targetId: "glass-echo-prime",
        runtime: {
          ...state.runtime,
          enemies: state.runtime.enemies.map((ship) =>
            ship.id === "glass-echo-prime"
              ? { ...ship, position: [0, 0, 0] }
              : { ...ship, position: [900, 0, 900] }
          ),
          projectiles: [{
            id: "e2e-prime-shot",
            owner: "player",
            kind: "laser",
            position: [0, 0, 0],
            direction: [0, 0, 0],
            speed: 0,
            damage: 999,
            life: 1,
            targetId: "glass-echo-prime"
          }]
        }
      });
      (e2e.getState() as { tick: (delta: number) => void }).tick(0.05);
    });
    await expect(page.getByTestId("story-notification")).toContainText("Probe Core Exposed");

    await page.evaluate(() => {
      const e2e = window.__GOF2_E2E__!;
      const state = e2e.getState() as {
        player: Record<string, unknown>;
        runtime: { salvage: Array<{ id: string; position: [number, number, number] }> };
        interact: () => void;
      };
      const core = state.runtime.salvage.find((item) => item.id === "glass-wake-probe-core");
      if (!core) throw new Error("Glass Wake Probe Core was not spawned");
      e2e.setState({ player: { ...state.player, position: core.position } });
      (e2e.getState() as { interact: () => void }).interact();
    });
    await expect.poll(() =>
      page.evaluate(() => {
        const state = window.__GOF2_E2E__!.getState() as {
          activeMissions: Array<{ id: string; salvage?: { recovered?: boolean } }>;
        };
        return state.activeMissions.find((mission) => mission.id === "story-probe-in-glass")?.salvage?.recovered === true;
      })
    ).toBe(true);

    await page.evaluate(() => {
      const store = window.__GOF2_E2E__!.getState() as {
        dockAt: (stationId: string) => void;
        completeMission: (missionId: string) => void;
      };
      store.dockAt("mirr-lattice");
      store.completeMission("story-probe-in-glass");
    });
    await expect(dialogue).toContainText("Probe in the Glass Debrief");
    await expect(page.getByTestId("dialogue-cinematic-glass-echo-reversal")).toBeVisible();
  });

  test("runs glass-wake-hero direct encounter stages", async ({ page }) => {
    test.setTimeout(120_000);
    await resetApp(page);
    await startNewGame(page);

    await page.evaluate(() => {
      (window.__GOF2_E2E__! as { applyDebugScenario: (scenarioId: string) => void }).applyDebugScenario("glass-wake-hero");
    });
    await expect(page.locator(".flight-canvas canvas")).toBeVisible();
    await page.evaluate(() => {
      (window.__GOF2_E2E__!.getState() as { setGraphicsQuality: (quality: "low" | "ultra") => void }).setGraphicsQuality("low");
    });
    await expect.poll(() =>
      page.evaluate(() => (window.__GOF2_E2E__!.getState() as { graphicsSettings: { quality: string; postProcessing: boolean; assetDetail: string; vfxDetail: string } }).graphicsSettings)
    ).toMatchObject({ quality: "low", postProcessing: false, assetDetail: "low", vfxDetail: "low" });
    await expectWebGlCanvasHasPixels(page);
    await page.evaluate(() => {
      (window.__GOF2_E2E__!.getState() as { setGraphicsQuality: (quality: "low" | "ultra") => void }).setGraphicsQuality("ultra");
    });
    await expect.poll(() =>
      page.evaluate(() => (window.__GOF2_E2E__!.getState() as { graphicsSettings: { quality: string; postProcessing: boolean; assetDetail: string; vfxDetail: string } }).graphicsSettings)
    ).toMatchObject({ quality: "ultra", postProcessing: true, assetDetail: "ultra", vfxDetail: "ultra" });
    await expect(page.getByTestId("story-tracker")).toContainText("Ghost Carrier");
    await expect(page.getByTestId("story-tracker")).toContainText("Glass Echo Drone");

    async function destroyTarget(targetId: "glass-echo-drone" | "glass-echo-prime") {
      await page.evaluate((id) => {
        const e2e = window.__GOF2_E2E__!;
        const state = e2e.getState() as {
          player: Record<string, unknown>;
          runtime: {
            enemies: Array<Record<string, unknown>>;
            projectiles: Array<Record<string, unknown>>;
          };
        };
        e2e.setState({
          targetId: id,
          player: { ...state.player, position: [0, 0, 0] },
          runtime: {
            ...state.runtime,
            enemies: state.runtime.enemies.map((ship) =>
              ship.id === id
                ? { ...ship, position: [0, 0, 0] }
                : { ...ship, position: [900, 0, 900] }
            ),
            projectiles: [{
              id: `e2e-${id}-shot`,
              owner: "player",
              kind: "laser",
              position: [0, 0, 0],
              direction: [0, 0, 0],
              speed: 0,
              damage: 999,
              life: 1,
              targetId: id
            }]
          }
        });
        (e2e.getState() as { tick: (delta: number) => void }).tick(0.05);
      }, targetId);
    }

    await destroyTarget("glass-echo-drone");
    await expect(page.getByTestId("story-notification")).toContainText("Prime Wake");
    await expect(page.getByTestId("story-tracker")).toContainText("Glass Echo Prime");

    await destroyTarget("glass-echo-prime");
    await expect(page.getByTestId("story-notification")).toContainText("Probe Core Exposed");

    await page.evaluate(() => {
      const e2e = window.__GOF2_E2E__!;
      const state = e2e.getState() as {
        player: Record<string, unknown>;
        runtime: { salvage: Array<{ id: string; position: [number, number, number] }> };
      };
      const core = state.runtime.salvage.find((item) => item.id === "glass-wake-probe-core");
      if (!core) throw new Error("Glass Wake Probe Core was not spawned");
      e2e.setState({ player: { ...state.player, position: core.position } });
      (e2e.getState() as { interact: () => void }).interact();
    });
    await expect(page.getByTestId("story-notification")).toContainText("Core Secured");

    await page.evaluate(() => {
      const store = window.__GOF2_E2E__!.getState() as {
        dockAt: (stationId: string) => void;
        completeMission: (missionId: string) => void;
      };
      store.dockAt("mirr-lattice");
      store.completeMission("story-probe-in-glass");
    });
    await expect(page.getByTestId("story-notification")).toContainText("First Reversal Logged");
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
    const loungeScrollMetrics = await page.locator(".station-body--lounge").evaluate((element) => ({
      clientHeight: element.clientHeight,
      overflowY: window.getComputedStyle(element).overflowY,
      scrollHeight: element.scrollHeight
    }));
    expect(loungeScrollMetrics.overflowY).toBe("auto");
    expect(loungeScrollMetrics.scrollHeight).toBeGreaterThan(loungeScrollMetrics.clientHeight);
    const solarRow = page.locator(".faction-consequence").filter({ hasText: "Solar Directorate" });
    await expect(solarRow).toContainText("Wanted");
    await expect(solarRow).toContainText("3,000");
    await solarRow.getByRole("button", { name: "Pay Fine" }).click();
    await expect(solarRow).toContainText("Clear");
    await expect(solarRow).not.toContainText("3,000");
  });

  test("keeps station header title compact", async ({ page }) => {
    await resetApp(page);
    await startNewGame(page);
    await dockAtStation(page, "mirr-lattice");
    await expect(page.getByRole("heading", { name: "Mirr Lattice" })).toBeVisible();

    const headerType = await page.locator(".station-header").evaluate((element) => {
      const title = element.querySelector("h1");
      const techLine = title?.nextElementSibling;
      if (!title || !techLine) return null;
      return {
        titleFontSize: Number.parseFloat(window.getComputedStyle(title).fontSize),
        techFontSize: Number.parseFloat(window.getComputedStyle(techLine).fontSize)
      };
    });
    expect(headerType).not.toBeNull();
    expect(headerType!.titleFontSize).toBeLessThanOrEqual(headerType!.techFontSize * 1.4);
    expect(headerType!.titleFontSize).toBeLessThanOrEqual(28);
  });

  test("surfaces Quiet Signals progress and unlocks the chain reward", async ({ page }) => {
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
    await expect(page.getByTestId("exploration-chain-helion-sundog-chain")).toContainText("2/3");
    await expect(page.getByTestId("exploration-chain-helion-sundog-chain")).toContainText("Survey Array");
  });

  test("covers station trade, mission accept, jump, save, and reload", async ({ page }) => {
    await resetApp(page);
    await startNewGame(page);

    await dockAtStation(page, "helion-prime", { keepDialogue: true });
    await expect(page.getByRole("heading", { name: "Helion Prime Exchange" })).toBeVisible();
    await expect(page.locator(".station-header")).toContainText("Tech Level 2");
    await expect(page.getByTestId("dialogue-overlay")).toContainText("Clean Carrier Briefing");
    await expect(page.getByTestId("speaker-portrait-helion-handler")).toBeVisible();
    await expect(page.getByTestId("speaker-portrait-helion-handler")).toHaveAttribute("src", /\/assets\/generated\/portraits\/helion-handler\.webp$/);
    await expect(page.getByTestId("dialogue-overlay")).toContainText("Captain, Helion traffic is handing you a clean sync key. It has never touched");
    await page.getByTestId("dialogue-overlay").getByRole("button", { name: "Skip" }).click();
    await expect(page.getByTestId("dialogue-overlay")).toHaveCount(0);

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

  test("marks Clean Carrier active after station auto-accept", async ({ page }) => {
    await resetApp(page);
    await startNewGame(page);

    await dockAtStation(page, "helion-prime");
    await page.getByRole("button", { name: "Mission Board" }).click();

    const storyMission = page.getByTestId("mission-card-story-clean-carrier");
    await expect(page.getByTestId("onboarding-board-note")).toHaveCount(0);
    await expect(storyMission).toContainText("Glass Wake 01: Clean Carrier");
    await expect(storyMission.getByRole("button", { name: "Set Route" })).toBeVisible();
    expect((await getGameState(page)).activeMissions.map((mission) => mission.id)).toContain("story-clean-carrier");
  });

  test("keeps shipyard and blueprint long card details collapsed until expanded", async ({ page }) => {
    await resetApp(page);
    await startNewGame(page);

    await dockAtStation(page, "helion-prime");

    await page.getByRole("button", { name: "Shipyard" }).click();
    const starterShip = page.getByTestId("ship-card-sparrow-mk1");
    await expect(starterShip.getByText("Starter scout")).toBeVisible();
    await expect(starterShip.getByRole("button", { name: "Current" })).toBeVisible();
    await expect(starterShip.getByText("Hull 100", { exact: false })).toBeHidden();
    await expect(starterShip.getByText("Stock loadout:", { exact: false })).toBeHidden();

    await starterShip.locator("summary").click();
    await expect(starterShip.getByText("Hull 100", { exact: false })).toBeVisible();
    await expect(starterShip.getByText("Stock loadout:", { exact: false })).toBeVisible();

    await page.getByRole("button", { name: "Blueprint Workshop" }).click();
    const plasmaBlueprint = page.getByTestId("blueprint-card-plasma-cannon");
    const plasmaDetails = plasmaBlueprint.locator(".card-details-body");
    await expect(plasmaBlueprint.getByText("Researchable")).toBeVisible();
    await expect(plasmaBlueprint.getByRole("button", { name: "Research" })).toBeVisible();
    await expect(plasmaDetails.getByText("Requires: Pulse Laser")).toBeHidden();
    await expect(plasmaDetails.getByText("Unlock: 350 cr")).toBeHidden();

    await plasmaBlueprint.locator("summary").click();
    await expect(plasmaDetails.getByText("Requires: Pulse Laser")).toBeVisible();
    await expect(plasmaDetails.getByText("Unlock: 350 cr")).toBeVisible();

    await plasmaBlueprint.getByRole("heading", { name: "Plasma Cannon" }).click();
    await expect(page.locator("#equipment-popover")).toContainText("Plasma Cannon");

    await plasmaBlueprint.getByRole("button", { name: "Research" }).click();
    await expect(plasmaBlueprint).toContainText("Unlocked");
    expect((await getGameState(page)).player.unlockedBlueprintIds).toContain("plasma-cannon");
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
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 2048, height: 930 });
    await resetApp(page);
    await startNewGame(page);

    await page.keyboard.press("KeyM");
    await expect(page.getByText("Route Planning")).toBeVisible();
    await page.getByRole("button", { name: "Mirr Vale known" }).click();
    await expect(page.getByRole("button", { name: "Set Route" })).toBeVisible();
    const flightModalMetrics = await page.evaluate(() => {
      const routeButton = [...document.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Set Route");
      const actions = document.querySelector(".galaxy-actions");
      const panel = document.querySelector(".galaxy-panel");
      if (!routeButton || !actions || !panel) return null;
      const routeRect = routeButton.getBoundingClientRect();
      const actionsRect = actions.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      return {
        actionsBottom: actionsRect.bottom,
        panelBottom: panelRect.bottom,
        routeBottom: routeRect.bottom,
        routeTop: routeRect.top,
        viewportHeight: window.innerHeight
      };
    });
    expect(flightModalMetrics).not.toBeNull();
    expect(flightModalMetrics!.routeTop).toBeGreaterThanOrEqual(0);
    expect(flightModalMetrics!.routeBottom).toBeLessThanOrEqual(flightModalMetrics!.viewportHeight);
    expect(flightModalMetrics!.actionsBottom).toBeLessThanOrEqual(flightModalMetrics!.panelBottom);
    await page.getByRole("button", { name: "Return" }).click();
    await expect(page.locator(".flight-canvas canvas")).toBeVisible();

    await page.locator(".hud-bottom-right").getByRole("button", { name: "Map" }).click();
    await expect(page.getByText("Route Planning")).toBeVisible();
    await page.getByRole("button", { name: "Mirr Vale known" }).click();
    await expect(page.locator(".planet-list")).toContainText("Tech Level 3");
    await expect(page.locator(".galaxy-actions")).toContainText("Mirr Glass · Mirr Lattice · Tech Level 3");

    const routeButton = page.getByRole("button", { name: "Set Route" });
    await expect(routeButton).toBeEnabled();
    await page.keyboard.press("Enter");

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

  test.describe("mobile and foldable layouts", () => {
    test.use({ hasTouch: true, isMobile: true });

    async function expectMobileFlightLayout(page: Page, viewportName: string) {
      const metrics = await page.evaluate(() => {
        const viewport = { width: window.innerWidth, height: window.innerHeight };
        const visibleRect = (selector: string) =>
          [...document.querySelectorAll(selector)]
            .filter((element) => {
              const style = window.getComputedStyle(element);
              const rect = element.getBoundingClientRect();
              return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
            })
            .map((element) => {
              const rect = element.getBoundingClientRect();
              return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
            });
        const panels = visibleRect(".hud-panel");
        const actions = visibleRect("[data-testid='touch-flight-controls'] button, [data-testid='touch-throttle-pad'], [data-testid='touch-look-pad']");
        const buttons = visibleRect("[data-testid='touch-flight-controls'] button");
        let overlaps = 0;
        for (let i = 0; i < panels.length; i++) {
          for (let j = i + 1; j < panels.length; j++) {
            const a = panels[i];
            const b = panels[j];
            const area = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
            if (area > 1) overlaps += 1;
          }
        }
        const inside = [...panels, ...actions].every((rect) =>
          rect.left >= -1 &&
          rect.top >= -1 &&
          rect.right <= viewport.width + 1 &&
          rect.bottom <= viewport.height + 1
        );
        return {
          bodyOverflowX: document.documentElement.scrollWidth - viewport.width,
          inside,
          overlaps,
          panels: panels.length,
          actions: actions.length,
          smallButtons: buttons.filter((rect) => rect.width < 44 || rect.height < 44).length,
          viewport
        };
      });

      expect(metrics.bodyOverflowX, viewportName).toBeLessThanOrEqual(1);
      expect(metrics.inside, viewportName).toBe(true);
      expect(metrics.overlaps, viewportName).toBe(0);
      expect(metrics.panels, viewportName).toBeGreaterThan(0);
      expect(metrics.actions, viewportName).toBeGreaterThan(2);
      expect(metrics.smallButtons, viewportName).toBe(0);
    }

    test("keeps flight HUD and touch controls inside phone and foldable viewports", async ({ page }) => {
      test.setTimeout(180_000);
      const viewports = [
        { name: "phone portrait 375x667", width: 375, height: 667 },
        { name: "phone portrait 393x852", width: 393, height: 852 },
        { name: "phone portrait 430x932", width: 430, height: 932 },
        { name: "phone landscape 667x375", width: 667, height: 375 },
        { name: "phone landscape 852x393", width: 852, height: 393 },
        { name: "phone landscape 932x430", width: 932, height: 430 },
        { name: "fold cover proxy", width: 390, height: 844 },
        { name: "fold unfolded portrait", width: 820, height: 900 },
        { name: "fold unfolded landscape", width: 900, height: 820 },
        { name: "tablet portrait", width: 768, height: 1024 },
        { name: "tablet landscape", width: 1024, height: 768 }
      ];

      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await resetApp(page);
        await startNewGame(page);
        await expect(page.getByTestId("touch-flight-controls")).toBeVisible();
        if (viewport.name.includes("portrait")) {
          await expect(page.getByText("Landscape flight recommended")).toBeVisible();
        }
        await expectMobileFlightLayout(page, viewport.name);
        if (viewport.name === "phone portrait 393x852") await maybeCaptureMobileMatrix(page, "phone-portrait-flight.png");
        if (viewport.name === "phone landscape 852x393") await maybeCaptureMobileMatrix(page, "phone-landscape-flight.png");
        if (viewport.name === "fold unfolded landscape") await maybeCaptureMobileMatrix(page, "fold-unfolded-flight.png");
        if (viewport.name === "phone landscape 852x393") await expectWebGlCanvasHasPixels(page);
      }
    });

    test("maps touch pads and action buttons onto existing flight input", async ({ page }) => {
      test.setTimeout(75_000);
      await page.setViewportSize({ width: 852, height: 393 });
      await resetApp(page);
      await startNewGame(page);

      const throttlePad = page.getByTestId("touch-throttle-pad");
      const throttleBox = await throttlePad.boundingBox();
      expect(throttleBox).not.toBeNull();
      await page.mouse.move(throttleBox!.x + throttleBox!.width * 0.5, throttleBox!.y + throttleBox!.height * 0.5);
      await page.mouse.down();
      await page.mouse.move(throttleBox!.x + throttleBox!.width * 0.84, throttleBox!.y + throttleBox!.height * 0.16);
      await expect.poll(() =>
        page.evaluate(() => {
          const input = (window.__GOF2_E2E__!.getState() as { input: { rollRight: boolean; throttleUp: boolean } }).input;
          return { rollRight: input.rollRight, throttleUp: input.throttleUp };
        })
      ).toEqual({ rollRight: true, throttleUp: true });
      await page.mouse.up();
      await expect.poll(() =>
        page.evaluate(() => {
          const input = (window.__GOF2_E2E__!.getState() as { input: { rollRight: boolean; throttleUp: boolean } }).input;
          return { rollRight: input.rollRight, throttleUp: input.throttleUp };
        })
      ).toEqual({ rollRight: false, throttleUp: false });

      const beforeYaw = await page.evaluate(() => (window.__GOF2_E2E__!.getState() as { player: { rotation: number[] } }).player.rotation[1]);
      const lookPad = page.getByTestId("touch-look-pad");
      const lookBox = await lookPad.boundingBox();
      expect(lookBox).not.toBeNull();
      await page.evaluate(() => {
        const state = window.__GOF2_E2E__!.getState() as {
          input: Record<string, unknown>;
          currentSystemId: string;
        };
        window.__GOF2_E2E__!.setState({
          autopilot: {
            phase: "to-origin-gate",
            originSystemId: state.currentSystemId,
            targetSystemId: "mirr-vale",
            targetStationId: "mirr-lattice",
            targetPosition: [0, 0, -760],
            timer: 0,
            cancelable: true
          },
          input: { ...state.input, mouseDX: 0, mouseDY: 0 }
        });
      });
      await page.mouse.move(lookBox!.x + lookBox!.width * 0.5, lookBox!.y + lookBox!.height * 0.5);
      await page.mouse.down();
      await page.mouse.move(lookBox!.x + lookBox!.width * 0.82, lookBox!.y + lookBox!.height * 0.35);
      await page.mouse.up();
      await expect.poll(() =>
        page.evaluate(() => {
          const input = (window.__GOF2_E2E__!.getState() as { input: { mouseDX: number; mouseDY: number } }).input;
          return { mouseDX: input.mouseDX, mouseDY: input.mouseDY };
        })
      ).toEqual({ mouseDX: 0, mouseDY: 0 });
      await page.evaluate(() => window.__GOF2_E2E__!.setState({ autopilot: undefined }));
      await page.mouse.move(lookBox!.x + lookBox!.width * 0.5, lookBox!.y + lookBox!.height * 0.5);
      await page.mouse.down();
      await page.mouse.move(lookBox!.x + lookBox!.width * 0.82, lookBox!.y + lookBox!.height * 0.35);
      await page.mouse.up();
      await expect.poll(async () => {
        const yaw = await page.evaluate(() => (window.__GOF2_E2E__!.getState() as { player: { rotation: number[] } }).player.rotation[1]);
        return Math.abs(yaw - beforeYaw) > 0.01;
      }).toBe(true);

      const fireButton = page.getByTestId("touch-fire-primary");
      const fireBox = await fireButton.boundingBox();
      expect(fireBox).not.toBeNull();
      await page.mouse.move(fireBox!.x + fireBox!.width / 2, fireBox!.y + fireBox!.height / 2);
      await page.mouse.down();
      await expect.poll(() => page.evaluate(() => (window.__GOF2_E2E__!.getState() as { input: { firePrimary: boolean } }).input.firePrimary)).toBe(true);
      await page.mouse.up();
      await expect.poll(() => page.evaluate(() => (window.__GOF2_E2E__!.getState() as { input: { firePrimary: boolean } }).input.firePrimary)).toBe(false);

      const boostButton = page.getByTestId("touch-afterburner");
      const boostBox = await boostButton.boundingBox();
      expect(boostBox).not.toBeNull();
      await page.mouse.move(boostBox!.x + boostBox!.width / 2, boostBox!.y + boostBox!.height / 2);
      await page.mouse.down();
      await expect.poll(() => page.evaluate(() => (window.__GOF2_E2E__!.getState() as { input: { afterburner: boolean } }).input.afterburner)).toBe(true);
      await page.mouse.up();
      await expect.poll(() => page.evaluate(() => (window.__GOF2_E2E__!.getState() as { input: { afterburner: boolean } }).input.afterburner)).toBe(false);

      await page.getByRole("button", { name: "Open map" }).click();
      await expect(page.getByText("Route Planning")).toBeVisible();
    });

    test("keeps mobile route planning and station panels reachable on phones and unfolded folds", async ({ page }) => {
      test.setTimeout(90_000);
      const viewports = [
        { name: "phone portrait", width: 393, height: 852, folded: false },
        { name: "phone landscape", width: 852, height: 393, folded: false },
        { name: "unfolded fold", width: 820, height: 900, folded: true },
        { name: "tablet landscape", width: 1024, height: 768, folded: true }
      ];

      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await resetApp(page);
        await startNewGame(page);

        await page.getByRole("button", { name: "Open map" }).click();
        await expect(page.getByText("Route Planning")).toBeVisible();
        if (viewport.name === "phone landscape") await maybeCaptureMobileMatrix(page, "phone-landscape-map.png");
        await page.getByRole("button", { name: "Mirr Vale known" }).click();
        await expect(page.getByRole("button", { name: "Set Route" })).toBeVisible();

        const mapMetrics = await page.evaluate(() => {
          const panel = document.querySelector(".galaxy-panel");
          const chart = document.querySelector(".galaxy-chart");
          const details = document.querySelector(".galaxy-details");
          const routeButton = [...document.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Set Route");
          if (!panel || !chart || !details || !routeButton) return null;
          const panelRect = panel.getBoundingClientRect();
          const chartRect = chart.getBoundingClientRect();
          const detailsRect = details.getBoundingClientRect();
          const routeRect = routeButton.getBoundingClientRect();
          return {
            chartTop: chartRect.top,
            detailsTop: detailsRect.top,
            panelLeft: panelRect.left,
            panelRight: panelRect.right,
            routeBottom: routeRect.bottom,
            routeTop: routeRect.top,
            viewportHeight: window.innerHeight,
            viewportWidth: window.innerWidth,
            columns: window.getComputedStyle(document.querySelector(".galaxy-layout")!).gridTemplateColumns.split(" ").length
          };
        });
        expect(mapMetrics).not.toBeNull();
        expect(mapMetrics!.panelLeft, viewport.name).toBeGreaterThanOrEqual(-1);
        expect(mapMetrics!.panelRight, viewport.name).toBeLessThanOrEqual(mapMetrics!.viewportWidth + 1);
        expect(mapMetrics!.routeTop, viewport.name).toBeGreaterThanOrEqual(-1);
        expect(mapMetrics!.routeBottom, viewport.name).toBeLessThanOrEqual(mapMetrics!.viewportHeight + 1);
        if (viewport.folded) expect(mapMetrics!.columns, viewport.name).toBeGreaterThanOrEqual(2);

        await dockAtStation(page, "helion-prime");
        await expect(page.getByRole("heading", { name: "Helion Prime Exchange" })).toBeVisible();
        await page.getByRole("button", { name: "Economy" }).click();
        await expect(page.getByTestId("economy-tab")).toBeVisible();
        await page.getByRole("button", { name: "Hangar" }).click();
        await expect(page.getByRole("heading", { name: "Current Ship" })).toBeVisible();
        if (viewport.name === "unfolded fold") await maybeCaptureMobileMatrix(page, "fold-unfolded-station.png");
        await page.getByRole("button", { name: "Captain's Log" }).click();
        await expect(page.getByTestId("captain-log-next-up")).toBeVisible();
        if (viewport.name === "tablet landscape") await maybeCaptureMobileMatrix(page, "tablet-landscape-captains-log.png");

        const stationMetrics = await page.evaluate(() => {
          const body = document.querySelector(".station-body");
          const tabs = document.querySelector(".tab-row");
          const storyLog = document.querySelector(".story-log");
          if (!body || !tabs || !storyLog) return null;
          const bodyRect = body.getBoundingClientRect();
          const tabsRect = tabs.getBoundingClientRect();
          return {
            bodyBottom: bodyRect.bottom,
            tabsRight: tabsRect.right,
            viewportHeight: window.innerHeight,
            viewportWidth: window.innerWidth,
            storyColumns: window.getComputedStyle(storyLog).gridTemplateColumns.split(" ").length
          };
        });
        expect(stationMetrics).not.toBeNull();
        expect(stationMetrics!.bodyBottom, viewport.name).toBeLessThanOrEqual(stationMetrics!.viewportHeight + 1);
        expect(stationMetrics!.tabsRight, viewport.name).toBeLessThanOrEqual(stationMetrics!.viewportWidth + 1);
        if (viewport.folded) expect(stationMetrics!.storyColumns, viewport.name).toBeGreaterThanOrEqual(2);
      }
    });

    test("PWA preview exposes install metadata and offline cached resources", async ({ browser }) => {
      const context = await browser.newContext({ serviceWorkers: "allow", viewport: { width: 852, height: 393 }, isMobile: true, hasTouch: true });
      const page = await context.newPage();
      try {
        await page.goto("/?pwa=1");
        await page.waitForFunction(() => !!window.__GOF2_PWA_READY__);
        await page.evaluate(() => window.__GOF2_PWA_READY__?.then(() => true));
        const controlled = await page.waitForFunction(() => !!navigator.serviceWorker.controller, undefined, { timeout: 8_000 })
          .then(() => true)
          .catch(() => false);
        if (!controlled) {
          await page.reload({ waitUntil: "domcontentloaded" });
          await page.waitForFunction(() => !!navigator.serviceWorker.controller, undefined, { timeout: 8_000 });
          await page.waitForFunction(() => !!window.__GOF2_PWA_READY__);
          await page.evaluate(() => window.__GOF2_PWA_READY__?.then(() => true));
        }
        await page.waitForFunction(async () => {
          const keys = await caches.keys();
          const matches = await Promise.all(keys.map(async (key) => {
            const cache = await caches.open(key);
            return !!(await cache.match("/assets/generated/key-art.webp"));
          }));
          return matches.some(Boolean);
        });
        await page.waitForFunction(async () => {
          const resourceUrls = performance.getEntriesByType("resource")
            .map((entry) => entry.name)
            .filter((entryUrl) => {
              try {
                const url = new URL(entryUrl);
                return url.origin === window.location.origin && /\.(css|js)$/.test(url.pathname);
              } catch {
                return false;
              }
            });
          if (resourceUrls.length === 0) return false;
          const matches = await Promise.all(resourceUrls.map((entryUrl) => caches.match(entryUrl)));
          return matches.every(Boolean);
        }, undefined, { timeout: 15_000 });

        const manifestResponse = await page.request.get("/manifest.webmanifest");
        expect(manifestResponse.ok()).toBe(true);
        const manifest = await manifestResponse.json() as { name: string; display: string; icons: Array<{ sizes: string; purpose?: string }> };
        expect(manifest).toMatchObject({ name: "GOF2 by pzy", display: "standalone" });
        expect(manifest.icons.some((icon) => icon.sizes === "192x192")).toBe(true);
        expect(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "maskable")).toBe(true);

        await context.setOffline(true);
        await page.goto("/?pwa=1", { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("heading", { name: "GOF2 by pzy" })).toBeVisible();
        await expect(page.evaluate(() => fetch("/assets/generated/key-art.webp").then((response) => response.ok))).resolves.toBe(true);
      } finally {
        await context.setOffline(false);
        await page.evaluate(async () => {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((registration) => registration.unregister()));
          const keys = await caches.keys();
          await Promise.all(keys.filter((key) => key.startsWith("gof2-pwa-")).map((key) => caches.delete(key)));
        }).catch(() => undefined);
        await context.close();
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
      const repairButton = [...document.querySelectorAll("button")].find((button) => button.textContent?.includes("Repair Hull and Refill Missiles"));
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
