import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, PointerEvent, WheelEvent } from "react";
import { factionNames } from "../data/world";
import { planetById, stationById, systems, useGameStore } from "../state/gameStore";
import type { GalaxyMapMode } from "../types/game";
import { GALAXY_DISCOVERY_DISTANCE, systemDistance } from "../systems/navigation";
import { getExplorationSignalsForSystem, getVisibleStationsForSystem, isExplorationSignalDiscovered, isHiddenStationRevealed } from "../systems/exploration";

const MAP_WIDTH = 840;
const MAP_HEIGHT = 560;
const SYSTEM_SCALE = 140;

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
}

export function GalaxyMap({ embedded = false }: { embedded?: boolean }) {
  const currentSystemId = useGameStore((state) => state.currentSystemId);
  const currentStationId = useGameStore((state) => state.currentStationId);
  const knownSystems = useGameStore((state) => state.knownSystems);
  const knownPlanetIds = useGameStore((state) => state.knownPlanetIds);
  const explorationState = useGameStore((state) => state.explorationState);
  const galaxyMapMode = useGameStore((state) => state.galaxyMapMode);
  const startJumpToStation = useGameStore((state) => state.startJumpToStation);
  const activateStargateJumpToStation = useGameStore((state) => state.activateStargateJumpToStation);
  const autopilot = useGameStore((state) => state.autopilot);
  const setScreen = useGameStore((state) => state.setScreen);
  const mode: GalaxyMapMode = embedded ? "station-route" : galaxyMapMode;
  const [selectedSystemId, setSelectedSystemId] = useState(currentSystemId);
  const [selectedStationId, setSelectedStationId] = useState<string | undefined>(
    currentStationId ?? stationById[systems.find((system) => system.id === currentSystemId)?.stationIds[0] ?? ""]?.id
  );
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<DragState | null>(null);
  const selectedSystem = systems.find((system) => system.id === selectedSystemId) ?? systems.find((system) => system.id === currentSystemId) ?? systems[0];
  const selectedKnown = knownSystems.includes(selectedSystem.id);
  const selectedCurrent = selectedSystem.id === currentSystemId;
  const selectedPlanets = selectedSystem.planetIds.map((id) => planetById[id]).filter(Boolean);
  const selectedSignals = getExplorationSignalsForSystem(selectedSystem.id);
  const visibleHiddenStations = getVisibleStationsForSystem(selectedSystem.id, explorationState).filter((station) => station.hidden);
  const firstKnownPlanet = selectedPlanets.find((planet) => knownPlanetIds.includes(planet.id));
  const selectedStation = selectedStationId ? stationById[selectedStationId] : firstKnownPlanet ? stationById[firstKnownPlanet.stationId] : undefined;
  const selectedPlanet = selectedStation ? planetById[selectedStation.planetId] : firstKnownPlanet;
  const selectedPlanetKnown = !!selectedPlanet && knownPlanetIds.includes(selectedPlanet.id);
  const selectedStationKnown = !!selectedStation && selectedPlanetKnown && (!selectedStation.hidden || isHiddenStationRevealed(selectedStation.id, explorationState));
  const selectedSameStation = !!selectedStation && selectedStation.id === currentStationId;
  const canTravel = mode !== "browse" && selectedKnown && selectedStationKnown && !selectedSameStation && !autopilot;
  const stars = useMemo(
    () =>
      Array.from({ length: 120 }, (_, index) => ({
        id: index,
        x: seeded(index, 2) * 100,
        y: seeded(index, 7) * 100,
        size: 1 + seeded(index, 13) * 2.2,
        opacity: 0.22 + seeded(index, 19) * 0.68
      })),
    []
  );
  const routes = useMemo(
    () =>
      systems.flatMap((origin, originIndex) =>
        systems.slice(originIndex + 1).flatMap((target) => {
          if (systemDistance(origin.position, target.position) > GALAXY_DISCOVERY_DISTANCE * 1.08) return [];
          return [{ origin, target, known: knownSystems.includes(origin.id) && knownSystems.includes(target.id) }];
        })
      ),
    [knownSystems]
  );

  useEffect(() => {
    if (!selectedStation || selectedStation.systemId !== selectedSystem.id || !knownPlanetIds.includes(selectedStation.planetId) || (selectedStation.hidden && !isHiddenStationRevealed(selectedStation.id, explorationState))) {
      setSelectedStationId(firstKnownPlanet ? firstKnownPlanet.stationId : undefined);
    }
  }, [explorationState, firstKnownPlanet, knownPlanetIds, selectedStation, selectedSystem.id]);

  function selectSystem(systemId: string) {
    const system = systems.find((candidate) => candidate.id === systemId);
    setSelectedSystemId(systemId);
    const firstKnown = system?.planetIds.map((id) => planetById[id]).find((planet) => planet && knownPlanetIds.includes(planet.id));
    setSelectedStationId(firstKnown?.stationId);
  }

  function executeTravel(stationId = selectedStation?.id) {
    const station = stationId ? stationById[stationId] : undefined;
    if (
      mode === "browse" ||
      !station ||
      !knownSystems.includes(station.systemId) ||
      !knownPlanetIds.includes(station.planetId) ||
      (station.hidden && !isHiddenStationRevealed(station.id, explorationState)) ||
      station.id === currentStationId ||
      autopilot
    ) return;
    if (mode === "gate") activateStargateJumpToStation(station.id);
    if (mode === "station-route") startJumpToStation(station.id);
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const nextZoom = clamp(zoom - event.deltaY * 0.0012, 0.72, 1.85);
    setZoom(nextZoom);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement | null)?.closest(".galaxy-system")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: pan.x, originY: pan.y });
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    setPan({ x: drag.originX + event.clientX - drag.startX, y: drag.originY + event.clientY - drag.startY });
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (drag?.pointerId === event.pointerId) setDrag(null);
  }

  return (
    <section className={embedded ? "galaxy embedded" : "modal-screen galaxy"}>
      <div className="modal-panel wide galaxy-panel">
        <header className="screen-header galaxy-header">
          <div>
            <p className="eyebrow">{modeLabel(mode)}</p>
            <h2>Galaxy Map</h2>
          </div>
          <div className="galaxy-controls">
            <span>{Math.round(zoom * 100)}%</span>
            <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>Reset View</button>
            {!embedded ? <button onClick={() => setScreen("flight")}>Return</button> : null}
          </div>
        </header>
        <div className="galaxy-layout">
          <div
            className="galaxy-chart"
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <div className="galaxy-starfield">
              {stars.map((star) => (
                <i key={star.id} style={{ left: `${star.x}%`, top: `${star.y}%`, width: star.size, height: star.size, opacity: star.opacity }} />
              ))}
            </div>
            <div
              className="galaxy-chart-space"
              style={{ width: MAP_WIDTH, height: MAP_HEIGHT, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
            >
              <svg className="galaxy-routes" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} aria-hidden>
                {routes.map(({ origin, target, known }) => {
                  const start = pointForSystem(origin.position);
                  const end = pointForSystem(target.position);
                  return <line key={`${origin.id}-${target.id}`} className={known ? "known" : ""} x1={start.x} y1={start.y} x2={end.x} y2={end.y} />;
                })}
              </svg>
              {systems.map((system, index) => {
                const point = pointForSystem(system.position);
                const known = knownSystems.includes(system.id);
                const current = system.id === currentSystemId;
                const selected = system.id === selectedSystem.id;
                return (
                  <button
                    key={system.id}
                    className={`galaxy-system ${known ? "known" : "locked"} ${current ? "current" : ""} ${selected ? "selected" : ""}`}
                    style={{ left: point.x, top: point.y, "--system-tone": systemTone(index, system.risk) } as CSSProperties}
                    onClick={() => selectSystem(system.id)}
                    onDoubleClick={() => {
                      const firstKnown = system.planetIds.map((id) => planetById[id]).find((planet) => planet && knownPlanetIds.includes(planet.id));
                      if (firstKnown) executeTravel(firstKnown.stationId);
                    }}
                    aria-label={`${system.name} ${known ? "known" : "locked"}`}
                  >
                    <span className="orbit orbit-one" />
                    <span className="orbit orbit-two" />
                    <span className="star-core" />
                    <span className="moon moon-one" />
                    <span className="moon moon-two" />
                    <span className="system-name">{known ? system.name : "Unknown Signal"}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <aside className="galaxy-details">
            <div className="galaxy-details-content">
              <p className="eyebrow">{selectedKnown ? factionNames[selectedSystem.factionId] : "Uncharted"}</p>
              <h3>{selectedKnown ? selectedSystem.name : "Unknown Signal"}</h3>
              <p>{selectedKnown ? selectedSystem.description : "A faint jump signature sits beyond current registry data."}</p>
              <div className="galaxy-stat-row">
                <span>Risk {selectedKnown ? `${Math.round(selectedSystem.risk * 100)}%` : "--"}</span>
                <span>{selectedCurrent ? "Current" : selectedKnown ? "Known" : "Locked"}</span>
              </div>
              {selectedKnown ? (
                <div className="planet-list" role="list" aria-label={`${selectedSystem.name} planets`}>
                  {selectedPlanets.map((planet) => {
                    const known = knownPlanetIds.includes(planet.id);
                    const station = stationById[planet.stationId];
                    const selected = selectedStation?.id === station.id;
                    return (
                      <button
                        key={planet.id}
                        type="button"
                        className={selected ? "selected" : ""}
                        disabled={!known}
                        onClick={() => setSelectedStationId(station.id)}
                        onDoubleClick={() => executeTravel(station.id)}
                      >
                        <span>{known ? planet.name : "Unknown Beacon"}</span>
                        <small>{known ? `${planet.type} · ${station.name} · Tech Level ${station.techLevel}` : "Local scan required"}</small>
                      </button>
                    );
                  })}
                  {visibleHiddenStations.map((station) => {
                    const planet = planetById[station.planetId];
                    const known = !!planet && knownPlanetIds.includes(planet.id);
                    const selected = selectedStation?.id === station.id;
                    return (
                      <button
                        key={station.id}
                        type="button"
                        className={`hidden-station ${selected ? "selected" : ""}`}
                        disabled={!known}
                        onClick={() => setSelectedStationId(station.id)}
                        onDoubleClick={() => executeTravel(station.id)}
                      >
                        <span>{station.name}</span>
                        <small>{known && planet ? `${planet.name} · Hidden Station Found · Tech Level ${station.techLevel}` : "Signal masked"}</small>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p>Station: Signal masked</p>
              )}
              {selectedKnown ? (
                <div className="exploration-signal-list" aria-label={`${selectedSystem.name} exploration signals`}>
                  <h4>Exploration Signals</h4>
                  {selectedSignals.map((signal) => {
                    const complete = explorationState.completedSignalIds.includes(signal.id);
                    const discovered = isExplorationSignalDiscovered(signal.id, explorationState);
                    return (
                      <article key={signal.id} className={complete ? "complete" : discovered ? "discovered" : ""}>
                        <strong>{discovered ? signal.title : "Masked Signal"}</strong>
                        <span>{complete ? "Resolved" : discovered ? "Discovered" : signal.maskedTitle}</span>
                        {complete ? <p>{signal.log}</p> : null}
                      </article>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <div className="galaxy-actions">
              <p>
                Destination:{" "}
                {selectedKnown && selectedStationKnown && selectedStation && selectedPlanet
                  ? `${selectedPlanet.name} · ${selectedStation.name} · Tech Level ${selectedStation.techLevel}`
                  : selectedKnown
                    ? "Select a scanned planet beacon"
                    : "Signal masked"}
              </p>
              <button className="primary" disabled={!canTravel} onClick={() => executeTravel()}>
                {travelLabel(mode, selectedSameStation, selectedKnown && selectedStationKnown, !!autopilot)}
              </button>
              <p className="galaxy-help">{helpText(mode)}</p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function pointForSystem(position: [number, number]) {
  return {
    x: MAP_WIDTH / 2 + position[0] * SYSTEM_SCALE,
    y: MAP_HEIGHT / 2 - position[1] * SYSTEM_SCALE
  };
}

function seeded(index: number, salt: number): number {
  const raw = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return raw - Math.floor(raw);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function modeLabel(mode: GalaxyMapMode): string {
  if (mode === "gate") return "Stargate Link";
  if (mode === "station-route") return "Route Planning";
  return "Navigation Browse";
}

function helpText(mode: GalaxyMapMode): string {
  if (mode === "gate") return "Select a scanned planet station to jump from the active Stargate.";
  if (mode === "station-route") return "Select a scanned planet station to launch a route through the jump engine.";
  return "Mouse wheel zooms. Drag empty space to pan. Unknown beacons unlock through local flight scans.";
}

function travelLabel(mode: GalaxyMapMode, currentStation: boolean, known: boolean, autopilot: boolean): string {
  if (autopilot) return "Autopilot Active";
  if (currentStation) return "Current Station";
  if (!known) return "Locked";
  if (mode === "gate") return "Activate Jump";
  if (mode === "station-route") return "Set Route";
  return "Browse Only";
}

function systemTone(index: number, risk: number): string {
  const tones = ["#6ee7ff", "#ffcf7a", "#9ff28b", "#ff7c93", "#b99cff", "#f3f7ff"];
  return risk > 0.55 ? "#ff8f6e" : tones[index % tones.length];
}
