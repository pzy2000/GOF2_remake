import type { Screen } from "../types/game";

export type NativeBackAction =
  | { type: "close-dialogue" }
  | { type: "close-npc" }
  | { type: "navigate"; screen: Screen }
  | { type: "pause-flight" }
  | { type: "root-exit" };

export interface NativeBackState {
  screen: Screen;
  previousScreen: Screen;
  hasDialogue: boolean;
  hasNpcInteraction: boolean;
}

export function isAndroidBuild(platform = import.meta.env.VITE_APP_PLATFORM): boolean {
  return platform === "android";
}

export function isFlightSession(screen: Screen, previousScreen: Screen): boolean {
  if (screen === "flight" || screen === "economyWatch" || screen === "pause" || screen === "gameOver") return true;
  if (screen === "galaxyMap") return previousScreen === "flight" || previousScreen === "economyWatch";
  if (screen === "settings") return previousScreen === "flight" || previousScreen === "pause" || previousScreen === "economyWatch";
  return false;
}

export function resolveNativeBackAction({
  screen,
  previousScreen,
  hasDialogue,
  hasNpcInteraction
}: NativeBackState): NativeBackAction {
  if (hasDialogue) return { type: "close-dialogue" };
  if (hasNpcInteraction) return { type: "close-npc" };

  if (screen === "flight") return { type: "pause-flight" };
  if (screen === "pause" || screen === "economyWatch") return { type: "navigate", screen: "flight" };
  if (screen === "gameOver") return { type: "navigate", screen: "menu" };
  if (screen === "galaxyMap") {
    return {
      type: "navigate",
      screen: previousScreen === "station" || previousScreen === "economyWatch" ? previousScreen : "flight"
    };
  }
  if (screen === "settings" || screen === "credits") {
    const target = previousScreen === "station" || previousScreen === "pause" || previousScreen === "flight" || previousScreen === "economyWatch"
      ? previousScreen
      : "menu";
    return { type: "navigate", screen: target };
  }
  return { type: "root-exit" };
}
