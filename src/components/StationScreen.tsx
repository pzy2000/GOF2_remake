import { useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, MouseEvent as ReactMouseEvent, MutableRefObject, ReactNode } from "react";
import { commodities, shipById, ships, stationById, systemById, useGameStore } from "../state/gameStore";
import {
  blueprintByEquipmentId,
  blueprintDefinitions,
  blueprintPathLabels,
  commodityById,
  equipmentById,
  equipmentList,
  equipmentName,
  explorationSignals,
  factionNames,
  glassWakeProtocol,
  missionTemplates
} from "../data/world";
import { canCompleteMission, getAvailableMissionsForSystem, getMissionDeadlineRemaining, getStoryEncounterRemainingTargets } from "../systems/missions";
import {
  canBuyCommodityAtStation,
  canBuyEquipmentAtStation,
  getCommodityPrice,
  getEquipmentPrice,
  getMarketEntry,
  getMarketTag,
  getOccupiedCargo,
  isCommodityVisibleInMarket
} from "../systems/economy";
import {
  getAvailableEconomyDispatchMissions,
  getAvailableMarketGapMissions,
  getDispatchMissionSourceStationId,
  getMarketSupplyBrief,
  isEconomyDispatchMissionId,
  isMarketGapMissionId,
  isMarketSmugglingMissionId
} from "../systems/marketMissions";
import { getEconomyEventSystemName, getEconomyFlightRouteSummary } from "../systems/economyRoutes";
import { getFactionHeatLevelLabel, getFactionHeatRecord } from "../systems/factionConsequences";
import { reputationLabel } from "../systems/reputation";
import { GalaxyMap } from "./GalaxyMap";
import { AtlasIcon } from "./AtlasIcon";
import { SaveSlotsPanel } from "./SaveSlotsPanel";
import { getCommodityIcon, getEquipmentIcon, getFactionIcon } from "../data/iconAtlas";
import { getStoryObjectiveSummary, getStoryProgress, storyStatusLabel } from "../systems/story";
import { CLEAN_CARRIER_MISSION_ID, getOnboardingView, HELION_START_STATION_ID, MIRR_LATTICE_STATION_ID } from "../systems/onboarding";
import { getDialogueLogEntries } from "../systems/dialogue";
import { getExplorationChainSummaries, getExplorationObjectiveSummaryForSystem, explorationRewardStationNames } from "../systems/explorationObjectives";
import {
  canInstallEquipment,
  canUnlockBlueprint,
  getEquipmentComparison,
  getEquipmentSlotUsage,
  getShipSlotCapacity,
  hasCraftMaterials,
  isBlueprintUnlocked,
  isBlueprintVisibleToPlayer
} from "../systems/equipment";
import { getContrabandLawSummary } from "../systems/combatAi";
import { hasActiveCivilianDistress } from "../state/domains/combatRuntime";
import type { AssetManifest, BlueprintPath, CargoHold, CommodityId, EquipmentId, EquipmentSlotType, FactionId, MissionDefinition, StationTab } from "../types/game";
import {
  formatCargoContents,
  formatCargoLabel,
  formatCredits,
  formatDateTime,
  formatDistance,
  formatNumber,
  formatRuntimeText,
  formatTechLevel,
  localizeCommodityName,
  localizeEquipmentName,
  localizeFactionName,
  localizeMarketTag,
  localizeMissionType,
  localizeShipName,
  localizeStationArchetype,
  localizeStationName,
  localizeSystemName,
  translateDisplayName,
  translateText,
  type Locale
} from "../i18n";

const tabs: StationTab[] = ["Market", "Economy", "Hangar", "Shipyard", "Mission Board", "Captain's Log", "Blueprint Workshop", "Lounge", "Galaxy Map"];
const craftable: EquipmentId[] = equipmentList.filter((item) => !!item.craftCost).map((item) => item.id);
const equipmentSlotOrder: EquipmentSlotType[] = ["primary", "secondary", "utility", "defense", "engineering"];
const equipmentSlotLabels: Record<EquipmentSlotType, string> = {
  primary: "Primary",
  secondary: "Secondary",
  utility: "Utility",
  defense: "Defense",
  engineering: "Engineering"
};
const blueprintPathOrder: BlueprintPath[] = ["combat", "defense", "exploration", "engineering"];
const EQUIPMENT_POPOVER_HOVER_DELAY_MS = 2000;

type EquipmentPopoverMode = "preview" | "pinned";

interface EquipmentPopoverState {
  id: EquipmentId;
  status: string;
  mode: EquipmentPopoverMode;
  rect: DOMRect;
}

function useEquipmentPopover() {
  const [popover, setPopover] = useState<EquipmentPopoverState | null>(null);
  const popoverRef = useRef<HTMLElement | null>(null);
  const hoverTimerRef = useRef<number | null>(null);

  function clearHoverTimer() {
    if (hoverTimerRef.current === null) return;
    window.clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = null;
  }

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        clearHoverTimer();
        setPopover(null);
      }
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Element | null;
      if (!target || !popover || popover.mode !== "pinned") return;
      if (popoverRef.current?.contains(target) || target.closest(".equipment-trigger")) return;
      setPopover(null);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [popover]);

  useEffect(() => clearHoverTimer, []);

  function open(id: EquipmentId, status: string, mode: EquipmentPopoverMode, element: HTMLElement) {
    setPopover({ id, status, mode, rect: element.getBoundingClientRect() });
  }

  function schedulePreview(id: EquipmentId, status: string, element: HTMLElement) {
    clearHoverTimer();
    if (popover?.mode === "pinned") return;
    hoverTimerRef.current = window.setTimeout(() => {
      hoverTimerRef.current = null;
      if (!element.isConnected) return;
      setPopover((current) =>
        current?.mode === "pinned"
          ? current
          : {
              id,
              status,
              mode: "preview",
              rect: element.getBoundingClientRect()
            }
      );
    }, EQUIPMENT_POPOVER_HOVER_DELAY_MS);
  }

  function clearPreview() {
    clearHoverTimer();
    setPopover((current) => (current?.mode === "preview" ? null : current));
  }

  function togglePinned(id: EquipmentId, status: string, element: HTMLElement) {
    clearHoverTimer();
    setPopover((current) =>
      current?.id === id && current.mode === "pinned" ? null : { id, status, mode: "pinned", rect: element.getBoundingClientRect() }
    );
  }

  function getTriggerProps(id: EquipmentId, status: string) {
    return {
      onMouseEnter: (event: ReactMouseEvent<HTMLElement>) => schedulePreview(id, status, event.currentTarget),
      onMouseLeave: clearPreview,
      onBlur: clearPreview,
      onClick: (event: ReactMouseEvent<HTMLElement>) => togglePinned(id, status, event.currentTarget),
      onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          togglePinned(id, status, event.currentTarget);
        }
      },
      "aria-describedby": popover?.id === id ? "equipment-popover" : undefined
    };
  }

  return { popover, popoverRef, getTriggerProps, close: () => setPopover(null) };
}

function getPopoverStyle(rect: DOMRect): CSSProperties {
  if (window.innerWidth <= 720) return {};
  const width = 360;
  const gap = 14;
  const edge = 12;
  const preferredLeft = rect.right + gap;
  const fallbackLeft = rect.left - width - gap;
  const left = preferredLeft + width <= window.innerWidth - edge ? preferredLeft : Math.max(edge, fallbackLeft);
  const top = Math.min(Math.max(edge, rect.top - 18), Math.max(edge, window.innerHeight - 430));
  return { left, top };
}

function EquipmentPopover({
  popover,
  manifest,
  popoverRef,
  onClose
}: {
  popover: EquipmentPopoverState | null;
  manifest: AssetManifest;
  popoverRef: MutableRefObject<HTMLElement | null>;
  onClose: () => void;
}) {
  const player = useGameStore((state) => state.player);
  const locale = useGameStore((state) => state.locale);
  if (!popover) return null;
  const equipment = equipmentById[popover.id];
  const slotUsage = getEquipmentSlotUsage(player.equipment);
  const slotCapacity = getShipSlotCapacity(player.stats);
  const sameSlotInstalled = player.equipment.filter((id) => equipmentById[id].slotType === equipment.slotType && id !== equipment.id);
  const canFit = slotUsage[equipment.slotType] + (equipment.slotSize ?? 1) <= slotCapacity[equipment.slotType] || player.equipment.includes(equipment.id);
  const comparison = getEquipmentComparison(player, equipment.id);
  const comparisonLines = [...comparison.statLines, ...comparison.weaponLines, ...comparison.utilityLines];
  return (
    <aside
      id="equipment-popover"
      className={`equipment-popover ${popover.mode === "pinned" ? "pinned" : ""}`}
      style={getPopoverStyle(popover.rect)}
      ref={popoverRef}
      role="dialog"
      aria-label={`${localizeEquipmentName(equipment.id, locale, equipment.name)} ${translateText("equipment details", locale)}`}
    >
      <div className="equipment-popover-header">
        <AtlasIcon icon={getEquipmentIcon(equipment.id)} manifest={manifest} size={58} showTitle={false} />
        <div>
          <span>{translateText(popover.status, locale)}</span>
          <h3>{localizeEquipmentName(equipment.id, locale, equipment.name)}</h3>
          <p>{formatTechLevel(locale, equipment.techLevel, true)} · {translateText(equipment.category, locale)} · {translateText(equipment.role, locale)}</p>
        </div>
        {popover.mode === "pinned" ? (
          <button className="equipment-popover-close" onClick={onClose} aria-label={translateText("Close equipment details", locale)}>
            X
          </button>
        ) : null}
      </div>
      <p>{translateText(equipment.description, locale)}</p>
      <p className="equipment-effect">{translateText(equipment.effect, locale)}</p>
      <p className={canFit ? "equipment-fit" : "equipment-fit warning-text"}>
        {translateText("Slot", locale)} {translateText(equipmentSlotLabels[equipment.slotType], locale)} · {slotUsage[equipment.slotType]}/{slotCapacity[equipment.slotType]} {translateText("used", locale)}
        {sameSlotInstalled.length ? ` · ${translateText("Compare", locale)} ${sameSlotInstalled.map((id) => localizeEquipmentName(id, locale, equipmentName(id))).join(", ")}` : ""}
      </p>
      <div className="equipment-comparison" data-testid="equipment-comparison">
        <header>
          <span>{translateText(comparison.mode === "replace-preview" ? "Replace Preview" : comparison.mode === "installed" ? "Installed Baseline" : "Install Preview", locale)}</span>
          <b>{translateText(comparison.installMessage, locale)}</b>
        </header>
        {comparisonLines.length > 0 ? (
          comparisonLines.slice(0, 8).map((line) => (
            <div key={`${equipment.id}-${line.label}`} className={`equipment-comparison-line ${line.tone}`}>
              <span>{translateText(line.label, locale)}</span>
              <b>{line.before} {"->"} {line.after}</b>
            </div>
          ))
        ) : (
          <p>{translateText("No projected stat change for the current hull.", locale)}</p>
        )}
      </div>
      <div className="equipment-stat-row">
        {equipment.displayStats.map((stat) => (
          <span key={`${equipment.id}-${stat.label}`}>
            <b>{stat.value}</b>
            {translateText(stat.label, locale)}
          </span>
        ))}
      </div>
    </aside>
  );
}

function EquipmentTrigger({
  children,
  className,
  equipmentId,
  getTriggerProps,
  status
}: {
  children: ReactNode;
  className: string;
  equipmentId: EquipmentId;
  getTriggerProps: ReturnType<typeof useEquipmentPopover>["getTriggerProps"];
  status: string;
}) {
  return (
    <button type="button" className={`equipment-trigger ${className}`} {...getTriggerProps(equipmentId, status)}>
      {children}
    </button>
  );
}

export function StationScreen() {
  const currentStationId = useGameStore((state) => state.currentStationId);
  const station = currentStationId ? stationById[currentStationId] : undefined;
  const locale = useGameStore((state) => state.locale);
  const tab = useGameStore((state) => state.stationTab);
  const manifest = useGameStore((state) => state.assetManifest);
  const player = useGameStore((state) => state.player);
  const activeMissions = useGameStore((state) => state.activeMissions);
  const completedMissionIds = useGameStore((state) => state.completedMissionIds);
  const onboardingState = useGameStore((state) => state.onboardingState);
  const autopilot = useGameStore((state) => state.autopilot);
  const gameClock = useGameStore((state) => state.gameClock);
  const setStationTab = useGameStore((state) => state.setStationTab);
  const undock = useGameStore((state) => state.undock);
  const saveGame = useGameStore((state) => state.saveGame);
  const autoSaveSlot = useGameStore((state) => state.saveSlots.find((slot) => slot.id === "auto"));
  const autoSaveTime = autoSaveSlot?.savedAt ? formatDateTime(locale, autoSaveSlot.savedAt, { hour: "2-digit", minute: "2-digit" }) : undefined;
  const isHangarTab = tab === "Hangar";
  const isGalaxyMapTab = tab === "Galaxy Map";
  if (!station) return null;
  const onboardingView = getOnboardingView({
    onboardingState,
    screen: "station",
    currentSystemId: station.systemId,
    currentStationId: station.id,
    player,
    activeMissions,
    completedMissionIds,
    autopilot,
    gameClock
  });
  const onboardingStepId = onboardingView.activeStep?.id;
  const stationBackground: CSSProperties = {
    backgroundImage: `linear-gradient(rgba(3, 7, 18, 0.88), rgba(3, 7, 18, 0.96)), url(${manifest.nebulaBg})`
  };
  return (
    <main className={`station-screen ${isHangarTab ? "station-screen--hangar" : ""} ${isGalaxyMapTab ? "station-screen--galaxy" : ""}`} style={stationBackground}>
      <header className="station-header">
        <div>
          <p className="station-autosave-note">
            {autoSaveTime ? translateText(`Auto-saved to Auto / Quick Slot · ${autoSaveTime}`, locale) : translateText("Auto-save writes to Auto / Quick Slot", locale)}
          </p>
          <p className="eyebrow">{localizeStationArchetype(station.archetype, locale)}</p>
          <h1>{localizeStationName(station.id, locale, station.name)}</h1>
          <p>{formatTechLevel(locale, station.techLevel)} · {localizeFactionName(station.factionId, locale, factionNames[station.factionId])}</p>
        </div>
        <div className="station-actions">
          <button onClick={() => saveGame()}>{translateText("Quick Save", locale)}</button>
          <button className="primary" onClick={undock}>{translateText("Launch", locale)}</button>
        </div>
      </header>
      <div className="station-nav-stack">
        <nav className="tab-row">
          {tabs.map((name) => (
            <button key={name} className={tab === name ? "active" : ""} onClick={() => setStationTab(name)}>
              {translateText(name, locale)}
            </button>
          ))}
        </nav>
        {onboardingView.visible && onboardingStepId ? (
          <section className="station-onboarding-callout" data-testid="station-onboarding-callout">
            <div>
              <span>{translateText("First Flight", locale)} {onboardingView.completedCount}/{onboardingView.totalCount}</span>
              <b>{translateText(onboardingView.activeStep?.title, locale)}</b>
              <p>{translateText(onboardingView.activeStep?.objective, locale)}</p>
            </div>
            {onboardingStepId === "accept-clean-carrier" && station.id === HELION_START_STATION_ID ? (
              <button className="primary" onClick={() => setStationTab("Mission Board")}>{translateText("Open Board", locale)}</button>
            ) : onboardingStepId === "plot-clean-carrier-route" ? (
              <button className="primary" onClick={() => setStationTab("Galaxy Map")}>{translateText("Open Map", locale)}</button>
            ) : onboardingStepId === "complete-clean-carrier" && station.id === MIRR_LATTICE_STATION_ID ? (
              <button className="primary" onClick={() => setStationTab("Mission Board")}>{translateText("Open Board", locale)}</button>
            ) : null}
          </section>
        ) : null}
      </div>
      <section className={`station-body ${isHangarTab ? "station-body--hangar" : ""} ${isGalaxyMapTab ? "station-body--galaxy" : ""}`}>
        {tab === "Market" ? <MarketTab /> : null}
        {tab === "Economy" ? <EconomyTab /> : null}
        {tab === "Hangar" ? <HangarTab /> : null}
        {tab === "Shipyard" ? <ShipyardTab /> : null}
        {tab === "Mission Board" ? <MissionBoardTab /> : null}
        {tab === "Captain's Log" ? <CaptainLogTab /> : null}
        {tab === "Blueprint Workshop" ? <BlueprintTab /> : null}
        {tab === "Lounge" ? <LoungeTab /> : null}
        {tab === "Galaxy Map" ? <GalaxyMap embedded /> : null}
        {tab === "Hangar" ? <SaveSlotsPanel mode="manage" /> : null}
      </section>
    </main>
  );
}

function MarketTab() {
  const manifest = useGameStore((state) => state.assetManifest);
  const locale = useGameStore((state) => state.locale);
  const player = useGameStore((state) => state.player);
  const station = useGameStore((state) => stationById[state.currentStationId ?? "helion-prime"]);
  const system = useGameStore((state) => systemById[state.currentSystemId]);
  const reputation = useGameStore((state) => state.reputation.factions[station.factionId]);
  const marketState = useGameStore((state) => state.marketState);
  const knownSystems = useGameStore((state) => state.knownSystems);
  const knownPlanetIds = useGameStore((state) => state.knownPlanetIds);
  const explorationState = useGameStore((state) => state.explorationState);
  const activeMissions = useGameStore((state) => state.activeMissions);
  const buy = useGameStore((state) => state.buy);
  const sell = useGameStore((state) => state.sell);
  const buyEquipmentAction = useGameStore((state) => state.buyEquipment);
  const sellEquipmentAction = useGameStore((state) => state.sellEquipment);
  const equipmentPopover = useEquipmentPopover();
  const listedCommodities = commodities.filter((item) => isCommodityVisibleInMarket(item.id, station, player.cargo));
  const listedEquipment = equipmentList.filter((item) => canBuyEquipmentAtStation(item.id, station) || (player.equipmentInventory?.[item.id] ?? 0) > 0);
  const occupiedCargo = getOccupiedCargo(player.cargo, activeMissions);
  return (
    <>
      <div className="table-panel">
        <h2>{translateText("Market", locale)}</h2>
        <p>{formatTechLevel(locale, station.techLevel)} · {formatCredits(locale, player.credits)} · {formatCargoLabel(locale, occupiedCargo, player.stats.cargoCapacity)}</p>
        <div className="market-list">
          <h3 className="market-section-title">{translateText("Commodities", locale)}</h3>
          {listedCommodities.map((commodity) => {
            const canBuy = canBuyCommodityAtStation(commodity.id, station);
            const entry = getMarketEntry(marketState, station.id, commodity.id);
            const buyPrice = getCommodityPrice(commodity.id, station, system, reputation, "buy", entry);
            const sellPrice = getCommodityPrice(commodity.id, station, system, reputation, "sell", entry);
            const tag = getMarketTag(entry, station, system, commodity.id);
            return (
              <div className="market-row" data-testid={`market-row-${commodity.id}`} key={commodity.id}>
                <AtlasIcon icon={getCommodityIcon(commodity.id)} manifest={manifest} />
                <div>
                  <strong>{localizeCommodityName(commodity.id, locale, commodity.name)}</strong>
                  <span>{formatTechLevel(locale, commodity.techLevel, true)} · {translateText(commodity.legal ? "Licensed" : "Restricted", locale)} · {holdLabel(locale)} {formatNumber(locale, player.cargo[commodity.id] ?? 0)}</span>
                  {commodity.description ? <span>{translateText(commodity.description, locale)}</span> : null}
                  {commodity.id === "illegal-contraband" ? <span>{translateText("Local law", locale)}: {translateText(getContrabandLawSummary(system.id), locale)}</span> : null}
                  <span>{translateText("Stock", locale)} {formatNumber(locale, Math.floor(entry.stock))}/{formatNumber(locale, entry.maxStock)} · {translateText("Demand", locale)} {entry.demand.toFixed(2)} · {localizeMarketTag(tag, locale)}</span>
                </div>
                <b>{canBuy ? formatCredits(locale, buyPrice, true) : "—"}/{formatCredits(locale, sellPrice, true)}</b>
                <button
                  onClick={() => buy(commodity.id, 1)}
                  disabled={!canBuy || entry.stock < 1 || occupiedCargo >= player.stats.cargoCapacity}
                  title={!canBuy ? translateText("Not stocked at this station", locale) : entry.stock < 1 ? translateText("Out of stock", locale) : undefined}
                >
                  {translateText("Buy", locale)}
                </button>
                <button onClick={() => sell(commodity.id, 1)} disabled={(player.cargo[commodity.id] ?? 0) <= 0}>{translateText("Sell", locale)}</button>
              </div>
            );
          })}
          <h3 className="market-section-title">{translateText("Equipment", locale)}</h3>
          {listedEquipment.map((equipment) => {
            const canBuy = canBuyEquipmentAtStation(equipment.id, station);
            const entry = getMarketEntry(marketState, station.id, equipment.id);
            const buyPrice = getEquipmentPrice(equipment.id, station, system, reputation, "buy", entry);
            const sellPrice = getEquipmentPrice(equipment.id, station, system, reputation, "sell", entry);
            const inventoryCount = player.equipmentInventory?.[equipment.id] ?? 0;
            return (
              <div className="market-row equipment-market-row" data-testid={`market-equipment-row-${equipment.id}`} key={equipment.id}>
                <AtlasIcon icon={getEquipmentIcon(equipment.id)} manifest={manifest} />
                <EquipmentTrigger
                  className="equipment-row-trigger"
                  equipmentId={equipment.id}
                  getTriggerProps={equipmentPopover.getTriggerProps}
                  status={`${translateText("Market", locale)} · ${formatTechLevel(locale, equipment.techLevel, true)}`}
                >
                  <span>
                    <strong>{localizeEquipmentName(equipment.id, locale, equipment.name)}</strong>
                    <small>{formatTechLevel(locale, equipment.techLevel, true)} · {translateText(equipment.category, locale)} · {translateText("Inventory", locale)} {formatNumber(locale, inventoryCount)}</small>
                    <small>{translateText("Stock", locale)} {formatNumber(locale, Math.floor(entry.stock))}/{formatNumber(locale, entry.maxStock)} · {translateText("Demand", locale)} {entry.demand.toFixed(2)}</small>
                  </span>
                </EquipmentTrigger>
                <b>{canBuy ? formatCredits(locale, buyPrice, true) : "—"}/{formatCredits(locale, sellPrice, true)}</b>
                <button
                  onClick={() => buyEquipmentAction(equipment.id, 1)}
                  disabled={!canBuy || entry.stock < 1 || player.credits < buyPrice}
                  title={!canBuy ? requiresTechStationLabel(equipment.techLevel, locale) : entry.stock < 1 ? translateText("Out of stock", locale) : undefined}
                >
                  {translateText("Buy", locale)}
                </button>
                <button onClick={() => sellEquipmentAction(equipment.id, 1)} disabled={inventoryCount <= 0}>{translateText("Sell", locale)}</button>
              </div>
            );
          })}
        </div>
      </div>
      <EquipmentPopover
        manifest={manifest}
        onClose={equipmentPopover.close}
        popover={equipmentPopover.popover}
        popoverRef={equipmentPopover.popoverRef}
      />
    </>
  );
}

function formatEconomyLedgerNet(
  locale: Locale,
  ledger: { revenue: number; expenses: number; losses: number } | undefined
): string {
  if (!ledger) return formatCredits(locale, 0, true);
  const value = ledger.revenue - ledger.expenses - ledger.losses;
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatCredits(locale, Math.abs(value), true)}`;
}

function formatRiskPreferenceLabel(value: string | undefined, locale: Locale): string {
  if (!value) return translateText("Balanced", locale);
  return translateText(value[0].toUpperCase() + value.slice(1), locale);
}

function dispatchCargoEntry(mission: MissionDefinition): [CommodityId, number] | undefined {
  return (Object.entries(mission.cargoRequired ?? {}) as [CommodityId, number | undefined][])
    .find(([, amount]) => (amount ?? 0) > 0) as [CommodityId, number] | undefined;
}

function hasDispatchCargo(playerCargo: CargoHold, mission: MissionDefinition): boolean {
  return Object.entries(mission.cargoRequired ?? {}).every(([commodityId, amount]) => (playerCargo[commodityId as CommodityId] ?? 0) >= (amount ?? 0));
}

function EconomyDispatchBoard() {
  const locale = useGameStore((state) => state.locale);
  const currentSystem = useGameStore((state) => systemById[state.currentSystemId]);
  const currentStationId = useGameStore((state) => state.currentStationId);
  const marketState = useGameStore((state) => state.marketState);
  const activeMissions = useGameStore((state) => state.activeMissions);
  const player = useGameStore((state) => state.player);
  const knownSystems = useGameStore((state) => state.knownSystems);
  const knownPlanetIds = useGameStore((state) => state.knownPlanetIds);
  const explorationState = useGameStore((state) => state.explorationState);
  const gameClock = useGameStore((state) => state.gameClock);
  const autopilot = useGameStore((state) => state.autopilot);
  const acceptMission = useGameStore((state) => state.acceptMission);
  const completeMission = useGameStore((state) => state.completeMission);
  const startJumpToStation = useGameStore((state) => state.startJumpToStation);
  const activeDispatch = activeMissions.filter((mission) => isEconomyDispatchMissionId(mission.id));
  const activeIds = new Set(activeDispatch.map((mission) => mission.id));
  const availableDispatch = getAvailableEconomyDispatchMissions({
    marketState,
    systemId: currentSystem.id,
    activeMissions,
    knownSystemIds: knownSystems,
    knownPlanetIds,
    explorationState,
    limit: 5
  }).filter((mission) => !activeIds.has(mission.id));
  const missions = [...activeDispatch, ...availableDispatch].slice(0, 6);
  return (
    <section className="economy-dispatch-board" data-testid="economy-dispatch-board">
      <header>
        <div>
          <p className="eyebrow">{translateText("Dispatch Board", locale)}</p>
          <h3>{translateText("Economic Opportunities", locale)}</h3>
        </div>
        <span>{formatNumber(locale, missions.length)} {translateText("signals", locale)}</span>
      </header>
      {missions.length === 0 ? (
        <p>{translateText("No current dispatch opportunities in this network.", locale)}</p>
      ) : (
        <div className="economy-dispatch-list">
          {missions.map((mission) => {
            const active = activeIds.has(mission.id);
            const cargoEntry = dispatchCargoEntry(mission);
            const commodityId = cargoEntry?.[0];
            const amount = cargoEntry?.[1] ?? 0;
            const commodityName = commodityId ? localizeCommodityName(commodityId, locale, commodityById[commodityId].name) : translateText("Cargo", locale);
            const destination = stationById[mission.destinationStationId];
            const sourceStationId = getDispatchMissionSourceStationId(mission);
            const source = sourceStationId ? stationById[sourceStationId] : undefined;
            const hasCargo = hasDispatchCargo(player.cargo, mission);
            const routeStationId = hasCargo ? mission.destinationStationId : sourceStationId ?? mission.destinationStationId;
            const routeStation = routeStationId ? stationById[routeStationId] : undefined;
            const complete = active && canCompleteMission(mission, player, currentSystem.id, currentStationId ?? "", 0, gameClock);
            const smuggling = isMarketSmugglingMissionId(mission.id);
            const entry = commodityId && destination ? getMarketEntry(marketState, destination.id, commodityId) : undefined;
            return (
              <article key={mission.id} className={`economy-dispatch-card ${active ? "active" : ""} ${smuggling ? "smuggling" : "supply"}`}>
                <div>
                  <span>{translateText(smuggling ? "Smuggling Run" : "Supply Run", locale)}</span>
                  <h4>{translateText(mission.title, locale)}</h4>
                  <p>
                    {source ? `${localizeStationName(source.id, locale, source.name)} -> ` : ""}
                    {destination ? localizeStationName(destination.id, locale, destination.name) : mission.destinationStationId}
                  </p>
                </div>
                <p>
                  {formatNumber(locale, amount)} {commodityName} · {translateText("Reward", locale)} {formatCredits(locale, mission.reward, true)}
                  {mission.deadlineSeconds ? ` · ${translateText("Deadline", locale)} ${formatTime(mission.deadlineSeconds, locale)}` : ""}
                </p>
                {entry ? (
                  <p>
                    {translateText("Market Pressure", locale)}: {translateText("Stock", locale)} {formatNumber(locale, Math.round(entry.stock))}/{formatNumber(locale, entry.maxStock)} · {translateText("Demand", locale)} {formatNumber(locale, Number(entry.demand.toFixed(2)))}
                  </p>
                ) : null}
                {smuggling ? <p className="warning-text">{translateText(getContrabandLawSummary(mission.destinationSystemId), locale)}</p> : <p>{translateText(mission.description, locale)}</p>}
                <div className="economy-dispatch-actions">
                  <span>{active ? translateText(hasCargo ? "Ready to deliver" : "Active - source cargo required", locale) : translateText("Available", locale)}</span>
                  {!active ? <button onClick={() => acceptMission(mission.id)}>{translateText("Accept", locale)}</button> : null}
                  <button
                    onClick={() => routeStation && startJumpToStation(routeStation.id)}
                    disabled={!routeStation || routeStation.id === currentStationId || !!autopilot}
                  >
                    {translateText(routeStation && !hasCargo ? "Set Route: Source" : "Set Route", locale)}
                  </button>
                  {active ? <button className="primary" onClick={() => completeMission(mission.id)} disabled={!complete}>{translateText("Complete", locale)}</button> : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function EconomyTab() {
  const locale = useGameStore((state) => state.locale);
  const currentSystem = useGameStore((state) => systemById[state.currentSystemId]);
  const runtime = useGameStore((state) => state.runtime);
  const marketState = useGameStore((state) => state.marketState);
  const economyService = useGameStore((state) => state.economyService);
  const economyEvents = useGameStore((state) => state.economyEvents);
  const refreshEconomySnapshot = useGameStore((state) => state.refreshEconomySnapshot);
  const resetEconomyBackend = useGameStore((state) => state.resetEconomyBackend);
  const startEconomyNpcWatch = useGameStore((state) => state.startEconomyNpcWatch);
  const supplyBrief = getMarketSupplyBrief(marketState, currentSystem.id, economyEvents);
  const economyShips = runtime.enemies
    .filter((ship) =>
      !!ship.economyStatus &&
      ship.hull > 0 &&
      ship.deathTimer === undefined &&
      (!ship.economySystemId || ship.economySystemId === currentSystem.id)
    )
    .sort((a, b) => (a.economyTaskKind ?? "").localeCompare(b.economyTaskKind ?? "") || a.name.localeCompare(b.name));
  const events = [...economyEvents].reverse().slice(0, 8);
  const resetLabel = translateText("Reset Economy", locale);
  return (
    <div className="economy-panel" data-testid="economy-tab">
      <header className="economy-header">
        <div>
          <p className="eyebrow">{translateText("Live Economy", locale)}</p>
          <h2>{localizeSystemName(currentSystem.id, locale, currentSystem.name)} {translateText("Supply Network", locale)}</h2>
          <p>
            {translateText("Backend", locale)}: {translateText(economyService.status.toUpperCase(), locale)}
            {economyService.snapshotId !== undefined ? ` · ${translateText("Snapshot", locale)} ${formatNumber(locale, economyService.snapshotId)}` : ""}
            {economyService.lastError ? ` · ${translateText(economyService.lastError, locale)}` : ""}
          </p>
        </div>
        {import.meta.env.DEV ? (
          <div className="economy-debug-actions">
            <button onClick={() => void refreshEconomySnapshot()}>{translateText("Refresh", locale)}</button>
            <button
              className="danger"
              onClick={() => {
                if (window.confirm(translateText("Reset local economy backend state?", locale))) void resetEconomyBackend();
              }}
            >
              {resetLabel}
            </button>
          </div>
        ) : null}
      </header>
      <EconomyDispatchBoard />
      <div className="economy-dashboard">
        <section className="economy-card economy-routes-card">
          <h3>{translateText("NPC Routes", locale)}</h3>
          {economyShips.length > 0 ? (
            <div className="economy-npc-list">
              {economyShips.map((ship) => {
                const route = getEconomyFlightRouteSummary(ship, runtime.asteroids, currentSystem.id);
                const distressActive = hasActiveCivilianDistress(ship, runtime.clock);
                const homeStation = ship.economyHomeStationId ? stationById[ship.economyHomeStationId] : undefined;
                return (
                  <article key={ship.id} className={`economy-npc-row task-${ship.economyTaskKind ?? "idle"}${distressActive ? " distress" : ""}`}>
                    <div>
                      <b>{translateDisplayName(ship.name, locale)}{ship.economySerial ? ` · ${ship.economySerial}` : ""}</b>
                      <span>{distressActive ? `${translateText("DISTRESS", locale)} · ${formatRuntimeText(locale, ship.economyStatus)}` : formatRuntimeText(locale, ship.economyStatus)}</span>
                      <button className="economy-watch-button" onClick={() => startEconomyNpcWatch(ship.id)}>
                        {translateText("Watch", locale)}
                      </button>
                    </div>
                    <p>
                      {translateText("Target", locale)}: {formatRuntimeText(locale, route.targetLabel)}
                      {distressActive ? ` · ${translateText("Under attack", locale)}` : ""}
                      {route.detailLabels.length > 0 ? route.detailLabels.map((detail) => ` · ${formatRuntimeText(locale, detail)}`).join("") : ""}
                      {ship.economyCargo && Object.keys(ship.economyCargo).length > 0 ? ` · ${formatCargoContents(locale, ship.economyCargo)}` : ` · ${translateText("Empty hold", locale)}`}
                      {homeStation ? ` · ${translateText("Home", locale)}: ${localizeStationName(homeStation.id, locale, homeStation.name)}` : ""}
                      {` · ${translateText("Risk", locale)}: ${formatRiskPreferenceLabel(ship.economyRiskPreference, locale)}`}
                      {ship.economyContractId ? ` · ${translateText("Contract", locale)}: ${ship.economyContractId}` : ""}
                      {` · ${translateText("P/L", locale)}: ${formatEconomyLedgerNet(locale, ship.economyLedger)}`}
                    </p>
                  </article>
                );
              })}
            </div>
          ) : (
            <p>{translateText("No backend economy NPCs are currently visible in this system.", locale)}</p>
          )}
        </section>
        <section className="economy-card">
          <h3>{translateText("Market Pressure", locale)}</h3>
          {supplyBrief.shortages.slice(0, 4).map((signal) => (
            <p key={`short-${signal.stationId}-${signal.commodityId}`}>
              {shortageLabel(locale)}: {localizeStationName(signal.stationId, locale, stationById[signal.stationId].name)} {needsLabel(locale)} {localizeCommodityName(signal.commodityId, locale, commodityById[signal.commodityId].name)} · {translateText(signal.severity.toUpperCase(), locale)}
            </p>
          ))}
          {supplyBrief.shortages.length === 0 ? <p>{translateText("No critical station shortages on the public sheet.", locale)}</p> : null}
          {supplyBrief.surpluses.slice(0, 4).map((signal) => (
            <p key={`surplus-${signal.stationId}-${signal.commodityId}`}>
              {surplusLabel(locale)}: {localizeStationName(signal.stationId, locale, stationById[signal.stationId].name)} {heavyOnLabel(locale)} {localizeCommodityName(signal.commodityId, locale, commodityById[signal.commodityId].name)}.
            </p>
          ))}
        </section>
        <section className="economy-card">
          <h3>{translateText("Favored Routes", locale)}</h3>
          {supplyBrief.routes.slice(0, 6).map((hint) => (
            <p key={`${hint.commodityId}-${hint.fromStationId}-${hint.toStationId}`}>
              {localizeCommodityName(hint.commodityId, locale, hint.commodityName)}: {translateDisplayName(hint.fromStationName, locale)} {"->"} {translateDisplayName(hint.toStationName, locale)} · +{formatCredits(locale, hint.profit, true)}/{unitLabel(locale)}
            </p>
          ))}
        </section>
        <section className="economy-card economy-events-card">
          <h3>{translateText("Recent Economy Events", locale)}</h3>
          <div className="economy-events-list">
            {events.length > 0 ? (
              events.map((event) => {
                const systemName = getEconomyEventSystemName(event);
                return (
                  <p key={event.id}>
                    <span>[{translateDisplayName(systemName, locale)}]</span> <span>{event.type.toUpperCase()}</span> {formatRuntimeText(locale, event.message)}
                  </p>
                );
              })
            ) : (
              <p>{translateText("No backend events received yet.", locale)}</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function HangarTab() {
  const manifest = useGameStore((state) => state.assetManifest);
  const locale = useGameStore((state) => state.locale);
  const player = useGameStore((state) => state.player);
  const activeMissions = useGameStore((state) => state.activeMissions);
  const repairAndRefill = useGameStore((state) => state.repairAndRefill);
  const installFromInventory = useGameStore((state) => state.installEquipmentFromInventory);
  const uninstallToInventory = useGameStore((state) => state.uninstallEquipmentToInventory);
  const [inventoryFilter, setInventoryFilter] = useState<EquipmentSlotType | "all">("all");
  const equipmentPopover = useEquipmentPopover();
  const ship = shipById[player.shipId];
  const slotUsage = getEquipmentSlotUsage(player.equipment);
  const slotCapacity = getShipSlotCapacity(player.stats);
  const inventoryEntries = (Object.entries(player.equipmentInventory ?? {}) as [EquipmentId, number | undefined][])
    .filter(([, amount]) => (amount ?? 0) > 0)
    .filter(([id]) => inventoryFilter === "all" || equipmentById[id].slotType === inventoryFilter);
  return (
    <>
      <div className="hangar-build-grid">
        <section className="hangar-panel">
          <h2>{translateText("Current Ship", locale)}</h2>
          <p>{localizeShipName(ship.id, locale, ship.name)} · {translateText(ship.role, locale)}</p>
          <div className="stat-grid">
            <span>{translateText("Hull", locale)} {Math.round(player.hull)}/{player.stats.hull}</span>
            <span>{translateText("Shield", locale)} {Math.round(player.shield)}/{player.stats.shield}</span>
            <span>{translateText("Energy", locale)} {Math.round(player.energy)}/{player.stats.energy}</span>
            <span>{formatCargoLabel(locale, getOccupiedCargo(player.cargo, activeMissions), player.stats.cargoCapacity)}</span>
          </div>
          <div className="slot-grid" aria-label={translateText("Equipment slots", locale)}>
            {equipmentSlotOrder.map((slotType) => {
              const used = slotUsage[slotType];
              const capacity = slotCapacity[slotType];
              const fill = capacity > 0 ? Math.min(100, (used / capacity) * 100) : 0;
              return (
                <div className="slot-meter" key={slotType}>
                  <span>{translateText(equipmentSlotLabels[slotType], locale)}</span>
                  <b>{used}/{capacity}</b>
                  <i style={{ width: `${fill}%` }} />
                </div>
              );
            })}
          </div>
          <button className="primary" onClick={repairAndRefill}>{translateText("Repair Hull and Refill Missiles", locale)}</button>
        </section>
        <section className="hangar-panel hangar-scroll-panel">
          <h2>{translateText("Installed Equipment", locale)}</h2>
          <div className="equipment-list">
            {player.equipment.map((item, index) => (
              <div className="equipment-list-row" key={`${item}-${index}`}>
                <EquipmentTrigger
                  className="equipment-row-trigger"
                  equipmentId={item}
                  getTriggerProps={equipmentPopover.getTriggerProps}
                  status={`${translateText("Installed", locale)} · ${translateText(equipmentSlotLabels[equipmentById[item].slotType], locale)}`}
                >
                  <AtlasIcon icon={getEquipmentIcon(item)} manifest={manifest} size={38} showTitle={false} />
                  <span>
                    <strong>{localizeEquipmentName(item, locale, equipmentName(item))}</strong>
                    <small>{translateText(equipmentSlotLabels[equipmentById[item].slotType], locale)} · {translateText(equipmentById[item].effect, locale)}</small>
                  </span>
                </EquipmentTrigger>
                <button onClick={() => uninstallToInventory(item)}>{translateText("Unload", locale)}</button>
              </div>
            ))}
          </div>
        </section>
        <section className="hangar-panel hangar-scroll-panel">
          <header className="inventory-header">
            <h2>{translateText("Inventory", locale)}</h2>
            <select value={inventoryFilter} onChange={(event) => setInventoryFilter(event.target.value as EquipmentSlotType | "all")} aria-label={translateText("Filter equipment inventory", locale)}>
              <option value="all">{translateText("All", locale)}</option>
              {equipmentSlotOrder.map((slotType) => (
                <option key={slotType} value={slotType}>{translateText(equipmentSlotLabels[slotType], locale)}</option>
              ))}
            </select>
          </header>
          <div className="equipment-list">
            {inventoryEntries.length > 0 ? (
              inventoryEntries.map(([item, amount]) => {
                const availability = canInstallEquipment(player, item);
                return (
                  <div className="equipment-list-row" key={item}>
                    <EquipmentTrigger
                      className="equipment-row-trigger"
                      equipmentId={item}
                      getTriggerProps={equipmentPopover.getTriggerProps}
                      status={`${translateText("Inventory", locale)} x${amount ?? 0}`}
                    >
                      <AtlasIcon icon={getEquipmentIcon(item)} manifest={manifest} size={38} showTitle={false} />
                      <span>
                        <strong>{localizeEquipmentName(item, locale, equipmentName(item))} x{amount}</strong>
                        <small>{translateText(equipmentSlotLabels[equipmentById[item].slotType], locale)} · {translateText(equipmentById[item].role, locale)}</small>
                      </span>
                    </EquipmentTrigger>
                    <button disabled={!availability.ok} title={availability.ok ? undefined : translateText(availability.message, locale)} onClick={() => installFromInventory(item)}>
                      {translateText("Install", locale)}
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="muted">{translateText("No spare equipment in inventory.", locale)}</p>
            )}
          </div>
        </section>
      </div>
      <EquipmentPopover
        manifest={manifest}
        onClose={equipmentPopover.close}
        popover={equipmentPopover.popover}
        popoverRef={equipmentPopover.popoverRef}
      />
    </>
  );
}

function shipCareerText(shipId: string): string {
  const careers: Record<string, string> = {
    "sparrow-mk1": "Career: scout, starter bounties, light exploration",
    "mule-lx": "Career: trade routes, mining support, cargo contracts",
    "raptor-v": "Career: bounty hunting, fast interception, light combat",
    "bastion-7": "Career: heavy combat, escort duty, hostile lanes",
    "horizon-ark": "Career: late-game exploration, hybrid trade, advanced systems"
  };
  return careers[shipId] ?? "Career: general-purpose operations";
}

function shipBlueprintPathText(shipId: string): string {
  const paths: Record<string, string> = {
    "sparrow-mk1": "Recommended blueprints: Exploration Systems + starter Combat",
    "mule-lx": "Recommended blueprints: Engineering & Trade + Exploration Systems",
    "raptor-v": "Recommended blueprints: Combat Systems + Engineering fire-control",
    "bastion-7": "Recommended blueprints: Defense Systems + heavy Combat",
    "horizon-ark": "Recommended blueprints: Exploration Systems + Engineering & Trade"
  };
  return paths[shipId] ?? "Recommended blueprints: balanced development";
}

function ShipyardTab() {
  const locale = useGameStore((state) => state.locale);
  const player = useGameStore((state) => state.player);
  const currentStationId = useGameStore((state) => state.currentStationId);
  const buyShip = useGameStore((state) => state.buyShip);
  const switchShip = useGameStore((state) => state.switchShip);
  const [pendingShipId, setPendingShipId] = useState<string | null>(null);
  const pendingShip = pendingShipId ? shipById[pendingShipId] : undefined;
  const currentShip = shipById[player.shipId];
  return (
    <div className="shipyard-panel">
      <h2>{translateText("Shipyard", locale)}</h2>
      <p className="muted">{translateText("Purchased ships transfer your active hull into secure storage at PTD Home. Stored ships can be switched there for free.", locale)}</p>
      <div className="ship-grid">
        {ships.map((ship) => {
          const current = player.shipId === ship.id;
          const storedRecord = player.ownedShipRecords?.find((record) => record.shipId === ship.id);
          const owned = current || player.ownedShips.includes(ship.id);
          const storedStation = storedRecord ? stationById[storedRecord.stationId] : undefined;
          const canSwitch = !!storedRecord && currentStationId === storedRecord.stationId;
          return (
            <article key={ship.id} className={`ship-card ${current ? "current-ship-card" : ""}`}>
              <h3>{localizeShipName(ship.id, locale, ship.name)}</h3>
              <p>{translateText(ship.role, locale)}</p>
              <p>{translateText(shipCareerText(ship.id), locale)}</p>
              <p>{translateText(shipBlueprintPathText(ship.id), locale)}</p>
              <p>{translateText("Hull", locale)} {ship.stats.hull} · {translateText("Shield", locale)} {ship.stats.shield} · {translateText("Speed", locale)} {ship.stats.speed} · {translateText("Cargo", locale)} {ship.stats.cargoCapacity}</p>
              <p>{translateText("Slots", locale)} {ship.stats.primarySlots}P / {ship.stats.secondarySlots}S / {ship.stats.utilitySlots}U / {ship.stats.defenseSlots}D / {ship.stats.engineeringSlots}E</p>
              <p>{stockLoadoutLabel(locale)}: {ship.equipment.map((id) => localizeEquipmentName(id, locale, equipmentName(id))).join(", ")}</p>
              {current ? (
                <button disabled>{translateText("Current", locale)}</button>
              ) : canSwitch ? (
                <button onClick={() => switchShip(ship.id)}>{translateText("Switch Free", locale)}</button>
              ) : storedRecord ? (
                <button disabled>{storedAtLabel(locale)} {storedStation ? localizeStationName(storedStation.id, locale, storedStation.name) : storedRecord.stationId}</button>
              ) : owned ? (
                <button disabled>{translateText("Owned", locale)}</button>
              ) : (
                <button disabled={player.credits < ship.price} onClick={() => setPendingShipId(ship.id)}>
                  {translateText("Buy", locale)} {formatCredits(locale, ship.price, true)}
                </button>
              )}
            </article>
          );
        })}
      </div>
      {pendingShip ? (
        <div className="modal-screen static-screen" role="dialog" aria-modal="true" aria-label={`${translateText("Confirm", locale)} ${localizeShipName(pendingShip.id, locale, pendingShip.name)} ${translateText("purchase", locale)}`}>
          <section className="modal-panel ship-purchase-modal">
            <h2>{translateText("Confirm Purchase", locale)}</h2>
            <p>
              {confirmShipPurchaseText(pendingShip.id, currentShip.id, pendingShip.price, locale)}
            </p>
            <div className="ship-confirm-grid">
              <span>{translateText("Default loadout", locale)}</span>
              <b>{pendingShip.equipment.map((id) => localizeEquipmentName(id, locale, equipmentName(id))).join(", ")}</b>
              <span>{translateText("Slot layout", locale)}</span>
              <b>{pendingShip.stats.primarySlots}P / {pendingShip.stats.secondarySlots}S / {pendingShip.stats.utilitySlots}U / {pendingShip.stats.defenseSlots}D / {pendingShip.stats.engineeringSlots}E</b>
              <span>{translateText("Storage station", locale)}</span>
              <b>{localizeStationName("ptd-home", locale, "PTD Home")}</b>
            </div>
            <div className="modal-actions">
              <button onClick={() => setPendingShipId(null)}>{translateText("Cancel", locale)}</button>
              <button
                className="primary"
                disabled={player.credits < pendingShip.price}
                onClick={() => {
                  buyShip(pendingShip.id);
                  setPendingShipId(null);
                }}
              >
                {translateText("Confirm Buy", locale)}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function MissionBoardTab() {
  const manifest = useGameStore((state) => state.assetManifest);
  const locale = useGameStore((state) => state.locale);
  const currentSystemId = useGameStore((state) => state.currentSystemId);
  const currentStationId = useGameStore((state) => state.currentStationId ?? "");
  const player = useGameStore((state) => state.player);
  const runtime = useGameStore((state) => state.runtime);
  const activeMissions = useGameStore((state) => state.activeMissions);
  const marketState = useGameStore((state) => state.marketState);
  const knownSystems = useGameStore((state) => state.knownSystems);
  const knownPlanetIds = useGameStore((state) => state.knownPlanetIds);
  const explorationState = useGameStore((state) => state.explorationState);
  const completedMissionIds = useGameStore((state) => state.completedMissionIds);
  const failedMissionIds = useGameStore((state) => state.failedMissionIds);
  const onboardingState = useGameStore((state) => state.onboardingState);
  const gameClock = useGameStore((state) => state.gameClock);
  const autopilot = useGameStore((state) => state.autopilot);
  const acceptMission = useGameStore((state) => state.acceptMission);
  const completeMission = useGameStore((state) => state.completeMission);
  const startJumpToStation = useGameStore((state) => state.startJumpToStation);
  const reputation = useGameStore((state) => state.reputation);
  const staticAvailable = getAvailableMissionsForSystem(missionTemplates, currentSystemId, activeMissions, completedMissionIds, failedMissionIds);
  const marketGapAvailable = getAvailableMarketGapMissions({ marketState, systemId: currentSystemId, activeMissions, knownSystemIds: knownSystems, knownPlanetIds, explorationState });
  const available = [...staticAvailable, ...marketGapAvailable];
  const onboardingView = getOnboardingView({
    onboardingState,
    screen: "station",
    currentSystemId,
    currentStationId,
    player,
    activeMissions,
    completedMissionIds,
    autopilot,
    gameClock
  });
  const onboardingStepId = onboardingView.activeStep?.id;
  return (
    <div className="split-layout">
      <aside className="reputation-panel">
        <h3>{translateText("Reputation", locale)}</h3>
        {Object.entries(reputation.factions).map(([id, value]) => (
          <div className="reputation-row" key={id}>
            <AtlasIcon icon={getFactionIcon(id)} manifest={manifest} size={38} />
            <p>{localizeFactionName(id, locale, factionNames[id as keyof typeof factionNames])}: {value} · {translateText(reputationLabel(value), locale)}</p>
          </div>
        ))}
      </aside>
      <div className="mission-board-panel">
        <h2>{translateText("Mission Board", locale)}</h2>
        {onboardingView.visible && onboardingStepId === "accept-clean-carrier" ? (
          <div className="onboarding-board-note" data-testid="onboarding-board-note">
            <span>{translateText("Recommended first contract", locale)}</span>
            <p>{translateText("Accept Clean Carrier to learn delivery, routing, and station completion.", locale)}</p>
          </div>
        ) : null}
        <div className="mission-list">
          {[...activeMissions, ...available.filter((mission) => !activeMissions.some((active) => active.id === mission.id))].map((mission) => {
            const active = activeMissions.some((item) => item.id === mission.id);
            const complete = active && canCompleteMission(mission, player, currentSystemId, currentStationId, runtime.destroyedPirates, gameClock);
            const remaining = getMissionDeadlineRemaining(mission, gameClock);
            const storyChapter = mission.storyArcId === glassWakeProtocol.id
              ? glassWakeProtocol.chapters.find((chapter) => chapter.id === mission.storyChapterId)
              : undefined;
            const marketGap = isMarketGapMissionId(mission.id);
            const remainingStoryTargets = getStoryEncounterRemainingTargets(mission);
            const onboardingRecommended = onboardingView.visible && mission.id === CLEAN_CARRIER_MISSION_ID && (onboardingStepId === "accept-clean-carrier" || onboardingStepId === "plot-clean-carrier-route");
            const routeStation = stationById[mission.destinationStationId];
            const canSetRoute = active && !!routeStation && routeStation.id !== currentStationId && !autopilot;
            return (
              <article key={mission.id} className={`mission-card ${onboardingRecommended ? "onboarding-recommended" : ""}`} data-testid={`mission-card-${mission.id}`}>
                <div className="mission-title">
                  <AtlasIcon icon={getFactionIcon(mission.factionId)} manifest={manifest} size={40} />
                  <h3>{translateText(mission.title, locale)}</h3>
                  {storyChapter ? <span className="story-pill">{translateText("Main Story", locale)} {storyChapter.order.toString().padStart(2, "0")}</span> : null}
                  {marketGap ? <span className="story-pill">{translateText("Market Gap", locale)}</span> : null}
                  {onboardingRecommended ? <span className="story-pill onboarding-pill">{translateText("Recommended first contract", locale)}</span> : null}
                </div>
                <p>{localizeMissionType(mission.type, locale)} · {localizeFactionName(mission.factionId, locale, factionNames[mission.factionId])} · {translateText("Reward", locale)} {formatCredits(locale, mission.reward, true)}</p>
                <p>{translateText(mission.description, locale)}</p>
                <p>
                  {remaining !== undefined ? `${translateText("Time", locale)} ${formatTime(remaining, locale)} · ` : ""}
                  {translateText("Failure", locale)} {mission.failureReputationDelta ?? -4} rep
                </p>
                {mission.cargoProvided ? <p>{translateText("Provided cargo", locale)}: {formatCargo(mission.cargoProvided, locale)}</p> : null}
                {mission.cargoRequired ? <p>{translateText("Required cargo", locale)}: {formatCargo(mission.cargoRequired, locale)}{mission.consumeCargoOnComplete ? ` · ${translateText("consumed", locale)}` : ""}</p> : null}
                {mission.passengerCount ? <p>{translateText("Passengers occupy", locale)} {mission.passengerCount} {translateText("cargo space.", locale)}</p> : null}
                {mission.escort ? <p>{translateText("Escort hull", locale)} {mission.escort.hull}{mission.escort.arrived ? ` · ${translateText("arrived", locale)}` : ""}</p> : null}
                {mission.salvage ? <p>{translateText("Recovery target", locale)}: {translateDisplayName(mission.salvage.name, locale)}{mission.salvage.recovered ? ` · ${translateText("recovered", locale)}` : ""}</p> : null}
                {mission.storyEncounter ? (
                  <p className="story-field-line">
                    {translateText("Field objective", locale)}: {translateText(mission.storyEncounter.fieldObjective, locale)}
                    {remainingStoryTargets.length > 0 ? ` · ${translateText("Story targets", locale)}: ${remainingStoryTargets.map((target) => translateDisplayName(target.name, locale)).join(", ")}` : ` · ${translateText("Story targets clear", locale)}`}
                  </p>
                ) : null}
                {mission.targetCommodityId ? <p>{translateText("Requires", locale)} {mission.targetAmount} {localizeCommodityName(mission.targetCommodityId, locale, commodityById[mission.targetCommodityId].name)}</p> : null}
                <div className="mission-actions">
                  {active && routeStation ? (
                    <button onClick={() => startJumpToStation(routeStation.id)} disabled={!canSetRoute}>{translateText("Set Route", locale)}</button>
                  ) : null}
                  {active ? (
                    <button onClick={() => completeMission(mission.id)} disabled={!complete}>{translateText("Complete", locale)}</button>
                  ) : (
                    <button onClick={() => acceptMission(mission.id)}>{translateText("Accept", locale)}</button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CaptainLogTab() {
  const locale = useGameStore((state) => state.locale);
  const currentSystemId = useGameStore((state) => state.currentSystemId);
  const currentStationId = useGameStore((state) => state.currentStationId);
  const player = useGameStore((state) => state.player);
  const activeMissions = useGameStore((state) => state.activeMissions);
  const completedMissionIds = useGameStore((state) => state.completedMissionIds);
  const failedMissionIds = useGameStore((state) => state.failedMissionIds);
  const explorationState = useGameStore((state) => state.explorationState);
  const dialogueState = useGameStore((state) => state.dialogueState);
  const openDialogueScene = useGameStore((state) => state.openDialogueScene);
  const progress = getStoryProgress(glassWakeProtocol, missionTemplates, activeMissions, completedMissionIds, failedMissionIds);
  const current = progress.current;
  const currentMission = current?.mission;
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
    getSystemName: (systemId) => localizeSystemName(systemId, locale, systemById[systemId]?.name),
    getCommodityName: (commodityId) => localizeCommodityName(commodityId, locale, commodityById[commodityId]?.name)
  });
  const completedExplorationLogs = explorationSignals.filter((signal) => explorationState.eventLogIds.includes(signal.id));
  const chainSummaries = getExplorationChainSummaries(explorationState, { playerEquipment: player.equipment, playerUnlockedBlueprintIds: player.unlockedBlueprintIds });
  const currentFieldIntel = currentMission
    ? completedExplorationLogs.filter((signal) => signal.storyInfluence?.missionId === currentMission.id)
    : [];
  const dialogueEntries = getDialogueLogEntries({ activeMissions, completedMissionIds, explorationState, dialogueState });
  const storyDialogueEntries = dialogueEntries.filter((entry) => entry.scene.group === "story");
  const explorationDialogueEntries = dialogueEntries.filter((entry) => entry.scene.group === "exploration");
  return (
    <div className="story-log">
      <aside className="story-overview">
        <p className="eyebrow">Captain's Log</p>
        <h2>{glassWakeProtocol.title}</h2>
        <p>{glassWakeProtocol.subtitle}</p>
        <div className="story-progress-meter">
          <b>{progress.completedCount}/{progress.totalCount}</b>
          <span>chapters complete</span>
        </div>
        <p>{glassWakeProtocol.summary}</p>
        <div className="story-current-objective">
          <span>Current Objective</span>
          <p>{translateText(storyObjective.objectiveText, locale)}</p>
        </div>
        <FactionConsequencesPanel />
        {currentFieldIntel.length > 0 ? (
          <div className="story-field-intel">
            <span>Field Intelligence</span>
            {currentFieldIntel.map((signal) => (
              <p key={signal.id}>
                <b>{signal.storyInfluence?.headline}</b>
                {signal.storyInfluence?.note ? ` ${signal.storyInfluence.note}` : ""}
              </p>
            ))}
          </div>
        ) : null}
        {progress.completedCount === progress.totalCount ? (
          <div className="story-epilogue" data-testid="glass-wake-epilogue">
            <span>Epilogue</span>
            <p>{glassWakeProtocol.epilogue}</p>
          </div>
        ) : null}
      </aside>
      <section className="story-timeline" aria-label={`${glassWakeProtocol.title} chapters`}>
        {progress.chapters.map(({ chapter, mission, status }) => {
          const origin = mission ? systemById[mission.originSystemId] : undefined;
          const destination = mission ? stationById[mission.destinationStationId] : undefined;
          const locked = status === "locked";
          return (
            <article key={chapter.id} className={`story-entry ${status.replace(/\s+/g, "-")}`}>
              <header>
                <div>
                  <span>Chapter {chapter.order.toString().padStart(2, "0")}</span>
                  <h3>{locked ? chapter.lockedTitle : chapter.title}</h3>
                </div>
                <b className="story-status">{storyStatusLabel(status)}</b>
              </header>
              <p>{status === "complete" ? chapter.log : locked ? "Signal masked. Complete prior protocol entries to resolve this trace." : chapter.briefing}</p>
              {!locked ? <p className="story-field-line">{translateText("Field objective", locale)}: {translateText(chapter.fieldObjective, locale)}</p> : null}
              {status === "complete" ? <p className="story-reveal-line">{translateText("Reveal", locale)}: {translateText(chapter.reveal, locale)}</p> : null}
              {mission && !locked ? (
                <p className="story-route">
                  {`${origin?.name ?? mission.originSystemId} Mission Board -> ${destination?.name ?? mission.destinationStationId}`}
                </p>
              ) : null}
            </article>
          );
        })}
        <div className="exploration-log-section">
          <header>
            <span>Exploration Archive</span>
            <h3>Quiet Signals</h3>
          </header>
          <p>{explorationState.completedSignalIds.length}/{explorationSignals.length} signals resolved.</p>
          <div className="exploration-chain-list">
            {chainSummaries.map((chain) => {
              const hiddenStations = explorationRewardStationNames(chain).map((name) => translateDisplayName(name, locale));
              return (
                <article key={chain.id} data-testid={`exploration-chain-${chain.id}`} className={chain.status === "complete" ? "complete" : ""}>
                  <header>
                    <div>
                      <b>{translateText(chain.title, locale)}</b>
                      <span>{localizeSystemName(chain.systemId, locale, chain.systemName)}</span>
                    </div>
                    <strong>{chain.completedCount}/{chain.totalCount}</strong>
                  </header>
                  <p>{formatRuntimeText(locale, chain.objectiveText)}</p>
                  {chain.rewardBlueprintId ? (
                    <p>
                      {translateText("Chain reward", locale)}: {translateText(equipmentName(chain.rewardBlueprintId), locale)}
                      {chain.rewardUnlocked ? ` · ${translateText("Unlocked", locale)}` : ""}
                    </p>
                  ) : null}
                  {hiddenStations.length > 0 ? <p>{translateText("Hidden content unlocked", locale)}: {hiddenStations.join(", ")}</p> : null}
                </article>
              );
            })}
          </div>
          {completedExplorationLogs.length === 0 ? (
            <p className="muted">No exploration logs recovered.</p>
          ) : (
            completedExplorationLogs.map((signal) => (
              <article key={signal.id} className="exploration-log-entry">
                <b>{signal.title}</b>
                {signal.storyInfluence ? <span>Field intelligence: {signal.storyInfluence.headline}</span> : null}
                <p>{signal.log}</p>
              </article>
            ))
          )}
        </div>
        <div className="dialogue-log-section">
          <header>
            <span>Comms Archive</span>
            <h3>Voiced Dialogue</h3>
          </header>
          <DialogueReplayList title="Glass Wake Protocol" entries={storyDialogueEntries} onReplay={openDialogueScene} />
          <DialogueReplayList title="Quiet Signals" entries={explorationDialogueEntries} onReplay={openDialogueScene} />
        </div>
      </section>
    </div>
  );
}

function DialogueReplayList({
  entries,
  onReplay,
  title
}: {
  entries: ReturnType<typeof getDialogueLogEntries>;
  onReplay: (sceneId: string, replay?: boolean) => void;
  title: string;
}) {
  return (
    <div className="dialogue-replay-list">
      <h4>{title}</h4>
      {entries.map(({ scene, unlocked, seen }) => (
        <article key={scene.id} className={`dialogue-replay-entry ${unlocked ? "unlocked" : "locked"}`}>
          <div>
            <b>{unlocked ? scene.title : scene.maskedTitle}</b>
            <span>{unlocked ? seen ? "Unlocked" : "Available" : "Signal masked"}</span>
          </div>
          <button disabled={!unlocked} onClick={() => onReplay(scene.id, true)}>Replay</button>
        </article>
      ))}
    </div>
  );
}

function BlueprintTab() {
  const manifest = useGameStore((state) => state.assetManifest);
  const locale = useGameStore((state) => state.locale);
  const player = useGameStore((state) => state.player);
  const station = useGameStore((state) => stationById[state.currentStationId ?? "helion-prime"]);
  const unlockBlueprint = useGameStore((state) => state.unlockBlueprint);
  const craftEquipment = useGameStore((state) => state.craftEquipment);
  const [pathFilter, setPathFilter] = useState<BlueprintPath | "all">("all");
  const equipmentPopover = useEquipmentPopover();
  const visibleBlueprints = blueprintDefinitions
    .filter((blueprint) => craftable.includes(blueprint.equipmentId))
    .filter((blueprint) => isBlueprintVisibleToPlayer(blueprint, player))
    .filter((blueprint) => pathFilter === "all" || blueprint.path === pathFilter)
    .sort((a, b) => a.path.localeCompare(b.path) || a.tier - b.tier || equipmentName(a.equipmentId).localeCompare(equipmentName(b.equipmentId)));
  return (
    <>
      <div className="blueprint-panel">
        <header className="blueprint-toolbar">
          <div>
            <h2>{translateText("Blueprint Workshop", locale)}</h2>
            <p>{translateText("Research unlocks fabrication rights. Markets and NPC drops still provide physical equipment without requiring blueprints.", locale)}</p>
          </div>
          <select value={pathFilter} onChange={(event) => setPathFilter(event.target.value as BlueprintPath | "all")} aria-label={translateText("Filter blueprint path", locale)}>
            <option value="all">{translateText("All Paths", locale)}</option>
            {blueprintPathOrder.map((path) => (
              <option key={path} value={path}>{translateText(blueprintPathLabels[path], locale)}</option>
            ))}
          </select>
        </header>
        <div className="ship-grid">
          {visibleBlueprints.map((blueprint) => {
            const id = blueprint.equipmentId;
            const equipment = equipmentById[id];
            const craftCost = equipment.craftCost;
            const inventoryCount = player.equipmentInventory?.[id] ?? 0;
            const installed = player.equipment.includes(id);
            const blueprintUnlocked = isBlueprintUnlocked(player, id);
            const unlockAvailability = canUnlockBlueprint(player, id);
            const researchable = !blueprintUnlocked && unlockAvailability.ok;
            const techUnlocked = station.techLevel >= equipment.techLevel;
            const canCraft = blueprintUnlocked && techUnlocked && !!craftCost && player.credits >= craftCost.credits && hasCraftMaterials(player.cargo, craftCost.cargo);
            const blueprintStatus = canCraft ? "Craftable" : blueprintUnlocked ? "Unlocked" : researchable ? "Researchable" : "Locked";
            const missing = !blueprintUnlocked
              ? translateText(unlockAvailability.message, locale)
              : !techUnlocked
                ? requiresTechStationLabel(equipment.techLevel, locale)
                : craftCost
                  ? getCraftMissingText(player, craftCost.credits, craftCost.cargo, locale)
                  : translateText("No blueprint data.", locale);
            return (
              <article
                className={`ship-card equipment-card blueprint-card ${blueprintStatus.toLowerCase()} equipment-trigger`}
                key={id}
                role="button"
                tabIndex={0}
                data-testid={`blueprint-card-${id}`}
                {...equipmentPopover.getTriggerProps(id, installed ? translateText("Installed", locale) : inventoryCount > 0 ? `${translateText("Inventory", locale)} x${inventoryCount}` : translateText(blueprintStatus, locale))}
              >
                <AtlasIcon icon={getEquipmentIcon(id)} manifest={manifest} size={52} showTitle={false} />
                <span className={`blueprint-status ${blueprintStatus.toLowerCase()}`}>{translateText(blueprintStatus, locale)}</span>
                <h3>{localizeEquipmentName(id, locale, equipmentName(id))}</h3>
                <p>{translateText("Tier", locale)} {blueprint.tier} · {translateText(blueprintPathLabels[blueprint.path], locale)} · {formatTechLevel(locale, equipment.techLevel, true)}</p>
                <p>{translateText(equipment.category, locale)} · {translateText(equipmentSlotLabels[equipment.slotType], locale)} {translateText("slot", locale)}</p>
                <p>{translateText("Requires", locale)}: {(blueprint.prerequisiteEquipmentIds ?? []).map((equipmentId) => localizeEquipmentName(equipmentId, locale, equipmentName(equipmentId))).join(", ") || translateText("Starter research", locale)}</p>
                <p>{translateText("Unlock", locale)}: {formatBlueprintUnlockCost(blueprint.unlockCost, locale)}</p>
                {craftCost ? (
                  <p>{translateText("Craft", locale)}: {formatCredits(locale, craftCost.credits, true)} · {formatCargo(craftCost.cargo, locale)}</p>
                ) : null}
                <p>{translateText("Installed", locale)} {translateText(installed ? "yes" : "no", locale)} · {translateText("Inventory", locale)} {formatNumber(locale, inventoryCount)}</p>
                {missing ? <p className="warning-text">{missing}</p> : <p className="muted">{translateText("Added to equipment inventory after fabrication.", locale)}</p>}
                <button
                  disabled={!researchable}
                  onClick={(event) => {
                    event.stopPropagation();
                    unlockBlueprint(id);
                  }}
                >
                  {blueprintUnlocked ? translateText("Unlocked", locale) : translateText("Research", locale)}
                </button>
                <button
                  disabled={!canCraft}
                  onClick={(event) => {
                    event.stopPropagation();
                    craftEquipment(id);
                  }}
                >
                  {translateText("Craft", locale)}
                </button>
              </article>
            );
          })}
        </div>
      </div>
      <EquipmentPopover
        manifest={manifest}
        onClose={equipmentPopover.close}
        popover={equipmentPopover.popover}
        popoverRef={equipmentPopover.popoverRef}
      />
    </>
  );
}

function getCraftMissingText(player: ReturnType<typeof useGameStore.getState>["player"], credits: number, cargo: CargoHold, locale: Locale): string {
  const missing: string[] = [];
  if (player.credits < credits) missing.push(formatCredits(locale, credits - player.credits));
  for (const [id, amount] of Object.entries(cargo) as [CommodityId, number][]) {
    const shortage = amount - (player.cargo[id] ?? 0);
    if (shortage > 0) missing.push(`${formatNumber(locale, shortage)} ${localizeCommodityName(id, locale, commodityById[id].name)}`);
  }
  if (missing.length === 0) return "";
  if (locale === "zh-CN") return `缺少 ${missing.join(", ")}。`;
  if (locale === "zh-TW") return `缺少 ${missing.join(", ")}。`;
  if (locale === "ja") return `不足: ${missing.join(", ")}。`;
  if (locale === "fr") return `Manque ${missing.join(", ")}.`;
  return `Missing ${missing.join(", ")}.`;
}

function formatBlueprintUnlockCost(cost: { credits: number; cargo?: CargoHold }, locale: Locale): string {
  const parts = [formatCredits(locale, cost.credits, true)];
  if (cost.cargo && Object.keys(cost.cargo).length > 0) parts.push(formatCargo(cost.cargo, locale));
  return parts.join(" · ");
}

function holdLabel(locale: Locale): string {
  if (locale === "zh-CN") return "持有";
  if (locale === "zh-TW") return "持有";
  if (locale === "ja") return "保有";
  if (locale === "fr") return "Soute";
  return "Hold";
}

function requiresTechStationLabel(level: number, locale: Locale): string {
  if (locale === "zh-CN") return `需要 ${formatTechLevel(locale, level)} 空间站`;
  if (locale === "zh-TW") return `需要 ${formatTechLevel(locale, level)} 太空站`;
  if (locale === "ja") return `${formatTechLevel(locale, level)} のステーションが必要`;
  if (locale === "fr") return `Station ${formatTechLevel(locale, level)} requise`;
  return `Requires Tech Level ${level} station`;
}

function stockLoadoutLabel(locale: Locale): string {
  if (locale === "zh-CN") return "标准配置";
  if (locale === "zh-TW") return "標準配置";
  if (locale === "ja") return "標準ロードアウト";
  if (locale === "fr") return "Configuration stock";
  return "Stock loadout";
}

function storedAtLabel(locale: Locale): string {
  if (locale === "zh-CN") return "存放于";
  if (locale === "zh-TW") return "存放於";
  if (locale === "ja") return "保管先";
  if (locale === "fr") return "Stocké à";
  return "Stored at";
}

function confirmShipPurchaseText(pendingShipId: string, currentShipId: string, price: number, locale: Locale): string {
  const pendingName = localizeShipName(pendingShipId, locale);
  const currentName = localizeShipName(currentShipId, locale);
  const priceText = formatCredits(locale, price);
  const storageName = localizeStationName("ptd-home", locale, "PTD Home");
  if (locale === "zh-CN") return `以 ${priceText} 购买 ${pendingName}。你的 ${currentName} 及其已安装装备将存放在 ${storageName}。`;
  if (locale === "zh-TW") return `以 ${priceText} 購買 ${pendingName}。你的 ${currentName} 及其已安裝裝備將存放在 ${storageName}。`;
  if (locale === "ja") return `${pendingName}を ${priceText} で購入します。現在の ${currentName} と装備は ${storageName} に保管されます。`;
  if (locale === "fr") return `Acheter ${pendingName} pour ${priceText}. Votre ${currentName} et ses équipements installés seront stockés à ${storageName}.`;
  return `Buy ${pendingName} for ${priceText}. Your ${currentName} and its installed equipment will be stored at ${storageName}.`;
}

function dockhandsBriefLabel(systemName: string, locale: Locale): string {
  if (locale === "zh-CN") return `${systemName} 的码头工正在比对实时库存表和供需压力：`;
  if (locale === "zh-TW") return `${systemName} 的碼頭工正在比對即時庫存表和供需壓力：`;
  if (locale === "ja") return `${systemName} のドック作業員がライブ在庫表と供給圧を比較しています:`;
  if (locale === "fr") return `Les dockers de ${systemName} comparent les stocks en direct et la pression d'approvisionnement :`;
  return `Dockhands in ${systemName} are comparing live stock sheets and supply pressure:`;
}

function shortageLabel(locale: Locale): string {
  if (locale === "zh-CN") return "短缺";
  if (locale === "zh-TW") return "短缺";
  if (locale === "ja") return "不足";
  if (locale === "fr") return "Pénurie";
  return "Shortage";
}

function surplusLabel(locale: Locale): string {
  if (locale === "zh-CN") return "过剩";
  if (locale === "zh-TW") return "過剩";
  if (locale === "ja") return "余剰";
  if (locale === "fr") return "Surplus";
  return "Surplus";
}

function needsLabel(locale: Locale): string {
  if (locale === "zh-CN") return "需要";
  if (locale === "zh-TW") return "需要";
  if (locale === "ja") return "需要";
  if (locale === "fr") return "a besoin de";
  return "needs";
}

function heavyOnLabel(locale: Locale): string {
  if (locale === "zh-CN") return "库存偏重于";
  if (locale === "zh-TW") return "庫存偏重於";
  if (locale === "ja") return "を多く抱えています";
  if (locale === "fr") return "est chargé en";
  return "is heavy on";
}

function supplyFeedLabel(locale: Locale): string {
  if (locale === "zh-CN") return "供应动态";
  if (locale === "zh-TW") return "供應動態";
  if (locale === "ja") return "供給フィード";
  if (locale === "fr") return "Flux d'approvisionnement";
  return "Supply feed";
}

function unitLabel(locale: Locale): string {
  if (locale === "zh-CN") return "单位";
  if (locale === "zh-TW") return "單位";
  if (locale === "ja") return "単位";
  if (locale === "fr") return "unité";
  return "unit";
}

function FactionConsequencesPanel() {
  const locale = useGameStore((state) => state.locale);
  const player = useGameStore((state) => state.player);
  const reputation = useGameStore((state) => state.reputation);
  const factionHeat = useGameStore((state) => state.factionHeat);
  const payFactionFine = useGameStore((state) => state.payFactionFine);
  const factionIds = Object.keys(factionNames) as FactionId[];
  return (
    <section className="lounge-card faction-consequences" data-testid="faction-consequences">
      <h3>{translateText("Faction Consequences", locale)}</h3>
      <div className="faction-consequence-list">
        {factionIds.map((factionId) => {
          const record = getFactionHeatRecord(factionHeat, factionId);
          const heatLabel = getFactionHeatLevelLabel(record);
          return (
            <article key={factionId} className={`faction-consequence heat-${heatLabel.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
              <div>
                <b>{localizeFactionName(factionId, locale, factionNames[factionId])}</b>
                <span>
                  {translateText(heatLabel, locale)} · {translateText("Heat", locale)} {formatNumber(locale, Math.round(record.heat))} · {translateText(reputationLabel(reputation.factions[factionId]), locale)}
                </span>
                {record.fineCredits > 0 ? <small>{translateText("Outstanding fine", locale)}: {formatCredits(locale, record.fineCredits)}</small> : null}
              </div>
              <button
                disabled={record.fineCredits <= 0 || player.credits < record.fineCredits}
                onClick={() => payFactionFine(factionId)}
              >
                {translateText("Pay Fine", locale)}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function LoungeTab() {
  const locale = useGameStore((state) => state.locale);
  const currentSystem = useGameStore((state) => systemById[state.currentSystemId]);
  const player = useGameStore((state) => state.player);
  const runtime = useGameStore((state) => state.runtime);
  const explorationState = useGameStore((state) => state.explorationState);
  const marketState = useGameStore((state) => state.marketState);
  const economyEvents = useGameStore((state) => state.economyEvents);
  const supplyBrief = getMarketSupplyBrief(marketState, currentSystem.id, economyEvents);
  const explorationSummary = getExplorationObjectiveSummaryForSystem(currentSystem.id, explorationState, {
    playerPosition: player.position,
    playerEquipment: player.equipment,
    activeScanSignalId: runtime.explorationScan?.signalId,
    playerUnlockedBlueprintIds: player.unlockedBlueprintIds
  });
  return (
    <div className="lounge">
      <h2>{translateText("Lounge", locale)}</h2>
      <p>{dockhandsBriefLabel(localizeSystemName(currentSystem.id, locale, currentSystem.name), locale)}</p>
      {explorationSummary ? (
        <section className={`lounge-card station-exploration-brief status-${explorationSummary.status}`} data-testid="station-exploration-brief">
          <h3>{translateText("Quiet Signals", locale)}</h3>
          <p>
            {formatRuntimeText(locale, explorationSummary.objectiveText)}
            {explorationSummary.distanceMeters !== undefined ? ` · ${formatDistance(locale, explorationSummary.distanceMeters)}` : ""}
          </p>
          <p>
            {explorationSummary.completedCount}/{explorationSummary.totalCount} {translateText("signals resolved.", locale)}
            {explorationSummary.unlockedBlueprintIds.length > 0
              ? ` · ${translateText("Chain reward", locale)}: ${explorationSummary.unlockedBlueprintIds.map((id) => translateText(equipmentName(id), locale)).join(", ")}`
              : ""}
          </p>
          {explorationSummary.revealedStationIds.length > 0 ? (
            <p>
              {translateText("Hidden content unlocked", locale)}: {explorationSummary.revealedStationIds.map((stationId) => localizeStationName(stationId, locale, stationById[stationId]?.name)).join(", ")}
            </p>
          ) : null}
        </section>
      ) : null}
      <FactionConsequencesPanel />
      {supplyBrief.shortages.length > 0 ? (
        supplyBrief.shortages.map((signal) => (
          <p key={`short-${signal.stationId}-${signal.commodityId}`}>
            {shortageLabel(locale)}: {localizeStationName(signal.stationId, locale, stationById[signal.stationId].name)} {needsLabel(locale)} {localizeCommodityName(signal.commodityId, locale, commodityById[signal.commodityId].name)} · {translateText(signal.severity.toUpperCase(), locale)}
          </p>
        ))
      ) : (
        <p>{translateText("No critical station shortages on the public sheet.", locale)}</p>
      )}
      {supplyBrief.surpluses.map((signal) => (
        <p key={`surplus-${signal.stationId}-${signal.commodityId}`}>
          {surplusLabel(locale)}: {localizeStationName(signal.stationId, locale, stationById[signal.stationId].name)} {heavyOnLabel(locale)} {localizeCommodityName(signal.commodityId, locale, commodityById[signal.commodityId].name)}.
        </p>
      ))}
      {supplyBrief.recentEvents.map((event) => (
        <p key={event.id}>{supplyFeedLabel(locale)}: {translateText(event.message, locale)}</p>
      ))}
      <p>{translateText("Favored live routes", locale)}:</p>
      {supplyBrief.routes.map((hint) => (
        <p key={`${hint.commodityId}-${hint.fromStationId}-${hint.toStationId}`}>
          {localizeCommodityName(hint.commodityId, locale, hint.commodityName)}: {translateDisplayName(hint.fromStationName, locale)} → {translateDisplayName(hint.toStationName, locale)} · +{formatCredits(locale, hint.profit, true)}/{unitLabel(locale)}
        </p>
      ))}
      <p>{translateText("Contract timers use shipboard time, so they keep moving while docked or browsing the map.", locale)}</p>
    </div>
  );
}

function formatTime(seconds: number, locale: Locale): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
  if (locale === "zh-CN" || locale === "zh-TW" || locale === "ja") return `${minutes}分${remainder}秒`;
  if (locale === "fr") return `${minutes} min ${remainder} s`;
  return `${minutes}:${remainder}`;
}

function formatCargo(cargo: CargoHold, locale: Locale): string {
  return formatCargoContents(locale, cargo);
}
