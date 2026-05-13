import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { stationById, useGameStore } from "../../state/gameStore";
import { getOnboardingView } from "../../systems/onboarding";
import { clamp } from "../../systems/math";
import { hasActiveCivilianDistress } from "../../state/domains/combatRuntime";
import type { FlightEntity, NpcInteractionAction } from "../../types/game";
import { ShortcutButton } from "../ShortcutButton";

type TouchPadState = {
  x: number;
  y: number;
};

export function FlightControls() {
  const setInput = useGameStore((state) => state.setInput);
  useEffect(() => {
    const keyMap: Record<string, keyof ReturnType<typeof useGameStore.getState>["input"]> = {
      KeyW: "throttleUp",
      KeyS: "throttleDown",
      KeyA: "rollLeft",
      KeyD: "rollRight",
      ShiftLeft: "afterburner",
      ShiftRight: "afterburner",
      Space: "fireSecondary"
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const state = useGameStore.getState();
      if (shouldIgnoreGlobalShortcut(event.target)) return;
      if (state.screen === "economyWatch") {
        handleEconomyWatchShortcut(event, setInput);
        return;
      }
      if (state.screen === "pause") {
        handlePauseShortcut(event);
        return;
      }
      if (state.screen === "galaxyMap") {
        if (isFlightShortcut(event)) event.preventDefault();
        return;
      }
      if (state.screen !== "flight") return;
      if (event.ctrlKey && event.code === "KeyS") {
        event.preventDefault();
        state.saveGame();
        return;
      }
      if (state.npcInteraction) {
        if (handleNpcInteractionShortcut(event)) return;
      }
      const scanActive = state.screen === "flight" && !!state.runtime.explorationScan;
      if (scanActive && (event.code === "ArrowLeft" || event.code === "ArrowRight")) {
        event.preventDefault();
        state.adjustExplorationScanFrequency((event.code === "ArrowLeft" ? -1 : 1) * (event.shiftKey ? 5 : 1));
        return;
      }
      if (scanActive && event.code === "Escape") {
        event.preventDefault();
        state.cancelExplorationScan();
        return;
      }
      if (scanActive && (event.code === "ShiftLeft" || event.code === "ShiftRight")) {
        event.preventDefault();
        return;
      }
      if (event.code === "KeyH" || event.code === "KeyK") {
        const onboardingView = getOnboardingView({
          onboardingState: state.onboardingState,
          screen: "flight",
          currentSystemId: state.currentSystemId,
          currentStationId: state.currentStationId,
          player: state.player,
          activeMissions: state.activeMissions,
          completedMissionIds: state.completedMissionIds,
          autopilot: state.autopilot,
          gameClock: state.gameClock
        });
        if (onboardingView.visible && onboardingView.activeStep) {
          event.preventDefault();
          if (event.code === "KeyH") state.setOnboardingCollapsed(!onboardingView.collapsed);
          if (event.code === "KeyK") state.skipOnboarding();
          return;
        }
      }
      const mapped = keyMap[event.code];
      if (mapped) {
        event.preventDefault();
        setInput({ [mapped]: true });
      }
      if (event.repeat) return;
      if (event.code === "KeyE") setInput({ interact: true });
      if (event.code === "KeyG") setInput({ activateUltimate: true });
      if (event.code === "Tab") {
        event.preventDefault();
        setInput({ cycleTarget: true });
      }
      if (event.code === "KeyM" && !state.autopilot) setInput({ toggleMap: true });
      if (event.code === "KeyC") setInput({ toggleCamera: true });
      if (event.code === "Escape") setInput({ pause: true });
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const mapped = keyMap[event.code];
      if (mapped) setInput({ [mapped]: false });
    };
    const onMouseMove = (event: MouseEvent) => {
      const state = useGameStore.getState();
      if (state.screen !== "flight" && state.screen !== "economyWatch") return;
      if (state.autopilot) return;
      setInput({ mouseDX: state.input.mouseDX + event.movementX, mouseDY: state.input.mouseDY + event.movementY });
    };
    const onMouseDown = (event: MouseEvent) => {
      if (useGameStore.getState().screen !== "flight") return;
      if (event.button === 0) setInput({ firePrimary: true });
      if (event.button === 2) setInput({ fireSecondary: true });
    };
    const onMouseUp = (event: MouseEvent) => {
      if (useGameStore.getState().screen !== "flight") return;
      if (event.button === 0) setInput({ firePrimary: false });
      if (event.button === 2) setInput({ fireSecondary: false });
    };
    const onContextMenu = (event: MouseEvent) => event.preventDefault();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("contextmenu", onContextMenu);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("contextmenu", onContextMenu);
    };
  }, [setInput]);
  return null;
}

const npcActionShortcuts: Record<string, NpcInteractionAction> = {
  Digit1: "hail",
  Numpad1: "hail",
  Digit2: "escort",
  Numpad2: "escort",
  Digit3: "rob",
  Numpad3: "rob",
  Digit4: "rescue",
  Numpad4: "rescue",
  Digit5: "report",
  Numpad5: "report"
};

function shouldIgnoreGlobalShortcut(target: EventTarget | null): boolean {
  const element = target instanceof HTMLElement ? target : null;
  return !!element?.closest("input, textarea, select, [contenteditable='true']");
}

function isFlightShortcut(event: KeyboardEvent): boolean {
  if (event.ctrlKey && ["KeyS", "KeyR", "KeyM"].includes(event.code)) return true;
  return [
    "KeyW",
    "KeyS",
    "KeyA",
    "KeyD",
    "ShiftLeft",
    "ShiftRight",
    "Space",
    "KeyE",
    "KeyG",
    "KeyM",
    "KeyC",
    "KeyH",
    "KeyK",
    "Escape"
  ].includes(event.code);
}

function handlePauseShortcut(event: KeyboardEvent): void {
  const state = useGameStore.getState();
  if (event.code === "Escape") {
    event.preventDefault();
    state.setScreen("flight");
    return;
  }
  if (!event.ctrlKey) return;
  if (event.code === "KeyS") {
    event.preventDefault();
    state.saveGame();
  } else if (event.code === "KeyR") {
    event.preventDefault();
    state.loadGame();
  } else if (event.code === "KeyM") {
    event.preventDefault();
    state.setScreen("menu");
  }
}

function handleEconomyWatchShortcut(event: KeyboardEvent, setInput: (patch: Partial<ReturnType<typeof useGameStore.getState>["input"]>) => void): void {
  if (event.code === "KeyC") {
    event.preventDefault();
    setInput({ toggleCamera: true });
    return;
  }
  if (event.code === "Escape") {
    event.preventDefault();
    setInput({ pause: true });
    return;
  }
  if (handleNpcInteractionShortcut(event)) return;
  if (event.code === "Enter" && routeToPersonalCall()) {
    event.preventDefault();
    return;
  }
  if (isFlightShortcut(event)) event.preventDefault();
}

function handleNpcInteractionShortcut(event: KeyboardEvent): boolean {
  const state = useGameStore.getState();
  const action = npcActionShortcuts[event.code];
  if (action) {
    event.preventDefault();
    const npc = getShortcutNpc();
    if (npc && canUseNpcShortcutAction(action, npc, state.runtime.clock)) void state.executeNpcInteraction(action, npc.id);
    return true;
  }
  if (event.code === "Escape") {
    event.preventDefault();
    state.closeNpcInteraction();
    return true;
  }
  if (event.code === "Enter" && routeToPersonalCall()) {
    event.preventDefault();
    return true;
  }
  return false;
}

function routeToPersonalCall(): boolean {
  const state = useGameStore.getState();
  const npc = getShortcutNpc();
  const station = npc?.economyPersonalOfferId && npc.economyHomeStationId ? stationById[npc.economyHomeStationId] : undefined;
  if (!station) return false;
  state.startJumpToStation(station.id);
  return true;
}

function getShortcutNpc(): FlightEntity | undefined {
  const state = useGameStore.getState();
  const npcId = state.npcInteraction?.npcId ?? state.economyNpcWatch?.npcId ?? state.targetId;
  return npcId ? state.runtime.enemies.find((ship) => ship.id === npcId && ship.hull > 0 && ship.deathTimer === undefined) : undefined;
}

function canUseNpcShortcutAction(action: NpcInteractionAction, ship: FlightEntity, runtimeClock: number): boolean {
  if (action === "hail") return true;
  if (action === "escort") return ship.role === "trader" || ship.role === "freighter" || ship.role === "courier" || ship.role === "miner";
  if (action === "rob") return Object.values(ship.economyCargo ?? {}).reduce((total, amount) => total + (amount ?? 0), 0) > 0;
  if (action === "rescue") return hasActiveCivilianDistress(ship, runtimeClock);
  if (action === "report") return ship.role === "smuggler" || hasActiveCivilianDistress(ship, runtimeClock) || ship.aiTargetId === "player" || !!ship.provokedByPlayer;
  return false;
}

export function TouchFlightControls() {
  const screen = useGameStore((state) => state.screen);
  const locale = useGameStore((state) => state.locale);
  const autopilot = useGameStore((state) => state.autopilot);
  const setInput = useGameStore((state) => state.setInput);
  const throttlePointerId = useRef<number | null>(null);
  const lookPointer = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const [throttlePad, setThrottlePad] = useState<TouchPadState>({ x: 0, y: 0 });
  const [lookPad, setLookPad] = useState<TouchPadState>({ x: 0, y: 0 });
  const isFlight = screen === "flight";

  useEffect(() => {
    if (isFlight) return undefined;
    throttlePointerId.current = null;
    lookPointer.current = null;
    setThrottlePad({ x: 0, y: 0 });
    setLookPad({ x: 0, y: 0 });
    setInput({
      throttleUp: false,
      throttleDown: false,
      rollLeft: false,
      rollRight: false,
      afterburner: false,
      firePrimary: false,
      fireSecondary: false
    });
    return undefined;
  }, [isFlight, setInput]);

  if (!isFlight) return null;

  function updateThrottlePad(event: ReactPointerEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const rawX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const rawY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    const x = clamp(rawX, -1, 1);
    const y = clamp(rawY, -1, 1);
    setThrottlePad({ x, y });
    setInput({
      throttleUp: y < -0.18,
      throttleDown: y > 0.18,
      rollLeft: x < -0.18,
      rollRight: x > 0.18
    });
  }

  function resetThrottlePad() {
    throttlePointerId.current = null;
    setThrottlePad({ x: 0, y: 0 });
    setInput({ throttleUp: false, throttleDown: false, rollLeft: false, rollRight: false });
  }

  function handleThrottlePointerDown(event: ReactPointerEvent<HTMLElement>) {
    event.preventDefault();
    throttlePointerId.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    updateThrottlePad(event);
  }

  function handleThrottlePointerMove(event: ReactPointerEvent<HTMLElement>) {
    if (throttlePointerId.current !== event.pointerId) return;
    event.preventDefault();
    updateThrottlePad(event);
  }

  function handleThrottlePointerUp(event: ReactPointerEvent<HTMLElement>) {
    if (throttlePointerId.current !== event.pointerId) return;
    event.preventDefault();
    resetThrottlePad();
  }

  function handleLookPointerDown(event: ReactPointerEvent<HTMLElement>) {
    event.preventDefault();
    lookPointer.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
    setLookPad({ x: 0, y: 0 });
  }

  function handleLookPointerMove(event: ReactPointerEvent<HTMLElement>) {
    const active = lookPointer.current;
    if (!active || active.pointerId !== event.pointerId) return;
    event.preventDefault();
    const dx = event.clientX - active.x;
    const dy = event.clientY - active.y;
    lookPointer.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    const state = useGameStore.getState();
    if (!state.autopilot) {
      setInput({
        mouseDX: state.input.mouseDX + dx * 1.35,
        mouseDY: state.input.mouseDY + dy * 1.35
      });
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setLookPad({
      x: clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1),
      y: clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1)
    });
  }

  function handleLookPointerUp(event: ReactPointerEvent<HTMLElement>) {
    if (lookPointer.current?.pointerId !== event.pointerId) return;
    event.preventDefault();
    lookPointer.current = null;
    setLookPad({ x: 0, y: 0 });
  }

  function holdInput(key: "firePrimary" | "fireSecondary" | "afterburner") {
    return {
      onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        setInput({ [key]: true });
      },
      onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => {
        event.preventDefault();
        setInput({ [key]: false });
      },
      onPointerCancel: () => setInput({ [key]: false }),
      onPointerLeave: () => setInput({ [key]: false })
    };
  }

  function tapInput(key: "interact" | "cycleTarget" | "toggleMap" | "toggleCamera" | "pause" | "activateUltimate") {
    return (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      setInput({ [key]: true });
    };
  }

  return (
    <div className="touch-flight-controls" data-testid="touch-flight-controls" data-locale={locale}>
      <div
        className="touch-pad touch-throttle-pad"
        data-testid="touch-throttle-pad"
        style={{ "--touch-x": throttlePad.x, "--touch-y": throttlePad.y } as CSSProperties}
        onPointerDown={handleThrottlePointerDown}
        onPointerMove={handleThrottlePointerMove}
        onPointerUp={handleThrottlePointerUp}
        onPointerCancel={resetThrottlePad}
      >
        <span />
      </div>
      <div
        className="touch-pad touch-look-pad"
        data-testid="touch-look-pad"
        style={{ "--touch-x": lookPad.x, "--touch-y": lookPad.y } as CSSProperties}
        onPointerDown={handleLookPointerDown}
        onPointerMove={handleLookPointerMove}
        onPointerUp={handleLookPointerUp}
        onPointerCancel={handleLookPointerUp}
      >
        <span />
      </div>
      <div className="touch-action-cluster touch-action-cluster-left">
        <ShortcutButton shortcut="Shift" className="touch-afterburner" {...holdInput("afterburner")}>BOOST</ShortcutButton>
        <ShortcutButton shortcut="M" onPointerDown={tapInput("toggleMap")} disabled={!!autopilot}>MAP</ShortcutButton>
      </div>
      <div className="touch-action-cluster touch-action-cluster-right">
        <ShortcutButton shortcut="LMB" className="touch-fire-primary" data-testid="touch-fire-primary" {...holdInput("firePrimary")}>FIRE</ShortcutButton>
        <ShortcutButton shortcut="RMB" {...holdInput("fireSecondary")}>MISSILE</ShortcutButton>
        <ShortcutButton shortcut="G" onPointerDown={tapInput("activateUltimate")}>ULT</ShortcutButton>
        <ShortcutButton shortcut="E" onPointerDown={tapInput("interact")}>E</ShortcutButton>
        <ShortcutButton shortcut="Tab" onPointerDown={tapInput("cycleTarget")}>TARGET</ShortcutButton>
        <ShortcutButton shortcut="C" onPointerDown={tapInput("toggleCamera")}>CAM</ShortcutButton>
        <ShortcutButton shortcut="Esc" onPointerDown={tapInput("pause")}>PAUSE</ShortcutButton>
      </div>
    </div>
  );
}

export function SimulationTicker() {
  const tick = useGameStore((state) => state.tick);
  useFrame((_, delta) => tick(Math.min(delta, 0.05)));
  return null;
}
