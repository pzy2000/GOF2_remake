import type {
  AsteroidEntity,
  CargoHold,
  CommodityId,
  EconomyNpcLedger,
  EconomyNpcRiskPreference,
  EconomyNpcTaskKind,
  FactionId,
  FlightEntityRole,
  MarketState,
  PlayerState,
  Vec3
} from "./game";

export type EconomyConnectionStatus = "connected" | "offline" | "fallback";

export type EconomyEventType =
  | "connected"
  | "snapshot"
  | "market"
  | "npc-task"
  | "npc-mined"
  | "npc-trade"
  | "npc-destroyed"
  | "npc-replacement"
  | "npc-interaction"
  | "dispatch-delivery"
  | "reset";

export type EconomyNpcRole = Extract<FlightEntityRole, "trader" | "freighter" | "courier" | "miner" | "smuggler">;
export type EconomyNpcInteractionAction = "rob" | "rescue" | "report";

export interface NpcTask {
  kind: EconomyNpcTaskKind;
  contractId?: string;
  commodityId?: CommodityId;
  asteroidId?: string;
  originStationId?: string;
  destinationStationId?: string;
  progress?: number;
  startedAt: number;
}

export interface EconomyNpcEntity {
  id: string;
  name: string;
  serial: string;
  role: EconomyNpcRole;
  factionId: FactionId;
  systemId: string;
  homeStationId: string;
  riskPreference: EconomyNpcRiskPreference;
  lineageId: string;
  generation: number;
  position: Vec3;
  velocity: Vec3;
  hull: number;
  shield: number;
  maxHull: number;
  maxShield: number;
  cargoCapacity: number;
  cargo: CargoHold;
  credits: number;
  ledger: EconomyNpcLedger;
  task: NpcTask;
  statusLabel: string;
  lastTradeAt: number;
}

export interface EconomyNpcReplacement {
  id: string;
  role: EconomyNpcRole;
  factionId: FactionId;
  homeStationId: string;
  lineageId: string;
  generation: number;
  slotIndex: number;
  lostAt: number;
  dueAt: number;
}

export interface EconomyResourceBelt {
  systemId: string;
  asteroids: AsteroidEntity[];
}

export interface EconomyEvent {
  id: string;
  type: EconomyEventType;
  clock: number;
  message: string;
  systemId?: string;
  stationId?: string;
  npcId?: string;
  commodityId?: CommodityId;
  amount?: number;
  snapshotId?: number;
}

export interface EconomySnapshot {
  version: number;
  snapshotId: number;
  clock: number;
  marketState: MarketState;
  visibleNpcs: EconomyNpcEntity[];
  resourceBelts: EconomyResourceBelt[];
  recentEvents: EconomyEvent[];
  status: Extract<EconomyConnectionStatus, "connected">;
}

export interface EconomyNpcResponse {
  version: number;
  snapshotId: number;
  clock: number;
  npc: EconomyNpcEntity;
  status: Extract<EconomyConnectionStatus, "connected">;
}

export interface PlayerTradeRequest {
  action: "buy" | "sell";
  stationId: string;
  systemId: string;
  commodityId: CommodityId;
  amount: number;
  player: PlayerState;
  reputation?: number;
  reservedCargo?: number;
}

export interface PlayerTradeResponse {
  ok: boolean;
  player: PlayerState;
  marketState: MarketState;
  message: string;
  total: number;
  snapshot?: EconomySnapshot;
}

export interface NpcDestroyedRequest {
  npcId: string;
  systemId: string;
}

export interface EconomyNpcInteractionRequest {
  action: EconomyNpcInteractionAction;
  npcId: string;
  systemId: string;
}

export interface EconomyNpcInteractionResponse {
  ok: boolean;
  message: string;
  event?: EconomyEvent;
  snapshot?: EconomySnapshot;
  cargoDropped?: CargoHold;
}

export interface EconomyDispatchDeliveryRequest {
  missionId: string;
  systemId: string;
  stationId: string;
  cargoDelivered: CargoHold;
}

export interface EconomyDispatchDeliveryResponse {
  ok: boolean;
  message: string;
  event?: EconomyEvent;
  snapshot?: EconomySnapshot;
}

export interface EconomyServiceStatus {
  status: EconomyConnectionStatus;
  url: string;
  snapshotId?: number;
  lastEvent?: string;
  lastError?: string;
}
