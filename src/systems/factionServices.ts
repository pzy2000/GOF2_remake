import type {
  EquipmentDefinition,
  FactionHeatState,
  FactionId,
  FactionStandingTier,
  MissionDefinition,
  PlayerState,
  ReputationState,
  ShipDefinition,
  StationDefinition,
  StationServiceId
} from "../types/game";
import { equipmentById } from "../data/equipment";
import { canBuyEquipmentAtStation } from "./economy";
import {
  getFactionHeatLevel,
  getFactionHeatLevelLabel,
  getFactionHeatRecord,
  isFactionKillOnSight,
  isFactionWanted,
  setFactionHeatRecord
} from "./factionConsequences";
import { updateReputation } from "./reputation";

const tierRank: Record<FactionStandingTier, number> = {
  "kill-on-sight": 0,
  hostile: 1,
  neutral: 2,
  friendly: 3,
  allied: 4
};

const officialWantedLockedServices = new Set<StationServiceId>([
  "commodity-buy",
  "equipment-buy",
  "repair",
  "shipyard-buy",
  "mission-accept",
  "blueprint-workshop"
]);

const unpaidFineLockedServices = new Set<StationServiceId>([
  "equipment-buy",
  "repair",
  "shipyard-buy",
  "mission-accept",
  "blueprint-workshop"
]);

const pirateRestrictedServices = new Set<StationServiceId>([
  "commodity-buy",
  "equipment-buy",
  "repair",
  "shipyard-buy",
  "mission-accept",
  "blueprint-workshop"
]);

export interface StationServiceAccess {
  ok: boolean;
  message: string;
  standingTier: FactionStandingTier;
  heatLevel: ReturnType<typeof getFactionHeatLevel>;
}

export interface StationServiceAccessInput {
  station: StationDefinition;
  service: StationServiceId;
  reputation: ReputationState;
  factionHeat: FactionHeatState;
  now: number;
}

export interface EquipmentPurchaseAccessInput extends Omit<StationServiceAccessInput, "service"> {
  equipment: EquipmentDefinition;
}

export interface ShipPurchaseAccessInput extends Omit<StationServiceAccessInput, "service"> {
  ship: ShipDefinition;
  player?: PlayerState;
}

export interface MissionAcceptAccessInput extends Omit<StationServiceAccessInput, "service"> {
  mission: MissionDefinition;
}

export interface BlackMarketAmnestyOffer {
  available: boolean;
  costCredits: number;
  message: string;
  targetFactionId: FactionId;
}

export interface BlackMarketAmnestyInput {
  station: StationDefinition;
  targetFactionId: FactionId;
  factionHeat: FactionHeatState;
  now: number;
}

export interface ApplyBlackMarketAmnestyInput extends BlackMarketAmnestyInput {
  reputation: ReputationState;
  player: PlayerState;
}

export interface ApplyBlackMarketAmnestyResult {
  ok: boolean;
  message: string;
  player: PlayerState;
  factionHeat: FactionHeatState;
  reputation: ReputationState;
  offer: BlackMarketAmnestyOffer;
}

export function getFactionStandingTier(reputationValue: number): FactionStandingTier {
  if (reputationValue >= 50) return "allied";
  if (reputationValue >= 15) return "friendly";
  if (reputationValue > -10) return "neutral";
  if (reputationValue > -40) return "hostile";
  return "kill-on-sight";
}

export function getStationServiceAccess({
  station,
  service,
  reputation,
  factionHeat,
  now
}: StationServiceAccessInput): StationServiceAccess {
  const standingTier = getFactionStandingTier(reputation.factions[station.factionId] ?? 0);
  const record = getFactionHeatRecord(factionHeat, station.factionId);
  const heatLevel = getFactionHeatLevel(record);
  const pirateBlackMarket = station.archetype === "Pirate Black Market";

  if (service === "amnesty-broker") {
    return pirateBlackMarket
      ? { ok: true, message: "Black-market amnesty broker available.", standingTier, heatLevel }
      : { ok: false, message: "Amnesty brokers only operate at pirate black markets.", standingTier, heatLevel };
  }

  if (pirateBlackMarket) {
    const stationFactionKos = standingTier === "kill-on-sight" || isFactionKillOnSight(factionHeat, station.factionId);
    if (stationFactionKos && pirateRestrictedServices.has(service)) {
      return {
        ok: false,
        message: "This black market will only broker amnesty while your pirate standing is kill-on-sight.",
        standingTier,
        heatLevel
      };
    }
    return { ok: true, message: "Black-market service available.", standingTier, heatLevel };
  }

  if (officialWantedLockedServices.has(service) && (isFactionWanted(factionHeat, station.factionId, now) || heatLevel === "kill-on-sight")) {
    return {
      ok: false,
      message: `Official services locked: ${getFactionHeatLevelLabel(record)} with ${station.name}.`,
      standingTier,
      heatLevel
    };
  }

  if (unpaidFineLockedServices.has(service) && record.fineCredits > 0) {
    return {
      ok: false,
      message: `Official services locked until ${record.fineCredits.toLocaleString()} cr fine is cleared.`,
      standingTier,
      heatLevel
    };
  }

  if (heatLevel === "watched") {
    return { ok: true, message: "Watched status: services open, faction perks suspended.", standingTier, heatLevel };
  }

  return { ok: true, message: "Service available.", standingTier, heatLevel };
}

export function getEquipmentPurchaseAccess(input: EquipmentPurchaseAccessInput): StationServiceAccess {
  const service = getStationServiceAccess({ ...input, service: "equipment-buy" });
  if (!service.ok) return service;
  if (!canBuyEquipmentAtStation(input.equipment.id, input.station)) {
    return {
      ...service,
      ok: false,
      message: `Requires Tech Level ${input.equipment.techLevel} station.`
    };
  }
  const requiredTier = requiredTierForEquipment(input.equipment.techLevel);
  const standingTier = getFactionStandingTier(input.reputation.factions[input.station.factionId] ?? 0);
  if (requiredTier && tierRank[standingTier] < tierRank[requiredTier]) {
    return {
      ...service,
      ok: false,
      message: `${input.equipment.name} requires ${tierLabel(requiredTier)} standing with ${input.station.name}.`
    };
  }
  return service;
}

export function getShipPurchaseAccess(input: ShipPurchaseAccessInput): StationServiceAccess {
  const service = getStationServiceAccess({ ...input, service: "shipyard-buy" });
  if (!service.ok) return service;
  const requirement = input.ship.purchaseRequirement;
  if (requirement?.stationArchetypes?.length && !requirement.stationArchetypes.includes(input.station.archetype)) {
    return {
      ...service,
      ok: false,
      message: `${input.ship.name} requires ${requirement.stationArchetypes.join(" or ")} shipyard.`
    };
  }
  const stationTechRequirement = requirement?.minTechLevel ?? (input.ship.id === "horizon-ark" ? 5 : input.ship.id === "bastion-7" ? 3 : 1);
  if (input.station.techLevel < stationTechRequirement) {
    return {
      ...service,
      ok: false,
      message: `${input.ship.name} requires Tech Level ${stationTechRequirement} shipyard.`
    };
  }
  const missingBlueprints = (requirement?.requiredUnlockedBlueprintIds ?? []).filter((equipmentId) => !input.player?.unlockedBlueprintIds?.includes(equipmentId));
  if (missingBlueprints.length > 0) {
    return {
      ...service,
      ok: false,
      message: `${input.ship.name} requires ${missingBlueprints.map((equipmentId) => equipmentById[equipmentId]?.name ?? equipmentId).join(", ")} blueprint.`
    };
  }
  const requiredTier = requiredTierForShip(input.ship.id);
  const standingTier = getFactionStandingTier(input.reputation.factions[input.station.factionId] ?? 0);
  if (tierRank[standingTier] < tierRank[requiredTier]) {
    return {
      ...service,
      ok: false,
      message: `${input.ship.name} requires ${tierLabel(requiredTier)} standing with ${input.station.name}.`
    };
  }
  return service;
}

export function getMissionAcceptAccess(input: MissionAcceptAccessInput): StationServiceAccess {
  const stationStandingTier = getFactionStandingTier(input.reputation.factions[input.station.factionId] ?? 0);
  const stationHeatRecord = getFactionHeatRecord(input.factionHeat, input.station.factionId);
  const stationHeatLevel = getFactionHeatLevel(stationHeatRecord);
  if (input.mission.storyCritical) {
    return {
      ok: true,
      message: "Story contract access preserved.",
      standingTier: stationStandingTier,
      heatLevel: stationHeatLevel
    };
  }
  const service = getStationServiceAccess({ ...input, service: "mission-accept" });
  if (!service.ok) return service;
  const requiredTier = highTrustMissionTypes.has(input.mission.type) ? "friendly" : "neutral";
  if (tierRank[service.standingTier] < tierRank[requiredTier]) {
    return {
      ...service,
      ok: false,
      message: `${input.mission.title} requires ${tierLabel(requiredTier)} standing with ${input.station.name}.`
    };
  }
  return service;
}

export function getFactionRewardMultiplier(
  factionId: FactionId,
  reputation: ReputationState,
  factionHeat: FactionHeatState,
  now: number
): number {
  const record = getFactionHeatRecord(factionHeat, factionId);
  if (record.fineCredits > 0 || getFactionHeatLevel(record) !== "clear" || isFactionWanted(factionHeat, factionId, now)) return 1;
  const tier = getFactionStandingTier(reputation.factions[factionId] ?? 0);
  if (tier === "allied") return 1.18;
  if (tier === "friendly") return 1.1;
  return 1;
}

export function getRepairCostMultiplier(
  factionId: FactionId,
  reputation: ReputationState,
  factionHeat: FactionHeatState,
  now: number
): number {
  const record = getFactionHeatRecord(factionHeat, factionId);
  if (record.fineCredits > 0 || getFactionHeatLevel(record) !== "clear" || isFactionWanted(factionHeat, factionId, now)) return 1;
  const tier = getFactionStandingTier(reputation.factions[factionId] ?? 0);
  if (tier === "allied") return 0.7;
  if (tier === "friendly") return 0.85;
  return 1;
}

export function getBlackMarketAmnestyOffer(input: BlackMarketAmnestyInput): BlackMarketAmnestyOffer {
  if (input.station.archetype !== "Pirate Black Market") {
    return {
      available: false,
      costCredits: 0,
      message: "Amnesty brokers only operate at pirate black markets.",
      targetFactionId: input.targetFactionId
    };
  }
  if (input.targetFactionId === "unknown-drones") {
    return {
      available: false,
      costCredits: 0,
      message: "Unknown Drones do not honor black-market amnesty.",
      targetFactionId: input.targetFactionId
    };
  }
  const record = getFactionHeatRecord(input.factionHeat, input.targetFactionId);
  const hasActiveIssue =
    record.heat > 0 ||
    record.fineCredits > 0 ||
    (record.warningUntil ?? -Infinity) > input.now ||
    (record.wantedUntil ?? -Infinity) > input.now;
  if (!hasActiveIssue) {
    return {
      available: false,
      costCredits: 0,
      message: "No active legal record to broker.",
      targetFactionId: input.targetFactionId
    };
  }
  return {
    available: true,
    costCredits: Math.max(500, Math.ceil(record.fineCredits * 0.85 + record.heat * 55 + record.offenseCount * 120)),
    message: "Broker clears fines, wanted flags, and active heat to a monitored baseline.",
    targetFactionId: input.targetFactionId
  };
}

export function applyBlackMarketAmnesty(input: ApplyBlackMarketAmnestyInput): ApplyBlackMarketAmnestyResult {
  const offer = getBlackMarketAmnestyOffer(input);
  if (!offer.available) {
    return {
      ok: false,
      message: offer.message,
      player: input.player,
      factionHeat: input.factionHeat,
      reputation: input.reputation,
      offer
    };
  }
  if (input.player.credits < offer.costCredits) {
    return {
      ok: false,
      message: `Need ${offer.costCredits.toLocaleString()} cr for black-market amnesty.`,
      player: input.player,
      factionHeat: input.factionHeat,
      reputation: input.reputation,
      offer
    };
  }
  const previous = getFactionHeatRecord(input.factionHeat, input.targetFactionId);
  const factionHeat = setFactionHeatRecord(input.factionHeat, input.targetFactionId, {
    ...previous,
    fineCredits: 0,
    heat: Math.min(previous.heat, 19),
    warningUntil: undefined,
    wantedUntil: undefined,
    interceptCooldownUntil: undefined
  });
  const reputation = updateReputation(
    updateReputation(input.reputation, input.targetFactionId, -1),
    "independent-pirates",
    1
  );
  return {
    ok: true,
    message: `Black-market amnesty brokered for ${offer.costCredits.toLocaleString()} cr.`,
    player: { ...input.player, credits: input.player.credits - offer.costCredits },
    factionHeat,
    reputation,
    offer
  };
}

function requiredTierForEquipment(techLevel: EquipmentDefinition["techLevel"]): FactionStandingTier | undefined {
  if (techLevel >= 5) return "allied";
  if (techLevel >= 4) return "friendly";
  if (techLevel >= 3) return "neutral";
  return undefined;
}

function requiredTierForShip(shipId: string): FactionStandingTier {
  if (shipId === "horizon-ark") return "allied";
  if (shipId === "raptor-v" || shipId === "bastion-7" || shipId === "talon-s") return "friendly";
  return "neutral";
}

const highTrustMissionTypes = new Set<MissionDefinition["type"]>([
  "Passenger transport",
  "Escort convoy",
  "Recovery/salvage",
  "Pirate bounty"
]);

function tierLabel(tier: FactionStandingTier): string {
  if (tier === "kill-on-sight") return "Kill-on-sight";
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}
