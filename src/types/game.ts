export type Vec3 = [number, number, number];

export type OreRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type TechLevel = 1 | 2 | 3 | 4 | 5;

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
  | "shield-break"
  | "comms-open";

export type MusicMode = "safe" | "combat" | "station" | "silent";

export interface AudioSettings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  voiceVolume: number;
  muted: boolean;
}

export type Screen =
  | "menu"
  | "flight"
  | "economyWatch"
  | "station"
  | "pause"
  | "galaxyMap"
  | "settings"
  | "credits"
  | "gameOver";

export type GalaxyMapMode = "browse" | "gate" | "station-route";

export type StationTab =
  | "Market"
  | "Economy"
  | "Hangar"
  | "Shipyard"
  | "Mission Board"
  | "Captain's Log"
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

export type FactionStandingTier = "kill-on-sight" | "hostile" | "neutral" | "friendly" | "allied";

export type StationServiceId =
  | "commodity-buy"
  | "equipment-buy"
  | "repair"
  | "shipyard-buy"
  | "mission-accept"
  | "blueprint-workshop"
  | "amnesty-broker";

export type StationArchetype =
  | "Trade Hub"
  | "Mining Station"
  | "Research Station"
  | "Military Outpost"
  | "Frontier Port"
  | "Pirate Black Market";

export interface MusicTrackManifest {
  systems: Record<string, string>;
  stationArchetypes: Partial<Record<StationArchetype, string>>;
  combat: string;
}

export interface ShipMaterialProfile {
  baseColor: string;
  trimColor: string;
  emissiveColor: string;
  metalness: number;
  roughness: number;
}

export interface ShipAttachmentProfile {
  engineHardpoints: number[][];
  primaryHardpoints: number[][];
  secondaryHardpoints: number[][];
}

export interface VfxCueManifest {
  hit: string;
  shieldHit: string;
  explosion: string;
  afterburner: string;
  targetLock: string;
}

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
  | "railgun"
  | "homing-missile"
  | "torpedo-rack"
  | "mining-beam"
  | "industrial-mining-beam"
  | "shield-booster"
  | "shield-matrix"
  | "cargo-expansion"
  | "ore-processor"
  | "shielded-holds"
  | "afterburner"
  | "scanner"
  | "survey-array"
  | "decoy-transponder"
  | "weapon-amplifier"
  | "survey-lab"
  | "armor-plating"
  | "energy-reactor"
  | "quantum-reactor"
  | "repair-drone"
  | "targeting-computer"
  | "echo-nullifier"
  | "relic-cartographer"
  | "obsidian-bulwark"
  | "parallax-lance"
  | "moth-choir-torpedo"
  | "crownshade-singularity-core";

export type EquipmentSlotType = "primary" | "secondary" | "utility" | "defense" | "engineering";

export type EquipmentInventory = Partial<Record<EquipmentId, number>>;

export interface AssetManifest {
  keyArt: string;
  commodityIcons: string;
  equipmentIcons: string;
  nebulaBg: string;
  skyboxPanorama: string;
  systemSkyboxes: Record<string, string>;
  starSprites: Record<string, string>;
  planetTextures: Record<string, string>;
  shipModels: Record<string, string>;
  shipMaterialProfiles: Record<string, ShipMaterialProfile>;
  shipAttachmentProfiles: Record<string, ShipAttachmentProfile>;
  npcShipTextures: {
    freighter: string;
  };
  speakerPortraits: Record<string, string>;
  storyCinematics: Record<string, string>;
  voiceClips: Record<string, string>;
  asteroidTextures: string;
  factionEmblems: string;
  hudOverlay: string;
  assetCredits: AssetCredit[];
  vfxCues: VfxCueManifest;
  musicTracks: MusicTrackManifest;
}

export interface AssetCredit {
  title: string;
  author: string;
  sourceUrl: string;
  license: string;
  licenseUrl?: string;
  assetPath: string;
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
  defenseSlots: number;
  engineeringSlots: number;
}

export type ShipCareer = "starter" | "hauler" | "miner" | "smuggler" | "fighter" | "gunship" | "explorer";

export interface ShipTraitDefinition {
  name: string;
  description: string;
  modifiers: EquipmentModifiers;
}

export interface ShipPurchaseRequirement {
  stationArchetypes?: StationArchetype[];
  minTechLevel?: TechLevel;
  requiredUnlockedBlueprintIds?: EquipmentId[];
}

export interface ShipDefinition {
  id: string;
  name: string;
  role: string;
  price: number;
  stats: ShipStats;
  equipment: EquipmentId[];
  career?: ShipCareer;
  trait?: ShipTraitDefinition;
  purchaseRequirement?: ShipPurchaseRequirement;
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

export interface EquipmentCraftCost {
  credits: number;
  cargo: CargoHold;
}

export type BlueprintPath = "combat" | "defense" | "exploration" | "engineering";

export interface BlueprintUnlockCost {
  credits: number;
  cargo?: CargoHold;
}

export interface BlueprintDefinition {
  equipmentId: EquipmentId;
  path: BlueprintPath;
  tier: number;
  prerequisiteEquipmentIds?: EquipmentId[];
  unlockCost: BlueprintUnlockCost;
  starterUnlocked?: boolean;
  rewardOnly?: boolean;
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
  miningProgressMultiplier?: number;
  miningYieldBonus?: number;
  miningEnergyDrainMultiplier?: number;
  signalScanRangeBonus?: number;
  signalScanBandBonus?: number;
  signalScanRateMultiplier?: number;
  weaponCooldownMultiplier?: number;
  weaponDamageMultiplier?: number;
  weaponEnergyCostMultiplier?: number;
  contrabandScanProgressMultiplier?: number;
  contrabandFineMultiplier?: number;
  echoLockRangeBonus?: number;
  echoLockRateMultiplier?: number;
}

export interface EquipmentDefinition {
  id: EquipmentId;
  name: string;
  techLevel: TechLevel;
  marketPrice: number;
  marketStock?: number;
  dropWeight?: number;
  category: "Primary Weapon" | "Secondary Weapon" | "Utility" | "Defense" | "Engineering";
  role: string;
  description: string;
  effect: string;
  displayStats: EquipmentDisplayStat[];
  slotType: EquipmentSlotType;
  slotSize?: number;
  craftCost?: EquipmentCraftCost;
  installableOn?: string[];
  exclusiveStationIds?: string[];
  modifiers?: EquipmentModifiers;
  weapon?: WeaponDefinition;
}

export interface CommodityDefinition {
  id: CommodityId;
  name: string;
  techLevel: TechLevel;
  description?: string;
  basePrice: number;
  mass: number;
  legal: boolean;
  volatility: number;
  category: "trade" | "ore" | "restricted";
}

export type ContrabandLawDisposition = "legal" | "fine-confiscate" | "hostile-pursuit";

export interface ContrabandLaw {
  systemId: string;
  label: string;
  disposition: ContrabandLawDisposition;
  summary: string;
}

export interface CargoStack {
  commodityId: CommodityId;
  amount: number;
}

export type CargoHold = Partial<Record<CommodityId, number>>;

export interface StationDefinition {
  id: string;
  name: string;
  techLevel: TechLevel;
  archetype: StationArchetype;
  factionId: FactionId;
  systemId: string;
  planetId: string;
  position: Vec3;
  hidden?: boolean;
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

export interface SystemStarDefinition {
  type: string;
  assetKey: string;
  color: string;
  lightIntensity: number;
  visualSize: number;
  direction: Vec3;
}

export interface StarSystemDefinition {
  id: string;
  name: string;
  description: string;
  factionId: FactionId;
  risk: number;
  position: [number, number];
  skyboxKey: string;
  star: SystemStarDefinition;
  jumpGatePosition: Vec3;
  planetIds: string[];
  stationIds: string[];
  hiddenStationIds?: string[];
  marketBias: Partial<Record<CommodityId, number>>;
}

export type ExplorationSignalKind = "anomaly" | "wreck" | "cache" | "event";

export interface ExplorationSignalRewards {
  credits?: number;
  cargo?: CargoHold;
  reputation?: Partial<Record<FactionId, number>>;
}

export interface ExplorationStoryInfluence {
  missionId: string;
  headline: string;
  note: string;
}

export interface ExplorationSignalDefinition {
  id: string;
  systemId: string;
  kind: ExplorationSignalKind;
  title: string;
  maskedTitle: string;
  description: string;
  position: Vec3;
  scanRange: number;
  scanBand: [number, number];
  scanTime: number;
  rewards: ExplorationSignalRewards;
  log: string;
  chainId?: string;
  chainTitle?: string;
  stage?: number;
  prerequisiteSignalIds?: string[];
  requiredEquipmentAny?: EquipmentId[];
  storyInfluence?: ExplorationStoryInfluence;
  revealStationId?: string;
  revealPlanetIds?: string[];
}

export interface ExplorationState {
  discoveredSignalIds: string[];
  completedSignalIds: string[];
  revealedStationIds: string[];
  eventLogIds: string[];
}

export interface JumpGateDefinition {
  id: string;
  systemId: string;
  name: string;
  position: Vec3;
}

export type FlightEntityRole =
  | "pirate"
  | "patrol"
  | "trader"
  | "freighter"
  | "courier"
  | "miner"
  | "smuggler"
  | "drone"
  | "relay";

export type FlightAiProfileId =
  | "raider"
  | "interceptor"
  | "gunner"
  | "law-patrol"
  | "patrol-support"
  | "hauler"
  | "freighter"
  | "courier"
  | "miner"
  | "smuggler"
  | "elite-ace"
  | "boss-warlord"
  | "drone-hunter"
  | "relay-core";

export type CombatLoadoutId =
  | "pirate-raider"
  | "pirate-interceptor"
  | "pirate-gunner"
  | "pirate-elite-ace"
  | "pirate-boss-warlord"
  | "directorate-patrol"
  | "directorate-support"
  | "directorate-courier"
  | "union-hauler"
  | "union-freighter"
  | "union-miner"
  | "vossari-smuggler"
  | "mirr-defender"
  | "unknown-drone"
  | "unknown-relay";

export type ConvoyStatus = "en-route" | "under-attack" | "distress" | "arrived";

export type EconomyNpcTaskKind =
  | "idle"
  | "mining"
  | "returning"
  | "buying"
  | "hauling"
  | "selling"
  | "destroyed";

export type EconomyNpcRiskPreference = "cautious" | "balanced" | "bold";
export type EconomyNpcRelationTier = "trusted" | "friendly" | "neutral" | "hostile";

export interface EconomyNpcLedger {
  revenue: number;
  expenses: number;
  losses: number;
  completedContracts: number;
  failedContracts: number;
  minedUnits: number;
}

export type StoryEncounterTargetKind = "drone" | "relay" | "pirate-relay" | "jammer" | "guard";

export interface StoryEncounterTargetDefinition {
  id: string;
  name: string;
  kind: StoryEncounterTargetKind;
  role: Extract<FlightEntityRole, "pirate" | "smuggler" | "drone" | "relay">;
  systemId: string;
  position: Vec3;
  hull: number;
  shield: number;
  factionId: FactionId;
  aiProfileId?: FlightAiProfileId;
  elite?: boolean;
  boss?: boolean;
  prerequisiteTargetIds?: string[];
  objective: string;
  echoLock?: {
    rangeMeters: number;
    requiredSeconds: number;
    label: string;
  };
}

export interface StoryEncounterDefinition {
  fieldObjective: string;
  twist: string;
  completionText: string;
  visualCue?: {
    systemId: string;
    position: Vec3;
    label: string;
  };
  targets: StoryEncounterTargetDefinition[];
  requiredTargetIds: string[];
}

export type EncounterStageTrigger = "mission-accepted" | "target-destroyed" | "salvage-recovered" | "mission-completed";

export interface EncounterStageDefinition {
  id: string;
  trigger: EncounterStageTrigger;
  targetId?: string;
  title: string;
  commsSpeakerId: string;
  commsLine: string;
  environmentCue: string;
  objectiveText: string;
}

export interface EncounterDefinition {
  id: string;
  missionId: string;
  title: string;
  intent: string;
  stages: EncounterStageDefinition[];
  rewards?: {
    credits?: number;
    unlockBlueprintIds?: EquipmentId[];
  };
  performanceBudget: {
    maxActiveEnemies: number;
    maxActiveProjectiles: number;
    maxActiveEffects: number;
  };
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
  sourceStationId?: string;
  storyArcId?: string;
  storyChapterId?: string;
  storyCritical?: boolean;
  storyEncounter?: StoryEncounterDefinition;
  storyTargetDestroyedIds?: string[];
  storyEchoLockedTargetIds?: string[];
  prerequisiteMissionIds?: string[];
  retryOnFailure?: boolean;
  blueprintRewardIds?: EquipmentId[];
  reputationRewards?: Partial<Record<FactionId, number>>;
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

export type FactionHeatLevel = "clear" | "watched" | "wanted" | "kill-on-sight";

export interface FactionHeatRecord {
  heat: number;
  fineCredits: number;
  offenseCount: number;
  lastIncidentAt?: number;
  warningUntil?: number;
  wantedUntil?: number;
  interceptCooldownUntil?: number;
}

export interface FactionHeatState {
  factions: Partial<Record<FactionId, FactionHeatRecord>>;
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
  equipmentInventory?: EquipmentInventory;
  unlockedBlueprintIds?: EquipmentId[];
  missiles: number;
  ownedShips: string[];
  ownedShipRecords?: OwnedShipRecord[];
  position: Vec3;
  velocity: Vec3;
  rotation: Vec3;
  throttle: number;
  lastDamageAt: number;
}

export interface OwnedShipRecord {
  shipId: string;
  stationId: string;
  installedEquipment: EquipmentId[];
  hull: number;
  shield: number;
  energy: number;
}

export interface FlightEntity {
  id: string;
  name: string;
  role: FlightEntityRole;
  factionId: FactionId;
  position: Vec3;
  velocity: Vec3;
  hull: number;
  shield: number;
  maxHull: number;
  maxShield: number;
  lastDamageAt: number;
  fireCooldown: number;
  aiProfileId: FlightAiProfileId;
  loadoutId?: CombatLoadoutId;
  aiState: "patrol" | "scan" | "intercept" | "attack" | "evade" | "retreat";
  aiTargetId?: string;
  aiTimer: number;
  elite?: boolean;
  boss?: boolean;
  supportWing?: boolean;
  supportRequestedAt?: number;
  supportCooldownUntil?: number;
  missionId?: string;
  storyTarget?: boolean;
  storyTargetKind?: StoryEncounterTargetKind;
  provokedByPlayer?: boolean;
  economySystemId?: string;
  economySerial?: string;
  economyHomeStationId?: string;
  economyRiskPreference?: EconomyNpcRiskPreference;
  economyRelationTier?: EconomyNpcRelationTier;
  economyRelationSummary?: string;
  economyPersonalOfferId?: string;
  economyContractId?: string;
  economyLedger?: EconomyNpcLedger;
  economyTaskKind?: EconomyNpcTaskKind;
  economyTaskProgress?: number;
  economyStatus?: string;
  economyCargo?: CargoHold;
  economyCommodityId?: CommodityId;
  economyTargetId?: string;
  scanProgress?: number;
  distressThreatId?: string;
  distressCalledAt?: number;
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

interface BaseLootEntity {
  id: string;
  amount: number;
  position: Vec3;
  velocity: Vec3;
  rarity: OreRarity;
}

export type LootEntity =
  | (BaseLootEntity & {
      kind: "commodity";
      commodityId: CommodityId;
    })
  | (BaseLootEntity & {
      kind: "equipment";
      equipmentId: EquipmentId;
    });

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
  fireCooldown?: number;
  convoyRole?: "mission-tender";
  status?: ConvoyStatus;
  threatId?: string;
  distressCalledAt?: number;
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

export interface ExplorationScanRuntime {
  signalId: string;
  frequency: number;
  progress: number;
  inBand: boolean;
  distance: number;
}

export type StoryNotificationTone = "start" | "updated" | "complete" | "failed";
export type LawNotificationTone = "warning" | "fine" | "wanted" | "bounty" | "cleared";

export interface StoryNotification {
  id: string;
  tone: StoryNotificationTone;
  title: string;
  body: string;
  expiresAt: number;
}

export interface LawNotification {
  id: string;
  tone: LawNotificationTone;
  title: string;
  body: string;
  expiresAt: number;
}

export interface DialogueState {
  seenSceneIds: string[];
}

export interface ActiveDialogueState {
  sceneId: string;
  lineIndex: number;
  replay?: boolean;
  queuedSceneIds?: string[];
}

export type OnboardingStepId =
  | "first-flight"
  | "dock-helion"
  | "accept-clean-carrier"
  | "plot-clean-carrier-route"
  | "launch-for-mirr"
  | "dock-mirr-lattice"
  | "complete-clean-carrier"
  | "accept-probe-in-glass"
  | "destroy-glass-echo-drone"
  | "defeat-glass-echo-prime"
  | "recover-probe-core"
  | "complete-probe-in-glass";

export interface OnboardingState {
  enabled: boolean;
  collapsed: boolean;
  completedStepIds: OnboardingStepId[];
  claimedRewardStepIds: OnboardingStepId[];
  startedAtGameTime: number;
  completedAtGameTime?: number;
}

export interface ProjectileEntity {
  id: string;
  owner: "player" | "enemy" | "patrol" | "npc";
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
  kind:
    | "hit"
    | "shield-hit"
    | "explosion"
    | "damage-text"
    | "mining-beam"
    | "gate-spool"
    | "wormhole"
    | "nav-ring"
    | "launch-trail"
    | "dock-corridor"
    | "projectile-trail"
    | "shield-break"
    | "speed-line"
    | "kill-pulse"
    | "salvage-pulse";
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
  | "docking"
  | "to-npc";

export interface AutoPilotState {
  phase: AutoPilotPhase;
  originSystemId: string;
  targetSystemId: string;
  routeSystemIds?: string[];
  targetStationId?: string;
  targetPosition: Vec3;
  timer: number;
  cancelable: boolean;
  targetNpcId?: string;
  targetName?: string;
  pendingNpcAction?: "escort" | "rob";
}

export interface UltimateAbilityState {
  chargeSeconds: number;
  activeUntil?: number;
  lastActivatedAt?: number;
}

export interface EconomyNpcWatchState {
  npcId: string;
  returnStationId?: string;
  cameraMode: "cockpit" | "chase";
  lookYaw: number;
  lookPitch: number;
  enteredAt: number;
}

export type NpcInteractionAction = "hail" | "escort" | "rob" | "rescue" | "report";

export interface NpcInteractionState {
  npcId: string;
  openedFrom: "flight" | "watch";
  openedAt: number;
  lastAction?: NpcInteractionAction;
  pendingAction?: "escort" | "rob";
  message?: string;
  pending?: boolean;
}

export interface NpcObjectiveState {
  kind: "escort" | "rescue";
  npcId: string;
  threatId?: string;
  startedAt: number;
  expiresAt: number;
  progressSeconds: number;
  rewardCredits: number;
  factionId: FactionId;
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
  explorationScan?: ExplorationScanRuntime;
  storyEchoLock?: {
    missionId: string;
    targetId: string;
    progressSeconds: number;
    requiredSeconds: number;
    inRange: boolean;
  };
  storyNotification?: StoryNotification;
  lawNotification?: LawNotification;
}

export interface MarketEntry {
  stock: number;
  maxStock: number;
  baselineStock: number;
  demand: number;
  baselineDemand: number;
}

export type MarketItemId = CommodityId | EquipmentId;
export type MarketState = Record<string, Partial<Record<MarketItemId, MarketEntry>>>;

export interface FlightInput {
  throttleUp: boolean;
  throttleDown: boolean;
  rollLeft: boolean;
  rollRight: boolean;
  afterburner: boolean;
  firePrimary: boolean;
  fireSecondary: boolean;
  activateUltimate: boolean;
  interact: boolean;
  cycleTarget: boolean;
  toggleMap: boolean;
  toggleCamera: boolean;
  pause: boolean;
  mouseDX: number;
  mouseDY: number;
}

export interface DebugScenario {
  id: string;
  label: string;
  description: string;
  systemId: string;
  stationId?: string;
  shipId: string;
  credits: number;
  equipment: EquipmentId[];
  activeMissionIds?: string[];
  completedMissionIds?: string[];
  knownSystemIds?: string[];
  targetId?: string;
  message: string;
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
  economySnapshotId?: number;
  reputation: ReputationState;
  factionHeat: FactionHeatState;
  knownSystems: string[];
  knownPlanetIds: string[];
  explorationState: ExplorationState;
  dialogueState: DialogueState;
  onboardingState?: OnboardingState;
}

declare global {
  interface Window {
    __GOF2_E2E__?: {
      getState: () => unknown;
      setState: (partial: unknown, replace?: boolean) => void;
      applyDebugScenario?: (scenarioId: string) => void;
    };
  }
}
