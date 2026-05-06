import { useEffect } from "react";
import { FlightScene } from "./components/FlightScene";
import { GalaxyMap } from "./components/GalaxyMap";
import { Hud } from "./components/Hud";
import { MainMenu } from "./components/MainMenu";
import { StationScreen } from "./components/StationScreen";
import { loadAssetManifest } from "./systems/assets";
import { useGameStore } from "./state/gameStore";
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
          <button className="primary" onClick={() => setScreen("flight")}>Resume</button>
          <button onClick={saveGame}>Save</button>
          <button onClick={loadGame}>Reload Save</button>
          <button onClick={() => setScreen("menu")}>Main Menu</button>
        </div>
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
          <button className="primary" onClick={loadGame}>Reload Save</button>
          <button onClick={newGame}>New Game</button>
          <button onClick={() => setScreen("menu")}>Main Menu</button>
        </div>
      </div>
    </section>
  );
}

function SimpleScreen({ type }: { type: "settings" | "credits" }) {
  const setScreen = useGameStore((state) => state.setScreen);
  return (
    <section className="modal-screen static-screen">
      <div className="modal-panel wide">
        <p className="eyebrow">{type === "settings" ? "Settings" : "Credits"}</p>
        <h2>{type === "settings" ? "Pilot Preferences" : "Original Prototype"}</h2>
        {type === "settings" ? (
          <>
            <p>Keyboard and mouse controls are active in flight. Click the 3D view once to capture mouse movement.</p>
            <p>Audio is represented by lightweight UI feedback in this vertical slice; a fuller mix can be layered later without backend work.</p>
          </>
        ) : (
          <>
            <p>GOF2 by pzy is an original browser-playable space trading/combat prototype built with React, TypeScript, Three.js, and generated project art.</p>
            <p>No copyrighted external image packs are included.</p>
          </>
        )}
        <button className="primary" onClick={() => setScreen("menu")}>Back</button>
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

export default function App() {
  const screen = useGameStore((state) => state.screen);
  const setAssetManifest = useGameStore((state) => state.setAssetManifest);
  useEffect(() => {
    loadAssetManifest().then(setAssetManifest).catch(() => undefined);
  }, [setAssetManifest]);

  if (screen === "menu") return <MainMenu />;
  if (screen === "settings" || screen === "credits") return <SimpleScreen type={screen} />;
  if (screen === "station") {
    return (
      <>
        <GameClockTicker />
        <StationScreen />
      </>
    );
  }

  return (
    <main className="game-shell">
      <GameClockTicker />
      <FlightScene />
      <Hud />
      {screen === "pause" ? <PauseMenu /> : null}
      {screen === "galaxyMap" ? <GalaxyMap /> : null}
      {screen === "gameOver" ? <GameOver /> : null}
    </main>
  );
}
