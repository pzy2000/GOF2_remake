import { useGameStore } from "../state/gameStore";
import { translateText } from "../i18n";

export function StoryNotificationOverlay() {
  const notification = useGameStore((state) => state.runtime.storyNotification);
  const gameClock = useGameStore((state) => state.gameClock);
  const locale = useGameStore((state) => state.locale);
  if (!notification || notification.expiresAt <= gameClock) return null;
  return (
    <aside className={`story-notification ${notification.tone}`} role="status" aria-live="polite" data-testid="story-notification">
      <span>{translateText("Main Story", locale)}</span>
      <b>{translateText(notification.title, locale)}</b>
      <p>{translateText(notification.body, locale)}</p>
    </aside>
  );
}
