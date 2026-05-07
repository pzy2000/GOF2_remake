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
    pitch: 1.24,
    rate: 1.04,
    preferredVoiceNames: ["Aria", "Jenny", "Samantha", "Tessa", "Victoria", "Zira", "Karen", "Moira"],
    preferredVoiceKeywords: ["female"]
  },
  "ship-ai": {
    pitch: 0.76,
    rate: 0.84,
    volumeScale: 0.92,
    preferredVoiceNames: ["Google US English", "Microsoft David", "Daniel", "Alex", "Fred"],
    preferredVoiceKeywords: ["male", "standard", "enhanced"]
  },
  "helion-handler": {
    pitch: 0.98,
    rate: 0.94,
    preferredVoiceNames: ["Samantha", "Karen", "Moira", "Google UK English Female"],
    preferredVoiceKeywords: ["female"]
  },
  "mirr-analyst": {
    pitch: 0.92,
    rate: 0.9,
    preferredVoiceNames: ["Serena", "Tessa", "Google UK English Female", "Moira"],
    preferredVoiceKeywords: ["female"]
  },
  "kuro-foreman": {
    pitch: 0.78,
    rate: 0.91,
    volumeScale: 1.04,
    preferredVoiceNames: ["Daniel", "Google UK English Male", "Microsoft David", "Alex"],
    preferredVoiceKeywords: ["male"]
  },
  "vantara-officer": {
    pitch: 0.88,
    rate: 0.96,
    preferredVoiceNames: ["Microsoft David", "Daniel", "Google UK English Male", "Alex"],
    preferredVoiceKeywords: ["male"]
  },
  "ashen-broker": {
    pitch: 0.84,
    rate: 0.88,
    volumeScale: 0.96,
    preferredVoiceNames: ["Fred", "Ralph", "Daniel", "Microsoft David"],
    preferredVoiceKeywords: ["male"]
  },
  "celest-archivist": {
    pitch: 1.14,
    rate: 0.95,
    preferredVoiceNames: ["Victoria", "Tessa", "Serena", "Google UK English Female"],
    preferredVoiceKeywords: ["female"]
  },
  "union-witness": {
    pitch: 0.86,
    rate: 0.92,
    volumeScale: 1.02,
    preferredVoiceNames: ["Moira", "Karen", "Samantha", "Google UK English Female"],
    preferredVoiceKeywords: ["female"]
  }
} as const satisfies Record<string, VoiceProfileDefinition>;

export type VoiceProfileId = keyof typeof voiceProfiles;

function effectiveVolume(settings: AudioSettings, volumeScale = 1): number {
  return settings.muted ? 0 : Math.max(0, Math.min(1, settings.masterVolume * settings.voiceVolume * VOICE_VOLUME_BOOST * volumeScale));
}

function hasSpeechApi(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

function selectVoice(profile: VoiceProfileDefinition, locale: Locale): SpeechSynthesisVoice | null {
  const langPrefix = speechLangForLocale(locale).split("-")[0].toLowerCase();
  const voices = window.speechSynthesis.getVoices();
  const localeVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith(langPrefix));
  const englishVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
  const matchesProfile = (voice: SpeechSynthesisVoice) => {
    const searchable = `${voice.name} ${voice.voiceURI}`.toLowerCase();
    return (
      profile.preferredVoiceNames?.some((name) => searchable.includes(name.toLowerCase())) ||
      profile.preferredVoiceKeywords?.some((keyword) => searchable.includes(keyword.toLowerCase()))
    );
  };
  return localeVoices.find(matchesProfile) ?? localeVoices[0] ?? englishVoices.find(matchesProfile) ?? englishVoices[0] ?? null;
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
    const utterance = new SpeechSynthesisUtterance(text);
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
