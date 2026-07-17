import { describe, expect, it } from "vitest";
import { isAndroidBuild, isFlightSession, resolveNativeBackAction } from "../src/systems/nativePolicy";

describe("Android native policy", () => {
  it("locks orientation for flight and flight-owned overlays", () => {
    expect(isFlightSession("flight", "menu")).toBe(true);
    expect(isFlightSession("pause", "flight")).toBe(true);
    expect(isFlightSession("galaxyMap", "flight")).toBe(true);
    expect(isFlightSession("settings", "pause")).toBe(true);
    expect(isFlightSession("galaxyMap", "station")).toBe(false);
    expect(isFlightSession("station", "flight")).toBe(false);
  });

  it("prioritizes overlays and maps back navigation deterministically", () => {
    expect(resolveNativeBackAction({ screen: "flight", previousScreen: "menu", hasDialogue: true, hasNpcInteraction: true })).toEqual({ type: "close-dialogue" });
    expect(resolveNativeBackAction({ screen: "flight", previousScreen: "menu", hasDialogue: false, hasNpcInteraction: true })).toEqual({ type: "close-npc" });
    expect(resolveNativeBackAction({ screen: "flight", previousScreen: "menu", hasDialogue: false, hasNpcInteraction: false })).toEqual({ type: "pause-flight" });
    expect(resolveNativeBackAction({ screen: "galaxyMap", previousScreen: "station", hasDialogue: false, hasNpcInteraction: false })).toEqual({ type: "navigate", screen: "station" });
    expect(resolveNativeBackAction({ screen: "settings", previousScreen: "economyWatch", hasDialogue: false, hasNpcInteraction: false })).toEqual({ type: "navigate", screen: "economyWatch" });
    expect(resolveNativeBackAction({ screen: "menu", previousScreen: "flight", hasDialogue: false, hasNpcInteraction: false })).toEqual({ type: "root-exit" });
  });

  it("recognizes only the Android distribution flag", () => {
    expect(isAndroidBuild("android")).toBe(true);
    expect(isAndroidBuild("web")).toBe(false);
    expect(isAndroidBuild(undefined)).toBe(false);
  });
});
