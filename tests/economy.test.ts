import { describe, expect, it } from "vitest";
import { commodityById, stationById, systemById, shipById } from "../src/data/world";
import {
  advanceMarketState,
  buyCommodity,
  canBuyCommodityAtStation,
  createInitialMarketState,
  getCargoUsed,
  getCommodityPrice,
  getMarketEntry,
  getTradeHints,
  isCommodityVisibleInMarket,
  sellCommodity
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

  it("initializes stock entries for every station market", () => {
    const market = createInitialMarketState();
    expect(market["helion-prime"]?.["basic-food"]?.maxStock).toBeGreaterThan(0);
    expect(market["kuro-deep"]?.iron?.stock).toBeGreaterThan(0);
    expect(market["celest-vault"]?.["data-cores"]?.demand).toBeGreaterThan(1);
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
    expect(hints.some((hint) => hint.fromStationId === "kuro-deep" && ["mirr-lattice", "celest-vault"].includes(hint.toStationId))).toBe(true);
    expect(hints.some((hint) => stationById[hint.fromStationId].systemId === "helion-reach" && stationById[hint.toStationId].systemId === "ashen-drift")).toBe(true);
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
