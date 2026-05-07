import { create } from "zustand";
import { commodities, commodityById, dialogueSceneById, equipmentById, equipmentList, missionTemplates, planetById, planets, shipById, ships, stationById, stations, systemById, systems } from "../data/world";
import type {
  CargoHold,
  EquipmentId,
  FlightEntity,
  FlightInput,
  LootEntity,
  ProjectileEntity,
  RuntimeState,
  Vec3
} from "../types/game";
import type { EconomyEvent, EconomyServiceStatus } from "../types/economy";
import type { GameStore, SavePayload, SavePayloadOverrides } from "./gameStoreTypes";
import { fallbackAssetManifest } from "../systems/assets";
import { add, clamp, distance, forwardFromRotation, normalize, scale, sub } from "../systems/math";
import { applyDamage, regenerateShield } from "../systems/combat";
import {
  getMiningProgressIncrement,
  getOreColor
} from "../systems/difficulty";
import { integrateVelocity } from "../systems/flight";
import { getDefaultTargetStation } from "../systems/autopilot";
import { advanceMarketState, buyCommodity, buyEquipment, createInitialMarketState, getCargoUsed, getOccupiedCargo, sellCommodity, sellEquipment } from "../systems/economy";
import { createInitialReputation, updateReputation } from "../systems/reputation";
import {
  acceptMission as acceptMissionPure,
  canCompleteMission,
  cloneMissionTemplates,
  completeMission as completeMissionPure,
  failMission as failMissionPure,
  areMissionPrerequisitesMet,
  markEscortArrived,
  markSalvageRecovered,
  markStoryTargetDestroyed
} from "../systems/missions";
import { deleteSave as deleteSaveSlot, getLatestSaveSlotId, readSave, readSaveSlots, writeSave } from "../systems/save";
import { audioSystem } from "../systems/audio";
import {
  CONTRABAND_FINE_PER_UNIT,
  getContrabandLaw,
  isHostileToPlayer,
  resolveCombatAiStep,
  sortPirateTargets,
  sortTargetableShips
} from "../systems/combatAi";
import {
  getActivePrimaryWeapon,
  getActiveSecondaryWeapon,
  getEquipmentEffects,
  getWeaponCooldown,
  hasMiningBeam,
  installEquipmentFromInventory as installEquipmentFromInventoryPure,
  createPlayerShipLoadout,
  uninstallEquipmentToInventory as uninstallEquipmentToInventoryPure,
  addEquipmentToInventory,
  hasCraftMaterials,
  removeCargo as removeCraftCargo,
  MINING_COOLDOWN_SECONDS,
  MINING_ENERGY_DRAIN_PER_SECOND,
  MINING_MIN_ENERGY,
  MINING_YIELD_PER_CYCLE,
  normalizePlayerEquipmentStats
} from "../systems/equipment";
import {
  createInitialExplorationState,
  explorationSignalById,
  getEffectiveSignalScanBand,
  getEffectiveSignalScanRange,
  isExplorationSignalUnlocked,
  isFrequencyInSignalBand,
  normalizeExplorationState
} from "../systems/exploration";
import {
  createInitialDialogueState,
  getExplorationDialogueScene,
  getStoryMissionDialogueScene,
  normalizeDialogueState
} from "../systems/dialogue";
import {
  getInitialKnownSystems,
  getInitialKnownPlanetIds,
  getNearestNavigationTarget,
  discoverNearbyPlanets
} from "../systems/navigation";
import {
  connectEconomyEvents,
  ECONOMY_SERVICE_URL,
  fetchEconomySnapshot,
  postNpcDestroyed,
  postPlayerTrade
} from "../systems/economyClient";
import {
  addCargoWithinCapacity,
  addMissionRuntimeEntity,
  addOwnedShipId,
  addUniqueIds,
  createInitialPlayer,
  createRuntimeForSystem,
  currentShipStorageRecord,
  dialogueOpenPatch,
  hydrateActiveMission,
  lootDropsForDestroyedShip,
  projectileId,
  upsertShipRecord
} from "./domains/runtimeFactory";
import {
  advanceConvoyEntity,
  createPatrolSupportRequest,
  hasLocalCombatThreat
} from "./domains/combatRuntime";
import { applyEconomySnapshotPatch, offlineEconomyPatch, shouldReportEconomyNpcDestroyed } from "./domains/economyRuntime";
import { applyExpiredMissions } from "./domains/missionRuntime";
import { applyExplorationReward } from "./domains/explorationRuntime";
import {
  applyMarketGapMissionDelivery,
  getMarketGapMissionById,
  isMarketGapMissionId
} from "../systems/marketMissions";
import {
  advanceAutopilotPatch,
  activateStargateJumpToStationPatch,
  dockAtPatch,
  emptyFlightInput,
  jumpToSystemPatch,
  startJumpToStationPatch,
  undockPatch
} from "./domains/navigationRuntime";

const emptyInput: FlightInput = emptyFlightInput();

let closeEconomyStream: (() => void) | undefined;
let economyRefreshInFlight = false;

function savePayload(state: GameStore, overrides: SavePayloadOverrides = {}): SavePayload {
  return {
    currentSystemId: overrides.currentSystemId ?? state.currentSystemId,
    currentStationId: Object.prototype.hasOwnProperty.call(overrides, "currentStationId") ? overrides.currentStationId : state.currentStationId,
    gameClock: overrides.gameClock ?? state.gameClock,
    player: overrides.player ?? state.player,
    activeMissions: overrides.activeMissions ?? state.activeMissions,
    completedMissionIds: overrides.completedMissionIds ?? state.completedMissionIds,
    failedMissionIds: overrides.failedMissionIds ?? state.failedMissionIds,
    marketState: overrides.marketState ?? state.marketState,
    economySnapshotId: state.economyService.snapshotId,
    reputation: overrides.reputation ?? state.reputation,
    knownSystems: overrides.knownSystems ?? state.knownSystems,
    knownPlanetIds: overrides.knownPlanetIds ?? state.knownPlanetIds,
    explorationState: overrides.explorationState ?? state.explorationState,
    dialogueState: overrides.dialogueState ?? state.dialogueState
  };
}

function writeStationAutoSave(state: GameStore, overrides: SavePayloadOverrides): Pick<GameStore, "hasSave" | "saveSlots" | "activeSaveSlotId"> {
  writeSave(savePayload(state, overrides), undefined, "auto");
  return {
    hasSave: true,
    saveSlots: readSaveSlots(),
    activeSaveSlotId: "auto"
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  screen: "menu",
  previousScreen: "menu",
  stationTab: "Market",
  galaxyMapMode: "browse",
  currentSystemId: "helion-reach",
  targetId: undefined,
  cameraMode: "chase",
  assetManifest: fallbackAssetManifest,
  player: createInitialPlayer(),
  runtime: createRuntimeForSystem("helion-reach"),
  economyService: { status: "offline", url: ECONOMY_SERVICE_URL },
  economyEvents: [],
  autopilot: undefined,
  input: emptyInput,
  gameClock: 0,
  marketState: createInitialMarketState(),
  activeMissions: [],
  completedMissionIds: [],
  failedMissionIds: [],
  reputation: createInitialReputation(),
  knownSystems: getInitialKnownSystems("helion-reach"),
  knownPlanetIds: getInitialKnownPlanetIds(getInitialKnownSystems("helion-reach")),
  explorationState: createInitialExplorationState(),
  dialogueState: createInitialDialogueState(),
  activeDialogue: undefined,
  primaryCooldown: 0,
  secondaryCooldown: 0,
  hasSave: readSave() !== null,
  saveSlots: readSaveSlots(),
  activeSaveSlotId: undefined,
  setAssetManifest: (assetManifest) => set({ assetManifest }),
  newGame: () =>
    set({
      screen: "flight",
      previousScreen: "menu",
      stationTab: "Market",
      galaxyMapMode: "browse",
      currentSystemId: "helion-reach",
      currentStationId: undefined,
      targetId: undefined,
      cameraMode: "chase",
      player: createInitialPlayer(),
      runtime: createRuntimeForSystem("helion-reach"),
      economyService: { status: "offline", url: ECONOMY_SERVICE_URL },
      economyEvents: [],
      autopilot: undefined,
      gameClock: 0,
      marketState: createInitialMarketState(),
      activeMissions: [],
      completedMissionIds: [],
      failedMissionIds: [],
      reputation: createInitialReputation(),
      knownSystems: getInitialKnownSystems("helion-reach"),
      knownPlanetIds: getInitialKnownPlanetIds(getInitialKnownSystems("helion-reach")),
      explorationState: createInitialExplorationState(),
      dialogueState: createInitialDialogueState(),
      activeDialogue: undefined,
      primaryCooldown: 0,
      secondaryCooldown: 0,
      activeSaveSlotId: undefined
    }),
  loadGame: (slotId) => {
    const resolvedSlotId = slotId ?? getLatestSaveSlotId();
    const save = readSave(undefined, resolvedSlotId);
    if (!save) return false;
    const activeMissions = save.activeMissions.map(hydrateActiveMission);
    set({
      screen: "flight",
      previousScreen: "menu",
      galaxyMapMode: "browse",
      currentSystemId: save.currentSystemId,
      currentStationId: save.currentStationId,
      gameClock: save.gameClock,
      player: normalizePlayerEquipmentStats(save.player),
      activeMissions,
      completedMissionIds: save.completedMissionIds,
      failedMissionIds: save.failedMissionIds,
      marketState: save.marketState,
      reputation: save.reputation,
      knownSystems: save.knownSystems,
      knownPlanetIds: save.knownPlanetIds,
      explorationState: normalizeExplorationState(save.explorationState),
      dialogueState: normalizeDialogueState(save.dialogueState),
      activeDialogue: undefined,
      runtime: createRuntimeForSystem(save.currentSystemId, activeMissions),
      economyService: { status: "offline", url: ECONOMY_SERVICE_URL, snapshotId: save.economySnapshotId },
      economyEvents: [],
      autopilot: undefined,
      hasSave: true,
      saveSlots: readSaveSlots(),
      activeSaveSlotId: resolvedSlotId,
      targetId: undefined
    });
    audioSystem.play("ui-click");
    return true;
  },
  saveGame: (slotId) => {
    const state = get();
    const resolvedSlot = slotId ?? state.activeSaveSlotId ?? "auto";
    writeSave(savePayload(state), undefined, resolvedSlot);
    audioSystem.play("ui-click");
    set({ hasSave: true, activeSaveSlotId: resolvedSlot, saveSlots: readSaveSlots(), runtime: { ...get().runtime, message: `Game saved to ${resolvedSlot}.` } });
  },
  deleteSave: (slotId) => {
    deleteSaveSlot(slotId);
    set((state) => ({
      saveSlots: readSaveSlots(),
      hasSave: readSave() !== null,
      activeSaveSlotId: state.activeSaveSlotId === slotId ? undefined : state.activeSaveSlotId,
      runtime: { ...state.runtime, message: `Deleted ${slotId}.` }
    }));
  },
  refreshSaveSlots: () => set({ saveSlots: readSaveSlots(), hasSave: readSave() !== null }),
  refreshEconomySnapshot: async () => {
    if (economyRefreshInFlight) return;
    economyRefreshInFlight = true;
    const requestedSystemId = get().currentSystemId;
    try {
      const snapshot = await fetchEconomySnapshot(requestedSystemId);
      set((state) => (state.currentSystemId === requestedSystemId ? applyEconomySnapshotPatch(state, snapshot, "snapshot") : {}));
    } catch (error) {
      set((state) => offlineEconomyPatch(state, error instanceof Error ? error.message : "Economy service offline."));
    } finally {
      economyRefreshInFlight = false;
    }
  },
  startEconomyStream: () => {
    if (closeEconomyStream) return;
    const close = connectEconomyEvents(
      (event: EconomyEvent) => {
        set((state) => ({
          economyService: {
            ...state.economyService,
            status: "connected",
            lastEvent: event.message,
            snapshotId: event.snapshotId ?? state.economyService.snapshotId,
            lastError: undefined
          }
        }));
        void get().refreshEconomySnapshot();
      },
      (message) => {
        closeEconomyStream?.();
        closeEconomyStream = undefined;
        set((state) => offlineEconomyPatch(state, message));
      }
    );
    if (close) closeEconomyStream = close;
  },
  stopEconomyStream: () => {
    closeEconomyStream?.();
    closeEconomyStream = undefined;
  },
  setScreen: (screen) => set((state) => ({ previousScreen: state.screen, screen })),
  setStationTab: (stationTab) => set({ stationTab, galaxyMapMode: stationTab === "Galaxy Map" ? "station-route" : get().galaxyMapMode }),
  openGalaxyMap: (galaxyMapMode) => set((state) => ({ previousScreen: state.screen, screen: "galaxyMap", galaxyMapMode })),
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
    const gameClock = state.gameClock + delta;
    const marketState = state.economyService.status === "connected" ? state.marketState : advanceMarketState(state.marketState, delta);
    const input = state.input;
    const { dx, dy } = state.consumeMouse();

    if (state.autopilot) {
      const controlInput: FlightInput = { ...input, mouseDX: dx, mouseDY: dy };
      const result = advanceAutopilotPatch({ state, delta, now, gameClock, marketState, controlInput });
      if (result) {
        for (const event of result.audioEvents ?? []) audioSystem.play(event);
        const stationAutoSave = result.autoSave ? writeStationAutoSave(state, result.autoSave) : {};
        set({ ...result.patch, ...stationAutoSave });
        return;
      }
    }

    let player = state.player;
    const equipmentEffects = getEquipmentEffects(player.equipment);
    const primaryWeapon = getActivePrimaryWeapon(player.equipment);
    const secondaryWeapon = getActiveSecondaryWeapon(player.equipment);
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
      damping: throttle <= 0.02 ? 0.55 : 0.82,
      afterburnerMultiplier: equipmentEffects.afterburnerMultiplier
    });
    player = {
      ...player,
      rotation: [pitch, yaw, roll],
      throttle,
      velocity,
      position: add(player.position, scale(velocity, delta)),
      energy: clamp(
        player.energy + delta * equipmentEffects.energyRegenPerSecond - (afterburning ? delta * equipmentEffects.afterburnerEnergyDrain : 0),
        0,
        player.stats.energy
      )
    };
    player = regenerateShield(player, player.stats.shield, now, delta, 8);
    if (equipmentEffects.hullRegenPerSecond > 0 && now - player.lastDamageAt >= equipmentEffects.hullRegenDelay && player.hull < player.stats.hull) {
      player = { ...player, hull: clamp(player.hull + equipmentEffects.hullRegenPerSecond * delta, 0, player.stats.hull) };
    }

    const convoyFires: Array<{ position: Vec3; targetPosition: Vec3; targetId: string; damage: number; projectileSpeed: number }> = [];
    let runtime: RuntimeState = {
      ...state.runtime,
      clock: now,
      enemies: state.runtime.enemies.map((ship) => ({
        ...ship,
        fireCooldown: ship.fireCooldown - delta,
        deathTimer: ship.deathTimer === undefined ? undefined : ship.deathTimer - delta
      })),
      convoys: state.runtime.convoys.map((convoy) => {
        const advanced = advanceConvoyEntity(convoy, state.runtime.enemies, delta, now);
        if (advanced.fire) convoyFires.push(advanced.fire);
        return advanced.convoy;
      }),
      salvage: state.runtime.salvage,
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
    for (const fire of convoyFires) {
      runtime.projectiles.push({
        id: projectileId("convoy-laser"),
        owner: "npc",
        kind: "laser",
        position: fire.position,
        direction: normalize(sub(fire.targetPosition, fire.position)),
        speed: fire.projectileSpeed,
        damage: fire.damage,
        life: 1.8,
        targetId: fire.targetId
      });
    }
    let explorationState = state.explorationState;
    let knownPlanetIds = state.knownPlanetIds;
    let primaryCooldown = Math.max(0, state.primaryCooldown - delta);
    let secondaryCooldown = Math.max(0, state.secondaryCooldown - delta);
    let pendingDialogueSceneId: string | undefined;
    const target = runtime.enemies.find((ship) => ship.id === state.targetId && ship.hull > 0);

    const nearestAsteroid = runtime.asteroids
      .filter((asteroid) => asteroid.amount > 0)
      .map((asteroid) => ({ asteroid, dist: distance(player.position, asteroid.position) }))
      .sort((a, b) => a.dist - b.dist)[0];

    const miningRange = equipmentById["mining-beam"].weapon?.range ?? 360;
    const miningActive = !!(
      input.firePrimary &&
      hasMiningBeam(player.equipment) &&
      nearestAsteroid &&
      nearestAsteroid.dist < miningRange &&
      player.energy > MINING_MIN_ENERGY
    );
    if (miningActive && nearestAsteroid) {
      audioSystem.play("mining");
      const cargoAvailable = Math.max(0, player.stats.cargoCapacity - getOccupiedCargo(player.cargo, state.activeMissions));
      if (cargoAvailable <= 0) {
        runtime = { ...runtime, message: "Cargo hold full." };
      } else {
        runtime.effects.push({
          id: projectileId("mining-beam"),
          kind: "mining-beam",
          position: add(player.position, scale(forward, 12)),
          endPosition: nearestAsteroid.asteroid.position,
          color: getOreColor(nearestAsteroid.asteroid.resource),
          secondaryColor: "#eaffff",
          label: commodityById[nearestAsteroid.asteroid.resource].name,
          particleCount: 3,
          spread: 12,
          size: 1,
          life: 0.12,
          maxLife: 0.12
        });

        let miningMessage = `Mining ${commodityById[nearestAsteroid.asteroid.resource].name} vein · ${Math.round(nearestAsteroid.asteroid.miningProgress * 100)}%`;
        runtime = {
          ...runtime,
          asteroids: runtime.asteroids.map((asteroid) => {
            if (asteroid.id !== nearestAsteroid.asteroid.id) return asteroid;
            const progress = asteroid.miningProgress + getMiningProgressIncrement(asteroid.resource, delta);
            if (progress < 1) {
              miningMessage = `Mining ${commodityById[asteroid.resource].name} vein · ${Math.round(progress * 100)}%`;
              return { ...asteroid, miningProgress: progress };
            }

            const chunk = Math.min(MINING_YIELD_PER_CYCLE, asteroid.amount);
            const result = addCargoWithinCapacity(player, asteroid.resource, chunk, state.activeMissions);
            if (result.collected <= 0) {
              miningMessage = "Cargo hold full.";
              return asteroid;
            }

            player = result.player;
            runtime.effects.push({
              id: projectileId("ore-pop"),
              kind: "hit",
              position: add(asteroid.position, [asteroid.radius * 0.6, 0, 0]),
              color: getOreColor(asteroid.resource),
              secondaryColor: "#ffffff",
              label: `+${result.collected} ${commodityById[asteroid.resource].name}`,
              particleCount: 8,
              spread: 18,
              size: 9 + result.collected,
              life: 0.55,
              maxLife: 0.55,
              velocity: [0, 18, 0]
            });
            miningMessage = `Mined ${result.collected} ${commodityById[asteroid.resource].name}. Cargo ${getOccupiedCargo(player.cargo, state.activeMissions)}/${player.stats.cargoCapacity}.`;
            return { ...asteroid, amount: asteroid.amount - result.collected, miningProgress: 0 };
          }),
          message: miningMessage
        };
        player = { ...player, energy: clamp(player.energy - delta * MINING_ENERGY_DRAIN_PER_SECOND, 0, player.stats.energy) };
        primaryCooldown = Math.max(primaryCooldown, MINING_COOLDOWN_SECONDS);
      }
    } else if (input.firePrimary && primaryWeapon && primaryCooldown <= 0 && player.energy >= primaryWeapon.energyCost) {
      runtime.projectiles.push({
        id: projectileId("laser"),
        owner: "player",
        kind: "laser",
        position: add(player.position, scale(forward, 16)),
        direction: target ? normalize(sub(target.position, player.position)) : forward,
        speed: primaryWeapon.speed,
        damage: primaryWeapon.damage,
        life: primaryWeapon.speed > 0 ? primaryWeapon.range / primaryWeapon.speed : 1.4,
        targetId: target?.id
      });
      audioSystem.play("laser");
      player = { ...player, energy: player.energy - primaryWeapon.energyCost };
      primaryCooldown = getWeaponCooldown(primaryWeapon, player.equipment);
    }

    if (input.fireSecondary && secondaryWeapon && secondaryCooldown <= 0 && player.missiles > 0) {
      runtime.projectiles.push({
        id: projectileId("missile"),
        owner: "player",
        kind: "missile",
        position: add(player.position, scale(forward, 18)),
        direction: target ? normalize(sub(target.position, player.position)) : forward,
        speed: secondaryWeapon.speed,
        damage: secondaryWeapon.damage,
        life: secondaryWeapon.speed > 0 ? secondaryWeapon.range / secondaryWeapon.speed : 3.6,
        targetId: target?.id
      });
      audioSystem.play("missile");
      player = { ...player, missiles: player.missiles - 1 };
      secondaryCooldown = getWeaponCooldown(secondaryWeapon, player.equipment);
    }

    const pirates = sortPirateTargets(runtime.enemies);
    const graceActive = now < runtime.graceUntil;
    let reputation = state.reputation;
    let contrabandScanMessage: string | undefined;
    const patrolSupportSpawns: FlightEntity[] = [];
    let patrolSupportMessage: string | undefined;
    runtime.enemies = runtime.enemies.map((ship) => {
      if (ship.hull <= 0 || ship.deathTimer !== undefined) return ship;
      if (ship.economyStatus && !isHostileToPlayer(ship) && !hasLocalCombatThreat(ship, runtime.enemies)) {
        return regenerateShield(
          {
            ...ship,
            position: add(ship.position, scale(ship.velocity, delta))
          },
          ship.maxShield,
          now,
          delta,
          5
        );
      }
      const ai = resolveCombatAiStep({
        ship,
        systemId: state.currentSystemId,
        risk: systemById[state.currentSystemId].risk,
        playerPosition: player.position,
        playerHasContraband: (player.cargo["illegal-contraband"] ?? 0) > 0,
        delta,
        now,
        graceUntil: runtime.graceUntil,
        pirates,
        ships: runtime.enemies,
        convoys: runtime.convoys
      });
      let moved = {
        ...ai.ship,
        velocity: scale(ai.desiredDirection, ai.speed),
        position: add(ship.position, scale(ai.desiredDirection, ai.speed * delta))
      };
      if (ai.scanComplete) {
        const law = getContrabandLaw(state.currentSystemId);
        const contrabandAmount = player.cargo["illegal-contraband"] ?? 0;
        if (contrabandAmount > 0 && law.disposition === "fine-confiscate") {
          const fine = contrabandAmount * CONTRABAND_FINE_PER_UNIT;
          const cargo = { ...player.cargo };
          delete cargo["illegal-contraband"];
          player = {
            ...player,
            cargo,
            credits: Math.max(0, player.credits - fine)
          };
          reputation = updateReputation(reputation, systemById[state.currentSystemId].factionId, -2);
          moved = { ...moved, scanProgress: undefined, aiState: "patrol", aiTargetId: undefined };
          contrabandScanMessage = `${law.label}: ${contrabandAmount} Illegal Contraband confiscated. Fine ${fine.toLocaleString()} cr.`;
        } else if (contrabandAmount > 0 && law.disposition === "hostile-pursuit") {
          moved = { ...moved, aiState: "attack", aiTargetId: "player", scanProgress: 1 };
          contrabandScanMessage = `${law.label}: patrol has marked you hostile for Illegal Contraband.`;
        }
      }
      const supportRequest = createPatrolSupportRequest({
        ship: moved,
        enemies: runtime.enemies,
        convoys: runtime.convoys,
        systemId: state.currentSystemId,
        risk: systemById[state.currentSystemId].risk,
        playerPosition: player.position,
        now,
        existingSpawnCount: patrolSupportSpawns.length
      });
      if (supportRequest) {
        moved = supportRequest.requestedShip;
        patrolSupportSpawns.push(...supportRequest.ships);
        patrolSupportMessage = supportRequest.message;
        for (const position of supportRequest.effectPositions) {
          runtime.effects.push({
            id: projectileId("patrol-support"),
            kind: "nav-ring",
            position,
            color: "#64e4ff",
            secondaryColor: "#eaffff",
            label: "SUPPORT",
            particleCount: 0,
            spread: 1,
            size: 58,
            life: 0.8,
            maxLife: 0.8
          });
        }
      }
      if (ai.fire) {
        runtime.projectiles.push({
          id: projectileId(ai.fire.owner === "patrol" ? "patrol-laser" : "enemy-laser"),
          owner: ai.fire.owner,
          kind: "laser",
          position: moved.position,
          direction: normalize(sub(ai.fire.targetPosition, moved.position)),
          speed: ai.fire.projectileSpeed,
          damage: ai.fire.damage,
          life: 1.8,
          targetId: ai.fire.targetId
        });
        return { ...moved, fireCooldown: ai.fire.cooldownMin + Math.random() * (ai.fire.cooldownMax - ai.fire.cooldownMin) };
      }
      return regenerateShield(moved, moved.maxShield, now, delta, 5);
    });
    if (patrolSupportSpawns.length > 0) {
      runtime = {
        ...runtime,
        enemies: [...runtime.enemies, ...patrolSupportSpawns],
        message: runtime.message === state.runtime.message ? patrolSupportMessage ?? runtime.message : runtime.message
      };
    }

    if (runtime.explorationScan) {
      const signal = explorationSignalById[runtime.explorationScan.signalId];
      if (!signal || explorationState.completedSignalIds.includes(runtime.explorationScan.signalId) || !isExplorationSignalUnlocked(signal, explorationState)) {
        runtime = { ...runtime, explorationScan: undefined };
      } else {
        const scanDistance = distance(player.position, signal.position);
        const inRange = scanDistance <= getEffectiveSignalScanRange(signal, player.equipment);
        const inBand = inRange && isFrequencyInSignalBand(signal, runtime.explorationScan.frequency, player.equipment);
        const progress = clamp(
          runtime.explorationScan.progress + (inBand ? delta / signal.scanTime : -delta * 0.22),
          0,
          1
        );
        if (progress >= 1) {
          const result = applyExplorationReward({
            signalId: signal.id,
            player,
            reputation,
            explorationState,
            knownPlanetIds,
            activeMissions: state.activeMissions
          });
          player = result.player;
          reputation = result.reputation;
          explorationState = result.explorationState;
          knownPlanetIds = result.knownPlanetIds;
          pendingDialogueSceneId = getExplorationDialogueScene(signal.id)?.id;
          runtime = {
            ...runtime,
            explorationScan: undefined,
            message: result.message,
            effects: [
              ...runtime.effects,
              {
                id: projectileId("exploration-resolved"),
                kind: "nav-ring",
                position: signal.position,
                color: "#9bffe8",
                secondaryColor: "#fff6d6",
                label: "RESOLVED",
                particleCount: 0,
                spread: 1,
                size: 68,
                life: 0.7,
                maxLife: 0.7
              }
            ]
          };
          audioSystem.play("mission-complete");
        } else {
          runtime = {
            ...runtime,
            explorationScan: {
              ...runtime.explorationScan,
              progress,
              inBand,
              distance: scanDistance
            },
            message: inRange
              ? inBand
                ? `Frequency lock on ${signal.title}: ${Math.round(progress * 100)}%.`
                : `Tuning ${signal.title}: align frequency inside ${getEffectiveSignalScanBand(signal, player.equipment).join("-")}.`
              : `${signal.title} scan paused. Return within ${Math.round(getEffectiveSignalScanRange(signal, player.equipment))}m.`
          };
        }
      }
    }

    const remainingProjectiles: ProjectileEntity[] = [];
    const lootDrops: LootEntity[] = [];
    let destroyedPirates = runtime.destroyedPirates;
    const destroyedStoryTargets: Array<{ missionId: string; targetId: string; name: string }> = [];
    let destroyedBossName: string | undefined;
    let patrolsShouldAttackPlayer = false;
    let playerAggressionMessage: string | undefined;
    for (const projectile of runtime.projectiles) {
      if (projectile.life <= 0) continue;
      let direction = projectile.direction;
      if (projectile.kind === "missile" && projectile.targetId) {
        const missileTarget = runtime.enemies.find((ship) => ship.id === projectile.targetId && ship.hull > 0);
        if (missileTarget) direction = normalize(sub(missileTarget.position, projectile.position));
      }
      const movedProjectile = { ...projectile, direction, position: add(projectile.position, scale(direction, projectile.speed * delta)) };
      let consumed = false;
      if (projectile.owner === "enemy" && projectile.targetId) {
        runtime.convoys = runtime.convoys.map((convoy) => {
          if (convoy.id !== projectile.targetId || convoy.hull <= 0 || consumed || distance(movedProjectile.position, convoy.position) > 25) return convoy;
          const shielded = convoy.shield > 0;
          const damaged = applyDamage(convoy, projectile.damage, now);
          consumed = true;
          runtime.effects.push({
            id: projectileId(shielded ? "convoy-shield-hit" : "convoy-hit"),
            kind: shielded ? "shield-hit" : "hit",
            position: movedProjectile.position,
            color: shielded ? "#69e4ff" : "#ffb657",
            secondaryColor: "#ffffff",
            label: `-${Math.round(projectile.damage)}`,
            particleCount: 5,
            spread: 16,
            size: shielded ? 22 : 14,
            life: 0.34,
            maxLife: 0.34,
            velocity: [0, 8, 0]
          });
          return damaged;
        });
      }

      if (!consumed && projectile.targetId && projectile.owner !== "player") {
        runtime.enemies = runtime.enemies.map((ship) => {
          if (ship.id !== projectile.targetId || ship.hull <= 0 || ship.deathTimer !== undefined || consumed || distance(movedProjectile.position, ship.position) > 25) return ship;
          const shielded = ship.shield > 0;
          const damaged = applyDamage(ship, projectile.damage, now);
          consumed = true;
          runtime.effects.push({
            id: projectileId(shielded ? "shield-hit" : "hit"),
            kind: shielded ? "shield-hit" : "hit",
            position: movedProjectile.position,
            color: shielded ? "#69e4ff" : "#ff8a6a",
            secondaryColor: shielded ? "#eaffff" : "#ffd166",
            label: `-${Math.round(projectile.damage)}`,
            particleCount: 5,
            spread: 12,
            size: 12,
            life: 0.34,
            maxLife: 0.34,
            velocity: [0, 10, 0]
          });
          if (damaged.hull <= 0 && ship.hull > 0) {
            if (ship.role === "pirate") destroyedPirates += 1;
            if (ship.boss) destroyedBossName = ship.name;
            if (ship.storyTarget && ship.missionId) destroyedStoryTargets.push({ missionId: ship.missionId, targetId: ship.id, name: ship.name });
            lootDrops.push(...lootDropsForDestroyedShip(ship, state.currentSystemId));
            runtime.effects.push({
              id: projectileId("explosion"),
              kind: "explosion",
              position: ship.position,
              color: ship.role === "pirate" ? "#ff784f" : ship.role === "patrol" ? "#64e4ff" : "#ffd166",
              secondaryColor: "#ffd166",
              label: "Destroyed",
              particleCount: 22,
              spread: 58,
              size: 46,
              life: 0.85,
              maxLife: 0.85,
              velocity: [0, 6, 0]
            });
            audioSystem.play("explosion");
            if (shouldReportEconomyNpcDestroyed(ship)) {
              void postNpcDestroyed({ npcId: ship.id, systemId: state.currentSystemId }).catch(() => undefined);
            }
            return { ...damaged, deathTimer: 0.42 };
          }
          return damaged;
        });
      }

      if (!consumed && projectile.owner === "enemy" && distance(movedProjectile.position, player.position) < 22) {
        const shielded = player.shield > 0;
        const previousShield = player.shield;
        const previousHullRatio = player.hull / player.stats.hull;
        player = applyDamage(player, projectile.damage, now);
        if (previousShield > 0 && player.shield <= 0) audioSystem.play("shield-break");
        if (previousHullRatio > 0.3 && player.hull / player.stats.hull <= 0.3) audioSystem.play("low-hull");
        runtime.effects.push({
          id: projectileId(shielded ? "shield-hit" : "player-hit"),
          kind: shielded ? "shield-hit" : "hit",
          position: player.position,
          color: shielded ? "#69e4ff" : "#ff6270",
          secondaryColor: shielded ? "#eaffff" : "#ffd166",
          label: `-${Math.round(projectile.damage)}`,
          particleCount: shielded ? 5 : 7,
          spread: shielded ? 18 : 14,
          size: shielded ? 28 : 16,
          life: 0.42,
          maxLife: 0.42,
          velocity: [0, 12, 0]
        });
        consumed = true;
      } else if (!consumed && projectile.owner === "player") {
        runtime.enemies = runtime.enemies.map((ship) => {
          const validTarget = ship.hull > 0 && ship.deathTimer === undefined;
          if (!validTarget || ship.hull <= 0 || ship.deathTimer !== undefined || consumed || distance(movedProjectile.position, ship.position) > 25) return ship;
          const shielded = ship.shield > 0;
          let damaged = applyDamage(ship, projectile.damage, now);
          if (ship.role !== "pirate" && !ship.provokedByPlayer && !isHostileToPlayer(ship)) {
            const penalty = ship.role === "patrol" ? -8 : ship.role === "smuggler" ? -2 : -4;
            reputation = updateReputation(reputation, ship.factionId, penalty);
            patrolsShouldAttackPlayer = ship.role !== "smuggler";
            playerAggressionMessage = `${ship.name} returns fire. ${ship.role === "patrol" ? "Security response active." : "Local reputation damaged."}`;
            damaged = { ...damaged, aiState: "attack", aiTargetId: "player", provokedByPlayer: true };
          }
          consumed = true;
          runtime.effects.push({
            id: projectileId(shielded ? "shield-hit" : "hit"),
            kind: shielded ? "shield-hit" : "hit",
            position: movedProjectile.position,
            color: shielded ? "#69e4ff" : "#ff8a6a",
            secondaryColor: shielded ? "#eaffff" : "#ffd166",
            label: `-${Math.round(projectile.damage)}`,
            particleCount: projectile.kind === "missile" ? 10 : 5,
            spread: projectile.kind === "missile" ? 22 : 12,
            size: projectile.kind === "missile" ? 22 : 12,
            life: 0.34,
            maxLife: 0.34,
            velocity: [0, 10, 0]
          });
          if (damaged.hull <= 0 && ship.hull > 0) {
            if (ship.role === "pirate") destroyedPirates += 1;
            if (ship.boss) destroyedBossName = ship.name;
            if (ship.storyTarget && ship.missionId) destroyedStoryTargets.push({ missionId: ship.missionId, targetId: ship.id, name: ship.name });
            lootDrops.push(...lootDropsForDestroyedShip(ship, state.currentSystemId));
            runtime.effects.push({
              id: projectileId("explosion"),
              kind: "explosion",
              position: ship.position,
              color: ship.role === "pirate" ? "#ff784f" : ship.role === "patrol" ? "#64e4ff" : "#ffd166",
              secondaryColor: "#ffd166",
              label: "Destroyed",
              particleCount: 22,
              spread: 58,
              size: 46,
              life: 0.85,
              maxLife: 0.85,
              velocity: [0, 6, 0]
            });
            audioSystem.play("explosion");
            if (shouldReportEconomyNpcDestroyed(ship)) {
              void postNpcDestroyed({ npcId: ship.id, systemId: state.currentSystemId }).catch(() => undefined);
            }
            return { ...damaged, deathTimer: 0.42 };
          }
          return damaged;
        });
      }
      if (!consumed) remainingProjectiles.push(movedProjectile);
    }
    if (patrolsShouldAttackPlayer) {
      runtime.enemies = runtime.enemies.map((ship) =>
        ship.role === "patrol" && ship.hull > 0 && ship.deathTimer === undefined
          ? { ...ship, aiState: "attack", aiTargetId: "player", scanProgress: 1 }
          : ship
      );
    }
    runtime = {
      ...runtime,
      projectiles: remainingProjectiles,
      enemies: runtime.enemies.filter((ship) => ship.hull > 0 || (ship.deathTimer ?? 0) > 0),
      loot: [...runtime.loot, ...lootDrops],
      destroyedPirates,
      message: playerAggressionMessage ?? (destroyedBossName ? `${destroyedBossName} destroyed. Boss cargo scattered.` : runtime.message)
    };

    let activeMissions = destroyedStoryTargets.length > 0
      ? state.activeMissions.map((mission) => {
          const targetKills = destroyedStoryTargets.filter((target) => target.missionId === mission.id);
          return targetKills.reduce((nextMission, target) => markStoryTargetDestroyed(nextMission, target.targetId), mission);
        })
      : state.activeMissions;
    const storyTargetMessage = destroyedStoryTargets.length > 0
      ? `${destroyedStoryTargets[destroyedStoryTargets.length - 1].name} destroyed. Story objective updated.`
      : undefined;
    activeMissions = activeMissions.map((mission) => {
      const convoy = runtime.convoys.find((item) => item.missionId === mission.id);
      return convoy?.arrived && mission.escort && !mission.escort.arrived ? markEscortArrived(mission) : mission;
    });
    let failedMissionIds = state.failedMissionIds;
    for (const convoy of runtime.convoys.filter((item) => item.hull <= 0)) {
      const mission = activeMissions.find((candidate) => candidate.id === convoy.missionId);
      if (!mission) continue;
      const result = failMissionPure(mission, player, reputation, "Escort convoy destroyed");
      player = result.player;
      reputation = result.reputation;
      activeMissions = activeMissions.filter((candidate) => candidate.id !== mission.id);
      failedMissionIds = Array.from(new Set([...failedMissionIds, mission.id]));
      audioSystem.play("mission-fail");
      runtime.effects.push({
        id: projectileId("convoy-explosion"),
        kind: "explosion",
        position: convoy.position,
        color: "#ffb657",
        secondaryColor: "#ff4e5f",
        label: "Convoy lost",
        particleCount: 24,
        spread: 62,
        size: 44,
        life: 0.85,
        maxLife: 0.85
      });
      audioSystem.play("explosion");
      runtime.message = `${mission.title} failed: convoy destroyed.`;
    }
    runtime = { ...runtime, convoys: runtime.convoys.filter((convoy) => convoy.hull > 0 && !failedMissionIds.includes(convoy.missionId)) };
    const planetDiscovery = discoverNearbyPlanets(state.currentSystemId, player.position, knownPlanetIds);
    knownPlanetIds = planetDiscovery.knownPlanetIds;
    if (planetDiscovery.discovered.length > 0) {
      const names = planetDiscovery.discovered.map((planet) => planet.name).join(", ");
      runtime = {
        ...runtime,
        message: `Navigation scan complete: ${names} station beacon unlocked.`
      };
      audioSystem.play("ui-click");
    }

    if (input.interact) {
      get().interact();
      set((latest) => ({ input: { ...latest.input, interact: false } }));
      return;
    }
    if (input.cycleTarget) {
      get().cycleTarget();
      set((latest) => ({ input: { ...latest.input, cycleTarget: false } }));
    }
    if (input.toggleMap) {
      set({ screen: "galaxyMap", previousScreen: "flight", galaxyMapMode: "station-route" });
      set((latest) => ({ input: { ...latest.input, toggleMap: false } }));
    }
    if (input.toggleCamera) {
      get().toggleCamera();
      set((latest) => ({ input: { ...latest.input, toggleCamera: false } }));
    }
    if (input.pause) {
      set({ screen: "pause", previousScreen: "flight", input: { ...get().input, pause: false } });
    }

    const expiration = applyExpiredMissions({
      player,
      reputation,
      activeMissions,
      failedMissionIds,
      runtime,
      gameClock
    });
    if (expiration.expiredMissionIds.length > 0) audioSystem.play("mission-fail");
    const missionFailedThisFrame = expiration.failedMissionIds.length > failedMissionIds.length;
    const explorationMessageActive = !!state.runtime.explorationScan || !!runtime.explorationScan || explorationState !== state.explorationState;
    const dialoguePatch = pendingDialogueSceneId ? dialogueOpenPatch(state, pendingDialogueSceneId) : {};

    set({
      player: expiration.player,
      runtime: {
        ...expiration.runtime,
        message:
          expiration.player.hull <= 0
            ? "Hull integrity failed."
            : missionFailedThisFrame
              ? expiration.runtime.message
            : contrabandScanMessage
              ? contrabandScanMessage
            : storyTargetMessage
              ? storyTargetMessage
            : destroyedBossName
              ? `${destroyedBossName} destroyed. Boss cargo scattered.`
            : lootDrops.length
              ? "Target destroyed. Cargo canister released."
              : miningActive
                ? expiration.runtime.message
              : explorationMessageActive
                ? expiration.runtime.message
              : graceActive
                ? `Pirates are sizing you up · weapons free in ${Math.ceil(runtime.graceUntil - now)}s`
              : expiration.runtime.message
      },
      gameClock,
      marketState,
      knownPlanetIds,
      activeMissions: expiration.activeMissions,
      failedMissionIds: expiration.failedMissionIds,
      reputation: expiration.reputation,
      explorationState,
      ...dialoguePatch,
      primaryCooldown,
      secondaryCooldown,
      screen: expiration.player.hull <= 0 ? "gameOver" : get().screen,
      targetId: runtime.enemies.some((ship) => ship.id === state.targetId && ship.hull > 0 && ship.deathTimer === undefined)
        ? state.targetId
        : sortTargetableShips(runtime.enemies)[0]?.id
    });
  },
  advanceGameClock: (delta) => {
    const state = get();
    if (delta <= 0) return;
    const gameClock = state.gameClock + delta;
    const expiration = applyExpiredMissions({
      player: state.player,
      reputation: state.reputation,
      activeMissions: state.activeMissions,
      failedMissionIds: state.failedMissionIds,
      runtime: state.runtime,
      gameClock
    });
    if (expiration.expiredMissionIds.length > 0) audioSystem.play("mission-fail");
    set({
      gameClock,
      marketState: state.economyService.status === "connected" ? state.marketState : advanceMarketState(state.marketState, delta),
      player: expiration.player,
      reputation: expiration.reputation,
      activeMissions: expiration.activeMissions,
      failedMissionIds: expiration.failedMissionIds,
      runtime: expiration.runtime
    });
  },
  cycleTarget: () => {
    const targets = sortTargetableShips(get().runtime.enemies);
    if (targets.length === 0) return set({ targetId: undefined });
    const currentIndex = targets.findIndex((ship) => ship.id === get().targetId);
    set({ targetId: targets[(currentIndex + 1) % targets.length].id });
  },
  interact: () => {
    const state = get();
    const equipmentEffects = getEquipmentEffects(state.player.equipment);
    const navigationTarget = getNearestNavigationTarget(state.currentSystemId, state.player.position, state.knownPlanetIds, {
      explorationState: state.explorationState,
      installedEquipment: state.player.equipment
    });
    const nearSalvage = state.runtime.salvage
      .filter((salvage) => !salvage.recovered)
      .map((salvage) => ({ salvage, dist: distance(salvage.position, state.player.position) }))
      .sort((a, b) => a.dist - b.dist)[0];
    if (nearSalvage && nearSalvage.dist < equipmentEffects.salvageInteractionRange) {
      const activeMissions = state.activeMissions.map((mission) =>
        mission.id === nearSalvage.salvage.missionId ? markSalvageRecovered(mission) : mission
      );
      set({
        activeMissions,
        runtime: {
          ...state.runtime,
          salvage: state.runtime.salvage.filter((salvage) => salvage.id !== nearSalvage.salvage.id),
          effects: [
            ...state.runtime.effects,
            {
              id: projectileId("salvage-recovered"),
              kind: "hit",
              position: nearSalvage.salvage.position,
              color: "#9b7bff",
              secondaryColor: "#eaffff",
              label: "Recovered",
              particleCount: 12,
              spread: 24,
              size: 16,
              life: 0.7,
              maxLife: 0.7,
              velocity: [0, 12, 0]
            }
          ],
          message: `Recovered ${nearSalvage.salvage.name}. Return to station.`
        }
      });
      audioSystem.play("loot");
      return;
    }
    const nearLoot = state.runtime.loot.filter((loot) => distance(loot.position, state.player.position) < equipmentEffects.lootInteractionRange);
    if (nearLoot.length > 0) {
      let player = state.player;
      const collectedIds = new Set<string>();
      let collectedCargo = 0;
      const collectedEquipment: string[] = [];
      for (const loot of nearLoot) {
        if (loot.kind === "equipment") {
          player = { ...player, equipmentInventory: addEquipmentToInventory(player.equipmentInventory, loot.equipmentId, loot.amount) };
          collectedEquipment.push(equipmentById[loot.equipmentId].name);
          collectedIds.add(loot.id);
        } else {
          const result = addCargoWithinCapacity(player, loot.commodityId, loot.amount, state.activeMissions);
          player = result.player;
          collectedCargo += result.collected;
          if (result.collected > 0) collectedIds.add(loot.id);
        }
      }
      const messageParts = [
        collectedCargo > 0 ? `Collected ${collectedCargo} cargo unit(s)` : "",
        collectedEquipment.length > 0 ? `Recovered ${collectedEquipment.join(", ")}` : ""
      ].filter(Boolean);
      set({
        player,
        runtime: {
          ...state.runtime,
          loot: state.runtime.loot.filter((loot) => !collectedIds.has(loot.id)),
          message: messageParts.length > 0 ? `${messageParts.join(" · ")}.` : "Cargo hold full."
        }
      });
      if (messageParts.length > 0) audioSystem.play("loot");
      return;
    }
    if (navigationTarget?.inRange && navigationTarget.kind === "exploration-signal") {
      const signal = navigationTarget.signal;
      const alreadyComplete = state.explorationState.completedSignalIds.includes(signal.id);
      if (alreadyComplete) {
        set({ runtime: { ...state.runtime, message: `${signal.title} already resolved.` } });
        return;
      }
      const initialFrequency = Math.max(0, Math.min(100, Math.round((signal.scanBand[0] + signal.scanBand[1]) / 2) - 18));
      set({
        explorationState: {
          ...state.explorationState,
          discoveredSignalIds: addUniqueIds(state.explorationState.discoveredSignalIds, [signal.id])
        },
        runtime: {
          ...state.runtime,
          explorationScan: {
            signalId: signal.id,
            frequency: initialFrequency,
            progress: 0,
            inBand: false,
            distance: navigationTarget.distance
          },
          message: `Signal handshake opened: ${signal.title}. Tune frequency into ${getEffectiveSignalScanBand(signal, state.player.equipment).join("-")}.`
        }
      });
      audioSystem.play("ui-click");
      return;
    }
    if (navigationTarget?.inRange && navigationTarget.kind === "station") {
      get().dockAt(navigationTarget.station.id);
      return;
    }
    if (navigationTarget?.inRange && navigationTarget.kind === "stargate") {
      set({
        screen: "galaxyMap",
        previousScreen: "flight",
        galaxyMapMode: "gate",
        runtime: { ...state.runtime, message: "Stargate link established. Select a known system." },
        input: { ...emptyInput }
      });
      return;
    }
    if (navigationTarget?.inRange && navigationTarget.kind === "planet-signal") {
      const discovered = discoverNearbyPlanets(state.currentSystemId, state.player.position, state.knownPlanetIds);
      set({
        knownPlanetIds: discovered.knownPlanetIds,
        runtime: {
          ...state.runtime,
          message:
            discovered.discovered.length > 0
              ? `Navigation scan complete: ${discovered.discovered.map((planet) => planet.name).join(", ")} station beacon unlocked.`
              : "Unknown beacon already scanned."
        }
      });
      return;
    }
    set({ runtime: { ...state.runtime, message: "No interactable object in range." } });
  },
  adjustExplorationScanFrequency: (delta) => {
    const state = get();
    const scan = state.runtime.explorationScan;
    if (!scan) return;
    set({
      runtime: {
        ...state.runtime,
        explorationScan: {
          ...scan,
          frequency: clamp(scan.frequency + delta, 0, 100)
        }
      }
    });
  },
  cancelExplorationScan: () => {
    const state = get();
    if (!state.runtime.explorationScan) return;
    set({ runtime: { ...state.runtime, explorationScan: undefined, message: "Signal scan canceled." } });
  },
  openDialogueScene: (sceneId, replay = true) => {
    const state = get();
    set(dialogueOpenPatch(state, sceneId, replay));
  },
  advanceDialogue: () => {
    const state = get();
    const activeDialogue = state.activeDialogue;
    if (!activeDialogue) return;
    const scene = dialogueSceneById[activeDialogue.sceneId];
    if (!scene || activeDialogue.lineIndex >= scene.lines.length - 1) {
      set({ activeDialogue: undefined });
      return;
    }
    set({ activeDialogue: { ...activeDialogue, lineIndex: activeDialogue.lineIndex + 1 } });
  },
  closeDialogue: () => set({ activeDialogue: undefined }),
  dockAt: (stationId) => {
    const state = get();
    const result = dockAtPatch(state, stationId);
    if (!result) return;
    const stationAutoSave = result.autoSave ? writeStationAutoSave(state, result.autoSave) : {};
    for (const event of result.audioEvents ?? []) audioSystem.play(event);
    set({ ...result.patch, ...stationAutoSave });
  },
  undock: () => {
    audioSystem.play("undock");
    set((state) => undockPatch(state));
  },
  startJumpToStation: (stationId) => {
    const state = get();
    const patch = startJumpToStationPatch(state, stationId);
    if (patch) set(patch);
  },
  startJumpToSystem: (systemId) => {
    const targetStation = getDefaultTargetStation(systemId);
    if (!targetStation) return;
    get().startJumpToStation(targetStation.id);
  },
  activateStargateJumpToStation: (stationId) => {
    const state = get();
    const result = activateStargateJumpToStationPatch(state, stationId);
    if (!result) return;
    for (const event of result.audioEvents ?? []) audioSystem.play(event);
    set(result.patch);
  },
  activateStargateJumpToSystem: (systemId) => {
    const targetStation = getDefaultTargetStation(systemId);
    if (!targetStation) return;
    get().activateStargateJumpToStation(targetStation.id);
  },
  cancelAutopilot: (reason = "Autopilot canceled. Manual control restored.") => {
    const state = get();
    if (!state.autopilot) return;
    set({
      autopilot: undefined,
      runtime: { ...state.runtime, message: reason },
      input: { ...emptyInput }
    });
  },
  jumpToSystem: (systemId) => {
    set((state) => jumpToSystemPatch(state, systemId) ?? {});
  },
  buy: (commodityId, amount = 1) => {
    const state = get();
    if (!state.currentStationId) return;
    const station = stationById[state.currentStationId];
    const system = systemById[state.currentSystemId];
    const reservedCargo = getOccupiedCargo(state.player.cargo, state.activeMissions) - getCargoUsed(state.player.cargo);
    const applyLocalBuy = (latest: GameStore, reason?: string) => {
      const localStation = stationById[latest.currentStationId ?? ""];
      const localSystem = systemById[latest.currentSystemId];
      if (!localStation || !localSystem) return;
      const localReservedCargo = getOccupiedCargo(latest.player.cargo, latest.activeMissions) - getCargoUsed(latest.player.cargo);
      const result = buyCommodity(latest.player, localStation, localSystem, commodityId, amount, latest.reputation.factions[localStation.factionId], latest.marketState, localReservedCargo);
      set({
        player: result.player,
        marketState: result.marketState ?? latest.marketState,
        economyService: reason ? { ...latest.economyService, status: "fallback", lastError: reason } : latest.economyService,
        runtime: { ...latest.runtime, message: result.message }
      });
    };
    if (state.economyService.status !== "connected") {
      applyLocalBuy(state);
      return;
    }
    void postPlayerTrade({
      action: "buy",
      stationId: station.id,
      systemId: system.id,
      commodityId,
      amount,
      player: state.player,
      reputation: state.reputation.factions[station.factionId],
      reservedCargo
    })
      .then((result) => {
        set((latest) => {
          const patch = result.snapshot ? applyEconomySnapshotPatch(latest, result.snapshot, result.message) : undefined;
          return {
            player: result.player,
            marketState: patch?.marketState ?? result.marketState,
            economyService: patch?.economyService ?? latest.economyService,
            runtime: { ...(patch?.runtime ?? latest.runtime), message: result.message }
          };
        });
      })
      .catch((error) => applyLocalBuy(get(), error instanceof Error ? error.message : "Economy backend unavailable."));
  },
  sell: (commodityId, amount = 1) => {
    const state = get();
    if (!state.currentStationId) return;
    const station = stationById[state.currentStationId];
    const system = systemById[state.currentSystemId];
    const applyLocalSell = (latest: GameStore, reason?: string) => {
      const localStation = stationById[latest.currentStationId ?? ""];
      const localSystem = systemById[latest.currentSystemId];
      if (!localStation || !localSystem) return;
      const result = sellCommodity(latest.player, localStation, localSystem, commodityId, amount, latest.reputation.factions[localStation.factionId], latest.marketState);
      const completedCargo: CargoHold = { ...latest.runtime.mined };
      set({
        player: result.player,
        marketState: result.marketState ?? latest.marketState,
        economyService: reason ? { ...latest.economyService, status: "fallback", lastError: reason } : latest.economyService,
        runtime: { ...latest.runtime, mined: completedCargo, message: result.message }
      });
    };
    if (state.economyService.status !== "connected") {
      applyLocalSell(state);
      return;
    }
    void postPlayerTrade({
      action: "sell",
      stationId: station.id,
      systemId: system.id,
      commodityId,
      amount,
      player: state.player,
      reputation: state.reputation.factions[station.factionId]
    })
      .then((result) => {
        set((latest) => {
          const patch = result.snapshot ? applyEconomySnapshotPatch(latest, result.snapshot, result.message) : undefined;
          return {
            player: result.player,
            marketState: patch?.marketState ?? result.marketState,
            economyService: patch?.economyService ?? latest.economyService,
            runtime: { ...(patch?.runtime ?? latest.runtime), mined: { ...latest.runtime.mined }, message: result.message }
          };
        });
      })
      .catch((error) => applyLocalSell(get(), error instanceof Error ? error.message : "Economy backend unavailable."));
  },
  buyEquipment: (equipmentId, amount = 1) => {
    const state = get();
    if (!state.currentStationId) return;
    const station = stationById[state.currentStationId];
    const system = systemById[state.currentSystemId];
    const result = buyEquipment(state.player, station, system, equipmentId, amount, state.reputation.factions[station.factionId], state.marketState);
    set({ player: result.player, marketState: result.marketState ?? state.marketState, runtime: { ...state.runtime, message: result.message } });
  },
  sellEquipment: (equipmentId, amount = 1) => {
    const state = get();
    if (!state.currentStationId) return;
    const station = stationById[state.currentStationId];
    const system = systemById[state.currentSystemId];
    const result = sellEquipment(state.player, station, system, equipmentId, amount, state.reputation.factions[station.factionId], state.marketState);
    set({ player: result.player, marketState: result.marketState ?? state.marketState, runtime: { ...state.runtime, message: result.message } });
  },
  acceptMission: (missionId) => {
    const state = get();
    const mission = missionTemplates.find((candidate) => candidate.id === missionId) ?? getMarketGapMissionById(state.marketState, missionId);
    const generatedMarketMission = isMarketGapMissionId(missionId);
    if (!mission) {
      set({ runtime: { ...state.runtime, message: "That market contract is no longer available." } });
      return;
    }
    if (!generatedMarketMission && (state.completedMissionIds.includes(missionId) || (state.failedMissionIds.includes(missionId) && !mission.retryOnFailure))) {
      set({ runtime: { ...state.runtime, message: "That contract is no longer available." } });
      return;
    }
    if (!generatedMarketMission && !areMissionPrerequisitesMet(mission, state.completedMissionIds)) {
      set({ runtime: { ...state.runtime, message: "Mission prerequisites are not complete." } });
      return;
    }
    const result = acceptMissionPure(state.player, state.activeMissions, mission, state.gameClock);
    const runtime = result.mission ? addMissionRuntimeEntity(state.runtime, result.mission, state.currentSystemId) : state.runtime;
    const dialogueScene = result.ok && !generatedMarketMission ? getStoryMissionDialogueScene(mission.id, "accept") : undefined;
    const dialoguePatch = dialogueScene ? dialogueOpenPatch(state, dialogueScene.id) : {};
    if (result.ok) audioSystem.play("ui-click");
    set({
      player: result.player,
      activeMissions: result.activeMissions,
      failedMissionIds: result.ok && (mission.retryOnFailure || generatedMarketMission) ? state.failedMissionIds.filter((id) => id !== missionId) : state.failedMissionIds,
      runtime: { ...runtime, message: result.message },
      ...dialoguePatch
    });
  },
  completeMission: (missionId) => {
    const state = get();
    if (!state.currentStationId) return;
    const mission = state.activeMissions.find((candidate) => candidate.id === missionId);
    if (!mission || !canCompleteMission(mission, state.player, state.currentSystemId, state.currentStationId, state.runtime.destroyedPirates, state.gameClock)) {
      set({ runtime: { ...state.runtime, message: "Mission requirements are not complete." } });
      return;
    }
    const result = completeMissionPure(mission, state.player, state.reputation);
    const generatedMarketMission = isMarketGapMissionId(mission.id);
    const marketState = generatedMarketMission ? applyMarketGapMissionDelivery(state.marketState, mission) : state.marketState;
    const dialogueScene = generatedMarketMission ? undefined : getStoryMissionDialogueScene(mission.id, "complete");
    const dialoguePatch = dialogueScene ? dialogueOpenPatch(state, dialogueScene.id) : {};
    audioSystem.play("mission-complete");
    set({
      player: result.player,
      reputation: result.reputation,
      activeMissions: state.activeMissions.filter((active) => active.id !== missionId),
      completedMissionIds: generatedMarketMission ? state.completedMissionIds : [...state.completedMissionIds, missionId],
      marketState,
      runtime: {
        ...state.runtime,
        convoys: state.runtime.convoys.filter((convoy) => convoy.missionId !== missionId),
        salvage: state.runtime.salvage.filter((salvage) => salvage.missionId !== missionId),
        message: generatedMarketMission
          ? `${mission.title} delivered. Market pressure eased. +${mission.reward} credits.`
          : `${mission.title} complete. +${mission.reward} credits.`
      },
      ...dialoguePatch
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
    const storedCurrentShip = currentShipStorageRecord(state.player);
    const storedRecords = upsertShipRecord(state.player.ownedShipRecords, storedCurrentShip).filter((record) => record.shipId !== ship.id);
    const player = createPlayerShipLoadout(
      {
        ...state.player,
        credits: state.player.credits - ship.price,
        ownedShips: addOwnedShipId(state.player, shipId),
        ownedShipRecords: storedRecords
      },
      ship
    );
    set({
      player,
      runtime: { ...state.runtime, message: `${ship.name} purchased. Previous ship stored at PTD Home.` }
    });
  },
  switchShip: (shipId) => {
    const state = get();
    const record = state.player.ownedShipRecords?.find((candidate) => candidate.shipId === shipId);
    const ship = shipById[shipId];
    if (!record || !ship) {
      set({ runtime: { ...state.runtime, message: "That ship is not stored in your fleet." } });
      return;
    }
    if (state.currentStationId !== record.stationId) {
      const stationName = stationById[record.stationId]?.name ?? record.stationId;
      set({ runtime: { ...state.runtime, message: `That ship is stored at ${stationName}.` } });
      return;
    }
    const storedCurrentShip = currentShipStorageRecord(state.player);
    const ownedShipRecords = upsertShipRecord(state.player.ownedShipRecords, storedCurrentShip).filter((candidate) => candidate.shipId !== shipId);
    const player = normalizePlayerEquipmentStats({
      ...state.player,
      shipId,
      equipment: [...record.installedEquipment],
      hull: record.hull,
      shield: record.shield,
      energy: record.energy,
      ownedShips: addOwnedShipId(state.player, shipId),
      ownedShipRecords
    });
    audioSystem.play("ui-click");
    set({
      player,
      runtime: { ...state.runtime, message: `${ship.name} switched in from PTD Home.` }
    });
  },
  craftEquipment: (equipmentId) => {
    const state = get();
    if (!(equipmentId in equipmentById)) {
      set({ runtime: { ...state.runtime, message: "Unknown equipment blueprint." } });
      return;
    }
    const typedEquipmentId = equipmentId as EquipmentId;
    const equipment = equipmentById[typedEquipmentId];
    const station = state.currentStationId ? stationById[state.currentStationId] : undefined;
    if (station && station.techLevel < equipment.techLevel) {
      set({ runtime: { ...state.runtime, message: `Blueprint requires Tech Level ${equipment.techLevel} station.` } });
      return;
    }
    const cost = equipment.craftCost;
    if (!cost) {
      set({ runtime: { ...state.runtime, message: "That blueprint is not craftable." } });
      return;
    }
    if (state.player.credits < cost.credits) {
      set({ runtime: { ...state.runtime, message: "Not enough credits to craft that blueprint." } });
      return;
    }
    if (!hasCraftMaterials(state.player.cargo, cost.cargo)) {
      set({ runtime: { ...state.runtime, message: "Missing cargo materials for that blueprint." } });
      return;
    }
    audioSystem.play("ui-click");
    set({
      player: {
        ...state.player,
        credits: state.player.credits - cost.credits,
        cargo: removeCraftCargo(state.player.cargo, cost.cargo),
        equipmentInventory: addEquipmentToInventory(state.player.equipmentInventory, typedEquipmentId)
      },
      runtime: { ...state.runtime, message: `Crafted ${equipment.name}. Added to equipment inventory.` }
    });
  },
  installEquipmentFromInventory: (equipmentId) => {
    const state = get();
    const result = installEquipmentFromInventoryPure(state.player, equipmentId);
    if (result.ok) audioSystem.play("ui-click");
    set({
      player: result.player,
      runtime: { ...state.runtime, message: result.message }
    });
  },
  uninstallEquipmentToInventory: (equipmentId) => {
    const state = get();
    const result = uninstallEquipmentToInventoryPure(state.player, equipmentId);
    if (result.ok) audioSystem.play("ui-click");
    set({
      player: result.player,
      runtime: { ...state.runtime, message: result.message }
    });
  },
  toggleCamera: () => set((state) => ({ cameraMode: state.cameraMode === "chase" ? "cinematic" : "chase" }))
}));

if (typeof window !== "undefined" && import.meta.env.DEV) {
  Object.assign(window, {
    __GOF2_E2E__: {
      getState: () => useGameStore.getState(),
      setState: useGameStore.setState
    }
  });
}

export { cloneMissionTemplates, commodities, planetById, planets, shipById, ships, stationById, stations, systemById, systems };
