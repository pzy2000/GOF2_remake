import { afterEach, describe, expect, it, vi } from "vitest";

class FakeUtterance {
  text: string;
  lang = "";
  pitch = 1;
  rate = 1;
  volume = 1;
  voice: SpeechSynthesisVoice | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

async function freshVoice() {
  vi.resetModules();
  return import("../src/systems/voice");
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("browser voice system", () => {
  it("is safe when speech synthesis is unavailable", async () => {
    const { voiceSystem } = await freshVoice();
    expect(() => voiceSystem.cancel()).not.toThrow();
    expect(voiceSystem.speak("Signal clear.")).toBe(false);
  });

  it("speaks, pauses, resumes, cancels, and applies voice volume", async () => {
    const spoken: FakeUtterance[] = [];
    const synthesis = {
      speaking: false,
      paused: false,
      getVoices: vi.fn(() => [{ lang: "en-US" }]),
      speak: vi.fn((utterance: FakeUtterance) => {
        spoken.push(utterance);
        synthesis.speaking = true;
      }),
      pause: vi.fn(() => {
        synthesis.paused = true;
      }),
      resume: vi.fn(() => {
        synthesis.paused = false;
      }),
      cancel: vi.fn(() => {
        synthesis.speaking = false;
        synthesis.paused = false;
      })
    };
    vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
    vi.stubGlobal("window", { speechSynthesis: synthesis });

    const { voiceSystem } = await freshVoice();
    voiceSystem.applySettings({ masterVolume: 0.5, sfxVolume: 0.8, musicVolume: 0.4, voiceVolume: 0.6, muted: false });

    expect(voiceSystem.speak("Glass Wake confirmed.", "calm")).toBe(true);
    expect(synthesis.speak).toHaveBeenCalledOnce();
    expect(spoken[0].volume).toBeCloseTo(0.3);
    expect(spoken[0].lang).toBe("en-US");

    expect(voiceSystem.pauseOrResume()).toBe("paused");
    expect(synthesis.pause).toHaveBeenCalledOnce();
    expect(voiceSystem.pauseOrResume()).toBe("speaking");
    expect(synthesis.resume).toHaveBeenCalledOnce();

    voiceSystem.cancel();
    expect(synthesis.cancel).toHaveBeenCalled();

    voiceSystem.applySettings({ masterVolume: 1, sfxVolume: 0.8, musicVolume: 0.4, voiceVolume: 1, muted: true });
    expect(voiceSystem.speak("Muted line.")).toBe(false);
  });
});
