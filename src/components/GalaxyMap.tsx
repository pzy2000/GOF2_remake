import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, PointerEvent, WheelEvent } from "react";
import { commodityById, equipmentName, factionNames, glassWakeProtocol, missionTemplates } from "../data/world";
import { planetById, stationById, systems, useGameStore } from "../state/gameStore";
import type { GalaxyMapMode } from "../types/game";
import { GALAXY_DISCOVERY_DISTANCE, systemDistance } from "../systems/navigation";
import { getExplorationSignalsForSystem, getVisibleStationsForSystem, isExplorationSignalDiscovered, isExplorationSignalUnlocked, isHiddenStationRevealed } from "../systems/exploration";
import { getExplorationObjectiveSummaryForSystem } from "../systems/explorationObjectives";
import { getFactionHeatLevelLabel, getFactionHeatRecord, isFactionWanted } from "../systems/factionConsequences";
import { getStoryObjectiveSummary } from "../systems/story";
import {
  formatTechLevel,
  localizeCommodityName,
  localizeFactionName,
  localizePlanetName,
  localizeStationName,
  localizeSystemName,
  formatRuntimeText,
  translateText,
  type Locale
} from "../i18n";

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
  const locale = useGameStore((state) => state.locale);
  const knownSystems = useGameStore((state) => state.knownSystems);
  const knownPlanetIds = useGameStore((state) => state.knownPlanetIds);
  const activeMissions = useGameStore((state) => state.activeMissions);
  const completedMissionIds = useGameStore((state) => state.completedMissionIds);
  const failedMissionIds = useGameStore((state) => state.failedMissionIds);
  const player = useGameStore((state) => state.player);
  const explorationState = useGameStore((state) => state.explorationState);
  const factionHeat = useGameStore((state) => state.factionHeat);
  const gameClock = useGameStore((state) => state.gameClock);
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
  const storyObjective = getStoryObjectiveSummary({
    arc: glassWakeProtocol,
    missions: missionTemplates,
    activeMissions,
    completedMissionIds,
    failedMissionIds,
    currentSystemId,
    currentStationId,
    playerCargo: player.cargo,
    getStationName: (stationId) => localizeStationName(stationId, locale, stationById[stationId]?.name),
    getSystemName: (systemId) => localizeSystemName(systemId, locale, systems.find((system) => system.id === systemId)?.name),
    getCommodityName: (commodityId) => localizeCommodityName(commodityId, locale, commodityById[commodityId]?.name)
  });
  const storyTargetSystemId = storyObjective.status !== "complete" ? storyObjective.targetSystemId : undefined;
  const storyTargetStationId = storyObjective.status !== "complete" ? storyObjective.targetStationId : undefined;
  const storyTargetSystemVisible = storyTargetSystemId && knownSystems.includes(storyTargetSystemId) ? storyTargetSystemId : undefined;
  const selectedExplorationSummary = selectedKnown
    ? getExplorationObjectiveSummaryForSystem(selectedSystem.id, explorationState, { playerUnlockedBlueprintIds: player.unlockedBlueprintIds })
    : undefined;
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
            <p className="eyebrow">{modeLabel(mode, locale)}</p>
            <h2>{translateText("Galaxy Map", locale)}</h2>
          </div>
          <div className="galaxy-controls">
            <span>{Math.round(zoom * 100)}%</span>
            <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>{translateText("Reset View", locale)}</button>
            {!embedded ? <button onClick={() => setScreen("flight")}>{translateText("Return", locale)}</button> : null}
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
                const explorationSummary = known
                  ? getExplorationObjectiveSummaryForSystem(system.id, explorationState, { playerUnlockedBlueprintIds: player.unlockedBlueprintIds })
                  : undefined;
                const heatRecord = getFactionHeatRecord(factionHeat, system.factionId);
                const heatLabel = getFactionHeatLevelLabel(heatRecord);
                const showHeatPin = known && (heatRecord.heat >= 20 || isFactionWanted(factionHeat, system.factionId, gameClock));
                return (
                  <button
                    key={system.id}
                    className={`galaxy-system ${known ? "known" : "locked"} ${current ? "current" : ""} ${selected ? "selected" : ""} ${storyTargetSystemVisible === system.id ? "story-pin" : ""} ${explorationSummary ? "exploration-pin" : ""}`}
                    style={{ left: point.x, top: point.y, "--system-tone": systemTone(index, system.risk) } as CSSProperties}
                    onClick={() => selectSystem(system.id)}
                    onDoubleClick={() => {
                      const firstKnown = system.planetIds.map((id) => planetById[id]).find((planet) => planet && knownPlanetIds.includes(planet.id));
                      if (firstKnown) executeTravel(firstKnown.stationId);
                    }}
                    aria-label={`${localizeSystemName(system.id, locale, system.name)} ${known ? translateText("known", locale) : translateText("locked", locale)}`}
                  >
                    <span className="orbit orbit-one" />
                    <span className="orbit orbit-two" />
                    <span className="star-core" />
                    <span className="moon moon-one" />
                    <span className="moon moon-two" />
                    <span className="system-name">{known ? localizeSystemName(system.id, locale, system.name) : translateText("Unknown Signal", locale)}</span>
                    {storyTargetSystemVisible === system.id ? <span className="story-map-pin">{translateText("Main Story", locale)}</span> : null}
                    {explorationSummary ? (
                      <span className="exploration-map-pin">
                        {translateText("Quiet Signals", locale)} {explorationSummary.completedCount}/{explorationSummary.totalCount}
                      </span>
                    ) : null}
                    {showHeatPin ? <span className={`law-map-pin heat-${heatLabel.toLowerCase().replace(/[^a-z]+/g, "-")}`}>{translateText(heatLabel, locale)}</span> : null}
                  </button>
                );
              })}
            </div>
          </div>
          <aside className="galaxy-details">
            <div className="galaxy-details-content">
              <p className="eyebrow">{selectedKnown ? localizeFactionName(selectedSystem.factionId, locale, factionNames[selectedSystem.factionId]) : unchartedLabel(locale)}</p>
              <h3>{selectedKnown ? localizeSystemName(selectedSystem.id, locale, selectedSystem.name) : translateText("Unknown Signal", locale)}</h3>
              <p>{selectedKnown ? translateText(selectedSystem.description, locale) : translateText("A faint jump signature sits beyond current registry data.", locale)}</p>
              <div className="galaxy-stat-row">
                <span>{translateText("Risk", locale)} {selectedKnown ? `${Math.round(selectedSystem.risk * 100)}%` : "--"}</span>
                <span>{selectedCurrent ? translateText("Current", locale) : selectedKnown ? translateText("Known", locale) : translateText("Locked", locale)}</span>
              </div>
              {storyObjective.status !== "complete" && storyTargetSystemVisible === selectedSystem.id ? (
                <div className="story-map-brief" data-testid="story-map-brief">
                  <span>{translateText("Main Story", locale)}</span>
                  <b>{translateText(storyObjective.chapterLabel, locale)} · {translateText(storyObjective.title, locale)}</b>
                  <p>{translateText(storyObjective.objectiveText, locale)}</p>
                </div>
              ) : null}
              {selectedKnown ? (
                <div className={`law-map-brief heat-${getFactionHeatLevelLabel(getFactionHeatRecord(factionHeat, selectedSystem.factionId)).toLowerCase().replace(/[^a-z]+/g, "-")}`} data-testid="law-map-brief">
                  <span>{translateText("Legal Status", locale)}</span>
                  <b>{translateText(getFactionHeatLevelLabel(getFactionHeatRecord(factionHeat, selectedSystem.factionId)), locale)}</b>
                  <p>
                    {translateText("Wanted Heat", locale)} {Math.round(getFactionHeatRecord(factionHeat, selectedSystem.factionId).heat)}
                    {getFactionHeatRecord(factionHeat, selectedSystem.factionId).fineCredits > 0
                      ? ` · ${translateText("Fine", locale)} ${getFactionHeatRecord(factionHeat, selectedSystem.factionId).fineCredits.toLocaleString()} cr`
                      : ""}
                  </p>
                </div>
              ) : null}
              {selectedExplorationSummary ? (
                <div className={`exploration-map-brief status-${selectedExplorationSummary.status}`} data-testid="exploration-map-brief">
                  <span>{translateText("Quiet Signals", locale)}</span>
                  <b>{translateText(selectedExplorationSummary.chainTitle, locale)} · {selectedExplorationSummary.completedCount}/{selectedExplorationSummary.totalCount}</b>
                  <p>{formatRuntimeText(locale, selectedExplorationSummary.objectiveText)}</p>
                  {selectedExplorationSummary.unlockedBlueprintIds.length > 0 ? (
                    <p>
                      {translateText("Chain reward", locale)}: {selectedExplorationSummary.unlockedBlueprintIds.map((id) => translateText(equipmentName(id), locale)).join(", ")}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {selectedKnown ? (
                <div className="planet-list" role="list" aria-label={`${localizeSystemName(selectedSystem.id, locale, selectedSystem.name)} ${translateText("planets", locale)}`}>
                  {selectedPlanets.map((planet) => {
                    const known = knownPlanetIds.includes(planet.id);
                    const station = stationById[planet.stationId];
                    const selected = selectedStation?.id === station.id;
                    const storyDestination = known && storyTargetStationId === station.id;
                    return (
                      <button
                        key={planet.id}
                        type="button"
                        className={`${selected ? "selected" : ""} ${storyDestination ? "story-destination" : ""}`}
                        disabled={!known}
                        onClick={() => setSelectedStationId(station.id)}
                        onDoubleClick={() => executeTravel(station.id)}
                      >
                        <span>{known ? localizePlanetName(planet.id, locale, planet.name) : translateText("Unknown Beacon", locale)}</span>
                        <small>
                          {known ? `${translateText(planet.type, locale)} · ${localizeStationName(station.id, locale, station.name)} · ${formatTechLevel(locale, station.techLevel)}` : translateText("Local scan required", locale)}
                          {storyDestination ? ` · ${translateText("Main Story", locale)}` : ""}
                        </small>
                      </button>
                    );
                  })}
                  {visibleHiddenStations.map((station) => {
                    const planet = planetById[station.planetId];
                    const known = !!planet && knownPlanetIds.includes(planet.id);
                    const selected = selectedStation?.id === station.id;
                    const storyDestination = known && storyTargetStationId === station.id;
                    return (
                      <button
                        key={station.id}
                        type="button"
                        className={`hidden-station ${selected ? "selected" : ""} ${storyDestination ? "story-destination" : ""}`}
                        disabled={!known}
                        onClick={() => setSelectedStationId(station.id)}
                        onDoubleClick={() => executeTravel(station.id)}
                      >
                        <span>{localizeStationName(station.id, locale, station.name)}</span>
                        <small>
                          {known && planet ? `${localizePlanetName(planet.id, locale, planet.name)} · ${hiddenStationFoundLabel(locale)} · ${formatTechLevel(locale, station.techLevel)}` : translateText("Signal masked", locale)}
                          {storyDestination ? ` · ${translateText("Main Story", locale)}` : ""}
                        </small>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p>{translateText("Station", locale)}: {translateText("Signal masked", locale)}</p>
              )}
              {selectedKnown ? (
                <div className="exploration-signal-list" aria-label={`${localizeSystemName(selectedSystem.id, locale, selectedSystem.name)} ${translateText("exploration signals", locale)}`}>
                  <h4>{translateText("Exploration Signals", locale)}</h4>
                  {selectedSignals.map((signal) => {
                    const complete = explorationState.completedSignalIds.includes(signal.id);
                    const unlocked = isExplorationSignalUnlocked(signal, explorationState);
                    const discovered = isExplorationSignalDiscovered(signal.id, explorationState);
                    return (
                      <article key={signal.id} className={complete ? "complete" : discovered ? "discovered" : unlocked ? "" : "locked"}>
                        <strong>{unlocked ? (discovered ? translateText(signal.title, locale) : translateText("Masked Signal", locale)) : translateText("Locked Signal", locale)}</strong>
                        <span>{complete ? translateText("Resolved", locale) : unlocked ? (discovered ? translateText("Discovered", locale) : translateText(signal.maskedTitle, locale)) : translateText("Follow the prior Quiet Signal stage", locale)}</span>
                        {complete ? <p>{translateText(signal.log, locale)}</p> : null}
                      </article>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <div className="galaxy-actions">
              <p>
                {translateText("Destination", locale)}:{" "}
                {selectedKnown && selectedStationKnown && selectedStation && selectedPlanet
                  ? `${localizePlanetName(selectedPlanet.id, locale, selectedPlanet.name)} · ${localizeStationName(selectedStation.id, locale, selectedStation.name)} · ${formatTechLevel(locale, selectedStation.techLevel)}`
                  : selectedKnown
                    ? translateText("Select a scanned planet beacon", locale)
                    : translateText("Signal masked", locale)}
              </p>
              <button className="primary" disabled={!canTravel} onClick={() => executeTravel()}>
                {travelLabel(mode, selectedSameStation, selectedKnown && selectedStationKnown, !!autopilot, locale)}
              </button>
              <p className="galaxy-help">{helpText(mode, locale)}</p>
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

function modeLabel(mode: GalaxyMapMode, locale: Locale): string {
  if (mode === "gate") return translateText("Stargate Link", locale);
  if (mode === "station-route") return translateText("Route Planning", locale);
  return translateText("Navigation Browse", locale);
}

function helpText(mode: GalaxyMapMode, locale: Locale): string {
  if (mode === "gate") return translateText("Select a scanned planet station to jump from the active Stargate.", locale);
  if (mode === "station-route") return translateText("Select a scanned planet station to launch a route through the jump engine.", locale);
  return translateText("Mouse wheel zooms. Drag empty space to pan. Unknown beacons unlock through local flight scans.", locale);
}

function travelLabel(mode: GalaxyMapMode, currentStation: boolean, known: boolean, autopilot: boolean, locale: Locale): string {
  if (autopilot) return translateText("Autopilot Active", locale);
  if (currentStation) return translateText("Current Station", locale);
  if (!known) return translateText("Locked", locale);
  if (mode === "gate") return translateText("Activate Jump", locale);
  if (mode === "station-route") return translateText("Set Route", locale);
  return translateText("Browse Only", locale);
}

function unchartedLabel(locale: Locale): string {
  if (locale === "zh-CN") return "未测绘";
  if (locale === "zh-TW") return "未測繪";
  if (locale === "ja") return "未踏査";
  if (locale === "fr") return "Non cartographié";
  return "Uncharted";
}

function hiddenStationFoundLabel(locale: Locale): string {
  if (locale === "zh-CN") return "已发现隐藏空间站";
  if (locale === "zh-TW") return "已發現隱藏太空站";
  if (locale === "ja") return "隠しステーション発見";
  if (locale === "fr") return "Station cachée trouvée";
  return "Hidden Station Found";
}

function systemTone(index: number, risk: number): string {
  const tones = ["#6ee7ff", "#ffcf7a", "#9ff28b", "#ff7c93", "#b99cff", "#f3f7ff"];
  return risk > 0.55 ? "#ff8f6e" : tones[index % tones.length];
}
