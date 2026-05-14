import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Html, Line, Stars, useGLTF } from "@react-three/drei";
import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { SPARROW_ULTIMATE_MODEL_ID, planetById, planets, shipById, stationById, systemById, useGameStore } from "../state/gameStore";
import { commodityById, glassWakeProtocol, missionTemplates } from "../data/world";
import type { AsteroidEntity, ConvoyEntity, ExplorationSignalDefinition, FlightEntity, LootEntity, MarketState, NpcInteractionAction, PlanetDefinition, ProjectileEntity, SalvageEntity, StationDefinition, Vec3, VisualEffectEntity } from "../types/game";
import { add, clamp, distance, forwardFromRotation, normalize, scale, sub } from "../systems/math";
import { getOreColor } from "../systems/difficulty";
import { getJumpGatePosition } from "../systems/autopilot";
import { getNavigationTargetCue, getNearestNavigationTarget } from "../systems/navigation";
import type { NavigationCueTone, NavigationTarget } from "../systems/navigation";
import { getIncompleteExplorationSignals, getVisibleStationsForSystem, isExplorationSignalDiscovered } from "../systems/exploration";
import { getExplorationObjectiveSummaryForSignal } from "../systems/explorationObjectives";
import { getStoryObjectiveSummary } from "../systems/story";
import { getEconomyFlightRouteCue } from "../systems/economyRoutes";
import { getMarketEntry, getTradeHints } from "../systems/economy";
import { getPlayerRuntimeEffects } from "../systems/equipment";
import { hasActiveCivilianDistress } from "../state/domains/combatRuntime";
import { defaultFlightTuning, resolveCameraFov, resolveCameraOffset } from "../systems/flightTuning";
import {
  FlightControls as FlightInputControls,
  SimulationTicker as FlightSimulationTicker,
  TouchFlightControls as TouchFlightInputControls
} from "./flight/FlightInputControls";
import { ShortcutButton } from "./ShortcutButton";
import {
  formatCargoContents,
  formatCredits,
  formatDistance,
  formatNumber,
  formatRuntimeText,
  formatTechLevel,
  localizeCommodityName,
  localizeGenericName,
  localizePlanetName,
  localizeStationName,
  localizeSystemName,
  translateDisplayName,
  translateText,
  type Locale
} from "../i18n";

function toThree(position: Vec3): [number, number, number] {
  return [position[0], position[1], position[2]];
}

type ShipModelStatus = {
  kind: "fallback";
  text: string;
};

function FlightControls() {
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

type TouchPadState = {
  x: number;
  y: number;
};

function TouchFlightControls() {
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
      onLostPointerCapture: () => setInput({ [key]: false })
    };
  }

  function tapInput(key: "interact" | "cycleTarget" | "toggleMap" | "toggleCamera" | "pause") {
    return (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      setInput({ [key]: true });
    };
  }

  return (
    <div className="touch-flight-controls" data-testid="touch-flight-controls" aria-label={translateText("Touch flight controls", locale)}>
      <div className="touch-orientation-hint">{translateText("Landscape flight recommended", locale)}</div>
      <section
        className="touch-pad touch-throttle-pad"
        data-testid="touch-throttle-pad"
        aria-label={translateText("Throttle and roll", locale)}
        style={{ "--touch-x": throttlePad.x, "--touch-y": throttlePad.y } as CSSProperties}
        onPointerDown={handleThrottlePointerDown}
        onPointerMove={handleThrottlePointerMove}
        onPointerUp={handleThrottlePointerUp}
        onPointerCancel={handleThrottlePointerUp}
      >
        <span />
      </section>
      <section className="touch-action-cluster touch-action-cluster-left" aria-label={translateText("Flight toggles", locale)}>
        <button type="button" aria-label={translateText("Interact", locale)} onPointerDown={tapInput("interact")}>E</button>
        <button type="button" aria-label={translateText("Cycle target", locale)} onPointerDown={tapInput("cycleTarget")}>TAB</button>
        <button type="button" aria-label={translateText("Open map", locale)} onPointerDown={tapInput("toggleMap")}>MAP</button>
      </section>
      <section
        className="touch-pad touch-look-pad"
        data-testid="touch-look-pad"
        aria-label={translateText("Look and steer", locale)}
        style={{ "--touch-x": lookPad.x, "--touch-y": lookPad.y } as CSSProperties}
        onPointerDown={handleLookPointerDown}
        onPointerMove={handleLookPointerMove}
        onPointerUp={handleLookPointerUp}
        onPointerCancel={handleLookPointerUp}
      >
        <span />
      </section>
      <section className="touch-action-cluster touch-action-cluster-right" aria-label={translateText("Weapons and systems", locale)}>
        <button type="button" className="touch-fire-primary" data-testid="touch-fire-primary" aria-label={translateText("Fire primary weapon", locale)} {...holdInput("firePrimary")}>FIRE</button>
        <button type="button" aria-label={translateText("Fire secondary weapon", locale)} {...holdInput("fireSecondary")}>MSL</button>
        <button type="button" className="touch-afterburner" data-testid="touch-afterburner" aria-label={translateText("Afterburner", locale)} {...holdInput("afterburner")}>BOOST</button>
        <button type="button" aria-label={translateText("Toggle camera", locale)} onPointerDown={tapInput("toggleCamera")}>CAM</button>
        <button type="button" aria-label={translateText("Pause", locale)} onPointerDown={tapInput("pause")}>II</button>
      </section>
    </div>
  );
}

function SimulationTicker() {
  const tick = useGameStore((state) => state.tick);
  useFrame((_, delta) => tick(Math.min(delta, 0.05)));
  return null;
}

function npcForward(ship: FlightEntity): Vec3 {
  const speed = Math.hypot(...ship.velocity);
  return speed > 0.001 ? normalize(ship.velocity) : [0, 0, -1];
}

function directionFromAngles(yaw: number, pitch: number): Vec3 {
  const cosPitch = Math.cos(pitch);
  return [Math.sin(yaw) * cosPitch, Math.sin(pitch), -Math.cos(yaw) * cosPitch];
}

function CameraRig() {
  const { camera } = useThree();
  const screen = useGameStore((state) => state.screen);
  const player = useGameStore((state) => state.player);
  const runtime = useGameStore((state) => state.runtime);
  const economyNpcWatch = useGameStore((state) => state.economyNpcWatch);
  const cameraMode = useGameStore((state) => state.cameraMode);
  const afterburnerHeld = useGameStore((state) => state.input.afterburner);
  useFrame(() => {
    const watchedNpc = economyNpcWatch ? runtime.enemies.find((ship) => ship.id === economyNpcWatch.npcId) : undefined;
    if (screen === "economyWatch" && economyNpcWatch && watchedNpc) {
      const forward = npcForward(watchedNpc);
      const baseYaw = Math.atan2(forward[0], -forward[2]);
      const basePitch = Math.asin(clamp(forward[1], -0.85, 0.85));
      const lookYaw = baseYaw + economyNpcWatch.lookYaw;
      const lookPitch = clamp(basePitch + economyNpcWatch.lookPitch, -0.92, 0.92);
      const lookDirection = directionFromAngles(lookYaw, lookPitch);
      if (economyNpcWatch.cameraMode === "cockpit") {
        const targetPosition = add(add(watchedNpc.position, scale(forward, 20)), [0, 8, 0]);
        camera.position.lerp(new THREE.Vector3(...targetPosition), 0.18);
        camera.lookAt(new THREE.Vector3(...add(targetPosition, scale(lookDirection, 160))));
      } else {
        const targetPosition = add(add(watchedNpc.position, scale(lookDirection, -118)), [0, 42, 0]);
        camera.position.lerp(new THREE.Vector3(...targetPosition), 0.1);
        camera.lookAt(new THREE.Vector3(...add(watchedNpc.position, scale(forward, 90))));
      }
      return;
    }
    const forward = forwardFromRotation(player.rotation);
    const speed = Math.hypot(...player.velocity);
    const afterburning = afterburnerHeld && player.energy > defaultFlightTuning.motion.afterburnerMinEnergy;
    const chaseOffset = resolveCameraOffset(forward, speed, afterburning, cameraMode !== "chase");
    const targetPosition = add(player.position, chaseOffset);
    const hitShake = Math.max(0, defaultFlightTuning.camera.hitShakeDuration - (runtime.clock - player.lastDamageAt));
    const shakeScale = hitShake > 0 ? (hitShake / defaultFlightTuning.camera.hitShakeDuration) * defaultFlightTuning.camera.hitShakeAmplitude : 0;
    const shake: Vec3 = [
      Math.sin(runtime.clock * 43.1) * shakeScale,
      Math.cos(runtime.clock * 37.7) * shakeScale * 0.7,
      Math.sin(runtime.clock * 29.3) * shakeScale * 0.35
    ];
    camera.position.lerp(new THREE.Vector3(...add(targetPosition, shake)), defaultFlightTuning.camera.lerp);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov += (resolveCameraFov(speed, afterburning) - camera.fov) * 0.08;
      camera.updateProjectionMatrix();
    }
    camera.lookAt(new THREE.Vector3(...add(player.position, scale(forward, defaultFlightTuning.camera.lookAhead))));
  });
  return null;
}

function InfiniteSkybox() {
  const currentSystemId = useGameStore((state) => state.currentSystemId);
  const skybox = useGameStore((state) => {
    const system = systemById[currentSystemId];
    return state.assetManifest.systemSkyboxes[system?.skyboxKey ?? currentSystemId] || state.assetManifest.skyboxPanorama || state.assetManifest.nebulaBg;
  });
  const texture = useLoader(THREE.TextureLoader, skybox);
  const { camera } = useThree();
  const skyGroupRef = useRef<THREE.Group | null>(null);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 4;
  useFrame(() => {
    skyGroupRef.current?.position.copy(camera.position);
  });
  return (
    <group ref={skyGroupRef} renderOrder={-1000}>
      <mesh frustumCulled={false} renderOrder={-1000}>
        <sphereGeometry args={[1800, 64, 32]} />
        <meshBasicMaterial map={texture} side={THREE.BackSide} depthWrite={false} depthTest={false} toneMapped={false} />
      </mesh>
      <Stars radius={920} depth={95} count={2400} factor={4.5} saturation={0.36} fade speed={0.1} />
    </group>
  );
}

function SystemStarBackdrop() {
  const currentSystemId = useGameStore((state) => state.currentSystemId);
  const star = systemById[currentSystemId].star;
  const textureUrl = useGameStore((state) => state.assetManifest.starSprites[star.assetKey] || state.assetManifest.nebulaBg);
  const texture = useLoader(THREE.TextureLoader, textureUrl);
  const { camera } = useThree();
  const spriteRef = useRef<THREE.Sprite | null>(null);
  const direction = useMemo(() => new THREE.Vector3(...normalize(star.direction)).normalize(), [star.direction]);
  const starPosition = useMemo(() => new THREE.Vector3(), []);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  useFrame(() => {
    spriteRef.current?.position.copy(starPosition.copy(camera.position).addScaledVector(direction, 1450));
  });
  return (
    <sprite ref={spriteRef} scale={[star.visualSize, star.visualSize, 1]} renderOrder={-900}>
      <spriteMaterial
        map={texture}
        color={star.color}
        transparent
        opacity={0.94}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
      />
    </sprite>
  );
}

type PlayerShipVisual = {
  scale: number;
  engines: Vec3[];
  flameColor: string;
  afterburnerColor: string;
  offset?: Vec3;
  rotation?: [number, number, number];
  emissiveBoost?: boolean;
  fitToMaxDimension?: number;
};

const ULTIMATE_TRANSFORM_SECONDS = 1.8;

const playerShipVisuals: Record<string, PlayerShipVisual> = {
  "sparrow-mk1": { scale: 1, engines: [[-5.5, -1.6, 17], [5.5, -1.6, 17]], flameColor: "#ff8b3d", afterburnerColor: "#66e4ff" },
  "mule-lx": { scale: 0.95, engines: [[-12, -3, 20], [12, -3, 20]], flameColor: "#ffb657", afterburnerColor: "#7ee7ff" },
  "prospector-rig": { scale: 0.94, engines: [[-8, -5, 27], [8, -5, 27]], flameColor: "#ffd166", afterburnerColor: "#fff1a8" },
  "veil-runner": { scale: 0.92, engines: [[-5.2, -2.4, 24], [5.2, -2.4, 24]], flameColor: "#7dd3fc", afterburnerColor: "#e0f7ff" },
  "talon-s": { scale: 0.94, engines: [[-7.5, -2.2, 20], [7.5, -2.2, 20]], flameColor: "#ff5f6d", afterburnerColor: "#ffd3d8" },
  "wayfarer-x": { scale: 0.92, engines: [[-15, -2.6, 27], [15, -2.6, 27]], flameColor: "#a7f3ff", afterburnerColor: "#ffffff" },
  "raptor-v": { scale: 0.96, engines: [[-8, -1.8, 18], [0, -1.2, 20], [8, -1.8, 18]], flameColor: "#ff5f6d", afterburnerColor: "#70f0ff" },
  "bastion-7": { scale: 0.9, engines: [[-14, -4, 22], [0, -3, 24], [14, -4, 22]], flameColor: "#ff7a45", afterburnerColor: "#ffd166" },
  "horizon-ark": { scale: 0.92, engines: [[-16, -2.4, 24], [-5, -2, 26], [5, -2, 26], [16, -2.4, 24]], flameColor: "#8ff7ff", afterburnerColor: "#ffffff" },
  [SPARROW_ULTIMATE_MODEL_ID]: {
    scale: 1,
    fitToMaxDimension: 48,
    engines: [[-12, -18, 11], [12, -18, 11], [-24, 4, 3], [24, 4, 3]],
    flameColor: "#66e4ff",
    afterburnerColor: "#ffffff",
    offset: [0, -4, 1],
    rotation: [0, Math.PI, 0],
    emissiveBoost: true
  }
};

function getRenderableModelBox(object: THREE.Object3D): THREE.Box3 {
  const modelBox = new THREE.Box3();
  const meshBox = new THREE.Box3();
  let hasRenderableBounds = false;
  object.updateWorldMatrix(true, true);
  object.traverse((node) => {
    if (!(node instanceof THREE.Mesh) || !node.geometry) return;
    node.geometry.computeBoundingBox();
    if (!node.geometry.boundingBox) return;
    meshBox.copy(node.geometry.boundingBox).applyMatrix4(node.matrixWorld);
    if (hasRenderableBounds) {
      modelBox.union(meshBox);
    } else {
      modelBox.copy(meshBox);
      hasRenderableBounds = true;
    }
  });
  return hasRenderableBounds ? modelBox : new THREE.Box3().setFromObject(object);
}

function colorForUltimateVertex(boneName: string | undefined, x: number, y: number, z: number, box: THREE.Box3): THREE.Color {
  const size = box.getSize(new THREE.Vector3());
  const nx = size.x > 0 ? (x - box.min.x) / size.x : 0.5;
  const ny = size.y > 0 ? (y - box.min.y) / size.y : 0.5;
  const nz = size.z > 0 ? (z - box.min.z) / size.z : 0.5;
  const side = Math.abs(nx - 0.5);
  const bone = boneName?.toLowerCase() ?? "";
  if (bone.includes("foot") || ny < 0.16) return new THREE.Color("#d83a3a");
  if ((bone.includes("head") || bone.includes("neck") || nz > 0.82) && ny > 0.56) return new THREE.Color("#ffd65a");
  if (side > 0.34 && ny > 0.2) return new THREE.Color("#246bff");
  if (bone.includes("lowerleg") && ny < 0.36) return new THREE.Color("#d83a3a");
  if (bone.includes("upperleg") && side > 0.2) return new THREE.Color("#246bff");
  if ((bone.includes("chest") || bone.includes("torso")) && ny > 0.34 && ny < 0.72 && side < 0.24) return new THREE.Color("#f7fbff");
  return new THREE.Color("#f2f7ff");
}

function applyUltimateVertexColors(mesh: THREE.Mesh): void {
  const geometry = mesh.geometry.clone();
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const position = geometry.getAttribute("position");
  if (!box || !(position instanceof THREE.BufferAttribute)) {
    mesh.geometry = geometry;
    return;
  }
  const skinIndex = geometry.getAttribute("skinIndex");
  const skinWeight = geometry.getAttribute("skinWeight");
  const bones = mesh instanceof THREE.SkinnedMesh ? mesh.skeleton.bones : [];
  const colors = new Float32Array(position.count * 3);
  for (let index = 0; index < position.count; index += 1) {
    let boneName: string | undefined;
    if (skinIndex instanceof THREE.BufferAttribute && skinWeight instanceof THREE.BufferAttribute) {
      let bestWeight = -Infinity;
      let bestBone = 0;
      for (let item = 0; item < skinWeight.itemSize; item += 1) {
        const weight = skinWeight.getComponent(index, item);
        if (weight > bestWeight) {
          bestWeight = weight;
          bestBone = skinIndex.getComponent(index, item);
        }
      }
      boneName = bones[bestBone]?.name;
    }
    const color = colorForUltimateVertex(boneName, position.getX(index), position.getY(index), position.getZ(index), box);
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  mesh.geometry = geometry;
}

class ShipModelBoundary extends Component<{ children: ReactNode; fallback: ReactNode; onFallback: () => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onFallback();
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function boostUltimateMaterial(_material: THREE.Material): THREE.Material {
  return new THREE.MeshBasicMaterial({ color: "#ffffff", vertexColors: true });
}

function GltfPlayerShip({ onLoaded, shipId, url }: { onLoaded: () => void; shipId: string; url: string }) {
  const gltf = useGLTF(url);
  const materialProfile = useGameStore((state) => state.assetManifest.shipMaterialProfiles[shipId]);
  useEffect(() => {
    onLoaded();
  }, [onLoaded]);
  const clone = useMemo(() => {
    const scene = cloneSkeleton(gltf.scene);
    const visual = playerShipVisuals[shipId] ?? playerShipVisuals["sparrow-mk1"];
    const box = getRenderableModelBox(scene);
    const center = box.getCenter(new THREE.Vector3());
    scene.position.sub(center);
    scene.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        if (visual.emissiveBoost) {
          applyUltimateVertexColors(node);
          node.material = Array.isArray(node.material) ? node.material.map(boostUltimateMaterial) : boostUltimateMaterial(node.material);
        } else if (materialProfile && node.material instanceof THREE.MeshStandardMaterial) {
          const material = node.material.clone();
          material.metalness = materialProfile.metalness;
          material.roughness = materialProfile.roughness;
          material.emissive = new THREE.Color(materialProfile.emissiveColor);
          material.emissiveIntensity = 0.08;
          node.material = material;
        }
      }
    });
    return scene;
  }, [gltf.scene, materialProfile, shipId]);
  const visual = playerShipVisuals[shipId] ?? playerShipVisuals["sparrow-mk1"];
  const modelScale = useMemo(() => {
    if (!visual.fitToMaxDimension) return visual.scale;
    const box = getRenderableModelBox(clone);
    const size = box.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z);
    return maxDimension > 0 ? visual.scale * (visual.fitToMaxDimension / maxDimension) : visual.scale;
  }, [clone, visual.fitToMaxDimension, visual.scale]);
  return <primitive object={clone} position={toThree(visual.offset ?? [0, 0, 0])} rotation={visual.rotation} scale={modelScale} />;
}

function GltfRuntimeAsset({ fitToMaxDimension, opacity = 1, url }: { fitToMaxDimension: number; opacity?: number; url: string }) {
  const gltf = useGLTF(url);
  const clone = useMemo(() => {
    const scene = cloneSkeleton(gltf.scene);
    const box = getRenderableModelBox(scene);
    const center = box.getCenter(new THREE.Vector3());
    scene.position.sub(center);
    scene.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        const hadMaterialArray = Array.isArray(node.material);
        const materials: THREE.Material[] = hadMaterialArray ? node.material : [node.material];
        const nextMaterials = materials.map((source) => {
          const material = source.clone();
          if ("transparent" in material && opacity < 1) material.transparent = true;
          if ("opacity" in material) material.opacity = opacity;
          return material;
        });
        node.material = hadMaterialArray ? nextMaterials : nextMaterials[0];
      }
    });
    return scene;
  }, [gltf.scene, opacity]);
  const modelScale = useMemo(() => {
    const box = getRenderableModelBox(clone);
    const size = box.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z);
    return maxDimension > 0 ? fitToMaxDimension / maxDimension : 1;
  }, [clone, fitToMaxDimension]);
  return <primitive object={clone} scale={modelScale} />;
}

function UltimateTransformationFx({ activeUntil, lastActivatedAt }: { activeUntil?: number; lastActivatedAt?: number }) {
  const clock = useGameStore((state) => state.runtime.clock);
  const groupRef = useRef<THREE.Group>(null);
  const active = (activeUntil ?? -Infinity) > clock;
  const blocks = useMemo(
    () =>
      Array.from({ length: 24 }, (_, index) => {
        const angle = index * 1.618;
        const height = -34 + (index % 8) * 10;
        const radius = 70 + (index % 5) * 9;
        return { angle, height, radius, size: 3 + (index % 4) * 0.75 };
      }),
    []
  );

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.38;
  });

  if (!active || lastActivatedAt === undefined) return null;

  const elapsed = Math.max(0, clock - lastActivatedAt);
  const transformProgress = clamp(elapsed / ULTIMATE_TRANSFORM_SECONDS, 0, 1);
  const transforming = transformProgress < 1;
  const pulse = 0.5 + Math.sin(clock * 8.5) * 0.5;

  return (
    <group ref={groupRef}>
      {transforming ? (
        <>
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[18 + transformProgress * 18, 30 + transformProgress * 24, 110, 32, 1, true]} />
            <meshBasicMaterial color="#7df7ff" transparent opacity={(1 - transformProgress) * 0.24} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[28 + transformProgress * 45, 2.2, 8, 72]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={(1 - transformProgress) * 0.72} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>
          {blocks.map((block, index) => {
            const swirl = block.angle + (1 - transformProgress) * 4.8;
            const radius = block.radius * (1 - transformProgress);
            const y = block.height * (1 - transformProgress * 0.86);
            const x = Math.cos(swirl) * radius;
            const z = Math.sin(swirl) * radius;
            return (
              <mesh key={index} position={[x, y, z]} rotation={[clock * 2 + index, block.angle, clock * 1.4]} scale={0.65 + transformProgress * 0.7}>
                <boxGeometry args={[block.size, block.size * 1.5, block.size * 0.8]} />
                <meshBasicMaterial color={index % 3 === 0 ? "#ffffff" : index % 3 === 1 ? "#6ee7ff" : "#2b68ff"} transparent opacity={0.28 + (1 - transformProgress) * 0.46} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
              </mesh>
            );
          })}
          {[-1, 1].map((side) => (
            <Line key={side} points={[[side * 74, -40, 28], [side * 16, 12, -8], [side * 8, 28, -2]]} color="#e9fdff" lineWidth={2.4} transparent opacity={(1 - transformProgress) * 0.72} />
          ))}
        </>
      ) : null}
      <mesh>
        <sphereGeometry args={[34 + pulse * 4, 32, 18]} />
        <meshBasicMaterial color="#72f4ff" transparent opacity={0.08 + pulse * 0.06} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, clock * 0.9]}>
        <torusGeometry args={[40 + pulse * 8, 1.3, 8, 72]} />
        <meshBasicMaterial color="#b9fbff" transparent opacity={0.22 + pulse * 0.18} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 5, -8]}>
        <sphereGeometry args={[6 + pulse * 2.2, 16, 10]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.38 + pulse * 0.22} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      {[-1, 1].map((side) => (
        <Line key={`aura-wing-${side}`} points={[[side * 14, 6, 8], [side * 38, 2, 28], [side * 64, -4, 46]]} color="#83ecff" lineWidth={3.4} transparent opacity={0.24 + pulse * 0.18} />
      ))}
      <pointLight color="#7df7ff" intensity={2.4 + pulse * 2.2 + (transforming ? 4 * (1 - transformProgress) : 0)} distance={260} />
    </group>
  );
}

function ProceduralPlayerShip({ shipId }: { shipId: string }) {
  const materialProfile = useGameStore((state) => state.assetManifest.shipMaterialProfiles[shipId] ?? state.assetManifest.shipMaterialProfiles["sparrow-mk1"]);
  const lodProfile = useGameStore((state) => state.assetManifest.shipLodProfiles[shipId] ?? state.assetManifest.shipLodProfiles.default);
  const segments = lodProfile?.highGeometrySegments ?? 32;
  const color = materialProfile?.baseColor ?? "#cfefff";
  const trimColor = materialProfile?.trimColor ?? "#318ccf";
  const emissiveColor = materialProfile?.emissiveColor ?? "#66e4ff";
  const metalness = materialProfile?.metalness ?? 0.5;
  const roughness = materialProfile?.roughness ?? 0.32;
  const silhouetteScale = lodProfile?.silhouetteScale ?? 1;
  return (
    <group scale={silhouetteScale}>
      <mesh position={[0, 0, -8]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <coneGeometry args={[9, segments, shipId === "raptor-v" ? 3 : 5]} />
        <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} emissive={emissiveColor} emissiveIntensity={0.08} />
      </mesh>
      <mesh position={[0, 1.8, 2]} scale={shipId === "mule-lx" ? [1.8, 0.95, 1.2] : shipId === "bastion-7" ? [1.55, 1.1, 1.25] : [1.05, 0.65, 1]} castShadow>
        <boxGeometry args={[16, 9, 26]} />
        <meshStandardMaterial color={color} metalness={metalness * 0.82} roughness={roughness + 0.06} emissive={emissiveColor} emissiveIntensity={0.06} />
      </mesh>
      <mesh position={[0, 5.2, -8]} castShadow>
        <sphereGeometry args={[4.8, 12, 8]} />
        <meshStandardMaterial color={emissiveColor} metalness={0.2} roughness={0.18} emissive={emissiveColor} emissiveIntensity={0.42} />
      </mesh>
      <mesh position={[0, 0.4, 6]} castShadow>
        <boxGeometry args={shipId === "mule-lx" ? [56, 4, 14] : shipId === "raptor-v" ? [48, 2, 10] : [40, 2.2, 12]} />
        <meshStandardMaterial color={trimColor} metalness={metalness + 0.06} roughness={Math.max(0.18, roughness - 0.04)} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 15, 0.2, -2]} rotation={[0, 0, side * -0.34]} castShadow>
          <boxGeometry args={[6, 1.8, shipId === "horizon-ark" ? 34 : 24]} />
          <meshStandardMaterial color={trimColor} metalness={metalness} roughness={roughness} emissive={emissiveColor} emissiveIntensity={0.05} />
        </mesh>
      ))}
      <mesh position={[0, -0.4, -18]} rotation={[0.24, 0, 0]} castShadow>
        <boxGeometry args={[5, 13, 2.4]} />
        <meshStandardMaterial color={trimColor} metalness={metalness + 0.05} roughness={roughness} />
      </mesh>
    </group>
  );
}

function PlayerEngineFlames({ shipId, afterburning, speed }: { shipId: string; afterburning: boolean; speed: number }) {
  const visual = playerShipVisuals[shipId] ?? playerShipVisuals["sparrow-mk1"];
  const attachmentProfile = useGameStore((state) => state.assetManifest.shipAttachmentProfiles[shipId]);
  const vfxCue = useGameStore((state) => state.assetManifest.vfxCues.afterburner);
  const engines = attachmentProfile?.engineHardpoints ?? visual.engines;
  const flameScale = Math.max(0.65, Math.min(2.8, speed / 120 + (afterburning ? 1.05 : 0)));
  const color = afterburning ? visual.afterburnerColor : visual.flameColor;
  return (
    <>
      {engines.map((position, index) => (
        <group key={`${shipId}-${vfxCue}-engine-${index}`} position={toThree(position as Vec3)}>
          <mesh position={[0, 0, 5.5]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, flameScale]}>
            <coneGeometry args={[3.2, 18, 16]} />
            <meshBasicMaterial color={color} transparent opacity={0.38 + Math.min(0.35, speed / 500)} toneMapped={false} />
          </mesh>
          <pointLight color={color} intensity={afterburning ? 1.1 : 0.45} distance={90} />
        </group>
      ))}
    </>
  );
}

function PlayerShip({ onModelStatus }: { onModelStatus: (status: ShipModelStatus | null) => void }) {
  const player = useGameStore((state) => state.player);
  const locale = useGameStore((state) => state.locale);
  const ultimateAbility = useGameStore((state) => state.ultimateAbility);
  const ultimateActive = useGameStore((state) => state.player.shipId === "sparrow-mk1" && (state.ultimateAbility.activeUntil ?? -Infinity) > state.runtime.clock);
  const renderShipId = ultimateActive ? SPARROW_ULTIMATE_MODEL_ID : player.shipId;
  const modelUrl = useGameStore((state) => state.assetManifest.shipModels[renderShipId]);
  const afterburning = useGameStore((state) => state.input.afterburner && state.player.energy > 12);
  const speed = Math.hypot(...player.velocity);
  const fallback = <ProceduralPlayerShip shipId={renderShipId} />;
  const shipName = translateDisplayName(shipById[player.shipId]?.name ?? player.shipId, locale);

  useEffect(() => {
    if (modelUrl) {
      onModelStatus(null);
    } else {
      onModelStatus({ kind: "fallback", text: shipModelFallbackText(shipName, "missing", locale) });
    }
  }, [locale, modelUrl, onModelStatus, shipName]);

  const markLoaded = useCallback(() => {
    onModelStatus(null);
  }, [onModelStatus]);

  const markFallback = useCallback(() => {
    onModelStatus({ kind: "fallback", text: shipModelFallbackText(shipName, "failed", locale) });
  }, [locale, onModelStatus, shipName]);

  return (
    <group position={toThree(player.position)} rotation={player.rotation}>
      {modelUrl ? (
        <ShipModelBoundary key={renderShipId} fallback={fallback} onFallback={markFallback}>
          <Suspense fallback={fallback}>
            <GltfPlayerShip onLoaded={markLoaded} shipId={renderShipId} url={modelUrl} />
          </Suspense>
        </ShipModelBoundary>
      ) : (
        fallback
      )}
      <UltimateTransformationFx activeUntil={ultimateAbility.activeUntil} lastActivatedAt={ultimateAbility.lastActivatedAt} />
      <PlayerEngineFlames shipId={renderShipId} afterburning={afterburning} speed={speed} />
    </group>
  );
}

function CivilianDistressMarker({ ship, distanceFactor = 12 }: { ship: FlightEntity; distanceFactor?: number }) {
  const clock = useGameStore((state) => state.runtime.clock);
  const locale = useGameStore((state) => state.locale);
  if (!hasActiveCivilianDistress(ship, clock)) return null;
  const pulse = 0.5 + Math.sin(clock * 7.4 + ship.position[0] * 0.02) * 0.5;
  return (
    <>
      <mesh rotation={[Math.PI / 2, 0, clock * 1.1]}>
        <torusGeometry args={[38 + pulse * 7, 1.4, 8, 54]} />
        <meshBasicMaterial color="#ff7a4f" transparent opacity={0.32 + pulse * 0.28} toneMapped={false} />
      </mesh>
      <pointLight color="#ff7a4f" intensity={0.8 + pulse * 0.7} distance={170} />
      <Html center distanceFactor={distanceFactor} className="target-label civilian-distress-label">
        {translateText("DISTRESS", locale)} · {ship.economyStatus ? formatRuntimeText(locale, ship.economyStatus) : translateText("Under attack", locale)}
      </Html>
    </>
  );
}

function FreighterNpcShip({ ship }: { ship: FlightEntity }) {
  const clock = useGameStore((state) => state.runtime.clock);
  const locale = useGameStore((state) => state.locale);
  const textureUrl = useGameStore((state) => state.assetManifest.npcShipTextures.freighter);
  const texture = useLoader(THREE.TextureLoader, textureUrl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.2, 1.2);
  texture.anisotropy = 4;
  const direction = normalize(ship.velocity);
  const yaw = Math.atan2(direction[0], -direction[2]);
  const flashing = clock - ship.lastDamageAt < 0.18 || ship.deathTimer !== undefined;
  const opacity = ship.deathTimer !== undefined ? 0.45 : 1;
  const speed = Math.hypot(...ship.velocity);
  const flameScale = Math.max(0.5, Math.min(1.7, speed / 100));
  const distressActive = hasActiveCivilianDistress(ship, clock);
  return (
    <group position={toThree(ship.position)} rotation={[0, yaw, 0]} scale={ship.deathTimer !== undefined ? 0.86 : 1}>
      <mesh castShadow>
        <boxGeometry args={[30, 15, 58]} />
        <meshStandardMaterial map={texture} color={flashing ? "#ffffff" : "#c9a86a"} metalness={0.44} roughness={0.5} emissive="#1b2b34" emissiveIntensity={flashing ? 0.7 : 0.12} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0, 8.8, 5]} castShadow>
        <boxGeometry args={[18, 1.8, 42]} />
        <meshStandardMaterial map={texture} color="#5f6b73" metalness={0.5} roughness={0.46} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0, 9, -18]} castShadow>
        <boxGeometry args={[17, 8, 16]} />
        <meshStandardMaterial color="#8fb6c8" metalness={0.35} roughness={0.34} emissive="#12384d" emissiveIntensity={0.2} transparent opacity={opacity} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 27, -2, 2]} castShadow>
            <boxGeometry args={[12, 11, 42]} />
            <meshStandardMaterial map={texture} color="#a78455" metalness={0.38} roughness={0.58} transparent opacity={opacity} />
          </mesh>
          <mesh position={[side * 38, 3, -22]} rotation={[0, 0, side * 0.16]} castShadow>
            <boxGeometry args={[22, 3.2, 15]} />
            <meshStandardMaterial color="#d9a442" metalness={0.34} roughness={0.42} emissive="#3a2507" emissiveIntensity={0.16} transparent opacity={opacity} />
          </mesh>
          <mesh position={[side * 28, 7, 14]} rotation={[0.08, 0, side * 0.12]} castShadow>
            <boxGeometry args={[16, 1.4, 26]} />
            <meshStandardMaterial color="#44515b" metalness={0.6} roughness={0.38} transparent opacity={opacity} />
          </mesh>
          <mesh position={[side * 13, -5, 31]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[4.4, 5.8, 7, 18]} />
            <meshStandardMaterial color="#242b31" metalness={0.78} roughness={0.24} transparent opacity={opacity} />
          </mesh>
          <pointLight position={[side * 34, 4, -18]} color={side < 0 ? "#ff6b6b" : "#64e4ff"} intensity={0.32} distance={90} />
        </group>
      ))}
      <mesh position={[0, -4, 35]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, flameScale]}>
        <coneGeometry args={[5.8, 20, 16]} />
        <meshBasicMaterial color="#6ee7ff" transparent opacity={0.32} toneMapped={false} />
      </mesh>
      <CivilianDistressMarker ship={ship} distanceFactor={13} />
      {!distressActive ? (
        <Html center distanceFactor={13} className="target-label npc-label">
          {ship.economyStatus ? formatRuntimeText(locale, ship.economyStatus) : `${localizeGenericName("FREIGHTER", locale)} · ${Math.round(ship.hull)}/${ship.maxHull}`}
        </Html>
      ) : null}
    </group>
  );
}

function DroneNpcShip({ ship }: { ship: FlightEntity }) {
  const clock = useGameStore((state) => state.runtime.clock);
  const locale = useGameStore((state) => state.locale);
  const direction = normalize(ship.velocity);
  const yaw = Math.atan2(direction[0], -direction[2]);
  const pulse = 0.5 + Math.sin(clock * 7.2 + ship.position[0] * 0.02) * 0.5;
  const flashing = clock - ship.lastDamageAt < 0.18 || ship.deathTimer !== undefined;
  const opacity = ship.deathTimer !== undefined ? 0.42 : 1;
  const scale = ship.deathTimer !== undefined ? 0.78 : ship.boss ? 1.34 : 1;
  const modelUrl = useGameStore((state) => state.assetManifest.enemyShipModels[ship.id]);
  const fallbackHull = (
    <>
      <mesh castShadow rotation={[clock * 1.2, clock * 0.4, 0]}>
        <octahedronGeometry args={[ship.boss ? 19 + pulse * 4.2 : 14 + pulse * 2.8, 1]} />
        <meshStandardMaterial color={flashing ? "#ffffff" : ship.boss ? "#ff7db5" : "#8ff7ff"} metalness={0.48} roughness={0.24} emissive={ship.boss ? "#ff2f5f" : "#2de4ff"} emissiveIntensity={flashing ? 1.2 : ship.boss ? 0.74 + pulse * 0.42 : 0.45 + pulse * 0.3} transparent opacity={opacity} />
      </mesh>
    </>
  );
  return (
    <group position={toThree(ship.position)} rotation={[0, yaw, 0]} scale={scale}>
      {modelUrl ? (
        <ShipModelBoundary fallback={fallbackHull} onFallback={() => undefined}>
          <Suspense fallback={fallbackHull}>
            <GltfRuntimeAsset fitToMaxDimension={ship.boss ? 106 : 64} opacity={opacity} url={modelUrl} />
          </Suspense>
        </ShipModelBoundary>
      ) : (
        fallbackHull
      )}
      {flashing && modelUrl ? (
        <mesh>
          <sphereGeometry args={[ship.boss ? 34 : 22, 18, 12]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.24} toneMapped={false} />
        </mesh>
      ) : null}
      <mesh rotation={[Math.PI / 2, 0, clock * 1.6]}>
        <torusGeometry args={[ship.boss ? 36 + pulse * 8 : 25 + pulse * 4, ship.boss ? 2.2 : 1.6, 8, 42]} />
        <meshBasicMaterial color={ship.boss ? "#ffd166" : "#ff9bd5"} transparent opacity={(0.28 + pulse * 0.3) * opacity} toneMapped={false} />
      </mesh>
      {ship.boss ? (
        <mesh rotation={[Math.PI / 2, 0, -clock * 0.9]}>
          <torusGeometry args={[52 + pulse * 10, 1.4, 8, 56]} />
          <meshBasicMaterial color="#ff4e5f" transparent opacity={(0.22 + pulse * 0.22) * opacity} toneMapped={false} />
        </mesh>
      ) : null}
      {[0, 1, 2].map((index) => {
        const angle = index * ((Math.PI * 2) / 3) + clock * 0.8;
        return (
          <mesh key={index} position={[Math.cos(angle) * 22, Math.sin(angle) * 8, Math.sin(angle) * 22]}>
            <sphereGeometry args={[3.2 + pulse * 1.4, 10, 8]} />
            <meshBasicMaterial color={index === 1 ? "#ff9bd5" : "#9bffe8"} transparent opacity={0.68 * opacity} toneMapped={false} />
          </mesh>
        );
      })}
      <pointLight color={ship.boss ? "#ff9bd5" : "#9bffe8"} intensity={ship.boss ? 1.8 + pulse * 1.8 : 1.1 + pulse * 1.1} distance={ship.boss ? 260 : 180} />
      {ship.boss ? (
        <Html center distanceFactor={12} className="target-label boss-label">
          {localizeGenericName("BOSS", locale)} · {translateDisplayName(ship.name, locale).toUpperCase()}
        </Html>
      ) : ship.storyTarget ? (
        <Html center distanceFactor={12} className="target-label story-target-label">
          {translateDisplayName(ship.name, locale).toUpperCase()}
        </Html>
      ) : null}
    </group>
  );
}

function RelayNpcCore({ ship }: { ship: FlightEntity }) {
  const clock = useGameStore((state) => state.runtime.clock);
  const locale = useGameStore((state) => state.locale);
  const pulse = 0.5 + Math.sin(clock * 4.8 + ship.position[2] * 0.01) * 0.5;
  const flashing = clock - ship.lastDamageAt < 0.18 || ship.deathTimer !== undefined;
  const opacity = ship.deathTimer !== undefined ? 0.45 : 1;
  return (
    <group position={toThree(ship.position)} scale={ship.deathTimer !== undefined ? 0.86 : 1}>
      <mesh castShadow rotation={[0.2, clock * 0.35, 0.4]}>
        <icosahedronGeometry args={[22, 1]} />
        <meshStandardMaterial color={flashing ? "#ffffff" : "#c7b8ff"} metalness={0.55} roughness={0.28} emissive="#5b39ff" emissiveIntensity={flashing ? 1.2 : 0.38 + pulse * 0.32} transparent opacity={opacity} />
      </mesh>
      {[0, 1, 2].map((index) => (
        <mesh key={index} rotation={[index === 0 ? Math.PI / 2 : 0, index === 1 ? Math.PI / 2 : 0, clock * (0.35 + index * 0.12)]}>
          <torusGeometry args={[42 + pulse * 6 + index * 10, 1.6, 8, 56]} />
          <meshBasicMaterial color={index === 1 ? "#ff9bd5" : "#6ee7ff"} transparent opacity={(0.24 + pulse * 0.18) * opacity} toneMapped={false} />
        </mesh>
      ))}
      <Line points={[[-62, 0, 0], [0, 0, 0], [62, 0, 0]]} color="#9bffe8" lineWidth={1.3} transparent opacity={0.34 + pulse * 0.32} />
      <Line points={[[0, -48, 0], [0, 0, 0], [0, 48, 0]]} color="#ff9bd5" lineWidth={1.1} transparent opacity={0.26 + pulse * 0.26} />
      <pointLight color="#9b7bff" intensity={1.3 + pulse * 1.4} distance={230} />
      <Html center distanceFactor={13} className="target-label story-target-label story-relay-label">
        {localizeGenericName(ship.storyTargetKind === "jammer" ? "JAMMER" : "RELAY", locale)} · {Math.round(ship.hull)}/{ship.maxHull}
      </Html>
    </group>
  );
}

function NpcRoleHull({
  body,
  clock,
  color,
  flashing,
  opacity,
  role,
  ship
}: {
  body: { cone: [number, number, number]; wing: [number, number, number]; offset: number; tail: string };
  clock: number;
  color: string;
  flashing: boolean;
  opacity: number;
  role: FlightEntity["role"];
  ship: FlightEntity;
}) {
  const hullColor = flashing ? "#ffffff" : color;
  const roleGlow = role === "pirate" ? "#ff5f6d" : role === "smuggler" ? "#ff9b52" : role === "miner" ? "#ffd166" : role === "patrol" ? "#64d7ff" : "#8ff7ff";
  return (
    <>
      <mesh castShadow position={[0, 0, -7]}>
        <coneGeometry args={body.cone} />
        <meshStandardMaterial color={hullColor} metalness={0.48} roughness={0.36} emissive={color} emissiveIntensity={flashing ? 0.85 : ship.boss ? 0.32 : 0.12} transparent opacity={opacity} />
      </mesh>
      <mesh castShadow position={[0, 0.4, body.offset + 1]} scale={role === "miner" || role === "trader" ? [1.18, 1.08, 1.18] : [1, 1, 1]}>
        <boxGeometry args={[body.wing[0] * 0.42, Math.max(6, body.wing[1] * 2.2), 30]} />
        <meshStandardMaterial color={body.tail} metalness={0.5} roughness={0.42} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0, 4.3, -8]} scale={role === "pirate" ? [0.9, 0.32, 0.9] : [1, 0.38, 1.1]}>
        <sphereGeometry args={[3.8, 18, 10]} />
        <meshStandardMaterial color="#86ddff" metalness={0.16} roughness={0.1} emissive="#226b8f" emissiveIntensity={0.28} transparent opacity={opacity} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * body.wing[0] * 0.38, -0.4, body.offset]} rotation={[0, side * (role === "pirate" ? 0.36 : -0.16), side * (role === "courier" ? 0.22 : 0.12)]} castShadow>
            <boxGeometry args={body.wing} />
            <meshStandardMaterial color={body.tail} metalness={0.42} roughness={0.44} transparent opacity={opacity} />
          </mesh>
          <mesh position={[side * 8.4, -2.1, 15]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[2.2, 3.2, 5, 16]} />
            <meshStandardMaterial color="#1b222a" metalness={0.84} roughness={0.2} transparent opacity={opacity} />
          </mesh>
          <mesh position={[side * 5.8, 1.4, -16]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.8, 1, 18, 10]} />
            <meshStandardMaterial color="#202833" metalness={0.78} roughness={0.24} transparent opacity={opacity} />
          </mesh>
          <pointLight position={[side * 9, 1.2, 4]} color={roleGlow} intensity={0.18} distance={80} />
        </group>
      ))}
      {role === "pirate" || role === "smuggler" ? (
        <>
          <mesh position={[-8, 1.2, -5]} rotation={[0, 0, 0.72]}>
            <boxGeometry args={[3, 1.4, 20]} />
            <meshStandardMaterial color={role === "pirate" ? "#711f2d" : "#3a263f"} metalness={0.42} roughness={0.4} emissive="#23050a" />
          </mesh>
          <mesh position={[8, 1.2, -5]} rotation={[0, 0, -0.72]}>
            <boxGeometry args={[3, 1.4, 20]} />
            <meshStandardMaterial color={role === "pirate" ? "#711f2d" : "#3a263f"} metalness={0.42} roughness={0.4} emissive="#23050a" />
          </mesh>
        </>
      ) : null}
      {role === "patrol" ? (
        <>
          <mesh position={[0, 5.3, -7]}>
            <boxGeometry args={[4.2, 7.4, 2.2]} />
            <meshStandardMaterial color="#84d8ff" metalness={0.4} roughness={0.35} emissive="#1b719d" emissiveIntensity={0.28} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, clock * 0.8]}>
            <torusGeometry args={[23, 1.1, 8, 42]} />
            <meshBasicMaterial color="#64e4ff" transparent opacity={0.22} toneMapped={false} />
          </mesh>
        </>
      ) : null}
      {role === "miner" ? (
        <>
          <mesh position={[0, -1.5, -23]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[2.6, 3.4, 16, 10]} />
            <meshStandardMaterial color="#d8a23b" metalness={0.56} roughness={0.38} emissive="#53360b" emissiveIntensity={0.22} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, clock * 0.4]}>
            <torusGeometry args={[19, 1.3, 8, 36]} />
            <meshBasicMaterial color="#ffd166" transparent opacity={0.18} toneMapped={false} />
          </mesh>
        </>
      ) : null}
      {role === "trader" ? (
        <>
          <mesh position={[-13, -1, -1]}>
            <boxGeometry args={[6, 6, 15]} />
            <meshStandardMaterial color="#6b522c" metalness={0.32} roughness={0.58} />
          </mesh>
          <mesh position={[13, -1, -1]}>
            <boxGeometry args={[6, 6, 15]} />
            <meshStandardMaterial color="#6b522c" metalness={0.32} roughness={0.58} />
          </mesh>
        </>
      ) : null}
    </>
  );
}

function NpcShip({ ship }: { ship: FlightEntity }) {
  const clock = useGameStore((state) => state.runtime.clock);
  const locale = useGameStore((state) => state.locale);
  const miningTarget = useGameStore((state) =>
    ship.economyTaskKind === "mining" && ship.economyTargetId
      ? state.runtime.asteroids.find((asteroid) => asteroid.id === ship.economyTargetId)
      : undefined
  );
  if (ship.role === "freighter") return <FreighterNpcShip ship={ship} />;
  if (ship.role === "drone") return <DroneNpcShip ship={ship} />;
  if (ship.role === "relay") return <RelayNpcCore ship={ship} />;
  const color = ship.boss ? "#ff2f5f" : ship.role === "pirate" ? "#ff4e5f" : ship.role === "patrol" ? "#5dc8ff" : ship.role === "smuggler" ? "#ff9b52" : ship.role === "courier" ? "#9bffe8" : ship.role === "miner" ? "#ffd166" : "#f6c96d";
  const direction = normalize(ship.velocity);
  const yaw = Math.atan2(direction[0], -direction[2]);
  const flashing = clock - ship.lastDamageAt < 0.18 || ship.deathTimer !== undefined;
  const speed = Math.hypot(...ship.velocity);
  const flameScale = Math.max(0.45, Math.min(1.45, speed / 115));
  const combatPulse = 0.5 + Math.sin(clock * 5.4 + ship.position[0] * 0.01) * 0.5;
  const distressActive = hasActiveCivilianDistress(ship, clock);
  const body =
    ship.role === "pirate"
      ? { cone: [7, 25, 3] as [number, number, number], wing: [26, 1.8, 8] as [number, number, number], offset: 6, tail: "#3a111c" }
      : ship.role === "patrol"
        ? { cone: [7.5, 23, 4] as [number, number, number], wing: [22, 2.4, 12] as [number, number, number], offset: 5, tail: "#12344b" }
        : ship.role === "courier"
          ? { cone: [6.5, 24, 5] as [number, number, number], wing: [34, 1.8, 8] as [number, number, number], offset: 3, tail: "#1f4a42" }
          : ship.role === "miner"
            ? { cone: [9.5, 18, 7] as [number, number, number], wing: [24, 4.2, 18] as [number, number, number], offset: 4, tail: "#5a4520" }
            : ship.role === "smuggler"
              ? { cone: [7, 23, 4] as [number, number, number], wing: [30, 2.2, 9] as [number, number, number], offset: 5, tail: "#4a2418" }
              : { cone: [9, 20, 6] as [number, number, number], wing: [28, 3.8, 15] as [number, number, number], offset: 3, tail: "#4a3820" };
  return (
    <>
      {miningTarget ? (
        <Line points={[ship.position, miningTarget.position]} color={ship.economyCommodityId ? getOreColor(ship.economyCommodityId) : "#ffd166"} lineWidth={2.4} transparent opacity={0.72} />
      ) : null}
      <group position={toThree(ship.position)} rotation={[0, yaw, 0]} scale={ship.deathTimer !== undefined ? 0.82 : ship.boss ? 1.28 : 1}>
        <NpcRoleHull body={body} clock={clock} color={color} flashing={flashing} opacity={ship.deathTimer !== undefined ? 0.45 : 1} role={ship.role} ship={ship} />
        {ship.boss ? (
          <>
            <mesh rotation={[Math.PI / 2, 0, clock * 0.65]}>
              <torusGeometry args={[30 + combatPulse * 6, 1.5, 8, 52]} />
              <meshBasicMaterial color="#ffdf6e" transparent opacity={0.38 + combatPulse * 0.28} toneMapped={false} />
            </mesh>
            <pointLight color="#ff4e5f" intensity={1.1 + combatPulse * 0.9} distance={210} />
          </>
        ) : ship.supportWing ? (
          <mesh rotation={[Math.PI / 2, 0, clock * 0.9]}>
            <torusGeometry args={[24 + combatPulse * 3, 1.2, 8, 42]} />
            <meshBasicMaterial color="#64e4ff" transparent opacity={0.3 + combatPulse * 0.22} toneMapped={false} />
          </mesh>
        ) : null}
        <mesh position={[0, -1.4, 13]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, flameScale]}>
          <coneGeometry args={[ship.role === "trader" ? 4.2 : 3, 13, 12]} />
          <meshBasicMaterial color={ship.role === "pirate" ? "#ff5f6d" : "#64e4ff"} transparent opacity={0.36} toneMapped={false} />
        </mesh>
        <CivilianDistressMarker ship={ship} />
        {!distressActive && ship.economyStatus ? (
          <Html center distanceFactor={12} className="target-label npc-label">
            {formatRuntimeText(locale, ship.economyStatus)}
          </Html>
        ) : ship.boss ? (
          <Html center distanceFactor={12} className="target-label boss-label">
            {localizeGenericName("BOSS", locale)} · {translateDisplayName(ship.name, locale).toUpperCase()}
          </Html>
        ) : ship.storyTarget ? (
          <Html center distanceFactor={12} className="target-label story-target-label">
            {ship.elite ? `${localizeGenericName("ELITE", locale)} · ` : ""}{translateDisplayName(ship.name, locale).toUpperCase()}
          </Html>
        ) : ship.supportWing ? (
          <Html center distanceFactor={12} className="target-label support-label">
            {localizeGenericName("SUPPORT WING", locale)}
          </Html>
        ) : null}
      </group>
    </>
  );
}

function ConvoyShip({ convoy }: { convoy: ConvoyEntity }) {
  const clock = useGameStore((state) => state.runtime.clock);
  const locale = useGameStore((state) => state.locale);
  const direction = normalize(convoy.velocity);
  const yaw = Math.atan2(direction[0], -direction[2]);
  const healthRatio = convoy.hull / convoy.maxHull;
  const status = convoy.status ?? "en-route";
  const pulse = 0.5 + Math.sin(clock * 6.2 + convoy.position[2] * 0.01) * 0.5;
  return (
    <group position={toThree(convoy.position)} rotation={[0, yaw, 0]}>
      <mesh>
        <boxGeometry args={[34, 12, 42]} />
        <meshStandardMaterial color={status === "distress" ? "#ffb657" : "#c9a86a"} metalness={0.35} roughness={0.48} emissive={status === "distress" || healthRatio < 0.35 ? "#5f1d14" : "#1d342f"} emissiveIntensity={status === "distress" ? 0.36 : 0.18} />
      </mesh>
      <mesh position={[-25, -2, 0]}>
        <boxGeometry args={[10, 9, 34]} />
        <meshStandardMaterial color="#65717b" metalness={0.4} roughness={0.44} />
      </mesh>
      <mesh position={[25, -2, 0]}>
        <boxGeometry args={[10, 9, 34]} />
        <meshStandardMaterial color="#65717b" metalness={0.4} roughness={0.44} />
      </mesh>
      <mesh position={[0, -2, 26]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[5, 18, 12]} />
        <meshBasicMaterial color="#6ee7ff" transparent opacity={0.32} toneMapped={false} />
      </mesh>
      {status !== "en-route" ? (
        <mesh rotation={[Math.PI / 2, 0, clock * 0.7]}>
          <torusGeometry args={[46 + pulse * 6, 1.3, 8, 52]} />
          <meshBasicMaterial color={status === "distress" ? "#ff4e5f" : "#ffd166"} transparent opacity={0.26 + pulse * 0.26} toneMapped={false} />
        </mesh>
      ) : null}
      <Html center distanceFactor={12} className={`target-label ${status === "distress" ? "convoy-distress-label" : "convoy-label"}`}>
        {localizeGenericName("ESCORT", locale)} · {convoyStatusLabel(status, locale)} · {Math.round(convoy.hull)}/{convoy.maxHull}
      </Html>
    </group>
  );
}

function SalvageCrate({ salvage }: { salvage: SalvageEntity }) {
  const locale = useGameStore((state) => state.locale);
  return (
    <group position={toThree(salvage.position)}>
      <mesh rotation={[0.4, 0.2, 0.6]}>
        <boxGeometry args={[22, 16, 18]} />
        <meshStandardMaterial color="#9b7bff" emissive="#4c2eb0" emissiveIntensity={0.45} metalness={0.36} roughness={0.42} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[38, 1.5, 8, 42]} />
        <meshBasicMaterial color="#eaffff" transparent opacity={0.5} toneMapped={false} />
      </mesh>
      <pointLight color="#9b7bff" intensity={0.9} distance={150} />
      <Html center distanceFactor={10} className="target-label">
        {localizeGenericName("SALVAGE", locale)} · E
      </Html>
    </group>
  );
}

function StationModel() {
  const currentSystemId = useGameStore((state) => state.currentSystemId);
  const knownPlanetIds = useGameStore((state) => state.knownPlanetIds);
  const explorationState = useGameStore((state) => state.explorationState);
  const systemStations = getVisibleStationsForSystem(currentSystemId, explorationState).filter((station) => knownPlanetIds.includes(station.planetId));
  return (
    <>
      {systemStations.map((station) => (
        <StationGeometry key={station.id} station={station} />
      ))}
    </>
  );
}

function ExplorationSignalMarker({ signal }: { signal: ExplorationSignalDefinition }) {
  const clock = useGameStore((state) => state.runtime.clock);
  const locale = useGameStore((state) => state.locale);
  const explorationState = useGameStore((state) => state.explorationState);
  const playerEquipment = useGameStore((state) => state.player.equipment);
  const activeScan = useGameStore((state) => state.runtime.explorationScan);
  const discovered = isExplorationSignalDiscovered(signal.id, explorationState);
  const scanning = activeScan?.signalId === signal.id;
  const summary = getExplorationObjectiveSummaryForSignal(signal.id, explorationState, { activeScanSignalId: activeScan?.signalId, playerEquipment });
  const pulse = 0.5 + Math.sin(clock * (scanning ? 5.2 : 2.6) + signal.position[0] * 0.01) * 0.5;
  const color = signal.kind === "wreck" ? "#ffd166" : signal.kind === "cache" ? "#74e08d" : signal.kind === "event" ? "#ff9bd5" : "#8fe9ff";
  return (
    <group position={toThree(signal.position)}>
      {signal.kind === "wreck" ? (
        <>
          {[-1, 0, 1].map((offset) => (
            <mesh key={offset} position={[offset * 24, offset * 5, -offset * 16]} rotation={[0.5 + offset * 0.2, clock * 0.08 + offset, 0.3]}>
              <boxGeometry args={[28 - Math.abs(offset) * 5, 10, 16]} />
              <meshStandardMaterial color="#6b5a4b" emissive="#4f2b17" emissiveIntensity={0.24} metalness={0.44} roughness={0.58} />
            </mesh>
          ))}
        </>
      ) : signal.kind === "cache" ? (
        <mesh rotation={[0.4, clock * 0.25, 0.2]}>
          <boxGeometry args={[26, 22, 20]} />
          <meshStandardMaterial color="#617c72" emissive="#1f7a5f" emissiveIntensity={0.36} metalness={0.46} roughness={0.38} />
        </mesh>
      ) : (
        <mesh rotation={[clock * 0.4, clock * 0.2, 0]}>
          <octahedronGeometry args={[20 + pulse * 5, 0]} />
          <meshBasicMaterial color={color} transparent opacity={0.42 + pulse * 0.28} toneMapped={false} />
        </mesh>
      )}
      <mesh rotation={[Math.PI / 2, 0, clock * (0.32 + pulse * 0.08)]}>
        <torusGeometry args={[58 + pulse * 10, 1.8, 8, 54]} />
        <meshBasicMaterial color={color} transparent opacity={0.24 + pulse * 0.3} toneMapped={false} />
      </mesh>
      <Line points={[[-48, 0, 0], [0, 0, 0], [48, 0, 0]]} color={color} lineWidth={1.2} transparent opacity={0.28 + pulse * 0.32} />
      <pointLight color={color} intensity={0.7 + pulse * 0.8} distance={220} />
      <Html center distanceFactor={11} className="target-label exploration-label">
        <b>{scanning ? localizeGenericName("SCANNING", locale) : discovered ? translateText(signal.title, locale).toUpperCase() : translateText(signal.maskedTitle, locale).toUpperCase()}</b>
        {summary ? <small>{translateText("Quiet Signals", locale)} {summary.completedCount}/{summary.totalCount}</small> : null}
        {summary?.status === "equipment-locked" && summary.requiredEquipmentLabel ? <small>{translateText("Requires", locale)} {summary.requiredEquipmentLabel}</small> : null}
      </Html>
    </group>
  );
}

function PlanetBackdrops() {
  const currentSystemId = useGameStore((state) => state.currentSystemId);
  const knownPlanetIds = useGameStore((state) => state.knownPlanetIds);
  const systemPlanets = planets.filter((planet) => planet.systemId === currentSystemId);
  return (
    <>
      {systemPlanets.map((planet) =>
        knownPlanetIds.includes(planet.id) ? <PlanetModel key={planet.id} planet={planet} /> : <UnknownPlanetBeacon key={planet.id} planet={planet} />
      )}
    </>
  );
}

function planetVisualProfileKey(planet: PlanetDefinition) {
  const text = `${planet.type} ${planet.description}`.toLowerCase();
  const rocky = /moon|dwarf|rubble|crater|ash|dust|iron|bunker|refinery/.test(text);
  const volatile = /ocean|storm|temperate|capital|gas|ice|pearl|crystal/.test(text);
  return volatile ? "volatile" : rocky ? "rocky" : "default";
}

function PlanetModel({ planet }: { planet: PlanetDefinition }) {
  const textureUrl = useGameStore((state) => state.assetManifest.planetTextures[planet.textureKey] || state.assetManifest.nebulaBg);
  const profile = useGameStore((state) =>
    state.assetManifest.planetVisualProfiles[planet.id] ??
    state.assetManifest.planetVisualProfiles[planetVisualProfileKey(planet)] ??
    state.assetManifest.planetVisualProfiles.default
  );
  const playerPosition = useGameStore((state) => state.player.position);
  const clock = useGameStore((state) => state.runtime.clock);
  const locale = useGameStore((state) => state.locale);
  const texture = useLoader(THREE.TextureLoader, textureUrl);
  const distant = distance(playerPosition, planet.position) > profile.farDistance;
  const segments = distant ? profile.farSegments : profile.nearSegments;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 4;
  return (
    <group position={toThree(planet.position)}>
      <mesh rotation={[0, clock * profile.rotationSpeed + planet.radius * 0.0007, 0]}>
        <sphereGeometry args={[planet.radius, segments[0], segments[1]]} />
        <meshStandardMaterial map={texture} roughness={0.94} metalness={0.02} emissive="#01030a" emissiveIntensity={0.018} />
      </mesh>
      <mesh rotation={[0, -clock * 0.007, 0]}>
        <sphereGeometry args={[planet.radius * 1.012, Math.max(24, segments[0] - 24), Math.max(12, segments[1] - 12)]} />
        <meshStandardMaterial color={profile.cloudColor} transparent opacity={profile.cloudOpacity} roughness={1} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[planet.radius * 1.028, Math.max(24, segments[0] - 32), Math.max(12, segments[1] - 16)]} />
        <meshBasicMaterial color={planet.atmosphereColor} transparent opacity={profile.hazeOpacity} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      {profile.ringed ? (
        <group rotation={[Math.PI / 2.35, 0.18, clock * 0.002]}>
          <mesh>
            <torusGeometry args={[planet.radius * 1.38, Math.max(1.8, planet.radius * 0.01), 10, 128]} />
            <meshBasicMaterial color={profile.ringColor} transparent opacity={0.18} depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh>
            <torusGeometry args={[planet.radius * 1.58, Math.max(1.2, planet.radius * 0.006), 8, 128]} />
            <meshBasicMaterial color={planet.atmosphereColor} transparent opacity={0.1} depthWrite={false} toneMapped={false} />
          </mesh>
        </group>
      ) : null}
      {profile.cityLightIntensity > 0 ? (
        <mesh rotation={[0, clock * profile.rotationSpeed * 1.06 + 0.8, 0]}>
          <torusGeometry args={[planet.radius * 0.72, Math.max(1.2, planet.radius * 0.006), 8, 96]} />
          <meshBasicMaterial color={profile.cityLightColor} transparent opacity={profile.cityLightIntensity} depthWrite={false} toneMapped={false} />
        </mesh>
      ) : null}
      <pointLight color={planet.atmosphereColor} intensity={0.42} distance={planet.radius * profile.rimDistanceMultiplier} />
      <Html center distanceFactor={22} className="planet-label" position={[0, planet.radius * 0.72, 0]}>
        {localizePlanetName(planet.id, locale, planet.name)}
      </Html>
    </group>
  );
}

function UnknownPlanetBeacon({ planet }: { planet: PlanetDefinition }) {
  const clock = useGameStore((state) => state.runtime.clock);
  const locale = useGameStore((state) => state.locale);
  const pulse = 0.5 + Math.sin(clock * 3.4 + planet.radius) * 0.5;
  return (
    <group position={toThree(planet.beaconPosition)}>
      <mesh rotation={[Math.PI / 2, 0, clock * 0.8]}>
        <torusGeometry args={[52 + pulse * 8, 2.2, 8, 42]} />
        <meshBasicMaterial color="#f6c96d" transparent opacity={0.28 + pulse * 0.24} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[12 + pulse * 4, 14, 8]} />
        <meshBasicMaterial color="#fff2c5" transparent opacity={0.35 + pulse * 0.35} toneMapped={false} />
      </mesh>
      <pointLight color="#ffd166" intensity={0.8 + pulse * 0.8} distance={220} />
      <Html center distanceFactor={11} className="target-label">
        {localizeGenericName("UNKNOWN BEACON", locale)}
      </Html>
    </group>
  );
}

function JumpGateModel() {
  const currentSystemId = useGameStore((state) => state.currentSystemId);
  const autopilot = useGameStore((state) => state.autopilot);
  const clock = useGameStore((state) => state.runtime.clock);
  const locale = useGameStore((state) => state.locale);
  const gatePosition = getJumpGatePosition(currentSystemId);
  const active =
    autopilot?.originSystemId === currentSystemId &&
    (autopilot.phase === "to-origin-gate" || autopilot.phase === "gate-activation" || autopilot.phase === "wormhole");
  const spool = active && autopilot?.phase === "gate-activation" ? Math.min(1, autopilot.timer / 2.4) : active ? 0.35 : 0;
  const pulse = 0.5 + Math.sin(clock * (active ? 8 : 2.2)) * 0.5;
  return (
    <group position={toThree(gatePosition)}>
      <group rotation={[0, 0, clock * (active ? 0.9 + spool : 0.18)]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[90, 5.8, 14, 96]} />
          <meshStandardMaterial color="#4f6776" emissive="#1f9aff" emissiveIntensity={0.18 + spool * 0.7} metalness={0.76} roughness={0.22} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[128, 3.4, 8, 96]} />
          <meshStandardMaterial color="#273645" emissive="#8f7bff" emissiveIntensity={0.24 + spool * 0.55} metalness={0.78} roughness={0.26} />
        </mesh>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => {
          const angle = index * (Math.PI / 4);
          return (
            <group key={index} position={[Math.cos(angle) * 112, Math.sin(angle) * 112, 0]} rotation={[0, 0, angle]}>
              <mesh>
                <boxGeometry args={[52, 10, 15]} />
                <meshStandardMaterial color="#52677a" metalness={0.72} roughness={0.24} emissive="#10243b" emissiveIntensity={0.16} />
              </mesh>
              <mesh position={[22, 0, 0]}>
                <boxGeometry args={[8, 18, 20]} />
                <meshStandardMaterial color="#26313d" metalness={0.82} roughness={0.24} emissive="#0b1624" />
              </mesh>
            </group>
          );
        })}
      </group>
      <mesh rotation={[Math.PI / 2, 0, -clock * 0.22]}>
        <torusGeometry args={[55 + spool * 16, 1.4, 8, 96]} />
        <meshBasicMaterial color="#73f0ff" transparent opacity={0.22 + spool * 0.28} toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[18 + pulse * 6 + spool * 16, 28, 16]} />
        <meshBasicMaterial color={spool > 0.82 ? "#ffffff" : "#73f0ff"} transparent opacity={0.32 + spool * 0.42} toneMapped={false} />
      </mesh>
      <Line points={[[-170, 0, 160], [0, 0, 0], [170, 0, 160]]} color="#62d9ff" lineWidth={1.4 + spool * 2.2} transparent opacity={0.18 + spool * 0.42} />
      <pointLight color="#64e4ff" intensity={1 + spool * 4} distance={420} />
      <Html center distanceFactor={13} className="target-label">
        {localizeGenericName("JUMP GATE", locale)}
      </Html>
    </group>
  );
}

function StationGeometry({ station }: { station: StationDefinition }) {
  const locale = useGameStore((state) => state.locale);
  const clock = useGameStore((state) => state.runtime.clock);
  const modelUrl = useGameStore((state) => state.assetManifest.stationModels[station.id] ?? state.assetManifest.stationModels[station.archetype]);
  const profile = useGameStore((state) =>
    state.assetManifest.stationVisualProfiles[station.id] ??
    state.assetManifest.stationVisualProfiles[station.archetype] ??
    state.assetManifest.stationVisualProfiles.default
  );
  if (!modelUrl) return <ProceduralStationGeometry station={station} />;
  return (
    <ShipModelBoundary fallback={<ProceduralStationGeometry station={station} />} onFallback={() => undefined}>
      <Suspense fallback={<ProceduralStationGeometry station={station} />}>
        <group position={toThree(station.position)}>
          <GltfRuntimeAsset fitToMaxDimension={station.id === "celest-vault" ? 360 : 330} url={modelUrl} />
          <mesh rotation={[Math.PI / 2, 0, clock * 0.08]}>
            <torusGeometry args={[118 * profile.ringScale, 1.2, 8, profile.nearSegments]} />
            <meshBasicMaterial color={profile.accentColor} transparent opacity={0.26 + profile.emissiveIntensity * 0.12} toneMapped={false} />
          </mesh>
          <Line points={[[-165 * profile.ringScale, 0, 116], [0, 0, 24], [165 * profile.ringScale, 0, 116]]} color={profile.trafficColor} lineWidth={1.2} transparent opacity={0.18 + Math.sin(clock * 2.6) * 0.04} />
          <Line points={[[0, -135, -104], [0, 0, -18], [0, 135, -104]]} color={profile.trafficColor} lineWidth={1} transparent opacity={0.14 + Math.cos(clock * 2.2) * 0.04} />
          <pointLight color={profile.accentColor} intensity={1.35 + profile.emissiveIntensity * 2.2} distance={420} />
          <Html center distanceFactor={13} className="target-label station-tech-label" position={[0, 102, 0]}>
            {stationTechLabel(station.techLevel, locale)} 路 {localizeStationName(station.id, locale, station.name)}
          </Html>
        </group>
      </Suspense>
    </ShipModelBoundary>
  );
}

function ProceduralStationGeometry({ station }: { station: StationDefinition }) {
  const locale = useGameStore((state) => state.locale);
  const clock = useGameStore((state) => state.runtime.clock);
  const playerPosition = useGameStore((state) => state.player.position);
  const profile = useGameStore((state) =>
    state.assetManifest.stationVisualProfiles[station.id] ??
    state.assetManifest.stationVisualProfiles[station.archetype] ??
    state.assetManifest.stationVisualProfiles.default
  );
  const segments = distance(playerPosition, station.position) > profile.farDistance ? profile.farSegments : profile.nearSegments;
  return (
    <group position={toThree(station.position)}>
      <mesh>
        <cylinderGeometry args={[38, 54, 42, Math.max(8, Math.round(segments / 6))]} />
        <meshStandardMaterial color={profile.hullColor} metalness={0.66} roughness={0.34} emissive={profile.accentColor} emissiveIntensity={profile.emissiveIntensity * 0.45} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} scale={[profile.ringScale, profile.ringScale, profile.ringScale]}>
        <torusGeometry args={[84, 4.2, 10, segments]} />
        <meshStandardMaterial color={profile.hullColor} metalness={0.72} roughness={0.28} emissive={profile.accentColor} emissiveIntensity={profile.emissiveIntensity} />
      </mesh>
      {[0, 1, 2, 3].map((index) => {
        const angle = index * (Math.PI / 2);
        return (
          <group key={index} rotation={[0, 0, angle]}>
            <mesh position={[90, 0, 0]}>
              <boxGeometry args={[52, 7, 12]} />
              <meshStandardMaterial color="#5f7180" metalness={0.62} roughness={0.42} emissive="#111d2a" />
            </mesh>
            <mesh position={[125, 0, 0]} rotation={[0, 0, 0.02]}>
              <boxGeometry args={[28, 18, 3]} />
              <meshStandardMaterial color={profile.solarColor} metalness={0.34} roughness={0.5} emissive={profile.accentColor} emissiveIntensity={0.1} />
            </mesh>
          </group>
        );
      })}
      <mesh position={[0, 0, 58]}>
        <boxGeometry args={[88, 7, 18]} />
        <meshStandardMaterial color="#c0aa6e" metalness={0.58} roughness={0.36} emissive="#3a2c0b" emissiveIntensity={0.18} />
      </mesh>
      <mesh position={[0, 0, -58]}>
        <boxGeometry args={[72, 6, 14]} />
        <meshStandardMaterial color="#4e6372" metalness={0.6} roughness={0.4} emissive="#0d1b28" />
      </mesh>
      {station.archetype === "Mining Station" ? (
        <>
          {[-1, 1].map((side) => (
            <group key={side} position={[side * 92, -10, 0]} rotation={[0, 0, side * 0.25]}>
              <mesh>
                <boxGeometry args={[78, 7, 10]} />
                <meshStandardMaterial color="#6b7280" metalness={0.64} roughness={0.48} />
              </mesh>
              <mesh position={[side * 46, 0, -30]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[10, 17, 28, 10]} />
                <meshStandardMaterial color="#d8a23b" metalness={0.5} roughness={0.4} emissive="#53360b" emissiveIntensity={0.18} />
              </mesh>
            </group>
          ))}
        </>
      ) : null}
      {station.archetype === "Research Station" ? (
        <>
          {[0, 1, 2].map((index) => (
            <group key={index} position={[Math.cos(index * 2.1) * 88, Math.sin(index * 2.1) * 44, Math.sin(index) * 34]} rotation={[0.3, index + clock * 0.04, 0.2]}>
              <mesh>
                <boxGeometry args={[9, 76, 2.4]} />
                <meshStandardMaterial color="#b8ccff" metalness={0.32} roughness={0.25} emissive="#372a77" emissiveIntensity={0.22} />
              </mesh>
              <mesh position={[0, 42, 0]}>
                <sphereGeometry args={[4, 12, 8]} />
                <meshBasicMaterial color="#dff8ff" transparent opacity={0.55} toneMapped={false} />
              </mesh>
            </group>
          ))}
        </>
      ) : null}
      {station.archetype === "Military Outpost" ? (
        <>
          {[-1, 1].map((side) => (
            <group key={side} position={[side * 54, 42, -22]}>
              <mesh>
                <boxGeometry args={[24, 20, 22]} />
                <meshStandardMaterial color="#4b5563" metalness={0.62} roughness={0.34} />
              </mesh>
              <mesh position={[0, 0, -18]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[3, 4, 38, 10]} />
                <meshStandardMaterial color="#ff7b7b" emissive="#842d2d" emissiveIntensity={0.35} />
              </mesh>
            </group>
          ))}
        </>
      ) : null}
      {station.archetype === "Pirate Black Market" ? (
        <>
          <mesh position={[72, -28, 26]} rotation={[0.4, 0.2, 0.7]}>
            <boxGeometry args={[80, 12, 18]} />
            <meshStandardMaterial color="#462032" metalness={0.38} roughness={0.55} emissive="#260814" />
          </mesh>
          <mesh position={[-54, 36, -30]} rotation={[-0.2, 0.5, -0.4]}>
            <boxGeometry args={[54, 16, 24]} />
            <meshStandardMaterial color="#2a1c2d" metalness={0.32} roughness={0.58} emissive="#1a0719" />
          </mesh>
        </>
      ) : null}
      {station.archetype === "Trade Hub" || station.archetype === "Frontier Port" ? (
        <>
          {[-1, 1].map((side) => (
            <group key={side} position={[side * 98, 0, 0]}>
              <mesh>
                <boxGeometry args={[28, 18, 86]} />
                <meshStandardMaterial color="#788896" metalness={0.5} roughness={0.38} emissive="#172436" />
              </mesh>
              <mesh position={[0, 20, 0]}>
                <boxGeometry args={[20, 3, 62]} />
                <meshStandardMaterial color="#41576b" metalness={0.58} roughness={0.4} emissive="#0d1b28" />
              </mesh>
            </group>
          ))}
        </>
      ) : null}
      <mesh rotation={[Math.PI / 2, 0, clock * 0.08]}>
        <torusGeometry args={[106 * profile.ringScale, 1.2, 8, segments]} />
        <meshBasicMaterial color={profile.accentColor} transparent opacity={0.24 + profile.emissiveIntensity * 0.12} toneMapped={false} />
      </mesh>
      <Line points={[[-150 * profile.ringScale, 0, 110], [0, 0, 24], [150 * profile.ringScale, 0, 110]]} color={profile.trafficColor} lineWidth={1.1} transparent opacity={0.16 + Math.sin(clock * 2.6) * 0.04} />
      <Line points={[[0, -120, -96], [0, 0, -18], [0, 120, -96]]} color={profile.trafficColor} lineWidth={0.9} transparent opacity={0.12 + Math.cos(clock * 2.2) * 0.04} />
      <pointLight color={profile.accentColor} intensity={0.95 + profile.emissiveIntensity} distance={280} />
      <Html center distanceFactor={13} className="target-label station-tech-label" position={[0, 92, 0]}>
        {stationTechLabel(station.techLevel, locale)} · {localizeStationName(station.id, locale, station.name)}
      </Html>
    </group>
  );
}

function Asteroid({ asteroid }: { asteroid: AsteroidEntity }) {
  const textureUrl = useGameStore((state) => state.assetManifest.asteroidTextures);
  const texture = useLoader(THREE.TextureLoader, textureUrl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  const geometry = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(asteroid.radius, 1);
    const positions = geo.attributes.position;
    for (let index = 0; index < positions.count; index += 1) {
      const wobble = 0.84 + ((index * 37 + asteroid.radius) % 19) / 100;
      positions.setXYZ(index, positions.getX(index) * wobble, positions.getY(index) * (1.05 - wobble * 0.1), positions.getZ(index) * wobble);
    }
    geo.computeVertexNormals();
    return geo;
  }, [asteroid.radius]);
  return (
    <mesh geometry={geometry} position={toThree(asteroid.position)} rotation={[asteroid.radius * 0.01, asteroid.radius * 0.02, 0]}>
      <meshStandardMaterial map={texture} color={asteroid.amount <= 0 ? "#2a2f35" : getOreColor(asteroid.resource)} roughness={0.9} />
      {asteroid.miningProgress > 0 && asteroid.amount > 0 ? (
        <mesh rotation={[Math.PI / 2, 0, 0]} scale={1 + asteroid.miningProgress * 0.24}>
          <torusGeometry args={[asteroid.radius * 1.18, 1.6, 8, 36]} />
          <meshBasicMaterial color={getOreColor(asteroid.resource)} transparent opacity={0.35 + asteroid.miningProgress * 0.45} />
        </mesh>
      ) : null}
    </mesh>
  );
}

function Projectile({ projectile }: { projectile: ProjectileEntity }) {
  const color = projectile.kind === "missile" ? "#ffb657" : projectile.owner === "enemy" ? "#ff4c6a" : projectile.owner === "npc" ? "#ffd166" : "#64e4ff";
  return (
    <mesh position={toThree(projectile.position)}>
      <sphereGeometry args={[projectile.kind === "missile" ? 4 : 2, 10, 8]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

function LootCrate({ loot }: { loot: LootEntity }) {
  const color =
    loot.rarity === "legendary" ? "#9b7bff" : loot.rarity === "epic" ? "#ffd166" : loot.rarity === "rare" ? "#55c9ff" : loot.rarity === "uncommon" ? "#c8d5e6" : "#b96d4f";
  const size = loot.rarity === "legendary" ? 16 : loot.rarity === "epic" ? 14 : 12;
  return (
    <mesh position={toThree(loot.position)} rotation={[0.5, 0.4, 0.2]}>
      <boxGeometry args={[size, size, size]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.42} metalness={0.3} />
    </mesh>
  );
}

function WormholeTunnel() {
  const autopilot = useGameStore((state) => state.autopilot);
  const player = useGameStore((state) => state.player);
  const clock = useGameStore((state) => state.runtime.clock);
  const rings = useMemo(() => Array.from({ length: 16 }, (_, index) => index), []);
  if (autopilot?.phase !== "wormhole") return null;
  return (
    <group position={toThree(player.position)} rotation={player.rotation}>
      {rings.map((index) => {
        const z = -90 - index * 58 - ((clock * 260) % 58);
        const radius = 42 + index * 9 + Math.sin(clock * 12 + index) * 7;
        const opacity = Math.max(0, 0.68 - index * 0.035);
        return (
          <mesh key={index} position={[0, 0, z]} rotation={[0, 0, clock * 1.8 + index * 0.7]}>
            <torusGeometry args={[radius, 2.2 + (index % 3), 8, 42]} />
            <meshBasicMaterial color={index % 2 === 0 ? "#65e7ff" : "#9b7bff"} transparent opacity={opacity} toneMapped={false} />
          </mesh>
        );
      })}
      {[-1, 1].map((side) => (
        <Line key={side} points={[[side * 28, 0, 20], [side * 120, 35, -720]]} color="#dff8ff" lineWidth={2} transparent opacity={0.38} />
      ))}
      <pointLight color="#7ddcff" intensity={4.8} distance={560} />
    </group>
  );
}

function ExplosionTextureBillboard({ alpha, frameUrls, life, maxLife, size }: { alpha: number; frameUrls: string[]; life: number; maxLife: number; size: number }) {
  const camera = useThree((state) => state.camera);
  const meshRef = useRef<THREE.Mesh>(null);
  const progress = clamp(1 - life / maxLife, 0, 0.999);
  const frameUrl = frameUrls[Math.min(frameUrls.length - 1, Math.floor(progress * frameUrls.length))];
  const texture = useLoader(THREE.TextureLoader, frameUrl);
  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.anisotropy = 4;
  }, [texture]);
  useFrame(() => {
    meshRef.current?.lookAt(camera.position);
  });
  return (
    <mesh ref={meshRef} scale={1 + progress * 0.55}>
      <planeGeometry args={[size * 3.1, size * 3.1]} />
      <meshBasicMaterial map={texture} transparent opacity={alpha * 0.88} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

function VisualEffect({ effect }: { effect: VisualEffectEntity }) {
  const locale = useGameStore((state) => state.locale);
  const explosionProfile = useGameStore((state) => state.assetManifest.vfxAssetProfiles[state.assetManifest.vfxCues.explosion]);
  const explosionFrames = useGameStore((state) => state.assetManifest.vfxTextureSequences[state.assetManifest.vfxCues.explosion] ?? []);
  const alpha = Math.max(0, effect.life / effect.maxLife);
  const particles = useMemo(
    () =>
      Array.from({ length: effect.particleCount ?? (effect.kind === "explosion" ? 14 : effect.kind === "hit" ? 4 : 0) }, (_, index) => {
        const seed = index * 12.9898 + effect.id.length * 78.233;
        const a = Math.sin(seed) * 43758.5453;
        const b = Math.sin(seed * 1.73) * 24634.6345;
        const c = Math.sin(seed * 2.31) * 97531.1357;
        const spread = effect.spread ?? effect.size;
        return {
          position: [
            (a - Math.floor(a) - 0.5) * spread,
            (b - Math.floor(b) - 0.5) * spread,
            (c - Math.floor(c) - 0.5) * spread
          ] as Vec3,
          size: 1.2 + ((a * 17) % 1) * 3.2,
          color: index % 2 === 0 ? effect.color : effect.secondaryColor ?? "#ffd166"
        };
      }),
    [effect.id, effect.kind, effect.particleCount, effect.secondaryColor, effect.size, effect.spread, effect.color]
  );

  if (effect.kind === "nav-ring") {
    return (
      <group position={toThree(effect.position)}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[effect.size, 1.6, 8, 48]} />
          <meshBasicMaterial color={effect.color} transparent opacity={alpha * 0.55} toneMapped={false} />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[effect.size * (0.64 + alpha * 0.14), 0.9, 8, 42]} />
          <meshBasicMaterial color={effect.secondaryColor ?? effect.color} transparent opacity={alpha * 0.28} toneMapped={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[7 + alpha * 7, 12, 8]} />
          <meshBasicMaterial color={effect.secondaryColor ?? effect.color} transparent opacity={alpha * 0.3} toneMapped={false} />
        </mesh>
        {effect.label ? (
          <Html center distanceFactor={10} className="effect-label" style={{ opacity: alpha }}>
            {formatRuntimeText(locale, effect.label)}
          </Html>
        ) : null}
      </group>
    );
  }

  if (effect.kind === "gate-spool") {
    return (
      <group position={toThree(effect.position)}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[effect.size * (1.12 - alpha * 0.2), 4.2, 10, 64]} />
          <meshBasicMaterial color={effect.color} transparent opacity={alpha * 0.58} toneMapped={false} />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[effect.size * (0.66 + (1 - alpha) * 0.18), 2.4, 8, 48]} />
          <meshBasicMaterial color={effect.secondaryColor ?? effect.color} transparent opacity={alpha * 0.36} toneMapped={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[effect.size * 0.2 + (1 - alpha) * 24, 18, 12]} />
          <meshBasicMaterial color={effect.secondaryColor ?? effect.color} transparent opacity={alpha * 0.34} toneMapped={false} />
        </mesh>
        {particles.map((particle, index) => (
          <mesh key={index} position={toThree(scale(particle.position, 1.1 - alpha * 0.3))}>
            <sphereGeometry args={[particle.size * (0.8 + alpha), 8, 6]} />
            <meshBasicMaterial color={particle.color} transparent opacity={alpha * 0.72} toneMapped={false} />
          </mesh>
        ))}
        {effect.label ? (
          <Html center distanceFactor={9} className="effect-label" style={{ opacity: alpha }}>
            {formatRuntimeText(locale, effect.label)}
          </Html>
        ) : null}
      </group>
    );
  }

  if (effect.kind === "wormhole") {
    return (
      <group position={toThree(effect.position)}>
        {particles.map((particle, index) => (
          <mesh key={index} position={toThree(scale(particle.position, 1.8 - alpha * 0.6))}>
            <sphereGeometry args={[particle.size * (1.2 + alpha), 8, 6]} />
            <meshBasicMaterial color={particle.color} transparent opacity={alpha * 0.68} toneMapped={false} />
          </mesh>
        ))}
        <mesh>
          <sphereGeometry args={[effect.size * (1.1 - alpha * 0.35), 18, 12]} />
          <meshBasicMaterial color={effect.color} transparent opacity={alpha * 0.14} wireframe toneMapped={false} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[effect.size * (0.45 + (1 - alpha) * 0.35), 2.2, 8, 42]} />
          <meshBasicMaterial color={effect.secondaryColor ?? "#eaffff"} transparent opacity={alpha * 0.3} toneMapped={false} />
        </mesh>
      </group>
    );
  }

  if ((effect.kind === "projectile-trail" || effect.kind === "speed-line" || effect.kind === "launch-trail" || effect.kind === "dock-corridor") && effect.endPosition) {
    const vector = sub(effect.endPosition, effect.position);
    const simpleTrail = effect.kind === "projectile-trail" || effect.kind === "speed-line";
    const rings = effect.kind === "dock-corridor" ? [0.28, 0.48, 0.68, 0.88] : [0.35, 0.68, 0.92];
    return (
      <group>
        <Line points={[effect.position, effect.endPosition]} color={effect.color} lineWidth={simpleTrail ? effect.size : effect.kind === "dock-corridor" ? 2.4 : 3.2} transparent opacity={alpha * (effect.kind === "projectile-trail" ? 0.48 : 0.64)} />
        <Line points={[effect.position, effect.endPosition]} color={effect.secondaryColor ?? "#ffffff"} lineWidth={simpleTrail ? Math.max(0.8, effect.size * 0.32) : 0.9} transparent opacity={alpha * 0.34} />
        {simpleTrail ? null : rings.map((progress) => {
          const position = add(effect.position, scale(vector, progress));
          const size = effect.size * (effect.kind === "dock-corridor" ? 0.58 + progress * 0.42 : 0.45 + progress * 0.36);
          return (
            <mesh key={progress} position={toThree(position)} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[size, effect.kind === "dock-corridor" ? 1.1 : 1.6, 8, 36]} />
              <meshBasicMaterial color={progress > 0.7 ? effect.secondaryColor ?? effect.color : effect.color} transparent opacity={alpha * (0.24 + progress * 0.3)} toneMapped={false} />
            </mesh>
          );
        })}
        {simpleTrail ? null : <mesh position={toThree(effect.endPosition)}>
          <sphereGeometry args={[effect.size * 0.22 + alpha * 4, 12, 8]} />
          <meshBasicMaterial color={effect.secondaryColor ?? effect.color} transparent opacity={alpha * 0.38} toneMapped={false} />
        </mesh>}
        {effect.label ? (
          <Html center distanceFactor={10} className="effect-label" position={toThree(effect.endPosition)} style={{ opacity: alpha }}>
            {formatRuntimeText(locale, effect.label)}
          </Html>
        ) : null}
      </group>
    );
  }

  if (effect.kind === "mining-beam" && effect.endPosition) {
    const jitterA = add(effect.endPosition, [Math.sin(effect.life * 53) * 7, Math.cos(effect.life * 41) * 4, Math.sin(effect.life * 31) * 7]);
    const jitterB = add(effect.endPosition, [Math.cos(effect.life * 47) * 5, Math.sin(effect.life * 29) * 6, Math.cos(effect.life * 37) * 5]);
    return (
      <group>
        <Line points={[effect.position, effect.endPosition]} color={effect.color} lineWidth={4} transparent opacity={0.42 + alpha * 0.48} />
        <Line points={[effect.position, jitterA]} color={effect.secondaryColor ?? "#eaffff"} lineWidth={1.6} transparent opacity={alpha * 0.55} />
        <Line points={[effect.position, jitterB]} color={effect.color} lineWidth={1.2} transparent opacity={alpha * 0.45} />
        <mesh position={toThree(effect.endPosition)}>
          <sphereGeometry args={[7 + alpha * 5, 12, 8]} />
          <meshBasicMaterial color={effect.color} transparent opacity={0.22 + alpha * 0.38} toneMapped={false} />
        </mesh>
      </group>
    );
  }
  if (effect.kind === "shield-break" || effect.kind === "kill-pulse" || effect.kind === "salvage-pulse") {
    const ringScale = effect.kind === "salvage-pulse" ? 1.35 - alpha * 0.25 : 1.05 + (1 - alpha) * 0.7;
    return (
      <group position={toThree(effect.position)}>
        <mesh rotation={[Math.PI / 2, 0, 0]} scale={ringScale}>
          <torusGeometry args={[effect.size, effect.kind === "shield-break" ? 1.2 : 2.4, 8, 58]} />
          <meshBasicMaterial color={effect.color} transparent opacity={alpha * 0.72} toneMapped={false} />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]} scale={0.72 + (1 - alpha) * 0.42}>
          <torusGeometry args={[effect.size * 0.72, 1.1, 8, 42]} />
          <meshBasicMaterial color={effect.secondaryColor ?? effect.color} transparent opacity={alpha * 0.42} toneMapped={false} />
        </mesh>
        {particles.map((particle, index) => (
          <mesh key={index} position={toThree(scale(particle.position, 1.35 - alpha * 0.2))}>
            <sphereGeometry args={[particle.size * (0.8 + alpha), 8, 6]} />
            <meshBasicMaterial color={particle.color} transparent opacity={alpha * 0.76} toneMapped={false} />
          </mesh>
        ))}
        {effect.label ? (
          <Html center distanceFactor={9} className="effect-label" style={{ opacity: alpha }}>
            {formatRuntimeText(locale, effect.label)}
          </Html>
        ) : null}
      </group>
    );
  }
  const radius = effect.kind === "explosion" ? effect.size * (1.2 - alpha * 0.55) : effect.size * (1.1 - alpha * 0.35);
  const explosionCore = effect.kind === "explosion" ? explosionProfile?.coreColor ?? effect.color : effect.color;
  const explosionShock = effect.kind === "explosion" ? explosionProfile?.shockColor ?? effect.secondaryColor ?? effect.color : effect.secondaryColor ?? effect.color;
  return (
    <group position={toThree(effect.position)}>
      <mesh>
        <sphereGeometry args={[radius, 18, 12]} />
        <meshBasicMaterial color={explosionCore} transparent opacity={effect.kind === "explosion" ? alpha * 0.42 * (explosionProfile?.bloomIntensity ?? 1) : alpha * 0.28} toneMapped={false} />
      </mesh>
      {effect.kind === "explosion" ? (
        <>
          {explosionFrames.length > 0 ? <ExplosionTextureBillboard alpha={alpha} frameUrls={explosionFrames} life={effect.life} maxLife={effect.maxLife} size={effect.size} /> : null}
          <mesh rotation={[Math.PI / 2, 0, effect.life * 0.9]}>
            <torusGeometry args={[radius * 1.18, Math.max(1.4, effect.size * 0.035), 8, 72]} />
            <meshBasicMaterial color={explosionShock} transparent opacity={alpha * 0.48} toneMapped={false} />
          </mesh>
          <mesh>
            <sphereGeometry args={[radius * 1.42, 24, 12]} />
            <meshBasicMaterial color={explosionShock} transparent opacity={alpha * 0.12} wireframe toneMapped={false} />
          </mesh>
        </>
      ) : null}
      {effect.kind === "shield-hit" ? (
        <>
          <mesh>
            <sphereGeometry args={[radius * 1.24, 24, 16]} />
            <meshBasicMaterial color={effect.color} transparent opacity={alpha * 0.12} wireframe toneMapped={false} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[radius * 1.12, 1.4, 8, 32]} />
            <meshBasicMaterial color={effect.color} transparent opacity={alpha * 0.72} toneMapped={false} />
          </mesh>
        </>
      ) : null}
      {particles.map((particle, index) => (
        <mesh key={index} position={toThree(scale(particle.position, 1.65 - alpha * 0.45))}>
          <sphereGeometry args={[particle.size * (0.65 + alpha), 8, 6]} />
          <meshBasicMaterial color={particle.color} transparent opacity={alpha * 0.74} toneMapped={false} />
        </mesh>
      ))}
      {effect.label ? (
        <Html center distanceFactor={9} className="effect-label" style={{ opacity: alpha }}>
          {formatRuntimeText(locale, effect.label)}
        </Html>
      ) : null}
    </group>
  );
}

function TargetLock() {
  const player = useGameStore((state) => state.player);
  const locale = useGameStore((state) => state.locale);
  const clock = useGameStore((state) => state.runtime.clock);
  const target = useGameStore((state) => state.runtime.enemies.find((ship) => ship.id === state.targetId && ship.hull > 0 && ship.deathTimer === undefined));
  if (!target) return null;
  const dist = Math.round(Math.hypot(player.position[0] - target.position[0], player.position[1] - target.position[1], player.position[2] - target.position[2]));
  const pulse = 1 + Math.sin(clock * (target.boss ? 8.5 : 6.2)) * 0.08;
  const healthRatio = clamp(target.hull / target.maxHull, 0, 1);
  const lockColor = target.boss ? "#ff6b6b" : target.storyTarget ? "#ff9bd5" : "#ffdf6e";
  return (
    <group position={toThree(target.position)}>
      <mesh scale={pulse}>
        <torusGeometry args={[target.boss ? 36 : 26, 1.4, 6, 4]} />
        <meshBasicMaterial color={lockColor} transparent opacity={0.72 + healthRatio * 0.18} toneMapped={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, clock * 1.8]} scale={0.72 + pulse * 0.18}>
        <torusGeometry args={[target.boss ? 44 : 32, 0.8, 8, 36]} />
        <meshBasicMaterial color={lockColor} transparent opacity={0.26} toneMapped={false} />
      </mesh>
      <Html center distanceFactor={12} className="target-label">
        {localizeGenericName(target.storyTarget ? "STORY" : "LOCK", locale)} · {formatDistance(locale, dist)}
      </Html>
    </group>
  );
}

function waypointTone(tone: NavigationCueTone) {
  if (tone === "gate") return { color: "#6ee7ff", secondary: "#9b7bff" };
  if (tone === "unknown") return { color: "#ffd166", secondary: "#fff2c5" };
  if (tone === "exploration") return { color: "#9bffe8", secondary: "#ff9bd5" };
  return { color: "#80d6ff", secondary: "#dff8ff" };
}

function WaypointMarker() {
  const currentSystemId = useGameStore((state) => state.currentSystemId);
  const locale = useGameStore((state) => state.locale);
  const player = useGameStore((state) => state.player);
  const knownPlanetIds = useGameStore((state) => state.knownPlanetIds);
  const explorationState = useGameStore((state) => state.explorationState);
  const autopilot = useGameStore((state) => state.autopilot);
  const clock = useGameStore((state) => state.runtime.clock);
  const equipmentEffects = getPlayerRuntimeEffects(player);
  const target = getNearestNavigationTarget(currentSystemId, player.position, knownPlanetIds, {
    explorationState,
    installedEquipment: player.equipment,
    runtimeEffects: equipmentEffects
  });
  const cue = getNavigationTargetCue(target);
  if (!target || !cue || autopilot?.phase === "wormhole") return null;

  const tone = waypointTone(cue.tone);
  const pulse = 0.5 + Math.sin(clock * (cue.inRange ? 5.6 : 2.8)) * 0.5;
  const forward = forwardFromRotation(player.rotation);
  const lineStart = add(player.position, scale(forward, 52));
  const ringRadius = cue.inRange ? 58 + pulse * 16 : 38 + pulse * 10;
  const lineOpacity = cue.inRange ? 0.58 + pulse * 0.18 : 0.28 + pulse * 0.12;
  return (
    <group>
      <Line points={[lineStart, target.position]} color={tone.color} lineWidth={cue.inRange ? 2.6 : 1.4} transparent opacity={lineOpacity} />
      <group position={toThree(target.position)}>
        <mesh rotation={[Math.PI / 2, 0, clock * 0.45]}>
          <torusGeometry args={[ringRadius, cue.inRange ? 2.6 : 1.6, 8, 56]} />
          <meshBasicMaterial color={tone.color} transparent opacity={cue.inRange ? 0.64 : 0.38} toneMapped={false} />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, -clock * 0.32]}>
          <torusGeometry args={[ringRadius * 0.64, 1.2, 8, 42]} />
          <meshBasicMaterial color={tone.secondary} transparent opacity={0.22 + pulse * 0.24} toneMapped={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[cue.inRange ? 8 + pulse * 5 : 5 + pulse * 3, 12, 8]} />
          <meshBasicMaterial color={tone.secondary} transparent opacity={cue.inRange ? 0.46 : 0.28} toneMapped={false} />
        </mesh>
        <pointLight color={tone.color} intensity={cue.inRange ? 1.7 : 0.8} distance={cue.inRange ? 320 : 220} />
        <Html center distanceFactor={11} className={`waypoint-label waypoint-${cue.tone} ${cue.inRange ? "in-range" : ""}`}>
          <b>{navigationTargetName(target, locale)}</b>
          {target.kind === "station" ? <span>{formatTechLevel(locale, target.station.techLevel, true)}</span> : null}
          <span>{navigationActionLabel(target, cue.inRange, locale)} · {formatDistance(locale, target.distance)}</span>
        </Html>
      </group>
    </group>
  );
}

function StoryObjectiveMarker() {
  const currentSystemId = useGameStore((state) => state.currentSystemId);
  const currentStationId = useGameStore((state) => state.currentStationId);
  const locale = useGameStore((state) => state.locale);
  const player = useGameStore((state) => state.player);
  const activeMissions = useGameStore((state) => state.activeMissions);
  const completedMissionIds = useGameStore((state) => state.completedMissionIds);
  const failedMissionIds = useGameStore((state) => state.failedMissionIds);
  const clock = useGameStore((state) => state.runtime.clock);
  const summary = getStoryObjectiveSummary({
    arc: glassWakeProtocol,
    missions: missionTemplates,
    activeMissions,
    completedMissionIds,
    failedMissionIds,
    currentSystemId,
    currentStationId,
    playerPosition: player.position,
    playerCargo: player.cargo,
    getStationName: (stationId) => localizeStationName(stationId, locale, stationById[stationId]?.name),
    getSystemName: (systemId) => localizeSystemName(systemId, locale, systemById[systemId]?.name),
    getCommodityName: (commodityId) => localizeCommodityName(commodityId, locale, commodityById[commodityId]?.name)
  });
  const stationTarget = summary.targetStationId ? stationById[summary.targetStationId] : undefined;
  const targetPosition = summary.targetPosition ?? (stationTarget?.systemId === currentSystemId ? stationTarget.position : undefined);
  const targetPositionSystemId = summary.targetPositionSystemId ?? summary.targetSystemId;
  if (summary.status === "complete" || targetPositionSystemId !== currentSystemId || !targetPosition) return null;

  const pulse = 0.5 + Math.sin(clock * 4.8) * 0.5;
  const forward = forwardFromRotation(player.rotation);
  const lineStart = add(player.position, scale(forward, 70));
  const dist = Math.round(Math.hypot(player.position[0] - targetPosition[0], player.position[1] - targetPosition[1], player.position[2] - targetPosition[2]));
  return (
    <group>
      <Line points={[lineStart, targetPosition]} color="#ff9bd5" lineWidth={2.2} transparent opacity={0.28 + pulse * 0.24} />
      <Line points={[lineStart, targetPosition]} color="#9bffe8" lineWidth={0.9} transparent opacity={0.18 + pulse * 0.18} />
      <group position={toThree(targetPosition)}>
        <mesh rotation={[Math.PI / 2, 0, clock * 0.5]}>
          <torusGeometry args={[72 + pulse * 13, 2.2, 8, 60]} />
          <meshBasicMaterial color="#ff9bd5" transparent opacity={0.38 + pulse * 0.22} toneMapped={false} />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, -clock * 0.34]}>
          <torusGeometry args={[44 + pulse * 8, 1.4, 8, 48]} />
          <meshBasicMaterial color="#9bffe8" transparent opacity={0.28 + pulse * 0.24} toneMapped={false} />
        </mesh>
        <pointLight color="#ff9bd5" intensity={1.2 + pulse * 1.2} distance={280} />
        <Html center distanceFactor={11} className="story-waypoint-label">
          <b>{translateText("Main Story", locale)}</b>
          <span>{translateText(summary.visualCueLabel ?? summary.chapterLabel, locale)} · {formatDistance(locale, dist)}</span>
        </Html>
      </group>
    </group>
  );
}

function economyRouteColor(taskKind: FlightEntity["economyTaskKind"]): string {
  if (taskKind === "mining") return "#ffd166";
  if (taskKind === "hauling") return "#9bffe8";
  if (taskKind === "selling") return "#8bd3ff";
  if (taskKind === "buying") return "#b9a7ff";
  if (taskKind === "returning") return "#ffb36e";
  return "#dff8ff";
}

function EconomyRouteMarkers() {
  const runtime = useGameStore((state) => state.runtime);
  const currentSystemId = useGameStore((state) => state.currentSystemId);
  const locale = useGameStore((state) => state.locale);
  const pulse = 0.5 + Math.sin(runtime.clock * 3.8) * 0.5;
  const ships = runtime.enemies
    .filter((ship) =>
      !!ship.economyStatus &&
      ship.hull > 0 &&
      ship.deathTimer === undefined &&
      (!ship.economySystemId || ship.economySystemId === currentSystemId)
    )
    .slice(0, 10);
  return (
    <>
      {ships.map((ship) => {
        const route = getEconomyFlightRouteCue(ship, runtime.asteroids, currentSystemId);
        if (!route) return null;
        const color = economyRouteColor(ship.economyTaskKind);
        const midpoint = scale(add(ship.position, route.targetPosition), 0.5);
        return (
          <group key={`econ-route-${ship.id}`}>
            <Line points={[ship.position, route.targetPosition]} color={color} lineWidth={1.2} transparent opacity={0.18 + pulse * 0.16} />
            <group position={toThree(route.targetPosition)}>
              <mesh rotation={[Math.PI / 2, 0, runtime.clock * 0.35]}>
                <torusGeometry args={[route.targetKind === "asteroid" ? 42 : 58, 1.1, 8, 48]} />
                <meshBasicMaterial color={color} transparent opacity={0.2 + pulse * 0.16} toneMapped={false} />
              </mesh>
            </group>
            <Html center distanceFactor={14} className="economy-route-label" position={toThree(midpoint)}>
              <b>{formatRuntimeText(locale, route.routeLabel)}</b>
              <span>{translateDisplayName(route.targetName, locale)}</span>
            </Html>
          </group>
        );
      })}
    </>
  );
}

const UltraClearSharpenShader = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2(1, 1) },
    strength: { value: 0.18 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float strength;
    varying vec2 vUv;
    void main() {
      vec2 texel = 1.0 / resolution;
      vec4 center = texture2D(tDiffuse, vUv);
      vec4 north = texture2D(tDiffuse, vUv + vec2(0.0, texel.y));
      vec4 south = texture2D(tDiffuse, vUv - vec2(0.0, texel.y));
      vec4 east = texture2D(tDiffuse, vUv + vec2(texel.x, 0.0));
      vec4 west = texture2D(tDiffuse, vUv - vec2(texel.x, 0.0));
      vec4 sharpened = center * (1.0 + 4.0 * strength) - (north + south + east + west) * strength;
      gl_FragColor = vec4(clamp(sharpened.rgb, 0.0, 1.0), center.a);
    }
  `
};

function PostProcessingRig() {
  const { camera, gl, scene, size } = useThree();
  const currentSystemId = useGameStore((state) => state.currentSystemId);
  const profile = useGameStore((state) => state.assetManifest.scenePostProfiles[currentSystemId] ?? state.assetManifest.scenePostProfiles.default);
  const graphicsSettings = useGameStore((state) => state.graphicsSettings);
  const composerRef = useRef<EffectComposer | null>(null);

  useEffect(() => {
    if (!graphicsSettings.postProcessing) {
      composerRef.current = null;
      return undefined;
    }
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const composer = new EffectComposer(gl);
    composer.setSize(size.width, size.height);
    composer.setPixelRatio(pixelRatio);
    composer.addPass(new RenderPass(scene, camera));
    const bloomStrength = profile.bloomStrength * graphicsSettings.bloomMultiplier;
    if (bloomStrength > 0) {
      const bloomPass = new UnrealBloomPass(new THREE.Vector2(size.width, size.height), bloomStrength, profile.bloomRadius, profile.bloomThreshold);
      composer.addPass(bloomPass);
    }
    if (graphicsSettings.depthOfField && profile.dofMaxBlur > 0.0001 && profile.dofAperture > 0) {
      composer.addPass(
        new BokehPass(scene, camera, {
          focus: profile.dofFocus,
          aperture: profile.dofAperture,
          maxblur: profile.dofMaxBlur
        })
      );
    }
    const sharpenStrength = profile.sharpenStrength * graphicsSettings.sharpenMultiplier;
    if (sharpenStrength > 0) {
      const sharpenPass = new ShaderPass(UltraClearSharpenShader);
      sharpenPass.uniforms.resolution.value = new THREE.Vector2(size.width * pixelRatio, size.height * pixelRatio);
      sharpenPass.uniforms.strength.value = sharpenStrength;
      composer.addPass(sharpenPass);
    }
    composer.addPass(new OutputPass());
    composerRef.current = composer;
    return () => {
      composerRef.current = null;
      composer.dispose();
    };
  }, [
    camera,
    graphicsSettings.bloomMultiplier,
    graphicsSettings.depthOfField,
    graphicsSettings.postProcessing,
    graphicsSettings.sharpenMultiplier,
    gl,
    profile.bloomRadius,
    profile.bloomStrength,
    profile.bloomThreshold,
    profile.dofAperture,
    profile.dofFocus,
    profile.dofMaxBlur,
    profile.sharpenStrength,
    scene,
    size.height,
    size.width
  ]);

  useFrame((_, delta) => {
    composerRef.current?.render(delta);
  }, 1);

  return null;
}

function SceneContent({ onShipModelStatus }: { onShipModelStatus: (status: ShipModelStatus | null) => void }) {
  const runtime = useGameStore((state) => state.runtime);
  const screen = useGameStore((state) => state.screen);
  const economyNpcWatch = useGameStore((state) => state.economyNpcWatch);
  const currentSystemId = useGameStore((state) => state.currentSystemId);
  const explorationState = useGameStore((state) => state.explorationState);
  const sceneProfile = useGameStore((state) => state.assetManifest.scenePostProfiles[currentSystemId] ?? state.assetManifest.scenePostProfiles.default);
  const system = systemById[currentSystemId];
  const ambient = (0.18 + system.risk * 0.06) * sceneProfile.ambientMultiplier;
  const starLightPosition = scale(system.star.direction, 480);
  const fillLightPosition: Vec3 = [-system.star.direction[0] * 260, 90, -system.star.direction[2] * 260];
  const explorationSignals = getIncompleteExplorationSignals(currentSystemId, explorationState);
  return (
    <>
      <color attach="background" args={[sceneProfile.backgroundColor]} />
      <fog attach="fog" args={[sceneProfile.fogColor, sceneProfile.fogNear, sceneProfile.fogFar]} />
      <ambientLight intensity={ambient} />
      <directionalLight position={toThree(starLightPosition)} intensity={system.star.lightIntensity * sceneProfile.exposure} color={system.star.color} />
      <directionalLight position={[-220, 90, -320]} intensity={sceneProfile.fillIntensity} color={sceneProfile.fillColor} />
      <pointLight position={toThree(fillLightPosition)} color={system.star.color} intensity={0.32} distance={720} />
      <InfiniteSkybox />
      <SystemStarBackdrop />
      <PlanetBackdrops />
      <JumpGateModel />
      <StationModel />
      {screen === "economyWatch" ? null : <PlayerShip onModelStatus={onShipModelStatus} />}
      <WormholeTunnel />
      {screen === "economyWatch" ? null : <TargetLock />}
      {screen === "economyWatch" ? null : <WaypointMarker />}
      {screen === "economyWatch" ? null : <StoryObjectiveMarker />}
      <EconomyRouteMarkers />
      {runtime.enemies.map((ship) => (
        economyNpcWatch?.cameraMode === "cockpit" && economyNpcWatch.npcId === ship.id ? null : <NpcShip key={ship.id} ship={ship} />
      ))}
      {runtime.convoys.map((convoy) => (
        <ConvoyShip key={convoy.id} convoy={convoy} />
      ))}
      {runtime.salvage.map((salvage) => (
        <SalvageCrate key={salvage.id} salvage={salvage} />
      ))}
      {explorationSignals.map((signal) => (
        <ExplorationSignalMarker key={signal.id} signal={signal} />
      ))}
      {runtime.asteroids.map((asteroid) => (
        <Asteroid key={asteroid.id} asteroid={asteroid} />
      ))}
      {runtime.projectiles.map((projectile) => (
        <Projectile key={projectile.id} projectile={projectile} />
      ))}
      {runtime.loot.map((loot) => (
        <LootCrate key={loot.id} loot={loot} />
      ))}
      {runtime.effects.map((effect) => (
        <VisualEffect key={effect.id} effect={effect} />
      ))}
    </>
  );
}

function navigationTargetName(target: NavigationTarget, locale: Locale): string {
  if (target.kind === "station") return localizeStationName(target.station.id, locale, target.station.name);
  if (target.kind === "planet-signal") return translateText("Unknown Beacon", locale);
  if (target.kind === "exploration-signal") return translateText(target.name, locale);
  return translateText(target.name, locale);
}

function navigationActionLabel(target: NavigationTarget, inRange: boolean, locale: Locale): string {
  if (target.kind === "exploration-signal" && target.inRange && target.equipmentReady === false) {
    if (locale === "zh-CN") return "需要扫描器";
    if (locale === "zh-TW") return "需要掃描器";
    if (locale === "ja") return "スキャナー必要";
    if (locale === "fr") return "Analyseur requis";
    return "Scanner Required";
  }
  if (target.kind === "station") {
    if (locale === "zh-CN") return inRange ? "E 停靠" : "航点";
    if (locale === "zh-TW") return inRange ? "E 停靠" : "航點";
    if (locale === "ja") return inRange ? "E ドック" : "ウェイポイント";
    if (locale === "fr") return inRange ? "E Amarrer" : "Point de route";
    return inRange ? "E Dock" : "Waypoint";
  }
  if (target.kind === "planet-signal") {
    if (locale === "zh-CN") return inRange ? "E 扫描" : "信标";
    if (locale === "zh-TW") return inRange ? "E 掃描" : "信標";
    if (locale === "ja") return inRange ? "E スキャン" : "ビーコン";
    if (locale === "fr") return inRange ? "E Scanner" : "Balise";
    return inRange ? "E Scan" : "Beacon";
  }
  if (target.kind === "exploration-signal") {
    if (locale === "zh-CN") return inRange ? "E 扫描" : "信号";
    if (locale === "zh-TW") return inRange ? "E 掃描" : "訊號";
    if (locale === "ja") return inRange ? "E スキャン" : "信号";
    if (locale === "fr") return inRange ? "E Scanner" : "Signal";
    return inRange ? "E Scan" : "Signal";
  }
  if (locale === "zh-CN") return inRange ? "E 启动" : "星门";
  if (locale === "zh-TW") return inRange ? "E 啟動" : "星門";
  if (locale === "ja") return inRange ? "E 起動" : "スターゲート";
  if (locale === "fr") return inRange ? "E Activer" : "Portail";
  return inRange ? "E Activate" : "Stargate";
}

function getLocalizedNavigationHintText(target: NavigationTarget | undefined, locale: Locale): string | undefined {
  if (!target) return undefined;
  const action = navigationActionLabel(target, target.inRange, locale);
  const label = navigationTargetName(target, locale);
  if (target.kind === "exploration-signal" && target.inRange && target.equipmentReady === false) {
    return `${action}: ${target.requiredEquipmentLabel ?? label}`;
  }
  return target.inRange ? `${action}: ${label}` : `${label} ${formatDistance(locale, target.distance)}`;
}

function convoyStatusLabel(status: ConvoyEntity["status"], locale: Locale): string {
  const value = status ?? "en-route";
  if (locale === "zh-CN") return { "en-route": "航行中", "under-attack": "遭受攻击", distress: "求救", arrived: "已抵达" }[value];
  if (locale === "zh-TW") return { "en-route": "航行中", "under-attack": "遭受攻擊", distress: "求救", arrived: "已抵達" }[value];
  if (locale === "ja") return { "en-route": "航行中", "under-attack": "攻撃中", distress: "救難", arrived: "到着" }[value];
  if (locale === "fr") return { "en-route": "EN ROUTE", "under-attack": "ATTAQUÉ", distress: "DÉTRESSE", arrived: "ARRIVÉ" }[value];
  return value.toUpperCase();
}

function shipModelFallbackText(shipName: string, reason: "missing" | "failed", locale: Locale): string {
  if (locale === "zh-CN") return reason === "missing" ? `舰船模型：${shipName} 没有 GLB 清单项，使用程序生成模型。` : `舰船模型：${shipName} GLB 加载失败，使用程序生成模型。`;
  if (locale === "zh-TW") return reason === "missing" ? `艦船模型：${shipName} 沒有 GLB 清單項，使用程序生成模型。` : `艦船模型：${shipName} GLB 載入失敗，使用程序生成模型。`;
  if (locale === "ja") return reason === "missing" ? `船体モデル: ${shipName} のGLB項目がないため手続き型モデルを使用。` : `船体モデル: ${shipName} のGLB読み込みに失敗したため手続き型モデルを使用。`;
  if (locale === "fr") return reason === "missing" ? `Modèle du vaisseau : aucune entrée GLB pour ${shipName}, modèle procédural utilisé.` : `Modèle du vaisseau : échec GLB pour ${shipName}, modèle procédural utilisé.`;
  return reason === "missing"
    ? `Ship model: no GLB manifest entry for ${shipName}; using procedural fallback.`
    : `Ship model: GLB failed for ${shipName}; using procedural fallback.`;
}

function stationTechLabel(level: number, locale: Locale): string {
  return locale === "en" ? `TECH ${level}` : formatTechLevel(locale, level, true);
}

const economyWatchCruiseSpeeds: Partial<Record<FlightEntity["role"], number>> = {
  trader: 112,
  freighter: 86,
  courier: 150,
  miner: 95,
  smuggler: 138
};

interface EconomyWatchTarget {
  name: string;
  position?: Vec3;
  stationId?: string;
}

function getEconomyWatchTarget(
  ship: FlightEntity,
  asteroids: AsteroidEntity[],
  currentSystemId: string
): EconomyWatchTarget | undefined {
  const watchSystemId = ship.economySystemId ?? currentSystemId;
  const route = watchSystemId === currentSystemId ? getEconomyFlightRouteCue(ship, asteroids, currentSystemId) : undefined;
  const targetStation = ship.economyTargetId ? stationById[ship.economyTargetId] : undefined;
  if (route) {
    return {
      name: route.targetName,
      position: route.targetPosition,
      stationId: targetStation?.id
    };
  }
  if (targetStation) {
    return {
      name: targetStation.name,
      position: watchSystemId !== "__transit__" && targetStation.systemId === watchSystemId ? targetStation.position : undefined,
      stationId: targetStation.id
    };
  }
  return undefined;
}

function formatTaskProgress(locale: Locale, progress: number | undefined): string | undefined {
  return progress === undefined ? undefined : `${formatNumber(locale, Math.round(progress * 100))}%`;
}

function formatEtaDuration(locale: Locale, seconds: number): string {
  const rounded = Math.max(1, Math.round(seconds));
  const minutes = Math.floor(rounded / 60);
  const remainingSeconds = rounded % 60;
  if (minutes <= 0) return `${formatNumber(locale, rounded)}s`;
  return `${formatNumber(locale, minutes)}m ${formatNumber(locale, remainingSeconds)}s`;
}

function formatWatchEta(locale: Locale, ship: FlightEntity, target: EconomyWatchTarget | undefined): string {
  if (target?.position) {
    const currentSpeed = Math.hypot(...ship.velocity);
    const cruiseSpeed = economyWatchCruiseSpeeds[ship.role] ?? 100;
    return formatEtaDuration(locale, distance(ship.position, target.position) / Math.max(12, currentSpeed || cruiseSpeed));
  }
  return formatTaskProgress(locale, ship.economyTaskProgress) ?? translateText("In transit", locale);
}

function cargoUnitCount(ship: FlightEntity): number {
  return Object.values(ship.economyCargo ?? {}).reduce((total, amount) => total + (amount ?? 0), 0);
}

function watchUnitLabel(locale: Locale): string {
  if (locale === "zh-CN" || locale === "zh-TW") return "单位";
  if (locale === "ja") return "単位";
  if (locale === "fr") return "unité";
  return "unit";
}

function formatWatchLedgerNet(locale: Locale, ledger: { revenue: number; expenses: number; losses: number } | undefined): string {
  if (!ledger) return formatCredits(locale, 0, true);
  const value = ledger.revenue - ledger.expenses - ledger.losses;
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatCredits(locale, Math.abs(value), true)}`;
}

function formatWatchRiskPreference(locale: Locale, risk: string | undefined): string {
  if (!risk) return translateText("Balanced", locale);
  return translateText(risk[0].toUpperCase() + risk.slice(1), locale);
}

function getWatchMarketPressure(ship: FlightEntity, marketState: MarketState, target: EconomyWatchTarget | undefined) {
  if (!target?.stationId || !ship.economyCommodityId) return undefined;
  const station = stationById[target.stationId];
  if (!station) return undefined;
  return {
    station,
    commodityId: ship.economyCommodityId,
    entry: getMarketEntry(marketState, station.id, ship.economyCommodityId)
  };
}

function getWatchRouteProfit(ship: FlightEntity, marketState: MarketState, target: EconomyWatchTarget | undefined, locale: Locale): string | undefined {
  if (!target?.stationId || !ship.economyCommodityId) return undefined;
  const hints = getTradeHints(marketState, 80).filter((hint) => hint.commodityId === ship.economyCommodityId);
  const match = (ship.economyTaskKind === "buying"
    ? hints.find((hint) => hint.fromStationId === target.stationId)
    : hints.find((hint) => hint.toStationId === target.stationId)) ?? hints.find((hint) => hint.fromStationId === target.stationId || hint.toStationId === target.stationId);
  if (!match) return undefined;
  return `${localizeStationName(match.fromStationId, locale, match.fromStationName)} -> ${localizeStationName(match.toStationId, locale, match.toStationName)} · +${formatCredits(locale, match.profit, true)}/${watchUnitLabel(locale)}`;
}

const npcInteractionActions: NpcInteractionAction[] = ["hail", "escort", "rob", "rescue", "report"];

function npcInteractionLabel(action: NpcInteractionAction): string {
  return action[0].toUpperCase() + action.slice(1);
}

function npcInteractionShortcut(action: NpcInteractionAction): string {
  return String(npcInteractionActions.indexOf(action) + 1);
}

function canUseNpcInteraction(action: NpcInteractionAction, ship: FlightEntity, runtimeClock: number): boolean {
  if (action === "hail") return true;
  if (action === "escort") return ship.role === "trader" || ship.role === "freighter" || ship.role === "courier" || ship.role === "miner";
  if (action === "rob") return cargoUnitCount(ship) > 0;
  if (action === "rescue") return hasActiveCivilianDistress(ship, runtimeClock);
  if (action === "report") return ship.role === "smuggler" || hasActiveCivilianDistress(ship, runtimeClock) || ship.aiTargetId === "player" || !!ship.provokedByPlayer;
  return false;
}

function NpcInteractionActions({ ship, compact = false }: { ship: FlightEntity; compact?: boolean }) {
  const locale = useGameStore((state) => state.locale);
  const runtimeClock = useGameStore((state) => state.runtime.clock);
  const executeNpcInteraction = useGameStore((state) => state.executeNpcInteraction);
  return (
    <div className={compact ? "npc-interaction-actions compact" : "npc-interaction-actions"}>
      {npcInteractionActions.map((action) => (
        <ShortcutButton
          key={action}
          type="button"
          shortcut={npcInteractionShortcut(action)}
          disabled={!canUseNpcInteraction(action, ship, runtimeClock)}
          title={translateText(npcInteractionLabel(action), locale)}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            void executeNpcInteraction(action, ship.id);
          }}
        >
          {translateText(npcInteractionLabel(action), locale)}
        </ShortcutButton>
      ))}
    </div>
  );
}

function NpcInteractionOverlay() {
  const locale = useGameStore((state) => state.locale);
  const interaction = useGameStore((state) => state.npcInteraction);
  const objective = useGameStore((state) => state.npcObjective);
  const runtime = useGameStore((state) => state.runtime);
  const gameClock = useGameStore((state) => state.gameClock);
  const closeNpcInteraction = useGameStore((state) => state.closeNpcInteraction);
  const startJumpToStation = useGameStore((state) => state.startJumpToStation);
  const ship = interaction ? runtime.enemies.find((item) => item.id === interaction.npcId) : undefined;
  if (!interaction || !ship) return null;
  const objectiveActive = objective?.npcId === ship.id ? objective : undefined;
  const personalCallStation = ship.economyPersonalOfferId && ship.economyHomeStationId ? stationById[ship.economyHomeStationId] : undefined;
  return (
    <div className="npc-interaction-overlay" data-testid="npc-interaction-overlay" onMouseDown={(event) => event.stopPropagation()}>
      <header>
        <div>
          <p className="eyebrow">{translateText("NPC Interaction", locale)}</p>
          <h2>{translateDisplayName(ship.name, locale)}</h2>
        </div>
        <ShortcutButton type="button" shortcut="Esc" onClick={closeNpcInteraction} aria-label={translateText("Close NPC interaction", locale)} title={translateText("Close NPC interaction", locale)}>X</ShortcutButton>
      </header>
      <p>
        {formatRuntimeText(locale, ship.economyStatus)}
        {ship.economySerial ? ` · ${ship.economySerial}` : ""}
        {ship.economyRelationSummary ? ` · ${formatRuntimeText(locale, ship.economyRelationSummary)}` : ""}
        {hasActiveCivilianDistress(ship, runtime.clock) ? ` · ${translateText("DISTRESS", locale)}` : ""}
      </p>
      <NpcInteractionActions ship={ship} />
      {personalCallStation ? (
        <ShortcutButton type="button" className="primary" shortcut="Enter" onClick={() => startJumpToStation(personalCallStation.id)} title={translateText("Route to Personal Call", locale)}>
          {translateText("Route to Personal Call", locale)}
        </ShortcutButton>
      ) : null}
      {interaction.pending ? <p className="npc-interaction-message">{translateText("Pending backend confirmation...", locale)}</p> : null}
      {interaction.message ? <p className="npc-interaction-message">{formatRuntimeText(locale, interaction.message)}</p> : null}
      {objectiveActive ? (
        <p className="npc-interaction-objective">
          {translateText(objectiveActive.kind === "escort" ? "Escort active" : "Rescue active", locale)}
          {" · "}
          {formatNumber(locale, Math.max(0, Math.ceil(objectiveActive.expiresAt - gameClock)))}s
        </p>
      ) : null}
    </div>
  );
}

function EconomyWatchOverlay() {
  const locale = useGameStore((state) => state.locale);
  const currentSystemId = useGameStore((state) => state.currentSystemId);
  const runtime = useGameStore((state) => state.runtime);
  const marketState = useGameStore((state) => state.marketState);
  const economyEvents = useGameStore((state) => state.economyEvents);
  const watch = useGameStore((state) => state.economyNpcWatch);
  const stopEconomyNpcWatch = useGameStore((state) => state.stopEconomyNpcWatch);
  const startJumpToStation = useGameStore((state) => state.startJumpToStation);
  const ship = watch ? runtime.enemies.find((item) => item.id === watch.npcId) : undefined;
  if (!watch || !ship) return null;
  const target = getEconomyWatchTarget(ship, runtime.asteroids, currentSystemId);
  const taskProgress = formatTaskProgress(locale, ship.economyTaskProgress);
  const eta = formatWatchEta(locale, ship, target);
  const marketPressure = getWatchMarketPressure(ship, marketState, target);
  const routeProfit = getWatchRouteProfit(ship, marketState, target, locale);
  const recentEvents = economyEvents.filter((event) => event.npcId === ship.id).slice(-3).reverse();
  const homeStation = ship.economyHomeStationId ? stationById[ship.economyHomeStationId] : undefined;
  const ledger = ship.economyLedger;
  const distressActive = hasActiveCivilianDistress(ship, runtime.clock);
  const threat = distressActive && ship.distressThreatId
    ? runtime.enemies.find((item) => item.id === ship.distressThreatId && item.hull > 0 && item.deathTimer === undefined)
    : undefined;
  const cargo = ship.economyCargo && Object.keys(ship.economyCargo).length > 0
    ? formatCargoContents(locale, ship.economyCargo)
    : translateText("Empty hold", locale);
  const personalCallStation = ship.economyPersonalOfferId && ship.economyHomeStationId ? stationById[ship.economyHomeStationId] : undefined;
  return (
    <div className={`economy-watch-overlay${distressActive ? " distress" : ""}`} data-testid="economy-watch-overlay">
      <header className="economy-watch-header">
        <div>
          <p className="eyebrow">{translateText("Watching", locale)}</p>
          <h2>{translateDisplayName(ship.name, locale)}</h2>
        </div>
        <ShortcutButton
          type="button"
          className="economy-watch-return"
          shortcut="Esc"
          title={translateText("Return", locale)}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            stopEconomyNpcWatch();
          }}
        >
          {translateText("Return", locale)}
        </ShortcutButton>
      </header>
      <div className="economy-watch-status-row">
        <span className={`economy-watch-pill task-${ship.economyTaskKind ?? "idle"}`}>{formatRuntimeText(locale, ship.economyStatus)}</span>
        {distressActive ? <span className="economy-watch-pill danger">{translateText("DISTRESS", locale)}</span> : null}
        {ship.economyRelationTier ? <span className={`economy-watch-pill relation-${ship.economyRelationTier}`}>{formatRuntimeText(locale, ship.economyRelationSummary ?? ship.economyRelationTier)}</span> : null}
        {personalCallStation ? <span className="economy-watch-pill">{translateText("Personal Call", locale)}</span> : null}
      </div>
      <NpcInteractionActions ship={ship} compact />
      {personalCallStation ? (
        <ShortcutButton
          type="button"
          className="primary"
          shortcut="Enter"
          title={translateText("Route to Personal Call", locale)}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            startJumpToStation(personalCallStation.id);
          }}
        >
          {translateText("Route to Personal Call", locale)}
        </ShortcutButton>
      ) : null}
      <div className="economy-watch-grid">
        <p><b>{translateText("Identity", locale)}</b><span>{ship.economySerial ?? ship.id}</span></p>
        <p><b>{translateText("Home", locale)}</b><span>{homeStation ? localizeStationName(homeStation.id, locale, homeStation.name) : translateText("Unknown", locale)}</span></p>
        <p><b>{translateText("Relation", locale)}</b><span>{formatRuntimeText(locale, ship.economyRelationSummary ?? "No history")}</span></p>
        <p><b>{translateText("Risk", locale)}</b><span>{formatWatchRiskPreference(locale, ship.economyRiskPreference)}</span></p>
        <p><b>{translateText("Contract", locale)}</b><span>{ship.economyContractId ?? translateText("None", locale)}</span></p>
        <p><b>{translateText("P/L", locale)}</b><span>{formatWatchLedgerNet(locale, ledger)}</span></p>
        <p><b>{translateText("Task", locale)}</b><span>{translateText((ship.economyTaskKind ?? "idle").toUpperCase(), locale)}</span></p>
        <p><b>{translateText("Progress", locale)}</b><span>{taskProgress ?? translateText("Tracking", locale)}</span></p>
        <p><b>{translateText("ETA", locale)}</b><span>{eta}</span></p>
        <p><b>{translateText("Target", locale)}</b><span>{target ? translateDisplayName(target.name, locale) : translateText("In transit", locale)}</span></p>
        <p><b>{translateText("Hull", locale)}</b><span>{formatNumber(locale, Math.round(ship.hull))}/{formatNumber(locale, ship.maxHull)}</span></p>
        <p><b>{translateText("Shield", locale)}</b><span>{formatNumber(locale, Math.round(ship.shield))}/{formatNumber(locale, ship.maxShield)}</span></p>
        <p><b>{translateText("Cargo", locale)}</b><span>{formatNumber(locale, cargoUnitCount(ship))}</span></p>
        <p><b>{translateText("Camera", locale)}</b><span>{translateText(watch.cameraMode === "cockpit" ? "Cockpit" : "Chase", locale)}</span></p>
      </div>
      <section className="economy-watch-section">
        <h3>{translateText("Cargo", locale)}</h3>
        <p>{cargo}</p>
      </section>
      {ledger ? (
        <section className="economy-watch-section">
          <h3>{translateText("Ledger", locale)}</h3>
          <p>
            {translateText("Revenue", locale)} {formatCredits(locale, ledger.revenue, true)}
            {" · "}
            {translateText("Expenses", locale)} {formatCredits(locale, ledger.expenses, true)}
            {" · "}
            {translateText("Losses", locale)} {formatCredits(locale, ledger.losses, true)}
            {" · "}
            {translateText("Contracts", locale)} {formatNumber(locale, ledger.completedContracts)}/{formatNumber(locale, ledger.failedContracts)}
          </p>
        </section>
      ) : null}
      {distressActive ? (
        <section className="economy-watch-section economy-watch-alert">
          <h3>{translateText("Under attack", locale)}</h3>
          <p>
            {threat ? translateDisplayName(threat.name, locale) : translateText("Hostile contact", locale)}
            {threat ? ` · ${formatDistance(locale, distance(ship.position, threat.position))}` : ""}
          </p>
        </section>
      ) : null}
      {marketPressure ? (
        <section className="economy-watch-section">
          <h3>{translateText("Target Market", locale)}</h3>
          <p>
            {localizeStationName(marketPressure.station.id, locale, marketPressure.station.name)} · {localizeCommodityName(marketPressure.commodityId, locale, commodityById[marketPressure.commodityId].name)}
          </p>
          <p>
            {translateText("Stock", locale)} {formatNumber(locale, Math.round(marketPressure.entry.stock))}/{formatNumber(locale, marketPressure.entry.maxStock)}
            {" · "}
            {translateText("Demand", locale)} {formatNumber(locale, Number(marketPressure.entry.demand.toFixed(2)))}
          </p>
          {routeProfit ? <p>{translateText("Estimated margin", locale)}: {routeProfit}</p> : null}
        </section>
      ) : null}
      {recentEvents.length > 0 ? (
        <section className="economy-watch-section">
          <h3>{translateText("Recent Events", locale)}</h3>
          <ol className="economy-watch-events">
            {recentEvents.map((event) => (
              <li key={event.id}>{formatRuntimeText(locale, event.message)}</li>
            ))}
          </ol>
        </section>
      ) : null}
      <div className="economy-watch-hints">
        <span>{translateText("Mouse look", locale)}</span>
        <span>C {translateText(watch.cameraMode === "cockpit" ? "Chase" : "Cockpit", locale)}</span>
        <span>{translateText("Esc Return", locale)}</span>
      </div>
    </div>
  );
}

export function FlightScene() {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const screen = useGameStore((state) => state.screen);
  const currentSystemId = useGameStore((state) => state.currentSystemId);
  const player = useGameStore((state) => state.player);
  const knownPlanetIds = useGameStore((state) => state.knownPlanetIds);
  const explorationState = useGameStore((state) => state.explorationState);
  const [shipModelStatus, setShipModelStatus] = useState<ShipModelStatus | null>(null);
  const updateShipModelStatus = useCallback((status: ShipModelStatus | null) => {
    setShipModelStatus((current) => (current?.kind === status?.kind && current?.text === status?.text ? current : status));
  }, []);
  const equipmentEffects = getPlayerRuntimeEffects(player);
  const navigationTarget = screen === "economyWatch" ? undefined : getNearestNavigationTarget(currentSystemId, player.position, knownPlanetIds, {
    explorationState,
    installedEquipment: player.equipment,
    runtimeEffects: equipmentEffects
  });
  const navigationCue = getNavigationTargetCue(navigationTarget);
  const locale = useGameStore((state) => state.locale);
  const graphicsSettings = useGameStore((state) => state.graphicsSettings);
  const hint = getLocalizedNavigationHintText(navigationTarget, locale);
  return (
    <div
      ref={canvasRef}
      className="flight-canvas"
      onClick={() => {
        canvasRef.current?.requestPointerLock?.();
      }}
    >
      <FlightInputControls />
      <TouchFlightInputControls />
      <Canvas
        camera={{ position: [0, 36, 210], fov: 68, near: 0.1, far: 5200 }}
        dpr={graphicsSettings.dprRange}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        onCreated={({ gl, scene }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 0.76;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          scene.fog = new THREE.FogExp2("#030712", 0.00013);
        }}
        shadows={graphicsSettings.shadows}
      >
        <Suspense fallback={null}>
          <FlightSimulationTicker />
          <CameraRig />
          <PostProcessingRig />
          <SceneContent onShipModelStatus={updateShipModelStatus} />
        </Suspense>
      </Canvas>
      {shipModelStatus ? <div className={`ship-model-status ${shipModelStatus.kind}`}>{shipModelStatus.text}</div> : null}
      {screen === "economyWatch" ? <EconomyWatchOverlay /> : null}
      <NpcInteractionOverlay />
      {hint ? <div className={`dock-hint ${navigationCue ? `dock-hint-${navigationCue.tone}` : ""} ${navigationCue?.inRange ? "in-range" : ""}`}>{hint}</div> : null}
    </div>
  );
}
