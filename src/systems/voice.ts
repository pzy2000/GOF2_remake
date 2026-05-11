import type { AudioSettings } from "../types/game";
import { DEFAULT_LOCALE, speechLangForLocale, type Locale } from "../i18n";

const defaultVoiceSettings: AudioSettings = {
  masterVolume: 0.8,
  sfxVolume: 0.75,
  musicVolume: 0.35,
  voiceVolume: 0.85,
  muted: false
};

type VoiceOptions = {
  locale?: Locale;
  onEnd?: () => void;
};

const VOICE_VOLUME_BOOST = 1.35;
const DEFAULT_VOICE_PROFILE_ID = "helion-handler";

export type VoiceFxPreset =
  | "comms-warm"
  | "comms-radio"
  | "comms-calm"
  | "comms-gritty"
  | "comms-mil"
  | "comms-shadow"
  | "comms-bright"
  | "comms-folk"
  | "ai-ghost";

export type VoiceFallbackHint = "calm" | "firm" | "rough" | "bright" | "synthetic";

export type VoiceProfileDefinition = {
  tts: {
    voiceByLocale: Partial<Record<Locale, string>>;
    pitchPct: number;
    ratePct: number;
  };
  fx: VoiceFxPreset;
  fallback: VoiceFallbackHint;
};

// Edge Neural voice ids picked to give each speaker a distinct base timbre even
// before the per-profile FX chain runs. Locales beyond the four shipped audio
// renders fall back to en-US so the runtime can still find a sensible voice.
const englishCaptain = "en-US-DavisNeural";
const englishShipAi = "en-US-AriaNeural";
const englishHelion = "en-US-JennyNeural";
const englishMirr = "en-US-MichelleNeural";
const englishKuro = "en-US-TonyNeural";
const englishVantara = "en-US-GuyNeural";
const englishAshen = "en-US-JasonNeural";
const englishCelest = "en-US-AmberNeural";
const englishUnion = "en-US-AndrewNeural";

export const voiceProfiles = {
  captain: {
    tts: {
      voiceByLocale: {
        en: englishCaptain,
        "zh-CN": "zh-CN-YunxiNeural",
        "zh-TW": "zh-CN-YunxiNeural",
        ja: "ja-JP-KeitaNeural",
        fr: "fr-FR-HenriNeural"
      },
      pitchPct: 0,
      ratePct: 0
    },
    fx: "comms-warm",
    fallback: "firm"
  },
  "ship-ai": {
    tts: {
      voiceByLocale: {
        en: englishShipAi,
        "zh-CN": "zh-CN-XiaoxiaoNeural",
        "zh-TW": "zh-CN-XiaoxiaoNeural",
        ja: "ja-JP-NanamiNeural",
        fr: "fr-FR-EloiseNeural"
      },
      pitchPct: -12,
      ratePct: -8
    },
    fx: "ai-ghost",
    fallback: "synthetic"
  },
  "helion-handler": {
    tts: {
      voiceByLocale: {
        en: englishHelion,
        "zh-CN": "zh-CN-XiaohanNeural",
        "zh-TW": "zh-CN-XiaohanNeural",
        ja: "ja-JP-MayuNeural",
        fr: "fr-FR-DeniseNeural"
      },
      pitchPct: 4,
      ratePct: 2
    },
    fx: "comms-radio",
    fallback: "firm"
  },
  "mirr-analyst": {
    tts: {
      voiceByLocale: {
        en: englishMirr,
        "zh-CN": "zh-CN-XiaoyiNeural",
        "zh-TW": "zh-CN-XiaoyiNeural",
        ja: "ja-JP-AoiNeural",
        fr: "fr-FR-BrigitteNeural"
      },
      pitchPct: -3,
      ratePct: -6
    },
    fx: "comms-calm",
    fallback: "calm"
  },
  "kuro-foreman": {
    tts: {
      voiceByLocale: {
        en: englishKuro,
        "zh-CN": "zh-CN-YunyangNeural",
        "zh-TW": "zh-CN-YunyangNeural",
        ja: "ja-JP-DaichiNeural",
        fr: "fr-FR-AlainNeural"
      },
      pitchPct: -10,
      ratePct: -4
    },
    fx: "comms-gritty",
    fallback: "rough"
  },
  "vantara-officer": {
    tts: {
      voiceByLocale: {
        en: englishVantara,
        "zh-CN": "zh-CN-YunjianNeural",
        "zh-TW": "zh-CN-YunjianNeural",
        ja: "ja-JP-KeitaNeural",
        fr: "fr-FR-HenriNeural"
      },
      pitchPct: -2,
      ratePct: -2
    },
    fx: "comms-mil",
    fallback: "firm"
  },
  "ashen-broker": {
    tts: {
      voiceByLocale: {
        en: englishAshen,
        "zh-CN": "zh-CN-YunyeNeural",
        "zh-TW": "zh-CN-YunyeNeural",
        ja: "ja-JP-NaokiNeural",
        fr: "fr-FR-JeromeNeural"
      },
      pitchPct: -6,
      ratePct: -3
    },
    fx: "comms-shadow",
    fallback: "rough"
  },
  "celest-archivist": {
    tts: {
      voiceByLocale: {
        en: englishCelest,
        "zh-CN": "zh-CN-XiaomengNeural",
        "zh-TW": "zh-CN-XiaomengNeural",
        ja: "ja-JP-ShioriNeural",
        fr: "fr-FR-JosephineNeural"
      },
      pitchPct: 6,
      ratePct: 2
    },
    fx: "comms-bright",
    fallback: "bright"
  },
  "union-witness": {
    tts: {
      voiceByLocale: {
        en: englishUnion,
        "zh-CN": "zh-CN-YunfengNeural",
        "zh-TW": "zh-CN-YunfengNeural",
        ja: "ja-JP-MasaruNeural",
        fr: "fr-FR-YvesNeural"
      },
      pitchPct: -7,
      ratePct: -3
    },
    fx: "comms-folk",
    fallback: "rough"
  }
} as const satisfies Record<string, VoiceProfileDefinition>;

export type VoiceProfileId = keyof typeof voiceProfiles;

export type VoiceClipManifest = Record<string, string>;

// FNV-1a 64-bit gives us a deterministic 16-hex digest that both the build
// script (Node) and the runtime (browser) can compute without any external
// crypto dependency. 64 bits is plenty for the small library of dialogue lines.
export function voiceClipKey(profileId: string, locale: Locale, normalizedText: string): string {
  const input = `${profileId}|${locale}|${normalizedText}`;
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= BigInt(input.charCodeAt(i));
    hash = (hash * prime) & mask;
  }
  return hash.toString(16).padStart(16, "0");
}

export function prepareCommsSpeechText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function effectiveVolume(settings: AudioSettings): number {
  return settings.muted ? 0 : Math.max(0, Math.min(1, settings.masterVolume * settings.voiceVolume * VOICE_VOLUME_BOOST));
}

function hasSpeechApi(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

function hasAudioContextApi(): boolean {
  if (typeof window === "undefined") return false;
  return typeof window.AudioContext !== "undefined" || typeof window.webkitAudioContext !== "undefined";
}

function searchableVoiceName(voice: SpeechSynthesisVoice): string {
  return `${voice.name} ${voice.voiceURI}`.toLowerCase();
}

function isNoveltyVoice(voice: SpeechSynthesisVoice): boolean {
  const searchable = searchableVoiceName(voice);
  return /\b(siri|novelty|whisper|trinoids|zarvox|bells|boing|bubbles|cellos|deranged|hysterical|bad news|good news)\b/.test(searchable);
}

function firstStandardVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  return voices.find((voice) => !isNoveltyVoice(voice)) ?? null;
}

function selectFallbackVoice(locale: Locale): SpeechSynthesisVoice | null {
  const langPrefix = speechLangForLocale(locale).split("-")[0].toLowerCase();
  const voices = window.speechSynthesis.getVoices();
  const localeVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith(langPrefix));
  const englishVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
  return firstStandardVoice(localeVoices) ?? firstStandardVoice(englishVoices) ?? null;
}

function fallbackVoiceParams(hint: VoiceFallbackHint): Pick<SpeechSynthesisUtterance, "pitch" | "rate"> {
  if (hint === "calm") return { pitch: 0.95, rate: 0.92 };
  if (hint === "rough") return { pitch: 0.82, rate: 0.94 };
  if (hint === "bright") return { pitch: 1.08, rate: 0.98 };
  if (hint === "synthetic") return { pitch: 0.7, rate: 0.86 };
  return { pitch: 1, rate: 0.96 };
}

type FxNode = {
  input: AudioNode;
  output: AudioNode;
  starts: Array<{ start: () => void; stop: () => void }>;
};

// Creates a short noise impulse response used by the comms reverb tail. The
// length and decay shape vary per preset to keep each speaker's "space" subtly
// different.
function buildImpulseResponse(ctx: BaseAudioContext, durationSec: number, decay: number, metallic: boolean): AudioBuffer {
  const sampleRate = ctx.sampleRate || 44100;
  const length = Math.max(1, Math.floor(sampleRate * durationSec));
  const buffer = ctx.createBuffer(2, length, sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      const t = i / length;
      const envelope = Math.pow(1 - t, decay);
      const noise = Math.random() * 2 - 1;
      const tone = metallic ? Math.sin(2 * Math.PI * (220 + channel * 13) * (i / sampleRate)) * 0.18 : 0;
      data[i] = (noise * 0.9 + tone) * envelope;
    }
  }
  return buffer;
}

function makeDistortionCurve(amount: number): Float32Array {
  const samples = 1024;
  const curve = new Float32Array(samples);
  const k = amount;
  for (let i = 0; i < samples; i += 1) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  return curve;
}

function createFxNode(ctx: AudioContext, preset: VoiceFxPreset): FxNode {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const starts: FxNode["starts"] = [];

  if (preset === "ai-ghost") {
    // The ghost chain narrows the band, ring-modulates against a slow audio-rate
    // sine to introduce metallic sidebands, soft-clips for grit, smears a brief
    // chorus tail, and ends in a metallic reverb. Together they sell the "AI
    // speaking through compromised comms" feel.
    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 220;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 4200;

    const ringGain = ctx.createGain();
    ringGain.gain.value = 0;
    const modulator = ctx.createOscillator();
    modulator.type = "sine";
    modulator.frequency.value = 92;
    const modulatorAmp = ctx.createGain();
    modulatorAmp.gain.value = 0.85;
    modulator.connect(modulatorAmp);
    modulatorAmp.connect(ringGain.gain);

    const shaper = ctx.createWaveShaper();
    shaper.curve = makeDistortionCurve(2.4);

    const chorusDelayA = ctx.createDelay(0.05);
    chorusDelayA.delayTime.value = 0.018;
    const chorusDelayB = ctx.createDelay(0.05);
    chorusDelayB.delayTime.value = 0.032;
    const chorusGainA = ctx.createGain();
    chorusGainA.gain.value = 0.32;
    const chorusGainB = ctx.createGain();
    chorusGainB.gain.value = 0.24;
    const chorusBus = ctx.createGain();
    chorusBus.gain.value = 1;

    const dryGain = ctx.createGain();
    dryGain.gain.value = 0.18;
    const wetGain = ctx.createGain();
    wetGain.gain.value = 0.95;

    const reverb = ctx.createConvolver();
    reverb.buffer = buildImpulseResponse(ctx, 0.55, 2.4, true);
    const reverbMix = ctx.createGain();
    reverbMix.gain.value = 0.45;

    input.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(ringGain);
    ringGain.connect(shaper);
    shaper.connect(chorusBus);
    chorusBus.connect(chorusDelayA);
    chorusBus.connect(chorusDelayB);
    chorusDelayA.connect(chorusGainA);
    chorusDelayB.connect(chorusGainB);
    chorusGainA.connect(wetGain);
    chorusGainB.connect(wetGain);
    chorusBus.connect(wetGain);
    wetGain.connect(reverb);
    reverb.connect(reverbMix);
    reverbMix.connect(output);
    wetGain.connect(output);
    input.connect(dryGain);
    dryGain.connect(output);

    starts.push({ start: () => modulator.start(), stop: () => modulator.stop() });
    return { input, output, starts };
  }

  // The seven "human" presets all share the same backbone (highpass, peaking
  // EQ, optional lowpass shelf, optional shaper, comms reverb) but each preset
  // picks its own coefficients so the speakers stay distinguishable.
  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  const peaking = ctx.createBiquadFilter();
  peaking.type = "peaking";
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  const shaper = ctx.createWaveShaper();
  const reverb = ctx.createConvolver();
  const reverbMix = ctx.createGain();
  const dryMix = ctx.createGain();
  dryMix.gain.value = 1;

  let shaperEnabled = false;
  let tremoloOsc: OscillatorNode | undefined;
  let tremoloGain: GainNode | undefined;

  switch (preset) {
    case "comms-warm":
      highpass.frequency.value = 110;
      peaking.frequency.value = 2400;
      peaking.gain.value = 2.5;
      peaking.Q.value = 0.9;
      lowpass.frequency.value = 7800;
      reverb.buffer = buildImpulseResponse(ctx, 0.32, 2.6, false);
      reverbMix.gain.value = 0.16;
      break;
    case "comms-radio":
      highpass.frequency.value = 220;
      peaking.frequency.value = 1800;
      peaking.gain.value = 4.5;
      peaking.Q.value = 1.2;
      lowpass.frequency.value = 3600;
      shaper.curve = makeDistortionCurve(0.8);
      shaperEnabled = true;
      reverb.buffer = buildImpulseResponse(ctx, 0.22, 2.1, true);
      reverbMix.gain.value = 0.22;
      break;
    case "comms-calm":
      highpass.frequency.value = 95;
      peaking.frequency.value = 1500;
      peaking.gain.value = 1.6;
      peaking.Q.value = 0.7;
      lowpass.frequency.value = 6800;
      reverb.buffer = buildImpulseResponse(ctx, 0.45, 2.8, false);
      reverbMix.gain.value = 0.2;
      break;
    case "comms-gritty":
      highpass.frequency.value = 90;
      peaking.frequency.value = 1700;
      peaking.gain.value = 3.2;
      peaking.Q.value = 1.1;
      lowpass.frequency.value = 5200;
      shaper.curve = makeDistortionCurve(1.6);
      shaperEnabled = true;
      reverb.buffer = buildImpulseResponse(ctx, 0.28, 2.2, false);
      reverbMix.gain.value = 0.18;
      break;
    case "comms-mil":
      highpass.frequency.value = 200;
      peaking.frequency.value = 2200;
      peaking.gain.value = 3.6;
      peaking.Q.value = 1.4;
      lowpass.frequency.value = 4500;
      shaper.curve = makeDistortionCurve(0.6);
      shaperEnabled = true;
      reverb.buffer = buildImpulseResponse(ctx, 0.18, 2.0, true);
      reverbMix.gain.value = 0.24;
      break;
    case "comms-shadow":
      highpass.frequency.value = 130;
      peaking.frequency.value = 900;
      peaking.gain.value = 2.4;
      peaking.Q.value = 0.9;
      lowpass.frequency.value = 5400;
      reverb.buffer = buildImpulseResponse(ctx, 0.55, 3.0, false);
      reverbMix.gain.value = 0.3;
      tremoloOsc = ctx.createOscillator();
      tremoloOsc.type = "sine";
      tremoloOsc.frequency.value = 5.2;
      tremoloGain = ctx.createGain();
      tremoloGain.gain.value = 0.18;
      break;
    case "comms-bright":
      highpass.frequency.value = 140;
      peaking.frequency.value = 3600;
      peaking.gain.value = 3.4;
      peaking.Q.value = 1.1;
      lowpass.frequency.value = 8500;
      reverb.buffer = buildImpulseResponse(ctx, 0.4, 2.4, true);
      reverbMix.gain.value = 0.2;
      break;
    case "comms-folk":
    default:
      highpass.frequency.value = 100;
      peaking.frequency.value = 1300;
      peaking.gain.value = 2.2;
      peaking.Q.value = 0.8;
      lowpass.frequency.value = 5200;
      reverb.buffer = buildImpulseResponse(ctx, 0.34, 2.7, false);
      reverbMix.gain.value = 0.15;
      break;
  }

  input.connect(highpass);
  highpass.connect(peaking);
  peaking.connect(lowpass);
  if (shaperEnabled) {
    lowpass.connect(shaper);
    shaper.connect(dryMix);
  } else {
    lowpass.connect(dryMix);
  }
  if (tremoloOsc && tremoloGain) {
    // Drive an LFO into a baseline gain of 1.0 so the tremolo is a tasteful
    // amplitude wobble rather than full ring modulation.
    const tremolo = ctx.createGain();
    tremolo.gain.value = 1;
    tremoloOsc.connect(tremoloGain);
    tremoloGain.connect(tremolo.gain);
    dryMix.connect(tremolo);
    tremolo.connect(output);
    tremolo.connect(reverb);
    starts.push({ start: () => tremoloOsc!.start(), stop: () => tremoloOsc!.stop() });
  } else {
    dryMix.connect(output);
    dryMix.connect(reverb);
  }
  reverb.connect(reverbMix);
  reverbMix.connect(output);

  return { input, output, starts };
}

type ActivePlayback =
  | {
      kind: "audio";
      audio: HTMLAudioElement;
      source?: MediaElementAudioSourceNode;
      fx?: FxNode;
      onEnd?: () => void;
    }
  | {
      kind: "speech";
      utterance: SpeechSynthesisUtterance;
      onEnd?: () => void;
    };

type BrowserAudioContext = AudioContext & {
  createGain(): GainNode;
  createOscillator(): OscillatorNode;
  createBiquadFilter(): BiquadFilterNode;
  createWaveShaper(): WaveShaperNode;
  createDelay(maxDelay?: number): DelayNode;
  createConvolver(): ConvolverNode;
  createMediaElementSource(element: HTMLMediaElement): MediaElementAudioSourceNode;
};

class BrowserVoiceSystem {
  private settings = defaultVoiceSettings;
  private clipManifest: VoiceClipManifest = {};
  private context?: BrowserAudioContext;
  private voiceGain?: GainNode;
  private sourceCache = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>();
  private active?: ActivePlayback;

  get debugState() {
    const synthesis = hasSpeechApi() ? window.speechSynthesis : undefined;
    let speaking = false;
    let paused = false;
    if (this.active?.kind === "audio") {
      speaking = !this.active.audio.paused;
      paused = this.active.audio.paused;
    } else if (this.active?.kind === "speech") {
      speaking = synthesis?.speaking ?? false;
      paused = synthesis?.paused ?? false;
    } else if (synthesis) {
      speaking = synthesis.speaking;
      paused = synthesis.paused;
    }
    return {
      supported: hasSpeechApi() || hasAudioContextApi(),
      audioReady: !!this.context,
      speaking,
      paused,
      muted: this.settings.muted,
      voiceVolume: this.settings.voiceVolume,
      clipCount: Object.keys(this.clipManifest).length
    };
  }

  setVoiceClipManifest(manifest: VoiceClipManifest | undefined) {
    this.clipManifest = manifest ? { ...manifest } : {};
  }

  applySettings(settings: AudioSettings) {
    this.settings = settings;
    if (settings.muted) {
      this.cancel();
      return;
    }
    const volume = effectiveVolume(settings);
    if (this.voiceGain && this.context) {
      this.voiceGain.gain.setTargetAtTime(volume, this.context.currentTime, 0.04);
    }
    if (this.active?.kind === "speech") {
      this.active.utterance.volume = volume;
    } else if (this.active?.kind === "audio") {
      this.active.audio.volume = volume;
    }
  }

  speak(text: string, profileId: VoiceProfileId = DEFAULT_VOICE_PROFILE_ID, options: VoiceOptions = {}): boolean {
    const profile = voiceProfiles[profileId] ?? voiceProfiles[DEFAULT_VOICE_PROFILE_ID];
    const locale = options.locale ?? DEFAULT_LOCALE;
    const normalized = prepareCommsSpeechText(text);
    if (!normalized || this.settings.muted || effectiveVolume(this.settings) <= 0) return false;
    this.cancel();
    const key = voiceClipKey(profileId, locale, normalized);
    const url = this.clipManifest[key];
    if (url && this.tryPlayAudioClip(url, profile.fx, options)) return true;
    return this.playSpeechFallback(normalized, profile, locale, options);
  }

  pauseOrResume(): "paused" | "speaking" | "idle" {
    if (this.active?.kind === "audio") {
      const audio = this.active.audio;
      if (audio.paused) {
        const playback = audio.play();
        if (playback && typeof playback.then === "function") void playback.catch(() => undefined);
        return "speaking";
      }
      audio.pause();
      return "paused";
    }
    if (!hasSpeechApi()) return "idle";
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      return "speaking";
    }
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      return "paused";
    }
    return "idle";
  }

  cancel() {
    const previous = this.active;
    this.active = undefined;
    if (previous?.kind === "audio") {
      try {
        previous.audio.pause();
      } catch {
        // Audio element is allowed to throw if it's already detached.
      }
      try {
        previous.audio.currentTime = 0;
      } catch {
        // Some embedded audio elements forbid currentTime writes pre-metadata.
      }
      previous.fx?.starts.forEach((entry) => {
        try {
          entry.stop();
        } catch {
          // Oscillator stop is safe to ignore when it never started.
        }
      });
      try {
        previous.source?.disconnect();
      } catch {
        // Already disconnected sources can throw.
      }
      try {
        previous.fx?.output.disconnect();
      } catch {
        // Best-effort node teardown.
      }
    }
    if (hasSpeechApi()) {
      window.speechSynthesis.cancel();
    }
  }

  private ensureContext(): BrowserAudioContext | undefined {
    if (this.context) return this.context;
    if (typeof window === "undefined") return undefined;
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextClass) return undefined;
    const ctx = new AudioContextClass() as BrowserAudioContext;
    const voiceGain = ctx.createGain();
    voiceGain.gain.value = effectiveVolume(this.settings);
    voiceGain.connect(ctx.destination);
    this.context = ctx;
    this.voiceGain = voiceGain;
    return ctx;
  }

  private tryPlayAudioClip(url: string, fxPreset: VoiceFxPreset, options: VoiceOptions): boolean {
    if (typeof Audio === "undefined") return false;
    const ctx = this.ensureContext();
    if (!ctx || !this.voiceGain) return false;
    let audio: HTMLAudioElement;
    try {
      audio = new Audio(url);
    } catch {
      return false;
    }
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";
    audio.volume = 1;

    let source: MediaElementAudioSourceNode | undefined;
    try {
      source = this.sourceCache.get(audio);
      if (!source) {
        source = ctx.createMediaElementSource(audio);
        this.sourceCache.set(audio, source);
      }
    } catch {
      return false;
    }

    let fx: FxNode;
    try {
      fx = createFxNode(ctx, fxPreset);
    } catch {
      try {
        source.connect(this.voiceGain);
      } catch {
        return false;
      }
      this.attachPlayback({ kind: "audio", audio, source, onEnd: options.onEnd });
      return this.startAudioPlayback();
    }

    try {
      source.connect(fx.input);
      fx.output.connect(this.voiceGain);
    } catch {
      return false;
    }
    fx.starts.forEach((entry) => {
      try {
        entry.start();
      } catch {
        // Oscillators rejecting a second start are safe to ignore.
      }
    });

    this.attachPlayback({ kind: "audio", audio, source, fx, onEnd: options.onEnd });
    return this.startAudioPlayback();
  }

  private startAudioPlayback(): boolean {
    if (this.active?.kind !== "audio") return false;
    const playback = this.active.audio.play();
    if (playback && typeof playback.then === "function") {
      void playback.catch(() => this.handleAudioFailure());
    }
    return true;
  }

  private handleAudioFailure() {
    if (this.active?.kind !== "audio") return;
    const previous = this.active;
    this.active = undefined;
    try {
      previous.source?.disconnect();
    } catch {
      // Already disconnected, ignore.
    }
    try {
      previous.fx?.output.disconnect();
    } catch {
      // Best-effort teardown.
    }
  }

  private attachPlayback(playback: ActivePlayback) {
    this.active = playback;
    if (playback.kind === "audio") {
      const audio = playback.audio;
      audio.onended = () => {
        if (this.active !== playback) return;
        this.active = undefined;
        playback.onEnd?.();
      };
      audio.onerror = () => {
        if (this.active !== playback) return;
        this.handleAudioFailure();
      };
    } else {
      const utterance = playback.utterance;
      utterance.onend = () => {
        if (this.active !== playback) return;
        this.active = undefined;
        playback.onEnd?.();
      };
      utterance.onerror = () => {
        if (this.active === playback) this.active = undefined;
      };
    }
  }

  private playSpeechFallback(normalized: string, profile: VoiceProfileDefinition, locale: Locale, options: VoiceOptions): boolean {
    const volume = effectiveVolume(this.settings);
    if (!hasSpeechApi() || volume <= 0) return false;
    const utterance = new SpeechSynthesisUtterance(normalized);
    const params = fallbackVoiceParams(profile.fallback);
    utterance.lang = speechLangForLocale(locale);
    utterance.pitch = params.pitch;
    utterance.rate = params.rate;
    utterance.volume = volume;
    utterance.voice = selectFallbackVoice(locale);
    this.attachPlayback({ kind: "speech", utterance, onEnd: options.onEnd });
    window.speechSynthesis.speak(utterance);
    return true;
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export const voiceSystem = new BrowserVoiceSystem();
