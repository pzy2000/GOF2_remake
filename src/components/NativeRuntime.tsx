import { useEffect, useRef, useState } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor, SystemBars, SystemBarsStyle } from "@capacitor/core";
import { ScreenOrientation } from "@capacitor/screen-orientation";
import { useGameStore } from "../state/gameStore";
import { audioSystem } from "../systems/audio";
import { isFlightSession, resolveNativeBackAction } from "../systems/nativePolicy";

const EXIT_CONFIRMATION_MS = 1_800;

function isNativeAndroid(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

async function applyNativePresentation(screen: ReturnType<typeof useGameStore.getState>["screen"], previousScreen: ReturnType<typeof useGameStore.getState>["previousScreen"]): Promise<void> {
  if (!isNativeAndroid()) return;
  try {
    await SystemBars.setStyle({ style: SystemBarsStyle.Dark });
    if (isFlightSession(screen, previousScreen)) {
      await ScreenOrientation.lock({ orientation: "landscape" });
      await SystemBars.hide();
    } else {
      await ScreenOrientation.unlock();
      await SystemBars.show();
    }
  } catch (error) {
    console.warn("Unable to apply Android presentation policy.", error);
  }
}

export function NativeRuntime() {
  const screen = useGameStore((state) => state.screen);
  const previousScreen = useGameStore((state) => state.previousScreen);
  const lastRootBackAt = useRef(0);
  const exitHintTimer = useRef<number | undefined>(undefined);
  const [showExitHint, setShowExitHint] = useState(false);
  const nativeAndroid = isNativeAndroid();

  useEffect(() => {
    if (!nativeAndroid) return undefined;
    void applyNativePresentation(screen, previousScreen);
    return undefined;
  }, [nativeAndroid, previousScreen, screen]);

  useEffect(() => {
    if (!nativeAndroid) return undefined;
    let disposed = false;
    const handles = [
      CapacitorApp.addListener("appStateChange", ({ isActive }) => {
        const state = useGameStore.getState();
        audioSystem.setFocusMuted(!isActive);
        if (!isActive) {
          state.resetInput();
          if (state.screen === "station" || isFlightSession(state.screen, state.previousScreen)) state.saveGame("auto");
          return;
        }
        void applyNativePresentation(state.screen, state.previousScreen);
      }),
      CapacitorApp.addListener("backButton", () => {
        const state = useGameStore.getState();
        const action = resolveNativeBackAction({
          screen: state.screen,
          previousScreen: state.previousScreen,
          hasDialogue: !!state.activeDialogue,
          hasNpcInteraction: !!state.npcInteraction
        });
        if (action.type === "close-dialogue") {
          state.closeDialogue();
          return;
        }
        if (action.type === "close-npc") {
          state.closeNpcInteraction();
          return;
        }
        if (action.type === "pause-flight") {
          state.setScreen("pause");
          return;
        }
        if (action.type === "navigate") {
          state.setScreen(action.screen);
          return;
        }

        const now = Date.now();
        if (now - lastRootBackAt.current <= EXIT_CONFIRMATION_MS) {
          void CapacitorApp.exitApp();
          return;
        }
        lastRootBackAt.current = now;
        setShowExitHint(true);
        if (exitHintTimer.current !== undefined) window.clearTimeout(exitHintTimer.current);
        exitHintTimer.current = window.setTimeout(() => setShowExitHint(false), EXIT_CONFIRMATION_MS);
      })
    ];
    const resetInput = () => useGameStore.getState().resetInput();
    window.addEventListener("blur", resetInput);
    window.addEventListener("pagehide", resetInput);
    return () => {
      disposed = true;
      window.removeEventListener("blur", resetInput);
      window.removeEventListener("pagehide", resetInput);
      if (exitHintTimer.current !== undefined) window.clearTimeout(exitHintTimer.current);
      void Promise.all(handles).then((resolved) => {
        if (disposed) void Promise.all(resolved.map((handle) => handle.remove()));
      });
    };
  }, [nativeAndroid]);

  if (!nativeAndroid || !showExitHint) return null;
  return <div className="native-exit-hint" role="status">Press back again to exit</div>;
}
