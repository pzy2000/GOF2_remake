import type { EconomyServiceStatus, EconomySnapshot } from "../../types/economy";
import type { MarketState, RuntimeState } from "../../types/game";
import { ECONOMY_SERVICE_URL } from "../../systems/economyClient";
import type { GameStore } from "../gameStoreTypes";
import { isEconomyTrafficRole, materializeEconomyNpc } from "./runtimeFactory";

export function applyEconomySnapshotPatch(
  state: GameStore,
  snapshot: EconomySnapshot,
  lastEvent?: string
): Pick<GameStore, "marketState" | "runtime" | "economyService"> {
  const backendNpcIds = new Set(snapshot.visibleNpcs.map((npc) => npc.id));
  const preservedEnemies = state.runtime.enemies.filter((ship) => {
    if (ship.storyTarget) return true;
    if (ship.economyStatus || ship.id.startsWith("econ-")) return backendNpcIds.has(ship.id);
    return !isEconomyTrafficRole(ship.role);
  });
  const backendShips = snapshot.visibleNpcs.map(materializeEconomyNpc);
  const resourceBelt = snapshot.resourceBelts.find((belt) => belt.systemId === state.currentSystemId);
  return {
    marketState: snapshot.marketState as MarketState,
    runtime: {
      ...state.runtime,
      asteroids: resourceBelt?.asteroids ?? state.runtime.asteroids,
      enemies: [
        ...preservedEnemies.filter((ship) => !backendNpcIds.has(ship.id)),
        ...backendShips
      ]
    } as RuntimeState,
    economyService: {
      status: "connected",
      url: ECONOMY_SERVICE_URL,
      snapshotId: snapshot.snapshotId,
      lastEvent,
      lastError: undefined
    }
  };
}

export function offlineEconomyPatch(state: Pick<GameStore, "economyService">, message: string): Pick<GameStore, "economyService"> {
  return {
    economyService: {
      ...state.economyService,
      status: "offline",
      lastError: message
    } satisfies EconomyServiceStatus
  };
}

export function shouldReportEconomyNpcDestroyed(ship: { economyStatus?: string }): boolean {
  return !!ship.economyStatus;
}
