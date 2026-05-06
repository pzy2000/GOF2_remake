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
    log:
      "Sundog Lattice resolved. The beacon is clean, but its light is being bent through an old mirror relay. Someone has learned how to make lawful traffic look like an accident."
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
    log:
      "Foundry Ark Wreck surveyed. The cargo locks failed before impact, not after. The belt did not eat this ship; the signal that lured it in did."
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
    log:
      "Ghost IFF Challenge accepted. Vantara confirms the handshake was copied from a patrol archive. The spoof is old enough to be deniable and new enough to be dangerous."
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
    revealStationId: "parallax-hermitage",
    revealPlanetIds: ["hush-orbit"],
    log:
      "Folded Reflection resolved. Behind the echo sits Parallax Hermitage, a Mirr listening station that has been watching the spoofed beacons without transmitting its own name."
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
    log:
      "Dead Letter Convoy opened. The encrypted tags point to Ashen brokers reselling distress keys as decoys. The contraband is evidence, if anyone honest gets to read it."
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
    log:
      "Crownside Whisper isolated. The carrier is narrow enough to slip through Celest arbitration filters. It is not a weapon yet, but it knows where one should stand."
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
    log:
      "Locked Keel Cache opened. The cache holds refit parts and an old yard note: a stored ship is only safe when its beacon is quieter than the dust around it."
  }
];

export const explorationSignalById = Object.fromEntries(explorationSignals.map((signal) => [signal.id, signal])) as Record<
  string,
  ExplorationSignalDefinition
>;
