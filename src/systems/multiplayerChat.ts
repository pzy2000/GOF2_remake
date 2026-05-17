import type { MultiplayerChatChannel, MultiplayerChatMessage } from "../types/multiplayer";

export const MULTIPLAYER_CHAT_TEXT_LIMIT = 240;
export const MULTIPLAYER_CHAT_HISTORY_LIMIT = 100;

export const multiplayerChatChannels: MultiplayerChatChannel[] = ["local", "station", "global"];

export const multiplayerChatChannelLabels: Record<MultiplayerChatChannel, string> = {
  local: "Local",
  station: "Station",
  global: "Global"
};

export function sanitizeMultiplayerChatText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MULTIPLAYER_CHAT_TEXT_LIMIT);
}

export function multiplayerChatScopeFor(
  channel: MultiplayerChatChannel,
  currentSystemId: string,
  currentStationId?: string
): string | undefined {
  if (channel === "global") return undefined;
  if (channel === "station") return currentStationId;
  return currentSystemId;
}

export function isMultiplayerChatChannel(value: unknown): value is MultiplayerChatChannel {
  return value === "local" || value === "station" || value === "global";
}

export function isMultiplayerChatMessageVisible(
  message: MultiplayerChatMessage,
  currentSystemId: string,
  currentStationId?: string
): boolean {
  if (message.channel === "global") return true;
  if (message.channel === "station") return !!currentStationId && message.scopeId === currentStationId;
  return message.scopeId === currentSystemId;
}

export function filterVisibleMultiplayerChatMessages(
  messages: MultiplayerChatMessage[],
  currentSystemId: string,
  currentStationId?: string
): MultiplayerChatMessage[] {
  return messages.filter((message) => isMultiplayerChatMessageVisible(message, currentSystemId, currentStationId));
}

export function mergeMultiplayerChatMessages(
  existing: MultiplayerChatMessage[],
  incoming: MultiplayerChatMessage[]
): MultiplayerChatMessage[] {
  const byId = new Map<string, MultiplayerChatMessage>();
  for (const message of [...existing, ...incoming]) byId.set(message.id, message);
  return [...byId.values()]
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(-MULTIPLAYER_CHAT_HISTORY_LIMIT);
}
