import { afterEach, describe, expect, it, vi } from "vitest";

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

class FakeAudio {
  static instances: FakeAudio[] = [];
  src: string;
  loop = false;
  preload = "";
  volume = 1;
  currentTime = 0;
  paused = true;
  onerror: (() => void) | null = null;
  play = vi.fn(() => {
    this.paused = false;
    return Promise.resolve();
  });
  pause = vi.fn(() => {
    this.paused = true;
  });

  constructor(src: string) {
    this.src = src;
    FakeAudio.instances.push(this);
  }
}

class RejectingAudio extends FakeAudio {
  override play = vi.fn(() => Promise.reject(new Error("blocked")));
}

async function freshAudio(AudioClass?: typeof FakeAudio) {
  vi.resetModules();
  vi.stubGlobal("localStorage", new MemoryStorage());
  FakeAudio.instances = [];
  if (AudioClass) vi.stubGlobal("Audio", AudioClass);
  return import("../src/systems/audio");
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("procedural audio system", () => {
  it("is a safe no-op without browser audio APIs", async () => {
    const { audioSystem } = await freshAudio();
    expect(() => audioSystem.unlock()).not.toThrow();
    expect(() => audioSystem.play("laser")).not.toThrow();
    expect(() => audioSystem.setMusicMode("combat")).not.toThrow();
  });

  it("persists clamped audio settings", async () => {
    const { AUDIO_SETTINGS_KEY, getAudioSettings, saveAudioSettings } = await freshAudio();
    const storage = new MemoryStorage();
    vi.stubGlobal("localStorage", storage);
    const saved = saveAudioSettings({ masterVolume: 2, sfxVolume: -1, musicVolume: 0.5, voiceVolume: 1.4, muted: true });
    expect(saved.masterVolume).toBe(1);
    expect(saved.sfxVolume).toBe(0);
    expect(saved.musicVolume).toBe(0.5);
    expect(saved.voiceVolume).toBe(1);
    expect(saved.muted).toBe(true);
    expect(storage.getItem(AUDIO_SETTINGS_KEY)).toContain("\"muted\":true");
    expect(getAudioSettings()).toEqual(saved);
  });

  it("plays external music tracks after unlock and applies music volume", async () => {
    const { audioSystem, saveAudioSettings } = await freshAudio(FakeAudio);
    audioSystem.setMusicCue({ id: "system:test", mode: "safe", trackUrl: "/assets/music/test.mp3" });
    expect(audioSystem.debugState.currentTrackUrl).toBe("/assets/music/test.mp3");
    expect(FakeAudio.instances[0].volume).toBe(0);

    expect(audioSystem.unlock()).toBe(true);
    await Promise.resolve();
    expect(FakeAudio.instances[0].play).toHaveBeenCalledOnce();
    expect(audioSystem.debugState.currentTrackPlaying).toBe(true);
    expect(audioSystem.debugState.proceduralMode).toBe("silent");
    expect(FakeAudio.instances[0].volume).toBeCloseTo(0.28);

    saveAudioSettings({ masterVolume: 0.5, sfxVolume: 0.75, musicVolume: 0.4, voiceVolume: 0.85, muted: false });
    expect(FakeAudio.instances[0].volume).toBeCloseTo(0.2);
    saveAudioSettings({ masterVolume: 0.5, sfxVolume: 0.75, musicVolume: 0.4, voiceVolume: 0.85, muted: true });
    expect(FakeAudio.instances[0].volume).toBe(0);
  });

  it("falls back to procedural music when an external track cannot play", async () => {
    const { audioSystem } = await freshAudio(RejectingAudio);
    audioSystem.setMusicCue({ id: "combat", mode: "combat", trackUrl: "/assets/music/missing.mp3" });
    audioSystem.unlock();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(audioSystem.debugState.currentTrackUrl).toBeUndefined();
    expect(audioSystem.debugState.currentTrackPlaying).toBe(false);
    expect(audioSystem.debugState.mode).toBe("combat");
    expect(audioSystem.debugState.proceduralMode).toBe("combat");
  });
});
