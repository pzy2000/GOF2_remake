import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Html, Line, Stars, useGLTF } from "@react-three/drei";
import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import * as THREE from "three";
import { planetById, planets, shipById, systemById, useGameStore } from "../state/gameStore";
import type { AsteroidEntity, ConvoyEntity, ExplorationSignalDefinition, FlightEntity, LootEntity, PlanetDefinition, ProjectileEntity, SalvageEntity, StationDefinition, Vec3, VisualEffectEntity } from "../types/game";
import { add, forwardFromRotation, normalize, scale, sub } from "../systems/math";
import { getOreColor } from "../systems/difficulty";
import { getJumpGatePosition } from "../systems/autopilot";
import { getNavigationHintText, getNavigationTargetCue, getNearestNavigationTarget } from "../systems/navigation";
import type { NavigationCueTone } from "../systems/navigation";
import { getIncompleteExplorationSignals, getVisibleStationsForSystem, isExplorationSignalDiscovered } from "../systems/exploration";

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
      if (state.screen !== "flight") return;
      if (state.autopilot) return;
      setInput({ mouseDX: state.input.mouseDX + event.movementX, mouseDY: state.input.mouseDY + event.movementY });
    };
    const onMouseDown = (event: MouseEvent) => {
      if (event.button === 0) setInput({ firePrimary: true });
      if (event.button === 2) setInput({ fireSecondary: true });
    };
    const onMouseUp = (event: MouseEvent) => {
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

function SimulationTicker() {
  const tick = useGameStore((state) => state.tick);
  useFrame((_, delta) => tick(Math.min(delta, 0.05)));
  return null;
}

function CameraRig() {
  const { camera } = useThree();
  const player = useGameStore((state) => state.player);
  const cameraMode = useGameStore((state) => state.cameraMode);
  const afterburnerHeld = useGameStore((state) => state.input.afterburner);
  useFrame(() => {
    const forward = forwardFromRotation(player.rotation);
    const speed = Math.hypot(...player.velocity);
    const speedPullback = Math.min(56, speed * 0.22 + (afterburnerHeld ? 18 : 0));
    const chaseOffset =
      cameraMode === "chase" ? add(scale(forward, -86 - speedPullback), [0, 28 + speedPullback * 0.08, 0]) : add(scale(forward, -122 - speedPullback), [44, 52, 0]);
    const targetPosition = add(player.position, chaseOffset);
    camera.position.lerp(new THREE.Vector3(...targetPosition), 0.08);
    camera.lookAt(new THREE.Vector3(...add(player.position, scale(forward, 90))));
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

const playerShipVisuals: Record<string, { scale: number; engines: Vec3[]; flameColor: string; afterburnerColor: string }> = {
  "sparrow-mk1": { scale: 1, engines: [[-5.5, -1.6, 17], [5.5, -1.6, 17]], flameColor: "#ff8b3d", afterburnerColor: "#66e4ff" },
  "mule-lx": { scale: 0.95, engines: [[-12, -3, 20], [12, -3, 20]], flameColor: "#ffb657", afterburnerColor: "#7ee7ff" },
  "raptor-v": { scale: 0.96, engines: [[-8, -1.8, 18], [0, -1.2, 20], [8, -1.8, 18]], flameColor: "#ff5f6d", afterburnerColor: "#70f0ff" },
  "bastion-7": { scale: 0.9, engines: [[-14, -4, 22], [0, -3, 24], [14, -4, 22]], flameColor: "#ff7a45", afterburnerColor: "#ffd166" },
  "horizon-ark": { scale: 0.92, engines: [[-16, -2.4, 24], [-5, -2, 26], [5, -2, 26], [16, -2.4, 24]], flameColor: "#8ff7ff", afterburnerColor: "#ffffff" }
};

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

function GltfPlayerShip({ onLoaded, shipId, url }: { onLoaded: () => void; shipId: string; url: string }) {
  const gltf = useGLTF(url);
  useEffect(() => {
    onLoaded();
  }, [onLoaded]);
  const clone = useMemo(() => {
    const scene = gltf.scene.clone(true);
    scene.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    return scene;
  }, [gltf.scene]);
  const visual = playerShipVisuals[shipId] ?? playerShipVisuals["sparrow-mk1"];
  return <primitive object={clone} scale={visual.scale} />;
}

function ProceduralPlayerShip({ shipId }: { shipId: string }) {
  const color =
    shipId === "mule-lx"
      ? "#9a7b4f"
      : shipId === "raptor-v"
        ? "#d94b58"
        : shipId === "bastion-7"
          ? "#6f2530"
          : shipId === "horizon-ark"
            ? "#f5ead2"
            : "#cfefff";
  return (
    <>
      <mesh position={[0, 0, -8]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <coneGeometry args={[9, 32, shipId === "raptor-v" ? 3 : 5]} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.32} emissive="#12334a" />
      </mesh>
      <mesh position={[0, 1.8, 2]} scale={shipId === "mule-lx" ? [1.8, 0.95, 1.2] : shipId === "bastion-7" ? [1.55, 1.1, 1.25] : [1.05, 0.65, 1]} castShadow>
        <boxGeometry args={[16, 9, 26]} />
        <meshStandardMaterial color={shipId === "horizon-ark" ? "#d8c58e" : "#15354d"} metalness={0.38} roughness={0.36} emissive="#092033" />
      </mesh>
      <mesh position={[0, 5.2, -8]} castShadow>
        <sphereGeometry args={[4.8, 12, 8]} />
        <meshStandardMaterial color="#9be8ff" metalness={0.2} roughness={0.18} emissive="#1e95c8" emissiveIntensity={0.42} />
      </mesh>
      <mesh position={[0, 0.4, 6]} castShadow>
        <boxGeometry args={shipId === "mule-lx" ? [56, 4, 14] : shipId === "raptor-v" ? [48, 2, 10] : [40, 2.2, 12]} />
        <meshStandardMaterial color={shipId === "raptor-v" ? "#2a2f35" : "#318ccf"} metalness={0.55} roughness={0.28} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 15, 0.2, -2]} rotation={[0, 0, side * -0.34]} castShadow>
          <boxGeometry args={[6, 1.8, shipId === "horizon-ark" ? 34 : 24]} />
          <meshStandardMaterial color={shipId === "bastion-7" ? "#7a2e36" : "#71c9ff"} metalness={0.45} roughness={0.32} emissive="#0e3658" />
        </mesh>
      ))}
      <mesh position={[0, -0.4, -18]} rotation={[0.24, 0, 0]} castShadow>
        <boxGeometry args={[5, 13, 2.4]} />
        <meshStandardMaterial color="#2b89bd" metalness={0.55} roughness={0.28} />
      </mesh>
    </>
  );
}

function PlayerEngineFlames({ shipId, afterburning, speed }: { shipId: string; afterburning: boolean; speed: number }) {
  const visual = playerShipVisuals[shipId] ?? playerShipVisuals["sparrow-mk1"];
  const flameScale = Math.max(0.65, Math.min(2.8, speed / 120 + (afterburning ? 1.05 : 0)));
  const color = afterburning ? visual.afterburnerColor : visual.flameColor;
  return (
    <>
      {visual.engines.map((position, index) => (
        <group key={`${shipId}-engine-${index}`} position={toThree(position)}>
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
  const modelUrl = useGameStore((state) => state.assetManifest.shipModels[state.player.shipId]);
  const afterburning = useGameStore((state) => state.input.afterburner && state.player.energy > 12);
  const speed = Math.hypot(...player.velocity);
  const fallback = <ProceduralPlayerShip shipId={player.shipId} />;
  const shipName = shipById[player.shipId]?.name ?? player.shipId;

  useEffect(() => {
    if (modelUrl) {
      onModelStatus(null);
    } else {
      onModelStatus({ kind: "fallback", text: `Ship model: no GLB manifest entry for ${shipName}; using procedural fallback.` });
    }
  }, [modelUrl, onModelStatus, shipName]);

  const markLoaded = useCallback(() => {
    onModelStatus(null);
  }, [onModelStatus]);

  const markFallback = useCallback(() => {
    onModelStatus({ kind: "fallback", text: `Ship model: GLB failed for ${shipName}; using procedural fallback.` });
  }, [onModelStatus, shipName]);

  return (
    <group position={toThree(player.position)} rotation={player.rotation}>
      {modelUrl ? (
        <ShipModelBoundary key={player.shipId} fallback={fallback} onFallback={markFallback}>
          <Suspense fallback={fallback}>
            <GltfPlayerShip onLoaded={markLoaded} shipId={player.shipId} url={modelUrl} />
          </Suspense>
        </ShipModelBoundary>
      ) : (
        fallback
      )}
      <PlayerEngineFlames shipId={player.shipId} afterburning={afterburning} speed={speed} />
    </group>
  );
}

function FreighterNpcShip({ ship }: { ship: FlightEntity }) {
  const clock = useGameStore((state) => state.runtime.clock);
  const textureUrl = useGameStore((state) => state.assetManifest.npcShipTextures.freighter);
  const texture = useLoader(THREE.TextureLoader, textureUrl);
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
  return (
    <group position={toThree(ship.position)} rotation={[0, yaw, 0]} scale={ship.deathTimer !== undefined ? 0.86 : 1}>
      <mesh castShadow>
        <boxGeometry args={[30, 15, 58]} />
        <meshStandardMaterial map={texture} color={flashing ? "#ffffff" : "#c9a86a"} metalness={0.44} roughness={0.5} emissive="#1b2b34" emissiveIntensity={flashing ? 0.7 : 0.12} transparent opacity={opacity} />
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
      <Html center distanceFactor={13} className="target-label npc-label">
        {ship.economyStatus ?? `FREIGHTER · ${Math.round(ship.hull)}/${ship.maxHull}`}
      </Html>
    </group>
  );
}

function DroneNpcShip({ ship }: { ship: FlightEntity }) {
  const clock = useGameStore((state) => state.runtime.clock);
  const direction = normalize(ship.velocity);
  const yaw = Math.atan2(direction[0], -direction[2]);
  const pulse = 0.5 + Math.sin(clock * 7.2 + ship.position[0] * 0.02) * 0.5;
  const flashing = clock - ship.lastDamageAt < 0.18 || ship.deathTimer !== undefined;
  const opacity = ship.deathTimer !== undefined ? 0.42 : 1;
  return (
    <group position={toThree(ship.position)} rotation={[0, yaw, 0]} scale={ship.deathTimer !== undefined ? 0.78 : 1}>
      <mesh castShadow rotation={[clock * 1.2, clock * 0.4, 0]}>
        <octahedronGeometry args={[14 + pulse * 2.8, 1]} />
        <meshStandardMaterial color={flashing ? "#ffffff" : "#8ff7ff"} metalness={0.48} roughness={0.24} emissive="#2de4ff" emissiveIntensity={flashing ? 1.2 : 0.45 + pulse * 0.3} transparent opacity={opacity} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, clock * 1.6]}>
        <torusGeometry args={[25 + pulse * 4, 1.6, 8, 42]} />
        <meshBasicMaterial color="#ff9bd5" transparent opacity={(0.28 + pulse * 0.3) * opacity} toneMapped={false} />
      </mesh>
      {[0, 1, 2].map((index) => {
        const angle = index * ((Math.PI * 2) / 3) + clock * 0.8;
        return (
          <mesh key={index} position={[Math.cos(angle) * 22, Math.sin(angle) * 8, Math.sin(angle) * 22]}>
            <sphereGeometry args={[3.2 + pulse * 1.4, 10, 8]} />
            <meshBasicMaterial color={index === 1 ? "#ff9bd5" : "#9bffe8"} transparent opacity={0.68 * opacity} toneMapped={false} />
          </mesh>
        );
      })}
      <pointLight color="#9bffe8" intensity={1.1 + pulse * 1.1} distance={180} />
      {ship.storyTarget ? (
        <Html center distanceFactor={12} className="target-label story-target-label">
          {ship.name.toUpperCase()}
        </Html>
      ) : null}
    </group>
  );
}

function RelayNpcCore({ ship }: { ship: FlightEntity }) {
  const clock = useGameStore((state) => state.runtime.clock);
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
        {ship.storyTargetKind === "jammer" ? "JAMMER" : "RELAY"} · {Math.round(ship.hull)}/{ship.maxHull}
      </Html>
    </group>
  );
}

function NpcShip({ ship }: { ship: FlightEntity }) {
  const clock = useGameStore((state) => state.runtime.clock);
  const miningTarget = useGameStore((state) =>
    ship.economyTaskKind === "mining" && ship.economyTargetId
      ? state.runtime.asteroids.find((asteroid) => asteroid.id === ship.economyTargetId)
      : undefined
  );
  if (ship.role === "freighter") return <FreighterNpcShip ship={ship} />;
  if (ship.role === "drone") return <DroneNpcShip ship={ship} />;
  if (ship.role === "relay") return <RelayNpcCore ship={ship} />;
  const color = ship.role === "pirate" ? "#ff4e5f" : ship.role === "patrol" ? "#5dc8ff" : ship.role === "smuggler" ? "#ff9b52" : ship.role === "courier" ? "#9bffe8" : ship.role === "miner" ? "#ffd166" : "#f6c96d";
  const direction = normalize(ship.velocity);
  const yaw = Math.atan2(direction[0], -direction[2]);
  const flashing = clock - ship.lastDamageAt < 0.18 || ship.deathTimer !== undefined;
  const speed = Math.hypot(...ship.velocity);
  const flameScale = Math.max(0.45, Math.min(1.45, speed / 115));
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
      <group position={toThree(ship.position)} rotation={[0, yaw, 0]} scale={ship.deathTimer !== undefined ? 0.82 : 1}>
        <mesh castShadow>
          <coneGeometry args={body.cone} />
          <meshStandardMaterial color={flashing ? "#ffffff" : color} metalness={0.35} roughness={0.44} emissive={color} emissiveIntensity={flashing ? 0.85 : 0.16} transparent opacity={ship.deathTimer !== undefined ? 0.45 : 1} />
        </mesh>
        <mesh position={[0, 0, body.offset]} castShadow>
          <boxGeometry args={body.wing} />
          <meshStandardMaterial color={body.tail} metalness={0.28} roughness={0.5} transparent opacity={ship.deathTimer !== undefined ? 0.45 : 1} />
        </mesh>
        {ship.role === "pirate" ? (
          <>
            <mesh position={[-8, 1, -3]} rotation={[0, 0, 0.7]}>
              <boxGeometry args={[3, 1.4, 18]} />
              <meshStandardMaterial color="#711f2d" metalness={0.32} roughness={0.44} emissive="#23050a" />
            </mesh>
            <mesh position={[8, 1, -3]} rotation={[0, 0, -0.7]}>
              <boxGeometry args={[3, 1.4, 18]} />
              <meshStandardMaterial color="#711f2d" metalness={0.32} roughness={0.44} emissive="#23050a" />
            </mesh>
          </>
        ) : null}
        {ship.role === "patrol" ? (
          <mesh position={[0, 4.5, -6]}>
            <boxGeometry args={[4, 7, 2]} />
            <meshStandardMaterial color="#84d8ff" metalness={0.4} roughness={0.35} emissive="#1b719d" emissiveIntensity={0.25} />
          </mesh>
        ) : null}
        {ship.role === "trader" ? (
          <>
            <mesh position={[-12, -1, -1]}>
              <boxGeometry args={[6, 6, 13]} />
              <meshStandardMaterial color="#6b522c" metalness={0.25} roughness={0.58} />
            </mesh>
            <mesh position={[12, -1, -1]}>
              <boxGeometry args={[6, 6, 13]} />
              <meshStandardMaterial color="#6b522c" metalness={0.25} roughness={0.58} />
            </mesh>
          </>
        ) : null}
        <mesh position={[0, -1.4, 13]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, flameScale]}>
          <coneGeometry args={[ship.role === "trader" ? 4.2 : 3, 13, 12]} />
          <meshBasicMaterial color={ship.role === "pirate" ? "#ff5f6d" : "#64e4ff"} transparent opacity={0.36} toneMapped={false} />
        </mesh>
        {ship.economyStatus ? (
          <Html center distanceFactor={12} className="target-label npc-label">
            {ship.economyStatus}
          </Html>
        ) : ship.storyTarget ? (
          <Html center distanceFactor={12} className="target-label story-target-label">
            {ship.elite ? "ELITE · " : ""}{ship.name.toUpperCase()}
          </Html>
        ) : null}
      </group>
    </>
  );
}

function ConvoyShip({ convoy }: { convoy: ConvoyEntity }) {
  const direction = normalize(convoy.velocity);
  const yaw = Math.atan2(direction[0], -direction[2]);
  const healthRatio = convoy.hull / convoy.maxHull;
  return (
    <group position={toThree(convoy.position)} rotation={[0, yaw, 0]}>
      <mesh>
        <boxGeometry args={[34, 12, 42]} />
        <meshStandardMaterial color="#c9a86a" metalness={0.35} roughness={0.48} emissive={healthRatio < 0.35 ? "#5f1d14" : "#1d342f"} emissiveIntensity={0.18} />
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
      <Html center distanceFactor={12} className="target-label">
        ESCORT · {Math.round(convoy.hull)}/{convoy.maxHull}
      </Html>
    </group>
  );
}

function SalvageCrate({ salvage }: { salvage: SalvageEntity }) {
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
        SALVAGE · E
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
  const explorationState = useGameStore((state) => state.explorationState);
  const activeScan = useGameStore((state) => state.runtime.explorationScan);
  const discovered = isExplorationSignalDiscovered(signal.id, explorationState);
  const scanning = activeScan?.signalId === signal.id;
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
        {scanning ? "SCANNING" : discovered ? signal.title.toUpperCase() : signal.maskedTitle.toUpperCase()}
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

function PlanetModel({ planet }: { planet: PlanetDefinition }) {
  const textureUrl = useGameStore((state) => state.assetManifest.planetTextures[planet.textureKey] || state.assetManifest.nebulaBg);
  const clock = useGameStore((state) => state.runtime.clock);
  const texture = useLoader(THREE.TextureLoader, textureUrl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 4;
  return (
    <group position={toThree(planet.position)}>
      <mesh rotation={[0, clock * 0.015 + planet.radius * 0.0007, 0]}>
        <sphereGeometry args={[planet.radius, 64, 32]} />
        <meshStandardMaterial map={texture} roughness={0.82} metalness={0.03} emissive="#05070d" emissiveIntensity={0.05} />
      </mesh>
      <mesh>
        <sphereGeometry args={[planet.radius * 1.018, 48, 24]} />
        <meshBasicMaterial color={planet.atmosphereColor} transparent opacity={0.11} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, clock * 0.01]}>
        <torusGeometry args={[planet.radius * 1.16, Math.max(1.4, planet.radius * 0.004), 8, 96]} />
        <meshBasicMaterial color={planet.atmosphereColor} transparent opacity={0.12} toneMapped={false} />
      </mesh>
      <pointLight color={planet.atmosphereColor} intensity={0.65} distance={planet.radius * 2.3} />
      <Html center distanceFactor={22} className="planet-label" position={[0, planet.radius * 0.72, 0]}>
        {planet.name}
      </Html>
    </group>
  );
}

function UnknownPlanetBeacon({ planet }: { planet: PlanetDefinition }) {
  const clock = useGameStore((state) => state.runtime.clock);
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
        UNKNOWN BEACON
      </Html>
    </group>
  );
}

function JumpGateModel() {
  const currentSystemId = useGameStore((state) => state.currentSystemId);
  const autopilot = useGameStore((state) => state.autopilot);
  const clock = useGameStore((state) => state.runtime.clock);
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
          <torusGeometry args={[88, 5.4, 12, 64]} />
          <meshStandardMaterial color="#7ddcff" emissive="#1f9aff" emissiveIntensity={0.55 + spool * 1.2} metalness={0.55} roughness={0.28} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[124, 3.2, 8, 64]} />
          <meshBasicMaterial color="#8f7bff" transparent opacity={0.35 + spool * 0.35} toneMapped={false} />
        </mesh>
        {[0, 1, 2, 3].map((index) => {
          const angle = index * (Math.PI / 2);
          return (
            <mesh key={index} position={[Math.cos(angle) * 112, Math.sin(angle) * 112, 0]} rotation={[0, 0, angle]}>
              <boxGeometry args={[56, 12, 16]} />
              <meshStandardMaterial color="#52677a" metalness={0.68} roughness={0.26} emissive="#10243b" />
            </mesh>
          );
        })}
      </group>
      <mesh>
        <sphereGeometry args={[18 + pulse * 6 + spool * 16, 20, 12]} />
        <meshBasicMaterial color={spool > 0.82 ? "#ffffff" : "#73f0ff"} transparent opacity={0.32 + spool * 0.42} toneMapped={false} />
      </mesh>
      <Line points={[[-170, 0, 160], [0, 0, 0], [170, 0, 160]]} color="#62d9ff" lineWidth={1.4 + spool * 2.2} transparent opacity={0.18 + spool * 0.42} />
      <pointLight color="#64e4ff" intensity={1 + spool * 4} distance={420} />
      <Html center distanceFactor={13} className="target-label">
        JUMP GATE
      </Html>
    </group>
  );
}

function StationGeometry({ station }: { station: StationDefinition }) {
  const accent =
    station.archetype === "Military Outpost"
      ? "#ff6b6b"
      : station.archetype === "Research Station"
        ? "#9b7bff"
        : station.archetype === "Mining Station"
          ? "#ffd166"
          : station.archetype === "Pirate Black Market"
            ? "#ff4e5f"
            : "#3bb4ff";
  const ringScale = station.archetype === "Trade Hub" ? 1.2 : station.archetype === "Pirate Black Market" ? 0.82 : 1;
  return (
    <group position={toThree(station.position)}>
      <mesh>
        <cylinderGeometry args={[44, 62, 34, 8]} />
        <meshStandardMaterial color="#94a9b8" metalness={0.55} roughness={0.35} emissive="#172436" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} scale={[ringScale, ringScale, ringScale]}>
        <torusGeometry args={[78, 4, 8, 32]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.55} />
      </mesh>
      <mesh position={[0, 0, 52]}>
        <boxGeometry args={[82, 8, 18]} />
        <meshStandardMaterial color="#d4c17d" emissive="#5b4617" emissiveIntensity={0.2} />
      </mesh>
      {station.archetype === "Mining Station" ? (
        <>
          {[-1, 1].map((side) => (
            <group key={side} position={[side * 88, -8, 0]} rotation={[0, 0, side * 0.25]}>
              <mesh>
                <boxGeometry args={[72, 8, 10]} />
                <meshStandardMaterial color="#6b7280" metalness={0.58} roughness={0.5} />
              </mesh>
              <mesh position={[side * 46, 0, -28]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[10, 16, 26, 8]} />
                <meshStandardMaterial color="#d8a23b" metalness={0.45} roughness={0.42} emissive="#53360b" />
              </mesh>
            </group>
          ))}
        </>
      ) : null}
      {station.archetype === "Research Station" ? (
        <>
          {[0, 1, 2].map((index) => (
            <mesh key={index} position={[Math.cos(index * 2.1) * 84, Math.sin(index * 2.1) * 42, Math.sin(index) * 34]} rotation={[0.3, index, 0.2]}>
              <boxGeometry args={[9, 70, 2.4]} />
              <meshStandardMaterial color="#b8ccff" metalness={0.32} roughness={0.25} emissive="#372a77" emissiveIntensity={0.28} />
            </mesh>
          ))}
        </>
      ) : null}
      {station.archetype === "Military Outpost" ? (
        <>
          {[-1, 1].map((side) => (
            <group key={side} position={[side * 54, 42, -22]}>
              <mesh>
                <boxGeometry args={[20, 18, 20]} />
                <meshStandardMaterial color="#4b5563" metalness={0.55} roughness={0.36} />
              </mesh>
              <mesh position={[0, 0, -18]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[3, 4, 34, 8]} />
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
            <mesh key={side} position={[side * 96, 0, 0]}>
              <boxGeometry args={[26, 18, 80]} />
              <meshStandardMaterial color="#788896" metalness={0.44} roughness={0.4} emissive="#172436" />
            </mesh>
          ))}
        </>
      ) : null}
      <pointLight color={accent} intensity={0.75} distance={240} />
      <Html center distanceFactor={13} className="target-label station-tech-label" position={[0, 92, 0]}>
        TECH {station.techLevel} · {station.name}
      </Html>
    </group>
  );
}

function Asteroid({ asteroid }: { asteroid: AsteroidEntity }) {
  const textureUrl = useGameStore((state) => state.assetManifest.asteroidTextures);
  const texture = useLoader(THREE.TextureLoader, textureUrl);
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

function VisualEffect({ effect }: { effect: VisualEffectEntity }) {
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
            {effect.label}
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
            {effect.label}
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

  if ((effect.kind === "launch-trail" || effect.kind === "dock-corridor") && effect.endPosition) {
    const vector = sub(effect.endPosition, effect.position);
    const rings = effect.kind === "dock-corridor" ? [0.28, 0.48, 0.68, 0.88] : [0.35, 0.68, 0.92];
    return (
      <group>
        <Line points={[effect.position, effect.endPosition]} color={effect.color} lineWidth={effect.kind === "dock-corridor" ? 2.4 : 3.2} transparent opacity={alpha * 0.64} />
        <Line points={[effect.position, effect.endPosition]} color={effect.secondaryColor ?? "#ffffff"} lineWidth={0.9} transparent opacity={alpha * 0.34} />
        {rings.map((progress) => {
          const position = add(effect.position, scale(vector, progress));
          const size = effect.size * (effect.kind === "dock-corridor" ? 0.58 + progress * 0.42 : 0.45 + progress * 0.36);
          return (
            <mesh key={progress} position={toThree(position)} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[size, effect.kind === "dock-corridor" ? 1.1 : 1.6, 8, 36]} />
              <meshBasicMaterial color={progress > 0.7 ? effect.secondaryColor ?? effect.color : effect.color} transparent opacity={alpha * (0.24 + progress * 0.3)} toneMapped={false} />
            </mesh>
          );
        })}
        <mesh position={toThree(effect.endPosition)}>
          <sphereGeometry args={[effect.size * 0.22 + alpha * 4, 12, 8]} />
          <meshBasicMaterial color={effect.secondaryColor ?? effect.color} transparent opacity={alpha * 0.38} toneMapped={false} />
        </mesh>
        {effect.label ? (
          <Html center distanceFactor={10} className="effect-label" position={toThree(effect.endPosition)} style={{ opacity: alpha }}>
            {effect.label}
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
  const radius = effect.kind === "explosion" ? effect.size * (1.2 - alpha * 0.55) : effect.size * (1.1 - alpha * 0.35);
  return (
    <group position={toThree(effect.position)}>
      <mesh>
        <sphereGeometry args={[radius, 18, 12]} />
        <meshBasicMaterial color={effect.color} transparent opacity={effect.kind === "explosion" ? alpha * 0.42 : alpha * 0.28} toneMapped={false} />
      </mesh>
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
          {effect.label}
        </Html>
      ) : null}
    </group>
  );
}

function TargetLock() {
  const player = useGameStore((state) => state.player);
  const target = useGameStore((state) => state.runtime.enemies.find((ship) => ship.id === state.targetId && ship.hull > 0 && ship.deathTimer === undefined));
  if (!target) return null;
  const dist = Math.round(Math.hypot(player.position[0] - target.position[0], player.position[1] - target.position[1], player.position[2] - target.position[2]));
  return (
    <group position={toThree(target.position)}>
      <mesh>
        <torusGeometry args={[26, 1.4, 6, 4]} />
        <meshBasicMaterial color="#ffdf6e" transparent opacity={0.78} toneMapped={false} />
      </mesh>
      <Html center distanceFactor={12} className="target-label">
        {target.storyTarget ? "STORY" : "LOCK"} · {dist}m
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
  const player = useGameStore((state) => state.player);
  const knownPlanetIds = useGameStore((state) => state.knownPlanetIds);
  const explorationState = useGameStore((state) => state.explorationState);
  const autopilot = useGameStore((state) => state.autopilot);
  const clock = useGameStore((state) => state.runtime.clock);
  const target = getNearestNavigationTarget(currentSystemId, player.position, knownPlanetIds, {
    explorationState,
    installedEquipment: player.equipment
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
          <b>{cue.label}</b>
          {target.kind === "station" ? <span>Tech {target.station.techLevel}</span> : null}
          <span>{cue.actionLabel} · {cue.distanceLabel}</span>
        </Html>
      </group>
    </group>
  );
}

function SceneContent({ onShipModelStatus }: { onShipModelStatus: (status: ShipModelStatus | null) => void }) {
  const runtime = useGameStore((state) => state.runtime);
  const currentSystemId = useGameStore((state) => state.currentSystemId);
  const explorationState = useGameStore((state) => state.explorationState);
  const ambient = 0.55 + systemById[currentSystemId].risk * 0.2;
  const explorationSignals = getIncompleteExplorationSignals(currentSystemId, explorationState);
  return (
    <>
      <color attach="background" args={["#030712"]} />
      <ambientLight intensity={ambient} />
      <directionalLight position={[180, 220, 120]} intensity={1.4} />
      <pointLight position={[0, 0, 120]} color="#60c8ff" intensity={0.6} distance={500} />
      <InfiniteSkybox />
      <PlanetBackdrops />
      <JumpGateModel />
      <StationModel />
      <PlayerShip onModelStatus={onShipModelStatus} />
      <WormholeTunnel />
      <TargetLock />
      <WaypointMarker />
      {runtime.enemies.map((ship) => (
        <NpcShip key={ship.id} ship={ship} />
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

export function FlightScene() {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const currentSystemId = useGameStore((state) => state.currentSystemId);
  const player = useGameStore((state) => state.player);
  const knownPlanetIds = useGameStore((state) => state.knownPlanetIds);
  const explorationState = useGameStore((state) => state.explorationState);
  const [shipModelStatus, setShipModelStatus] = useState<ShipModelStatus | null>(null);
  const updateShipModelStatus = useCallback((status: ShipModelStatus | null) => {
    setShipModelStatus((current) => (current?.kind === status?.kind && current?.text === status?.text ? current : status));
  }, []);
  const navigationTarget = getNearestNavigationTarget(currentSystemId, player.position, knownPlanetIds, {
    explorationState,
    installedEquipment: player.equipment
  });
  const navigationCue = getNavigationTargetCue(navigationTarget);
  const hint = getNavigationHintText(navigationTarget);
  return (
    <div
      ref={canvasRef}
      className="flight-canvas"
      onClick={() => {
        canvasRef.current?.requestPointerLock?.();
      }}
    >
      <FlightControls />
      <Canvas camera={{ position: [0, 36, 210], fov: 68, near: 0.1, far: 5200 }} dpr={[1, 1.7]} shadows>
        <Suspense fallback={null}>
          <SimulationTicker />
          <CameraRig />
          <SceneContent onShipModelStatus={updateShipModelStatus} />
        </Suspense>
      </Canvas>
      {shipModelStatus ? <div className={`ship-model-status ${shipModelStatus.kind}`}>{shipModelStatus.text}</div> : null}
      {hint ? <div className={`dock-hint ${navigationCue ? `dock-hint-${navigationCue.tone}` : ""} ${navigationCue?.inRange ? "in-range" : ""}`}>{hint}</div> : null}
    </div>
  );
}
