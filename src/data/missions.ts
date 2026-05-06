import type { MissionDefinition } from "../types/game";

export const missionTemplates: MissionDefinition[] = [
  {
    id: "courier-helion-kuro",
    title: "Courier: Helion Seals",
    type: "Courier delivery",
    originSystemId: "helion-reach",
    destinationSystemId: "kuro-belt",
    destinationStationId: "kuro-deep",
    factionId: "solar-directorate",
    description: "Carry sealed trade manifests to Kuro Deepworks.",
    reward: 850,
    deadlineSeconds: 900,
    failureReputationDelta: -4,
    cargoProvided: { "data-cores": 1 }
  },
  {
    id: "cargo-helion-ashen",
    title: "Cargo Run: Frontier Relief",
    type: "Cargo transport",
    originSystemId: "helion-reach",
    destinationSystemId: "ashen-drift",
    destinationStationId: "ashen-freeport",
    factionId: "vossari-clans",
    description: "Supply Ashen Freeport with player-provided food and medicine.",
    reward: 1320,
    deadlineSeconds: 1100,
    failureReputationDelta: -5,
    cargoRequired: { "basic-food": 3, "medical-supplies": 2 },
    consumeCargoOnComplete: true
  },
  {
    id: "passenger-helion-celest",
    title: "Passenger: Celest Delegates",
    type: "Passenger transport",
    originSystemId: "helion-reach",
    destinationSystemId: "celest-gate",
    destinationStationId: "celest-vault",
    factionId: "solar-directorate",
    description: "Carry a small delegation to Celest Vault. Passengers occupy cargo space.",
    reward: 1580,
    deadlineSeconds: 1200,
    failureReputationDelta: -6,
    passengerCount: 4
  },
  {
    id: "mining-kuro-iron",
    title: "Mining Contract: Iron Samples",
    type: "Mining contract",
    originSystemId: "kuro-belt",
    destinationSystemId: "kuro-belt",
    destinationStationId: "kuro-deep",
    factionId: "free-belt-union",
    description: "Extract and deliver five units of iron ore from local asteroids.",
    reward: 680,
    deadlineSeconds: 720,
    failureReputationDelta: -3,
    targetCommodityId: "iron",
    targetAmount: 5
  },
  {
    id: "bounty-ashen",
    title: "Bounty: Ashen Knife Wing",
    type: "Pirate bounty",
    originSystemId: "ashen-drift",
    destinationSystemId: "ashen-drift",
    destinationStationId: "ashen-freeport",
    factionId: "vossari-clans",
    description: "Reduce pirate pressure near Ashen Freeport.",
    reward: 1250,
    deadlineSeconds: 900,
    failureReputationDelta: -4,
    targetAmount: 2
  },
  {
    id: "escort-vantara",
    title: "Escort: Patrol Tender",
    type: "Escort convoy",
    originSystemId: "vantara",
    destinationSystemId: "vantara",
    destinationStationId: "vantara-bastion",
    factionId: "solar-directorate",
    description: "Guard a tender on its final burn back to Vantara Bastion.",
    reward: 1180,
    deadlineSeconds: 700,
    failureReputationDelta: -7,
    escort: {
      convoyId: "escort-vantara-tender",
      convoyName: "Patrol Tender S-14",
      originPosition: [520, 40, -220],
      destinationPosition: [-140, 25, -820],
      hull: 130
    }
  },
  {
    id: "salvage-mirr",
    title: "Recovery: Mirr Probe",
    type: "Recovery/salvage",
    originSystemId: "mirr-vale",
    destinationSystemId: "mirr-vale",
    destinationStationId: "mirr-lattice",
    factionId: "mirr-collective",
    description: "Recover a crashed Mirr probe core from the local debris field.",
    reward: 1450,
    deadlineSeconds: 950,
    failureReputationDelta: -5,
    salvage: {
      salvageId: "mirr-probe-core",
      name: "Mirr Probe Core",
      systemId: "mirr-vale",
      position: [360, -35, -520],
      commodityId: "data-cores",
      amount: 1
    }
  }
];
