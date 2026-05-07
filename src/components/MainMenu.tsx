import { useGameStore } from "../state/gameStore";
import { LanguageSelect } from "./LanguageSelect";
import { SaveSlotsPanel } from "./SaveSlotsPanel";

export function MainMenu() {
  const manifest = useGameStore((state) => state.assetManifest);
  const newGame = useGameStore((state) => state.newGame);
  const loadGame = useGameStore((state) => state.loadGame);
  const hasSave = useGameStore((state) => state.hasSave);
  const setScreen = useGameStore((state) => state.setScreen);
  return (
    <main className="menu-screen" style={{ backgroundImage: `linear-gradient(90deg, rgba(3,7,18,.92), rgba(3,7,18,.44)), url(${manifest.keyArt})` }}>
      <section className="menu-copy">
        <p className="eyebrow">Browser WebGL vertical slice</p>
        <h1>GOF2 by pzy</h1>
        <p className="menu-summary">Trade, mine, fight pirates, dock at stations, and push across a six-system frontier.</p>
        <LanguageSelect compact />
        <div className="menu-actions">
          <button className="primary" onClick={newGame}>New Game</button>
          <button onClick={() => loadGame()} disabled={!hasSave}>Continue</button>
          <button onClick={() => setScreen("settings")}>Settings</button>
          <button onClick={() => setScreen("credits")}>Credits</button>
        </div>
        <SaveSlotsPanel mode="load" />
      </section>
    </main>
  );
}
