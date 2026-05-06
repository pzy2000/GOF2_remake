import { create } from "zustand";
import { commodities, commodityById, missionTemplates, shipById, ships, stationById, stations, systemById, systems, weapons } from "../data/world";
import type {
  AssetManifest,
  AsteroidEntity,
  CargoHold,
  CommodityId,
  FlightEntity,
  FlightInput,
  LootEntity,
  MissionDefinition,
  PlayerState,
  ProjectileEntity,
  RuntimeState,
  SaveGameData,
  Screen,
  StationTab,
  Vec3
} from "../types/game";
import { fallbackAssetManifest } from "../systems/assets";
import { add, clamp, distance, forwardFromRotation, normalize, orbitPoint, rightFromRotation, scale, sub } from "../systems/math";
import { applyDamage, regenerateShield } from "../systems/combat";
import {
  canPirateFire,
  getMiningProgressIncrement,
  getOreColor,
  getOreHardness,
  getOreRarity,
  getPirateLoadout,
  getPirateSpawnCount,
  getPirateSpawnPosition,
  STARTER_GRACE_SECONDS
} from "../systems/difficulty";
import { integrateVelocity } from "../systems/flight";
import { buyCommodity, getCargoUsed, sellCommodity } from "../systems/economy";
import { createInitialReputation, updateReputation } from "../systems/reputation";
import { acceptMission as acceptMissionPure, canCompleteMission, cloneMissionTemplates, completeMission as completeMissionPure } from "../systems/missions";
import { readSave, writeSave } from "../systems/save";

const emptyInput: FlightInput = {
  throttleUp: false,
  throttleDown: false,
  rollLeft: false,
  rollRight: false,
  afterburner: false,
  firePrimary: false,
  fireSecondary: false,
  interact: false,
  cycleTarget: false,
  toggleMap: false,
  toggleCamera: false,
  pause: false,
  mouseDX: 0,
  mouseDY: 0
};

const oreCycle: CommodityId[] = ["iron", "titanium", "cesogen", "gold", "voidglass"];

function createInitialPlayer(): PlayerState {
  const starter = shipById["sparrow-mk1"];
  return {
    shipId: starter.id,
    stats: starter.stats,
    hull: starter.stats.hull,
    shield: starter.stats.shield,
    energy: starter.stats.energy,
    credits: 1500,
    cargo: { "basic-food": 3, "drinking-water": 2 },
    equipment: starter.equipment,
    missiles: 6,
    ownedShips: [starter.id],
    position: [0, 0, 120],
    velocity: [0, 0, 0],
    rotation: [0, 0, 0],
    throttle: 0.25,
    lastDamageAt: -999
  };
}

function createShipEntity(id: string, role: FlightEntity["role"], position: Vec3): FlightEntity {
  const roleStats = {
    pirate: { hull: 70, shield: 42, factionId: "independent-pirates" as const },
    patrol: { hull: 115, shield: 85, factionId: "solar-directorate" as const },
    trader: { hull: 85, shield: 55, factionId: "free-belt-union" as const }
  }[role];
  return {
    id,
    name: role === "pirate" ? "Knife Wing Pirate" : role === "patrol" ? "Directorate Patrol" : "Belt Trader",
    role,
    factionId: roleStats.factionId,
    position,
    velocity: [0, 0, 0],
    hull: roleStats.hull,
    shield: roleStats.shield,
    maxHull: roleStats.hull,
    maxShield: roleStats.shield,
    lastDamageAt: -999,
    fireCooldown: 0.6
  };
}

function createRuntimeForSystem(systemId: string): RuntimeState {
  const system = systemById[systemId];
  const pirateCount = getPirateSpawnCount(systemId, system.risk);
  const asteroids: AsteroidEntity[] = Array.from({ length: systemId === "kuro-belt" ? 16 : 10 }, (_, index) => ({
    id: `${systemId}-asteroid-${index}`,
    resource: oreCycle[index % oreCycle.length],
    position: orbitPoint(index + system.risk * 10, 240 + index * 22),
    radius: 20 + (index % 4) * 7,
    amount: 4 + (index % 5) * 2,
    miningProgress: 0,
    rarity: getOreRarity(oreCycle[index % oreCycle.length]),
    hardness: getOreHardness(oreCycle[index % oreCycle.length])
  }));
  return {
    enemies: [
      ...Array.from({ length: pirateCount }, (_, index) =>
        createShipEntity(`${systemId}-pirate-${index}`, "pirate", getPirateSpawnPosition(systemId, index))
      ),
      createShipEntity(`${systemId}-patrol-0`, "patrol", [-190, 55, -360]),
      createShipEntity(`${systemId}-trader-0`, "trader", [180, -25, -430])
    ],
    asteroids,
    loot: [],
    projectiles: [],
    effects: [],
    destroyedPirates: 0,
    mined: {},
    clock: 0,
    graceUntil: STARTER_GRACE_SECONDS,
    message: "Flight systems online."
  };
}

function projectileId(prefix: string): string {
  return `${prefix}-${Math.round(performance.now() * 1000)}-${Math.random().toString(16).slice(2)}`;
}

function addCargoWithinCapacity(player: PlayerState, commodityId: CommodityId, amount: number): { player: PlayerState; collected: number } {
  const available = Math.max(0, player.stats.cargoCapacity - getCargoUsed(player.cargo));
  const collected = Math.min(available, amount);
  if (collected <= 0) return { player, collected: 0 };
  return {
    collected,
    player: {
      ...player,
      cargo: { ...player.cargo, [commodityId]: (player.cargo[commodityId] ?? 0) + collected }
    }
  };
}

interface GameStore {
  screen: Screen;
  previousScreen: Screen;
  stationTab: StationTab;
  currentSystemId: string;
  currentStationId?: string;
  targetId?: string;
  cameraMode: "chase" | "cinematic";
  assetManifest: AssetManifest;
  player: PlayerState;
  runtime: RuntimeState;
  input: FlightInput;
  activeMissions: MissionDefinition[];
  completedMissionIds: string[];
  reputation: ReturnType<typeof createInitialReputation>;
  knownSystems: string[];
  primaryCooldown: number;
  secondaryCooldown: number;
  hasSave: boolean;
  setAssetManifest: (manifest: AssetManifest) => void;
  newGame: () => void;
  loadGame: () => boolean;
  saveGame: () => void;
  setScreen: (screen: Screen) => void;
  setStationTab: (tab: StationTab) => void;
  setInput: (patch: Partial<FlightInput>) => void;
  consumeMouse: () => { dx: number; dy: number };
  tick: (delta: number) => void;
  cycleTarget: () => void;
  interact: () => void;
  dockAt: (stationId: string) => void;
  undock: () => void;
  jumpToSystem: (systemId: string) => void;
  buy: (commodityId: CommodityId, amount?: number) => void;
  sell: (commodityId: CommodityId, amount?: number) => void;
  acceptMission: (missionId: string) => void;
  completeMission: (missionId: string) => void;
  repairAndRefill: () => void;
  buyShip: (shipId: string) => void;
  craftEquipment: (equipmentId: string) => void;
  toggleCamera: () => void;
}

function savePayload(state: GameStore): Omit<SaveGameData, "version" | "savedAt"> {
  return {
    currentSystemId: state.currentSystemId,
    currentStationId: state.currentStationId,
    player: state.player,
    activeMissions: state.activeMissions,
    completedMissionIds: state.completedMissionIds,
    reputation: state.reputation,
    knownSystems: state.knownSystems
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  screen: "menu",
  previousScreen: "menu",
  stationTab: "Market",
  currentSystemId: "helion-reach",
  targetId: undefined,
  cameraMode: "chase",
  assetManifest: fallbackAssetManifest,
  player: createInitialPlayer(),
  runtime: createRuntimeForSystem("helion-reach"),
  input: emptyInput,
  activeMissions: [],
  completedMissionIds: [],
  reputation: createInitialReputation(),
  knownSystems: systems.map((system) => system.id),
  primaryCooldown: 0,
  secondaryCooldown: 0,
  hasSave: readSave() !== null,
  setAssetManifest: (assetManifest) => set({ assetManifest }),
  newGame: () =>
    set({
      screen: "flight",
      previousScreen: "menu",
      stationTab: "Market",
      currentSystemId: "helion-reach",
      currentStationId: undefined,
      targetId: undefined,
      cameraMode: "chase",
      player: createInitialPlayer(),
      runtime: createRuntimeForSystem("helion-reach"),
      activeMissions: [],
      completedMissionIds: [],
      reputation: createInitialReputation(),
      knownSystems: systems.map((system) => system.id),
      primaryCooldown: 0,
      secondaryCooldown: 0
    }),
  loadGame: () => {
    const save = readSave();
    if (!save) return false;
    set({
      screen: "flight",
      previousScreen: "menu",
      currentSystemId: save.currentSystemId,
      currentStationId: save.currentStationId,
      player: save.player,
      activeMissions: save.activeMissions,
      completedMissionIds: save.completedMissionIds,
      reputation: save.reputation,
      knownSystems: save.knownSystems,
      runtime: createRuntimeForSystem(save.currentSystemId),
      hasSave: true,
      targetId: undefined
    });
    return true;
  },
  saveGame: () => {
    writeSave(savePayload(get()));
    set({ hasSave: true, runtime: { ...get().runtime, message: "Game saved to browser storage." } });
  },
  setScreen: (screen) => set((state) => ({ previousScreen: state.screen, screen })),
  setStationTab: (stationTab) => set({ stationTab }),
  setInput: (patch) => set((state) => ({ input: { ...state.input, ...patch } })),
  consumeMouse: () => {
    const { mouseDX: dx, mouseDY: dy } = get().input;
    set((state) => ({ input: { ...state.input, mouseDX: 0, mouseDY: 0 } }));
    return { dx, dy };
  },
  tick: (delta) => {
    const state = get();
    if (state.screen !== "flight") return;
    const now = state.runtime.clock + delta;
    const input = state.input;
    const { dx, dy } = state.consumeMouse();
    let player = state.player;
    const pitch = clamp(player.rotation[0] + dy * 0.0022 * player.stats.handling, -1.15, 1.15);
    const yaw = player.rotation[1] - dx * 0.0022 * player.stats.handling;
    const roll = clamp(player.rotation[2] + (input.rollLeft ? 1 : 0) * delta * 2.4 - (input.rollRight ? 1 : 0) * delta * 2.4, -0.9, 0.9) * 0.94;
    const throttle = clamp(player.throttle + (input.throttleUp ? delta * 0.55 : 0) - (input.throttleDown ? delta * 0.75 : 0), 0, 1);
    const afterburning = input.afterburner && player.energy > 12 && throttle > 0.08;
    const forward = forwardFromRotation([pitch, yaw, roll]);
    const velocity = integrateVelocity({
      currentVelocity: player.velocity,
      forward,
      targetThrottle: throttle,
      maxSpeed: player.stats.speed,
      afterburning,
      delta,
      acceleration: afterburning ? 4.6 : 2.85,
      damping: throttle <= 0.02 ? 0.55 : 0.82
    });
    player = {
      ...player,
      rotation: [pitch, yaw, roll],
      throttle,
      velocity,
      position: add(player.position, scale(velocity, delta)),
      energy: clamp(player.energy + delta * 16 - (afterburning ? delta * 58 : 0), 0, player.stats.energy)
    };
    player = regenerateShield(player, player.stats.shield, now, delta, 8);

    let runtime: RuntimeState = {
      ...state.runtime,
      clock: now,
      enemies: state.runtime.enemies.map((ship) => ({
        ...ship,
        fireCooldown: ship.fireCooldown - delta,
        deathTimer: ship.deathTimer === undefined ? undefined : ship.deathTimer - delta
      })),
      loot: state.runtime.loot.map((loot) => ({
        ...loot,
        position: add(loot.position, scale(loot.velocity, delta)),
        velocity: scale(loot.velocity, Math.pow(0.08, delta))
      })),
      projectiles: state.runtime.projectiles.map((projectile) => ({ ...projectile, life: projectile.life - delta })),
      effects: state.runtime.effects
        .map((effect) => ({
          ...effect,
          life: effect.life - delta,
          position: add(effect.position, scale(effect.velocity ?? [0, 0, 0], delta)),
          endPosition: effect.endPosition ? add(effect.endPosition, scale(effect.velocity ?? [0, 0, 0], delta)) : undefined
        }))
        .filter((effect) => effect.life > 0),
      message: state.runtime.message
    };
    let primaryCooldown = Math.max(0, state.primaryCooldown - delta);
    let secondaryCooldown = Math.max(0, state.secondaryCooldown - delta);
    const target = runtime.enemies.find((ship) => ship.id === state.targetId && ship.hull > 0);

    const nearestAsteroid = runtime.asteroids
      .filter((asteroid) => asteroid.amount > 0)
      .map((asteroid) => ({ asteroid, dist: distance(player.position, asteroid.position) }))
      .sort((a, b) => a.dist - b.dist)[0];

    const miningActive = input.firePrimary && nearestAsteroid && nearestAsteroid.dist < 360 && player.energy > 5;
    if (miningActive) {
      runtime.effects.push({
        id: projectileId("mining-beam"),
        kind: "mining-beam",
        position: add(player.position, scale(forward, 12)),
        endPosition: nearestAsteroid.asteroid.position,
        color: getOreColor(nearestAsteroid.asteroid.resource),
        label: commodityById[nearestAsteroid.asteroid.resource].name,
        size: 1,
        life: 0.12,
        maxLife: 0.12
      });
      runtime = {
        ...runtime,
        asteroids: runtime.asteroids.map((asteroid) => {
          if (asteroid.id !== nearestAsteroid.asteroid.id) return asteroid;
          const progress = asteroid.miningProgress + getMiningProgressIncrement(asteroid.resource, delta);
          if (progress < 1) return { ...asteroid, miningProgress: progress };
          const chunk = Math.min(2, asteroid.amount);
          const popDirection = normalize(sub(add(asteroid.position, [asteroid.radius, 10, asteroid.radius * 0.25]), player.position));
          runtime.loot.push({
            id: projectileId("ore"),
            commodityId: asteroid.resource,
            amount: chunk,
            position: add(asteroid.position, [asteroid.radius * 0.6, 0, 0]),
            velocity: scale(popDirection, 46 + 12 / asteroid.hardness),
            rarity: asteroid.rarity
          });
          runtime.effects.push({
            id: projectileId("ore-pop"),
            kind: "hit",
            position: add(asteroid.position, [asteroid.radius * 0.6, 0, 0]),
            color: getOreColor(asteroid.resource),
            label: `+${chunk} ${commodityById[asteroid.resource].name}`,
            size: 9 + chunk,
            life: 0.55,
            maxLife: 0.55,
            velocity: [0, 18, 0]
          });
          return { ...asteroid, amount: asteroid.amount - chunk, miningProgress: 0 };
        }),
        message: `Mining ${commodityById[nearestAsteroid.asteroid.resource].name} vein · ${Math.round(nearestAsteroid.asteroid.miningProgress * 100)}%`
      };
      player = { ...player, energy: clamp(player.energy - delta * 12, 0, player.stats.energy) };
      primaryCooldown = Math.max(primaryCooldown, 0.08);
    } else if (input.firePrimary && primaryCooldown <= 0 && player.energy >= (weapons["pulse-laser"]?.energyCost ?? 0)) {
      runtime.projectiles.push({
        id: projectileId("laser"),
        owner: "player",
        kind: "laser",
        position: add(player.position, scale(forward, 16)),
        direction: target ? normalize(sub(target.position, player.position)) : forward,
        speed: weapons["pulse-laser"]?.speed ?? 720,
        damage: weapons["pulse-laser"]?.damage ?? 16,
        life: 1.4,
        targetId: target?.id
      });
      player = { ...player, energy: player.energy - (weapons["pulse-laser"]?.energyCost ?? 5) };
      primaryCooldown = weapons["pulse-laser"]?.cooldown ?? 0.18;
    }

    if (input.fireSecondary && secondaryCooldown <= 0 && player.missiles > 0) {
      runtime.projectiles.push({
        id: projectileId("missile"),
        owner: "player",
        kind: "missile",
        position: add(player.position, scale(forward, 18)),
        direction: target ? normalize(sub(target.position, player.position)) : forward,
        speed: weapons["homing-missile"]?.speed ?? 360,
        damage: weapons["homing-missile"]?.damage ?? 72,
        life: 3.6,
        targetId: target?.id
      });
      player = { ...player, missiles: player.missiles - 1 };
      secondaryCooldown = weapons["homing-missile"]?.cooldown ?? 1.2;
    }

    const pirates = runtime.enemies.filter((ship) => ship.role === "pirate" && ship.hull > 0 && ship.deathTimer === undefined);
    const loadout = getPirateLoadout(state.currentSystemId, systemById[state.currentSystemId].risk);
    const graceActive = now < runtime.graceUntil;
    runtime.enemies = runtime.enemies.map((ship) => {
      if (ship.hull <= 0 || ship.deathTimer !== undefined) return ship;
      let targetPosition = player.position;
      if (ship.role === "patrol") targetPosition = pirates[0]?.position ?? player.position;
      if (ship.role === "trader" && pirates.length > 0) targetPosition = add(ship.position, normalize(sub(ship.position, pirates[0].position)));
      const toTarget = normalize(sub(targetPosition, ship.position));
      const side = rightFromRotation([0, Math.atan2(toTarget[0], -toTarget[2]), 0]);
      const retreating = ship.role === "pirate" && ship.hull < ship.maxHull * 0.28;
      const desired = retreating || ship.role === "trader" ? scale(toTarget, -1) : normalize(add(toTarget, scale(side, ship.role === "pirate" ? 0.45 : 0.12)));
      const shipSpeed = ship.role === "pirate" ? loadout.speed : ship.role === "patrol" ? 118 : 105;
      const moved = { ...ship, velocity: scale(desired, shipSpeed), position: add(ship.position, scale(desired, shipSpeed * delta)) };
      const hostileToPlayer = ship.role === "pirate";
      const distToPlayer = distance(moved.position, player.position);
      const canFire =
        hostileToPlayer &&
        canPirateFire({
          systemId: state.currentSystemId,
          risk: systemById[state.currentSystemId].risk,
          now,
          graceUntil: runtime.graceUntil,
          distanceToPlayer: distToPlayer,
          fireCooldown: moved.fireCooldown
        });
      if (canFire) {
        runtime.projectiles.push({
          id: projectileId("enemy-laser"),
          owner: "enemy",
          kind: "laser",
          position: moved.position,
          direction: normalize(sub(player.position, moved.position)),
          speed: 470,
          damage: loadout.damage,
          life: 1.8
        });
        return { ...moved, fireCooldown: loadout.fireCooldownMin + Math.random() * (loadout.fireCooldownMax - loadout.fireCooldownMin) };
      }
      const patrolFire = ship.role === "patrol" && pirates[0] && distance(moved.position, pirates[0].position) < 620 && moved.fireCooldown <= 0;
      if (patrolFire) {
        runtime.projectiles.push({
          id: projectileId("patrol-laser"),
          owner: "patrol",
          kind: "laser",
          position: moved.position,
          direction: normalize(sub(pirates[0].position, moved.position)),
          speed: 520,
          damage: 14,
          life: 1.6,
          targetId: pirates[0].id
        });
        return { ...moved, fireCooldown: 0.65 };
      }
      return regenerateShield(moved, moved.maxShield, now, delta, 5);
    });

    const remainingProjectiles: ProjectileEntity[] = [];
    const lootDrops: LootEntity[] = [];
    let destroyedPirates = runtime.destroyedPirates;
    for (const projectile of runtime.projectiles) {
      if (projectile.life <= 0) continue;
      let direction = projectile.direction;
      if (projectile.kind === "missile" && projectile.targetId) {
        const missileTarget = runtime.enemies.find((ship) => ship.id === projectile.targetId && ship.hull > 0);
        if (missileTarget) direction = normalize(sub(missileTarget.position, projectile.position));
      }
      const movedProjectile = { ...projectile, direction, position: add(projectile.position, scale(direction, projectile.speed * delta)) };
      let consumed = false;
      if (projectile.owner === "enemy" && distance(movedProjectile.position, player.position) < 22) {
        const shielded = player.shield > 0;
        player = applyDamage(player, projectile.damage, now);
        runtime.effects.push({
          id: projectileId(shielded ? "shield-hit" : "player-hit"),
          kind: shielded ? "shield-hit" : "hit",
          position: player.position,
          color: shielded ? "#69e4ff" : "#ff6270",
          label: `-${Math.round(projectile.damage)}`,
          size: shielded ? 28 : 16,
          life: 0.42,
          maxLife: 0.42,
          velocity: [0, 12, 0]
        });
        consumed = true;
      } else if (projectile.owner === "player" || projectile.owner === "patrol") {
        runtime.enemies = runtime.enemies.map((ship) => {
          const validTarget = projectile.owner === "patrol" ? ship.role === "pirate" : ship.role === "pirate";
          if (!validTarget || ship.hull <= 0 || ship.deathTimer !== undefined || consumed || distance(movedProjectile.position, ship.position) > 25) return ship;
          const shielded = ship.shield > 0;
          const damaged = applyDamage(ship, projectile.damage, now);
          consumed = true;
          runtime.effects.push({
            id: projectileId(shielded ? "shield-hit" : "hit"),
            kind: shielded ? "shield-hit" : "hit",
            position: movedProjectile.position,
            color: shielded ? "#69e4ff" : "#ff8a6a",
            label: `-${Math.round(projectile.damage)}`,
            size: projectile.kind === "missile" ? 22 : 12,
            life: 0.34,
            maxLife: 0.34,
            velocity: [0, 10, 0]
          });
          if (damaged.hull <= 0 && ship.hull > 0) {
            if (ship.role === "pirate") destroyedPirates += 1;
            lootDrops.push({
              id: projectileId("loot"),
              commodityId: ship.role === "pirate" ? "illegal-contraband" : "mechanical-parts",
              amount: ship.role === "pirate" ? 1 : 2,
              position: ship.position,
              velocity: [18 - Math.random() * 36, 24 + Math.random() * 18, 18 - Math.random() * 36],
              rarity: ship.role === "pirate" ? "rare" : "uncommon"
            });
            runtime.effects.push({
              id: projectileId("explosion"),
              kind: "explosion",
              position: ship.position,
              color: ship.role === "pirate" ? "#ff784f" : "#64e4ff",
              label: "Destroyed",
              size: 46,
              life: 0.85,
              maxLife: 0.85,
              velocity: [0, 6, 0]
            });
            return { ...damaged, deathTimer: 0.42 };
          }
          return damaged;
        });
      }
      if (!consumed) remainingProjectiles.push(movedProjectile);
    }
    runtime = {
      ...runtime,
      projectiles: remainingProjectiles,
      enemies: runtime.enemies.filter((ship) => ship.hull > 0 || (ship.deathTimer ?? 0) > 0),
      loot: [...runtime.loot, ...lootDrops],
      destroyedPirates
    };

    if (input.interact) {
      get().interact();
      set((latest) => ({ input: { ...latest.input, interact: false } }));
    }
    if (input.cycleTarget) {
      get().cycleTarget();
      set((latest) => ({ input: { ...latest.input, cycleTarget: false } }));
    }
    if (input.toggleMap) {
      set({ screen: "galaxyMap", previousScreen: "flight" });
      set((latest) => ({ input: { ...latest.input, toggleMap: false } }));
    }
    if (input.toggleCamera) {
      get().toggleCamera();
      set((latest) => ({ input: { ...latest.input, toggleCamera: false } }));
    }
    if (input.pause) {
      set({ screen: "pause", previousScreen: "flight", input: { ...get().input, pause: false } });
    }

    set({
      player,
      runtime: {
        ...runtime,
        message:
          player.hull <= 0
            ? "Hull integrity failed."
            : lootDrops.length
              ? "Target destroyed. Cargo canister released."
              : graceActive
                ? `Pirates are sizing you up · weapons free in ${Math.ceil(runtime.graceUntil - now)}s`
              : runtime.message
      },
      primaryCooldown,
      secondaryCooldown,
      screen: player.hull <= 0 ? "gameOver" : get().screen,
      targetId: runtime.enemies.some((ship) => ship.id === state.targetId && ship.hull > 0 && ship.deathTimer === undefined)
        ? state.targetId
        : runtime.enemies.find((ship) => ship.role === "pirate" && ship.hull > 0 && ship.deathTimer === undefined)?.id
    });
  },
  cycleTarget: () => {
    const pirates = get().runtime.enemies.filter((ship) => ship.role === "pirate" && ship.hull > 0 && ship.deathTimer === undefined);
    if (pirates.length === 0) return set({ targetId: undefined });
    const currentIndex = pirates.findIndex((ship) => ship.id === get().targetId);
    set({ targetId: pirates[(currentIndex + 1) % pirates.length].id });
  },
  interact: () => {
    const state = get();
    const station = stations
      .filter((candidate) => candidate.systemId === state.currentSystemId)
      .map((candidate) => ({ station: candidate, dist: distance(state.player.position, candidate.position) }))
      .sort((a, b) => a.dist - b.dist)[0];
    const nearLoot = state.runtime.loot.filter((loot) => distance(loot.position, state.player.position) < 90);
    if (nearLoot.length > 0) {
      let player = state.player;
      const collectedIds = new Set<string>();
      let collected = 0;
      for (const loot of nearLoot) {
        const result = addCargoWithinCapacity(player, loot.commodityId, loot.amount);
        player = result.player;
        collected += result.collected;
        if (result.collected > 0) collectedIds.add(loot.id);
      }
      set({
        player,
        runtime: {
          ...state.runtime,
          loot: state.runtime.loot.filter((loot) => !collectedIds.has(loot.id)),
          message: collected > 0 ? `Collected ${collected} cargo unit(s).` : "Cargo hold full."
        }
      });
      return;
    }
    if (station && station.dist < 260) {
      get().dockAt(station.station.id);
      return;
    }
    set({ runtime: { ...state.runtime, message: "No interactable object in range." } });
  },
  dockAt: (stationId) => set({ screen: "station", currentStationId: stationId, stationTab: "Market", previousScreen: "flight" }),
  undock: () =>
    set((state) => ({
      screen: "flight",
      currentStationId: undefined,
      previousScreen: "station",
      player: { ...state.player, position: [0, 0, 120], throttle: 0.2 }
    })),
  jumpToSystem: (systemId) => {
    if (!systemById[systemId]) return;
    set((state) => ({
      screen: state.screen === "galaxyMap" ? "flight" : state.screen,
      currentSystemId: systemId,
      currentStationId: undefined,
      runtime: createRuntimeForSystem(systemId),
      targetId: undefined,
      knownSystems: Array.from(new Set([...state.knownSystems, systemId])),
      player: { ...state.player, position: [0, 0, 120], velocity: [0, 0, 0], rotation: [0, 0, 0], throttle: 0.25 }
    }));
  },
  buy: (commodityId, amount = 1) => {
    const state = get();
    if (!state.currentStationId) return;
    const station = stationById[state.currentStationId];
    const system = systemById[state.currentSystemId];
    const result = buyCommodity(state.player, station, system, commodityId, amount, state.reputation.factions[station.factionId]);
    set({ player: result.player, runtime: { ...state.runtime, message: result.message } });
  },
  sell: (commodityId, amount = 1) => {
    const state = get();
    if (!state.currentStationId) return;
    const station = stationById[state.currentStationId];
    const system = systemById[state.currentSystemId];
    const result = sellCommodity(state.player, station, system, commodityId, amount, state.reputation.factions[station.factionId]);
    const completedCargo: CargoHold = { ...state.runtime.mined };
    set({ player: result.player, runtime: { ...state.runtime, mined: completedCargo, message: result.message } });
  },
  acceptMission: (missionId) => {
    const state = get();
    const mission = missionTemplates.find((candidate) => candidate.id === missionId);
    if (!mission) return;
    const result = acceptMissionPure(state.player, state.activeMissions, mission);
    set({ player: result.player, activeMissions: result.activeMissions, runtime: { ...state.runtime, message: result.message } });
  },
  completeMission: (missionId) => {
    const state = get();
    if (!state.currentStationId) return;
    const mission = state.activeMissions.find((candidate) => candidate.id === missionId);
    if (!mission || !canCompleteMission(mission, state.player, state.currentSystemId, state.currentStationId, state.runtime.destroyedPirates)) {
      set({ runtime: { ...state.runtime, message: "Mission requirements are not complete." } });
      return;
    }
    const result = completeMissionPure(mission, state.player, state.reputation);
    set({
      player: result.player,
      reputation: result.reputation,
      activeMissions: state.activeMissions.filter((active) => active.id !== missionId),
      completedMissionIds: [...state.completedMissionIds, missionId],
      runtime: { ...state.runtime, message: `${mission.title} complete. +${mission.reward} credits.` }
    });
  },
  repairAndRefill: () => {
    const state = get();
    const missingHull = state.player.stats.hull - state.player.hull;
    const missileNeed = 6 - state.player.missiles;
    const cost = Math.round(missingHull * 4 + missileNeed * 45);
    if (state.player.credits < cost) {
      set({ runtime: { ...state.runtime, message: "Not enough credits for repair and missile refill." } });
      return;
    }
    set({
      player: { ...state.player, hull: state.player.stats.hull, shield: state.player.stats.shield, missiles: 6, credits: state.player.credits - cost },
      runtime: { ...state.runtime, message: `Repaired and refilled for ${cost} credits.` }
    });
  },
  buyShip: (shipId) => {
    const state = get();
    const ship = shipById[shipId];
    if (!ship || state.player.ownedShips.includes(shipId)) return;
    if (state.player.credits < ship.price) {
      set({ runtime: { ...state.runtime, message: "Not enough credits for that ship." } });
      return;
    }
    set({
      player: {
        ...state.player,
        credits: state.player.credits - ship.price,
        ownedShips: [...state.player.ownedShips, shipId],
        shipId: ship.id,
        stats: ship.stats,
        hull: ship.stats.hull,
        shield: ship.stats.shield,
        energy: ship.stats.energy,
        equipment: ship.equipment
      },
      runtime: { ...state.runtime, message: `${ship.name} purchased and equipped.` }
    });
  },
  craftEquipment: (equipmentId) => {
    const state = get();
    if (state.player.equipment.includes(equipmentId as never)) {
      set({ runtime: { ...state.runtime, message: "Equipment already installed." } });
      return;
    }
    const cost = equipmentId === "plasma-cannon" ? 1300 : equipmentId === "shield-booster" ? 900 : 700;
    if (state.player.credits < cost) {
      set({ runtime: { ...state.runtime, message: "Not enough credits to craft that blueprint." } });
      return;
    }
    set({
      player: { ...state.player, credits: state.player.credits - cost, equipment: [...state.player.equipment, equipmentId as never] },
      runtime: { ...state.runtime, message: `Crafted ${equipmentId.replace("-", " ")}.` }
    });
  },
  toggleCamera: () => set((state) => ({ cameraMode: state.cameraMode === "chase" ? "cinematic" : "chase" }))
}));

export { cloneMissionTemplates, commodities, shipById, ships, stationById, stations, systemById, systems };
