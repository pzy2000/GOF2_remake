import { useMemo, useRef, useState, type FormEvent } from "react";
import { useGameStore } from "../state/gameStore";
import {
  filterVisibleMultiplayerChatMessages,
  multiplayerChatChannelLabels,
  multiplayerChatChannels,
  sanitizeMultiplayerChatText
} from "../systems/multiplayerChat";
import type { MultiplayerChatChannel } from "../types/multiplayer";
import { translateDisplayName, translateText } from "../i18n";

type MultiplayerChatPanelProps = {
  channels?: MultiplayerChatChannel[];
  maxMessages?: number;
  variant?: "station" | "hud";
};

export function MultiplayerChatPanel({
  channels = multiplayerChatChannels,
  maxMessages,
  variant = "station"
}: MultiplayerChatPanelProps) {
  const locale = useGameStore((state) => state.locale);
  const session = useGameStore((state) => state.multiplayerSession);
  const status = useGameStore((state) => state.multiplayerStatus);
  const currentSystemId = useGameStore((state) => state.currentSystemId);
  const currentStationId = useGameStore((state) => state.currentStationId);
  const chatMessages = useGameStore((state) => state.multiplayerChatMessages);
  const sendChat = useGameStore((state) => state.sendMultiplayerChatMessage);
  const [draft, setDraft] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<MultiplayerChatChannel>(channels[0] ?? "local");
  const inputRef = useRef<HTMLInputElement>(null);
  const availableChannels = channels.filter((channel) => channel !== "station" || !!currentStationId);
  const activeChannel = availableChannels.includes(selectedChannel) ? selectedChannel : availableChannels[0] ?? "local";
  const visibleMessages = useMemo(() => {
    const limit = maxMessages ?? (variant === "hud" ? 4 : 60);
    return filterVisibleMultiplayerChatMessages(chatMessages, currentSystemId, currentStationId)
      .filter((message) => message.channel === activeChannel)
      .slice(-limit);
  }, [activeChannel, chatMessages, currentStationId, currentSystemId, maxMessages, variant]);
  const sanitizedDraft = sanitizeMultiplayerChatText(draft);
  const canSend = !!session && status === "connected" && !!sanitizedDraft;

  function submitChat(event: FormEvent) {
    event.preventDefault();
    if (!canSend) return;
    sendChat(activeChannel, sanitizedDraft);
    setDraft("");
    if (variant === "hud") inputRef.current?.blur();
  }

  if (!session) return null;

  return (
    <div className={`multiplayer-chat-panel multiplayer-chat-panel-${variant}`} data-testid={`multiplayer-chat-${variant}`}>
      <div className="multiplayer-chat-tabs" role="tablist" aria-label={translateText("Chat channel", locale)}>
        {channels.map((channel) => {
          const disabled = channel === "station" && !currentStationId;
          return (
            <button
              aria-selected={activeChannel === channel}
              className={activeChannel === channel ? "active" : ""}
              disabled={disabled}
              key={channel}
              onClick={() => setSelectedChannel(channel)}
              role="tab"
              type="button"
            >
              {translateText(multiplayerChatChannelLabels[channel], locale)}
            </button>
          );
        })}
      </div>
      <div className="multiplayer-chat-log" data-testid={`multiplayer-chat-log-${variant}`}>
        {visibleMessages.length === 0 ? (
          <p>{translateText("No messages yet.", locale)}</p>
        ) : visibleMessages.map((message) => (
          <article key={message.id} className={`multiplayer-chat-message channel-${message.channel}`}>
            <header>
              <b>{translateDisplayName(message.displayName, locale)}</b>
              <time dateTime={new Date(message.createdAt).toISOString()}>
                {new Date(message.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
              </time>
            </header>
            <p>{message.text}</p>
          </article>
        ))}
      </div>
      <form className="multiplayer-chat-form" onSubmit={submitChat}>
        <input
          aria-label={translateText("Chat message", locale)}
          data-testid={`multiplayer-chat-input-${variant}`}
          disabled={!session || status !== "connected"}
          maxLength={240}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={translateText("Send message", locale)}
          ref={inputRef}
          value={draft}
        />
        <button className="primary" disabled={!canSend} type="submit">
          {translateText("Send", locale)}
        </button>
      </form>
    </div>
  );
}
