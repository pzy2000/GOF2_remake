import { commodities, shipById, ships, stationById, systemById, useGameStore } from "../state/gameStore";
import { commodityById, factionNames, missionTemplates, weapons } from "../data/world";
import { canCompleteMission } from "../systems/missions";
import { canBuyCommodityAtStation, getCargoUsed, getCommodityPrice, isCommodityVisibleInMarket } from "../systems/economy";
import { reputationLabel } from "../systems/reputation";
import { GalaxyMap } from "./GalaxyMap";
import { AtlasIcon } from "./AtlasIcon";
import { getCommodityIcon, getEquipmentIcon, getFactionIcon } from "../data/iconAtlas";
import type { CommodityId, EquipmentId, StationTab } from "../types/game";

const tabs: StationTab[] = ["Market", "Hangar", "Shipyard", "Mission Board", "Blueprint Workshop", "Lounge", "Galaxy Map"];
const craftable: EquipmentId[] = ["plasma-cannon", "shield-booster", "cargo-expansion", "scanner", "targeting-computer"];

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
          <button onClick={saveGame}>Save</button>
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
  const buy = useGameStore((state) => state.buy);
  const sell = useGameStore((state) => state.sell);
  const listed = commodities.filter((item) => isCommodityVisibleInMarket(item.id, station, player.cargo));
  return (
    <div className="table-panel">
        <h2>Market</h2>
        <p>Credits {player.credits.toLocaleString()} · Cargo {getCargoUsed(player.cargo)}/{player.stats.cargoCapacity}</p>
        <div className="market-list">
          {listed.map((commodity) => {
            const canBuy = canBuyCommodityAtStation(commodity.id, station);
            const buyPrice = getCommodityPrice(commodity.id, station, system, reputation, "buy");
            const sellPrice = getCommodityPrice(commodity.id, station, system, reputation, "sell");
            return (
              <div className="market-row" key={commodity.id}>
                <AtlasIcon icon={getCommodityIcon(commodity.id)} manifest={manifest} />
                <div>
                  <strong>{commodity.name}</strong>
                  <span>{commodity.legal ? "Licensed" : "Restricted"} · Hold {player.cargo[commodity.id] ?? 0}</span>
                </div>
                <b>{canBuy ? buyPrice : "—"}/{sellPrice} cr</b>
                <button
                  onClick={() => buy(commodity.id, 1)}
                  disabled={!canBuy}
                  title={canBuy ? undefined : "Not stocked at this station"}
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
  const repairAndRefill = useGameStore((state) => state.repairAndRefill);
  return (
    <div className="hangar-layout">
      <aside className="equipment-strip">
        {player.equipment.map((item) => (
          <AtlasIcon key={item} icon={getEquipmentIcon(item)} manifest={manifest} size={54} />
        ))}
      </aside>
      <div>
        <h2>Hangar</h2>
        <p>{shipById[player.shipId].name} · {shipById[player.shipId].role}</p>
        <div className="stat-grid">
          <span>Hull {Math.round(player.hull)}/{player.stats.hull}</span>
          <span>Shield {Math.round(player.shield)}/{player.stats.shield}</span>
          <span>Energy {Math.round(player.energy)}/{player.stats.energy}</span>
          <span>Cargo {getCargoUsed(player.cargo)}/{player.stats.cargoCapacity}</span>
          <span>Primary slots {player.stats.primarySlots}</span>
          <span>Secondary slots {player.stats.secondarySlots}</span>
        </div>
        <h3>Installed Equipment</h3>
        <div className="icon-chip-row">
          {player.equipment.map((item) => (
            <span className="icon-chip" key={item}>
              <AtlasIcon icon={getEquipmentIcon(item)} manifest={manifest} size={30} />
              {equipmentName(item)}
            </span>
          ))}
        </div>
        <button className="primary" onClick={repairAndRefill}>Repair Hull and Refill Missiles</button>
      </div>
    </div>
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
  const acceptMission = useGameStore((state) => state.acceptMission);
  const completeMission = useGameStore((state) => state.completeMission);
  const reputation = useGameStore((state) => state.reputation);
  const available = missionTemplates.filter((mission) => mission.originSystemId === currentSystemId && !completedMissionIds.includes(mission.id));
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
            const complete = active && canCompleteMission(mission, player, currentSystemId, currentStationId, runtime.destroyedPirates);
            return (
              <article key={mission.id} className="mission-card">
                <div className="mission-title">
                  <AtlasIcon icon={getFactionIcon(mission.factionId)} manifest={manifest} size={40} />
                  <h3>{mission.title}</h3>
                </div>
                <p>{mission.type} · {factionNames[mission.factionId]} · Reward {mission.reward} cr</p>
                <p>{mission.description}</p>
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
  return (
    <div>
        <h2>Blueprint Workshop</h2>
        <div className="ship-grid">
          {craftable.map((id) => (
            <article className="ship-card" key={id}>
              <AtlasIcon icon={getEquipmentIcon(id)} manifest={manifest} size={52} />
              <h3>{equipmentName(id)}</h3>
              <p>{weapons[id]?.kind ?? "utility"} upgrade · prototype fabrication</p>
              <button disabled={player.equipment.includes(id)} onClick={() => craftEquipment(id)}>
                {player.equipment.includes(id) ? "Installed" : "Craft"}
              </button>
            </article>
          ))}
        </div>
    </div>
  );
}

function LoungeTab() {
  const currentSystem = useGameStore((state) => systemById[state.currentSystemId]);
  return (
    <div className="lounge">
      <h2>Lounge</h2>
      <p>
        Dockhands in {currentSystem.name} say any market will buy ore already in your hold, but mining stations
        and black markets are the ones that stock it.
      </p>
      <p>Patrol captains are quietly posting bounty work wherever Independent Pirates pressure the lanes.</p>
      <p>Pirate black markets buy restricted cargo cheaply, but civilized stations charge a heavy risk premium.</p>
    </div>
  );
}

function equipmentName(id: EquipmentId | string): string {
  return {
    "pulse-laser": "Pulse Laser",
    "plasma-cannon": "Plasma Cannon",
    "homing-missile": "Homing Missile",
    "mining-beam": "Mining Beam",
    "shield-booster": "Shield Booster",
    "cargo-expansion": "Cargo Expansion",
    "afterburner": "Afterburner",
    "scanner": "Scanner",
    "armor-plating": "Armor Plating",
    "energy-reactor": "Energy Reactor",
    "repair-drone": "Repair Drone",
    "targeting-computer": "Targeting Computer"
  }[id] ?? id;
}
