export type Vec3 = [number, number, number];

export type OreRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type Screen =
  | "menu"
  | "flight"
  | "station"
  | "pause"
  | "galaxyMap"
  | "settings"
  | "credits"
  | "gameOver";

export type StationTab =
  | "Market"
  | "Hangar"
  | "Shipyard"
  | "Mission Board"
  | "Blueprint Workshop"
  | "Lounge"
  | "Galaxy Map";

export type FactionId =
  | "solar-directorate"
  | "vossari-clans"
  | "mirr-collective"
  | "free-belt-union"
  | "independent-pirates"
  | "unknown-drones";

export type StationArchetype =
  | "Trade Hub"
  | "Mining Station"
  | "Research Station"
  | "Military Outpost"
  | "Frontier Port"
  | "Pirate Black Market";

export type CommodityId =
  | "basic-food"
  | "drinking-water"
  | "electronics"
  | "medical-supplies"
  | "luxury-goods"
  | "nanofibers"
  | "energy-cells"
  | "mechanical-parts"
  | "microchips"
  | "plastics"
  | "chemicals"
  | "rare-plants"
  | "rare-animals"
  | "radioactive-materials"
  | "noble-gas"
  | "ship-components"
  | "optics"
  | "hydraulics"
  | "data-cores"
  | "illegal-contraband"
  | "iron"
  | "titanium"
  | "cesogen"
  | "gold"
  | "voidglass";

export type EquipmentId =
  | "pulse-laser"
  | "plasma-cannon"
  | "homing-missile"
  | "mining-beam"
  | "shield-booster"
  | "cargo-expansion"
  | "afterburner"
  | "scanner"
  | "armor-plating"
  | "energy-reactor"
  | "repair-drone"
  | "targeting-computer";

export interface AssetManifest {
  keyArt: string;
  commodityIcons: string;
  equipmentIcons: string;
  nebulaBg: string;
  skyboxPanorama: string;
  asteroidTextures: string;
  factionEmblems: string;
  hudOverlay: string;
}

export interface ShipStats {
  hull: number;
  shield: number;
  energy: number;
  speed: number;
  handling: number;
  cargoCapacity: number;
  primarySlots: number;
  secondarySlots: number;
  utilitySlots: number;
}

export interface ShipDefinition {
  id: string;
  name: string;
  role: string;
  price: number;
  stats: ShipStats;
  equipment: EquipmentId[];
}

export interface WeaponDefinition {
  id: EquipmentId;
  name: string;
  damage: number;
  energyCost: number;
  cooldown: number;
  range: number;
  speed: number;
  kind: "primary" | "secondary" | "utility";
}

export interface CommodityDefinition {
  id: CommodityId;
  name: string;
  basePrice: number;
  mass: number;
  legal: boolean;
  volatility: number;
  category: "trade" | "ore" | "restricted";
}

export interface CargoStack {
  commodityId: CommodityId;
  amount: number;
}

export type CargoHold = Partial<Record<CommodityId, number>>;

export interface StationDefinition {
  id: string;
  name: string;
  archetype: StationArchetype;
  factionId: FactionId;
  systemId: string;
  position: Vec3;
}

export interface StarSystemDefinition {
  id: string;
  name: string;
  description: string;
  factionId: FactionId;
  risk: number;
  position: [number, number];
  stationIds: string[];
  marketBias: Partial<Record<CommodityId, number>>;
}

export interface MissionDefinition {
  id: string;
  title: string;
  type:
    | "Courier delivery"
    | "Cargo transport"
    | "Passenger transport"
    | "Pirate bounty"
    | "Escort convoy"
    | "Mining contract"
    | "Recovery/salvage";
  originSystemId: string;
  destinationSystemId: string;
  destinationStationId: string;
  factionId: FactionId;
  description: string;
  reward: number;
  cargoRequired?: CargoHold;
  cargoProvided?: CargoHold;
  targetCommodityId?: CommodityId;
  targetAmount?: number;
  accepted?: boolean;
  completed?: boolean;
}

export interface ReputationState {
  factions: Record<FactionId, number>;
}

export interface PlayerState {
  shipId: string;
  stats: ShipStats;
  hull: number;
  shield: number;
  energy: number;
  credits: number;
  cargo: CargoHold;
  equipment: EquipmentId[];
  missiles: number;
  ownedShips: string[];
  position: Vec3;
  velocity: Vec3;
  rotation: Vec3;
  throttle: number;
  lastDamageAt: number;
}

export interface FlightEntity {
  id: string;
  name: string;
  role: "pirate" | "patrol" | "trader";
  factionId: FactionId;
  position: Vec3;
  velocity: Vec3;
  hull: number;
  shield: number;
  maxHull: number;
  maxShield: number;
  lastDamageAt: number;
  fireCooldown: number;
  deathTimer?: number;
}

export interface AsteroidEntity {
  id: string;
  resource: CommodityId;
  position: Vec3;
  radius: number;
  amount: number;
  miningProgress: number;
  rarity: OreRarity;
  hardness: number;
}

export interface LootEntity {
  id: string;
  commodityId: CommodityId;
  amount: number;
  position: Vec3;
  velocity: Vec3;
  rarity: OreRarity;
}

export interface ProjectileEntity {
  id: string;
  owner: "player" | "enemy" | "patrol";
  kind: "laser" | "missile" | "mining";
  position: Vec3;
  direction: Vec3;
  speed: number;
  damage: number;
  life: number;
  targetId?: string;
}

export interface VisualEffectEntity {
  id: string;
  kind: "hit" | "shield-hit" | "explosion" | "damage-text" | "mining-beam";
  position: Vec3;
  endPosition?: Vec3;
  velocity?: Vec3;
  color: string;
  secondaryColor?: string;
  label?: string;
  particleCount?: number;
  spread?: number;
  size: number;
  life: number;
  maxLife: number;
}

export interface RuntimeState {
  enemies: FlightEntity[];
  asteroids: AsteroidEntity[];
  loot: LootEntity[];
  projectiles: ProjectileEntity[];
  effects: VisualEffectEntity[];
  destroyedPirates: number;
  mined: CargoHold;
  clock: number;
  graceUntil: number;
  message: string;
}

export interface FlightInput {
  throttleUp: boolean;
  throttleDown: boolean;
  rollLeft: boolean;
  rollRight: boolean;
  afterburner: boolean;
  firePrimary: boolean;
  fireSecondary: boolean;
  interact: boolean;
  cycleTarget: boolean;
  toggleMap: boolean;
  toggleCamera: boolean;
  pause: boolean;
  mouseDX: number;
  mouseDY: number;
}

export interface SaveGameData {
  version: number;
  savedAt: string;
  currentSystemId: string;
  currentStationId?: string;
  player: PlayerState;
  activeMissions: MissionDefinition[];
  completedMissionIds: string[];
  reputation: ReputationState;
  knownSystems: string[];
}
