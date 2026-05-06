import { describe, expect, it } from "vitest";
import { commodityById, stationById, systemById, shipById } from "../src/data/world";
import { buyCommodity, getCargoUsed, getCommodityPrice, sellCommodity } from "../src/systems/economy";
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
});
