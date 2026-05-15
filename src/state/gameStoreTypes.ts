import type {
  ActiveDialogueState,
  AssetManifest,
  AutoPilotState,
  CommodityId,
  DialogueState,
  EquipmentId,
  EconomyNpcWatchState,
  ExplorationState,
  FactionHeatState,
  FactionId,
  FlightInput,
  GraphicsQuality,
  GraphicsSettings,
  NpcInteractionAction,
  NpcInteractionState,
  NpcObjectiveState,
  OnboardingState,
  GalaxyMapMode,
  MarketState,
  MissionDefinition,
  PlayerState,
  ReputationState,
  RuntimeState,
  SaveGameData,
  SaveSlotId,
  SaveSlotSummary,
  Screen,
  StationTab,
  UltimateAbilityState
} from "../types/game";
import type { EconomyEvent, EconomyServiceStatus } from "../types/economy";
import type { Locale } from "../i18n";

export interface GameStore {
  screen: Screen;
  previousScreen: Screen;
  stationTab: StationTab;
  galaxyMapMode: GalaxyMapMode;
  currentSystemId: string;
  currentStationId?: string;
  targetId?: string;
  cameraMode: "chase" | "cinematic";
  assetManifest: AssetManifest;
  player: PlayerState;
  runtime: RuntimeState;
  economyService: EconomyServiceStatus;
  economyEvents: EconomyEvent[];
  economyPersonalOffers: MissionDefinition[];
  economyNpcWatch?: EconomyNpcWatchState;
  npcInteraction?: NpcInteractionState;
  npcObjective?: NpcObjectiveState;
  autopilot?: AutoPilotState;
  ultimateAbility: UltimateAbilityState;
  input: FlightInput;
  gameClock: number;
  marketState: MarketState;
  activeMissions: MissionDefinition[];
  completedMissionIds: string[];
  failedMissionIds: string[];
  reputation: ReputationState;
  factionHeat: FactionHeatState;
  knownSystems: string[];
  knownPlanetIds: string[];
  explorationState: ExplorationState;
  dialogueState: DialogueState;
  onboardingState?: OnboardingState;
  activeDialogue?: ActiveDialogueState;
  primaryCooldown: number;
  secondaryCooldown: number;
  hasSave: boolean;
  saveSlots: SaveSlotSummary[];
  activeSaveSlotId?: SaveSlotId;
  locale: Locale;
  graphicsSettings: GraphicsSettings;
  setAssetManifest: (manifest: AssetManifest) => void;
  setLocale: (locale: Locale) => void;
  setGraphicsQuality: (quality: GraphicsQuality) => void;
  newGame: () => void;
  loadGame: (slotId?: SaveSlotId) => boolean;
  saveGame: (slotId?: SaveSlotId) => void;
  deleteSave: (slotId: SaveSlotId) => void;
  refreshSaveSlots: () => void;
  refreshEconomySnapshot: () => Promise<void>;
  startEconomyStream: () => void;
  stopEconomyStream: () => void;
  resetEconomyBackend: () => Promise<void>;
  startEconomyNpcWatch: (npcId: string) => void;
  stopEconomyNpcWatch: (reason?: string) => void;
  toggleEconomyNpcWatchCamera: () => void;
  openNpcInteraction: (npcId: string, openedFrom?: NpcInteractionState["openedFrom"]) => void;
  closeNpcInteraction: () => void;
  executeNpcInteraction: (action: NpcInteractionAction, npcId?: string) => Promise<void>;
  setOnboardingCollapsed: (collapsed: boolean) => void;
  skipOnboarding: () => void;
  syncOnboardingProgress: () => void;
  setScreen: (screen: Screen) => void;
  setStationTab: (tab: StationTab) => void;
  openGalaxyMap: (mode: GalaxyMapMode) => void;
  setInput: (patch: Partial<FlightInput>) => void;
  consumeMouse: () => { dx: number; dy: number };
  tick: (delta: number) => void;
  advanceGameClock: (delta: number) => void;
  cycleTarget: () => void;
  collectNearby: () => boolean;
  interact: () => void;
  adjustExplorationScanFrequency: (delta: number) => void;
  cancelExplorationScan: () => void;
  openDialogueScene: (sceneId: string, replay?: boolean) => void;
  advanceDialogue: () => void;
  rewindDialogue: () => void;
  closeDialogue: () => void;
  dockAt: (stationId: string) => void;
  undock: () => void;
  startJumpToStation: (stationId: string) => void;
  startJumpToSystem: (systemId: string) => void;
  activateStargateJumpToStation: (stationId: string) => void;
  activateStargateJumpToSystem: (systemId: string) => void;
  cancelAutopilot: (reason?: string) => void;
  jumpToSystem: (systemId: string) => void;
  buy: (commodityId: CommodityId, amount?: number) => void;
  sell: (commodityId: CommodityId, amount?: number) => void;
  buyEquipment: (equipmentId: EquipmentId, amount?: number) => void;
  sellEquipment: (equipmentId: EquipmentId, amount?: number) => void;
  acceptMission: (missionId: string) => void;
  completeMission: (missionId: string) => void;
  repairAndRefill: () => void;
  payFactionFine: (factionId: FactionId) => void;
  brokerBlackMarketAmnesty: (factionId: FactionId) => void;
  buyShip: (shipId: string) => void;
  switchShip: (shipId: string) => void;
  unlockBlueprint: (equipmentId: EquipmentId) => void;
  craftEquipment: (equipmentId: string) => void;
  installEquipmentFromInventory: (equipmentId: EquipmentId) => void;
  uninstallEquipmentToInventory: (equipmentId: EquipmentId) => void;
  toggleCamera: () => void;
  applyDebugScenario: (scenarioId: string) => void;
}

export type SavePayloadOverrides = Partial<
  Pick<
    GameStore,
    | "currentSystemId"
    | "currentStationId"
    | "gameClock"
    | "player"
    | "activeMissions"
    | "completedMissionIds"
    | "failedMissionIds"
    | "marketState"
    | "reputation"
    | "factionHeat"
    | "knownSystems"
    | "knownPlanetIds"
    | "explorationState"
    | "dialogueState"
    | "onboardingState"
  >
>;

export type SavePayload = Omit<SaveGameData, "version" | "savedAt">;
