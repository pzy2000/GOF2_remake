export type Vec3 = [number, number, number];

export type OreRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type SaveSlotId = "manual-1" | "manual-2" | "manual-3" | "auto";

export interface SaveSlotSummary {
  id: SaveSlotId;
  label: string;
  exists: boolean;
  savedAt?: string;
  currentSystemId?: string;
  currentStationId?: string;
  credits?: number;
  gameClock?: number;
  version?: number;
}

export interface SaveIndex {
  version: number;
  slots: Partial<Record<SaveSlotId, SaveSlotSummary>>;
  lastPlayedSlotId?: SaveSlotId;
}

export type AudioEventName =
  | "ui-click"
  | "laser"
  | "missile"
  | "explosion"
  | "mining"
  | "loot"
  | "dock"
  | "undock"
  | "jump-gate"
  | "wormhole"
  | "mission-complete"
  | "mission-fail"
  | "low-hull"
  | "shield-break";

export type MusicMode = "safe" | "combat" | "station" | "silent";

export interface AudioSettings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  muted: boolean;
}

export type Screen =
  | "menu"
  | "flight"
  | "station"
  | "pause"
  | "galaxyMap"
  | "settings"
  | "credits"
  | "gameOver";

export type GalaxyMapMode = "browse" | "gate" | "station-route";

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
  systemSkyboxes: Record<string, string>;
  planetTextures: Record<string, string>;
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

export interface EquipmentDisplayStat {
  label: string;
  value: string;
}

export interface EquipmentModifiers {
  stats?: Partial<Pick<ShipStats, "hull" | "shield" | "energy" | "cargoCapacity">>;
  afterburnerMultiplier?: number;
  afterburnerEnergyDrain?: number;
  energyRegenBonus?: number;
  hullRegenPerSecond?: number;
  hullRegenDelay?: number;
  scannerRangeBonus?: number;
  miningHudRangeBonus?: number;
  weaponCooldownMultiplier?: number;
}

export interface EquipmentDefinition {
  id: EquipmentId;
  name: string;
  category: "Primary Weapon" | "Secondary Weapon" | "Utility" | "Defense" | "Engineering";
  role: string;
  description: string;
  effect: string;
  displayStats: EquipmentDisplayStat[];
  modifiers?: EquipmentModifiers;
  weapon?: WeaponDefinition;
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
  planetId: string;
  position: Vec3;
}

export interface PlanetDefinition {
  id: string;
  name: string;
  type: string;
  description: string;
  systemId: string;
  stationId: string;
  textureKey: string;
  position: Vec3;
  beaconPosition: Vec3;
  radius: number;
  atmosphereColor: string;
}

export interface StarSystemDefinition {
  id: string;
  name: string;
  description: string;
  factionId: FactionId;
  risk: number;
  position: [number, number];
  skyboxKey: string;
  jumpGatePosition: Vec3;
  planetIds: string[];
  stationIds: string[];
  marketBias: Partial<Record<CommodityId, number>>;
}

export interface JumpGateDefinition {
  id: string;
  systemId: string;
  name: string;
  position: Vec3;
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
  deadlineSeconds?: number;
  acceptedAt?: number;
  failed?: boolean;
  failureReason?: string;
  failureReputationDelta?: number;
  passengerCount?: number;
  consumeCargoOnComplete?: boolean;
  escort?: {
    convoyId: string;
    convoyName: string;
    originPosition: Vec3;
    destinationPosition: Vec3;
    hull: number;
    arrived?: boolean;
  };
  salvage?: {
    salvageId: string;
    name: string;
    systemId: string;
    position: Vec3;
    commodityId: CommodityId;
    amount: number;
    recovered?: boolean;
  };
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

export interface ConvoyEntity {
  id: string;
  missionId: string;
  name: string;
  factionId: FactionId;
  position: Vec3;
  velocity: Vec3;
  hull: number;
  maxHull: number;
  shield: number;
  maxShield: number;
  lastDamageAt: number;
  destinationStationId: string;
  destinationPosition: Vec3;
  arrived: boolean;
}

export interface SalvageEntity {
  id: string;
  missionId: string;
  name: string;
  commodityId: CommodityId;
  amount: number;
  position: Vec3;
  recovered: boolean;
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
  kind: "hit" | "shield-hit" | "explosion" | "damage-text" | "mining-beam" | "gate-spool" | "wormhole" | "nav-ring";
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

export type AutoPilotPhase =
  | "to-origin-gate"
  | "gate-activation"
  | "wormhole"
  | "to-destination-station"
  | "docking";

export interface AutoPilotState {
  phase: AutoPilotPhase;
  originSystemId: string;
  targetSystemId: string;
  targetStationId: string;
  targetPosition: Vec3;
  timer: number;
  cancelable: boolean;
}

export interface RuntimeState {
  enemies: FlightEntity[];
  convoys: ConvoyEntity[];
  salvage: SalvageEntity[];
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

export interface MarketEntry {
  stock: number;
  maxStock: number;
  baselineStock: number;
  demand: number;
  baselineDemand: number;
}

export type MarketState = Record<string, Partial<Record<CommodityId, MarketEntry>>>;

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
  gameClock: number;
  player: PlayerState;
  activeMissions: MissionDefinition[];
  completedMissionIds: string[];
  failedMissionIds: string[];
  marketState: MarketState;
  reputation: ReputationState;
  knownSystems: string[];
  knownPlanetIds: string[];
}
