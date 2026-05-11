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

function fakeVoice(name: string, lang = "en-US", isDefault = false): SpeechSynthesisVoice {
  return {
    default: isDefault,
    lang,
    localService: true,
    name,
    voiceURI: name
  } as SpeechSynthesisVoice;
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

  it("speaks, pauses, resumes, cancels, and applies boosted voice volume", async () => {
    const spoken: FakeUtterance[] = [];
    const synthesis = {
      speaking: false,
      paused: false,
      getVoices: vi.fn(() => [fakeVoice("Generic English")]),
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

    expect(voiceSystem.speak("Glass Wake confirmed.", "mirr-analyst")).toBe(true);
    expect(synthesis.speak).toHaveBeenCalledOnce();
    expect(spoken[0].volume).toBeCloseTo(0.405);
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

  it("fires completion only for the current utterance natural end", async () => {
    const spoken: FakeUtterance[] = [];
    const synthesis = {
      speaking: false,
      paused: false,
      getVoices: vi.fn(() => [fakeVoice("Generic English")]),
      speak: vi.fn((utterance: FakeUtterance) => {
        spoken.push(utterance);
        synthesis.speaking = true;
      }),
      pause: vi.fn(),
      resume: vi.fn(),
      cancel: vi.fn(() => {
        synthesis.speaking = false;
        synthesis.paused = false;
      })
    };
    vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
    vi.stubGlobal("window", { speechSynthesis: synthesis });

    const { voiceSystem } = await freshVoice();
    const onEnd = vi.fn();

    expect(voiceSystem.speak("First line.", "helion-handler", { onEnd })).toBe(true);
    const first = spoken[0];
    voiceSystem.cancel();
    first.onend?.();
    expect(onEnd).not.toHaveBeenCalled();

    expect(voiceSystem.speak("Second line.", "helion-handler", { onEnd })).toBe(true);
    spoken[1].onend?.();
    expect(onEnd).toHaveBeenCalledOnce();
    spoken[1].onend?.();
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it("clamps boosted voice volume at the speech synthesis maximum", async () => {
    const spoken: FakeUtterance[] = [];
    const synthesis = {
      speaking: false,
      paused: false,
      getVoices: vi.fn(() => [fakeVoice("Generic English")]),
      speak: vi.fn((utterance: FakeUtterance) => {
        spoken.push(utterance);
      }),
      pause: vi.fn(),
      resume: vi.fn(),
      cancel: vi.fn()
    };
    vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
    vi.stubGlobal("window", { speechSynthesis: synthesis });

    const { voiceSystem } = await freshVoice();
    voiceSystem.applySettings({ masterVolume: 1, sfxVolume: 0.8, musicVolume: 0.4, voiceVolume: 1, muted: false });

    expect(voiceSystem.speak("Louder line.")).toBe(true);
    expect(spoken[0].volume).toBe(1);
  });

  it("uses the selected locale as the speech synthesis language", async () => {
    const spoken: FakeUtterance[] = [];
    const synthesis = {
      speaking: false,
      paused: false,
      getVoices: vi.fn(() => [fakeVoice("Generic Chinese", "zh-CN"), fakeVoice("Generic Japanese", "ja-JP"), fakeVoice("Generic French", "fr-FR")]),
      speak: vi.fn((utterance: FakeUtterance) => {
        spoken.push(utterance);
      }),
      pause: vi.fn(),
      resume: vi.fn(),
      cancel: vi.fn()
    };
    vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
    vi.stubGlobal("window", { speechSynthesis: synthesis });

    const { voiceSystem } = await freshVoice();

    expect(voiceSystem.speak("你好。", "ship-ai", { locale: "zh-CN" })).toBe(true);
    expect(voiceSystem.speak("通信確認。", "ship-ai", { locale: "ja" })).toBe(true);
    expect(voiceSystem.speak("Canal prêt.", "ship-ai", { locale: "fr" })).toBe(true);
    expect(spoken.map((utterance) => utterance.lang)).toEqual(["zh-CN", "ja-JP", "fr-FR"]);
  });

  it("skips Siri and novelty voices but does not chase enhanced voices", async () => {
    const spoken: FakeUtterance[] = [];
    const synthesis = {
      speaking: false,
      paused: false,
      getVoices: vi.fn(() => [
        fakeVoice("Siri Female", "en-US", true),
        fakeVoice("Trinoids"),
        fakeVoice("Generic English"),
        fakeVoice("Samantha Enhanced")
      ]),
      speak: vi.fn((utterance: FakeUtterance) => {
        spoken.push(utterance);
      }),
      pause: vi.fn(),
      resume: vi.fn(),
      cancel: vi.fn()
    };
    vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
    vi.stubGlobal("window", { speechSynthesis: synthesis });

    const { voiceSystem } = await freshVoice();

    expect(voiceSystem.speak("Helion traffic clear.", "helion-handler")).toBe(true);
    expect(spoken[0].voice?.name).toBe("Generic English");
  });

  it("keeps locale voices ahead of English fallback without enhanced scoring", async () => {
    const spoken: FakeUtterance[] = [];
    const synthesis = {
      speaking: false,
      paused: false,
      getVoices: vi.fn(() => [
        fakeVoice("Samantha Enhanced", "en-US"),
        fakeVoice("Tingting Compact", "zh-CN"),
        fakeVoice("Tingting Natural", "zh-CN")
      ]),
      speak: vi.fn((utterance: FakeUtterance) => {
        spoken.push(utterance);
      }),
      pause: vi.fn(),
      resume: vi.fn(),
      cancel: vi.fn()
    };
    vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
    vi.stubGlobal("window", { speechSynthesis: synthesis });

    const { voiceSystem } = await freshVoice();

    expect(voiceSystem.speak("通信确认。", "helion-handler", { locale: "zh-CN" })).toBe(true);
    expect(spoken[0].lang).toBe("zh-CN");
    expect(spoken[0].voice?.name).toBe("Tingting Compact");
  });

  it("prepares comms speech by normalizing whitespace only", async () => {
    const spoken: FakeUtterance[] = [];
    const source = "  Helion traffic   clear. Echo Lock ready — confirm AI.  ";
    const synthesis = {
      speaking: false,
      paused: false,
      getVoices: vi.fn(() => [fakeVoice("Samantha Enhanced")]),
      speak: vi.fn((utterance: FakeUtterance) => {
        spoken.push(utterance);
      }),
      pause: vi.fn(),
      resume: vi.fn(),
      cancel: vi.fn()
    };
    vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
    vi.stubGlobal("window", { speechSynthesis: synthesis });

    const { prepareCommsSpeechText, voiceSystem } = await freshVoice();

    expect(prepareCommsSpeechText(source)).toBe("Helion traffic clear. Echo Lock ready — confirm AI.");
    expect(source).toBe("  Helion traffic   clear. Echo Lock ready — confirm AI.  ");
    expect(voiceSystem.speak(source, "helion-handler")).toBe(true);
    expect(spoken[0].text).toBe("Helion traffic clear. Echo Lock ready — confirm AI.");
  });

  it("maps every role profile back to first-version voice hints", async () => {
    const spoken: FakeUtterance[] = [];
    const synthesis = {
      speaking: false,
      paused: false,
      getVoices: vi.fn(() => [fakeVoice("Generic English")]),
      speak: vi.fn((utterance: FakeUtterance) => {
        spoken.push(utterance);
      }),
      pause: vi.fn(),
      resume: vi.fn(),
      cancel: vi.fn()
    };
    vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
    vi.stubGlobal("window", { speechSynthesis: synthesis });

    const { voiceSystem } = await freshVoice();
    const expectedProfiles = [
      ["captain", 1, 0.96],
      ["ship-ai", 0.88, 0.86],
      ["helion-handler", 1, 0.96],
      ["mirr-analyst", 0.95, 0.92],
      ["kuro-foreman", 0.82, 0.94],
      ["vantara-officer", 1, 0.96],
      ["ashen-broker", 0.82, 0.94],
      ["celest-archivist", 1.08, 0.98],
      ["union-witness", 0.82, 0.94]
    ] as const;

    for (const [profileId, pitch, rate] of expectedProfiles) {
      expect(voiceSystem.speak(`${profileId} on channel.`, profileId)).toBe(true);
      const utterance = spoken[spoken.length - 1];
      expect(utterance.pitch).toBeCloseTo(pitch);
      expect(utterance.rate).toBeCloseTo(rate);
    }
  });

  it("uses the first standard system voice for the captain", async () => {
    const spoken: FakeUtterance[] = [];
    const synthesis = {
      speaking: false,
      paused: false,
      getVoices: vi.fn(() => [fakeVoice("Microsoft David"), fakeVoice("Samantha"), fakeVoice("Google UK English Female")]),
      speak: vi.fn((utterance: FakeUtterance) => {
        spoken.push(utterance);
      }),
      pause: vi.fn(),
      resume: vi.fn(),
      cancel: vi.fn()
    };
    vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
    vi.stubGlobal("window", { speechSynthesis: synthesis });

    const { voiceSystem } = await freshVoice();

    expect(voiceSystem.speak("Captain on channel.", "captain")).toBe(true);
    expect(spoken[0].voice?.name).toBe("Microsoft David");
    expect(spoken[0].pitch).toBeCloseTo(1);
    expect(spoken[0].rate).toBeCloseTo(0.96);
  });

  it("applies distinct first-version hint parameters without per-role voice chasing", async () => {
    const spoken: FakeUtterance[] = [];
    const synthesis = {
      speaking: false,
      paused: false,
      getVoices: vi.fn(() => [fakeVoice("Samantha"), fakeVoice("Microsoft David")]),
      speak: vi.fn((utterance: FakeUtterance) => {
        spoken.push(utterance);
      }),
      pause: vi.fn(),
      resume: vi.fn(),
      cancel: vi.fn()
    };
    vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
    vi.stubGlobal("window", { speechSynthesis: synthesis });

    const { voiceSystem } = await freshVoice();

    expect(voiceSystem.speak("Captain line.", "captain")).toBe(true);
    expect(voiceSystem.speak("AI line.", "ship-ai")).toBe(true);

    expect(spoken[0].voice?.name).toBe("Samantha");
    expect(spoken[1].voice?.name).toBe("Samantha");
    expect(spoken[0].pitch).not.toBe(spoken[1].pitch);
    expect(spoken[0].rate).not.toBe(spoken[1].rate);
  });

  it("falls back to available English voices or null while keeping profile parameters", async () => {
    const spoken: FakeUtterance[] = [];
    const synthesis = {
      speaking: false,
      paused: false,
      getVoices: vi.fn(() => [fakeVoice("Generic English"), fakeVoice("Mónica", "es-ES")]),
      speak: vi.fn((utterance: FakeUtterance) => {
        spoken.push(utterance);
      }),
      pause: vi.fn(),
      resume: vi.fn(),
      cancel: vi.fn()
    };
    vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
    vi.stubGlobal("window", { speechSynthesis: synthesis });

    const { voiceSystem } = await freshVoice();

    expect(voiceSystem.speak("No preferred voice.", "captain")).toBe(true);
    expect(spoken[0].voice?.name).toBe("Generic English");
    expect(spoken[0].pitch).toBeCloseTo(1);

    synthesis.getVoices.mockReturnValueOnce([fakeVoice("Mónica", "es-ES")]);
    expect(voiceSystem.speak("No English voice.", "captain")).toBe(true);
    expect(spoken[1].voice).toBeNull();
    expect(spoken[1].rate).toBeCloseTo(0.96);
  });
});
