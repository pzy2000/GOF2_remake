import { useGameStore } from "../state/gameStore";
import { translateText } from "../i18n";
import { LanguageSelect } from "./LanguageSelect";
import { SaveSlotsPanel } from "./SaveSlotsPanel";

export function MainMenu() {
  const manifest = useGameStore((state) => state.assetManifest);
  const locale = useGameStore((state) => state.locale);
  const newGame = useGameStore((state) => state.newGame);
  const loadGame = useGameStore((state) => state.loadGame);
  const hasSave = useGameStore((state) => state.hasSave);
  const setScreen = useGameStore((state) => state.setScreen);
  return (
    <main className="menu-screen" style={{ backgroundImage: `linear-gradient(90deg, rgba(3,7,18,.92), rgba(3,7,18,.44)), url(${manifest.keyArt})` }}>
      <section className="menu-copy">
        <p className="eyebrow">{translateText("Browser WebGL vertical slice", locale)}</p>
        <h1>GOF2 by pzy</h1>
        <p className="menu-summary">{translateText("Trade, mine, fight pirates, dock at stations, and explore six frontier systems plus PTD Home.", locale)}</p>
        <LanguageSelect compact />
        <div className="menu-actions">
          <button className="primary" onClick={newGame}>{translateText("New Game", locale)}</button>
          <button onClick={() => loadGame()} disabled={!hasSave}>{translateText("Continue", locale)}</button>
          <button onClick={() => setScreen("settings")}>{translateText("Settings", locale)}</button>
          <button onClick={() => setScreen("credits")}>{translateText("Credits", locale)}</button>
        </div>
        <SaveSlotsPanel mode="load" />
      </section>
    </main>
  );
}
