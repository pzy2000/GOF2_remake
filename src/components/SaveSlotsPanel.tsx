import { stationById, systemById, useGameStore } from "../state/gameStore";
import type { SaveSlotId, SaveSlotSummary } from "../types/game";

interface SaveSlotsPanelProps {
  mode: "load" | "manage";
}

export function SaveSlotsPanel({ mode }: SaveSlotsPanelProps) {
  const saveSlots = useGameStore((state) => state.saveSlots);
  const activeSaveSlotId = useGameStore((state) => state.activeSaveSlotId);
  const loadGame = useGameStore((state) => state.loadGame);
  const saveGame = useGameStore((state) => state.saveGame);
  const deleteSave = useGameStore((state) => state.deleteSave);
  return (
    <section className="save-slots-panel">
      <h3>{mode === "load" ? "Load Game" : "Save Slots"}</h3>
      <div className="save-slot-grid">
        {saveSlots.map((slot) => (
          <article className={slot.id === activeSaveSlotId ? "save-slot active" : "save-slot"} key={slot.id}>
            <div>
              <strong>{slot.label}</strong>
              <span>{slot.exists ? slotSubtitle(slot) : "Empty slot"}</span>
              {slot.exists ? <span>{slot.savedAt ? new Date(slot.savedAt).toLocaleString() : "Unknown time"} · v{slot.version ?? "?"}</span> : null}
            </div>
            <div className="save-slot-actions">
              {mode === "manage" ? <button onClick={() => saveGame(slot.id)}>Save</button> : null}
              <button onClick={() => loadGame(slot.id)} disabled={!slot.exists}>Load</button>
              <button onClick={() => deleteSave(slot.id)} disabled={!slot.exists}>Delete</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function slotSubtitle(slot: SaveSlotSummary): string {
  const system = slot.currentSystemId ? systemById[slot.currentSystemId]?.name ?? slot.currentSystemId : "Unknown system";
  const station = slot.currentStationId ? stationById[slot.currentStationId]?.name ?? slot.currentStationId : "In flight";
  const credits = slot.credits?.toLocaleString() ?? "0";
  const time = formatGameTime(slot.gameClock ?? 0);
  return `${system} · ${station} · ${credits} cr · ${time}`;
}

function formatGameTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export function isSaveSlotId(value: string): value is SaveSlotId {
  return value === "manual-1" || value === "manual-2" || value === "manual-3" || value === "auto";
}
