import type { AudioSettings } from "../types/game";

const defaultVoiceSettings: AudioSettings = {
  masterVolume: 0.8,
  sfxVolume: 0.75,
  musicVolume: 0.35,
  voiceVolume: 0.85,
  muted: false
};

type VoiceHint = "calm" | "firm" | "rough" | "bright" | "synthetic";
type VoiceOptions = {
  onEnd?: () => void;
};

const VOICE_VOLUME_BOOST = 1.35;

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

  speak(text: string, hint: VoiceHint = "firm", options: VoiceOptions = {}): boolean {
    if (!hasSpeechApi() || !text.trim() || this.settings.muted || effectiveVolume(this.settings) <= 0) return false;
    this.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const params = voiceParams(hint);
    utterance.lang = "en-US";
    utterance.pitch = params.pitch;
    utterance.rate = params.rate;
    utterance.volume = effectiveVolume(this.settings);
    utterance.voice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith("en")) ?? null;
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
