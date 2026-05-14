import type { DebugScenario } from "../types/game";

export const debugScenarios: DebugScenario[] = [
  {
    id: "first-combat-loop",
    label: "First Combat Loop",
    description: "Starter ship outside Helion with a pirate target, clear cargo space, and the first story contract available.",
    systemId: "helion-reach",
    stationId: undefined,
    shipId: "sparrow-mk1",
    credits: 2200,
    equipment: ["pulse-laser", "homing-missile", "mining-beam"],
    activeMissionIds: ["story-clean-carrier"],
    targetId: "pirate-0",
    message: "Debug scenario: 5-minute launch, chase, fire, loot, return loop."
  },
  {
    id: "glass-wake-hero",
    label: "Glass Wake Hero Slice",
    description: "Jump directly into Glass Wake 02 with the drone and Prime recovery beat active in Mirr Vale.",
    systemId: "mirr-vale",
    stationId: undefined,
    shipId: "talon-s",
    credits: 6400,
    equipment: ["pulse-laser", "plasma-cannon", "homing-missile", "targeting-computer"],
    activeMissionIds: ["story-probe-in-glass"],
    completedMissionIds: ["story-clean-carrier"],
    knownSystemIds: ["helion-reach", "mirr-vale"],
    playerPosition: [260, -18, -360],
    playerRotation: [0, 0.42, 0],
    playerThrottle: 0.45,
    targetId: "glass-echo-drone",
    message: "Debug scenario: Glass Wake 02 hero encounter staged."
  },
  {
    id: "performance-swarm",
    label: "Performance Swarm",
    description: "High-risk Ashen Drift combat budget check with a heavier hull and hostile traffic.",
    systemId: "ashen-drift",
    stationId: undefined,
    shipId: "bastion-7",
    credits: 18000,
    equipment: ["plasma-cannon", "railgun", "torpedo-rack", "armor-plating", "shield-booster"],
    activeMissionIds: ["story-knife-wing-relay"],
    completedMissionIds: ["story-clean-carrier", "story-probe-in-glass", "story-kuro-resonance", "story-bastion-calibration", "story-ashen-decoy-manifest"],
    knownSystemIds: ["helion-reach", "kuro-belt", "vantara", "mirr-vale", "ashen-drift"],
    message: "Debug scenario: combat density and visual-effect budget check."
  }
];

export const debugScenarioById = Object.fromEntries(debugScenarios.map((scenario) => [scenario.id, scenario])) as Record<string, DebugScenario>;
