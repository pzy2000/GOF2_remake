import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Html, Line, Stars } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { stationById, stations, systemById, useGameStore } from "../state/gameStore";
import type { AsteroidEntity, FlightEntity, LootEntity, ProjectileEntity, Vec3, VisualEffectEntity } from "../types/game";
import { add, forwardFromRotation, normalize, scale, sub } from "../systems/math";
import { getOreColor } from "../systems/difficulty";

function toThree(position: Vec3): [number, number, number] {
  return [position[0], position[1], position[2]];
}

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

function SpaceBackdrop() {
  const nebula = useGameStore((state) => state.assetManifest.nebulaBg);
  const texture = useLoader(THREE.TextureLoader, nebula);
  texture.colorSpace = THREE.SRGBColorSpace;
  return (
    <mesh position={[0, 0, -1250]}>
      <planeGeometry args={[2200, 1450]} />
      <meshBasicMaterial map={texture} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  );
}

function PlayerShip() {
  const player = useGameStore((state) => state.player);
  return (
    <group position={toThree(player.position)} rotation={player.rotation}>
      <mesh castShadow>
        <coneGeometry args={[9, 28, 4]} />
        <meshStandardMaterial color="#d8f4ff" metalness={0.45} roughness={0.38} emissive="#12334a" />
      </mesh>
      <mesh position={[0, 2, 8]} castShadow>
        <boxGeometry args={[30, 2.4, 11]} />
        <meshStandardMaterial color="#318ccf" metalness={0.55} roughness={0.28} />
      </mesh>
      <mesh position={[0, -2, 15]}>
        <sphereGeometry args={[3.2, 12, 8]} />
        <meshStandardMaterial color="#ff8b3d" emissive="#ff5f1f" emissiveIntensity={1.8} />
      </mesh>
    </group>
  );
}

function NpcShip({ ship }: { ship: FlightEntity }) {
  const color = ship.role === "pirate" ? "#ff4e5f" : ship.role === "patrol" ? "#5dc8ff" : "#f6c96d";
  const clock = useGameStore((state) => state.runtime.clock);
  const direction = normalize(ship.velocity);
  const yaw = Math.atan2(direction[0], -direction[2]);
  const flashing = clock - ship.lastDamageAt < 0.18 || ship.deathTimer !== undefined;
  return (
    <group position={toThree(ship.position)} rotation={[0, yaw, 0]} scale={ship.deathTimer !== undefined ? 0.82 : 1}>
      <mesh castShadow>
        <coneGeometry args={[7, 22, 3]} />
        <meshStandardMaterial color={flashing ? "#ffffff" : color} metalness={0.35} roughness={0.44} emissive={color} emissiveIntensity={flashing ? 0.85 : 0.16} transparent opacity={ship.deathTimer !== undefined ? 0.45 : 1} />
      </mesh>
      <mesh position={[0, 0, 7]}>
        <boxGeometry args={[18, 2, 7]} />
        <meshStandardMaterial color="#172130" metalness={0.2} roughness={0.5} transparent opacity={ship.deathTimer !== undefined ? 0.45 : 1} />
      </mesh>
    </group>
  );
}

function StationModel() {
  const currentSystemId = useGameStore((state) => state.currentSystemId);
  const systemStations = stations.filter((station) => station.systemId === currentSystemId);
  return (
    <>
      {systemStations.map((station) => (
        <group key={station.id} position={toThree(station.position)}>
          <mesh>
            <cylinderGeometry args={[44, 62, 34, 8]} />
            <meshStandardMaterial color="#94a9b8" metalness={0.55} roughness={0.35} emissive="#172436" />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[78, 4, 8, 32]} />
            <meshStandardMaterial color="#3bb4ff" emissive="#1f7acc" emissiveIntensity={0.55} />
          </mesh>
          <mesh position={[0, 0, 52]}>
            <boxGeometry args={[82, 8, 18]} />
            <meshStandardMaterial color="#d4c17d" emissive="#5b4617" emissiveIntensity={0.2} />
          </mesh>
        </group>
      ))}
    </>
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
  const color = projectile.kind === "missile" ? "#ffb657" : projectile.owner === "enemy" ? "#ff4c6a" : "#64e4ff";
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

function VisualEffect({ effect }: { effect: VisualEffectEntity }) {
  const alpha = Math.max(0, effect.life / effect.maxLife);
  if (effect.kind === "mining-beam" && effect.endPosition) {
    return (
      <Line
        points={[effect.position, effect.endPosition]}
        color={effect.color}
        lineWidth={3}
        transparent
        opacity={0.38 + alpha * 0.42}
      />
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
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius * 1.12, 1.4, 8, 32]} />
          <meshBasicMaterial color={effect.color} transparent opacity={alpha * 0.72} toneMapped={false} />
        </mesh>
      ) : null}
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
        LOCK · {dist}m
      </Html>
    </group>
  );
}

function SceneContent() {
  const runtime = useGameStore((state) => state.runtime);
  const currentSystemId = useGameStore((state) => state.currentSystemId);
  const ambient = 0.55 + systemById[currentSystemId].risk * 0.2;
  return (
    <>
      <color attach="background" args={["#030712"]} />
      <ambientLight intensity={ambient} />
      <directionalLight position={[180, 220, 120]} intensity={1.4} />
      <pointLight position={[0, 0, 120]} color="#60c8ff" intensity={0.6} distance={500} />
      <SpaceBackdrop />
      <Stars radius={1200} depth={120} count={1700} factor={5} saturation={0.45} fade speed={0.28} />
      <StationModel />
      <PlayerShip />
      <TargetLock />
      {runtime.enemies.map((ship) => (
        <NpcShip key={ship.id} ship={ship} />
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
  const station = stations
    .filter((candidate) => candidate.systemId === currentSystemId)
    .map((candidate) => ({ ...candidate, dist: Math.round(Math.hypot(player.position[0] - candidate.position[0], player.position[1] - candidate.position[1], player.position[2] - candidate.position[2])) }))
    .sort((a, b) => a.dist - b.dist)[0];
  return (
    <div
      ref={canvasRef}
      className="flight-canvas"
      onClick={() => {
        canvasRef.current?.requestPointerLock?.();
      }}
    >
      <FlightControls />
      <Canvas camera={{ position: [0, 36, 210], fov: 68, near: 0.1, far: 3000 }} dpr={[1, 1.7]} shadows>
        <Suspense fallback={null}>
          <SimulationTicker />
          <CameraRig />
          <SceneContent />
        </Suspense>
      </Canvas>
      {station ? <div className="dock-hint">{station.dist < 260 ? `E Dock: ${stationById[station.id].name}` : `${stationById[station.id].name} ${station.dist}m`}</div> : null}
    </div>
  );
}
