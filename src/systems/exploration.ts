import { explorationSignalById, explorationSignals } from "../data/exploration";
import { equipmentById } from "../data/equipment";
import { stations, systemById } from "../data/systems";
import type { EquipmentId, ExplorationSignalDefinition, ExplorationState, PlayerState } from "../types/game";
import { getEquipmentEffects } from "./equipment";
import { distance } from "./math";

export const SCANNER_SCAN_RANGE_BONUS = 90;
export const SCANNER_SCAN_BAND_BONUS = 4;

export function createInitialExplorationState(): ExplorationState {
  return {
    discoveredSignalIds: [],
    completedSignalIds: [],
    revealedStationIds: [],
    eventLogIds: []
  };
}

export function normalizeExplorationState(state?: Partial<ExplorationState> | null): ExplorationState {
  const uniqueKnownSignals = new Set(explorationSignals.map((signal) => signal.id));
  const uniqueKnownStations = new Set(stations.filter((station) => station.hidden).map((station) => station.id));
  return {
    discoveredSignalIds: normalizeIds(state?.discoveredSignalIds, uniqueKnownSignals),
    completedSignalIds: normalizeIds(state?.completedSignalIds, uniqueKnownSignals),
    revealedStationIds: normalizeIds(state?.revealedStationIds, uniqueKnownStations),
    eventLogIds: normalizeIds(state?.eventLogIds, uniqueKnownSignals)
  };
}

export function getExplorationSignalsForSystem(systemId: string): ExplorationSignalDefinition[] {
  return explorationSignals.filter((signal) => signal.systemId === systemId);
}

export function isExplorationSignalUnlocked(signal: ExplorationSignalDefinition, explorationState: ExplorationState): boolean {
  return (signal.prerequisiteSignalIds ?? []).every((signalId) => explorationState.completedSignalIds.includes(signalId));
}

export function getUnlockedExplorationSignalsForSystem(systemId: string, explorationState: ExplorationState): ExplorationSignalDefinition[] {
  return getExplorationSignalsForSystem(systemId).filter((signal) => isExplorationSignalUnlocked(signal, explorationState));
}

export function getIncompleteExplorationSignals(systemId: string, explorationState: ExplorationState): ExplorationSignalDefinition[] {
  const completed = new Set(explorationState.completedSignalIds);
  return getUnlockedExplorationSignalsForSystem(systemId, explorationState).filter((signal) => !completed.has(signal.id));
}

export function isExplorationSignalCompleted(signalId: string, explorationState: ExplorationState): boolean {
  return explorationState.completedSignalIds.includes(signalId);
}

export function isExplorationSignalDiscovered(signalId: string, explorationState: ExplorationState): boolean {
  return explorationState.discoveredSignalIds.includes(signalId) || explorationState.completedSignalIds.includes(signalId);
}

export function isHiddenStationRevealed(stationId: string, explorationState: ExplorationState): boolean {
  return explorationState.revealedStationIds.includes(stationId);
}

export function getVisibleStationsForSystem(systemId: string, explorationState: ExplorationState) {
  const system = systemById[systemId];
  if (!system) return [];
  const visibleStationIds = new Set([
    ...system.stationIds,
    ...(system.hiddenStationIds ?? []).filter((stationId) => explorationState.revealedStationIds.includes(stationId))
  ]);
  return stations.filter((station) => visibleStationIds.has(station.id));
}

export function hasRequiredSignalEquipment(signal: ExplorationSignalDefinition, equipment: EquipmentId[] = []): boolean {
  const required = signal.requiredEquipmentAny ?? [];
  return required.length === 0 || required.some((equipmentId) => equipment.includes(equipmentId));
}

export function requiredSignalEquipmentLabel(signal: ExplorationSignalDefinition): string {
  const required = signal.requiredEquipmentAny ?? [];
  if (required.length === 0) return "";
  return required.map((equipmentId) => equipmentById[equipmentId]?.name ?? equipmentId).join(" or ");
}

export function getEffectiveSignalScanRange(signal: ExplorationSignalDefinition, equipment: EquipmentId[] = []): number {
  return signal.scanRange + getEquipmentEffects(equipment).signalScanRangeBonus;
}

export function getEffectiveSignalScanBand(signal: ExplorationSignalDefinition, equipment: EquipmentId[] = []): [number, number] {
  const bonus = getEquipmentEffects(equipment).signalScanBandBonus;
  return [Math.max(0, signal.scanBand[0] - bonus), Math.min(100, signal.scanBand[1] + bonus)];
}

export function getEffectiveSignalScanRateMultiplier(equipment: EquipmentId[] = []): number {
  return Math.max(0.1, getEquipmentEffects(equipment).signalScanRateMultiplier);
}

export function isFrequencyInSignalBand(signal: ExplorationSignalDefinition, frequency: number, equipment: EquipmentId[] = []): boolean {
  const [min, max] = getEffectiveSignalScanBand(signal, equipment);
  return frequency >= min && frequency <= max;
}

export function getNearestIncompleteExplorationSignal(
  systemId: string,
  playerPosition: PlayerState["position"],
  explorationState: ExplorationState,
  equipment: EquipmentId[] = []
) {
  return getIncompleteExplorationSignals(systemId, explorationState)
    .map((signal) => {
      const dist = distance(playerPosition, signal.position);
      return {
        signal,
        distance: dist,
        inRange: dist <= getEffectiveSignalScanRange(signal, equipment),
        equipmentReady: hasRequiredSignalEquipment(signal, equipment)
      };
    })
    .sort((a, b) => a.distance - b.distance)[0];
}

function normalizeIds(ids: string[] | undefined, known: Set<string>): string[] {
  return Array.from(new Set(ids ?? [])).filter((id) => known.has(id));
}

export { explorationSignalById, explorationSignals };
