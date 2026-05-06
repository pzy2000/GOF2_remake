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

function InfiniteSkybox() {
  const skybox = useGameStore((state) => state.assetManifest.skyboxPanorama || state.assetManifest.nebulaBg);
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

function PlayerShip() {
  const player = useGameStore((state) => state.player);
  const afterburning = useGameStore((state) => state.input.afterburner && state.player.energy > 12);
  const speed = Math.hypot(...player.velocity);
  const flameScale = Math.max(0.65, Math.min(2.6, speed / 120 + (afterburning ? 1.05 : 0)));
  return (
    <group position={toThree(player.position)} rotation={player.rotation}>
      <mesh position={[0, 0, -6]} castShadow>
        <coneGeometry args={[8.5, 34, 5]} />
        <meshStandardMaterial color="#cfefff" metalness={0.5} roughness={0.32} emissive="#12334a" />
      </mesh>
      <mesh position={[0, 1.8, 2]} scale={[1.05, 0.65, 1]} castShadow>
        <boxGeometry args={[16, 9, 26]} />
        <meshStandardMaterial color="#15354d" metalness={0.38} roughness={0.36} emissive="#092033" />
      </mesh>
      <mesh position={[0, 5.2, -8]} castShadow>
        <sphereGeometry args={[4.8, 12, 8]} />
        <meshStandardMaterial color="#9be8ff" metalness={0.2} roughness={0.18} emissive="#1e95c8" emissiveIntensity={0.42} />
      </mesh>
      <mesh position={[0, 0.4, 6]} castShadow>
        <boxGeometry args={[40, 2.2, 12]} />
        <meshStandardMaterial color="#318ccf" metalness={0.55} roughness={0.28} />
      </mesh>
      <mesh position={[-15, 0.2, -2]} rotation={[0, 0, 0.34]} castShadow>
        <boxGeometry args={[6, 1.8, 24]} />
        <meshStandardMaterial color="#71c9ff" metalness={0.45} roughness={0.32} emissive="#0e3658" />
      </mesh>
      <mesh position={[15, 0.2, -2]} rotation={[0, 0, -0.34]} castShadow>
        <boxGeometry args={[6, 1.8, 24]} />
        <meshStandardMaterial color="#71c9ff" metalness={0.45} roughness={0.32} emissive="#0e3658" />
      </mesh>
      <mesh position={[-10, 1, 13]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[2.6, 2.6, 8]} />
        <meshStandardMaterial color="#202c38" metalness={0.65} roughness={0.22} emissive="#08131e" />
      </mesh>
      <mesh position={[10, 1, 13]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[2.6, 2.6, 8]} />
        <meshStandardMaterial color="#202c38" metalness={0.65} roughness={0.22} emissive="#08131e" />
      </mesh>
      {[-5.5, 5.5].map((x) => (
        <group key={x} position={[x, -1.6, 16]}>
          <mesh>
            <cylinderGeometry args={[2.5, 3.4, 3, 12]} />
            <meshStandardMaterial color="#273647" metalness={0.8} roughness={0.24} emissive="#101c2a" />
          </mesh>
          <mesh position={[0, 0, 5.5]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, flameScale]}>
            <coneGeometry args={[3.4, 18, 16]} />
            <meshBasicMaterial color={afterburning ? "#66e4ff" : "#ff8b3d"} transparent opacity={0.38 + Math.min(0.35, speed / 500)} toneMapped={false} />
          </mesh>
          <pointLight color={afterburning ? "#66e4ff" : "#ff8b3d"} intensity={afterburning ? 1.1 : 0.45} distance={90} />
        </group>
      ))}
      <mesh position={[0, -0.4, -18]} rotation={[0.24, 0, 0]} castShadow>
        <boxGeometry args={[5, 13, 2.4]} />
        <meshStandardMaterial color="#2b89bd" metalness={0.55} roughness={0.28} />
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
  const speed = Math.hypot(...ship.velocity);
  const flameScale = Math.max(0.45, Math.min(1.45, speed / 115));
  const body =
    ship.role === "pirate"
      ? { cone: [7, 25, 3] as [number, number, number], wing: [26, 1.8, 8] as [number, number, number], offset: 6, tail: "#3a111c" }
      : ship.role === "patrol"
        ? { cone: [7.5, 23, 4] as [number, number, number], wing: [22, 2.4, 12] as [number, number, number], offset: 5, tail: "#12344b" }
        : { cone: [9, 20, 6] as [number, number, number], wing: [28, 3.8, 15] as [number, number, number], offset: 3, tail: "#4a3820" };
  return (
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
    </group>
  );
}

function StationModel() {
  const currentSystemId = useGameStore((state) => state.currentSystemId);
  const systemStations = stations.filter((station) => station.systemId === currentSystemId);
  return (
    <>
      {systemStations.map((station) => (
        <StationGeometry key={station.id} station={station} />
      ))}
    </>
  );
}

function StationGeometry({ station }: { station: (typeof stations)[number] }) {
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
      <InfiniteSkybox />
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
