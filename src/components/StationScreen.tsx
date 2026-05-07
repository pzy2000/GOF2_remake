import { useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, MouseEvent as ReactMouseEvent, MutableRefObject, ReactNode } from "react";
import { commodities, shipById, ships, stationById, systemById, useGameStore } from "../state/gameStore";
import { commodityById, equipmentById, equipmentList, equipmentName, explorationSignals, factionNames, glassWakeProtocol, missionTemplates } from "../data/world";
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
  getAvailableMarketGapMissions,
  getMarketSupplyBrief,
  isMarketGapMissionId
} from "../systems/marketMissions";
import { reputationLabel } from "../systems/reputation";
import { GalaxyMap } from "./GalaxyMap";
import { AtlasIcon } from "./AtlasIcon";
import { SaveSlotsPanel } from "./SaveSlotsPanel";
import { getCommodityIcon, getEquipmentIcon, getFactionIcon } from "../data/iconAtlas";
import { getStoryProgress, storyStatusLabel } from "../systems/story";
import { getDialogueLogEntries } from "../systems/dialogue";
import { isExplorationSignalUnlocked } from "../systems/exploration";
import {
  canInstallEquipment,
  getEquipmentSlotUsage,
  getShipSlotCapacity,
  hasCraftMaterials
} from "../systems/equipment";
import { getContrabandLawSummary } from "../systems/combatAi";
import type { AssetManifest, CargoHold, CommodityId, EquipmentId, EquipmentSlotType, ExplorationSignalDefinition, ExplorationState, StationTab } from "../types/game";

const tabs: StationTab[] = ["Market", "Hangar", "Shipyard", "Mission Board", "Captain's Log", "Blueprint Workshop", "Lounge", "Galaxy Map"];
const craftable: EquipmentId[] = equipmentList.filter((item) => !!item.craftCost).map((item) => item.id);
const equipmentSlotOrder: EquipmentSlotType[] = ["primary", "secondary", "utility", "defense", "engineering"];
const equipmentSlotLabels: Record<EquipmentSlotType, string> = {
  primary: "Primary",
  secondary: "Secondary",
  utility: "Utility",
  defense: "Defense",
  engineering: "Engineering"
};
const EQUIPMENT_POPOVER_HOVER_DELAY_MS = 2000;

type EquipmentPopoverMode = "preview" | "pinned";

interface ExplorationChainSummary {
  id: string;
  title: string;
  systemName: string;
  signals: ExplorationSignalDefinition[];
  completed: ExplorationSignalDefinition[];
  next?: ExplorationSignalDefinition;
}

function getExplorationChainSummaries(explorationState: ExplorationState): ExplorationChainSummary[] {
  const chains = new Map<string, ExplorationSignalDefinition[]>();
  for (const signal of explorationSignals) {
    const chainId = signal.chainId ?? signal.id;
    chains.set(chainId, [...(chains.get(chainId) ?? []), signal]);
  }
  return Array.from(chains.entries())
    .map(([id, signals]) => {
      const ordered = [...signals].sort((a, b) => (a.stage ?? 1) - (b.stage ?? 1) || a.title.localeCompare(b.title));
      return {
        id,
        title: ordered[0]?.chainTitle ?? ordered[0]?.title ?? id,
        systemName: systemById[ordered[0]?.systemId ?? ""]?.name ?? ordered[0]?.systemId ?? "Unknown System",
        signals: ordered,
        completed: ordered.filter((signal) => explorationState.completedSignalIds.includes(signal.id)),
        next: ordered.find((signal) => !explorationState.completedSignalIds.includes(signal.id) && isExplorationSignalUnlocked(signal, explorationState))
      };
    })
    .sort((a, b) => a.systemName.localeCompare(b.systemName) || a.title.localeCompare(b.title));
}

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
  if (!popover) return null;
  const equipment = equipmentById[popover.id];
  const slotUsage = getEquipmentSlotUsage(player.equipment);
  const slotCapacity = getShipSlotCapacity(player.stats);
  const sameSlotInstalled = player.equipment.filter((id) => equipmentById[id].slotType === equipment.slotType && id !== equipment.id);
  const canFit = slotUsage[equipment.slotType] + (equipment.slotSize ?? 1) <= slotCapacity[equipment.slotType] || player.equipment.includes(equipment.id);
  return (
    <aside
      id="equipment-popover"
      className={`equipment-popover ${popover.mode === "pinned" ? "pinned" : ""}`}
      style={getPopoverStyle(popover.rect)}
      ref={popoverRef}
      role="dialog"
      aria-label={`${equipment.name} equipment details`}
    >
      <div className="equipment-popover-header">
        <AtlasIcon icon={getEquipmentIcon(equipment.id)} manifest={manifest} size={58} showTitle={false} />
        <div>
          <span>{popover.status}</span>
          <h3>{equipment.name}</h3>
          <p>Tech {equipment.techLevel} · {equipment.category} · {equipment.role}</p>
        </div>
        {popover.mode === "pinned" ? (
          <button className="equipment-popover-close" onClick={onClose} aria-label="Close equipment details">
            X
          </button>
        ) : null}
      </div>
      <p>{equipment.description}</p>
      <p className="equipment-effect">{equipment.effect}</p>
      <p className={canFit ? "equipment-fit" : "equipment-fit warning-text"}>
        Slot {equipmentSlotLabels[equipment.slotType]} · {slotUsage[equipment.slotType]}/{slotCapacity[equipment.slotType]} used{sameSlotInstalled.length ? ` · Compare ${sameSlotInstalled.map(equipmentName).join(", ")}` : ""}
      </p>
      <div className="equipment-stat-row">
        {equipment.displayStats.map((stat) => (
          <span key={`${equipment.id}-${stat.label}`}>
            <b>{stat.value}</b>
            {stat.label}
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
  const tab = useGameStore((state) => state.stationTab);
  const manifest = useGameStore((state) => state.assetManifest);
  const setStationTab = useGameStore((state) => state.setStationTab);
  const undock = useGameStore((state) => state.undock);
  const saveGame = useGameStore((state) => state.saveGame);
  const autoSaveSlot = useGameStore((state) => state.saveSlots.find((slot) => slot.id === "auto"));
  const autoSaveTime = autoSaveSlot?.savedAt ? new Date(autoSaveSlot.savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : undefined;
  const isHangarTab = tab === "Hangar";
  const isGalaxyMapTab = tab === "Galaxy Map";
  if (!station) return null;
  const stationBackground: CSSProperties = {
    backgroundImage: `linear-gradient(rgba(3, 7, 18, 0.88), rgba(3, 7, 18, 0.96)), url(${manifest.nebulaBg})`
  };
  return (
    <main className={`station-screen ${isHangarTab ? "station-screen--hangar" : ""} ${isGalaxyMapTab ? "station-screen--galaxy" : ""}`} style={stationBackground}>
      <header className="station-header">
        <div>
          <p className="station-autosave-note">
            {autoSaveTime ? `Auto-saved to Auto / Quick Slot · ${autoSaveTime}` : "Auto-save writes to Auto / Quick Slot"}
          </p>
          <p className="eyebrow">{station.archetype}</p>
          <h1>{station.name}</h1>
          <p>Tech Level {station.techLevel} · {factionNames[station.factionId]}</p>
        </div>
        <div className="station-actions">
          <button onClick={() => saveGame()}>Quick Save</button>
          <button className="primary" onClick={undock}>Launch</button>
        </div>
      </header>
      <nav className="tab-row">
        {tabs.map((name) => (
          <button key={name} className={tab === name ? "active" : ""} onClick={() => setStationTab(name)}>
            {name}
          </button>
        ))}
      </nav>
      <section className={`station-body ${isHangarTab ? "station-body--hangar" : ""} ${isGalaxyMapTab ? "station-body--galaxy" : ""}`}>
        {tab === "Market" ? <MarketTab /> : null}
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
  const player = useGameStore((state) => state.player);
  const station = useGameStore((state) => stationById[state.currentStationId ?? "helion-prime"]);
  const system = useGameStore((state) => systemById[state.currentSystemId]);
  const reputation = useGameStore((state) => state.reputation.factions[station.factionId]);
  const marketState = useGameStore((state) => state.marketState);
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
        <h2>Market</h2>
        <p>Tech Level {station.techLevel} · Credits {player.credits.toLocaleString()} · Cargo {occupiedCargo}/{player.stats.cargoCapacity}</p>
        <div className="market-list">
          <h3 className="market-section-title">Commodities</h3>
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
                  <strong>{commodity.name}</strong>
                  <span>Tech {commodity.techLevel} · {commodity.legal ? "Licensed" : "Restricted"} · Hold {player.cargo[commodity.id] ?? 0}</span>
                  {commodity.description ? <span>{commodity.description}</span> : null}
                  {commodity.id === "illegal-contraband" ? <span>Local law: {getContrabandLawSummary(system.id)}</span> : null}
                  <span>Stock {Math.floor(entry.stock)}/{entry.maxStock} · Demand {entry.demand.toFixed(2)} · {tag}</span>
                </div>
                <b>{canBuy ? buyPrice : "—"}/{sellPrice} cr</b>
                <button
                  onClick={() => buy(commodity.id, 1)}
                  disabled={!canBuy || entry.stock < 1 || occupiedCargo >= player.stats.cargoCapacity}
                  title={!canBuy ? "Not stocked at this station" : entry.stock < 1 ? "Out of stock" : undefined}
                >
                  Buy
                </button>
                <button onClick={() => sell(commodity.id, 1)} disabled={(player.cargo[commodity.id] ?? 0) <= 0}>Sell</button>
              </div>
            );
          })}
          <h3 className="market-section-title">Equipment</h3>
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
                  status={`Market · Tech ${equipment.techLevel}`}
                >
                  <span>
                    <strong>{equipment.name}</strong>
                    <small>Tech {equipment.techLevel} · {equipment.category} · Inventory {inventoryCount}</small>
                    <small>Stock {Math.floor(entry.stock)}/{entry.maxStock} · Demand {entry.demand.toFixed(2)}</small>
                  </span>
                </EquipmentTrigger>
                <b>{canBuy ? buyPrice : "—"}/{sellPrice} cr</b>
                <button
                  onClick={() => buyEquipmentAction(equipment.id, 1)}
                  disabled={!canBuy || entry.stock < 1 || player.credits < buyPrice}
                  title={!canBuy ? `Requires Tech Level ${equipment.techLevel} station` : entry.stock < 1 ? "Out of stock" : undefined}
                >
                  Buy
                </button>
                <button onClick={() => sellEquipmentAction(equipment.id, 1)} disabled={inventoryCount <= 0}>Sell</button>
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

function HangarTab() {
  const manifest = useGameStore((state) => state.assetManifest);
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
          <h2>Current Ship</h2>
          <p>{ship.name} · {ship.role}</p>
          <div className="stat-grid">
            <span>Hull {Math.round(player.hull)}/{player.stats.hull}</span>
            <span>Shield {Math.round(player.shield)}/{player.stats.shield}</span>
            <span>Energy {Math.round(player.energy)}/{player.stats.energy}</span>
            <span>Cargo {getOccupiedCargo(player.cargo, activeMissions)}/{player.stats.cargoCapacity}</span>
          </div>
          <div className="slot-grid" aria-label="Equipment slots">
            {equipmentSlotOrder.map((slotType) => {
              const used = slotUsage[slotType];
              const capacity = slotCapacity[slotType];
              const fill = capacity > 0 ? Math.min(100, (used / capacity) * 100) : 0;
              return (
                <div className="slot-meter" key={slotType}>
                  <span>{equipmentSlotLabels[slotType]}</span>
                  <b>{used}/{capacity}</b>
                  <i style={{ width: `${fill}%` }} />
                </div>
              );
            })}
          </div>
          <button className="primary" onClick={repairAndRefill}>Repair Hull and Refill Missiles</button>
        </section>
        <section className="hangar-panel hangar-scroll-panel">
          <h2>Installed Equipment</h2>
          <div className="equipment-list">
            {player.equipment.map((item, index) => (
              <div className="equipment-list-row" key={`${item}-${index}`}>
                <EquipmentTrigger
                  className="equipment-row-trigger"
                  equipmentId={item}
                  getTriggerProps={equipmentPopover.getTriggerProps}
                  status={`Installed · ${equipmentSlotLabels[equipmentById[item].slotType]}`}
                >
                  <AtlasIcon icon={getEquipmentIcon(item)} manifest={manifest} size={38} showTitle={false} />
                  <span>
                    <strong>{equipmentName(item)}</strong>
                    <small>{equipmentSlotLabels[equipmentById[item].slotType]} · {equipmentById[item].effect}</small>
                  </span>
                </EquipmentTrigger>
                <button onClick={() => uninstallToInventory(item)}>Unload</button>
              </div>
            ))}
          </div>
        </section>
        <section className="hangar-panel hangar-scroll-panel">
          <header className="inventory-header">
            <h2>Inventory</h2>
            <select value={inventoryFilter} onChange={(event) => setInventoryFilter(event.target.value as EquipmentSlotType | "all")} aria-label="Filter equipment inventory">
              <option value="all">All</option>
              {equipmentSlotOrder.map((slotType) => (
                <option key={slotType} value={slotType}>{equipmentSlotLabels[slotType]}</option>
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
                      status={`Inventory x${amount ?? 0}`}
                    >
                      <AtlasIcon icon={getEquipmentIcon(item)} manifest={manifest} size={38} showTitle={false} />
                      <span>
                        <strong>{equipmentName(item)} x{amount}</strong>
                        <small>{equipmentSlotLabels[equipmentById[item].slotType]} · {equipmentById[item].role}</small>
                      </span>
                    </EquipmentTrigger>
                    <button disabled={!availability.ok} title={availability.ok ? undefined : availability.message} onClick={() => installFromInventory(item)}>
                      Install
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="muted">No spare equipment in inventory.</p>
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

function ShipyardTab() {
  const player = useGameStore((state) => state.player);
  const currentStationId = useGameStore((state) => state.currentStationId);
  const buyShip = useGameStore((state) => state.buyShip);
  const switchShip = useGameStore((state) => state.switchShip);
  const [pendingShipId, setPendingShipId] = useState<string | null>(null);
  const pendingShip = pendingShipId ? shipById[pendingShipId] : undefined;
  const currentShip = shipById[player.shipId];
  return (
    <div className="shipyard-panel">
      <h2>Shipyard</h2>
      <p className="muted">Purchased ships transfer your active hull into secure storage at PTD Home. Stored ships can be switched there for free.</p>
      <div className="ship-grid">
        {ships.map((ship) => {
          const current = player.shipId === ship.id;
          const storedRecord = player.ownedShipRecords?.find((record) => record.shipId === ship.id);
          const owned = current || player.ownedShips.includes(ship.id);
          const storedStation = storedRecord ? stationById[storedRecord.stationId] : undefined;
          const canSwitch = !!storedRecord && currentStationId === storedRecord.stationId;
          return (
            <article key={ship.id} className={`ship-card ${current ? "current-ship-card" : ""}`}>
              <h3>{ship.name}</h3>
              <p>{ship.role}</p>
              <p>{shipCareerText(ship.id)}</p>
              <p>Hull {ship.stats.hull} · Shield {ship.stats.shield} · Speed {ship.stats.speed} · Cargo {ship.stats.cargoCapacity}</p>
              <p>Slots {ship.stats.primarySlots}P / {ship.stats.secondarySlots}S / {ship.stats.utilitySlots}U / {ship.stats.defenseSlots}D / {ship.stats.engineeringSlots}E</p>
              <p>Stock loadout: {ship.equipment.map(equipmentName).join(", ")}</p>
              {current ? (
                <button disabled>Current</button>
              ) : canSwitch ? (
                <button onClick={() => switchShip(ship.id)}>Switch Free</button>
              ) : storedRecord ? (
                <button disabled>Stored at {storedStation?.name ?? storedRecord.stationId}</button>
              ) : owned ? (
                <button disabled>Owned</button>
              ) : (
                <button disabled={player.credits < ship.price} onClick={() => setPendingShipId(ship.id)}>
                  Buy {ship.price.toLocaleString()} cr
                </button>
              )}
            </article>
          );
        })}
      </div>
      {pendingShip ? (
        <div className="modal-screen static-screen" role="dialog" aria-modal="true" aria-label={`Confirm ${pendingShip.name} purchase`}>
          <section className="modal-panel ship-purchase-modal">
            <h2>Confirm Purchase</h2>
            <p>
              Buy {pendingShip.name} for {pendingShip.price.toLocaleString()} credits. Your {currentShip.name} and its installed equipment will be stored at PTD Home.
            </p>
            <div className="ship-confirm-grid">
              <span>Default loadout</span>
              <b>{pendingShip.equipment.map(equipmentName).join(", ")}</b>
              <span>Slot layout</span>
              <b>{pendingShip.stats.primarySlots}P / {pendingShip.stats.secondarySlots}S / {pendingShip.stats.utilitySlots}U / {pendingShip.stats.defenseSlots}D / {pendingShip.stats.engineeringSlots}E</b>
              <span>Storage station</span>
              <b>PTD Home</b>
            </div>
            <div className="modal-actions">
              <button onClick={() => setPendingShipId(null)}>Cancel</button>
              <button
                className="primary"
                disabled={player.credits < pendingShip.price}
                onClick={() => {
                  buyShip(pendingShip.id);
                  setPendingShipId(null);
                }}
              >
                Confirm Buy
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
  const currentSystemId = useGameStore((state) => state.currentSystemId);
  const currentStationId = useGameStore((state) => state.currentStationId ?? "");
  const player = useGameStore((state) => state.player);
  const runtime = useGameStore((state) => state.runtime);
  const activeMissions = useGameStore((state) => state.activeMissions);
  const marketState = useGameStore((state) => state.marketState);
  const completedMissionIds = useGameStore((state) => state.completedMissionIds);
  const failedMissionIds = useGameStore((state) => state.failedMissionIds);
  const gameClock = useGameStore((state) => state.gameClock);
  const acceptMission = useGameStore((state) => state.acceptMission);
  const completeMission = useGameStore((state) => state.completeMission);
  const reputation = useGameStore((state) => state.reputation);
  const staticAvailable = getAvailableMissionsForSystem(missionTemplates, currentSystemId, activeMissions, completedMissionIds, failedMissionIds);
  const marketGapAvailable = getAvailableMarketGapMissions({ marketState, systemId: currentSystemId, activeMissions });
  const available = [...staticAvailable, ...marketGapAvailable];
  return (
    <div className="split-layout">
      <aside className="reputation-panel">
        <h3>Reputation</h3>
        {Object.entries(reputation.factions).map(([id, value]) => (
          <div className="reputation-row" key={id}>
            <AtlasIcon icon={getFactionIcon(id)} manifest={manifest} size={38} />
            <p>{id.replace(/-/g, " ")}: {value} · {reputationLabel(value)}</p>
          </div>
        ))}
      </aside>
      <div className="mission-board-panel">
        <h2>Mission Board</h2>
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
            return (
              <article key={mission.id} className="mission-card" data-testid={`mission-card-${mission.id}`}>
                <div className="mission-title">
                  <AtlasIcon icon={getFactionIcon(mission.factionId)} manifest={manifest} size={40} />
                  <h3>{mission.title}</h3>
                  {storyChapter ? <span className="story-pill">Main Story {storyChapter.order.toString().padStart(2, "0")}</span> : null}
                  {marketGap ? <span className="story-pill">Market Gap</span> : null}
                </div>
                <p>{mission.type} · {factionNames[mission.factionId]} · Reward {mission.reward} cr</p>
                <p>{mission.description}</p>
                <p>
                  {remaining !== undefined ? `Time ${formatTime(remaining)} · ` : ""}
                  Failure {mission.failureReputationDelta ?? -4} rep
                </p>
                {mission.cargoProvided ? <p>Provided cargo: {formatCargo(mission.cargoProvided)}</p> : null}
                {mission.cargoRequired ? <p>Required cargo: {formatCargo(mission.cargoRequired)}{mission.consumeCargoOnComplete ? " · consumed" : ""}</p> : null}
                {mission.passengerCount ? <p>Passengers occupy {mission.passengerCount} cargo space.</p> : null}
                {mission.escort ? <p>Escort hull {mission.escort.hull}{mission.escort.arrived ? " · arrived" : ""}</p> : null}
                {mission.salvage ? <p>Recovery target: {mission.salvage.name}{mission.salvage.recovered ? " · recovered" : ""}</p> : null}
                {mission.storyEncounter ? (
                  <p className="story-field-line">
                    Field objective: {mission.storyEncounter.fieldObjective}
                    {remainingStoryTargets.length > 0 ? ` · Story targets: ${remainingStoryTargets.map((target) => target.name).join(", ")}` : " · Story targets clear"}
                  </p>
                ) : null}
                {mission.targetCommodityId ? <p>Requires {mission.targetAmount} {commodityById[mission.targetCommodityId].name}</p> : null}
                {active ? (
                  <button onClick={() => completeMission(mission.id)} disabled={!complete}>Complete</button>
                ) : (
                  <button onClick={() => acceptMission(mission.id)}>Accept</button>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CaptainLogTab() {
  const activeMissions = useGameStore((state) => state.activeMissions);
  const completedMissionIds = useGameStore((state) => state.completedMissionIds);
  const failedMissionIds = useGameStore((state) => state.failedMissionIds);
  const explorationState = useGameStore((state) => state.explorationState);
  const dialogueState = useGameStore((state) => state.dialogueState);
  const openDialogueScene = useGameStore((state) => state.openDialogueScene);
  const progress = getStoryProgress(glassWakeProtocol, missionTemplates, activeMissions, completedMissionIds, failedMissionIds);
  const current = progress.current;
  const currentMission = current?.mission;
  const currentOrigin = currentMission ? systemById[currentMission.originSystemId] : undefined;
  const currentDestination = currentMission ? stationById[currentMission.destinationStationId] : undefined;
  const completedExplorationLogs = explorationSignals.filter((signal) => explorationState.eventLogIds.includes(signal.id));
  const chainSummaries = getExplorationChainSummaries(explorationState);
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
          <p>{current ? currentObjectiveText(current.status, currentMission, currentOrigin?.name, currentDestination?.name) : "Protocol complete. Glass Wake is quiet for now."}</p>
        </div>
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
              {!locked ? <p className="story-field-line">Field objective: {chapter.fieldObjective}</p> : null}
              {status === "complete" ? <p className="story-reveal-line">Reveal: {chapter.reveal}</p> : null}
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
            {chainSummaries.map((chain) => (
              <article key={chain.id} className={chain.completed.length === chain.signals.length ? "complete" : ""}>
                <header>
                  <div>
                    <b>{chain.title}</b>
                    <span>{chain.systemName}</span>
                  </div>
                  <strong>{chain.completed.length}/{chain.signals.length}</strong>
                </header>
                <p>
                  {chain.next
                    ? `Next trace: ${chain.next.maskedTitle}`
                    : chain.completed.length === chain.signals.length
                      ? "Chain resolved."
                      : "Next trace locked behind a prior signal."}
                </p>
              </article>
            ))}
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

function currentObjectiveText(status: string, mission: typeof missionTemplates[number] | undefined, originName: string | undefined, destinationName: string | undefined): string {
  if (!mission) return "Signal source missing from mission registry.";
  if (status === "locked") return "Complete prior protocol entries to resolve the next trace.";
  if (status === "active") {
    const remaining = getStoryEncounterRemainingTargets(mission);
    if (remaining.length > 0) return `Clear ${remaining.map((target) => target.name).join(", ")}; then report to ${destinationName ?? mission.destinationStationId}.`;
    return mission.storyEncounter?.completionText ?? `Complete ${mission.title} and report to ${destinationName ?? mission.destinationStationId}.`;
  }
  if (status === "failed retry") return `Return to ${originName ?? mission.originSystemId} and retry ${mission.title}.`;
  return `Accept ${mission.title} from the ${originName ?? mission.originSystemId} Mission Board.`;
}

function BlueprintTab() {
  const manifest = useGameStore((state) => state.assetManifest);
  const player = useGameStore((state) => state.player);
  const station = useGameStore((state) => stationById[state.currentStationId ?? "helion-prime"]);
  const craftEquipment = useGameStore((state) => state.craftEquipment);
  const equipmentPopover = useEquipmentPopover();
  return (
    <>
      <div className="blueprint-panel">
        <h2>Blueprint Workshop</h2>
        <div className="ship-grid">
          {craftable.map((id) => {
            const equipment = equipmentById[id];
            const craftCost = equipment.craftCost;
            const inventoryCount = player.equipmentInventory?.[id] ?? 0;
            const installed = player.equipment.includes(id);
            const techUnlocked = station.techLevel >= equipment.techLevel;
            const canCraft = techUnlocked && !!craftCost && player.credits >= craftCost.credits && hasCraftMaterials(player.cargo, craftCost.cargo);
            const missing = !techUnlocked ? `Requires Tech Level ${equipment.techLevel} station.` : craftCost ? getCraftMissingText(player, craftCost.credits, craftCost.cargo) : "No blueprint data.";
            return (
              <article
                className="ship-card equipment-card equipment-trigger"
                key={id}
                role="button"
                tabIndex={0}
                {...equipmentPopover.getTriggerProps(id, installed ? "Installed" : inventoryCount > 0 ? `Inventory x${inventoryCount}` : "Craftable")}
              >
                <AtlasIcon icon={getEquipmentIcon(id)} manifest={manifest} size={52} showTitle={false} />
                <h3>{equipmentName(id)}</h3>
                <p>Tech {equipment.techLevel} · {equipment.category} · {equipmentSlotLabels[equipment.slotType]} slot</p>
                {craftCost ? (
                  <p>{craftCost.credits.toLocaleString()} cr · {formatCargo(craftCost.cargo)}</p>
                ) : null}
                <p>Installed {installed ? "yes" : "no"} · Inventory {inventoryCount}</p>
                {missing ? <p className="warning-text">{missing}</p> : <p className="muted">Added to equipment inventory after fabrication.</p>}
                <button
                  disabled={!canCraft}
                  onClick={(event) => {
                    event.stopPropagation();
                    craftEquipment(id);
                  }}
                >
                  Craft
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

function getCraftMissingText(player: ReturnType<typeof useGameStore.getState>["player"], credits: number, cargo: CargoHold): string {
  const missing: string[] = [];
  if (player.credits < credits) missing.push(`${(credits - player.credits).toLocaleString()} credits`);
  for (const [id, amount] of Object.entries(cargo) as [CommodityId, number][]) {
    const shortage = amount - (player.cargo[id] ?? 0);
    if (shortage > 0) missing.push(`${shortage} ${commodityById[id].name}`);
  }
  return missing.length > 0 ? `Missing ${missing.join(", ")}.` : "";
}

function LoungeTab() {
  const currentSystem = useGameStore((state) => systemById[state.currentSystemId]);
  const marketState = useGameStore((state) => state.marketState);
  const economyEvents = useGameStore((state) => state.economyEvents);
  const supplyBrief = getMarketSupplyBrief(marketState, currentSystem.id, economyEvents);
  return (
    <div className="lounge">
      <h2>Lounge</h2>
      <p>Dockhands in {currentSystem.name} are comparing live stock sheets and supply pressure:</p>
      {supplyBrief.shortages.length > 0 ? (
        supplyBrief.shortages.map((signal) => (
          <p key={`short-${signal.stationId}-${signal.commodityId}`}>
            Shortage: {stationById[signal.stationId].name} needs {commodityById[signal.commodityId].name} · {signal.severity.toUpperCase()}
          </p>
        ))
      ) : (
        <p>No critical station shortages on the public sheet.</p>
      )}
      {supplyBrief.surpluses.map((signal) => (
        <p key={`surplus-${signal.stationId}-${signal.commodityId}`}>
          Surplus: {stationById[signal.stationId].name} is heavy on {commodityById[signal.commodityId].name}.
        </p>
      ))}
      {supplyBrief.recentEvents.map((event) => (
        <p key={event.id}>Supply feed: {event.message}</p>
      ))}
      <p>Favored live routes:</p>
      {supplyBrief.routes.map((hint) => (
        <p key={`${hint.commodityId}-${hint.fromStationId}-${hint.toStationId}`}>
          {hint.commodityName}: {hint.fromStationName} → {hint.toStationName} · +{hint.profit} cr/unit
        </p>
      ))}
      <p>Contract timers use shipboard time, so they keep moving while docked or browsing the map.</p>
    </div>
  );
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function formatCargo(cargo: CargoHold): string {
  return Object.entries(cargo)
    .map(([id, amount]) => `${amount} ${commodityById[id as CommodityId].name}`)
    .join(", ");
}
