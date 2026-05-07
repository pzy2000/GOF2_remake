import type { CommodityDefinition, CommodityId } from "../types/game";

export const commodities: CommodityDefinition[] = [
  { id: "basic-food", name: "Basic Food", techLevel: 1, basePrice: 18, mass: 1, legal: true, volatility: 0.1, category: "trade" },
  { id: "drinking-water", name: "Drinking Water", techLevel: 1, basePrice: 12, mass: 1, legal: true, volatility: 0.08, category: "trade" },
  { id: "electronics", name: "Electronics", techLevel: 2, basePrice: 74, mass: 1, legal: true, volatility: 0.16, category: "trade" },
  { id: "medical-supplies", name: "Medical Supplies", techLevel: 2, basePrice: 92, mass: 1, legal: true, volatility: 0.2, category: "trade" },
  { id: "luxury-goods", name: "Luxury Goods", techLevel: 3, basePrice: 140, mass: 1, legal: true, volatility: 0.24, category: "trade" },
  { id: "nanofibers", name: "Nanofibers", techLevel: 3, basePrice: 118, mass: 1, legal: true, volatility: 0.18, category: "trade" },
  { id: "energy-cells", name: "Energy Cells", techLevel: 1, basePrice: 48, mass: 1, legal: true, volatility: 0.12, category: "trade" },
  { id: "mechanical-parts", name: "Mechanical Parts", techLevel: 1, basePrice: 64, mass: 1, legal: true, volatility: 0.14, category: "trade" },
  { id: "microchips", name: "Microchips", techLevel: 3, basePrice: 130, mass: 1, legal: true, volatility: 0.22, category: "trade" },
  { id: "plastics", name: "Plastics", techLevel: 1, basePrice: 28, mass: 1, legal: true, volatility: 0.1, category: "trade" },
  { id: "chemicals", name: "Chemicals", techLevel: 2, basePrice: 56, mass: 1, legal: true, volatility: 0.18, category: "trade" },
  { id: "rare-plants", name: "Rare Plants", techLevel: 3, basePrice: 170, mass: 1, legal: true, volatility: 0.28, category: "trade" },
  { id: "rare-animals", name: "Rare Animals", techLevel: 3, basePrice: 220, mass: 1, legal: true, volatility: 0.32, category: "trade" },
  { id: "radioactive-materials", name: "Radioactive Materials", techLevel: 4, basePrice: 155, mass: 1, legal: true, volatility: 0.3, category: "trade" },
  { id: "noble-gas", name: "Noble Gas", techLevel: 3, basePrice: 98, mass: 1, legal: true, volatility: 0.16, category: "trade" },
  { id: "ship-components", name: "Ship Components", techLevel: 2, basePrice: 180, mass: 1, legal: true, volatility: 0.24, category: "trade" },
  { id: "optics", name: "Optics", techLevel: 3, basePrice: 112, mass: 1, legal: true, volatility: 0.2, category: "trade" },
  { id: "hydraulics", name: "Hydraulics", techLevel: 2, basePrice: 66, mass: 1, legal: true, volatility: 0.14, category: "trade" },
  { id: "data-cores", name: "Data Cores", techLevel: 4, basePrice: 260, mass: 1, legal: true, volatility: 0.34, category: "trade" },
  {
    id: "illegal-contraband",
    name: "Illegal Contraband",
    description:
      "Regional law: Helion Reach, Kuro Belt, and Mirr Vale fine and confiscate; Vantara and Celest Gate trigger hostile pursuit; Ashen Drift and PTD Home treat it as legal black-market cargo.",
    techLevel: 2,
    basePrice: 340,
    mass: 1,
    legal: false,
    volatility: 0.44,
    category: "restricted"
  },
  { id: "iron", name: "Iron", techLevel: 1, basePrice: 24, mass: 1, legal: true, volatility: 0.08, category: "ore" },
  { id: "titanium", name: "Titanium", techLevel: 2, basePrice: 72, mass: 1, legal: true, volatility: 0.16, category: "ore" },
  { id: "cesogen", name: "Cesogen", techLevel: 3, basePrice: 128, mass: 1, legal: true, volatility: 0.24, category: "ore" },
  { id: "gold", name: "Gold", techLevel: 3, basePrice: 210, mass: 1, legal: true, volatility: 0.3, category: "ore" },
  { id: "voidglass", name: "Voidglass", techLevel: 5, basePrice: 360, mass: 1, legal: true, volatility: 0.4, category: "ore" }
];

export const commodityById = Object.fromEntries(commodities.map((item) => [item.id, item])) as Record<
  CommodityId,
  CommodityDefinition
>;
