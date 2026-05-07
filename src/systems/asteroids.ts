import type { AsteroidEntity, CommodityId } from "../types/game";
import { getOreHardness, getOreRarity } from "./difficulty";
import { orbitPoint } from "./math";

export const asteroidOreCycle: CommodityId[] = ["iron", "titanium", "cesogen", "gold", "voidglass"];

export function getAsteroidCountForSystem(systemId: string): number {
  return systemId === "kuro-belt" ? 16 : 10;
}

export function createAsteroidsForSystem(systemId: string, risk: number): AsteroidEntity[] {
  return Array.from({ length: getAsteroidCountForSystem(systemId) }, (_, index) => {
    const resource = asteroidOreCycle[index % asteroidOreCycle.length];
    return {
      id: `${systemId}-asteroid-${index}`,
      resource,
      position: orbitPoint(index + risk * 10, 240 + index * 22),
      radius: 20 + (index % 4) * 7,
      amount: 4 + (index % 5) * 2,
      miningProgress: 0,
      rarity: getOreRarity(resource),
      hardness: getOreHardness(resource)
    };
  });
}
