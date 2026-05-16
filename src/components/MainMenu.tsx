import { useState } from "react";
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
  const multiplayerStatus = useGameStore((state) => state.multiplayerStatus);
  const multiplayerServerUrl = useGameStore((state) => state.multiplayerServerUrl);
  const multiplayerSession = useGameStore((state) => state.multiplayerSession);
  const multiplayerError = useGameStore((state) => state.multiplayerError);
  const multiplayerLogin = useGameStore((state) => state.multiplayerLogin);
  const multiplayerRegister = useGameStore((state) => state.multiplayerRegister);
  const multiplayerResume = useGameStore((state) => state.multiplayerResume);
  const multiplayerLogout = useGameStore((state) => state.multiplayerLogout);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const busy = multiplayerStatus === "connecting";
  const authRequest = {
    username,
    password,
    displayName: displayName || username
  };
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
        <section className="multiplayer-login-panel" data-testid="multiplayer-login-panel">
          <div>
            <span>{translateText("Multiplayer", locale)}</span>
            <p>{multiplayerSession ? `${translateText("Connected", locale)}: ${multiplayerSession.displayName}` : `${translateText("Server", locale)}: ${multiplayerServerUrl}`}</p>
            {multiplayerError ? <p className="warning-text">{multiplayerError}</p> : null}
          </div>
          {multiplayerSession ? (
            <div className="menu-actions compact">
              <button onClick={multiplayerLogout}>{translateText("Disconnect", locale)}</button>
            </div>
          ) : (
            <form
              className="multiplayer-login-form"
              onSubmit={(event) => {
                event.preventDefault();
                void multiplayerLogin(authRequest);
              }}
            >
              <input
                aria-label="Multiplayer username"
                autoComplete="username"
                onChange={(event) => setUsername(event.target.value)}
                placeholder={translateText("Username", locale)}
                value={username}
              />
              <input
                aria-label="Multiplayer callsign"
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder={translateText("Callsign", locale)}
                value={displayName}
              />
              <input
                aria-label="Multiplayer password"
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder={translateText("Password", locale)}
                type="password"
                value={password}
              />
              <div className="menu-actions compact">
                <button className="primary" disabled={busy || !username || !password} type="submit">{translateText("Login", locale)}</button>
                <button disabled={busy || !username || !password} onClick={() => void multiplayerRegister(authRequest)} type="button">{translateText("Register", locale)}</button>
                <button disabled={busy} onClick={() => void multiplayerResume()} type="button">{translateText("Resume Online", locale)}</button>
              </div>
            </form>
          )}
        </section>
        <SaveSlotsPanel mode="load" />
      </section>
    </main>
  );
}
