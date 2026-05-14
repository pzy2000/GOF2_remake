import { useEffect, useState } from "react";
import { FlightScene } from "./components/FlightScene";
import { GalaxyMap } from "./components/GalaxyMap";
import { Hud } from "./components/Hud";
import { MainMenu } from "./components/MainMenu";
import { StationScreen } from "./components/StationScreen";
import { SaveSlotsPanel } from "./components/SaveSlotsPanel";
import { DialogueOverlay } from "./components/DialogueOverlay";
import { I18nRuntime } from "./components/I18nRuntime";
import { LanguageSelect } from "./components/LanguageSelect";
import { StoryNotificationOverlay } from "./components/StoryNotificationOverlay";
import { DebugScenarioPanel } from "./components/DebugScenarioPanel";
import { ShortcutButton } from "./components/ShortcutButton";
import { audioSystem, getAudioSettings, saveAudioSettings } from "./systems/audio";
import { voiceSystem } from "./systems/voice";
import { loadAssetManifest } from "./systems/assets";
import { graphicsQualityLabels, graphicsQualityProfiles } from "./systems/graphics";
import { resolveMusicCue } from "./systems/music";
import { stationById, useGameStore } from "./state/gameStore";
import "./styles.css";

function PauseMenu() {
  const setScreen = useGameStore((state) => state.setScreen);
  const saveGame = useGameStore((state) => state.saveGame);
  const loadGame = useGameStore((state) => state.loadGame);
  return (
    <section className="modal-screen">
      <div className="modal-panel">
        <p className="eyebrow">Paused</p>
        <h2>Flight Suspended</h2>
        <p>Systems are stable. Save before risky jumps or bounty contracts.</p>
        <div className="menu-actions compact">
          <ShortcutButton className="primary" shortcut="Esc" onClick={() => setScreen("flight")} title="Resume">Resume</ShortcutButton>
          <ShortcutButton shortcut="Ctrl+S" onClick={() => saveGame()} title="Quick Save">Quick Save</ShortcutButton>
          <ShortcutButton shortcut="Ctrl+R" onClick={() => loadGame()} title="Reload Latest">Reload Latest</ShortcutButton>
          <ShortcutButton shortcut="Ctrl+," onClick={() => setScreen("settings")} title="Settings">Settings</ShortcutButton>
          <ShortcutButton shortcut="Ctrl+M" onClick={() => setScreen("menu")} title="Main Menu">Main Menu</ShortcutButton>
        </div>
        <SaveSlotsPanel mode="manage" />
      </div>
    </section>
  );
}

function GameOver() {
  const loadGame = useGameStore((state) => state.loadGame);
  const newGame = useGameStore((state) => state.newGame);
  const setScreen = useGameStore((state) => state.setScreen);
  return (
    <section className="modal-screen">
      <div className="modal-panel">
        <p className="eyebrow">Hull Failure</p>
        <h2>Game Over</h2>
        <p>Your ship broke apart under fire. Reload a browser save or start over from Helion Reach.</p>
        <div className="menu-actions compact">
          <button className="primary" onClick={() => loadGame()}>Reload Save</button>
          <button onClick={newGame}>New Game</button>
          <button onClick={() => setScreen("menu")}>Main Menu</button>
        </div>
      </div>
    </section>
  );
}

function SimpleScreen({ type }: { type: "settings" | "credits" }) {
  const setScreen = useGameStore((state) => state.setScreen);
  const previousScreen = useGameStore((state) => state.previousScreen);
  const assetCredits = useGameStore((state) => state.assetManifest.assetCredits);
  const graphicsSettings = useGameStore((state) => state.graphicsSettings);
  const setGraphicsQuality = useGameStore((state) => state.setGraphicsQuality);
  const [audioSettings, setAudioSettings] = useState(getAudioSettings);
  const updateAudio = (patch: Partial<typeof audioSettings>) => {
    setAudioSettings(saveAudioSettings({ ...audioSettings, ...patch }));
  };
  const backTarget = previousScreen === "pause" ? "pause" : "menu";
  const qualityOptions = Object.keys(graphicsQualityProfiles) as Array<keyof typeof graphicsQualityProfiles>;
  return (
    <section className="modal-screen static-screen">
      <div className="modal-panel wide">
        <p className="eyebrow">{type === "settings" ? "Settings" : "Credits"}</p>
        <h2>{type === "settings" ? "Pilot Preferences" : "Original Prototype"}</h2>
        {type === "settings" ? (
          <>
            <p>Keyboard and mouse controls are active in flight. Click the 3D view once to capture mouse movement.</p>
            <div className="settings-grid">
              <LanguageSelect />
              <div className="settings-row graphics-quality-row">
                <span>Graphics</span>
                <div className="segmented-control" role="group" aria-label="Graphics quality">
                  {qualityOptions.map((quality) => (
                    <button
                      key={quality}
                      className={graphicsSettings.quality === quality ? "active" : ""}
                      type="button"
                      onClick={() => setGraphicsQuality(quality)}
                    >
                      {graphicsQualityLabels[quality]}
                    </button>
                  ))}
                </div>
              </div>
              <label>
                <span>Master</span>
                <input type="range" min="0" max="1" step="0.01" value={audioSettings.masterVolume} onChange={(event) => updateAudio({ masterVolume: Number(event.target.value) })} />
              </label>
              <label>
                <span>SFX</span>
                <input type="range" min="0" max="1" step="0.01" value={audioSettings.sfxVolume} onChange={(event) => updateAudio({ sfxVolume: Number(event.target.value) })} />
              </label>
              <label>
                <span>Music</span>
                <input type="range" min="0" max="1" step="0.01" value={audioSettings.musicVolume} onChange={(event) => updateAudio({ musicVolume: Number(event.target.value) })} />
              </label>
              <label>
                <span>Voice</span>
                <input type="range" min="0" max="1" step="0.01" value={audioSettings.voiceVolume} onChange={(event) => updateAudio({ voiceVolume: Number(event.target.value) })} />
              </label>
              <label className="toggle-line">
                <input type="checkbox" checked={audioSettings.muted} onChange={(event) => updateAudio({ muted: event.target.checked })} />
                <span>Mute audio</span>
              </label>
            </div>
          </>
        ) : (
          <>
            <p>GOF2 by pzy is an original browser-playable space trading/combat prototype built with React, TypeScript, Three.js, generated project art, and openly licensed assets.</p>
            <p>No copyrighted external image packs are included.</p>
            {assetCredits.length > 0 ? (
              <div className="credits-list">
                {assetCredits.map((credit) => (
                  <p key={`${credit.title}-${credit.assetPath}`}>
                    {credit.title} by {credit.author}. {credit.license}
                    {credit.licenseUrl ? <> · <a href={credit.licenseUrl} target="_blank" rel="noreferrer">License</a></> : null}
                    {" · "}<a href={credit.sourceUrl} target="_blank" rel="noreferrer">Source</a>
                  </p>
                ))}
              </div>
            ) : null}
          </>
        )}
        <button className="primary" onClick={() => setScreen(backTarget)}>Back</button>
      </div>
    </section>
  );
}

function GameClockTicker() {
  const screen = useGameStore((state) => state.screen);
  const advanceGameClock = useGameStore((state) => state.advanceGameClock);
  useEffect(() => {
    if (screen !== "station" && screen !== "galaxyMap") return undefined;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      advanceGameClock(Math.min((now - last) / 1000, 0.25));
      last = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [advanceGameClock, screen]);
  return null;
}

function EconomyBackendRuntime() {
  const currentSystemId = useGameStore((state) => state.currentSystemId);
  const refreshEconomySnapshot = useGameStore((state) => state.refreshEconomySnapshot);
  const startEconomyStream = useGameStore((state) => state.startEconomyStream);
  const stopEconomyStream = useGameStore((state) => state.stopEconomyStream);
  const economyDisabledForE2E = import.meta.env.DEV && typeof localStorage !== "undefined" && localStorage.getItem("gof2-e2e-disable-economy-backend") === "true";
  useEffect(() => {
    if (economyDisabledForE2E) {
      stopEconomyStream();
      return undefined;
    }
    startEconomyStream();
    return stopEconomyStream;
  }, [economyDisabledForE2E, startEconomyStream, stopEconomyStream]);
  useEffect(() => {
    if (economyDisabledForE2E) return;
    void refreshEconomySnapshot();
  }, [currentSystemId, economyDisabledForE2E, refreshEconomySnapshot]);
  return null;
}

function AudioRuntime() {
  const screen = useGameStore((state) => state.screen);
  const currentSystemId = useGameStore((state) => state.currentSystemId);
  const currentStationId = useGameStore((state) => state.currentStationId);
  const runtime = useGameStore((state) => state.runtime);
  const player = useGameStore((state) => state.player);
  const assetManifest = useGameStore((state) => state.assetManifest);
  useEffect(() => {
    const unlock = () => audioSystem.unlock();
    const click = (event: MouseEvent) => {
      if ((event.target as HTMLElement | null)?.closest("button")) audioSystem.play("ui-click");
      unlock();
    };
    window.addEventListener("pointerdown", click);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", click);
      window.removeEventListener("keydown", unlock);
    };
  }, []);
  const musicCue = resolveMusicCue({
    screen,
    currentSystemId,
    currentStation: currentStationId ? stationById[currentStationId] : undefined,
    runtime,
    player,
    assetManifest
  });
  useEffect(() => {
    audioSystem.setMusicCue(musicCue);
  }, [musicCue.id, musicCue.mode, musicCue.trackUrl]);
  return null;
}

export default function App() {
  const screen = useGameStore((state) => state.screen);
  const setAssetManifest = useGameStore((state) => state.setAssetManifest);
  useEffect(() => {
    loadAssetManifest()
      .then((manifest) => {
        setAssetManifest(manifest);
        voiceSystem.setVoiceClipManifest(manifest.voiceClips);
      })
      .catch(() => undefined);
  }, [setAssetManifest]);

  if (screen === "menu") return <><I18nRuntime /><AudioRuntime /><EconomyBackendRuntime /><MainMenu /><DebugScenarioPanel /><StoryNotificationOverlay /><DialogueOverlay /></>;
  if (screen === "settings" || screen === "credits") return <><I18nRuntime /><AudioRuntime /><EconomyBackendRuntime /><SimpleScreen type={screen} /><DebugScenarioPanel /><StoryNotificationOverlay /><DialogueOverlay /></>;
  if (screen === "station") {
    return (
      <>
        <I18nRuntime />
        <AudioRuntime />
        <EconomyBackendRuntime />
        <GameClockTicker />
        <StationScreen />
        <DebugScenarioPanel />
        <StoryNotificationOverlay />
        <DialogueOverlay />
      </>
    );
  }

  return (
    <main className="game-shell">
      <I18nRuntime />
      <AudioRuntime />
      <EconomyBackendRuntime />
      <GameClockTicker />
      <FlightScene />
      {screen === "economyWatch" ? null : <Hud />}
      {screen === "pause" ? <PauseMenu /> : null}
      {screen === "galaxyMap" ? <GalaxyMap /> : null}
      {screen === "gameOver" ? <GameOver /> : null}
      <DebugScenarioPanel />
      <StoryNotificationOverlay />
      <DialogueOverlay />
    </main>
  );
}
