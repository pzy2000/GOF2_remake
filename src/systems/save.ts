import type { SaveGameData, SaveIndex, SaveSlotId, SaveSlotSummary } from "../types/game";
import { normalizeDialogueState } from "./dialogue";
import { createInitialMarketState } from "./economy";
import { normalizePlayerEquipmentStats } from "./equipment";
import { normalizeExplorationState } from "./exploration";
import { applyExplorationChainBlueprintRewards } from "./explorationObjectives";
import { normalizeFactionHeat } from "./factionConsequences";
import { getInitialKnownPlanetIds } from "./navigation";
import { normalizeOnboardingState } from "./onboarding";
import { normalizeReputation } from "./reputation";

export const SAVE_KEY = "gof2-by-pzy-save";
export const SAVE_INDEX_KEY = "gof2-by-pzy-save-index";
export const SAVE_SLOT_PREFIX = "gof2-by-pzy-save-slot:";
export const SAVE_VERSION = 3;
export const PREVIOUS_SAVE_VERSION = 2;
export const LEGACY_SAVE_VERSION = 1;

export const saveSlotLabels: Record<SaveSlotId, string> = {
  "manual-1": "Manual Slot 1",
  "manual-2": "Manual Slot 2",
  "manual-3": "Manual Slot 3",
  auto: "Auto / Quick Slot"
};

export const saveSlotIds: SaveSlotId[] = ["manual-1", "manual-2", "manual-3", "auto"];

function slotKey(slotId: SaveSlotId): string {
  return `${SAVE_SLOT_PREFIX}${slotId}`;
}

function emptySlot(slotId: SaveSlotId): SaveSlotSummary {
  return { id: slotId, label: saveSlotLabels[slotId], exists: false };
}

function completeIndex(index?: Partial<SaveIndex>): SaveIndex {
  const slots = Object.fromEntries(saveSlotIds.map((slotId) => [slotId, index?.slots?.[slotId] ?? emptySlot(slotId)])) as Record<
    SaveSlotId,
    SaveSlotSummary
  >;
  return {
    version: SAVE_VERSION,
    slots,
    lastPlayedSlotId: index?.lastPlayedSlotId
  };
}

function isSupportedSaveVersion(version: unknown): boolean {
  return version === SAVE_VERSION || version === PREVIOUS_SAVE_VERSION || version === LEGACY_SAVE_VERSION;
}

function normalizeSave(parsed: Partial<SaveGameData> | null): SaveGameData | null {
  if (!parsed || !parsed.player || !parsed.currentSystemId) return null;
  if (!isSupportedSaveVersion(parsed.version)) return null;
  const knownSystems = parsed.knownSystems ?? [parsed.currentSystemId];
  const explorationState = normalizeExplorationState(parsed.explorationState);
  const player = applyExplorationChainBlueprintRewards(normalizePlayerEquipmentStats(parsed.player), explorationState).player;
  return {
    ...parsed,
    version: SAVE_VERSION,
    savedAt: parsed.savedAt ?? new Date().toISOString(),
    currentSystemId: parsed.currentSystemId,
    currentStationId: parsed.currentStationId,
    gameClock: parsed.gameClock ?? 0,
    player,
    activeMissions: parsed.activeMissions ?? [],
    completedMissionIds: parsed.completedMissionIds ?? [],
    failedMissionIds: parsed.failedMissionIds ?? [],
    marketState: parsed.marketState ?? createInitialMarketState(),
    reputation: normalizeReputation(parsed.reputation),
    factionHeat: normalizeFactionHeat(parsed.factionHeat),
    knownSystems,
    knownPlanetIds: parsed.knownPlanetIds ?? getInitialKnownPlanetIds(knownSystems, parsed.currentStationId),
    explorationState,
    dialogueState: normalizeDialogueState(parsed.dialogueState),
    onboardingState: normalizeOnboardingState(parsed.onboardingState, {
      completedMissionIds: parsed.completedMissionIds ?? [],
      gameClock: parsed.gameClock ?? 0
    })
  } as SaveGameData;
}

function summarizeSave(slotId: SaveSlotId, save: SaveGameData): SaveSlotSummary {
  return {
    id: slotId,
    label: saveSlotLabels[slotId],
    exists: true,
    savedAt: save.savedAt,
    currentSystemId: save.currentSystemId,
    currentStationId: save.currentStationId,
    credits: save.player.credits,
    gameClock: save.gameClock,
    version: save.version
  };
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function serializeSave(save: Omit<SaveGameData, "version" | "savedAt">): string {
  return JSON.stringify({ ...save, version: SAVE_VERSION, savedAt: new Date().toISOString() } satisfies SaveGameData);
}

export function parseSave(raw: string | null): SaveGameData | null {
  return normalizeSave(parseJson<Partial<SaveGameData>>(raw));
}

function writeIndex(index: SaveIndex, storage: Storage): SaveIndex {
  const completed = completeIndex(index);
  storage.setItem(SAVE_INDEX_KEY, JSON.stringify(completed));
  return completed;
}

export function migrateLegacySave(storage: Storage = localStorage): SaveIndex {
  const existing = parseJson<SaveIndex>(storage.getItem(SAVE_INDEX_KEY));
  if (existing && isSupportedSaveVersion(existing.version)) return existing.version === SAVE_VERSION ? completeIndex(existing) : writeIndex(completeIndex(existing), storage);

  const legacy = parseSave(storage.getItem(SAVE_KEY));
  if (!legacy) return writeIndex(completeIndex(), storage);

  storage.setItem(slotKey("auto"), JSON.stringify({ ...legacy, version: SAVE_VERSION, savedAt: legacy.savedAt }));
  return writeIndex(
    {
      version: SAVE_VERSION,
      slots: { auto: summarizeSave("auto", legacy) },
      lastPlayedSlotId: "auto"
    },
    storage
  );
}

export function readSaveIndex(storage: Storage = localStorage): SaveIndex {
  migrateLegacySave(storage);
  const parsed = parseJson<SaveIndex>(storage.getItem(SAVE_INDEX_KEY));
  return completeIndex(parsed ?? undefined);
}

export function readSaveSlots(storage: Storage = localStorage): SaveSlotSummary[] {
  const index = readSaveIndex(storage);
  return saveSlotIds.map((slotId) => index.slots[slotId] ?? emptySlot(slotId));
}

export function getLatestSaveSlotId(storage: Storage = localStorage): SaveSlotId | undefined {
  const index = readSaveIndex(storage);
  const last = index.lastPlayedSlotId;
  if (last && index.slots[last]?.exists) return last;
  return saveSlotIds
    .map((slotId) => index.slots[slotId])
    .filter((slot): slot is SaveSlotSummary => !!slot?.exists && !!slot.savedAt)
    .sort((a, b) => Date.parse(b.savedAt ?? "") - Date.parse(a.savedAt ?? ""))[0]?.id;
}

export function writeSave(
  save: Omit<SaveGameData, "version" | "savedAt">,
  storage: Storage = localStorage,
  slotId: SaveSlotId = "auto"
): SaveGameData {
  migrateLegacySave(storage);
  const serialized = serializeSave(save);
  storage.setItem(slotKey(slotId), serialized);
  const parsed = parseSave(serialized);
  if (!parsed) throw new Error("Failed to parse saved game immediately after writing.");
  const index = readSaveIndex(storage);
  writeIndex(
    {
      ...index,
      slots: { ...index.slots, [slotId]: summarizeSave(slotId, parsed) },
      lastPlayedSlotId: slotId
    },
    storage
  );
  return parsed;
}

export function readSave(storage: Storage = localStorage, slotId?: SaveSlotId): SaveGameData | null {
  const resolvedSlotId = slotId ?? getLatestSaveSlotId(storage);
  if (!resolvedSlotId) return null;
  const save = parseSave(storage.getItem(slotKey(resolvedSlotId)));
  if (!save) return null;
  const index = readSaveIndex(storage);
  writeIndex({ ...index, lastPlayedSlotId: resolvedSlotId }, storage);
  return save;
}

export function deleteSave(slotId: SaveSlotId, storage: Storage = localStorage): SaveIndex {
  migrateLegacySave(storage);
  storage.removeItem(slotKey(slotId));
  const index = readSaveIndex(storage);
  const nextLast = index.lastPlayedSlotId === slotId ? undefined : index.lastPlayedSlotId;
  return writeIndex(
    {
      ...index,
      lastPlayedSlotId: nextLast,
      slots: { ...index.slots, [slotId]: emptySlot(slotId) }
    },
    storage
  );
}
