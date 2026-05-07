import { useEffect, useMemo, useState } from "react";
import { dialogueSceneById, dialogueSpeakerById } from "../data/world";
import { getFactionIcon } from "../data/iconAtlas";
import { useGameStore } from "../state/gameStore";
import { voiceSystem } from "../systems/voice";
import { AtlasIcon } from "./AtlasIcon";
import type { AssetManifest } from "../types/game";

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
  const advanceDialogue = useGameStore((state) => state.advanceDialogue);
  const closeDialogue = useGameStore((state) => state.closeDialogue);
  const [voiceStatus, setVoiceStatus] = useState(voiceSystem.debugState);
  const scene = activeDialogue ? dialogueSceneById[activeDialogue.sceneId] : undefined;
  const line = scene ? scene.lines[activeDialogue?.lineIndex ?? 0] : undefined;
  const speaker = line ? dialogueSpeakerById[line.speakerId] : undefined;
  const transcript = useMemo(() => scene?.lines.slice(0, (activeDialogue?.lineIndex ?? 0) + 1) ?? [], [activeDialogue?.lineIndex, scene]);

  useEffect(() => {
    if (!line || !speaker) return undefined;
    voiceSystem.speak(line.text, speaker.voiceProfile, {
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
  }, [advanceDialogue, line, speaker]);

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
    if (state === "idle" && line && speaker) voiceSystem.speak(line.text, speaker.voiceProfile);
    setVoiceStatus(voiceSystem.debugState);
  }

  function replayVoice() {
    if (!line || !speaker) return;
    voiceSystem.speak(line.text, speaker.voiceProfile);
    setVoiceStatus(voiceSystem.debugState);
  }

  const isPlayer = speaker.kind === "player";
  const currentIndex = activeDialogue.lineIndex;
  const atEnd = currentIndex >= scene.lines.length - 1;
  return (
    <section className="dialogue-backdrop" role="dialog" aria-modal="true" aria-label={`Comms dialogue: ${scene.title}`} data-testid="dialogue-overlay">
      <div className="dialogue-panel">
        <header className="dialogue-header">
          <div>
            <p className="eyebrow">{scene.group === "story" ? "Glass Wake Protocol" : "Quiet Signals"}</p>
            <h2>{scene.title}</h2>
          </div>
          <button className="dialogue-close" onClick={close} aria-label="Close dialogue">X</button>
        </header>
        <div className={`dialogue-current ${isPlayer ? "player-line" : ""}`}>
          <SpeakerBadge manifest={manifest} speakerId={speaker.id} />
          <div>
            <span>{speaker.name} · {speaker.role}</span>
            <p>{line.text}</p>
          </div>
        </div>
        <div className="dialogue-transcript" aria-label="Dialogue transcript">
          {transcript.map((item, index) => {
            const itemSpeaker = dialogueSpeakerById[item.speakerId];
            return (
              <p key={`${scene.id}-${index}`} className={index === currentIndex ? "active" : ""}>
                <b>{itemSpeaker?.name ?? item.speakerId}</b>
                {item.text}
              </p>
            );
          })}
        </div>
        <footer className="dialogue-actions">
          <span>{voiceStatus.supported ? voiceStatus.paused ? "Voice paused" : voiceStatus.speaking ? "Voice playing" : "Voice ready" : "Voice unavailable"}</span>
          <button onClick={playPause}>Play/Pause</button>
          <button onClick={replayVoice}>Replay Voice</button>
          <button className="primary" onClick={next}>{atEnd ? "Done" : "Next"}</button>
          <button onClick={close}>Skip</button>
        </footer>
      </div>
    </section>
  );
}
