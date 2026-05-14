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
        objectiveText: "Fly to the probe debris field and lock the Glass Echo Drone.",
        visualCueKind: "signal",
        effectLabel: "GHOST PING",
        targetHint: "Glass Echo Drone",
        hudTone: "combat"
      },
      {
        id: "prime-wake",
        trigger: "target-destroyed",
        targetId: "glass-echo-drone",
        title: "Prime Wake",
        commsSpeakerId: "ship-ai",
        commsLine: "Signal split detected. A heavier contact is waking behind the probe core.",
        environmentCue: "A shock ring blooms from the destroyed drone and marks the Prime spawn.",
        objectiveText: "Defeat Glass Echo Prime before recovering the probe core.",
        visualCueKind: "boss-entry",
        effectLabel: "PRIME WAKE",
        targetHint: "Glass Echo Prime",
        hudTone: "boss"
      },
      {
        id: "probe-core-recovery",
        trigger: "target-destroyed",
        targetId: "glass-echo-prime",
        title: "Probe Core Exposed",
        commsSpeakerId: "mirr-analyst",
        commsLine: "The Prime is down. Recover the probe core while the carrier is blind.",
        environmentCue: "Debris beacons switch from hostile red to recovery gold.",
        objectiveText: "Recover the Glass Wake Probe Core and return to Mirr Lattice.",
        visualCueKind: "recovery",
        effectLabel: "PROBE CORE",
        targetHint: "Glass Wake Probe Core",
        hudTone: "recovery"
      },
      {
        id: "core-secured",
        trigger: "salvage-recovered",
        salvageId: "glass-wake-probe-core",
        title: "Core Secured",
        commsSpeakerId: "ship-ai",
        commsLine: "Probe core sealed. The wake carrier is blind for one clean transit window.",
        environmentCue: "Recovery gold collapses into a return vector for Mirr Lattice.",
        objectiveText: "Return to Mirr Lattice and deliver the core.",
        visualCueKind: "recovery",
        effectLabel: "CORE SECURED",
        targetHint: "Mirr Lattice",
        hudTone: "return"
      },
      {
        id: "first-reversal",
        trigger: "mission-completed",
        title: "First Reversal Logged",
        commsSpeakerId: "mirr-analyst",
        commsLine: "The carrier pattern is real. Kuro voidglass is now the only clean separator.",
        environmentCue: "Mirr analysis tags the recovered core as the first Glass Wake reversal.",
        objectiveText: "Glass Wake 02 complete. Next trace: Kuro Resonance.",
        visualCueKind: "debrief",
        effectLabel: "REVERSAL",
        targetHint: "Kuro Resonance",
        hudTone: "return"
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
