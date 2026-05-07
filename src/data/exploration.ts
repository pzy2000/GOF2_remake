import type { ExplorationSignalDefinition } from "../types/game";

export const explorationSignals: ExplorationSignalDefinition[] = [
  {
    id: "quiet-signal-sundog-lattice",
    systemId: "helion-reach",
    kind: "anomaly",
    title: "Sundog Lattice",
    maskedTitle: "Prismatic Trade Echo",
    description: "A fractured trade beacon throws duplicated traffic shadows across the Helion lanes.",
    position: [-360, 145, -640],
    scanRange: 300,
    scanBand: [38, 52],
    scanTime: 2.4,
    rewards: { credits: 620, cargo: { optics: 2 } },
    chainId: "helion-sundog-chain",
    chainTitle: "Sundog Lattice Chain",
    stage: 1,
    storyInfluence: {
      missionId: "story-clean-carrier",
      headline: "Helion traffic can be forged without touching the manifest.",
      note: "The clean carrier key is still useful, but Sundog proves lawful beacon light can be bent after dispatch."
    },
    log:
      "Sundog Lattice resolved. The beacon is clean, but its light is being bent through an old mirror relay. Someone has learned how to make lawful traffic look like an accident."
  },
  {
    id: "quiet-signal-meridian-afterimage",
    systemId: "helion-reach",
    kind: "event",
    title: "Meridian Afterimage",
    maskedTitle: "Solar Archive Afterimage",
    description: "A Helion mirror farm repeats yesterday's docking stamps with tomorrow's packet timing.",
    position: [210, 380, -700],
    scanRange: 305,
    scanBand: [50, 63],
    scanTime: 3.1,
    rewards: { credits: 760, cargo: { electronics: 2 } },
    chainId: "helion-sundog-chain",
    chainTitle: "Sundog Lattice Chain",
    stage: 2,
    prerequisiteSignalIds: ["quiet-signal-sundog-lattice"],
    storyInfluence: {
      missionId: "story-clean-carrier",
      headline: "The clean key has a reflected twin in the Helion archive.",
      note: "Meridian's mirror farm shows the spoof can replay a legal delivery without the original ship noticing."
    },
    log:
      "Meridian Afterimage resolved. The mirror farm was not broadcasting a false order; it was replaying a true one from a different angle. Glass Wake can make honest paper arrive twice."
  },
  {
    id: "quiet-signal-foundry-ark-wreck",
    systemId: "kuro-belt",
    kind: "wreck",
    title: "Foundry Ark Wreck",
    maskedTitle: "Cold Hull Mass",
    description: "A union hauler shell sits inside the iron belt with its transponder cut out by hand.",
    position: [-420, -70, -560],
    scanRange: 285,
    scanBand: [56, 68],
    scanTime: 2.8,
    rewards: { cargo: { titanium: 2, "mechanical-parts": 2 } },
    chainId: "kuro-foundry-chain",
    chainTitle: "Foundry Ark Chain",
    stage: 1,
    storyInfluence: {
      missionId: "story-kuro-resonance",
      headline: "Kuro wreckage carries a lure pattern inside industrial noise.",
      note: "The belt accident was staged before impact, matching the resonance split Kuro wants from voidglass."
    },
    log:
      "Foundry Ark Wreck surveyed. The cargo locks failed before impact, not after. The belt did not eat this ship; the signal that lured it in did."
  },
  {
    id: "quiet-signal-anvil-listener-spoor",
    systemId: "kuro-belt",
    kind: "anomaly",
    title: "Anvil Listener Spoor",
    maskedTitle: "Ore-Band Listener Spoor",
    description: "Voidglass dust outlines a listening pattern that keeps moving when the belt is still.",
    position: [180, 210, -690],
    scanRange: 300,
    scanBand: [61, 73],
    scanTime: 3.2,
    rewards: { cargo: { voidglass: 1, titanium: 1 } },
    chainId: "kuro-foundry-chain",
    chainTitle: "Foundry Ark Chain",
    stage: 2,
    prerequisiteSignalIds: ["quiet-signal-foundry-ark-wreck"],
    storyInfluence: {
      missionId: "story-kuro-resonance",
      headline: "The listener hides in ore telemetry, not combat channels.",
      note: "Kuro's voidglass test should cut the lure out of normal mine traffic before more haulers follow it."
    },
    log:
      "Anvil Listener Spoor resolved. The dust pattern was a microphone with no hull around it, using mining telemetry as camouflage. The next drone does not need to look like a ship."
  },
  {
    id: "quiet-signal-ghost-iff-challenge",
    systemId: "vantara",
    kind: "event",
    title: "Ghost IFF Challenge",
    maskedTitle: "Military Handshake Fault",
    description: "A dead Directorate challenge code keeps asking for a response from a ship that is no longer registered.",
    position: [390, 90, -620],
    scanRange: 300,
    scanBand: [22, 34],
    scanTime: 3,
    rewards: { reputation: { "solar-directorate": 2 }, cargo: { "data-cores": 1 } },
    chainId: "vantara-iff-chain",
    chainTitle: "Ghost IFF Chain",
    stage: 1,
    storyInfluence: {
      missionId: "story-bastion-calibration",
      headline: "Directorate handshakes can be imitated from old archives.",
      note: "Vantara's copied challenge code explains why calibration evidence will be politically explosive."
    },
    log:
      "Ghost IFF Challenge accepted. Vantara confirms the handshake was copied from a patrol archive. The spoof is old enough to be deniable and new enough to be dangerous."
  },
  {
    id: "quiet-signal-redoubt-silence-test",
    systemId: "vantara",
    kind: "event",
    title: "Redoubt Silence Test",
    maskedTitle: "Suppressed Patrol Trial",
    description: "A Redoubt bunker repeats a support request that every patrol channel agrees never happened.",
    position: [610, 150, -710],
    scanRange: 300,
    scanBand: [28, 41],
    scanTime: 3.4,
    rewards: { reputation: { "solar-directorate": 2 }, cargo: { "medical-supplies": 1 } },
    chainId: "vantara-iff-chain",
    chainTitle: "Ghost IFF Chain",
    stage: 2,
    prerequisiteSignalIds: ["quiet-signal-ghost-iff-challenge"],
    storyInfluence: {
      missionId: "story-bastion-calibration",
      headline: "A missing support call proves the mimic can silence witnesses.",
      note: "The escort tender should expect the enemy to erase distress telemetry as quickly as it copies it."
    },
    log:
      "Redoubt Silence Test resolved. The bunker did call for support. The archive then voted the call out of existence. Glass Wake can forge a salute and bury the reply."
  },
  {
    id: "quiet-signal-folded-reflection",
    systemId: "mirr-vale",
    kind: "anomaly",
    title: "Folded Reflection",
    maskedTitle: "Mirrored Signal Fold",
    description: "A doubled Mirr signal keeps folding back on itself near Hush Orbit.",
    position: [-470, 80, -650],
    scanRange: 310,
    scanBand: [44, 57],
    scanTime: 3.2,
    rewards: { credits: 800, cargo: { voidglass: 1 } },
    chainId: "mirr-parallax-chain",
    chainTitle: "Parallax Hermitage Chain",
    stage: 1,
    storyInfluence: {
      missionId: "story-probe-in-glass",
      headline: "Mirr echoes recognize the ship looking at them.",
      note: "The folded reflection confirms the probe's mirror behavior is an identity test, not random salvage noise."
    },
    revealStationId: "parallax-hermitage",
    revealPlanetIds: ["hush-orbit"],
    log:
      "Folded Reflection resolved. Behind the echo sits Parallax Hermitage, a Mirr listening station that has been watching the spoofed beacons without transmitting its own name."
  },
  {
    id: "quiet-signal-parallax-deep-index",
    systemId: "mirr-vale",
    kind: "cache",
    title: "Parallax Deep Index",
    maskedTitle: "Hermitage Index Shard",
    description: "A sealed Mirr index shard unlocks only after Parallax Hermitage is visible on local charts.",
    position: [-610, 150, -740],
    scanRange: 290,
    scanBand: [48, 62],
    scanTime: 3.5,
    rewards: { credits: 940, cargo: { "data-cores": 1, voidglass: 1 } },
    chainId: "mirr-parallax-chain",
    chainTitle: "Parallax Hermitage Chain",
    stage: 2,
    prerequisiteSignalIds: ["quiet-signal-folded-reflection"],
    storyInfluence: {
      missionId: "story-quiet-crown-relay",
      headline: "Parallax indexed a Crown-band listener before Celest admitted it existed.",
      note: "The final relay's carrier has a Mirr fingerprint in old evidence, giving the endgame a clearer target profile."
    },
    log:
      "Parallax Deep Index recovered. The Hermitage catalogued a Crown-band listener before anyone called it a crisis. The archive entry ends with a warning: the wake answers names."
  },
  {
    id: "quiet-signal-dead-letter-convoy",
    systemId: "ashen-drift",
    kind: "wreck",
    title: "Dead Letter Convoy",
    maskedTitle: "Encrypted Debris Trail",
    description: "Three broken cargo tags drift in formation, still trying to deliver a message.",
    position: [440, -100, -720],
    scanRange: 295,
    scanBand: [68, 80],
    scanTime: 2.9,
    rewards: { cargo: { "data-cores": 1, "illegal-contraband": 1 } },
    chainId: "ashen-dead-letter-chain",
    chainTitle: "Dead Letter Chain",
    stage: 1,
    storyInfluence: {
      missionId: "story-ashen-decoy-manifest",
      headline: "Ashen distress keys were traded as bait.",
      note: "The decoy cargo should draw a seller, not a rescuer; Ashen's own debris proves the market exists."
    },
    log:
      "Dead Letter Convoy opened. The encrypted tags point to Ashen brokers reselling distress keys as decoys. The contraband is evidence, if anyone honest gets to read it."
  },
  {
    id: "quiet-signal-false-mercy-ledger",
    systemId: "ashen-drift",
    kind: "cache",
    title: "False Mercy Ledger",
    maskedTitle: "Mercy-Key Ledger",
    description: "A black-market escrow cache lists rescue manifests by price, not by survivor.",
    position: [-540, 230, -780],
    scanRange: 285,
    scanBand: [73, 86],
    scanTime: 3.3,
    rewards: { credits: 880, cargo: { "illegal-contraband": 1, "luxury-goods": 1 } },
    chainId: "ashen-dead-letter-chain",
    chainTitle: "Dead Letter Chain",
    stage: 2,
    prerequisiteSignalIds: ["quiet-signal-dead-letter-convoy"],
    storyInfluence: {
      missionId: "story-ashen-decoy-manifest",
      headline: "The relay buyer marks mercy keys as inventory.",
      note: "False Mercy's ledger gives the Ashen decoy operation a named supply habit without changing the contract target."
    },
    log:
      "False Mercy Ledger decrypted. The broker did not track victims; they tracked which distress keys sold twice. The next relay will answer to profit before it answers to fear."
  },
  {
    id: "quiet-signal-crownside-whisper",
    systemId: "celest-gate",
    kind: "anomaly",
    title: "Crownside Whisper",
    maskedTitle: "High-Band Crown Noise",
    description: "A thin carrier tone rides beneath Celest premium traffic, too neat to be random interference.",
    position: [330, 180, -760],
    scanRange: 280,
    scanBand: [12, 21],
    scanTime: 3.6,
    rewards: { credits: 1200, cargo: { "data-cores": 2 } },
    chainId: "celest-crownside-chain",
    chainTitle: "Crownside Whisper Chain",
    stage: 1,
    storyInfluence: {
      missionId: "story-witnesses-to-celest",
      headline: "Celest premium traffic carries a hidden arbitration tone.",
      note: "Witness flights will be easier to silence near the gate because the interference already lives under polite traffic."
    },
    log:
      "Crownside Whisper isolated. The carrier is narrow enough to slip through Celest arbitration filters. It is not a weapon yet, but it knows where one should stand."
  },
  {
    id: "quiet-signal-pearl-witness-chorus",
    systemId: "celest-gate",
    kind: "event",
    title: "Pearl Witness Chorus",
    maskedTitle: "Consulate Witness Chorus",
    description: "Pearl Consulate traffic folds several witness beacons into one graceful lie.",
    position: [-300, -250, -760],
    scanRange: 300,
    scanBand: [16, 29],
    scanTime: 3.7,
    rewards: { credits: 1320, cargo: { "luxury-goods": 1, "data-cores": 1 } },
    chainId: "celest-crownside-chain",
    chainTitle: "Crownside Whisper Chain",
    stage: 2,
    prerequisiteSignalIds: ["quiet-signal-crownside-whisper"],
    storyInfluence: {
      missionId: "story-witnesses-to-celest",
      headline: "The witness jamming pattern already rehearsed at Pearl.",
      note: "Celest's public crisis should be read as a choreographed silence, not a sudden attack."
    },
    log:
      "Pearl Witness Chorus separated. The consulate beacons were not corrupted together; they were braided into one approved voice. Glass Wake prefers consensus when panic would draw attention."
  },
  {
    id: "quiet-signal-locked-keel-cache",
    systemId: "ptd-home",
    kind: "cache",
    title: "Locked Keel Cache",
    maskedTitle: "Private Cache Ping",
    description: "A maintenance cache answers only to old shipyard keel codes in the PTD Home lanes.",
    position: [-260, 70, -520],
    scanRange: 320,
    scanBand: [74, 88],
    scanTime: 2.2,
    rewards: { cargo: { "ship-components": 2, "energy-cells": 2 } },
    chainId: "ptd-keel-chain",
    chainTitle: "Locked Keel Chain",
    stage: 1,
    storyInfluence: {
      missionId: "story-knife-wing-relay",
      headline: "Quiet storage beacons can hide relay craft routes.",
      note: "PTD's old yard note hints that ships vanish safest when their maintenance pings are quieter than dust."
    },
    log:
      "Locked Keel Cache opened. The cache holds refit parts and an old yard note: a stored ship is only safe when its beacon is quieter than the dust around it."
  },
  {
    id: "quiet-signal-keel-ghost-route",
    systemId: "ptd-home",
    kind: "anomaly",
    title: "Keel Ghost Route",
    maskedTitle: "Dormant Keel Route",
    description: "A private-storage routing ghost maps how parked hulls could leave without waking station traffic.",
    position: [290, -110, -620],
    scanRange: 315,
    scanBand: [80, 94],
    scanTime: 2.9,
    rewards: { credits: 700, cargo: { "ship-components": 1, microchips: 1 } },
    chainId: "ptd-keel-chain",
    chainTitle: "Locked Keel Chain",
    stage: 2,
    prerequisiteSignalIds: ["quiet-signal-locked-keel-cache"],
    storyInfluence: {
      missionId: "story-knife-wing-relay",
      headline: "Knife Wing relay craft could mask themselves as dormant storage routes.",
      note: "The route ghost explains why named pirate relay ships can appear like parked hulls until they spool."
    },
    log:
      "Keel Ghost Route resolved. The route is a harmless storage convenience until someone sells it to a relay crew. A ship can leave no wake if the station expects it to sleep."
  }
];

export const explorationSignalById = Object.fromEntries(explorationSignals.map((signal) => [signal.id, signal])) as Record<
  string,
  ExplorationSignalDefinition
>;
