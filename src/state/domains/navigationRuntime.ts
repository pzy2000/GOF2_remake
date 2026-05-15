import { stationById, systemById } from "../../data/world";
import type { AudioEventName, AutoPilotState, FlightInput, Vec3 } from "../../types/game";
import {
  GATE_ACTIVATION_SECONDS,
  GATE_ARRIVAL_DISTANCE,
  getJumpGatePosition,
  integrateAutopilotStep,
  rotationToward,
  shouldCancelAutopilot,
  STATION_DOCK_DISTANCE,
  WORMHOLE_SECONDS
} from "../../systems/autopilot";
import { isHiddenStationRevealed } from "../../systems/exploration";
import { getPlayerRuntimeEffects } from "../../systems/equipment";
import { add, clamp, distance, forwardFromRotation, normalize, scale, sub } from "../../systems/math";
import {
  findKnownStargateRoute,
  isKnownSystem,
  revealNeighborSystems,
  STARGATE_INTERACTION_RANGE
} from "../../systems/navigation";
import { NPC_INTERACTION_RANGE } from "../../systems/npcInteraction";
import type { GameStore, SavePayloadOverrides } from "../gameStoreTypes";
import {
  createRuntimeForSystem,
  dockCorridorEffect,
  gateSpoolEffect,
  isKnownStation,
  launchPositionForStation,
  launchTrailEffect,
  mergeKnownPlanetIds,
  navEffect,
  tickRuntimeEffects,
  wormholeEffect
} from "./runtimeFactory";
import { applyExpiredMissions } from "./missionRuntime";

export interface NavigationActionResult {
  patch: Partial<GameStore>;
  autoSave?: SavePayloadOverrides;
  audioEvents?: AudioEventName[];
}

export function emptyFlightInput(): FlightInput {
  return {
    throttleUp: false,
    throttleDown: false,
    rollLeft: false,
    rollRight: false,
    afterburner: false,
    firePrimary: false,
    fireSecondary: false,
    activateUltimate: false,
    collectNearby: false,
    interact: false,
    cycleTarget: false,
    toggleMap: false,
    toggleCamera: false,
    pause: false,
    mouseDX: 0,
    mouseDY: 0
  };
}

function npcRouteActionLabel(action: "escort" | "rob"): string {
  return action[0].toUpperCase() + action.slice(1);
}

function getAutopilotNextSystemId(autopilot: AutoPilotState, currentSystemId: string): string | undefined {
  if (!autopilot.routeSystemIds || autopilot.routeSystemIds.length < 2) {
    return autopilot.targetSystemId === currentSystemId ? undefined : autopilot.targetSystemId;
  }
  const currentRouteIndex = autopilot.routeSystemIds.indexOf(currentSystemId);
  if (currentRouteIndex < 0 || currentRouteIndex >= autopilot.routeSystemIds.length - 1) return undefined;
  return autopilot.routeSystemIds[currentRouteIndex + 1];
}

function getGateExitPosition(systemId: string): Vec3 {
  return add(getJumpGatePosition(systemId), [0, 0, 150] as Vec3);
}

export function advanceAutopilotPatch({
  state,
  delta,
  now,
  gameClock,
  marketState,
  controlInput
}: {
  state: GameStore;
  delta: number;
  now: number;
  gameClock: number;
  marketState: GameStore["marketState"];
  controlInput: FlightInput;
}): NavigationActionResult | undefined {
  if (!state.autopilot) return undefined;
  let runtime = tickRuntimeEffects(state.runtime, delta, now);
  if (controlInput.pause) {
    return {
      patch: {
        screen: "pause",
        previousScreen: "flight",
        runtime,
        input: { ...state.input, pause: false }
      }
    };
  }

  if (state.autopilot.cancelable && shouldCancelAutopilot(controlInput)) {
    return {
      patch: {
        autopilot: undefined,
        runtime: { ...runtime, message: "Autopilot canceled. Manual control restored." },
        input: emptyFlightInput()
      }
    };
  }

  let player = state.player;
  const autopilotEquipmentEffects = getPlayerRuntimeEffects(player);
  const autopilotAfterburning = controlInput.afterburner && player.energy > 12;
  const autopilotSpeedMultiplier = autopilotAfterburning ? autopilotEquipmentEffects.afterburnerMultiplier : 1;
  const drainAutopilotAfterburner = (nextPlayer: GameStore["player"]): GameStore["player"] =>
    autopilotAfterburning
      ? {
          ...nextPlayer,
          energy: clamp(nextPlayer.energy - delta * autopilotEquipmentEffects.afterburnerEnergyDrain, 0, nextPlayer.stats.energy)
        }
      : nextPlayer;
  let autopilot: AutoPilotState | undefined = { ...state.autopilot, timer: state.autopilot.timer + delta };
  let currentSystemId = state.currentSystemId;
  let currentStationId = state.currentStationId;
  let screen: GameStore["screen"] = "flight";
  let previousScreen = state.previousScreen;
  let knownSystems = state.knownSystems;
  let knownPlanetIds = state.knownPlanetIds;
  let targetId = state.targetId;
  let npcInteraction = state.npcInteraction;
  let enteredStationId: string | undefined;
  const audioEvents: AudioEventName[] = [];
  const finalTargetSystem = systemById[autopilot.targetSystemId];

  if (!finalTargetSystem) {
    return {
      patch: {
        autopilot: undefined,
        runtime: { ...runtime, message: "Autopilot route failed. Manual control restored." },
        input: emptyFlightInput()
      }
    };
  }

  if (autopilot.phase === "to-npc") {
    const targetNpc = runtime.enemies.find((ship) =>
      ship.id === autopilot?.targetNpcId && ship.hull > 0 && ship.deathTimer === undefined
    );
    const pendingAction = autopilot.pendingNpcAction;
    if (!targetNpc || !pendingAction || currentSystemId !== autopilot.targetSystemId) {
      return {
        patch: {
          autopilot: undefined,
          npcInteraction: undefined,
          runtime: { ...runtime, message: "NPC signal lost." },
          input: emptyFlightInput()
        }
      };
    }
    const step = integrateAutopilotStep({
      player,
      targetPosition: targetNpc.position,
      delta,
      maxSpeed: 620 * autopilotSpeedMultiplier,
      arriveDistance: NPC_INTERACTION_RANGE
    });
    player = drainAutopilotAfterburner(step.player);
    const actionLabel = npcRouteActionLabel(pendingAction);
    runtime.effects.push(navEffect(targetNpc.position, `${actionLabel} ${Math.round(step.distanceToTarget)}m`));
    runtime.message = `Autopilot: intercepting ${targetNpc.name} · ${Math.round(step.distanceToTarget)}m`;
    targetId = targetNpc.id;
    autopilot = {
      ...autopilot,
      targetPosition: targetNpc.position,
      targetName: targetNpc.name
    };
    if (step.distanceToTarget <= NPC_INTERACTION_RANGE) {
      autopilot = undefined;
      player = { ...player, velocity: [0, 0, 0], throttle: 0 };
      const message = `Arrived near ${targetNpc.name}. Press F or confirm ${actionLabel}.`;
      runtime.message = message;
      runtime.effects.push(navEffect(targetNpc.position, `F ${actionLabel}`));
      npcInteraction = {
        npcId: targetNpc.id,
        openedFrom: "flight",
        openedAt: runtime.clock,
        lastAction: pendingAction,
        pendingAction,
        message
      };
      targetId = targetNpc.id;
      screen = "flight";
      previousScreen = state.screen;
    }
  } else {
    const targetStation = autopilot.targetStationId ? stationById[autopilot.targetStationId] : undefined;
    if (!targetStation) {
      return {
        patch: {
          autopilot: undefined,
          runtime: { ...runtime, message: "Autopilot route failed. Manual control restored." },
          input: emptyFlightInput()
        }
      };
    }

    if (autopilot.phase === "to-origin-gate") {
      const gatePosition = getJumpGatePosition(currentSystemId);
      const step = integrateAutopilotStep({
        player,
        targetPosition: gatePosition,
        delta,
        maxSpeed: 680 * autopilotSpeedMultiplier,
        arriveDistance: GATE_ARRIVAL_DISTANCE
      });
      player = drainAutopilotAfterburner(step.player);
      runtime.effects.push(navEffect(gatePosition, `Gate ${Math.round(step.distanceToTarget)}m`));
      runtime.message = `Autopilot: aligning to jump gate · ${Math.round(step.distanceToTarget)}m`;
      autopilot = { ...autopilot, targetPosition: gatePosition };
      if (step.distanceToTarget <= GATE_ARRIVAL_DISTANCE) {
        audioEvents.push("jump-gate");
        autopilot = {
          ...autopilot,
          phase: "gate-activation",
          targetPosition: gatePosition,
          timer: 0,
          cancelable: false
        };
        runtime.message = "Gate approach locked. Spooling jump field.";
      }
    } else if (autopilot.phase === "gate-activation") {
      const gatePosition = getJumpGatePosition(currentSystemId);
      const progress = clamp(autopilot.timer / GATE_ACTIVATION_SECONDS, 0, 1);
      const step = integrateAutopilotStep({
        player,
        targetPosition: gatePosition,
        delta,
        maxSpeed: 260,
        arriveDistance: 10
      });
      player = step.player;
      runtime.effects.push(gateSpoolEffect(gatePosition, progress));
      runtime.message = `Gate spool-up ${Math.round(progress * 100)}%`;
      if (progress >= 1) {
        audioEvents.push("wormhole");
        autopilot = {
          ...autopilot,
          phase: "wormhole",
          targetPosition: gatePosition,
          timer: 0,
          cancelable: false
        };
        runtime.effects.push(wormholeEffect(player.position));
        runtime.message = "Wormhole transit engaged.";
      }
    } else if (autopilot.phase === "wormhole") {
      const progress = clamp(autopilot.timer / WORMHOLE_SECONDS, 0, 1);
      const forward = forwardFromRotation(player.rotation);
      player = {
        ...player,
        position: add(player.position, scale(forward, (760 + progress * 380) * delta)),
        velocity: scale(forward, 820 + progress * 360),
        throttle: 1,
        energy: clamp(player.energy + delta * 42, 0, player.stats.energy)
      };
      runtime.effects.push(wormholeEffect(player.position));
      runtime.message = `Wormhole transit ${Math.round(progress * 100)}%`;
      if (progress >= 1) {
        const nextSystemId = getAutopilotNextSystemId(autopilot, currentSystemId);
        const nextSystem = nextSystemId ? systemById[nextSystemId] : undefined;
        if (!nextSystem) {
          return {
            patch: {
              autopilot: undefined,
              runtime: { ...runtime, message: "Autopilot route failed. Manual control restored." },
              input: emptyFlightInput()
            }
          };
        }
        const finalJump = nextSystem.id === autopilot.targetSystemId;
        currentSystemId = nextSystem.id;
        currentStationId = undefined;
        knownSystems = revealNeighborSystems(knownSystems, nextSystem.id);
        knownPlanetIds = mergeKnownPlanetIds(knownPlanetIds, knownSystems, finalJump ? targetStation.id : undefined);
        targetId = undefined;
        const arrivalPosition = getGateExitPosition(nextSystem.id);
        const nextGatePosition = getJumpGatePosition(nextSystem.id);
        const nextTargetPosition = finalJump ? targetStation.position : nextGatePosition;
        const exitDirection = normalize(sub(nextTargetPosition, arrivalPosition));
        player = {
          ...player,
          position: arrivalPosition,
          velocity: scale(exitDirection, 120),
          rotation: rotationToward(exitDirection),
          throttle: 0.25
        };
        runtime = {
          ...createRuntimeForSystem(nextSystem.id, state.activeMissions),
          message: finalJump
            ? `Arrived in ${nextSystem.name}. Autopilot continuing to ${targetStation.name}.`
            : `Arrived in ${nextSystem.name}. Continuing stargate route to ${targetStation.name}.`,
          effects: [
            wormholeEffect(player.position),
            navEffect(nextTargetPosition, finalJump ? targetStation.name : "Jump Gate")
          ]
        };
        autopilot = {
          ...autopilot,
          phase: finalJump ? "to-destination-station" : "to-origin-gate",
          originSystemId: nextSystem.id,
          targetPosition: nextTargetPosition,
          timer: 0,
          cancelable: true
        };
      }
    } else if (autopilot.phase === "to-destination-station") {
      const step = integrateAutopilotStep({
        player,
        targetPosition: targetStation.position,
        delta,
        maxSpeed: 620 * autopilotSpeedMultiplier,
        arriveDistance: STATION_DOCK_DISTANCE
      });
      player = drainAutopilotAfterburner(step.player);
      runtime.effects.push(navEffect(targetStation.position, `Dock ${Math.round(step.distanceToTarget)}m`));
      runtime.effects.push(dockCorridorEffect(player.position, targetStation.position, "APPROACH"));
      runtime.message = `Autopilot: approaching ${targetStation.name} · ${Math.round(step.distanceToTarget)}m`;
      if (step.distanceToTarget <= STATION_DOCK_DISTANCE) {
        autopilot = undefined;
        player = { ...player, velocity: [0, 0, 0], throttle: 0 };
        runtime.message = `Arrived near ${targetStation.name}. Press F to dock.`;
      }
    } else if (autopilot.phase === "docking") {
      const step = integrateAutopilotStep({
        player,
        targetPosition: targetStation.position,
        delta,
        maxSpeed: 170,
        arriveDistance: 150
      });
      player = step.player;
      runtime.effects.push(dockCorridorEffect(player.position, targetStation.position));
      runtime.message = `Docking with ${targetStation.name}...`;
      if (autopilot.timer >= 0.9 || step.distanceToTarget <= 220) {
        screen = "station";
        previousScreen = "flight";
        currentStationId = targetStation.id;
        enteredStationId = targetStation.id;
        autopilot = undefined;
        player = { ...player, velocity: [0, 0, 0], throttle: 0 };
        runtime.message = `Docking complete at ${targetStation.name}.`;
      }
    }
  }

  const expiration = applyExpiredMissions({
    player,
    reputation: state.reputation,
    activeMissions: state.activeMissions,
    failedMissionIds: state.failedMissionIds,
    runtime,
    gameClock,
    marketState
  });
  if (expiration.expiredMissionIds.length > 0) audioEvents.push("mission-fail");

  return {
    audioEvents,
    autoSave: enteredStationId
      ? {
          currentSystemId,
          currentStationId: enteredStationId,
          gameClock,
          player: expiration.player,
          activeMissions: expiration.activeMissions,
          failedMissionIds: expiration.failedMissionIds,
          marketState: expiration.marketState ?? marketState,
          reputation: expiration.reputation,
          knownSystems,
          knownPlanetIds
        }
      : undefined,
    patch: {
      player: expiration.player,
      runtime: expiration.runtime,
      autopilot,
      currentSystemId,
      currentStationId,
      screen,
      previousScreen,
      knownSystems,
      knownPlanetIds,
      targetId,
      npcInteraction,
      gameClock,
      marketState: expiration.marketState ?? marketState,
      activeMissions: expiration.activeMissions,
      failedMissionIds: expiration.failedMissionIds,
      reputation: expiration.reputation,
      primaryCooldown: Math.max(0, state.primaryCooldown - delta),
      secondaryCooldown: Math.max(0, state.secondaryCooldown - delta),
      input:
        screen === "station"
          ? emptyFlightInput()
          : { ...state.input, collectNearby: false, interact: false, cycleTarget: false, toggleMap: false, toggleCamera: false, pause: false, mouseDX: 0, mouseDY: 0 }
    }
  };
}

export function dockAtPatch(state: GameStore, stationId: string): NavigationActionResult | undefined {
  const station = stationById[stationId];
  if (!station) return undefined;
  if (station.hidden && !isHiddenStationRevealed(station.id, state.explorationState)) {
    return { patch: { runtime: { ...state.runtime, message: "Station beacon is still masked." } } };
  }
  const knownPlanetIds = state.knownPlanetIds.includes(station.planetId)
    ? state.knownPlanetIds
    : [...state.knownPlanetIds, station.planetId];
  return {
    audioEvents: ["dock"],
    autoSave: {
      currentSystemId: station.systemId,
      currentStationId: station.id,
      knownPlanetIds
    },
    patch: {
      screen: "station",
      currentSystemId: station.systemId,
      currentStationId: station.id,
      knownPlanetIds,
      stationTab: "Market",
      previousScreen: "flight",
      autopilot: undefined,
      runtime: {
        ...state.runtime,
        effects: [...state.runtime.effects, dockCorridorEffect(state.player.position, station.position, "DOCK")],
        message: `Docked at ${station.name}. Auto-saved to Auto / Quick Slot.`
      }
    }
  };
}

export function undockPatch(state: GameStore): Partial<GameStore> {
  const station = state.currentStationId ? stationById[state.currentStationId] : undefined;
  const launchPosition = launchPositionForStation(state.currentStationId, state.player.position);
  return {
    screen: "flight",
    currentStationId: undefined,
    previousScreen: "station",
    autopilot: undefined,
    player: { ...state.player, position: launchPosition, throttle: 0.2 },
    runtime: {
      ...state.runtime,
      effects: [
        ...state.runtime.effects,
        launchTrailEffect(station?.position ?? state.player.position, launchPosition),
        navEffect(launchPosition, "Launch")
      ],
      message: station ? `Launch vector clear from ${station.name}.` : "Launch vector clear."
    }
  };
}

export function startJumpToStationPatch(state: GameStore, stationId: string): Partial<GameStore> | undefined {
  const targetStation = stationById[stationId];
  const targetSystem = targetStation ? systemById[targetStation.systemId] : undefined;
  if (!targetSystem || !targetStation || targetStation.id === state.currentStationId || !isKnownStation(stationId, state.knownPlanetIds, state.explorationState)) return undefined;
  if (targetSystem.id !== state.currentSystemId && !isKnownSystem(state.knownSystems, targetSystem.id)) return undefined;
  const originGate = getJumpGatePosition(state.currentSystemId);
  const launchPosition = state.screen === "station" ? launchPositionForStation(state.currentStationId, state.player.position) : state.player.position;
  const sameSystem = targetSystem.id === state.currentSystemId;
  const routeSystemIds = sameSystem ? [state.currentSystemId] : findKnownStargateRoute(state.currentSystemId, targetSystem.id, state.knownSystems);
  if (!routeSystemIds) {
    return {
      runtime: { ...state.runtime, message: `No known stargate route to ${targetSystem.name}.` }
    };
  }
  const targetPosition = sameSystem ? targetStation.position : originGate;
  const launchEffects = state.screen === "station"
    ? [launchTrailEffect(stationById[state.currentStationId ?? ""]?.position ?? state.player.position, launchPosition)]
    : [];
  return {
    screen: "flight",
    previousScreen: state.screen,
    currentStationId: undefined,
    targetId: undefined,
    stationTab: "Galaxy Map",
    autopilot: {
      phase: sameSystem ? "to-destination-station" : "to-origin-gate",
      originSystemId: state.currentSystemId,
      targetSystemId: targetSystem.id,
      routeSystemIds,
      targetStationId: targetStation.id,
      targetPosition,
      timer: 0,
      cancelable: true
    },
    player: {
      ...state.player,
      position: launchPosition,
      velocity: [0, 0, 0],
      rotation: rotationToward(sub(targetPosition, launchPosition)),
      throttle: 0.55
    },
    runtime: {
      ...state.runtime,
      graceUntil: Math.max(state.runtime.graceUntil, state.runtime.clock + 5),
      effects: [
        ...state.runtime.effects,
        ...launchEffects,
        navEffect(targetPosition, sameSystem ? targetStation.name : "Jump Gate")
      ],
      message: sameSystem
        ? `Autopilot: plotting local route to ${targetStation.name}. Manual input cancels.`
        : `Autopilot: plotting jump to ${targetStation.name}. Manual input cancels.`
    },
    input: emptyFlightInput(),
    primaryCooldown: 0,
    secondaryCooldown: 0
  };
}

export function activateStargateJumpToStationPatch(state: GameStore, stationId: string): NavigationActionResult | undefined {
  const targetStation = stationById[stationId];
  const targetSystem = targetStation ? systemById[targetStation.systemId] : undefined;
  const originGate = getJumpGatePosition(state.currentSystemId);
  if (!targetSystem || !targetStation || !isKnownStation(stationId, state.knownPlanetIds, state.explorationState)) return undefined;
  if (targetSystem.id !== state.currentSystemId && !isKnownSystem(state.knownSystems, targetSystem.id)) return undefined;
  if (distance(state.player.position, originGate) >= STARGATE_INTERACTION_RANGE) {
    return {
      patch: {
        runtime: { ...state.runtime, message: "Stargate link lost. Move closer to activate." },
        screen: "flight",
        previousScreen: state.screen,
        galaxyMapMode: "browse"
      }
    };
  }
  const routeSystemIds = targetSystem.id === state.currentSystemId ? [state.currentSystemId] : findKnownStargateRoute(state.currentSystemId, targetSystem.id, state.knownSystems);
  if (!routeSystemIds) {
    return {
      patch: {
        runtime: { ...state.runtime, message: `No known stargate route to ${targetSystem.name}.` }
      }
    };
  }
  if (targetSystem.id === state.currentSystemId) {
    return {
      patch: {
        screen: "flight",
        previousScreen: state.screen,
        galaxyMapMode: "browse",
        currentStationId: undefined,
        targetId: undefined,
        stationTab: "Galaxy Map",
        autopilot: {
          phase: "to-destination-station",
          originSystemId: state.currentSystemId,
          targetSystemId: targetSystem.id,
          routeSystemIds,
          targetStationId: targetStation.id,
          targetPosition: targetStation.position,
          timer: 0,
          cancelable: true
        },
        player: {
          ...state.player,
          velocity: [0, 0, 0],
          rotation: rotationToward(sub(targetStation.position, state.player.position)),
          throttle: 0.45
        },
        runtime: {
          ...state.runtime,
          graceUntil: Math.max(state.runtime.graceUntil, state.runtime.clock + 5),
          effects: [...state.runtime.effects, navEffect(targetStation.position, targetStation.name)],
          message: `Stargate local vector set for ${targetStation.name}. Manual input cancels.`
        },
        input: emptyFlightInput(),
        primaryCooldown: 0,
        secondaryCooldown: 0
      }
    };
  }
  return {
    audioEvents: ["jump-gate"],
    patch: {
      screen: "flight",
      previousScreen: state.screen,
      galaxyMapMode: "browse",
      currentStationId: undefined,
      targetId: undefined,
      stationTab: "Galaxy Map",
      autopilot: {
        phase: "gate-activation",
        originSystemId: state.currentSystemId,
        targetSystemId: targetSystem.id,
        routeSystemIds,
        targetStationId: targetStation.id,
        targetPosition: originGate,
        timer: 0,
        cancelable: false
      },
      player: {
        ...state.player,
        position: distance(state.player.position, originGate) < 12 ? originGate : state.player.position,
        velocity: [0, 0, 0],
        rotation: rotationToward(sub(originGate, state.player.position)),
        throttle: 0.25
      },
      runtime: {
        ...state.runtime,
        graceUntil: Math.max(state.runtime.graceUntil, state.runtime.clock + 5),
        effects: [...state.runtime.effects, gateSpoolEffect(originGate, 0.05)],
        message: `Stargate locked for ${targetStation.name}. Spooling jump field.`
      },
      input: emptyFlightInput(),
      primaryCooldown: 0,
      secondaryCooldown: 0
    }
  };
}

export function jumpToSystemPatch(state: GameStore, systemId: string): Partial<GameStore> | undefined {
  if (!systemById[systemId]) return undefined;
  const knownSystems = revealNeighborSystems(state.knownSystems, systemId);
  return {
    screen: state.screen === "galaxyMap" || state.screen === "station" ? "flight" : state.screen,
    previousScreen: state.screen,
    galaxyMapMode: "browse",
    currentSystemId: systemId,
    currentStationId: undefined,
    runtime: { ...createRuntimeForSystem(systemId, state.activeMissions), message: `Jumped to ${systemById[systemId].name}.` },
    autopilot: undefined,
    targetId: undefined,
    knownSystems,
    knownPlanetIds: mergeKnownPlanetIds(state.knownPlanetIds, knownSystems),
    input: emptyFlightInput(),
    player: {
      ...state.player,
      position: add(getJumpGatePosition(systemId), [0, 0, 150] as Vec3),
      velocity: [0, 0, 0],
      rotation: [0, 0, 0],
      throttle: 0.25
    }
  };
}
