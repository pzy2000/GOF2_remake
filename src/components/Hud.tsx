import { commodities, stationById, systemById, useGameStore } from "../state/gameStore";
import { commodityById, glassWakeProtocol, missionTemplates } from "../data/world";
import type { CommodityId } from "../types/game";
import { getOccupiedCargo } from "../systems/economy";
import { getEquipmentEffects, hasMiningBeam } from "../systems/equipment";
import { getMissionDeadlineRemaining } from "../systems/missions";
import { isEconomyDispatchMissionId, isMarketSmugglingMissionId } from "../systems/marketMissions";
import { distance } from "../systems/math";
import { getNearestNavigationTarget } from "../systems/navigation";
import type { NavigationTarget } from "../systems/navigation";
import { combatAiProfileLabels, getContrabandLawSummary } from "../systems/combatAi";
import { combatLoadoutLabels } from "../systems/combatDoctrine";
import { explorationSignalById, getEffectiveSignalScanBand } from "../systems/exploration";
import { getExplorationObjectiveSummaryForSystem } from "../systems/explorationObjectives";
import { getFactionHeatLevelLabel, getFactionHeatRecord } from "../systems/factionConsequences";
import { getOnboardingView } from "../systems/onboarding";
import { getStoryObjectiveSummary } from "../systems/story";
import {
  formatCargoLabel,
  formatCommodityAmount,
  formatCredits,
  formatDistance,
  formatGameDuration,
  formatNumber,
  formatRuntimeText,
  localizeCombatAiProfile,
  localizeCombatLoadout,
  localizeCommodityName,
  localizeFactionName,
  localizeFlightState,
  localizeGenericName,
  localizeShipName,
  localizeStationName,
  localizeSystemName,
  translateDisplayName,
  translateText,
  type Locale
} from "../i18n";

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
  const locale = useGameStore((state) => state.locale);
  const runtime = useGameStore((state) => state.runtime);
  const economyService = useGameStore((state) => state.economyService);
  const autopilot = useGameStore((state) => state.autopilot);
  const currentSystem = useGameStore((state) => systemById[state.currentSystemId]);
  const target = useGameStore((state) => state.runtime.enemies.find((ship) => ship.id === state.targetId && ship.hull > 0 && ship.deathTimer === undefined));
  const manifest = useGameStore((state) => state.assetManifest);
  const activeMissions = useGameStore((state) => state.activeMissions);
  const completedMissionIds = useGameStore((state) => state.completedMissionIds);
  const failedMissionIds = useGameStore((state) => state.failedMissionIds);
  const gameClock = useGameStore((state) => state.gameClock);
  const currentStationId = useGameStore((state) => state.currentStationId);
  const saveGame = useGameStore((state) => state.saveGame);
  const setScreen = useGameStore((state) => state.setScreen);
  const openGalaxyMap = useGameStore((state) => state.openGalaxyMap);
  const knownPlanetIds = useGameStore((state) => state.knownPlanetIds);
  const explorationState = useGameStore((state) => state.explorationState);
  const factionHeat = useGameStore((state) => state.factionHeat);
  const onboardingState = useGameStore((state) => state.onboardingState);
  const setOnboardingCollapsed = useGameStore((state) => state.setOnboardingCollapsed);
  const skipOnboarding = useGameStore((state) => state.skipOnboarding);
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
  const bossContact = runtime.enemies.find((ship) => ship.boss && ship.hull > 0 && ship.deathTimer === undefined);
  const supportCount = runtime.enemies.filter((ship) => ship.supportWing && ship.hull > 0 && ship.deathTimer === undefined).length;
  const contrabandAmount = player.cargo["illegal-contraband"] ?? 0;
  const scanningPatrol = runtime.enemies.find((ship) => ship.role === "patrol" && ship.aiState === "scan" && (ship.scanProgress ?? 0) > 0);
  const localHeatRecord = getFactionHeatRecord(factionHeat, currentSystem.factionId);
  const localHeatLabel = getFactionHeatLevelLabel(localHeatRecord);
  const wantedRemaining = Math.max(0, (localHeatRecord.wantedUntil ?? 0) - gameClock);
  const storyObjective = getStoryObjectiveSummary({
    arc: glassWakeProtocol,
    missions: missionTemplates,
    activeMissions,
    completedMissionIds,
    failedMissionIds,
    currentSystemId: currentSystem.id,
    currentStationId,
    playerPosition: player.position,
    playerCargo: player.cargo,
    getStationName: (stationId) => localizeStationName(stationId, locale, stationById[stationId]?.name),
    getSystemName: (systemId) => localizeSystemName(systemId, locale, systemById[systemId]?.name),
    getCommodityName: (commodityId) => localizeCommodityName(commodityId, locale, commodityById[commodityId]?.name)
  });
  const explorationObjective = getExplorationObjectiveSummaryForSystem(currentSystem.id, explorationState, {
    playerPosition: player.position,
    playerEquipment: player.equipment,
    activeScanSignalId: activeScan?.signalId,
    playerUnlockedBlueprintIds: player.unlockedBlueprintIds
  });
  const onboardingView = getOnboardingView({
    onboardingState,
    screen: "flight",
    currentSystemId: currentSystem.id,
    currentStationId,
    player,
    activeMissions,
    completedMissionIds,
    autopilot,
    gameClock
  });
  const graceRemaining = Math.max(0, Math.ceil(runtime.graceUntil - runtime.clock));
  const nearestMine = runtime.asteroids
    .filter((asteroid) => asteroid.amount > 0)
    .map((asteroid) => ({ asteroid, dist: distance(player.position, asteroid.position) }))
    .sort((a, b) => a.dist - b.dist)[0];
  const targetDistance = target ? Math.round(distance(player.position, target.position)) : 0;
  const navDistance = autopilot ? Math.round(distance(player.position, autopilot.targetPosition)) : 0;
  const navLabel = autopilot ? autopilotPhaseLabel(autopilot.phase, locale) : "";
  const occupiedCargo = getOccupiedCargo(player.cargo, activeMissions);
  const activeDispatch = activeMissions.find((mission) => isEconomyDispatchMissionId(mission.id));
  const activeDispatchCargo = activeDispatch
    ? (Object.entries(activeDispatch.cargoRequired ?? {}) as [CommodityId, number | undefined][]).find(([, amount]) => (amount ?? 0) > 0)
    : undefined;
  return (
    <div className="hud">
      <img className="hud-overlay-art" src={manifest.hudOverlay} alt="" />
      <section className="hud-panel hud-top-left">
        <h2>GOF2 by pzy</h2>
        <p>
          {localizeSystemName(currentSystem.id, locale, currentSystem.name)} · {localizeFactionName(currentSystem.factionId, locale)} · {translateText("Risk", locale)} {formatNumber(locale, Math.round(currentSystem.risk * 100))}%
        </p>
        <Bar label={translateText("Hull", locale)} value={player.hull} max={player.stats.hull} tone="green" />
        <Bar label={translateText("Shield", locale)} value={player.shield} max={player.stats.shield} tone="cyan" />
        <Bar label={translateText("Energy", locale)} value={player.energy} max={player.stats.energy} tone="orange" />
      </section>
      <section className="hud-panel hud-top-right">
        <h3>{localizeShipName(player.shipId, locale)}</h3>
        <p>{formatCredits(locale, player.credits)} · {formatCargoLabel(locale, occupiedCargo, player.stats.cargoCapacity)} · {translateText("Missiles", locale)} {formatNumber(locale, player.missiles)}</p>
        <p>{translateText("Throttle", locale)} {formatNumber(locale, Math.round(player.throttle * 100))}% · {translateText("Speed", locale)} {formatNumber(locale, Math.round(Math.hypot(...player.velocity)))}</p>
        {autopilot ? <p>{translateText("Autopilot", locale)}: {navLabel} · {formatDistance(locale, navDistance)}</p> : null}
        <p>{graceRemaining > 0 ? enemySafeLabel(graceRemaining, locale) : pirateCount > 0 ? pirateContactsLabel(pirateCount, locale) : translateText("Local space clear", locale)}</p>
        {bossContact ? <p>{bossContactLabel(locale)}: {translateDisplayName(bossContact.name, locale)}</p> : null}
        {supportCount > 0 ? <p>{patrolSupportLabel(locale)}: {formatNumber(locale, supportCount)}</p> : null}
        <div className={`legal-status heat-${localHeatLabel.toLowerCase().replace(/[^a-z]+/g, "-")}`} data-testid="legal-status">
          <span>{translateText("Legal Status", locale)}</span>
          <b>{translateText(localHeatLabel, locale)} · {localizeFactionName(currentSystem.factionId, locale)}</b>
          <p>
            {translateText("Wanted Heat", locale)} {formatNumber(locale, Math.round(localHeatRecord.heat))}
            {wantedRemaining > 0 ? ` · ${translateText("Wanted", locale)} ${formatHudTime(wantedRemaining, locale)}` : ""}
            {localHeatRecord.fineCredits > 0 ? ` · ${translateText("Fine", locale)} ${formatCredits(locale, localHeatRecord.fineCredits)}` : ""}
          </p>
        </div>
        {contrabandAmount > 0 ? <p>{contrabandLawLabel(locale)}: {translateText(getContrabandLawSummary(currentSystem.id), locale)}</p> : null}
        {scanningPatrol ? <p>{patrolScanLabel(locale)} {formatNumber(locale, Math.round((scanningPatrol.scanProgress ?? 0) * 100))}%</p> : null}
        {storyObjective.status !== "complete" ? (
          <div className={`story-tracker focus-${storyObjective.focus}`} data-testid="story-tracker">
            <span>{translateText("Main Story", locale)}</span>
            <b>{translateText(storyObjective.chapterLabel, locale)} · {translateText(storyObjective.title, locale)}</b>
            <p>
              {translateText(storyObjective.objectiveText, locale)}
              {storyObjective.distanceMeters !== undefined ? ` · ${formatDistance(locale, storyObjective.distanceMeters)}` : ""}
            </p>
          </div>
        ) : null}
        {onboardingView.visible && onboardingView.activeStep ? (
          <div className={`onboarding-guide ${onboardingView.collapsed ? "collapsed" : ""}`} data-testid="onboarding-guide">
            <div className="onboarding-guide-header">
              <span>{translateText("First Flight", locale)} {onboardingView.completedCount}/{onboardingView.totalCount}</span>
              <div>
                <button onClick={() => setOnboardingCollapsed(!onboardingView.collapsed)}>
                  {translateText(onboardingView.collapsed ? "Expand" : "Collapse", locale)}
                </button>
                <button onClick={skipOnboarding}>{translateText("Skip", locale)}</button>
              </div>
            </div>
            <b>{translateText(onboardingView.activeStep.title, locale)}</b>
            {!onboardingView.collapsed ? (
              <>
                <p>{translateText(onboardingView.activeStep.objective, locale)}</p>
                <p>{translateText("Reward", locale)} {formatCredits(locale, onboardingView.activeStep.rewardCredits, true)}</p>
              </>
            ) : null}
          </div>
        ) : null}
        {explorationObjective && explorationObjective.status !== "complete" ? (
          <div className={`exploration-tracker status-${explorationObjective.status}`} data-testid="exploration-tracker">
            <span>{translateText("Quiet Signals", locale)}</span>
            <b>{translateText(explorationObjective.chainTitle, locale)} · {explorationObjective.completedCount}/{explorationObjective.totalCount}</b>
            <p>
              {formatRuntimeText(locale, explorationObjective.objectiveText)}
              {explorationObjective.distanceMeters !== undefined ? ` · ${formatDistance(locale, explorationObjective.distanceMeters)}` : ""}
            </p>
          </div>
        ) : null}
        {nearestNavigation ? (
          <p>
            {nearestNavigation.kind === "station"
              ? nearestStationLabel(locale)
              : nearestNavigation.kind === "planet-signal"
                ? scanTargetLabel(locale)
                : nearestNavigation.kind === "exploration-signal"
                  ? explorationSignalLabel(locale)
                  : nearestNavLabel(locale)}: {navigationTargetName(nearestNavigation, locale)} {formatDistance(locale, nearestNavigation.distance)}
            {nearestNavigation.kind === "exploration-signal" && nearestNavigation.inRange && nearestNavigation.equipmentReady === false
              ? ` · ${translateText("Requires", locale)} ${nearestNavigation.requiredEquipmentLabel ?? translateText("upgraded scanner", locale)}`
              : ""}
          </p>
        ) : null}
      </section>
      <section className="hud-panel hud-target">
        {target ? (
          <>
            <h3>{translateDisplayName(target.name, locale)}</h3>
            <p>
              {target.boss ? `${localizeGenericName("BOSS", locale)} · ` : target.elite ? `${localizeGenericName("ELITE", locale)} · ` : ""}
              {localizeCombatAiProfile(target.aiProfileId, locale, combatAiProfileLabels[target.aiProfileId])} · {localizeFlightState(target.aiState, locale)} · {localizeFactionName(target.factionId, locale)} · {formatDistance(locale, targetDistance)}
            </p>
            {target.loadoutId ? <p>{localizeCombatLoadout(target.loadoutId, locale, combatLoadoutLabels[target.loadoutId])}</p> : null}
            <Bar label={targetHullLabel(locale)} value={target.hull} max={target.maxHull} tone="red" />
            <Bar label={targetShieldLabel(locale)} value={target.shield} max={target.maxShield} tone="cyan" />
          </>
        ) : (
          <>
            <h3>{translateText("No target", locale)}</h3>
            <p>{translateText("Tab cycles pirates. Left mouse fires. Hold fire near asteroids to mine.", locale)}</p>
          </>
        )}
      </section>
      <section className="hud-panel hud-bottom-left">
        <h3>{translateText("Active Missions", locale)}</h3>
        {activeMissions.length === 0 ? (
          <p>{translateText("No active contracts.", locale)}</p>
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
                {translateText(mission.title, locale)}
                {remaining !== undefined ? ` · ${formatHudTime(remaining, locale)}` : ""}
                {missionDistance !== undefined ? ` · ${formatDistance(locale, missionDistance)}` : ""}
                {convoy ? ` · ${convoyLabel(locale)} ${(convoy.status ?? "en-route").toUpperCase()} ${Math.round(convoy.hull)}/${convoy.maxHull}` : ""}
              </p>
            );
          })
        )}
        {nearestMine && nearestMine.dist < equipmentEffects.miningHudRange ? (
          <p>
            {hasMiningBeam(player.equipment) ? translateText("Mining vein", locale) : translateText("Detected vein", locale)}: {localizeCommodityName(nearestMine.asteroid.resource, locale, commodityById[nearestMine.asteroid.resource].name)} · {formatNumber(locale, Math.round(nearestMine.asteroid.miningProgress * 100))}% · {formatDistance(locale, nearestMine.dist)}
          </p>
        ) : null}
      </section>
      <section className="hud-panel hud-bottom-right">
        <h3>{translateText("Comms", locale)}</h3>
        <p>{formatRuntimeText(locale, runtime.message)}</p>
        <p>
          {economyLabel(locale)} {economyService.status === "connected" ? economyLiveLabel(economyService.snapshotId ?? 0, locale) : economyFallbackLabel(economyService.status, locale)}
        </p>
        {activeDispatch ? (
          <p>
            {translateText("Dispatch", locale)} {translateText(isMarketSmugglingMissionId(activeDispatch.id) ? "Smuggling" : "Supply", locale)}:{" "}
            {activeDispatchCargo
              ? `${activeDispatchCargo[1] ?? 0} ${localizeCommodityName(activeDispatchCargo[0], locale, commodityById[activeDispatchCargo[0]].name)} -> ${localizeStationName(activeDispatch.destinationStationId, locale, stationById[activeDispatch.destinationStationId]?.name)}`
              : localizeStationName(activeDispatch.destinationStationId, locale, stationById[activeDispatch.destinationStationId]?.name)}
          </p>
        ) : null}
        {autopilot?.cancelable ? <p>{autopilotCancelLabel(locale)}</p> : null}
        <div className="quick-actions">
          <button onClick={() => openGalaxyMap("station-route")} disabled={!!autopilot}>{translateText("Map", locale)}</button>
          <button onClick={() => saveGame()}>{translateText("Save", locale)}</button>
          <button onClick={() => setScreen("pause")}>{translateText("Pause", locale)}</button>
        </div>
      </section>
      {activeScan && activeScanSignal && activeScanBand ? (
        <section className="hud-panel scan-panel">
          <div className="scan-panel-header">
            <span>{translateText("Frequency Scan", locale)}</span>
            <button onClick={cancelExplorationScan} aria-keyshortcuts="Escape" title={translateText("Cancel scan (Esc)", locale)}>{translateText("Cancel", locale)}</button>
          </div>
          <h3>{translateText(activeScanSignal.title, locale)}</h3>
          <div className="frequency-track" aria-label={translateText("Signal frequency", locale)}>
            <i className="frequency-band" style={{ left: `${activeScanBand[0]}%`, width: `${activeScanBand[1] - activeScanBand[0]}%` }} />
            <b style={{ left: `${activeScan.frequency}%` }} />
          </div>
          <div className="scan-controls">
            <button onClick={() => adjustExplorationScanFrequency(-5)} aria-keyshortcuts="Shift+ArrowLeft" title="Decrease frequency by 5 (Shift+ArrowLeft)">-5</button>
            <button onClick={() => adjustExplorationScanFrequency(-1)} aria-keyshortcuts="ArrowLeft" title="Decrease frequency by 1 (ArrowLeft)">-1</button>
            <span>{Math.round(activeScan.frequency)}</span>
            <button onClick={() => adjustExplorationScanFrequency(1)} aria-keyshortcuts="ArrowRight" title="Increase frequency by 1 (ArrowRight)">+1</button>
            <button onClick={() => adjustExplorationScanFrequency(5)} aria-keyshortcuts="Shift+ArrowRight" title="Increase frequency by 5 (Shift+ArrowRight)">+5</button>
          </div>
          <div className="scan-progress">
            <span>{activeScan.inBand ? translateText("LOCKED", locale) : translateText("TUNING", locale)}</span>
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
              {formatCommodityAmount(locale, id, amount ?? 0, commodityById[id as keyof typeof commodityById]?.name)}
            </span>
          ))}
        {commodities.length ? null : null}
      </div>
    </div>
  );
}

function formatHudTime(seconds: number, locale: Locale): string {
  return formatGameDuration(locale, seconds);
}

function autopilotPhaseLabel(phase: string, locale: Locale): string {
  const labels: Record<string, Partial<Record<Locale, string>>> = {
    "to-origin-gate": { en: "Aligning to gate", "zh-CN": "对准星门", "zh-TW": "對準星門", ja: "ゲートへ整列", fr: "Alignement portail" },
    "gate-activation": { en: "Gate spool-up", "zh-CN": "星门预热", "zh-TW": "星門預熱", ja: "ゲート起動中", fr: "Charge du portail" },
    wormhole: { en: "Wormhole transit", "zh-CN": "虫洞航行", "zh-TW": "蟲洞航行", ja: "ワームホール通過", fr: "Transit vortex" },
    "to-destination-station": { en: "Approaching station", "zh-CN": "接近空间站", "zh-TW": "接近太空站", ja: "ステーション接近", fr: "Approche station" },
    docking: { en: "Docking", "zh-CN": "停靠中", "zh-TW": "停靠中", ja: "ドッキング中", fr: "Amarrage" }
  };
  return labels[phase]?.[locale] ?? labels[phase]?.en ?? phase;
}

function enemySafeLabel(seconds: number, locale: Locale): string {
  if (locale === "zh-CN") return `敌方武器保险剩余 ${seconds}秒`;
  if (locale === "zh-TW") return `敵方武器保險剩餘 ${seconds}秒`;
  if (locale === "ja") return `敵武器安全解除まで ${seconds}秒`;
  if (locale === "fr") return `Armes ennemies verrouillées encore ${seconds} s`;
  return `Enemy weapons safe for ${seconds}s`;
}

function pirateContactsLabel(count: number, locale: Locale): string {
  if (locale === "zh-CN") return `${count} 个海盗接触`;
  if (locale === "zh-TW") return `${count} 個海盜接觸`;
  if (locale === "ja") return `海賊接触 ${count}`;
  if (locale === "fr") return `${count} contact(s) pirate(s)`;
  return `${count} pirate contact(s)`;
}

function bossContactLabel(locale: Locale): string {
  if (locale === "zh-CN") return "首领接触";
  if (locale === "zh-TW") return "首領接觸";
  if (locale === "ja") return "ボス接触";
  if (locale === "fr") return "Contact chef";
  return "Boss contact";
}

function patrolSupportLabel(locale: Locale): string {
  if (locale === "zh-CN") return "巡逻支援已启动";
  if (locale === "zh-TW") return "巡邏支援已啟動";
  if (locale === "ja") return "巡回支援稼働中";
  if (locale === "fr") return "Soutien de patrouille actif";
  return "Patrol support active";
}

function contrabandLawLabel(locale: Locale): string {
  if (locale === "zh-CN") return "违禁品法律";
  if (locale === "zh-TW") return "違禁品法律";
  if (locale === "ja") return "禁制品法";
  if (locale === "fr") return "Loi contrebande";
  return "Contraband law";
}

function patrolScanLabel(locale: Locale): string {
  if (locale === "zh-CN") return "巡逻扫描";
  if (locale === "zh-TW") return "巡邏掃描";
  if (locale === "ja") return "巡回スキャン";
  if (locale === "fr") return "Scan patrouille";
  return "Patrol scan";
}

function nearestStationLabel(locale: Locale): string {
  if (locale === "zh-CN") return "最近空间站";
  if (locale === "zh-TW") return "最近太空站";
  if (locale === "ja") return "最寄りステーション";
  if (locale === "fr") return "Station la plus proche";
  return "Nearest station";
}

function scanTargetLabel(locale: Locale): string {
  if (locale === "zh-CN") return "扫描目标";
  if (locale === "zh-TW") return "掃描目標";
  if (locale === "ja") return "スキャン目標";
  if (locale === "fr") return "Cible de scan";
  return "Scan target";
}

function explorationSignalLabel(locale: Locale): string {
  if (locale === "zh-CN") return "探索信号";
  if (locale === "zh-TW") return "探索訊號";
  if (locale === "ja") return "探索信号";
  if (locale === "fr") return "Signal d'exploration";
  return "Exploration signal";
}

function nearestNavLabel(locale: Locale): string {
  if (locale === "zh-CN") return "最近导航点";
  if (locale === "zh-TW") return "最近導航點";
  if (locale === "ja") return "最寄りナビ";
  if (locale === "fr") return "Navigation proche";
  return "Nearest nav";
}

function navigationTargetName(target: NavigationTarget, locale: Locale): string {
  if (target.kind === "station") return localizeStationName(target.station.id, locale, target.station.name);
  if (target.kind === "planet-signal") return translateText("Unknown Beacon", locale);
  if (target.kind === "exploration-signal") return translateText(target.name, locale);
  return translateText(target.name, locale);
}

function targetHullLabel(locale: Locale): string {
  if (locale === "zh-CN") return "目标船体";
  if (locale === "zh-TW") return "目標船體";
  if (locale === "ja") return "目標船体";
  if (locale === "fr") return "Coque cible";
  return "Target Hull";
}

function targetShieldLabel(locale: Locale): string {
  if (locale === "zh-CN") return "目标护盾";
  if (locale === "zh-TW") return "目標護盾";
  if (locale === "ja") return "目標シールド";
  if (locale === "fr") return "Bouclier cible";
  return "Target Shield";
}

function convoyLabel(locale: Locale): string {
  if (locale === "zh-CN") return "船队";
  if (locale === "zh-TW") return "船隊";
  if (locale === "ja") return "船団";
  if (locale === "fr") return "convoi";
  return "convoy";
}

function economyLabel(locale: Locale): string {
  if (locale === "zh-CN") return "经济";
  if (locale === "zh-TW") return "經濟";
  if (locale === "ja") return "経済";
  if (locale === "fr") return "Économie";
  return "Economy";
}

function economyLiveLabel(snapshotId: number, locale: Locale): string {
  if (locale === "zh-CN") return `实时 #${snapshotId}`;
  if (locale === "zh-TW") return `即時 #${snapshotId}`;
  if (locale === "ja") return `ライブ #${snapshotId}`;
  if (locale === "fr") return `direct #${snapshotId}`;
  return `live #${snapshotId}`;
}

function economyFallbackLabel(status: string, locale: Locale): string {
  if (locale === "zh-CN") return `${translateText(status, locale)} · 使用本地模拟`;
  if (locale === "zh-TW") return `${translateText(status, locale)} · 使用本地模擬`;
  if (locale === "ja") return `${translateText(status, locale)} · ローカル代替`;
  if (locale === "fr") return `${translateText(status, locale)} · simulation locale`;
  return `${status} · local fallback`;
}

function autopilotCancelLabel(locale: Locale): string {
  if (locale === "zh-CN") return "W/S/A/D 或武器会取消自动导航。Shift 加速。鼠标输入已忽略。";
  if (locale === "zh-TW") return "W/S/A/D 或武器會取消自動導航。Shift 加速。滑鼠輸入已忽略。";
  if (locale === "ja") return "W/S/A/D または武器でオートパイロット解除。Shift はブースト。マウス入力は無視されます。";
  if (locale === "fr") return "W/S/A/D ou les armes annulent le pilote auto. Shift accélère. La souris est ignorée.";
  return "W/S/A/D or weapons cancel autopilot. Shift boosts. Mouse is ignored.";
}
