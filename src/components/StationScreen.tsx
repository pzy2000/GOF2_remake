import { useEffect, useRef, useState } from "react";
import type { CSSProperties, FocusEvent, KeyboardEvent, MouseEvent as ReactMouseEvent, MutableRefObject, ReactNode } from "react";
import { commodities, shipById, ships, stationById, systemById, useGameStore } from "../state/gameStore";
import { commodityById, equipmentById, equipmentName, explorationSignals, factionNames, glassWakeProtocol, missionTemplates } from "../data/world";
import { canCompleteMission, getAvailableMissionsForSystem, getMissionDeadlineRemaining } from "../systems/missions";
import {
  canBuyCommodityAtStation,
  getCommodityPrice,
  getMarketEntry,
  getMarketTag,
  getOccupiedCargo,
  getTradeHints,
  isCommodityVisibleInMarket
} from "../systems/economy";
import { reputationLabel } from "../systems/reputation";
import { GalaxyMap } from "./GalaxyMap";
import { AtlasIcon } from "./AtlasIcon";
import { SaveSlotsPanel } from "./SaveSlotsPanel";
import { getCommodityIcon, getEquipmentIcon, getFactionIcon } from "../data/iconAtlas";
import { getStoryProgress, storyStatusLabel } from "../systems/story";
import {
  canInstallEquipment,
  getEquipmentSlotUsage,
  getShipSlotCapacity,
  hasCraftMaterials
} from "../systems/equipment";
import { getContrabandLawSummary } from "../systems/combatAi";
import type { AssetManifest, CargoHold, CommodityId, EquipmentId, EquipmentSlotType, StationTab } from "../types/game";

const tabs: StationTab[] = ["Market", "Hangar", "Shipyard", "Mission Board", "Captain's Log", "Blueprint Workshop", "Lounge", "Galaxy Map"];
const craftable: EquipmentId[] = ["plasma-cannon", "shield-booster", "cargo-expansion", "scanner", "targeting-computer"];
const equipmentSlotOrder: EquipmentSlotType[] = ["primary", "secondary", "utility", "defense", "engineering"];
const equipmentSlotLabels: Record<EquipmentSlotType, string> = {
  primary: "Primary",
  secondary: "Secondary",
  utility: "Utility",
  defense: "Defense",
  engineering: "Engineering"
};

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

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setPopover(null);
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

  function open(id: EquipmentId, status: string, mode: EquipmentPopoverMode, element: HTMLElement) {
    setPopover({ id, status, mode, rect: element.getBoundingClientRect() });
  }

  function preview(id: EquipmentId, status: string, element: HTMLElement) {
    if (popover?.mode === "pinned") return;
    open(id, status, "preview", element);
  }

  function clearPreview() {
    setPopover((current) => (current?.mode === "preview" ? null : current));
  }

  function togglePinned(id: EquipmentId, status: string, element: HTMLElement) {
    setPopover((current) =>
      current?.id === id && current.mode === "pinned" ? null : { id, status, mode: "pinned", rect: element.getBoundingClientRect() }
    );
  }

  function getTriggerProps(id: EquipmentId, status: string) {
    return {
      onMouseEnter: (event: ReactMouseEvent<HTMLElement>) => preview(id, status, event.currentTarget),
      onMouseLeave: clearPreview,
      onFocus: (event: FocusEvent<HTMLElement>) => preview(id, status, event.currentTarget),
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
  if (!popover) return null;
  const equipment = equipmentById[popover.id];
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
          <p>{equipment.category} · {equipment.role}</p>
        </div>
        {popover.mode === "pinned" ? (
          <button className="equipment-popover-close" onClick={onClose} aria-label="Close equipment details">
            X
          </button>
        ) : null}
      </div>
      <p>{equipment.description}</p>
      <p className="equipment-effect">{equipment.effect}</p>
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
  if (!station) return null;
  const stationBackground: CSSProperties = {
    backgroundImage: `linear-gradient(rgba(3, 7, 18, 0.88), rgba(3, 7, 18, 0.96)), url(${manifest.nebulaBg})`
  };
  return (
    <main className="station-screen" style={stationBackground}>
      <header className="station-header">
        <div>
          <p className="station-autosave-note">
            {autoSaveTime ? `Auto-saved to Auto / Quick Slot · ${autoSaveTime}` : "Auto-save writes to Auto / Quick Slot"}
          </p>
          <p className="eyebrow">{station.archetype}</p>
          <h1>{station.name}</h1>
          <p>{factionNames[station.factionId]}</p>
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
      <section className="station-body">
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
  const listed = commodities.filter((item) => isCommodityVisibleInMarket(item.id, station, player.cargo));
  const occupiedCargo = getOccupiedCargo(player.cargo, activeMissions);
  return (
    <div className="table-panel">
        <h2>Market</h2>
        <p>Credits {player.credits.toLocaleString()} · Cargo {occupiedCargo}/{player.stats.cargoCapacity}</p>
        <div className="market-list">
          {listed.map((commodity) => {
            const canBuy = canBuyCommodityAtStation(commodity.id, station);
            const entry = getMarketEntry(marketState, station.id, commodity.id);
            const buyPrice = getCommodityPrice(commodity.id, station, system, reputation, "buy", entry);
            const sellPrice = getCommodityPrice(commodity.id, station, system, reputation, "sell", entry);
            const tag = getMarketTag(entry, station, system, commodity.id);
            return (
              <div className="market-row" key={commodity.id}>
                <AtlasIcon icon={getCommodityIcon(commodity.id)} manifest={manifest} />
                <div>
                  <strong>{commodity.name}</strong>
                  <span>{commodity.legal ? "Licensed" : "Restricted"} · Hold {player.cargo[commodity.id] ?? 0}</span>
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
        </div>
    </div>
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
  const completedMissionIds = useGameStore((state) => state.completedMissionIds);
  const failedMissionIds = useGameStore((state) => state.failedMissionIds);
  const gameClock = useGameStore((state) => state.gameClock);
  const acceptMission = useGameStore((state) => state.acceptMission);
  const completeMission = useGameStore((state) => state.completeMission);
  const reputation = useGameStore((state) => state.reputation);
  const available = getAvailableMissionsForSystem(missionTemplates, currentSystemId, activeMissions, completedMissionIds, failedMissionIds);
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
            return (
              <article key={mission.id} className="mission-card">
                <div className="mission-title">
                  <AtlasIcon icon={getFactionIcon(mission.factionId)} manifest={manifest} size={40} />
                  <h3>{mission.title}</h3>
                  {storyChapter ? <span className="story-pill">Main Story {storyChapter.order.toString().padStart(2, "0")}</span> : null}
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
  const progress = getStoryProgress(glassWakeProtocol, missionTemplates, activeMissions, completedMissionIds, failedMissionIds);
  const current = progress.current;
  const currentMission = current?.mission;
  const currentOrigin = currentMission ? systemById[currentMission.originSystemId] : undefined;
  const currentDestination = currentMission ? stationById[currentMission.destinationStationId] : undefined;
  const completedExplorationLogs = explorationSignals.filter((signal) => explorationState.eventLogIds.includes(signal.id));
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
          {completedExplorationLogs.length === 0 ? (
            <p className="muted">No exploration logs recovered.</p>
          ) : (
            completedExplorationLogs.map((signal) => (
              <article key={signal.id} className="exploration-log-entry">
                <b>{signal.title}</b>
                <p>{signal.log}</p>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function currentObjectiveText(status: string, mission: typeof missionTemplates[number] | undefined, originName: string | undefined, destinationName: string | undefined): string {
  if (!mission) return "Signal source missing from mission registry.";
  if (status === "locked") return "Complete prior protocol entries to resolve the next trace.";
  if (status === "active") return `Complete ${mission.title} and report to ${destinationName ?? mission.destinationStationId}.`;
  if (status === "failed retry") return `Return to ${originName ?? mission.originSystemId} and retry ${mission.title}.`;
  return `Accept ${mission.title} from the ${originName ?? mission.originSystemId} Mission Board.`;
}

function BlueprintTab() {
  const manifest = useGameStore((state) => state.assetManifest);
  const player = useGameStore((state) => state.player);
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
            const canCraft = !!craftCost && player.credits >= craftCost.credits && hasCraftMaterials(player.cargo, craftCost.cargo);
            const missing = craftCost ? getCraftMissingText(player, craftCost.credits, craftCost.cargo) : "No blueprint data.";
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
                <p>{equipment.category} · {equipmentSlotLabels[equipment.slotType]} slot</p>
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
  const hints = getTradeHints(marketState, 3);
  return (
    <div className="lounge">
      <h2>Lounge</h2>
      <p>Dockhands in {currentSystem.name} are comparing live stock sheets and favor these runs:</p>
      {hints.map((hint) => (
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
