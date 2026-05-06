import type { SaveGameData } from "../types/game";

export const SAVE_KEY = "gof2-by-pzy-save";
export const SAVE_VERSION = 1;

export function serializeSave(save: Omit<SaveGameData, "version" | "savedAt">): string {
  return JSON.stringify({ ...save, version: SAVE_VERSION, savedAt: new Date().toISOString() } satisfies SaveGameData);
}

export function parseSave(raw: string | null): SaveGameData | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SaveGameData;
    if (parsed.version !== SAVE_VERSION || !parsed.player || !parsed.currentSystemId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSave(save: Omit<SaveGameData, "version" | "savedAt">, storage: Storage = localStorage): SaveGameData {
  const serialized = serializeSave(save);
  storage.setItem(SAVE_KEY, serialized);
  const parsed = parseSave(serialized);
  if (!parsed) throw new Error("Failed to parse saved game immediately after writing.");
  return parsed;
}

export function readSave(storage: Storage = localStorage): SaveGameData | null {
  return parseSave(storage.getItem(SAVE_KEY));
}
