import type { FlightEntityRole, StationArchetype } from "../types/game";

export interface StationArchetypeIdentityProfile {
  signature: string;
  core: [number, number, number];
  ringRadius: number;
  ringTube: number;
  spokeCount: number;
  dockBayCount: number;
  dockBayLength: number;
  dockBayColor: string;
  cargoPodCount: number;
  antennaCount: number;
  defenseTurretCount: number;
  industrialCraneCount: number;
  trafficLaneLift: number;
}

export const stationArchetypeIdentityProfiles: Record<StationArchetype, StationArchetypeIdentityProfile> = {
  "Trade Hub": {
    signature: "wide-concourse-cargo-ring",
    core: [46, 64, 46],
    ringRadius: 102,
    ringTube: 5.2,
    spokeCount: 6,
    dockBayCount: 6,
    dockBayLength: 96,
    dockBayColor: "#d5e8f4",
    cargoPodCount: 8,
    antennaCount: 2,
    defenseTurretCount: 0,
    industrialCraneCount: 0,
    trafficLaneLift: 18
  },
  "Mining Station": {
    signature: "industrial-crusher-arms",
    core: [36, 58, 56],
    ringRadius: 88,
    ringTube: 4.8,
    spokeCount: 4,
    dockBayCount: 3,
    dockBayLength: 74,
    dockBayColor: "#c5a24b",
    cargoPodCount: 6,
    antennaCount: 1,
    defenseTurretCount: 0,
    industrialCraneCount: 4,
    trafficLaneLift: 8
  },
  "Research Station": {
    signature: "vertical-lattice-sensor-crown",
    core: [34, 44, 54],
    ringRadius: 94,
    ringTube: 3.4,
    spokeCount: 3,
    dockBayCount: 3,
    dockBayLength: 68,
    dockBayColor: "#cfd8ff",
    cargoPodCount: 0,
    antennaCount: 7,
    defenseTurretCount: 0,
    industrialCraneCount: 0,
    trafficLaneLift: 34
  },
  "Military Outpost": {
    signature: "armored-cross-bastion",
    core: [44, 50, 50],
    ringRadius: 78,
    ringTube: 5.8,
    spokeCount: 4,
    dockBayCount: 4,
    dockBayLength: 72,
    dockBayColor: "#ffb0a6",
    cargoPodCount: 2,
    antennaCount: 3,
    defenseTurretCount: 8,
    industrialCraneCount: 0,
    trafficLaneLift: 12
  },
  "Frontier Port": {
    signature: "offset-scrap-yard",
    core: [30, 48, 44],
    ringRadius: 74,
    ringTube: 3.6,
    spokeCount: 3,
    dockBayCount: 3,
    dockBayLength: 82,
    dockBayColor: "#9fdab0",
    cargoPodCount: 5,
    antennaCount: 4,
    defenseTurretCount: 1,
    industrialCraneCount: 2,
    trafficLaneLift: 4
  },
  "Pirate Black Market": {
    signature: "asymmetric-shard-den",
    core: [28, 42, 40],
    ringRadius: 68,
    ringTube: 3.1,
    spokeCount: 5,
    dockBayCount: 2,
    dockBayLength: 62,
    dockBayColor: "#ff6c72",
    cargoPodCount: 3,
    antennaCount: 5,
    defenseTurretCount: 3,
    industrialCraneCount: 2,
    trafficLaneLift: -10
  }
};

export interface NpcRoleIdentityProfile {
  signature: string;
  hullColor: string;
  tailColor: string;
  glowColor: string;
  engineColor: string;
  cone: [number, number, number];
  wing: [number, number, number];
  offset: number;
  dorsalScale: [number, number, number];
  cargoPods: number;
  bladeFins: number;
}

export const npcRoleIdentityProfiles: Record<FlightEntityRole, NpcRoleIdentityProfile> = {
  pirate: {
    signature: "knife-wing-raider",
    hullColor: "#ff4e5f",
    tailColor: "#3a111c",
    glowColor: "#ff5f6d",
    engineColor: "#ff5f6d",
    cone: [7, 25, 3],
    wing: [30, 1.8, 7],
    offset: 6,
    dorsalScale: [0.92, 0.3, 0.9],
    cargoPods: 0,
    bladeFins: 4
  },
  patrol: {
    signature: "directorate-shield-cutter",
    hullColor: "#5dc8ff",
    tailColor: "#12344b",
    glowColor: "#64d7ff",
    engineColor: "#7de3ff",
    cone: [7.5, 23, 4],
    wing: [22, 2.6, 12],
    offset: 5,
    dorsalScale: [1, 0.42, 1.15],
    cargoPods: 0,
    bladeFins: 0
  },
  trader: {
    signature: "boxy-market-runner",
    hullColor: "#f6c96d",
    tailColor: "#4a3820",
    glowColor: "#ffd166",
    engineColor: "#72e6ff",
    cone: [9, 20, 6],
    wing: [30, 4, 16],
    offset: 3,
    dorsalScale: [1.18, 0.38, 1.25],
    cargoPods: 4,
    bladeFins: 0
  },
  freighter: {
    signature: "long-cargo-spine",
    hullColor: "#c9a86a",
    tailColor: "#5f6b73",
    glowColor: "#ffd166",
    engineColor: "#6ee7ff",
    cone: [10, 34, 6],
    wing: [42, 4.4, 18],
    offset: 2,
    dorsalScale: [1.24, 0.5, 1.45],
    cargoPods: 6,
    bladeFins: 0
  },
  courier: {
    signature: "needle-fast-courier",
    hullColor: "#9bffe8",
    tailColor: "#1f4a42",
    glowColor: "#8ff7ff",
    engineColor: "#9bffe8",
    cone: [5.6, 29, 5],
    wing: [38, 1.5, 6],
    offset: 4,
    dorsalScale: [0.9, 0.26, 1.25],
    cargoPods: 0,
    bladeFins: 2
  },
  miner: {
    signature: "ore-clamp-prospector",
    hullColor: "#ffd166",
    tailColor: "#5a4520",
    glowColor: "#ffd166",
    engineColor: "#ffbf52",
    cone: [9.5, 18, 7],
    wing: [24, 4.2, 18],
    offset: 4,
    dorsalScale: [1.22, 0.5, 1.1],
    cargoPods: 2,
    bladeFins: 0
  },
  smuggler: {
    signature: "low-profile-veil-runner",
    hullColor: "#ff9b52",
    tailColor: "#4a2418",
    glowColor: "#ff9b52",
    engineColor: "#ff7a4f",
    cone: [6.4, 26, 4],
    wing: [34, 1.6, 8],
    offset: 5,
    dorsalScale: [0.82, 0.24, 1.05],
    cargoPods: 2,
    bladeFins: 2
  },
  drone: {
    signature: "glass-echo-orbital",
    hullColor: "#8ff7ff",
    tailColor: "#2de4ff",
    glowColor: "#9bffe8",
    engineColor: "#ff9bd5",
    cone: [8, 18, 8],
    wing: [18, 2, 18],
    offset: 0,
    dorsalScale: [1, 1, 1],
    cargoPods: 0,
    bladeFins: 0
  },
  relay: {
    signature: "signal-relay-core",
    hullColor: "#c7b8ff",
    tailColor: "#5b39ff",
    glowColor: "#9b7bff",
    engineColor: "#9bffe8",
    cone: [8, 18, 8],
    wing: [18, 2, 18],
    offset: 0,
    dorsalScale: [1, 1, 1],
    cargoPods: 0,
    bladeFins: 0
  }
};
