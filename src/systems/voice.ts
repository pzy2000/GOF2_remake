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
  pitch: number;
  rate: number;
  volumeScale?: number;
  preferredVoiceNames?: readonly string[];
  preferredVoiceKeywords?: readonly string[];
};
type VoiceOptions = {
  locale?: Locale;
  onEnd?: () => void;
};

const VOICE_VOLUME_BOOST = 1.35;
const DEFAULT_VOICE_PROFILE_ID = "helion-handler";

export const voiceProfiles = {
  captain: {
    pitch: 1.08,
    rate: 0.92,
    preferredVoiceNames: ["Aria", "Jenny", "Samantha", "Tessa", "Victoria", "Ava", "Karen", "Moira"],
    preferredVoiceKeywords: ["female", "natural", "enhanced", "neural"]
  },
  "ship-ai": {
    pitch: 0.9,
    rate: 0.86,
    volumeScale: 0.9,
    preferredVoiceNames: ["Google US English", "Microsoft Guy", "Microsoft David", "Daniel", "Alex"],
    preferredVoiceKeywords: ["male", "natural", "enhanced", "neural", "standard"]
  },
  "helion-handler": {
    pitch: 1.02,
    rate: 0.88,
    preferredVoiceNames: ["Samantha", "Karen", "Moira", "Google UK English Female", "Serena"],
    preferredVoiceKeywords: ["female", "natural", "enhanced", "neural"]
  },
  "mirr-analyst": {
    pitch: 0.96,
    rate: 0.86,
    preferredVoiceNames: ["Serena", "Tessa", "Google UK English Female", "Moira", "Samantha"],
    preferredVoiceKeywords: ["female", "natural", "enhanced", "neural"]
  },
  "kuro-foreman": {
    pitch: 0.88,
    rate: 0.87,
    volumeScale: 1.02,
    preferredVoiceNames: ["Daniel", "Google UK English Male", "Microsoft Guy", "Microsoft David", "Alex"],
    preferredVoiceKeywords: ["male", "natural", "enhanced", "neural"]
  },
  "vantara-officer": {
    pitch: 0.92,
    rate: 0.9,
    preferredVoiceNames: ["Microsoft Guy", "Microsoft David", "Daniel", "Google UK English Male", "Alex"],
    preferredVoiceKeywords: ["male", "natural", "enhanced", "neural"]
  },
  "ashen-broker": {
    pitch: 0.9,
    rate: 0.84,
    volumeScale: 0.96,
    preferredVoiceNames: ["Daniel", "Microsoft Guy", "Microsoft David", "Alex", "Fred"],
    preferredVoiceKeywords: ["male", "natural", "enhanced", "neural"]
  },
  "celest-archivist": {
    pitch: 1.06,
    rate: 0.88,
    preferredVoiceNames: ["Victoria", "Tessa", "Serena", "Google UK English Female", "Samantha"],
    preferredVoiceKeywords: ["female", "natural", "enhanced", "neural"]
  },
  "union-witness": {
    pitch: 0.94,
    rate: 0.86,
    volumeScale: 1.02,
    preferredVoiceNames: ["Moira", "Karen", "Samantha", "Google UK English Female", "Serena"],
    preferredVoiceKeywords: ["female", "natural", "enhanced", "neural"]
  }
} as const satisfies Record<string, VoiceProfileDefinition>;

export type VoiceProfileId = keyof typeof voiceProfiles;

function effectiveVolume(settings: AudioSettings, volumeScale = 1): number {
  return settings.muted ? 0 : Math.max(0, Math.min(1, settings.masterVolume * settings.voiceVolume * VOICE_VOLUME_BOOST * volumeScale));
}

function hasSpeechApi(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

function searchableVoiceName(voice: SpeechSynthesisVoice): string {
  return `${voice.name} ${voice.voiceURI}`.toLowerCase();
}

function voiceScore(voice: SpeechSynthesisVoice, profile: VoiceProfileDefinition, locale: Locale): number {
  const searchable = searchableVoiceName(voice);
  const targetLang = speechLangForLocale(locale).toLowerCase();
  let score = voice.lang.toLowerCase() === targetLang ? 12 : 0;
  if (!voice.default) score += 2;
  profile.preferredVoiceNames?.forEach((name, index) => {
    if (searchable.includes(name.toLowerCase())) score += 80 - index * 3;
  });
  profile.preferredVoiceKeywords?.forEach((keyword) => {
    if (searchable.includes(keyword.toLowerCase())) score += 18;
  });
  if (/\b(enhanced|premium|neural|natural|wavenet|online)\b/.test(searchable)) score += 30;
  if (/\b(compact|basic|default)\b/.test(searchable)) score -= 28;
  if (/\b(siri|novelty|whisper|trinoids|zarvox|bells|boing|bad news|good news)\b/.test(searchable)) score -= 70;
  return score;
}

function bestVoice(voices: SpeechSynthesisVoice[], profile: VoiceProfileDefinition, locale: Locale): SpeechSynthesisVoice | null {
  return voices
    .map((voice, index) => ({ voice, index, score: voiceScore(voice, profile, locale) }))
    .sort((left, right) => right.score - left.score || left.index - right.index)[0]?.voice ?? null;
}

function selectVoice(profile: VoiceProfileDefinition, locale: Locale): SpeechSynthesisVoice | null {
  const langPrefix = speechLangForLocale(locale).split("-")[0].toLowerCase();
  const voices = window.speechSynthesis.getVoices();
  const localeVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith(langPrefix));
  const englishVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
  return bestVoice(localeVoices, profile, locale) ?? bestVoice(englishVoices, profile, locale) ?? null;
}

export function prepareCommsSpeechText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s*([,;:])\s*/g, "$1 ")
    .replace(/\s*([.!?。！？])\s*/g, "$1  ")
    .replace(/\s*[-–—]\s*/g, ", ")
    .replace(/\bAI\b/g, "A I")
    .replace(/\s+$/g, "");
}

class BrowserVoiceSystem {
  private settings = defaultVoiceSettings;
  private current?: SpeechSynthesisUtterance;
  private currentVolumeScale = 1;

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
      this.current.volume = effectiveVolume(settings, this.currentVolumeScale);
    }
  }

  speak(text: string, profileId: VoiceProfileId = DEFAULT_VOICE_PROFILE_ID, options: VoiceOptions = {}): boolean {
    const profile: VoiceProfileDefinition = voiceProfiles[profileId] ?? voiceProfiles[DEFAULT_VOICE_PROFILE_ID];
    const volume = effectiveVolume(this.settings, profile.volumeScale);
    if (!hasSpeechApi() || !text.trim() || this.settings.muted || volume <= 0) return false;
    this.cancel();
    const utterance = new SpeechSynthesisUtterance(prepareCommsSpeechText(text));
    const locale = options.locale ?? DEFAULT_LOCALE;
    utterance.lang = speechLangForLocale(locale);
    utterance.pitch = profile.pitch;
    utterance.rate = profile.rate;
    utterance.volume = volume;
    utterance.voice = selectVoice(profile, locale);
    utterance.onend = () => {
      if (this.current !== utterance) return;
      this.current = undefined;
      options.onEnd?.();
    };
    utterance.onerror = () => {
      if (this.current === utterance) this.current = undefined;
    };
    this.currentVolumeScale = profile.volumeScale ?? 1;
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
