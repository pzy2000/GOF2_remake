import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useGameStore } from "../../state/gameStore";
import { clamp } from "../../systems/math";

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
      if (state.screen === "economyWatch") {
        if (event.code === "KeyC") {
          event.preventDefault();
          setInput({ toggleCamera: true });
        } else if (event.code === "Escape") {
          event.preventDefault();
          setInput({ pause: true });
        } else if (event.code in keyMap || event.code === "Space" || event.code === "KeyE" || event.code === "KeyM" || event.code === "Tab") {
          event.preventDefault();
        }
        return;
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
      const mapped = keyMap[event.code];
      if (mapped) {
        event.preventDefault();
        setInput({ [mapped]: true });
      }
      if (event.repeat) return;
      if (event.code === "KeyE") setInput({ interact: true });
      if (event.code === "Tab") {
        event.preventDefault();
        setInput({ cycleTarget: true });
      }
      if (event.code === "KeyM") setInput({ toggleMap: true });
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

export function TouchFlightControls() {
  const screen = useGameStore((state) => state.screen);
  const locale = useGameStore((state) => state.locale);
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

  function tapInput(key: "interact" | "cycleTarget" | "toggleMap" | "toggleCamera" | "pause") {
    return (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      setInput({ [key]: true });
    };
  }

  return (
    <div className="touch-flight-controls" data-locale={locale}>
      <div
        className="touch-pad throttle"
        onPointerDown={handleThrottlePointerDown}
        onPointerMove={handleThrottlePointerMove}
        onPointerUp={handleThrottlePointerUp}
        onPointerCancel={resetThrottlePad}
      >
        <span style={{ transform: `translate(${throttlePad.x * 26}px, ${throttlePad.y * 26}px)` }} />
      </div>
      <div
        className="touch-pad look"
        onPointerDown={handleLookPointerDown}
        onPointerMove={handleLookPointerMove}
        onPointerUp={handleLookPointerUp}
        onPointerCancel={handleLookPointerUp}
      >
        <span style={{ transform: `translate(${lookPad.x * 30}px, ${lookPad.y * 30}px)` }} />
      </div>
      <div className="touch-action-cluster left">
        <button {...holdInput("afterburner")}>BOOST</button>
        <button onPointerDown={tapInput("toggleMap")}>MAP</button>
      </div>
      <div className="touch-action-cluster right">
        <button {...holdInput("firePrimary")}>FIRE</button>
        <button {...holdInput("fireSecondary")}>MISSILE</button>
        <button onPointerDown={tapInput("interact")}>E</button>
        <button onPointerDown={tapInput("cycleTarget")}>TARGET</button>
        <button onPointerDown={tapInput("toggleCamera")}>CAM</button>
        <button onPointerDown={tapInput("pause")}>PAUSE</button>
      </div>
    </div>
  );
}

export function SimulationTicker() {
  const tick = useGameStore((state) => state.tick);
  useFrame((_, delta) => tick(Math.min(delta, 0.05)));
  return null;
}
