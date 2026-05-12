import { useEffect, useMemo, useState } from "react";
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
import type { AssetManifest } from "../types/game";
import { translateText } from "../i18n";

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
  const manifest = useGameStore((state) => state.assetManifest);
  const locale = useGameStore((state) => state.locale);
  const advanceDialogue = useGameStore((state) => state.advanceDialogue);
  const closeDialogue = useGameStore((state) => state.closeDialogue);
  const [voiceStatus, setVoiceStatus] = useState(voiceSystem.debugState);
  const scene = activeDialogue ? dialogueSceneById[activeDialogue.sceneId] : undefined;
  const line = scene ? scene.lines[activeDialogue?.lineIndex ?? 0] : undefined;
  const speaker = line ? dialogueSpeakerById[line.speakerId] : undefined;
  const transcript = useMemo(() => scene?.lines.slice(0, (activeDialogue?.lineIndex ?? 0) + 1) ?? [], [activeDialogue?.lineIndex, scene]);
  const localizedLineText = line ? localizeDialogueLineText(line, locale) : "";

  useEffect(() => {
    if (!line || !speaker) return undefined;
    audioSystem.play("comms-open");
    voiceSystem.speak(localizeDialogueLineText(line, locale), speaker.voiceProfile, {
      locale,
      onEnd: () => {
        setVoiceStatus(voiceSystem.debugState);
        advanceDialogue();
      }
    });
    setVoiceStatus(voiceSystem.debugState);
    return () => {
      voiceSystem.cancel();
      setVoiceStatus(voiceSystem.debugState);
    };
  }, [advanceDialogue, line, locale, speaker]);

  if (!activeDialogue || !scene || !line || !speaker) return null;

  function close() {
    voiceSystem.cancel();
    setVoiceStatus(voiceSystem.debugState);
    closeDialogue();
  }

  function next() {
    voiceSystem.cancel();
    setVoiceStatus(voiceSystem.debugState);
    advanceDialogue();
  }

  function playPause() {
    const state = voiceSystem.pauseOrResume();
    if (state === "idle" && line && speaker) {
      audioSystem.play("comms-open");
      voiceSystem.speak(localizeDialogueLineText(line, locale), speaker.voiceProfile, { locale });
    }
    setVoiceStatus(voiceSystem.debugState);
  }

  function replayVoice() {
    if (!line || !speaker) return;
    audioSystem.play("comms-open");
    voiceSystem.speak(localizeDialogueLineText(line, locale), speaker.voiceProfile, { locale });
    setVoiceStatus(voiceSystem.debugState);
  }

  const isPlayer = speaker.kind === "player";
  const currentIndex = activeDialogue.lineIndex;
  const atEnd = currentIndex >= scene.lines.length - 1;
  const sceneTitle = localizeDialogueSceneTitle(scene, locale);
  const groupLabel = localizeDialogueGroupLabel(scene.group, locale);
  const speakerName = localizeDialogueSpeakerName(speaker, locale);
  const speakerRole = localizeDialogueSpeakerRole(speaker, locale);
  const cinematicUrl = scene.cinematicAssetKey ? manifest.storyCinematics[scene.cinematicAssetKey] : undefined;
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
          <span>{translateText(voiceStatus.supported ? voiceStatus.paused ? "Voice paused" : voiceStatus.speaking ? "Voice playing" : "Voice ready" : "Voice unavailable", locale)}</span>
          <button onClick={playPause}>{translateText("Play/Pause", locale)}</button>
          <button onClick={replayVoice}>{translateText("Replay Voice", locale)}</button>
          <button className="primary" onClick={next}>{translateText(atEnd ? "Done" : "Next", locale)}</button>
          <button onClick={close}>{translateText("Skip", locale)}</button>
        </footer>
      </div>
    </section>
  );
}
