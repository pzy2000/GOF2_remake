import { afterEach, describe, expect, it, vi } from "vitest";

class FakeUtterance {
  text: string;
  lang = "";
  pitch = 1;
  rate = 1;
  volume = 1;
  voice: SpeechSynthesisVoice | null = null;
  onstart: (() => void) | null = null;
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

type SynthesisLike = {
  speaking: boolean;
  paused: boolean;
  getVoices: ReturnType<typeof vi.fn>;
  speak: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
  cancel: ReturnType<typeof vi.fn>;
};

function createFakeSynthesis(voices: SpeechSynthesisVoice[] = []): { synthesis: SynthesisLike; spoken: FakeUtterance[] } {
  const spoken: FakeUtterance[] = [];
  const synthesis: SynthesisLike = {
    speaking: false,
    paused: false,
    getVoices: vi.fn(() => voices),
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
  return { synthesis, spoken };
}

class FakeAudioParam {
  value = 0;
  setTargetAtTime = vi.fn();
  setValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
}

type CreatedNode = {
  type: string;
  gain?: FakeAudioParam;
  frequency?: FakeAudioParam;
  delayTime?: FakeAudioParam;
  Q?: FakeAudioParam;
  filterType?: string;
  curve?: Float32Array | null;
  buffer?: unknown;
  startCalls: number;
  stopCalls: number;
  connectTargets: unknown[];
  disconnectCalls: number;
};

class FakeAudioNode {
  type = "sine";
  gain = new FakeAudioParam();
  frequency = new FakeAudioParam();
  delayTime = new FakeAudioParam();
  Q = new FakeAudioParam();
  curve: Float32Array | null = null;
  buffer: unknown = null;
  startCalls = 0;
  stopCalls = 0;
  connectTargets: unknown[] = [];
  disconnectCalls = 0;
  start() {
    this.startCalls += 1;
  }
  stop() {
    this.stopCalls += 1;
  }
  connect(target: unknown) {
    this.connectTargets.push(target);
    FakeAudioContext.connections.push({ source: this, target });
  }
  disconnect() {
    this.disconnectCalls += 1;
  }
}

class FakeAudioBuffer {
  constructor(public numberOfChannels: number, public length: number, public sampleRate: number) {}
  getChannelData(_channel: number): Float32Array {
    return new Float32Array(this.length);
  }
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  static connections: Array<{ source: unknown; target: unknown }> = [];
  static createdNodesByType: Map<string, FakeAudioNode[]> = new Map();
  sampleRate = 24000;
  currentTime = 1;
  state: AudioContextState = "running";
  destination = new FakeAudioNode();
  resume = vi.fn(() => {
    this.state = "running";
    return Promise.resolve();
  });

  constructor() {
    FakeAudioContext.instances.push(this);
  }

  private register(type: string, node: FakeAudioNode): FakeAudioNode {
    node.type = type;
    const list = FakeAudioContext.createdNodesByType.get(type) ?? [];
    list.push(node);
    FakeAudioContext.createdNodesByType.set(type, list);
    return node;
  }

  createGain() {
    return this.register("gain", new FakeAudioNode());
  }
  createOscillator() {
    return this.register("oscillator", new FakeAudioNode());
  }
  createBiquadFilter() {
    const node = new FakeAudioNode();
    return this.register("biquad", node);
  }
  createWaveShaper() {
    return this.register("waveshaper", new FakeAudioNode());
  }
  createDelay(_max?: number) {
    return this.register("delay", new FakeAudioNode());
  }
  createConvolver() {
    return this.register("convolver", new FakeAudioNode());
  }
  createMediaElementSource(_element: HTMLAudioElement) {
    return this.register("media", new FakeAudioNode());
  }
  createBuffer(channels: number, length: number, sampleRate: number) {
    return new FakeAudioBuffer(channels, length, sampleRate);
  }
}

class SuspendedAudioContext extends FakeAudioContext {
  override state: AudioContextState = "suspended";
  override resume = vi.fn(() => Promise.resolve());
}

class RecoveringAudioContext extends FakeAudioContext {
  override state: AudioContextState = "suspended";
  private resumeCalls = 0;
  override resume = vi.fn(() => {
    this.resumeCalls += 1;
    if (this.resumeCalls > 1) this.state = "running";
    return Promise.resolve();
  });
}

class FakeAudio {
  static instances: FakeAudio[] = [];
  src: string;
  loop = false;
  preload = "";
  volume = 1;
  currentTime = 0;
  paused = true;
  crossOrigin: string | null = null;
  onplaying: (() => void) | null = null;
  onended: (() => void) | null = null;
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

function resetAudioMocks() {
  FakeAudio.instances = [];
  FakeAudioContext.instances = [];
  FakeAudioContext.connections = [];
  FakeAudioContext.createdNodesByType = new Map();
}

async function freshVoice(options: {
  voices?: SpeechSynthesisVoice[];
  withAudioContext?: boolean;
  AudioContextClass?: typeof FakeAudioContext;
  AudioClass?: typeof FakeAudio;
} = {}) {
  vi.resetModules();
  resetAudioMocks();
  const { synthesis, spoken } = createFakeSynthesis(options.voices ?? []);
  const windowStub: Record<string, unknown> = { speechSynthesis: synthesis };
  if (options.withAudioContext) {
    windowStub.AudioContext = options.AudioContextClass ?? FakeAudioContext;
  }
  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
  vi.stubGlobal("window", windowStub);
  if (options.AudioClass) {
    vi.stubGlobal("Audio", options.AudioClass);
  }
  const module = await import("../src/systems/voice");
  return { ...module, synthesis, spoken };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  resetAudioMocks();
});

describe("voice clip key", () => {
  it("normalizes whitespace before hashing", async () => {
    const { voiceClipKey, prepareCommsSpeechText } = await freshVoice();
    const noisy = "  Helion traffic   clear.  ";
    const clean = "Helion traffic clear.";
    expect(prepareCommsSpeechText(noisy)).toBe(clean);
    expect(voiceClipKey("captain", "en", prepareCommsSpeechText(noisy))).toBe(voiceClipKey("captain", "en", clean));
  });

  it("produces a stable 16-character hex digest per input", async () => {
    const { voiceClipKey } = await freshVoice();
    const first = voiceClipKey("ship-ai", "zh-CN", "信号确认。");
    expect(first).toMatch(/^[0-9a-f]{16}$/);
    expect(voiceClipKey("ship-ai", "zh-CN", "信号确认。")).toBe(first);
  });

  it("hashes profile, locale, and text into different keys", async () => {
    const { voiceClipKey } = await freshVoice();
    const base = voiceClipKey("captain", "en", "Comms open.");
    expect(voiceClipKey("ship-ai", "en", "Comms open.")).not.toBe(base);
    expect(voiceClipKey("captain", "ja", "Comms open.")).not.toBe(base);
    expect(voiceClipKey("captain", "en", "Comms closed.")).not.toBe(base);
  });
});

describe("voice profiles", () => {
  it("defines a profile, fallback hint, and per-locale Edge voice for every speaker", async () => {
    const { voiceProfiles } = await freshVoice();
    const expectedProfiles = ["captain", "ship-ai", "helion-handler", "mirr-analyst", "kuro-foreman", "vantara-officer", "ashen-broker", "celest-archivist", "union-witness"];
    for (const id of expectedProfiles) {
      const profile = voiceProfiles[id as keyof typeof voiceProfiles];
      expect(profile, `${id} profile missing`).toBeTruthy();
      expect(profile.tts.voiceByLocale.en, `${id} missing english voice`).toBeTruthy();
      expect(profile.tts.voiceByLocale["zh-CN"], `${id} missing zh-CN voice`).toBeTruthy();
      expect(profile.tts.voiceByLocale.ja, `${id} missing ja voice`).toBeTruthy();
      expect(profile.tts.voiceByLocale.fr, `${id} missing fr voice`).toBeTruthy();
      expect(profile.fx).toBeTruthy();
      expect(profile.fallback).toBeTruthy();
    }
  });

  it("assigns the AI ghost preset only to the ship AI", async () => {
    const { voiceProfiles } = await freshVoice();
    expect(voiceProfiles["ship-ai"].fx).toBe("ai-ghost");
    for (const [id, profile] of Object.entries(voiceProfiles)) {
      if (id === "ship-ai") continue;
      expect(profile.fx).not.toBe("ai-ghost");
    }
  });

  it("keeps every English Edge voice distinct so speakers do not collide", async () => {
    const { voiceProfiles } = await freshVoice();
    const englishVoices = Object.values(voiceProfiles).map((profile) => profile.tts.voiceByLocale.en);
    expect(new Set(englishVoices).size).toBe(englishVoices.length);
  });
});

describe("speech fallback path", () => {
  it("is safe when speech synthesis is unavailable", async () => {
    vi.resetModules();
    resetAudioMocks();
    vi.stubGlobal("window", {});
    const { voiceSystem } = await import("../src/systems/voice");
    expect(() => voiceSystem.cancel()).not.toThrow();
    expect(voiceSystem.speak("Signal clear.")).toBe(false);
  });

  it("falls back to speech synthesis when no clip manifest matches", async () => {
    const { voiceSystem, synthesis, spoken } = await freshVoice({ voices: [fakeVoice("Generic English")] });
    voiceSystem.applySettings({ masterVolume: 1, sfxVolume: 0.8, musicVolume: 0.4, voiceVolume: 1, muted: false });
    expect(voiceSystem.speak("Signal clear.", "ship-ai")).toBe(true);
    expect(synthesis.speak).toHaveBeenCalledOnce();
    expect(spoken[0].voice?.name).toBe("Generic English");
    expect(spoken[0].pitch).toBeCloseTo(0.7);
    expect(spoken[0].rate).toBeCloseTo(0.86);
  });

  it("trims, applies boosted volume, and respects locale on the fallback path", async () => {
    const voices = [fakeVoice("Generic English"), fakeVoice("Tingting", "zh-CN"), fakeVoice("Nanami", "ja-JP")];
    const { voiceSystem, spoken } = await freshVoice({ voices });
    voiceSystem.applySettings({ masterVolume: 0.5, sfxVolume: 0.8, musicVolume: 0.4, voiceVolume: 0.6, muted: false });
    expect(voiceSystem.speak("  Hello   world.  ", "captain", { locale: "zh-CN" })).toBe(true);
    expect(spoken[0].text).toBe("Hello world.");
    expect(spoken[0].lang).toBe("zh-CN");
    expect(spoken[0].voice?.name).toBe("Tingting");
    expect(spoken[0].volume).toBeCloseTo(0.405);
  });

  it("returns false while muted and clears in-flight speech", async () => {
    const { voiceSystem, synthesis } = await freshVoice({ voices: [fakeVoice("Generic English")] });
    voiceSystem.applySettings({ masterVolume: 1, sfxVolume: 0.8, musicVolume: 0.4, voiceVolume: 1, muted: false });
    expect(voiceSystem.speak("Line one.", "captain")).toBe(true);
    voiceSystem.applySettings({ masterVolume: 1, sfxVolume: 0.8, musicVolume: 0.4, voiceVolume: 1, muted: true });
    expect(synthesis.cancel).toHaveBeenCalled();
    expect(voiceSystem.speak("Line two.", "captain")).toBe(false);
  });

  it("fires the natural-end callback only when the current utterance finishes", async () => {
    const { voiceSystem, spoken } = await freshVoice({ voices: [fakeVoice("Generic English")] });
    const onEnd = vi.fn();
    expect(voiceSystem.speak("Line A.", "helion-handler", { onEnd })).toBe(true);
    const first = spoken[0];
    voiceSystem.cancel();
    first.onend?.();
    expect(onEnd).not.toHaveBeenCalled();
    expect(voiceSystem.speak("Line B.", "helion-handler", { onEnd })).toBe(true);
    spoken[1].onend?.();
    expect(onEnd).toHaveBeenCalledOnce();
    spoken[1].onend?.();
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it("reports speech start and error callbacks for the current utterance", async () => {
    const { voiceSystem, spoken } = await freshVoice({ voices: [fakeVoice("Generic English")] });
    const onStart = vi.fn();
    const onError = vi.fn();

    expect(voiceSystem.speak("Line A.", "helion-handler", { onStart, onError })).toBe(true);
    spoken[0].onstart?.();
    expect(onStart).toHaveBeenCalledOnce();

    spoken[0].onerror?.();
    expect(onError).toHaveBeenCalledOnce();
  });

  it("clamps boosted voice volume to the synthesis maximum", async () => {
    const { voiceSystem, spoken } = await freshVoice({ voices: [fakeVoice("Generic English")] });
    voiceSystem.applySettings({ masterVolume: 1, sfxVolume: 0.8, musicVolume: 0.4, voiceVolume: 1, muted: false });
    expect(voiceSystem.speak("Loud line.")).toBe(true);
    expect(spoken[0].volume).toBe(1);
  });

  it("skips novelty system voices on the fallback path", async () => {
    const voices = [fakeVoice("Trinoids"), fakeVoice("Generic English"), fakeVoice("Samantha Enhanced")];
    const { voiceSystem, spoken } = await freshVoice({ voices });
    expect(voiceSystem.speak("Helion traffic clear.", "helion-handler")).toBe(true);
    expect(spoken[0].voice?.name).toBe("Generic English");
  });
});

describe("primary audio clip path", () => {
  it("routes hashed clip lookups through Audio + Web Audio FX when manifest matches", async () => {
    const { voiceSystem, voiceClipKey, prepareCommsSpeechText, synthesis } = await freshVoice({
      voices: [fakeVoice("Generic English")],
      withAudioContext: true,
      AudioClass: FakeAudio
    });
    voiceSystem.applySettings({ masterVolume: 1, sfxVolume: 0.8, musicVolume: 0.5, voiceVolume: 1, muted: false });
    const text = "Glass Wake confirmed.";
    const key = voiceClipKey("captain", "en", prepareCommsSpeechText(text));
    voiceSystem.setVoiceClipManifest({ [key]: `/assets/voice/captain/${key}.mp3` });

    expect(voiceSystem.speak(text, "captain")).toBe(true);
    expect(synthesis.speak).not.toHaveBeenCalled();
    expect(FakeAudio.instances).toHaveLength(1);
    expect(FakeAudio.instances[0].src).toContain(`${key}.mp3`);
    expect(FakeAudio.instances[0].play).toHaveBeenCalledOnce();
    // Same-origin voice assets must NOT be requested with crossOrigin set:
    // when the dev server omits CORS headers, MediaElementSource would route
    // a silent stream through Web Audio.
    expect(FakeAudio.instances[0].crossOrigin).toBeNull();
  });

  it("builds the AI ghost FX chain with extra oscillators and a convolver for ship-ai", async () => {
    const { voiceSystem, voiceClipKey, prepareCommsSpeechText } = await freshVoice({
      voices: [],
      withAudioContext: true,
      AudioClass: FakeAudio
    });
    voiceSystem.applySettings({ masterVolume: 1, sfxVolume: 0.8, musicVolume: 0.5, voiceVolume: 1, muted: false });
    const text = "Carrier desynchronized.";
    const aiKey = voiceClipKey("ship-ai", "en", prepareCommsSpeechText(text));
    voiceSystem.setVoiceClipManifest({ [aiKey]: `/assets/voice/ship-ai/${aiKey}.mp3` });

    voiceSystem.speak(text, "ship-ai");
    const oscillatorsAi = FakeAudioContext.createdNodesByType.get("oscillator")?.length ?? 0;
    const convolversAi = FakeAudioContext.createdNodesByType.get("convolver")?.length ?? 0;
    expect(oscillatorsAi).toBeGreaterThanOrEqual(1);
    expect(convolversAi).toBeGreaterThanOrEqual(1);
    voiceSystem.cancel();

    const captainKey = voiceClipKey("captain", "en", prepareCommsSpeechText(text));
    voiceSystem.setVoiceClipManifest({ [captainKey]: `/assets/voice/captain/${captainKey}.mp3` });
    const oscillatorsBefore = FakeAudioContext.createdNodesByType.get("oscillator")?.length ?? 0;
    voiceSystem.speak(text, "captain");
    const oscillatorsAfter = FakeAudioContext.createdNodesByType.get("oscillator")?.length ?? 0;
    expect(oscillatorsAfter).toBe(oscillatorsBefore);
  });

  it("falls back to speech synthesis when the manifest has no entry for the line", async () => {
    const { voiceSystem, synthesis } = await freshVoice({
      voices: [fakeVoice("Generic English")],
      withAudioContext: true,
      AudioClass: FakeAudio
    });
    voiceSystem.setVoiceClipManifest({ "00000000000000ff": "/assets/voice/captain/unused.mp3" });
    voiceSystem.applySettings({ masterVolume: 1, sfxVolume: 0.8, musicVolume: 0.5, voiceVolume: 1, muted: false });
    expect(voiceSystem.speak("Unmatched line.", "captain")).toBe(true);
    expect(FakeAudio.instances).toHaveLength(0);
    expect(synthesis.speak).toHaveBeenCalledOnce();
  });

  it("pause toggles the audio element while the clip path is active", async () => {
    const { voiceSystem, voiceClipKey, prepareCommsSpeechText } = await freshVoice({
      voices: [],
      withAudioContext: true,
      AudioClass: FakeAudio
    });
    const text = "Mining clear.";
    const key = voiceClipKey("kuro-foreman", "en", prepareCommsSpeechText(text));
    voiceSystem.setVoiceClipManifest({ [key]: `/assets/voice/kuro-foreman/${key}.mp3` });
    voiceSystem.applySettings({ masterVolume: 1, sfxVolume: 0.8, musicVolume: 0.5, voiceVolume: 1, muted: false });
    voiceSystem.speak(text, "kuro-foreman");
    expect(voiceSystem.pauseOrResume()).toBe("paused");
    expect(FakeAudio.instances[0].pause).toHaveBeenCalledOnce();
    expect(voiceSystem.pauseOrResume()).toBe("speaking");
    expect(FakeAudio.instances[0].play).toHaveBeenCalledTimes(2);
  });

  it("does not report clip playback as speaking while the audio context is suspended", async () => {
    const onStart = vi.fn();
    const { voiceSystem, voiceClipKey, prepareCommsSpeechText } = await freshVoice({
      voices: [],
      withAudioContext: true,
      AudioContextClass: SuspendedAudioContext,
      AudioClass: FakeAudio
    });
    const text = "Launch clearance is green.";
    const key = voiceClipKey("ship-ai", "en", prepareCommsSpeechText(text));
    voiceSystem.setVoiceClipManifest({ [key]: `/assets/voice/ship-ai/${key}.mp3` });
    voiceSystem.applySettings({ masterVolume: 1, sfxVolume: 0.8, musicVolume: 0.5, voiceVolume: 1, muted: false });

    expect(voiceSystem.speak(text, "ship-ai", { onStart })).toBe(true);
    expect(FakeAudio.instances[0].play).toHaveBeenCalledOnce();
    FakeAudio.instances[0].onplaying?.();

    expect(onStart).not.toHaveBeenCalled();
    expect(voiceSystem.debugState.speaking).toBe(false);
  });

  it("play/pause resumes suspended clip output before treating the line as paused", async () => {
    const onStart = vi.fn();
    const { voiceSystem, voiceClipKey, prepareCommsSpeechText } = await freshVoice({
      voices: [],
      withAudioContext: true,
      AudioContextClass: RecoveringAudioContext,
      AudioClass: FakeAudio
    });
    const text = "Launch clearance is green.";
    const key = voiceClipKey("ship-ai", "en", prepareCommsSpeechText(text));
    voiceSystem.setVoiceClipManifest({ [key]: `/assets/voice/ship-ai/${key}.mp3` });
    voiceSystem.applySettings({ masterVolume: 1, sfxVolume: 0.8, musicVolume: 0.5, voiceVolume: 1, muted: false });
    voiceSystem.speak(text, "ship-ai", { onStart });
    FakeAudio.instances[0].onplaying?.();
    expect(FakeAudio.instances[0].pause).not.toHaveBeenCalled();

    expect(voiceSystem.pauseOrResume()).toBe("speaking");
    await Promise.resolve();

    expect(FakeAudioContext.instances[0].resume).toHaveBeenCalled();
    expect(FakeAudio.instances[0].pause).not.toHaveBeenCalled();
    expect(onStart).toHaveBeenCalledOnce();
    expect(voiceSystem.debugState.speaking).toBe(true);
  });

  it("falls back to speech synthesis if the audio play promise rejects later", async () => {
    const { voiceSystem, voiceClipKey, prepareCommsSpeechText, synthesis } = await freshVoice({
      voices: [fakeVoice("Generic English")],
      withAudioContext: true,
      AudioClass: RejectingAudio
    });
    const text = "Wormhole stabilized.";
    const key = voiceClipKey("ashen-broker", "en", prepareCommsSpeechText(text));
    voiceSystem.setVoiceClipManifest({ [key]: `/assets/voice/ashen-broker/${key}.mp3` });
    voiceSystem.applySettings({ masterVolume: 1, sfxVolume: 0.8, musicVolume: 0.5, voiceVolume: 1, muted: false });
    expect(voiceSystem.speak(text, "ashen-broker")).toBe(true);
    await Promise.resolve();
    await Promise.resolve();
    // The rejection must promote the line to the SpeechSynthesis path so the
    // speaker is still heard when the clip file is missing or unplayable.
    expect(synthesis.speak).toHaveBeenCalledOnce();
    expect(() => voiceSystem.cancel()).not.toThrow();
  });

  it("falls back to speech synthesis if the audio element fires an error event", async () => {
    const { voiceSystem, voiceClipKey, prepareCommsSpeechText, synthesis } = await freshVoice({
      voices: [fakeVoice("Generic English")],
      withAudioContext: true,
      AudioClass: FakeAudio
    });
    const text = "Sync lost.";
    const key = voiceClipKey("helion-handler", "zh-CN", prepareCommsSpeechText(text));
    voiceSystem.setVoiceClipManifest({ [key]: `/assets/voice/helion-handler/${key}.mp3` });
    voiceSystem.applySettings({ masterVolume: 1, sfxVolume: 0.8, musicVolume: 0.5, voiceVolume: 1, muted: false });
    expect(voiceSystem.speak(text, "helion-handler", { locale: "zh-CN" })).toBe(true);
    const audio = FakeAudio.instances[0] as unknown as { onerror?: () => void };
    expect(typeof audio.onerror).toBe("function");
    audio.onerror?.();
    expect(synthesis.speak).toHaveBeenCalledOnce();
  });
});
