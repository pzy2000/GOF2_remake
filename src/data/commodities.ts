import type { CommodityDefinition, CommodityId } from "../types/game";

export const commodities: CommodityDefinition[] = [
  { id: "basic-food", name: "Basic Food", basePrice: 18, mass: 1, legal: true, volatility: 0.1, category: "trade" },
  { id: "drinking-water", name: "Drinking Water", basePrice: 12, mass: 1, legal: true, volatility: 0.08, category: "trade" },
  { id: "electronics", name: "Electronics", basePrice: 74, mass: 1, legal: true, volatility: 0.16, category: "trade" },
  { id: "medical-supplies", name: "Medical Supplies", basePrice: 92, mass: 1, legal: true, volatility: 0.2, category: "trade" },
  { id: "luxury-goods", name: "Luxury Goods", basePrice: 140, mass: 1, legal: true, volatility: 0.24, category: "trade" },
  { id: "nanofibers", name: "Nanofibers", basePrice: 118, mass: 1, legal: true, volatility: 0.18, category: "trade" },
  { id: "energy-cells", name: "Energy Cells", basePrice: 48, mass: 1, legal: true, volatility: 0.12, category: "trade" },
  { id: "mechanical-parts", name: "Mechanical Parts", basePrice: 64, mass: 1, legal: true, volatility: 0.14, category: "trade" },
  { id: "microchips", name: "Microchips", basePrice: 130, mass: 1, legal: true, volatility: 0.22, category: "trade" },
  { id: "plastics", name: "Plastics", basePrice: 28, mass: 1, legal: true, volatility: 0.1, category: "trade" },
  { id: "chemicals", name: "Chemicals", basePrice: 56, mass: 1, legal: true, volatility: 0.18, category: "trade" },
  { id: "rare-plants", name: "Rare Plants", basePrice: 170, mass: 1, legal: true, volatility: 0.28, category: "trade" },
  { id: "rare-animals", name: "Rare Animals", basePrice: 220, mass: 1, legal: true, volatility: 0.32, category: "trade" },
  { id: "radioactive-materials", name: "Radioactive Materials", basePrice: 155, mass: 1, legal: true, volatility: 0.3, category: "trade" },
  { id: "noble-gas", name: "Noble Gas", basePrice: 98, mass: 1, legal: true, volatility: 0.16, category: "trade" },
  { id: "ship-components", name: "Ship Components", basePrice: 180, mass: 1, legal: true, volatility: 0.24, category: "trade" },
  { id: "optics", name: "Optics", basePrice: 112, mass: 1, legal: true, volatility: 0.2, category: "trade" },
  { id: "hydraulics", name: "Hydraulics", basePrice: 66, mass: 1, legal: true, volatility: 0.14, category: "trade" },
  { id: "data-cores", name: "Data Cores", basePrice: 260, mass: 1, legal: true, volatility: 0.34, category: "trade" },
  {
    id: "illegal-contraband",
    name: "Illegal Contraband",
    description:
      "Regional law: Helion Reach, Kuro Belt, and Mirr Vale fine and confiscate; Vantara and Celest Gate trigger hostile pursuit; Ashen Drift and PTD Home treat it as legal black-market cargo.",
    basePrice: 340,
    mass: 1,
    legal: false,
    volatility: 0.44,
    category: "restricted"
  },
  { id: "iron", name: "Iron", basePrice: 24, mass: 1, legal: true, volatility: 0.08, category: "ore" },
  { id: "titanium", name: "Titanium", basePrice: 72, mass: 1, legal: true, volatility: 0.16, category: "ore" },
  { id: "cesogen", name: "Cesogen", basePrice: 128, mass: 1, legal: true, volatility: 0.24, category: "ore" },
  { id: "gold", name: "Gold", basePrice: 210, mass: 1, legal: true, volatility: 0.3, category: "ore" },
  { id: "voidglass", name: "Voidglass", basePrice: 360, mass: 1, legal: true, volatility: 0.4, category: "ore" }
];

export const commodityById = Object.fromEntries(commodities.map((item) => [item.id, item])) as Record<
  CommodityId,
  CommodityDefinition
>;
