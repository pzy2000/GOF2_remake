import { useGameStore } from "../state/gameStore";
import { translateText } from "../i18n";

export function StoryNotificationOverlay() {
  const notification = useGameStore((state) => state.runtime.storyNotification);
  const lawNotification = useGameStore((state) => state.runtime.lawNotification);
  const gameClock = useGameStore((state) => state.gameClock);
  const locale = useGameStore((state) => state.locale);
  const activeStoryNotification = notification && notification.expiresAt > gameClock ? notification : undefined;
  const activeLawNotification = lawNotification && lawNotification.expiresAt > gameClock ? lawNotification : undefined;
  if (!activeStoryNotification && !activeLawNotification) return null;
  return (
    <>
      {activeStoryNotification ? (
        <aside className={`story-notification ${activeStoryNotification.tone}`} role="status" aria-live="polite" data-testid="story-notification">
          <span>{translateText("Main Story", locale)}</span>
          <b>{translateText(activeStoryNotification.title, locale)}</b>
          <p>{translateText(activeStoryNotification.body, locale)}</p>
        </aside>
      ) : null}
      {activeLawNotification ? (
        <aside className={`story-notification law-notification ${activeLawNotification.tone} ${activeStoryNotification ? "stacked" : ""}`} role="status" aria-live="polite" data-testid="law-notification">
          <span>{translateText("Legal Status", locale)}</span>
          <b>{translateText(activeLawNotification.title, locale)}</b>
          <p>{translateText(activeLawNotification.body, locale)}</p>
        </aside>
      ) : null}
    </>
  );
}
