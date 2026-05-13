import type { EncounterDefinition } from "../types/game";

export const encounterDefinitions: EncounterDefinition[] = [
  {
    id: "glass-wake-probe-hero",
    missionId: "story-probe-in-glass",
    title: "Probe in the Glass Hero Slice",
    intent: "Turn Glass Wake 02 into the first high-polish combat recovery beat: ghost signal, split drone, boss wake, salvage payoff.",
    stages: [
      {
        id: "ghost-carrier",
        trigger: "mission-accepted",
        title: "Ghost Carrier Acquired",
        commsSpeakerId: "mirr-analyst",
        commsLine: "The probe wreck is answering with your ship name. Keep weapons hot and do not trust clean traffic.",
        environmentCue: "Mirr glass haze intensifies around the wreck field.",
        objectiveText: "Fly to the probe debris field and lock the Glass Echo Drone."
      },
      {
        id: "prime-wake",
        trigger: "target-destroyed",
        targetId: "glass-echo-drone",
        title: "Prime Wake",
        commsSpeakerId: "ship-ai",
        commsLine: "Signal split detected. A heavier contact is waking behind the probe core.",
        environmentCue: "A shock ring blooms from the destroyed drone and marks the Prime spawn.",
        objectiveText: "Defeat Glass Echo Prime before recovering the probe core."
      },
      {
        id: "probe-core-recovery",
        trigger: "target-destroyed",
        targetId: "glass-echo-prime",
        title: "Probe Core Exposed",
        commsSpeakerId: "mirr-analyst",
        commsLine: "The Prime is down. Recover the probe core while the carrier is blind.",
        environmentCue: "Debris beacons switch from hostile red to recovery gold.",
        objectiveText: "Recover the Glass Wake Probe Core and return to Mirr Lattice."
      }
    ],
    rewards: {
      credits: 1280,
      unlockBlueprintIds: ["targeting-computer"]
    },
    performanceBudget: {
      maxActiveEnemies: 4,
      maxActiveProjectiles: 70,
      maxActiveEffects: 90
    }
  }
];

export const encounterByMissionId = Object.fromEntries(encounterDefinitions.map((encounter) => [encounter.missionId, encounter])) as Record<string, EncounterDefinition>;
