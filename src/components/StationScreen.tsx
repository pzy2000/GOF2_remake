import { useEffect, useRef, useState } from "react";
import type { CSSProperties, FocusEvent, KeyboardEvent, MouseEvent as ReactMouseEvent, MutableRefObject, ReactNode } from "react";
import { commodities, shipById, ships, stationById, systemById, useGameStore } from "../state/gameStore";
import { commodityById, equipmentById, equipmentName, factionNames, missionTemplates } from "../data/world";
import { canCompleteMission, getMissionDeadlineRemaining } from "../systems/missions";
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
import type { AssetManifest, CargoHold, CommodityId, EquipmentId, StationTab } from "../types/game";

const tabs: StationTab[] = ["Market", "Hangar", "Shipyard", "Mission Board", "Blueprint Workshop", "Lounge", "Galaxy Map"];
const craftable: EquipmentId[] = ["plasma-cannon", "shield-booster", "cargo-expansion", "scanner", "targeting-computer"];

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
  const setStationTab = useGameStore((state) => state.setStationTab);
  const undock = useGameStore((state) => state.undock);
  const saveGame = useGameStore((state) => state.saveGame);
  if (!station) return null;
  return (
    <main className="station-screen">
      <header className="station-header">
        <div>
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
  const equipmentPopover = useEquipmentPopover();
  return (
    <>
      <div className="hangar-layout">
        <aside className="equipment-strip">
          {player.equipment.map((item) => (
            <EquipmentTrigger
              className="equipment-icon-trigger"
              equipmentId={item}
              getTriggerProps={equipmentPopover.getTriggerProps}
              key={item}
              status="Installed"
            >
              <AtlasIcon icon={getEquipmentIcon(item)} manifest={manifest} size={54} showTitle={false} />
            </EquipmentTrigger>
          ))}
        </aside>
        <div>
          <h2>Hangar</h2>
          <p>{shipById[player.shipId].name} · {shipById[player.shipId].role}</p>
          <div className="stat-grid">
            <span>Hull {Math.round(player.hull)}/{player.stats.hull}</span>
            <span>Shield {Math.round(player.shield)}/{player.stats.shield}</span>
            <span>Energy {Math.round(player.energy)}/{player.stats.energy}</span>
            <span>Cargo {getOccupiedCargo(player.cargo, activeMissions)}/{player.stats.cargoCapacity}</span>
            <span>Primary slots {player.stats.primarySlots}</span>
            <span>Secondary slots {player.stats.secondarySlots}</span>
          </div>
          <h3>Installed Equipment</h3>
          <div className="icon-chip-row">
            {player.equipment.map((item) => (
              <EquipmentTrigger
                className="icon-chip equipment-chip-trigger"
                equipmentId={item}
                getTriggerProps={equipmentPopover.getTriggerProps}
                key={item}
                status="Installed"
              >
                <AtlasIcon icon={getEquipmentIcon(item)} manifest={manifest} size={30} showTitle={false} />
                {equipmentName(item)}
              </EquipmentTrigger>
            ))}
          </div>
          <button className="primary" onClick={repairAndRefill}>Repair Hull and Refill Missiles</button>
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

function ShipyardTab() {
  const player = useGameStore((state) => state.player);
  const buyShip = useGameStore((state) => state.buyShip);
  return (
    <div>
      <h2>Shipyard</h2>
      <div className="ship-grid">
        {ships.map((ship) => (
          <article key={ship.id} className="ship-card">
            <h3>{ship.name}</h3>
            <p>{ship.role}</p>
            <p>Hull {ship.stats.hull} · Shield {ship.stats.shield} · Speed {ship.stats.speed} · Cargo {ship.stats.cargoCapacity}</p>
            <button disabled={player.ownedShips.includes(ship.id) || player.credits < ship.price} onClick={() => buyShip(ship.id)}>
              {player.ownedShips.includes(ship.id) ? "Owned" : `${ship.price.toLocaleString()} cr`}
            </button>
          </article>
        ))}
      </div>
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
  const available = missionTemplates.filter(
    (mission) => mission.originSystemId === currentSystemId && !completedMissionIds.includes(mission.id) && !failedMissionIds.includes(mission.id)
  );
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
      <div>
        <h2>Mission Board</h2>
        <div className="mission-list">
          {[...activeMissions, ...available.filter((mission) => !activeMissions.some((active) => active.id === mission.id))].map((mission) => {
            const active = activeMissions.some((item) => item.id === mission.id);
            const complete = active && canCompleteMission(mission, player, currentSystemId, currentStationId, runtime.destroyedPirates, gameClock);
            const remaining = getMissionDeadlineRemaining(mission, gameClock);
            return (
              <article key={mission.id} className="mission-card">
                <div className="mission-title">
                  <AtlasIcon icon={getFactionIcon(mission.factionId)} manifest={manifest} size={40} />
                  <h3>{mission.title}</h3>
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

function BlueprintTab() {
  const manifest = useGameStore((state) => state.assetManifest);
  const player = useGameStore((state) => state.player);
  const craftEquipment = useGameStore((state) => state.craftEquipment);
  const equipmentPopover = useEquipmentPopover();
  return (
    <>
      <div>
        <h2>Blueprint Workshop</h2>
        <div className="ship-grid">
          {craftable.map((id) => {
            const installed = player.equipment.includes(id);
            return (
              <article
                className="ship-card equipment-card equipment-trigger"
                key={id}
                role="button"
                tabIndex={0}
                {...equipmentPopover.getTriggerProps(id, installed ? "Installed" : "Craftable")}
              >
                <AtlasIcon icon={getEquipmentIcon(id)} manifest={manifest} size={52} showTitle={false} />
                <h3>{equipmentName(id)}</h3>
                <p>{equipmentById[id].category} upgrade · prototype fabrication</p>
                <button
                  disabled={installed}
                  onClick={(event) => {
                    event.stopPropagation();
                    craftEquipment(id);
                  }}
                >
                  {installed ? "Installed" : "Craft"}
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
