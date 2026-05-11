import type { EconomyNpcEntity, EconomyServiceStatus, EconomySnapshot } from "../../types/economy";
import type { MarketState, MissionDefinition, RuntimeState } from "../../types/game";
import { ECONOMY_SERVICE_URL } from "../../systems/economyClient";
import type { GameStore } from "../gameStoreTypes";
import { isEconomyTrafficRole, materializeEconomyNpc } from "./runtimeFactory";

export function applyEconomySnapshotPatch(
  state: GameStore,
  snapshot: EconomySnapshot,
  lastEvent?: string,
  options: { watchedNpc?: EconomyNpcEntity; watchedNpcId?: string } = {}
): Pick<GameStore, "marketState" | "runtime" | "economyService" | "economyEvents" | "economyPersonalOffers"> {
  const backendNpcIds = new Set(snapshot.visibleNpcs.map((npc) => npc.id));
  const protectedNpcIds = new Set(backendNpcIds);
  if (options.watchedNpcId) protectedNpcIds.add(options.watchedNpcId);
  const preservedEnemies = state.runtime.enemies.filter((ship) => {
    if (ship.storyTarget) return true;
    if (ship.economyStatus || ship.id.startsWith("econ-")) return protectedNpcIds.has(ship.id);
    return !isEconomyTrafficRole(ship.role);
  });
  const watchedShip = options.watchedNpc ? materializeEconomyNpc(options.watchedNpc) : undefined;
  const backendShips = snapshot.visibleNpcs
    .filter((npc) => npc.id !== watchedShip?.id)
    .map(materializeEconomyNpc);
  const nextBackendIds = new Set([...backendShips.map((ship) => ship.id), ...(watchedShip ? [watchedShip.id] : [])]);
  const resourceBelt = snapshot.resourceBelts.find((belt) => belt.systemId === state.currentSystemId);
  return {
    marketState: snapshot.marketState as MarketState,
    runtime: {
      ...state.runtime,
      asteroids: resourceBelt?.asteroids ?? state.runtime.asteroids,
      enemies: [
        ...preservedEnemies.filter((ship) => !nextBackendIds.has(ship.id)),
        ...backendShips,
        ...(watchedShip ? [watchedShip] : [])
      ]
    } as RuntimeState,
    economyService: {
      status: "connected",
      url: ECONOMY_SERVICE_URL,
      snapshotId: snapshot.snapshotId,
      lastEvent,
      lastError: undefined
    },
    economyEvents: snapshot.recentEvents,
    economyPersonalOffers: (snapshot.personalOffers ?? []) as MissionDefinition[]
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
