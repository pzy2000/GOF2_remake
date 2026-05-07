import type {
  ActiveDialogueState,
  AssetManifest,
  AutoPilotState,
  CommodityId,
  DialogueState,
  EquipmentId,
  ExplorationState,
  FlightInput,
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
  StationTab
} from "../types/game";
import type { EconomyServiceStatus } from "../types/economy";

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
  autopilot?: AutoPilotState;
  input: FlightInput;
  gameClock: number;
  marketState: MarketState;
  activeMissions: MissionDefinition[];
  completedMissionIds: string[];
  failedMissionIds: string[];
  reputation: ReputationState;
  knownSystems: string[];
  knownPlanetIds: string[];
  explorationState: ExplorationState;
  dialogueState: DialogueState;
  activeDialogue?: ActiveDialogueState;
  primaryCooldown: number;
  secondaryCooldown: number;
  hasSave: boolean;
  saveSlots: SaveSlotSummary[];
  activeSaveSlotId?: SaveSlotId;
  setAssetManifest: (manifest: AssetManifest) => void;
  newGame: () => void;
  loadGame: (slotId?: SaveSlotId) => boolean;
  saveGame: (slotId?: SaveSlotId) => void;
  deleteSave: (slotId: SaveSlotId) => void;
  refreshSaveSlots: () => void;
  refreshEconomySnapshot: () => Promise<void>;
  startEconomyStream: () => void;
  stopEconomyStream: () => void;
  setScreen: (screen: Screen) => void;
  setStationTab: (tab: StationTab) => void;
  openGalaxyMap: (mode: GalaxyMapMode) => void;
  setInput: (patch: Partial<FlightInput>) => void;
  consumeMouse: () => { dx: number; dy: number };
  tick: (delta: number) => void;
  advanceGameClock: (delta: number) => void;
  cycleTarget: () => void;
  interact: () => void;
  adjustExplorationScanFrequency: (delta: number) => void;
  cancelExplorationScan: () => void;
  openDialogueScene: (sceneId: string, replay?: boolean) => void;
  advanceDialogue: () => void;
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
  buyShip: (shipId: string) => void;
  switchShip: (shipId: string) => void;
  craftEquipment: (equipmentId: string) => void;
  installEquipmentFromInventory: (equipmentId: EquipmentId) => void;
  uninstallEquipmentToInventory: (equipmentId: EquipmentId) => void;
  toggleCamera: () => void;
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
    | "knownSystems"
    | "knownPlanetIds"
    | "explorationState"
    | "dialogueState"
  >
>;

export type SavePayload = Omit<SaveGameData, "version" | "savedAt">;
