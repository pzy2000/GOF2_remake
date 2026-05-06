import type { AudioEventName, AudioSettings, MusicMode } from "../types/game";

export const AUDIO_SETTINGS_KEY = "gof2-by-pzy-audio-settings";

const defaultSettings: AudioSettings = {
  masterVolume: 0.8,
  sfxVolume: 0.75,
  musicVolume: 0.35,
  muted: false
};

type BrowserAudioContext = AudioContext & {
  createGain(): GainNode;
  createOscillator(): OscillatorNode;
  createBiquadFilter(): BiquadFilterNode;
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function storage(): Storage | undefined {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}

export function getAudioSettings(): AudioSettings {
  const raw = storage()?.getItem(AUDIO_SETTINGS_KEY);
  if (!raw) return defaultSettings;
  try {
    const parsed = JSON.parse(raw) as Partial<AudioSettings>;
    return {
      masterVolume: clamp01(parsed.masterVolume ?? defaultSettings.masterVolume),
      sfxVolume: clamp01(parsed.sfxVolume ?? defaultSettings.sfxVolume),
      musicVolume: clamp01(parsed.musicVolume ?? defaultSettings.musicVolume),
      muted: parsed.muted ?? defaultSettings.muted
    };
  } catch {
    return defaultSettings;
  }
}

export function saveAudioSettings(settings: AudioSettings): AudioSettings {
  const next = {
    masterVolume: clamp01(settings.masterVolume),
    sfxVolume: clamp01(settings.sfxVolume),
    musicVolume: clamp01(settings.musicVolume),
    muted: settings.muted
  };
  storage()?.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(next));
  audioSystem.applySettings(next);
  return next;
}

class ProceduralAudioSystem {
  private context?: BrowserAudioContext;
  private masterGain?: GainNode;
  private sfxGain?: GainNode;
  private musicGain?: GainNode;
  private musicOscillators: OscillatorNode[] = [];
  private modeGains = new Map<MusicMode, GainNode>();
  private lastEventAt = new Map<AudioEventName, number>();
  private settings = defaultSettings;
  private mode: MusicMode = "silent";
  private unlocked = false;

  constructor() {
    this.settings = getAudioSettings();
  }

  get debugState() {
    return {
      hasContext: !!this.context,
      unlocked: this.unlocked,
      mode: this.mode,
      settings: this.settings
    };
  }

  applySettings(settings: AudioSettings) {
    this.settings = settings;
    const master = settings.muted ? 0 : settings.masterVolume;
    this.masterGain?.gain.setTargetAtTime(master, this.context?.currentTime ?? 0, 0.025);
    this.sfxGain?.gain.setTargetAtTime(settings.sfxVolume, this.context?.currentTime ?? 0, 0.025);
    this.musicGain?.gain.setTargetAtTime(settings.musicVolume, this.context?.currentTime ?? 0, 0.08);
  }

  unlock() {
    const context = this.ensureContext();
    if (!context) return false;
    void context.resume?.();
    this.unlocked = true;
    this.startMusicGraph();
    this.applySettings(this.settings);
    return true;
  }

  play(event: AudioEventName) {
    const context = this.ensureContext();
    if (!context || this.settings.muted) return;
    const now = context.currentTime;
    const minimumGap = event === "mining" ? 0.11 : event === "low-hull" ? 1.6 : event === "shield-break" ? 0.7 : 0.025;
    if (now - (this.lastEventAt.get(event) ?? -999) < minimumGap) return;
    this.lastEventAt.set(event, now);
    if (!this.unlocked) return;

    if (event === "laser") this.zap(680, 1160, 0.09, "#laser");
    if (event === "missile") this.noiseSweep(92, 220, 0.36, 0.32);
    if (event === "explosion") this.noiseSweep(66, 26, 0.58, 0.48);
    if (event === "mining") this.zap(260, 330, 0.12, "#mining", 0.16);
    if (event === "loot") this.arpeggio([620, 780, 980], 0.18, 0.16);
    if (event === "dock") this.arpeggio([220, 330, 440], 0.42, 0.18);
    if (event === "undock") this.arpeggio([440, 330, 240], 0.34, 0.14);
    if (event === "jump-gate") this.zap(120, 760, 0.8, "#gate", 0.22);
    if (event === "wormhole") this.noiseSweep(180, 540, 1.2, 0.26);
    if (event === "mission-complete") this.arpeggio([392, 523, 659, 784], 0.52, 0.2);
    if (event === "mission-fail") this.arpeggio([330, 247, 196], 0.6, 0.2);
    if (event === "low-hull") this.zap(220, 145, 0.38, "#warning", 0.26);
    if (event === "shield-break") this.noiseSweep(720, 120, 0.42, 0.25);
    if (event === "ui-click") this.zap(540, 660, 0.035, "#ui", 0.06);
  }

  setMusicMode(mode: MusicMode) {
    this.mode = mode;
    const context = this.ensureContext();
    if (!context || !this.unlocked) return;
    this.startMusicGraph();
    for (const [candidate, gain] of this.modeGains) {
      const target = candidate === mode && mode !== "silent" ? 1 : 0;
      gain.gain.setTargetAtTime(target, context.currentTime, 0.55);
    }
  }

  private ensureContext(): BrowserAudioContext | undefined {
    if (this.context) return this.context;
    if (typeof window === "undefined") return undefined;
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextClass) return undefined;
    const context = new AudioContextClass() as BrowserAudioContext;
    const masterGain = context.createGain();
    const sfxGain = context.createGain();
    const musicGain = context.createGain();
    sfxGain.connect(masterGain);
    musicGain.connect(masterGain);
    masterGain.connect(context.destination);
    this.context = context;
    this.masterGain = masterGain;
    this.sfxGain = sfxGain;
    this.musicGain = musicGain;
    this.applySettings(this.settings);
    return context;
  }

  private zap(startHz: number, endHz: number, duration: number, _label: string, gainAmount = 0.2) {
    const context = this.context;
    if (!context || !this.sfxGain) return;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(startHz, context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, endHz), context.currentTime + duration);
    gain.gain.setValueAtTime(gainAmount, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(context.currentTime + duration + 0.02);
  }

  private noiseSweep(startHz: number, endHz: number, duration: number, gainAmount: number) {
    const context = this.context;
    if (!context || !this.sfxGain) return;
    const osc = context.createOscillator();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(startHz, context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, endHz), context.currentTime + duration);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(Math.max(startHz, endHz) * 4, context.currentTime);
    filter.frequency.exponentialRampToValueAtTime(Math.max(80, Math.min(startHz, endHz)), context.currentTime + duration);
    gain.gain.setValueAtTime(gainAmount, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(context.currentTime + duration + 0.02);
  }

  private arpeggio(notes: number[], duration: number, gainAmount: number) {
    const context = this.context;
    const sfxGain = this.sfxGain;
    if (!context || !sfxGain) return;
    const step = duration / notes.length;
    notes.forEach((note, index) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + index * step;
      osc.type = "sine";
      osc.frequency.setValueAtTime(note, start);
      gain.gain.setValueAtTime(gainAmount, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + step * 1.4);
      osc.connect(gain);
      gain.connect(sfxGain);
      osc.start(start);
      osc.stop(start + step * 1.5);
    });
  }

  private startMusicGraph() {
    const context = this.context;
    if (!context || !this.musicGain || this.musicOscillators.length > 0) return;
    const modes: Array<{ mode: MusicMode; notes: number[]; type: OscillatorType }> = [
      { mode: "safe", notes: [110, 165, 220], type: "sine" },
      { mode: "combat", notes: [82, 123, 164], type: "sawtooth" },
      { mode: "station", notes: [98, 147, 196], type: "triangle" }
    ];
    for (const layer of modes) {
      const modeGain = context.createGain();
      modeGain.gain.value = 0;
      modeGain.connect(this.musicGain);
      this.modeGains.set(layer.mode, modeGain);
      layer.notes.forEach((note, index) => {
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = layer.type;
        osc.frequency.value = note * (1 + index * 0.002);
        gain.gain.value = layer.mode === "combat" ? 0.025 : 0.018;
        osc.connect(gain);
        gain.connect(modeGain);
        osc.start();
        this.musicOscillators.push(osc);
      });
    }
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export const audioSystem = new ProceduralAudioSystem();
