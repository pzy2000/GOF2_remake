import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { dialogueSceneById, dialogueSpeakerById } from "../data/world";
import { getFactionIcon } from "../data/iconAtlas";
import { useGameStore } from "../state/gameStore";
import {
  localizeDialogueGroupLabel,
  localizeDialogueLineText,
  localizeDialogueSceneTitle,
  localizeDialogueSpeakerName,
  localizeDialogueSpeakerRole
} from "../systems/dialogueLocalization";
import { audioSystem } from "../systems/audio";
import { voiceSystem } from "../systems/voice";
import { AtlasIcon } from "./AtlasIcon";
import type { ActiveDialogueState, AssetManifest, Screen } from "../types/game";
import { formatNumber, translateText } from "../i18n";

const AUTOPLAY_WATCHDOG_MS = 900;
const DIALOGUE_FALLBACK_MIN_MS = 2200;
const DIALOGUE_FALLBACK_MAX_MS = 6800;

export function isFlightCommsDialogue(screen: Screen, activeDialogue?: ActiveDialogueState): boolean {
  return screen === "flight" && !!activeDialogue && !activeDialogue.replay;
}

export function getDialogueFallbackDurationMs(text: string): number {
  const characterCount = Array.from(text.trim()).length;
  return Math.min(DIALOGUE_FALLBACK_MAX_MS, Math.max(DIALOGUE_FALLBACK_MIN_MS, 1400 + characterCount * 34));
}

function SpeakerBadge({ manifest, speakerId }: { manifest: AssetManifest; speakerId: string }) {
  const badgeSpeaker = dialogueSpeakerById[speakerId];
  const portrait = manifest.speakerPortraits[speakerId];
  const [portraitFailed, setPortraitFailed] = useState(false);
  useEffect(() => setPortraitFailed(false), [portrait, speakerId]);
  if (portrait && !portraitFailed) {
    const portraitStyle = {
      borderColor: badgeSpeaker?.color,
      boxShadow: badgeSpeaker?.color ? `0 0 18px ${badgeSpeaker.color}44` : undefined
    };
    return (
      <div className="dialogue-badge dialogue-badge-portrait" style={portraitStyle}>
        <img
          src={portrait}
          alt={`${badgeSpeaker?.name ?? speakerId} portrait`}
          data-testid={`speaker-portrait-${speakerId}`}
          onError={() => setPortraitFailed(true)}
        />
      </div>
    );
  }
  if (badgeSpeaker?.factionId) {
    return (
      <div className="dialogue-badge" style={{ borderColor: badgeSpeaker.color }}>
        <AtlasIcon icon={getFactionIcon(badgeSpeaker.factionId)} manifest={manifest} size={66} showTitle={false} />
      </div>
    );
  }
  return (
    <div className="dialogue-badge dialogue-badge-text" style={{ borderColor: badgeSpeaker?.color }}>
      {badgeSpeaker?.kind === "ai" ? "AI" : "PC"}
    </div>
  );
}

export function DialogueOverlay() {
  const activeDialogue = useGameStore((state) => state.activeDialogue);
  const screen = useGameStore((state) => state.screen);
  const manifest = useGameStore((state) => state.assetManifest);
  const locale = useGameStore((state) => state.locale);
  const advanceDialogue = useGameStore((state) => state.advanceDialogue);
  const rewindDialogue = useGameStore((state) => state.rewindDialogue);
  const closeDialogue = useGameStore((state) => state.closeDialogue);
  const [voiceStatus, setVoiceStatus] = useState(voiceSystem.debugState);
  const [manualPlayRequired, setManualPlayRequired] = useState(false);
  const playbackTokenRef = useRef(0);
  const manualWatchdogRef = useRef<number | undefined>(undefined);
  const fallbackAdvanceRef = useRef<number | undefined>(undefined);
  const scene = activeDialogue ? dialogueSceneById[activeDialogue.sceneId] : undefined;
  const line = scene ? scene.lines[activeDialogue?.lineIndex ?? 0] : undefined;
  const speaker = line ? dialogueSpeakerById[line.speakerId] : undefined;
  const transcript = useMemo(() => scene?.lines.slice(0, (activeDialogue?.lineIndex ?? 0) + 1) ?? [], [activeDialogue?.lineIndex, scene]);
  const localizedLineText = line ? localizeDialogueLineText(line, locale) : "";
  const useSpaceComms = isFlightCommsDialogue(screen, activeDialogue);

  const clearManualWatchdog = useCallback(() => {
    if (manualWatchdogRef.current === undefined) return;
    window.clearTimeout(manualWatchdogRef.current);
    manualWatchdogRef.current = undefined;
  }, []);

  const clearFallbackAdvance = useCallback(() => {
    if (fallbackAdvanceRef.current === undefined) return;
    window.clearTimeout(fallbackAdvanceRef.current);
    fallbackAdvanceRef.current = undefined;
  }, []);

  const invalidateVoice = useCallback(() => {
    clearManualWatchdog();
    clearFallbackAdvance();
    playbackTokenRef.current += 1;
    voiceSystem.cancel();
  }, [clearFallbackAdvance, clearManualWatchdog]);

  const scheduleFallbackAdvance = useCallback((token: number) => {
    clearFallbackAdvance();
    fallbackAdvanceRef.current = window.setTimeout(() => {
      if (playbackTokenRef.current !== token) return;
      clearFallbackAdvance();
      setManualPlayRequired(false);
      setVoiceStatus(voiceSystem.debugState);
      advanceDialogue();
    }, getDialogueFallbackDurationMs(localizedLineText));
  }, [advanceDialogue, clearFallbackAdvance, localizedLineText]);

  const startLineVoice = useCallback((options: { advanceOnEnd: boolean; showManualOnFailure: boolean; fallbackOnFailure?: boolean }) => {
    if (!line || !speaker) return false;
    clearManualWatchdog();
    clearFallbackAdvance();
    const token = playbackTokenRef.current + 1;
    playbackTokenRef.current = token;
    setManualPlayRequired(false);
    audioSystem.play("comms-open");

    const markStarted = () => {
      if (playbackTokenRef.current !== token) return;
      clearManualWatchdog();
      clearFallbackAdvance();
      setManualPlayRequired(false);
      setVoiceStatus(voiceSystem.debugState);
    };
    const markFailure = () => {
      if (playbackTokenRef.current !== token) return;
      clearManualWatchdog();
      const status = voiceSystem.debugState;
      setVoiceStatus(status);
      if (options.fallbackOnFailure) {
        setManualPlayRequired(false);
        scheduleFallbackAdvance(token);
        return;
      }
      if (options.showManualOnFailure && status.supported && !status.muted && status.voiceVolume > 0) {
        setManualPlayRequired(true);
      }
    };

    const started = voiceSystem.speak(localizedLineText, speaker.voiceProfile, {
      locale,
      onStart: markStarted,
      onEnd: options.advanceOnEnd
        ? () => {
            if (playbackTokenRef.current !== token) return;
            clearManualWatchdog();
            clearFallbackAdvance();
            setManualPlayRequired(false);
            setVoiceStatus(voiceSystem.debugState);
            advanceDialogue();
          }
        : undefined,
      onError: markFailure
    });
    setVoiceStatus(voiceSystem.debugState);
    if (!started) {
      markFailure();
      return false;
    }

    if (options.showManualOnFailure || options.fallbackOnFailure) {
      manualWatchdogRef.current = window.setTimeout(() => {
        const status = voiceSystem.debugState;
        if (playbackTokenRef.current === token && !status.speaking && !status.paused) {
          markFailure();
        }
      }, AUTOPLAY_WATCHDOG_MS);
    }
    return true;
  }, [advanceDialogue, clearFallbackAdvance, clearManualWatchdog, line, locale, localizedLineText, scheduleFallbackAdvance, speaker]);

  useEffect(() => {
    if (!line || !speaker) return undefined;
    startLineVoice({ advanceOnEnd: true, showManualOnFailure: !useSpaceComms, fallbackOnFailure: useSpaceComms });
    return () => {
      clearManualWatchdog();
      clearFallbackAdvance();
      playbackTokenRef.current += 1;
      voiceSystem.cancel();
    };
  }, [clearFallbackAdvance, clearManualWatchdog, line, speaker, startLineVoice, useSpaceComms]);

  if (!activeDialogue || !scene || !line || !speaker) return null;

  function close() {
    invalidateVoice();
    setVoiceStatus(voiceSystem.debugState);
    setManualPlayRequired(false);
    closeDialogue();
  }

  function next() {
    invalidateVoice();
    setVoiceStatus(voiceSystem.debugState);
    setManualPlayRequired(false);
    advanceDialogue();
  }

  function back() {
    if (!activeDialogue || activeDialogue.lineIndex <= 0) return;
    invalidateVoice();
    setVoiceStatus(voiceSystem.debugState);
    setManualPlayRequired(false);
    rewindDialogue();
  }

  function playPause() {
    if (manualPlayRequired) {
      startLineVoice({ advanceOnEnd: true, showManualOnFailure: true });
      return;
    }
    const state = voiceSystem.pauseOrResume();
    if (state === "idle" && line && speaker) {
      startLineVoice({ advanceOnEnd: true, showManualOnFailure: true });
      return;
    }
    setVoiceStatus(voiceSystem.debugState);
  }

  function replayVoice() {
    if (!line || !speaker) return;
    startLineVoice({ advanceOnEnd: false, showManualOnFailure: false });
    setVoiceStatus(voiceSystem.debugState);
  }

  const isPlayer = speaker.kind === "player";
  const currentIndex = activeDialogue.lineIndex;
  const atEnd = currentIndex >= scene.lines.length - 1;
  const canGoBack = currentIndex > 0;
  const sceneTitle = localizeDialogueSceneTitle(scene, locale);
  const groupLabel = localizeDialogueGroupLabel(scene.group, locale);
  const speakerName = localizeDialogueSpeakerName(speaker, locale);
  const speakerRole = localizeDialogueSpeakerRole(speaker, locale);
  const cinematicUrl = scene.cinematicAssetKey ? manifest.storyCinematics[scene.cinematicAssetKey] : undefined;
  const voiceStatusLabel = manualPlayRequired
    ? "Voice needs manual play"
    : voiceStatus.supported
      ? voiceStatus.paused
        ? "Voice paused"
        : voiceStatus.speaking
          ? "Voice playing"
          : "Voice ready"
      : "Voice unavailable";
  const dialogueBackLabel = locale === "en" ? "Back" : translateText("Dialogue Back", locale);
  if (useSpaceComms) {
    const progress = scene.lines.length > 0 ? ((currentIndex + 1) / scene.lines.length) * 100 : 0;
    return (
      <section
        className={`space-dialogue-overlay ${isPlayer ? "player-line" : ""}`}
        role="status"
        aria-live="polite"
        aria-label={`${translateText("Comms", locale)}: ${sceneTitle}`}
        data-testid="space-dialogue-overlay"
      >
        <div className="space-dialogue-card" style={{ borderColor: speaker.color }}>
          <SpeakerBadge manifest={manifest} speakerId={speaker.id} />
          <div className="space-dialogue-body">
            <div className="space-dialogue-meta">
              <span>{groupLabel}</span>
              <span>{formatNumber(locale, currentIndex + 1)}/{formatNumber(locale, scene.lines.length)}</span>
            </div>
            <div className="space-dialogue-speaker">
              <b>{speakerName}</b>
              <span>{speakerRole}</span>
            </div>
            <p>{localizedLineText}</p>
            <div className="space-dialogue-progress" aria-hidden="true">
              <i style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className="dialogue-backdrop" role="dialog" aria-modal="true" aria-label={`${translateText("Comms", locale)}: ${sceneTitle}`} data-testid="dialogue-overlay">
      <div className="dialogue-panel">
        <header className="dialogue-header">
          <div>
            <p className="eyebrow">{groupLabel}</p>
            <h2>{sceneTitle}</h2>
          </div>
          <button className="dialogue-close" onClick={close} aria-label={translateText("Close dialogue", locale)}>X</button>
        </header>
        {cinematicUrl ? (
          <div className="dialogue-cinematic">
            <img src={cinematicUrl} alt="" data-testid={`dialogue-cinematic-${scene.cinematicAssetKey}`} />
          </div>
        ) : null}
        <div className={`dialogue-current ${isPlayer ? "player-line" : ""}`}>
          <SpeakerBadge manifest={manifest} speakerId={speaker.id} />
          <div>
            <span>{speakerName} · {speakerRole}</span>
            <p>{localizedLineText}</p>
          </div>
        </div>
        <div className="dialogue-transcript" aria-label={translateText("Dialogue transcript", locale)}>
          {transcript.map((item, index) => {
            const itemSpeaker = dialogueSpeakerById[item.speakerId];
            return (
              <p key={`${scene.id}-${index}`} className={index === currentIndex ? "active" : ""}>
                <b>{itemSpeaker ? localizeDialogueSpeakerName(itemSpeaker, locale) : item.speakerId}</b>
                {localizeDialogueLineText(item, locale)}
              </p>
            );
          })}
        </div>
        <footer className="dialogue-actions">
          <span>{translateText(voiceStatusLabel, locale)}</span>
          <button onClick={back} disabled={!canGoBack}>{dialogueBackLabel}</button>
          <button onClick={playPause}>{translateText("Play/Pause", locale)}</button>
          <button onClick={replayVoice}>{translateText("Replay Voice", locale)}</button>
          <button className="primary" onClick={next}>{translateText(atEnd ? "Done" : "Next", locale)}</button>
          <button onClick={close}>{translateText("Skip", locale)}</button>
        </footer>
      </div>
    </section>
  );
}
