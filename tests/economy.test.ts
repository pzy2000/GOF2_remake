import { describe, expect, it } from "vitest";
import { commodityById, stationById, systemById, shipById } from "../src/data/world";
import {
  advanceMarketState,
  buyCommodity,
  buyEquipment,
  canBuyCommodityAtStation,
  canBuyEquipmentAtStation,
  createInitialMarketState,
  getCargoUsed,
  getCommodityPrice,
  getEquipmentPrice,
  getMarketEntry,
  getTradeHints,
  isCommodityVisibleInMarket,
  sellCommodity,
  sellEquipment
} from "../src/systems/economy";
import type { PlayerState } from "../src/types/game";

function player(): PlayerState {
  const ship = shipById["sparrow-mk1"];
  return {
    shipId: ship.id,
    stats: ship.stats,
    hull: ship.stats.hull,
    shield: ship.stats.shield,
    energy: ship.stats.energy,
    credits: 1000,
    cargo: {},
    equipment: ship.equipment,
    missiles: 4,
    ownedShips: [ship.id],
    position: [0, 0, 0],
    velocity: [0, 0, 0],
    rotation: [0, 0, 0],
    throttle: 0,
    lastDamageAt: -999
  };
}

describe("economy", () => {
  it("calculates deterministic station-sensitive prices", () => {
    const helion = systemById["helion-reach"];
    const station = stationById["helion-prime"];
    const first = getCommodityPrice("electronics", station, helion, 10, "buy");
    const second = getCommodityPrice("electronics", station, helion, 10, "buy");
    expect(first).toBe(second);
    expect(first).toBeGreaterThan(commodityById.electronics.basePrice);
  });

  it("buys and sells while respecting cargo capacity", () => {
    const kuro = systemById["kuro-belt"];
    const station = stationById["kuro-deep"];
    const start = player();
    const bought = buyCommodity(start, station, kuro, "iron", 5);
    expect(bought.ok).toBe(true);
    expect(getCargoUsed(bought.player.cargo)).toBe(5);
    const sold = sellCommodity(bought.player, station, kuro, "iron", 2);
    expect(sold.ok).toBe(true);
    expect(sold.player.cargo.iron).toBe(3);
    const overfill = buyCommodity({ ...sold.player, stats: { ...sold.player.stats, cargoCapacity: 3 } }, station, kuro, "titanium", 1);
    expect(overfill.ok).toBe(false);
  });

  it("shows held ore anywhere but stocks ore only at ore markets", () => {
    const helion = systemById["helion-reach"];
    const tradeHub = stationById["helion-prime"];
    const miningStation = stationById["kuro-deep"];
    const start = player();

    expect(isCommodityVisibleInMarket("iron", tradeHub, start.cargo)).toBe(false);
    expect(canBuyCommodityAtStation("iron", tradeHub)).toBe(false);

    const carryingOre = { ...start, cargo: { iron: 2 } };
    expect(isCommodityVisibleInMarket("iron", tradeHub, carryingOre.cargo)).toBe(true);
    expect(canBuyCommodityAtStation("iron", tradeHub)).toBe(false);
    expect(buyCommodity(carryingOre, tradeHub, helion, "iron", 1).ok).toBe(false);

    expect(isCommodityVisibleInMarket("iron", miningStation, start.cargo)).toBe(true);
    expect(canBuyCommodityAtStation("iron", miningStation)).toBe(true);
    expect(isCommodityVisibleInMarket("basic-food", tradeHub, start.cargo)).toBe(true);
    expect(canBuyCommodityAtStation("basic-food", tradeHub)).toBe(true);
  });

  it("gates commodity listings by station tech level", () => {
    const lowTechStation = stationById["helion-prime"];
    const highTechStation = stationById["pearl-consulate"];
    const start = player();

    expect(lowTechStation.techLevel).toBeLessThan(commodityById["data-cores"].techLevel);
    expect(canBuyCommodityAtStation("data-cores", lowTechStation)).toBe(false);
    expect(isCommodityVisibleInMarket("data-cores", lowTechStation, start.cargo)).toBe(false);
    expect(isCommodityVisibleInMarket("data-cores", lowTechStation, { "data-cores": 1 })).toBe(true);

    expect(canBuyCommodityAtStation("data-cores", highTechStation)).toBe(true);
  });

  it("initializes stock entries for every station market", () => {
    const market = createInitialMarketState();
    expect(market["helion-prime"]?.["basic-food"]?.maxStock).toBeGreaterThan(0);
    expect(market["kuro-deep"]?.iron?.stock).toBeGreaterThan(0);
    expect(market["celest-vault"]?.["data-cores"]?.demand).toBeGreaterThan(1);
    expect(market["pearl-consulate"]?.["quantum-reactor"]?.maxStock).toBeGreaterThan(0);
  });

  it("buys and sells equipment as market inventory without using cargo", () => {
    const market = createInitialMarketState();
    const system = systemById["helion-reach"];
    const station = stationById["helion-prime"];
    const start = { ...player(), credits: 5000 };
    const entry = getMarketEntry(market, station.id, "shield-booster");
    const price = getEquipmentPrice("shield-booster", station, system, 0, "buy", entry);

    expect(canBuyEquipmentAtStation("shield-booster", station)).toBe(true);
    const bought = buyEquipment(start, station, system, "shield-booster", 1, 0, market);
    expect(bought.ok).toBe(true);
    expect(bought.total).toBe(price);
    expect(bought.player.equipmentInventory?.["shield-booster"]).toBe(1);
    expect(getCargoUsed(bought.player.cargo)).toBe(0);

    const sold = sellEquipment(bought.player, station, system, "shield-booster", 1, 0, bought.marketState);
    expect(sold.ok).toBe(true);
    expect(sold.player.equipmentInventory?.["shield-booster"]).toBeUndefined();
    expect(sold.player.credits).toBeGreaterThan(start.credits - price);
  });

  it("blocks equipment above station tech level", () => {
    const market = createInitialMarketState();
    const station = stationById["helion-prime"];
    const system = systemById["helion-reach"];
    expect(canBuyEquipmentAtStation("quantum-reactor", station)).toBe(false);
    expect(buyEquipment({ ...player(), credits: 100000 }, station, system, "quantum-reactor", 1, 0, market).ok).toBe(false);
  });

  it("updates stock and prices after player buy and sell transactions", () => {
    const market = createInitialMarketState();
    const kuro = systemById["kuro-belt"];
    const station = stationById["kuro-deep"];
    const before = getMarketEntry(market, station.id, "iron");
    const firstPrice = getCommodityPrice("iron", station, kuro, 0, "buy", before);
    const bought = buyCommodity(player(), station, kuro, "iron", 3, 0, market);
    expect(bought.ok).toBe(true);
    const afterBuy = getMarketEntry(bought.marketState!, station.id, "iron");
    expect(afterBuy.stock).toBeLessThan(before.stock);
    expect(getCommodityPrice("iron", station, kuro, 0, "buy", afterBuy)).toBeGreaterThanOrEqual(firstPrice);

    const sold = sellCommodity(bought.player, station, kuro, "iron", 2, 0, bought.marketState);
    expect(sold.ok).toBe(true);
    const afterSell = getMarketEntry(sold.marketState!, station.id, "iron");
    expect(afterSell.stock).toBeGreaterThan(afterBuy.stock);
  });

  it("finds profitable route hints across biased systems", () => {
    const hints = getTradeHints(createInitialMarketState(), 200);
    expect(hints.some((hint) => hint.fromStationId === "zenith-skydock" && hint.toStationId === "mirr-lattice" && hint.commodityId === "voidglass")).toBe(true);
    expect(hints.some((hint) => stationById[hint.fromStationId].systemId === "ashen-drift" && stationById[hint.toStationId].systemId === "vantara")).toBe(true);
    expect(hints.some((hint) => hint.fromStationId === "black-arcade" && hint.profit > 0)).toBe(true);
  });

  it("slowly recovers market stock and demand toward baseline", () => {
    const market = createInitialMarketState();
    const bought = buyCommodity(player(), stationById["kuro-deep"], systemById["kuro-belt"], "iron", 5, 0, market);
    const depleted = getMarketEntry(bought.marketState!, "kuro-deep", "iron");
    const recovered = getMarketEntry(advanceMarketState(bought.marketState!, 60), "kuro-deep", "iron");
    expect(recovered.stock).toBeGreaterThan(depleted.stock);
    expect(Math.abs(recovered.demand - depleted.baselineDemand)).toBeLessThan(Math.abs(depleted.demand - depleted.baselineDemand));
  });
});
