import type { CommodityId, EquipmentId, FactionId } from "../types/game";

export type AtlasName = "commodity" | "equipment" | "faction";

export interface AtlasIconDefinition {
  atlas: AtlasName;
  index: number;
  columns: number;
  rows: number;
  label: string;
}

const commodityOrder: CommodityId[] = [
  "basic-food",
  "drinking-water",
  "electronics",
  "medical-supplies",
  "luxury-goods",
  "nanofibers",
  "energy-cells",
  "mechanical-parts",
  "microchips",
  "plastics",
  "chemicals",
  "rare-plants",
  "rare-animals",
  "radioactive-materials",
  "noble-gas",
  "ship-components"
];

const equipmentOrder: EquipmentId[] = [
  "pulse-laser",
  "plasma-cannon",
  "homing-missile",
  "mining-beam",
  "shield-booster",
  "cargo-expansion",
  "afterburner",
  "scanner",
  "armor-plating",
  "energy-reactor",
  "repair-drone",
  "targeting-computer"
];

const factionOrder: FactionId[] = [
  "solar-directorate",
  "vossari-clans",
  "mirr-collective",
  "free-belt-union",
  "independent-pirates",
  "unknown-drones"
];

const commodityFallbacks: Partial<Record<CommodityId, number>> = {
  iron: 0,
  titanium: 1,
  cesogen: 2,
  gold: 4,
  voidglass: 15,
  "data-cores": 8,
  optics: 2,
  hydraulics: 7,
  "illegal-contraband": 15
};

const equipmentFallbacks: Partial<Record<EquipmentId, number>> = {
  railgun: 1,
  "torpedo-rack": 2,
  "shield-matrix": 4,
  "survey-array": 7,
  "quantum-reactor": 9
};

function titleize(id: string): string {
  return id
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getAtlasPosition(index: number, columns: number, rows: number): string {
  const x = columns <= 1 ? 0 : (index % columns) / (columns - 1);
  const y = rows <= 1 ? 0 : Math.floor(index / columns) / (rows - 1);
  return `${(x * 100).toFixed(4)}% ${(y * 100).toFixed(4)}%`;
}

export function getAtlasBackgroundSize(columns: number, rows: number): string {
  return `${columns * 100}% ${rows * 100}%`;
}

export function getCommodityIcon(id: CommodityId | string): AtlasIconDefinition {
  const commodityId = id as CommodityId;
  const orderedIndex = commodityOrder.indexOf(commodityId);
  return {
    atlas: "commodity",
    index: orderedIndex >= 0 ? orderedIndex : commodityFallbacks[commodityId] ?? 15,
    columns: 4,
    rows: 4,
    label: titleize(id)
  };
}

export function getEquipmentIcon(id: EquipmentId | string): AtlasIconDefinition {
  const equipmentId = id as EquipmentId;
  const orderedIndex = equipmentOrder.indexOf(equipmentId);
  return {
    atlas: "equipment",
    index: orderedIndex >= 0 ? orderedIndex : equipmentFallbacks[equipmentId] ?? 7,
    columns: 4,
    rows: 3,
    label: titleize(id)
  };
}

export function getFactionIcon(id: FactionId | string): AtlasIconDefinition {
  const orderedIndex = factionOrder.indexOf(id as FactionId);
  return {
    atlas: "faction",
    index: orderedIndex >= 0 ? orderedIndex : 5,
    columns: 3,
    rows: 2,
    label: titleize(id)
  };
}
