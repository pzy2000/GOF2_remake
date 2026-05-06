import { afterEach, describe, expect, it, vi } from "vitest";
import { AUDIO_SETTINGS_KEY, audioSystem, getAudioSettings, saveAudioSettings } from "../src/systems/audio";

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  key(index: number) {
    return Array.from(this.data.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("procedural audio system", () => {
  it("is a safe no-op without browser audio APIs", () => {
    vi.stubGlobal("localStorage", new MemoryStorage());
    expect(() => audioSystem.unlock()).not.toThrow();
    expect(() => audioSystem.play("laser")).not.toThrow();
    expect(() => audioSystem.setMusicMode("combat")).not.toThrow();
  });

  it("persists clamped audio settings", () => {
    const storage = new MemoryStorage();
    vi.stubGlobal("localStorage", storage);
    const saved = saveAudioSettings({ masterVolume: 2, sfxVolume: -1, musicVolume: 0.5, muted: true });
    expect(saved.masterVolume).toBe(1);
    expect(saved.sfxVolume).toBe(0);
    expect(saved.musicVolume).toBe(0.5);
    expect(saved.muted).toBe(true);
    expect(storage.getItem(AUDIO_SETTINGS_KEY)).toContain("\"muted\":true");
    expect(getAudioSettings()).toEqual(saved);
  });
});
