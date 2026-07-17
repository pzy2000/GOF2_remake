import { useState } from "react";
import { useGameStore } from "../state/gameStore";
import { translateText } from "../i18n";
import { readMultiplayerCredentials, saveMultiplayerCredentials } from "../systems/multiplayerCredentials";
import { isMultiplayerServiceEnabled } from "../systems/multiplayerClient";
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
  const [savedCredentials] = useState(() => readMultiplayerCredentials());
  const [username, setUsername] = useState(savedCredentials.username);
  const [displayName, setDisplayName] = useState(savedCredentials.displayName);
  const [password, setPassword] = useState(savedCredentials.password);
  const busy = multiplayerStatus === "connecting";
  const multiplayerEnabled = isMultiplayerServiceEnabled();
  const authRequest = {
    username,
    password,
    displayName: displayName || username
  };
  const saveAndLogin = () => {
    saveMultiplayerCredentials(authRequest);
    void multiplayerLogin(authRequest);
  };
  const saveAndRegister = () => {
    saveMultiplayerCredentials(authRequest);
    void multiplayerRegister(authRequest);
  };
  return (
    <main className="menu-screen" style={{ backgroundImage: `linear-gradient(90deg, rgba(3,7,18,.92), rgba(3,7,18,.44)), url(${manifest.keyArt})` }}>
      <section className="menu-copy">
        <p className="eyebrow">{translateText("Browser WebGL vertical slice", locale)}</p>
        <h1>GOF2 by pzy</h1>
        <p className="menu-summary">{translateText("Trade, mine, fight pirates, dock at stations, and explore six frontier systems plus PTD Home.", locale)}</p>
        <LanguageSelect compact />
        <div className="menu-actions">
          <button className="primary" onClick={newGame}>{translateText("New Offline Game", locale)}</button>
          <button onClick={() => loadGame()} disabled={!hasSave}>{translateText("Continue Offline", locale)}</button>
          <button onClick={() => setScreen("settings")}>{translateText("Settings", locale)}</button>
          <button onClick={() => setScreen("credits")}>{translateText("Credits", locale)}</button>
        </div>
        {multiplayerEnabled ? <section className="multiplayer-login-panel" data-testid="multiplayer-login-panel">
          <div>
            <span>{translateText("Online Profile", locale)}</span>
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
                saveAndLogin();
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
                <button disabled={busy || !username || !password} onClick={saveAndRegister} type="button">{translateText("Register", locale)}</button>
                <button disabled={busy} onClick={() => void multiplayerResume()} type="button">{translateText("Resume Online", locale)}</button>
              </div>
            </form>
          )}
        </section> : <p className="offline-build-note">Android v1 is an offline single-player build.</p>}
        <SaveSlotsPanel mode="load" />
      </section>
    </main>
  );
}
