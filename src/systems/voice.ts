import type { AudioSettings } from "../types/game";
import { DEFAULT_LOCALE, speechLangForLocale, type Locale } from "../i18n";

const defaultVoiceSettings: AudioSettings = {
  masterVolume: 0.8,
  sfxVolume: 0.75,
  musicVolume: 0.35,
  voiceVolume: 0.85,
  muted: false
};

type VoiceProfileDefinition = {
  hint: VoiceHint;
};
type VoiceOptions = {
  locale?: Locale;
  onEnd?: () => void;
};

const VOICE_VOLUME_BOOST = 1.35;
const DEFAULT_VOICE_PROFILE_ID = "helion-handler";

type VoiceHint = "calm" | "firm" | "rough" | "bright" | "synthetic";

export const voiceProfiles = {
  captain: { hint: "firm" },
  "ship-ai": { hint: "synthetic" },
  "helion-handler": { hint: "firm" },
  "mirr-analyst": { hint: "calm" },
  "kuro-foreman": { hint: "rough" },
  "vantara-officer": { hint: "firm" },
  "ashen-broker": { hint: "rough" },
  "celest-archivist": { hint: "bright" },
  "union-witness": { hint: "rough" }
} as const satisfies Record<string, VoiceProfileDefinition>;

export type VoiceProfileId = keyof typeof voiceProfiles;

function effectiveVolume(settings: AudioSettings): number {
  return settings.muted ? 0 : Math.max(0, Math.min(1, settings.masterVolume * settings.voiceVolume * VOICE_VOLUME_BOOST));
}

function hasSpeechApi(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

function voiceParams(hint: VoiceHint): Pick<SpeechSynthesisUtterance, "pitch" | "rate"> {
  if (hint === "calm") return { pitch: 0.95, rate: 0.92 };
  if (hint === "rough") return { pitch: 0.82, rate: 0.94 };
  if (hint === "bright") return { pitch: 1.08, rate: 0.98 };
  if (hint === "synthetic") return { pitch: 0.88, rate: 0.86 };
  return { pitch: 1, rate: 0.96 };
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

function selectVoice(locale: Locale): SpeechSynthesisVoice | null {
  const langPrefix = speechLangForLocale(locale).split("-")[0].toLowerCase();
  const voices = window.speechSynthesis.getVoices();
  const localeVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith(langPrefix));
  const englishVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
  return firstStandardVoice(localeVoices) ?? firstStandardVoice(englishVoices) ?? null;
}

export function prepareCommsSpeechText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

class BrowserVoiceSystem {
  private settings = defaultVoiceSettings;
  private current?: SpeechSynthesisUtterance;

  get debugState() {
    const synthesis = hasSpeechApi() ? window.speechSynthesis : undefined;
    return {
      supported: hasSpeechApi(),
      speaking: synthesis?.speaking ?? false,
      paused: synthesis?.paused ?? false,
      muted: this.settings.muted,
      voiceVolume: this.settings.voiceVolume
    };
  }

  applySettings(settings: AudioSettings) {
    this.settings = settings;
    if (settings.muted) {
      this.cancel();
    } else if (this.current) {
      this.current.volume = effectiveVolume(settings);
    }
  }

  speak(text: string, profileId: VoiceProfileId = DEFAULT_VOICE_PROFILE_ID, options: VoiceOptions = {}): boolean {
    const profile: VoiceProfileDefinition = voiceProfiles[profileId] ?? voiceProfiles[DEFAULT_VOICE_PROFILE_ID];
    const volume = effectiveVolume(this.settings);
    if (!hasSpeechApi() || !text.trim() || this.settings.muted || volume <= 0) return false;
    this.cancel();
    const utterance = new SpeechSynthesisUtterance(prepareCommsSpeechText(text));
    const locale = options.locale ?? DEFAULT_LOCALE;
    const params = voiceParams(profile.hint);
    utterance.lang = speechLangForLocale(locale);
    utterance.pitch = params.pitch;
    utterance.rate = params.rate;
    utterance.volume = volume;
    utterance.voice = selectVoice(locale);
    utterance.onend = () => {
      if (this.current !== utterance) return;
      this.current = undefined;
      options.onEnd?.();
    };
    utterance.onerror = () => {
      if (this.current === utterance) this.current = undefined;
    };
    this.current = utterance;
    window.speechSynthesis.speak(utterance);
    return true;
  }

  pauseOrResume(): "paused" | "speaking" | "idle" {
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
    if (!hasSpeechApi()) return;
    window.speechSynthesis.cancel();
    this.current = undefined;
  }
}

export const voiceSystem = new BrowserVoiceSystem();
