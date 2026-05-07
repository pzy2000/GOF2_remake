import { commodities, stationById, systemById, useGameStore } from "../state/gameStore";
import { commodityById, factionNames } from "../data/world";
import { getOccupiedCargo } from "../systems/economy";
import { getEquipmentEffects, hasMiningBeam } from "../systems/equipment";
import { getMissionDeadlineRemaining } from "../systems/missions";
import { distance } from "../systems/math";
import { getNearestNavigationTarget } from "../systems/navigation";
import { combatAiProfileLabels, getContrabandLawSummary } from "../systems/combatAi";
import { explorationSignalById, getEffectiveSignalScanBand } from "../systems/exploration";

function Bar({ label, value, max, tone }: { label: string; value: number; max: number; tone: "cyan" | "green" | "orange" | "red" }) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`bar bar-${tone}`}>
      <span>{label}</span>
      <div>
        <i style={{ width: `${percent}%` }} />
      </div>
      <b>
        {Math.round(value)}/{Math.round(max)}
      </b>
    </div>
  );
}

export function Hud() {
  const player = useGameStore((state) => state.player);
  const runtime = useGameStore((state) => state.runtime);
  const autopilot = useGameStore((state) => state.autopilot);
  const currentSystem = useGameStore((state) => systemById[state.currentSystemId]);
  const target = useGameStore((state) => state.runtime.enemies.find((ship) => ship.id === state.targetId && ship.hull > 0 && ship.deathTimer === undefined));
  const manifest = useGameStore((state) => state.assetManifest);
  const activeMissions = useGameStore((state) => state.activeMissions);
  const gameClock = useGameStore((state) => state.gameClock);
  const saveGame = useGameStore((state) => state.saveGame);
  const setScreen = useGameStore((state) => state.setScreen);
  const openGalaxyMap = useGameStore((state) => state.openGalaxyMap);
  const knownPlanetIds = useGameStore((state) => state.knownPlanetIds);
  const explorationState = useGameStore((state) => state.explorationState);
  const adjustExplorationScanFrequency = useGameStore((state) => state.adjustExplorationScanFrequency);
  const cancelExplorationScan = useGameStore((state) => state.cancelExplorationScan);
  const equipmentEffects = getEquipmentEffects(player.equipment);
  const nearestNavigation = getNearestNavigationTarget(currentSystem.id, player.position, knownPlanetIds, {
    explorationState,
    installedEquipment: player.equipment
  });
  const activeScan = runtime.explorationScan;
  const activeScanSignal = activeScan ? explorationSignalById[activeScan.signalId] : undefined;
  const activeScanBand = activeScanSignal ? getEffectiveSignalScanBand(activeScanSignal, player.equipment) : undefined;
  const pirateCount = runtime.enemies.filter((ship) => ship.role === "pirate" && ship.hull > 0 && ship.deathTimer === undefined).length;
  const contrabandAmount = player.cargo["illegal-contraband"] ?? 0;
  const scanningPatrol = runtime.enemies.find((ship) => ship.role === "patrol" && ship.aiState === "scan" && (ship.scanProgress ?? 0) > 0);
  const graceRemaining = Math.max(0, Math.ceil(runtime.graceUntil - runtime.clock));
  const nearestMine = runtime.asteroids
    .filter((asteroid) => asteroid.amount > 0)
    .map((asteroid) => ({ asteroid, dist: distance(player.position, asteroid.position) }))
    .sort((a, b) => a.dist - b.dist)[0];
  const targetDistance = target ? Math.round(distance(player.position, target.position)) : 0;
  const navDistance = autopilot ? Math.round(distance(player.position, autopilot.targetPosition)) : 0;
  const navLabel = autopilot
    ? {
        "to-origin-gate": "Aligning to gate",
        "gate-activation": "Gate spool-up",
        wormhole: "Wormhole transit",
        "to-destination-station": "Approaching station",
        docking: "Docking"
      }[autopilot.phase]
    : "";
  return (
    <div className="hud">
      <img className="hud-overlay-art" src={manifest.hudOverlay} alt="" />
      <section className="hud-panel hud-top-left">
        <h2>GOF2 by pzy</h2>
        <p>
          {currentSystem.name} · {factionNames[currentSystem.factionId]} · Risk {Math.round(currentSystem.risk * 100)}%
        </p>
        <Bar label="Hull" value={player.hull} max={player.stats.hull} tone="green" />
        <Bar label="Shield" value={player.shield} max={player.stats.shield} tone="cyan" />
        <Bar label="Energy" value={player.energy} max={player.stats.energy} tone="orange" />
      </section>
      <section className="hud-panel hud-top-right">
        <h3>{shipLabel(player.shipId)}</h3>
        <p>Credits {player.credits.toLocaleString()} · Cargo {getOccupiedCargo(player.cargo, activeMissions)}/{player.stats.cargoCapacity} · Missiles {player.missiles}</p>
        <p>Throttle {Math.round(player.throttle * 100)}% · Speed {Math.round(Math.hypot(...player.velocity))}</p>
        {autopilot ? <p>Autopilot: {navLabel} · {navDistance}m</p> : null}
        <p>{graceRemaining > 0 ? `Enemy weapons safe for ${graceRemaining}s` : pirateCount > 0 ? `${pirateCount} pirate contact(s)` : "Local space clear"}</p>
        {contrabandAmount > 0 ? <p>Contraband law: {getContrabandLawSummary(currentSystem.id)}</p> : null}
        {scanningPatrol ? <p>Patrol scan {Math.round((scanningPatrol.scanProgress ?? 0) * 100)}%</p> : null}
        {nearestNavigation ? (
          <p>
            {nearestNavigation.kind === "station"
              ? "Nearest station"
              : nearestNavigation.kind === "planet-signal"
                ? "Scan target"
                : nearestNavigation.kind === "exploration-signal"
                  ? "Exploration signal"
                  : "Nearest nav"}: {nearestNavigation.name} {Math.round(nearestNavigation.distance)}m
          </p>
        ) : null}
      </section>
      <section className="hud-panel hud-target">
        {target ? (
          <>
            <h3>{target.name}</h3>
            <p>
              {target.elite ? "ELITE · " : ""}
              {combatAiProfileLabels[target.aiProfileId]} · {target.aiState.toUpperCase()} · {factionNames[target.factionId]} · {targetDistance}m
            </p>
            <Bar label="Target Hull" value={target.hull} max={target.maxHull} tone="red" />
            <Bar label="Target Shield" value={target.shield} max={target.maxShield} tone="cyan" />
          </>
        ) : (
          <>
            <h3>No target</h3>
            <p>Tab cycles pirates. Left mouse fires. Hold fire near asteroids to mine.</p>
          </>
        )}
      </section>
      <section className="hud-panel hud-bottom-left">
        <h3>Active Missions</h3>
        {activeMissions.length === 0 ? (
          <p>No active contracts.</p>
        ) : (
          activeMissions.slice(0, 3).map((mission) => {
            const remaining = getMissionDeadlineRemaining(mission, gameClock);
            const missionDistance = mission.salvage && !mission.salvage.recovered
              ? Math.round(distance(player.position, mission.salvage.position))
              : mission.destinationSystemId === currentSystem.id
                ? Math.round(distance(player.position, stationById[mission.destinationStationId].position))
                : undefined;
            const convoy = runtime.convoys.find((item) => item.missionId === mission.id);
            return (
              <p key={mission.id}>
                {mission.title}
                {remaining !== undefined ? ` · ${formatHudTime(remaining)}` : ""}
                {missionDistance !== undefined ? ` · ${missionDistance}m` : ""}
                {convoy ? ` · convoy ${Math.round(convoy.hull)}/${convoy.maxHull}` : ""}
              </p>
            );
          })
        )}
        {nearestMine && nearestMine.dist < equipmentEffects.miningHudRange ? (
          <p>
            {hasMiningBeam(player.equipment) ? "Mining vein" : "Detected vein"}: {commodityById[nearestMine.asteroid.resource].name} · {Math.round(nearestMine.asteroid.miningProgress * 100)}% · {Math.round(nearestMine.dist)}m
          </p>
        ) : null}
      </section>
      <section className="hud-panel hud-bottom-right">
        <h3>Comms</h3>
        <p>{runtime.message}</p>
        {autopilot?.cancelable ? <p>W/S/A/D or weapons cancel autopilot. Shift boosts. Mouse is ignored.</p> : null}
        <div className="quick-actions">
          <button onClick={() => openGalaxyMap("station-route")} disabled={!!autopilot}>Map</button>
          <button onClick={() => saveGame()}>Save</button>
          <button onClick={() => setScreen("pause")}>Pause</button>
        </div>
      </section>
      {activeScan && activeScanSignal && activeScanBand ? (
        <section className="hud-panel scan-panel">
          <div className="scan-panel-header">
            <span>Frequency Scan</span>
            <button onClick={cancelExplorationScan}>Cancel</button>
          </div>
          <h3>{activeScanSignal.title}</h3>
          <div className="frequency-track" aria-label="Signal frequency">
            <i className="frequency-band" style={{ left: `${activeScanBand[0]}%`, width: `${activeScanBand[1] - activeScanBand[0]}%` }} />
            <b style={{ left: `${activeScan.frequency}%` }} />
          </div>
          <div className="scan-controls">
            <button onClick={() => adjustExplorationScanFrequency(-5)}>-5</button>
            <button onClick={() => adjustExplorationScanFrequency(-1)}>-1</button>
            <span>{Math.round(activeScan.frequency)}</span>
            <button onClick={() => adjustExplorationScanFrequency(1)}>+1</button>
            <button onClick={() => adjustExplorationScanFrequency(5)}>+5</button>
          </div>
          <div className="scan-progress">
            <span>{activeScan.inBand ? "LOCKED" : "TUNING"}</span>
            <i style={{ width: `${Math.round(activeScan.progress * 100)}%` }} />
            <b>{Math.round(activeScan.progress * 100)}%</b>
          </div>
        </section>
      ) : null}
      <div className="cargo-ribbon">
        {Object.entries(player.cargo)
          .filter(([, amount]) => (amount ?? 0) > 0)
          .slice(0, 7)
          .map(([id, amount]) => (
            <span key={id}>
              {commodityById[id as keyof typeof commodityById]?.name ?? id}: {amount}
            </span>
          ))}
        {commodities.length ? null : null}
      </div>
    </div>
  );
}

function shipLabel(shipId: string): string {
  return {
    "sparrow-mk1": "Sparrow MK-I",
    "mule-lx": "Mule LX",
    "raptor-v": "Raptor V",
    "bastion-7": "Bastion-7",
    "horizon-ark": "Horizon Ark"
  }[shipId] ?? shipId;
}

function formatHudTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}
