// src/data/exploration.ts
var explorationSignals = [
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
    log: "Sundog Lattice resolved. The beacon is clean, but its light is being bent through an old mirror relay. Someone has learned how to make lawful traffic look like an accident."
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
    log: "Meridian Afterimage resolved. The mirror farm was not broadcasting a false order; it was replaying a true one from a different angle. Glass Wake can make honest paper arrive twice."
  },
  {
    id: "quiet-signal-sundog-crown-shard",
    systemId: "helion-reach",
    kind: "cache",
    title: "Sundog Crown Shard",
    maskedTitle: "Deep Crown Refraction",
    description: "A crown-shaped coordinate shard only resolves when a wide-band scanner separates the mirrored carrier.",
    position: [430, 430, -840],
    scanRange: 260,
    scanBand: [55, 60],
    scanTime: 4.8,
    rewards: { credits: 1450, cargo: { optics: 2, "data-cores": 1 } },
    chainId: "helion-sundog-chain",
    chainTitle: "Sundog Lattice Chain",
    stage: 3,
    prerequisiteSignalIds: ["quiet-signal-meridian-afterimage"],
    requiredEquipmentAny: ["survey-array", "echo-nullifier"],
    storyInfluence: {
      missionId: "story-name-in-the-wake",
      headline: "Helion's reflected traffic contains name-bearing crown coordinates.",
      note: "The shard proves the wake can index a ship by how legal traffic reflects around it."
    },
    log: "Sundog Crown Shard resolved. The mirrored Helion route contains a name-bearing coordinate shard, too narrow for basic scanners and too deliberate to be stray archive light."
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
    log: "Foundry Ark Wreck surveyed. The cargo locks failed before impact, not after. The belt did not eat this ship; the signal that lured it in did."
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
    log: "Anvil Listener Spoor resolved. The dust pattern was a microphone with no hull around it, using mining telemetry as camouflage. The next drone does not need to look like a ship."
  },
  {
    id: "quiet-signal-obsidian-foundry-wake",
    systemId: "kuro-belt",
    kind: "cache",
    title: "Obsidian Foundry Wake",
    maskedTitle: "Deep Forge Wake",
    description: "A black forge wake inside Kuro Anvil keeps a hidden foundry off public union charts.",
    position: [360, -210, -820],
    scanRange: 255,
    scanBand: [66, 72],
    scanTime: 5,
    rewards: { credits: 1180, cargo: { voidglass: 1, titanium: 2 } },
    chainId: "kuro-foundry-chain",
    chainTitle: "Foundry Ark Chain",
    stage: 3,
    prerequisiteSignalIds: ["quiet-signal-anvil-listener-spoor"],
    requiredEquipmentAny: ["survey-array", "echo-nullifier"],
    storyInfluence: {
      missionId: "story-kuro-resonance",
      headline: "Kuro's ore telemetry hides a foundry that never filed a transponder.",
      note: "Obsidian Foundry can refine the same dust pattern that made the listener invisible."
    },
    revealStationId: "obsidian-foundry",
    revealPlanetIds: ["kuro-anvil"],
    log: "Obsidian Foundry Wake resolved. The ore-band microphone was using a hidden foundry as its shadow. Obsidian Foundry now answers on private Kuro charts."
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
    log: "Ghost IFF Challenge accepted. Vantara confirms the handshake was copied from a patrol archive. The spoof is old enough to be deniable and new enough to be dangerous."
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
    log: "Redoubt Silence Test resolved. The bunker did call for support. The archive then voted the call out of existence. Glass Wake can forge a salute and bury the reply."
  },
  {
    id: "quiet-signal-redoubt-ghost-permit",
    systemId: "vantara",
    kind: "event",
    title: "Redoubt Ghost Permit",
    maskedTitle: "Deep Patrol Permit",
    description: "A Directorate permit ghost authorizes a ship that no active command ledger admits exists.",
    position: [720, 210, -820],
    scanRange: 260,
    scanBand: [32, 37],
    scanTime: 5.1,
    rewards: { reputation: { "solar-directorate": 3 }, cargo: { "data-cores": 1, "medical-supplies": 1 } },
    chainId: "vantara-iff-chain",
    chainTitle: "Ghost IFF Chain",
    stage: 3,
    prerequisiteSignalIds: ["quiet-signal-redoubt-silence-test"],
    requiredEquipmentAny: ["survey-array", "echo-nullifier"],
    storyInfluence: {
      missionId: "story-borrowed-hulls",
      headline: "Borrowed hulls can move on permits the patrol archive denies issuing.",
      note: "The ghost permit is a clean route for ships that should be asleep in storage."
    },
    log: "Redoubt Ghost Permit resolved. The permit is valid enough for gates and false enough for every officer to deny. Someone learned to issue silence with a signature."
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
    log: "Folded Reflection resolved. Behind the echo sits Parallax Hermitage, a Mirr listening station that has been watching the spoofed beacons without transmitting its own name."
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
    log: "Parallax Deep Index recovered. The Hermitage catalogued a Crown-band listener before anyone called it a crisis. The archive entry ends with a warning: the wake answers names."
  },
  {
    id: "quiet-signal-parallax-outer-index",
    systemId: "mirr-vale",
    kind: "cache",
    title: "Parallax Outer Index",
    maskedTitle: "Deep Hermitage Index",
    description: "An outer Hermitage shard points away from Mirr Vale, as if the archive is afraid to face the wider net directly.",
    position: [-720, 210, -840],
    scanRange: 260,
    scanBand: [53, 58],
    scanTime: 5.2,
    rewards: { credits: 1280, cargo: { "data-cores": 2, voidglass: 1 } },
    chainId: "mirr-parallax-chain",
    chainTitle: "Parallax Hermitage Chain",
    stage: 3,
    prerequisiteSignalIds: ["quiet-signal-parallax-deep-index"],
    requiredEquipmentAny: ["survey-array", "echo-nullifier"],
    storyInfluence: {
      missionId: "story-parallax-wound",
      headline: "Parallax kept an outer index for names too dangerous to store in one mirror.",
      note: "The recovered index points to a distributed listener scar rather than a single relay."
    },
    log: "Parallax Outer Index recovered. The Hermitage split its evidence across mirrored shards. This outer index does not name the whole net, but it proves the net is larger than one relay."
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
    log: "Dead Letter Convoy opened. The encrypted tags point to Ashen brokers reselling distress keys as decoys. The contraband is evidence, if anyone honest gets to read it."
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
    log: "False Mercy Ledger decrypted. The broker did not track victims; they tracked which distress keys sold twice. The next relay will answer to profit before it answers to fear."
  },
  {
    id: "quiet-signal-moth-vault-ledger",
    systemId: "ashen-drift",
    kind: "cache",
    title: "Moth Vault Ledger",
    maskedTitle: "Deep Black Ledger",
    description: "A ledger fragment flutters around Grave Moon, priced in distress keys and sealed docking windows.",
    position: [610, 170, -880],
    scanRange: 250,
    scanBand: [82, 89],
    scanTime: 5.4,
    rewards: { credits: 1500, cargo: { "illegal-contraband": 1, "luxury-goods": 1 } },
    chainId: "ashen-dead-letter-chain",
    chainTitle: "Dead Letter Chain",
    stage: 3,
    prerequisiteSignalIds: ["quiet-signal-false-mercy-ledger"],
    requiredEquipmentAny: ["survey-array", "echo-nullifier"],
    storyInfluence: {
      missionId: "story-black-ledger-chorus",
      headline: "Ashen's black ledger routes stolen names through a hidden vault market.",
      note: "Moth Vault keeps the name-auction habit alive after the visible broker burns."
    },
    revealStationId: "moth-vault",
    revealPlanetIds: ["grave-moon"],
    log: "Moth Vault Ledger decrypted. The distress keys were only the front page. Moth Vault now appears on private Ashen charts, where names are collateral before they are victims."
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
    log: "Crownside Whisper isolated. The carrier is narrow enough to slip through Celest arbitration filters. It is not a weapon yet, but it knows where one should stand."
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
    log: "Pearl Witness Chorus separated. The consulate beacons were not corrupted together; they were braided into one approved voice. Glass Wake prefers consensus when panic would draw attention."
  },
  {
    id: "quiet-signal-crownshade-occlusion",
    systemId: "celest-gate",
    kind: "anomaly",
    title: "Crownshade Occlusion",
    maskedTitle: "Deep Crown Occlusion",
    description: "A research occlusion hides behind Celest's crown traffic, visible only when the witness chorus is separated.",
    position: [90, 430, -950],
    scanRange: 255,
    scanBand: [19, 24],
    scanTime: 5.5,
    rewards: { credits: 1700, reputation: { "solar-directorate": 2 }, cargo: { "data-cores": 1, optics: 2 } },
    chainId: "celest-crownside-chain",
    chainTitle: "Crownside Whisper Chain",
    stage: 3,
    prerequisiteSignalIds: ["quiet-signal-pearl-witness-chorus"],
    requiredEquipmentAny: ["survey-array", "echo-nullifier"],
    storyInfluence: {
      missionId: "story-listener-scar",
      headline: "Celest's clean crown traffic casts a shadow around a local listener scar.",
      note: "Crownshade Observatory can see the occlusion that polite Celest records flatten into routine traffic."
    },
    revealStationId: "crownshade-observatory",
    revealPlanetIds: ["celest-crown"],
    log: "Crownshade Occlusion resolved. The witness chorus was hiding the absence around a research station. Crownshade Observatory now marks the place where Celest traffic bends around a scar."
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
    log: "Locked Keel Cache opened. The cache holds refit parts and an old yard note: a stored ship is only safe when its beacon is quieter than the dust around it."
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
    log: "Keel Ghost Route resolved. The route is a harmless storage convenience until someone sells it to a relay crew. A ship can leave no wake if the station expects it to sleep."
  },
  {
    id: "quiet-signal-keel-archive-prism",
    systemId: "ptd-home",
    kind: "cache",
    title: "Keel Archive Prism",
    maskedTitle: "Deep Keel Prism",
    description: "A PTD archive prism cross-references every recovered coordinate shard against old storage routes.",
    position: [-340, -180, -660],
    scanRange: 275,
    scanBand: [86, 92],
    scanTime: 4.9,
    rewards: { credits: 1250, cargo: { "ship-components": 2, "data-cores": 1 } },
    chainId: "ptd-keel-chain",
    chainTitle: "Locked Keel Chain",
    stage: 3,
    prerequisiteSignalIds: ["quiet-signal-keel-ghost-route"],
    requiredEquipmentAny: ["survey-array", "echo-nullifier"],
    storyInfluence: {
      missionId: "story-borrowed-hulls",
      headline: "PTD's private archive can assemble recovered deep coordinates into a cartographic pattern.",
      note: "The prism turns scattered Quiet Signal shards into a route map for future relic scans."
    },
    log: "Keel Archive Prism resolved. PTD's private archive aligns the recovered deep coordinates into one cartographic lattice. The route is no longer just evidence; it is a tool."
  }
];
var explorationSignalById = Object.fromEntries(explorationSignals.map((signal) => [signal.id, signal]));

// src/data/story.ts
var GLASS_WAKE_ARC_ID = "glass-wake-protocol";
var glassWakeProtocol = {
  id: GLASS_WAKE_ARC_ID,
  title: "Glass Wake Protocol",
  subtitle: "A missing Mirr probe exposes a drone signal hidden inside trusted trade beacons.",
  summary: "Trace the Glass Wake carrier through research arrays, mining belts, patrol routes, pirate relays, Celest Gate, and the Listener Scar before the Unknown Drones turn civilian navigation into a name-bearing trap.",
  epilogue: "The Listener Scar anchor is broken and the captain's ship no longer answers to its stolen name. Glass Wake is not gone; the local listener has been forced to blink, and the larger drone network now knows who taught it pain.",
  chapters: [
    {
      id: "glass-wake-01",
      order: 1,
      missionId: "story-clean-carrier",
      title: "01: Clean Carrier",
      lockedTitle: "01: Signal Masked",
      briefing: "Carry a clean Helion sync key to Mirr Lattice. Helion traffic swears the key has never touched a pirate relay, which makes it the only honest mirror left.",
      fieldObjective: "Deliver the clean sync key and watch for a one-time Glass Wake ghost ping after launch.",
      reveal: "The probe answered a lawful-looking trade beacon that was not in any public registry.",
      log: "Mirr Lattice confirmed the Helion key was clean. The missing probe did not drift off course; something answered it with a trusted trade signature and left a wake in the static."
    },
    {
      id: "glass-wake-02",
      order: 2,
      missionId: "story-probe-in-glass",
      title: "02: Probe in the Glass",
      lockedTitle: "02: Signal Masked",
      briefing: "Recover the Mirr probe core before its carrier logs decay. Sera warns that the debris field has started returning ship names it should not know.",
      fieldObjective: "Destroy the Glass Echo Drone guarding the wreck, recover the probe core, then report to Mirr Lattice.",
      reveal: "The probe core replayed the captain's own transponder through a legal traffic cadence.",
      log: "The Glass Echo Drone broke apart beside the wreck. The core carried a new signature: Glass Wake, a carrier that wakes only when a ship trusts the signal enough to answer."
    },
    {
      id: "glass-wake-03",
      order: 3,
      missionId: "story-kuro-resonance",
      title: "03: Kuro Resonance",
      lockedTitle: "03: Signal Masked",
      briefing: "Mine voidglass in Kuro Belt to split the carrier from normal comm noise. Mako's miners have already heard a machine counting their drill cycles.",
      fieldObjective: "Mine three voidglass samples and destroy the Kuro Listener Drone harassing the belt.",
      reveal: "Voidglass proves the wake is not faction encryption or pirate code; it is machine-origin timing.",
      log: "Voidglass split the carrier cleanly while the Listener tried to silence the belt. The wake is not Mirr code, Directorate encryption, or pirate noise. It is colder and older."
    },
    {
      id: "glass-wake-04",
      order: 4,
      missionId: "story-bastion-calibration",
      title: "04: Bastion Calibration",
      lockedTitle: "04: Signal Masked",
      briefing: "Escort a Directorate calibration tender through a spectrum burn. Command wants proof the wake can mimic military handshakes before they admit the lanes are compromised.",
      fieldObjective: "Keep Calibration Tender C-9 alive while Handshake Mimic drones try to copy its IFF.",
      reveal: "The wake can wear Directorate authentication, not just civilian trade masks.",
      log: "Vantara's calibration burn survived the mimics and proved the signal can wear military handshakes. Directorate command stopped calling it a research accident."
    },
    {
      id: "glass-wake-05",
      order: 5,
      missionId: "story-ashen-decoy-manifest",
      title: "05: Ashen Decoy Manifest",
      lockedTitle: "05: Signal Masked",
      briefing: "Carry relief cargo under a decoy manifest into Ashen Freeport. Nyx has made the bait kind enough to be believable and profitable enough to be stolen.",
      fieldObjective: "Draw out the False Mercy Relay outside Ashen Freeport, destroy it and its guard, then complete the decoy delivery.",
      reveal: "Knife Wing pirates are rebroadcasting the wake, but they are not the source.",
      log: "The decoy worked. The False Mercy Relay answered first, and Ashen pirates were only repeating a deeper drone instruction they barely understood."
    },
    {
      id: "glass-wake-06",
      order: 6,
      missionId: "story-knife-wing-relay",
      title: "06: Knife Wing Relay",
      lockedTitle: "06: Signal Masked",
      briefing: "Destroy the Knife Wing relay craft before they sell the carrier to every black-market lane in Ashen Drift. Their ace is auctioning a ghost that does not belong to them.",
      fieldObjective: "Hunt three named Knife Wing relay craft, including the elite Broken Choir Ace.",
      reveal: "The relay packets point past Ashen Drift, toward Celest's premium arbitration lanes.",
      log: "The Knife Wing relay wing broke apart under fire. Their last packet pointed past Ashen Drift, toward the luxury traffic and clean liability shields around Celest Gate."
    },
    {
      id: "glass-wake-07",
      order: 7,
      missionId: "story-witnesses-to-celest",
      title: "07: Witnesses to Celest",
      lockedTitle: "07: Signal Masked",
      briefing: "Carry faction witnesses to Celest Vault so the evidence cannot be buried as a local pirate incident. The delegation is fragile, angry, and finally useful.",
      fieldObjective: "Destroy the Witness Jammer and its silencer drones near Celest Gate before completing passenger delivery.",
      reveal: "For one vote, Mirr, the Union, and the Directorate agree: the relay must be cut now.",
      log: "The witnesses reached Celest Vault after the jammer fell silent. For once, Mirr analysts, union miners, and Directorate officers agreed on the same warning: shut the relay down now."
    },
    {
      id: "glass-wake-08",
      order: 8,
      missionId: "story-quiet-crown-relay",
      title: "08: Quiet Crown Relay",
      lockedTitle: "08: Signal Masked",
      briefing: "Recover the quiet relay core beneath Celest Crown and cut the Glass Wake carrier out of civilian navigation. The relay is quiet because it is listening.",
      fieldObjective: "Destroy the Crown Warden drones and Quiet Crown Relay Core, recover the core, then return to Celest Vault.",
      reveal: "Unknown Drones were not broadcasting through the lanes; they were listening for who would close them.",
      log: "The Quiet Crown relay went dark. The Glass Wake carrier is no longer riding the public lanes, but the core kept one final trace: Unknown Drones were listening."
    },
    {
      id: "glass-wake-09",
      order: 9,
      missionId: "story-name-in-the-wake",
      title: "09: Name in the Wake",
      lockedTitle: "09: Signal Masked",
      briefing: "Celest's clean lanes are quiet, but the core has one private return address: the captain's ship name repeating inside PTD Home storage traffic.",
      fieldObjective: "Carry the Crown fragment to PTD Home, hold Echo Lock on the Keel Name Listener, destroy it, then dock at PTD Home.",
      reveal: "Unknown Drones did not just observe the captain; they attached the ship name to a private storage route.",
      log: "The Keel Name Listener tried to answer as the captain's own dormant hull. Echo Lock proved the name had become a key, not a call sign."
    },
    {
      id: "glass-wake-10",
      order: 10,
      missionId: "story-borrowed-hulls",
      title: "10: Borrowed Hulls",
      lockedTitle: "10: Signal Masked",
      briefing: "PTD Home can fake a sleeping ship well enough to bait the next listener. The decoy tender only needs to survive long enough to be believed.",
      fieldObjective: "Escort Decoy Storage Tender D-3 through PTD Home while borrowed-hull drones expose themselves.",
      reveal: "The drones can route through ship storage habits, but they still need a hull-shaped lie to move.",
      log: "The decoy tender survived. The borrowed hulls were not stolen ships; they were routes wearing ship-shaped silence."
    },
    {
      id: "glass-wake-11",
      order: 11,
      missionId: "story-parallax-wound",
      title: "11: Parallax Wound",
      lockedTitle: "11: Signal Masked",
      briefing: "Mirr Vale can split the name-key without exposing Parallax Hermitage. Sera calls it surgery performed through a mirror.",
      fieldObjective: "Destroy the Parallax Wound guardians, recover the Parallax Name Index, then return it to Mirr Lattice.",
      reveal: "The ship name is indexed as a wound: a place in the carrier where the drone network expects the captain to answer.",
      log: "The Parallax Name Index mapped the stolen name as a wound in the carrier, not a signature. Glass Wake is trying to make identity behave like navigation."
    },
    {
      id: "glass-wake-12",
      order: 12,
      missionId: "story-black-ledger-chorus",
      title: "12: Black Ledger Chorus",
      lockedTitle: "12: Signal Masked",
      briefing: "Ashen brokers have started pricing ship names like contraband. Nyx can get the ledger opened if the captain delivers a name that bites back.",
      fieldObjective: "Deliver the false name ledger to Ashen Freeport, then destroy the Name Auction Relay and its guard.",
      reveal: "The black market is selling name-keys without understanding the drones are using every buyer as a chorus.",
      log: "The Name Auction Relay burned with its ledger still open. Ashen was selling access to the captain's wake, but the buyers were the real broadcast array."
    },
    {
      id: "glass-wake-13",
      order: 13,
      missionId: "story-listener-scar",
      title: "13: Listener Scar",
      lockedTitle: "13: Signal Masked",
      briefing: "The chorus points back under Celest Crown, where the old listener left a scar that still knows how to say the captain's ship name.",
      fieldObjective: "Hold Echo Lock on the Listener Scar Anchor, destroy its wardens, recover the scar core, and report to Celest Vault.",
      reveal: "The local listener is only a scar from a larger network, but it can be hurt, blinded, and forced to forget a name.",
      log: "The Listener Scar Anchor fractured under Echo Lock. The drones still exist beyond the lane maps, but this scar no longer knows how to call the captain home."
    }
  ]
};

// src/data/dialogues.ts
function l(zhCN, ja, fr) {
  return { "zh-CN": zhCN, ja, fr };
}
var dialogueSpeakers = [
  { id: "captain", name: "Captain", nameI18n: l("\u8230\u957F", "\u8239\u9577", "Capitaine"), role: "Player ship", roleI18n: l("\u73A9\u5BB6\u98DE\u8239", "\u30D7\u30EC\u30A4\u30E4\u30FC\u8266", "Vaisseau joueur"), kind: "player", color: "#80d6ff", voiceProfile: "captain" },
  { id: "ship-ai", name: "Ship AI", nameI18n: l("\u8230\u8F7D AI", "\u8266\u8F09AI", "IA de bord"), role: "Navigation core", roleI18n: l("\u5BFC\u822A\u6838\u5FC3", "\u822A\u6CD5\u30B3\u30A2", "Noyau de navigation"), kind: "ai", color: "#9bffe8", voiceProfile: "ship-ai" },
  { id: "helion-handler", name: "Rhea Vale", nameI18n: l("Rhea Vale", "Rhea Vale", "Rhea Vale"), role: "Helion traffic handler", roleI18n: l("\u8D6B\u5229\u6602\u4EA4\u901A\u7BA1\u5236\u5458", "\u30D8\u30EA\u30AA\u30F3\u4EA4\u901A\u7BA1\u5236\u5B98", "R\xE9gulatrice du trafic Helion"), kind: "npc", factionId: "solar-directorate", color: "#f8c15d", voiceProfile: "helion-handler" },
  { id: "mirr-analyst", name: "Sera Voss", nameI18n: l("Sera Voss", "Sera Voss", "Sera Voss"), role: "Mirr signal analyst", roleI18n: l("\u7C73\u5C14\u4FE1\u53F7\u5206\u6790\u5458", "\u30DF\u30EB\u4FE1\u53F7\u5206\u6790\u5B98", "Analyste de signaux Mirr"), kind: "npc", factionId: "mirr-collective", color: "#bda7ff", voiceProfile: "mirr-analyst" },
  { id: "kuro-foreman", name: "Mako Dren", nameI18n: l("Mako Dren", "Mako Dren", "Mako Dren"), role: "Kuro belt foreman", roleI18n: l("\u9ED1\u5E26\u5DE5\u5934", "\u30AF\u30ED\u5E2F\u57DF\u306E\u73FE\u5834\u76E3\u7763", "Contrema\xEEtre de la ceinture Kuro"), kind: "npc", factionId: "free-belt-union", color: "#f0a45b", voiceProfile: "kuro-foreman" },
  { id: "vantara-officer", name: "Cmdr. Hale", nameI18n: l("Hale \u6307\u6325\u5B98", "\u30D8\u30A4\u30EB\u53F8\u4EE4\u5B98", "Cmdt Hale"), role: "Directorate spectrum officer", roleI18n: l("\u7406\u4E8B\u4F1A\u9891\u8C31\u519B\u5B98", "\u7406\u4E8B\u4F1A\u30B9\u30DA\u30AF\u30C8\u30EB\u58EB\u5B98", "Officier spectral du Directoire"), kind: "npc", factionId: "solar-directorate", color: "#7bc8ff", voiceProfile: "vantara-officer" },
  { id: "ashen-broker", name: "Nyx Calder", nameI18n: l("Nyx Calder", "Nyx Calder", "Nyx Calder"), role: "Ashen information broker", roleI18n: l("\u7070\u70EC\u60C5\u62A5\u63AE\u5BA2", "\u30A2\u30B7\u30A7\u30F3\u60C5\u5831\u4EF2\u4ECB\u4EBA", "Courtier d'information d'Ashen"), kind: "npc", factionId: "vossari-clans", color: "#ff8a6a", voiceProfile: "ashen-broker" },
  { id: "celest-archivist", name: "Ione Sel", nameI18n: l("Ione Sel", "Ione Sel", "Ione Sel"), role: "Celest archive keeper", roleI18n: l("\u5929\u7A79\u6863\u6848\u4FDD\u7BA1\u5458", "\u30BB\u30EC\u30B9\u30C8\u8A18\u9332\u4FDD\u7BA1\u5B98", "Gardienne des archives Celest"), kind: "npc", factionId: "solar-directorate", color: "#fff0a8", voiceProfile: "celest-archivist" },
  { id: "union-witness", name: "Talla Rook", nameI18n: l("Talla Rook", "Talla Rook", "Talla Rook"), role: "Union witness", roleI18n: l("\u5DE5\u4F1A\u8BC1\u4EBA", "\u7D44\u5408\u306E\u8A3C\u4EBA", "T\xE9moin syndical"), kind: "npc", factionId: "free-belt-union", color: "#ffd166", voiceProfile: "union-witness" }
];
var storyScenes = [
  {
    id: "dialogue-story-clean-carrier-accept",
    group: "story",
    title: "Clean Carrier Briefing",
    titleI18n: l("\u6D01\u51C0\u822A\u8F7D\u7B80\u62A5", "\u30AF\u30EA\u30FC\u30F3\u30FB\u30AD\u30E3\u30EA\u30A2 \u30D6\u30EA\u30FC\u30D5\u30A3\u30F3\u30B0", "Briefing du transport propre"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("\u4FE1\u53F7\u5DF2\u906E\u853D", "\u4FE1\u53F7\u30DE\u30B9\u30AF\u4E2D", "Signal masque"),
    trigger: { kind: "story-accept", missionId: "story-clean-carrier", chapterId: "glass-wake-01" },
    lines: [
      { speakerId: "helion-handler", text: "Captain, Helion traffic is handing you a clean sync key. It has never touched a pirate repeater, a private courier, or a Mirr filter.", textI18n: l("\u8230\u957F\uFF0C\u8D6B\u5229\u6602\u4EA4\u901A\u7BA1\u5236\u6B63\u4EA4\u7ED9\u4F60\u4E00\u628A\u6D01\u51C0\u540C\u6B65\u94A5\u3002\u5B83\u4ECE\u672A\u7ECF\u8FC7\u6D77\u76D7\u4E2D\u7EE7\u3001\u79C1\u4EBA\u4FE1\u4F7F\uFF0C\u4E5F\u6CA1\u6709\u78B0\u8FC7\u7C73\u5C14\u8FC7\u6EE4\u5668\u3002", "\u8239\u9577\u3001\u30D8\u30EA\u30AA\u30F3\u7BA1\u5236\u304B\u3089\u30AF\u30EA\u30FC\u30F3\u306A\u540C\u671F\u30AD\u30FC\u3092\u6E21\u3057\u307E\u3059\u3002\u6D77\u8CCA\u4E2D\u7D99\u3001\u6C11\u9593\u6025\u4F7F\u3001\u30DF\u30EB\u306E\u30D5\u30A3\u30EB\u30BF\u30FC\u306B\u306F\u4E00\u5EA6\u3082\u89E6\u308C\u3066\u3044\u307E\u305B\u3093\u3002", "Capitaine, le trafic Helion vous remet une cle de synchro propre. Elle n'a jamais touche un relais pirate, un coursier prive ni un filtre Mirr.") },
      { speakerId: "captain", text: "That is a lot of purity for one missing probe.", textI18n: l("\u4E3A\u4E86\u4E00\u4E2A\u5931\u8E2A\u63A2\u9488\uFF0C\u8FD9\u4EFD\u6D01\u51C0\u7A0B\u5EA6\u6709\u70B9\u5938\u5F20\u3002", "\u884C\u65B9\u4E0D\u660E\u306E\u63A2\u67FB\u6A5F\u3072\u3068\u3064\u306B\u3057\u3066\u306F\u3001\u305A\u3044\u3076\u3093\u6F54\u767D\u3067\u3059\u306D\u3002", "Cela fait beaucoup de purete pour une sonde disparue.") },
      { speakerId: "helion-handler", text: "Purity is the point. Mirr needs an honest mirror before they accuse the lane itself of lying.", textI18n: l("\u91CD\u70B9\u6B63\u662F\u6D01\u51C0\u3002\u7C73\u5C14\u5728\u6307\u63A7\u822A\u9053\u672C\u8EAB\u6492\u8C0E\u4E4B\u524D\uFF0C\u9700\u8981\u4E00\u9762\u8BDA\u5B9E\u7684\u955C\u5B50\u3002", "\u6F54\u767D\u3053\u305D\u8981\u70B9\u3067\u3059\u3002\u30DF\u30EB\u304C\u822A\u8DEF\u305D\u306E\u3082\u306E\u3092\u5618\u3064\u304D\u3060\u3068\u8CAC\u3081\u308B\u524D\u306B\u3001\u6B63\u76F4\u306A\u93E1\u304C\u5FC5\u8981\u3067\u3059\u3002", "La purete est le sujet. Mirr a besoin d'un miroir honnete avant d'accuser la voie elle-meme de mentir.") },
      { speakerId: "ship-ai", text: "Advisory: a weak ghost ping is nested in the launch queue. It is not attached to Helion tower.", textI18n: l("\u63D0\u793A\uFF1A\u53D1\u5C04\u961F\u5217\u91CC\u5D4C\u7740\u4E00\u4E2A\u5FAE\u5F31\u5E7D\u7075\u8109\u51B2\u3002\u5B83\u5E76\u672A\u63A5\u5165\u8D6B\u5229\u6602\u5854\u53F0\u3002", "\u52E7\u544A: \u767A\u9032\u30AD\u30E5\u30FC\u306B\u5F31\u3044\u30B4\u30FC\u30B9\u30C8 ping \u304C\u57CB\u307E\u3063\u3066\u3044\u307E\u3059\u3002\u30D8\u30EA\u30AA\u30F3\u7BA1\u5236\u5854\u306B\u306F\u63A5\u7D9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002", "Avis: un faible ping fantome est niche dans la file de lancement. Il n'est pas rattache a la tour Helion.") },
      { speakerId: "helion-handler", text: "Then keep your receiver open and your mouth shut until Sera sees the key.", textI18n: l("\u90A3\u5C31\u4FDD\u6301\u63A5\u6536\u5668\u6253\u5F00\uFF0C\u5728 Sera \u770B\u5230\u94A5\u5319\u524D\u522B\u591A\u5634\u3002", "\u3067\u306F\u53D7\u4FE1\u6A5F\u3092\u958B\u3044\u305F\u307E\u307E\u3001Sera \u304C\u30AD\u30FC\u3092\u898B\u308B\u307E\u3067\u53E3\u306F\u9589\u3058\u3066\u3044\u3066\u304F\u3060\u3055\u3044\u3002", "Alors gardez le recepteur ouvert et la bouche fermee jusqu'a ce que Sera voie la cle.") }
    ]
  },
  {
    id: "dialogue-story-clean-carrier-complete",
    group: "story",
    title: "Clean Carrier Debrief",
    titleI18n: l("\u6D01\u51C0\u822A\u8F7D\u590D\u76D8", "\u30AF\u30EA\u30FC\u30F3\u30FB\u30AD\u30E3\u30EA\u30A2 \u30C7\u30D6\u30EA\u30FC\u30D5", "Debriefing du transport propre"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("\u4FE1\u53F7\u5DF2\u906E\u853D", "\u4FE1\u53F7\u30DE\u30B9\u30AF\u4E2D", "Signal masque"),
    trigger: { kind: "story-complete", missionId: "story-clean-carrier", chapterId: "glass-wake-01" },
    lines: [
      { speakerId: "mirr-analyst", text: "The Helion key is clean. That is the uncomfortable part.", textI18n: l("\u8D6B\u5229\u6602\u94A5\u5319\u662F\u5E72\u51C0\u7684\u3002\u96BE\u53D7\u7684\u5730\u65B9\u5C31\u5728\u8FD9\u91CC\u3002", "\u30D8\u30EA\u30AA\u30F3\u306E\u30AD\u30FC\u306F\u30AF\u30EA\u30FC\u30F3\u3067\u3059\u3002\u305D\u3053\u304C\u5384\u4ECB\u306A\u70B9\u3067\u3059\u3002", "La cle Helion est propre. C'est la partie inconfortable.") },
      { speakerId: "captain", text: "The probe did not chase a bad signal.", textI18n: l("\u63A2\u9488\u8FFD\u7684\u4E0D\u662F\u574F\u4FE1\u53F7\u3002", "\u63A2\u67FB\u6A5F\u306F\u60AA\u3044\u4FE1\u53F7\u3092\u8FFD\u3063\u305F\u308F\u3051\u3067\u306F\u306A\u3044\u3002", "La sonde n'a pas poursuivi un mauvais signal.") },
      { speakerId: "mirr-analyst", text: "No. It answered a beacon shaped exactly like lawful trade traffic, but the registry has no birth record for it.", textI18n: l("\u6CA1\u9519\u3002\u5B83\u56DE\u5E94\u7684\u662F\u4E00\u4E2A\u5916\u5F62\u5B8C\u5168\u50CF\u5408\u6CD5\u8D38\u6613\u6D41\u91CF\u7684\u4FE1\u6807\uFF0C\u4F46\u6CE8\u518C\u8868\u91CC\u6CA1\u6709\u5B83\u7684\u51FA\u751F\u8BB0\u5F55\u3002", "\u3044\u3044\u3048\u3002\u5408\u6CD5\u306A\u4EA4\u6613\u901A\u4FE1\u305D\u306E\u3082\u306E\u306E\u5F62\u3092\u3057\u305F\u30D3\u30FC\u30B3\u30F3\u306B\u5FDC\u7B54\u3057\u307E\u3057\u305F\u304C\u3001\u767B\u9332\u7C3F\u306B\u306F\u8A95\u751F\u8A18\u9332\u304C\u3042\u308A\u307E\u305B\u3093\u3002", "Non. Elle a repondu a une balise ayant exactement la forme d'un trafic commercial legal, mais le registre n'a aucune trace de naissance.") },
      { speakerId: "ship-ai", text: "Ghost ping confirmed. Wake residue persists behind the legal interval.", textI18n: l("\u5E7D\u7075\u8109\u51B2\u5DF2\u786E\u8BA4\u3002\u5408\u6CD5\u95F4\u9694\u4E4B\u540E\u4ECD\u6B8B\u7559\u5C3E\u8FF9\u3002", "\u30B4\u30FC\u30B9\u30C8 ping \u78BA\u8A8D\u3002\u5408\u6CD5\u9593\u9694\u306E\u80CC\u5F8C\u306B\u822A\u8DE1\u6B8B\u7559\u304C\u3042\u308A\u307E\u3059\u3002", "Ping fantome confirme. Un residu de sillage persiste derriere l'intervalle legal.") },
      { speakerId: "mirr-analyst", text: "We are naming the carrier Glass Wake until we know what woke it.", textI18n: l("\u5728\u5F04\u6E05\u662F\u4EC0\u4E48\u5524\u9192\u5B83\u4E4B\u524D\uFF0C\u6211\u4EEC\u6682\u65F6\u628A\u8FD9\u4E2A\u8F7D\u6CE2\u547D\u540D\u4E3A Glass Wake\u3002", "\u4F55\u304C\u305D\u308C\u3092\u8D77\u3053\u3057\u305F\u306E\u304B\u5206\u304B\u308B\u307E\u3067\u3001\u3053\u306E\u642C\u9001\u6CE2\u3092 Glass Wake \u3068\u547C\u3073\u307E\u3059\u3002", "Nous appellerons ce transporteur Glass Wake jusqu'a savoir ce qui l'a reveille.") }
    ]
  },
  {
    id: "dialogue-story-probe-in-glass-accept",
    group: "story",
    title: "Probe in the Glass Briefing",
    titleI18n: l("\u73BB\u7483\u4E2D\u7684\u63A2\u9488\u7B80\u62A5", "\u30AC\u30E9\u30B9\u5185\u306E\u63A2\u67FB\u6A5F \u30D6\u30EA\u30FC\u30D5\u30A3\u30F3\u30B0", "Briefing de la sonde dans le verre"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("\u4FE1\u53F7\u5DF2\u906E\u853D", "\u4FE1\u53F7\u30DE\u30B9\u30AF\u4E2D", "Signal masque"),
    trigger: { kind: "story-accept", missionId: "story-probe-in-glass", chapterId: "glass-wake-02" },
    lines: [
      { speakerId: "mirr-analyst", text: "The probe core is still drifting in the Vale. Its carrier logs are decaying, and the debris field has started answering hails in your voiceprint.", textI18n: l("\u63A2\u9488\u6838\u5FC3\u8FD8\u6F02\u5728\u8C37\u5730\u3002\u5B83\u7684\u8F7D\u6CE2\u65E5\u5FD7\u6B63\u5728\u8870\u51CF\uFF0C\u6B8B\u9AB8\u573A\u5DF2\u7ECF\u5F00\u59CB\u7528\u4F60\u7684\u58F0\u7EB9\u56DE\u5E94\u547C\u53EB\u3002", "\u63A2\u67FB\u6A5F\u30B3\u30A2\u306F\u307E\u3060\u8C37\u9593\u3092\u6F02\u3063\u3066\u3044\u307E\u3059\u3002\u642C\u9001\u6CE2\u30ED\u30B0\u306F\u52A3\u5316\u4E2D\u3067\u3001\u6B8B\u9AB8\u57DF\u306F\u3042\u306A\u305F\u306E\u58F0\u7D0B\u3067\u547C\u3073\u304B\u3051\u306B\u5FDC\u7B54\u3057\u59CB\u3081\u307E\u3057\u305F\u3002", "Le noyau de sonde derive encore dans la Vallee. Ses journaux porteurs se degradent et le champ de debris repond aux appels avec votre empreinte vocale.") },
      { speakerId: "captain", text: "That is new.", textI18n: l("\u8FD9\u5012\u662F\u65B0\u9C9C\u3002", "\u305D\u308C\u306F\u65B0\u3057\u3044\u306A\u3002", "Ca, c'est nouveau.") },
      { speakerId: "ship-ai", text: "Recovery vector includes an unregistered machine silhouette near the wreck.", textI18n: l("\u56DE\u6536\u5411\u91CF\u663E\u793A\u6B8B\u9AB8\u9644\u8FD1\u6709\u4E00\u4E2A\u672A\u6CE8\u518C\u673A\u68B0\u8F6E\u5ED3\u3002", "\u56DE\u53CE\u30D9\u30AF\u30C8\u30EB\u306B\u306F\u3001\u6B8B\u9AB8\u4ED8\u8FD1\u306E\u672A\u767B\u9332\u6A5F\u68B0\u30B7\u30EB\u30A8\u30C3\u30C8\u304C\u542B\u307E\u308C\u307E\u3059\u3002", "Le vecteur de recuperation inclut une silhouette mecanique non enregistree pres de l'epave.") },
      { speakerId: "mirr-analyst", text: "We call it Glass Echo. If it repeats your ship name, do not answer. Destroy it and bring back the core.", textI18n: l("\u6211\u4EEC\u79F0\u5B83\u4E3A Glass Echo\u3002\u5982\u679C\u5B83\u91CD\u590D\u4F60\u7684\u8239\u540D\uFF0C\u4E0D\u8981\u56DE\u7B54\u3002\u6467\u6BC1\u5B83\uFF0C\u628A\u6838\u5FC3\u5E26\u56DE\u6765\u3002", "\u79C1\u305F\u3061\u306F Glass Echo \u3068\u547C\u3093\u3067\u3044\u307E\u3059\u3002\u3042\u306A\u305F\u306E\u8239\u540D\u3092\u7E70\u308A\u8FD4\u3057\u3066\u3082\u5FDC\u7B54\u3057\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002\u7834\u58CA\u3057\u3066\u30B3\u30A2\u3092\u6301\u3061\u5E30\u3063\u3066\u304F\u3060\u3055\u3044\u3002", "Nous l'appelons Glass Echo. S'il repete le nom de votre vaisseau, ne repondez pas. Detruisez-le et rapportez le noyau.") }
    ]
  },
  {
    id: "dialogue-story-probe-in-glass-complete",
    group: "story",
    title: "Probe in the Glass Debrief",
    titleI18n: l("\u73BB\u7483\u4E2D\u7684\u63A2\u9488\u590D\u76D8", "\u30AC\u30E9\u30B9\u5185\u306E\u63A2\u67FB\u6A5F \u30C7\u30D6\u30EA\u30FC\u30D5", "Debriefing de la sonde dans le verre"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("\u4FE1\u53F7\u5DF2\u906E\u853D", "\u4FE1\u53F7\u30DE\u30B9\u30AF\u4E2D", "Signal masque"),
    trigger: { kind: "story-complete", missionId: "story-probe-in-glass", chapterId: "glass-wake-02" },
    lines: [
      { speakerId: "ship-ai", text: "Glass Echo destroyed. Recovered core contains a wake pattern behind legal traffic intervals.", textI18n: l("Glass Echo \u5DF2\u6467\u6BC1\u3002\u56DE\u6536\u6838\u5FC3\u5728\u5408\u6CD5\u901A\u4FE1\u95F4\u9694\u4E4B\u540E\u542B\u6709\u5C3E\u8FF9\u6A21\u5F0F\u3002", "Glass Echo \u3092\u7834\u58CA\u3002\u56DE\u53CE\u30B3\u30A2\u306B\u306F\u5408\u6CD5\u901A\u4FE1\u9593\u9694\u306E\u80CC\u5F8C\u306B\u822A\u8DE1\u30D1\u30BF\u30FC\u30F3\u304C\u3042\u308A\u307E\u3059\u3002", "Glass Echo detruit. Le noyau recupere contient un motif de sillage derriere les intervalles legaux.") },
      { speakerId: "captain", text: "It knew my ship before I touched the wreck.", textI18n: l("\u6211\u8FD8\u6CA1\u78B0\u5230\u6B8B\u9AB8\uFF0C\u5B83\u5C31\u77E5\u9053\u6211\u7684\u8239\u3002", "\u6B8B\u9AB8\u306B\u89E6\u308C\u308B\u524D\u304B\u3089\u3001\u3042\u308C\u306F\u79C1\u306E\u8239\u3092\u77E5\u3063\u3066\u3044\u305F\u3002", "Il connaissait mon vaisseau avant que je touche l'epave.") },
      { speakerId: "mirr-analyst", text: "That means it is not a trap waiting for any ship. It is choosing who trusts the lane.", textI18n: l("\u8FD9\u8BF4\u660E\u5B83\u4E0D\u662F\u7B49\u4EFB\u4F55\u8239\u4E0A\u94A9\u7684\u9677\u9631\u3002\u5B83\u5728\u9009\u62E9\u8C01\u4F1A\u4FE1\u4EFB\u8FD9\u6761\u822A\u9053\u3002", "\u3064\u307E\u308A\u3001\u3069\u306E\u8239\u3067\u3082\u5F85\u3064\u7F60\u3067\u306F\u3042\u308A\u307E\u305B\u3093\u3002\u822A\u8DEF\u3092\u4FE1\u3058\u308B\u76F8\u624B\u3092\u9078\u3093\u3067\u3044\u307E\u3059\u3002", "Cela signifie que ce n'est pas un piege pour n'importe quel vaisseau. Il choisit ceux qui font confiance a la voie.") },
      { speakerId: "captain", text: "Can we separate the carrier from the noise?", textI18n: l("\u80FD\u628A\u8F7D\u6CE2\u4ECE\u566A\u58F0\u91CC\u5206\u79BB\u51FA\u6765\u5417\uFF1F", "\u642C\u9001\u6CE2\u3092\u30CE\u30A4\u30BA\u304B\u3089\u5206\u96E2\u3067\u304D\u308B\u304B\uFF1F", "Peut-on separer le porteur du bruit ?") },
      { speakerId: "mirr-analyst", text: "Not with station filters. Kuro voidglass can split frequencies that software cannot.", textI18n: l("\u9760\u7A7A\u95F4\u7AD9\u8FC7\u6EE4\u5668\u4E0D\u884C\u3002\u9ED1\u5E26\u7684\u865A\u7A7A\u73BB\u7483\u80FD\u62C6\u5F00\u8F6F\u4EF6\u62C6\u4E0D\u5F00\u7684\u9891\u7387\u3002", "\u30B9\u30C6\u30FC\u30B7\u30E7\u30F3\u306E\u30D5\u30A3\u30EB\u30BF\u30FC\u3067\u306F\u7121\u7406\u3067\u3059\u3002\u30AF\u30ED\u306E\u865A\u7A7A\u30AC\u30E9\u30B9\u306A\u3089\u3001\u30BD\u30D5\u30C8\u3067\u306F\u5206\u3051\u3089\u308C\u306A\u3044\u5468\u6CE2\u6570\u3092\u5272\u308C\u307E\u3059\u3002", "Pas avec les filtres de station. Le verre du vide de Kuro peut separer des frequences que le logiciel ne peut pas.") }
    ]
  },
  {
    id: "dialogue-story-kuro-resonance-accept",
    group: "story",
    title: "Kuro Resonance Briefing",
    titleI18n: l("\u9ED1\u5E26\u5171\u632F\u7B80\u62A5", "\u30AF\u30ED\u5171\u9CF4 \u30D6\u30EA\u30FC\u30D5\u30A3\u30F3\u30B0", "Briefing de resonance Kuro"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("\u4FE1\u53F7\u5DF2\u906E\u853D", "\u4FE1\u53F7\u30DE\u30B9\u30AF\u4E2D", "Signal masque"),
    trigger: { kind: "story-accept", missionId: "story-kuro-resonance", chapterId: "glass-wake-03" },
    lines: [
      { speakerId: "kuro-foreman", text: "You want voidglass, you fly slow and mine clean. The belt hates rushed hands.", textI18n: l("\u60F3\u8981\u865A\u7A7A\u73BB\u7483\uFF0C\u5C31\u6162\u6162\u98DE\u3001\u5E72\u51C0\u5730\u91C7\u3002\u77FF\u5E26\u8BA8\u538C\u6025\u624B\u6025\u811A\u3002", "\u865A\u7A7A\u30AC\u30E9\u30B9\u304C\u6B32\u3057\u3044\u306A\u3089\u3001\u3086\u3063\u304F\u308A\u98DB\u3093\u3067\u7DBA\u9E97\u306B\u63A1\u6398\u3057\u308D\u3002\u5E2F\u57DF\u306F\u6025\u3050\u624B\u3092\u5ACC\u3046\u3002", "Vous voulez du verre du vide, volez lentement et minez proprement. La ceinture deteste les mains pressees.") },
      { speakerId: "captain", text: "This sample may tell us who is hiding inside the beacons.", textI18n: l("\u8FD9\u4E2A\u6837\u672C\u4E5F\u8BB8\u80FD\u544A\u8BC9\u6211\u4EEC\uFF0C\u8C01\u85CF\u5728\u90A3\u4E9B\u4FE1\u6807\u91CC\u9762\u3002", "\u3053\u306E\u30B5\u30F3\u30D7\u30EB\u3067\u3001\u30D3\u30FC\u30B3\u30F3\u306E\u4E2D\u306B\u8AB0\u304C\u96A0\u308C\u3066\u3044\u308B\u304B\u5206\u304B\u308B\u304B\u3082\u3057\u308C\u306A\u3044\u3002", "Cet echantillon peut nous dire qui se cache dans les balises.") },
      { speakerId: "kuro-foreman", text: "Then bring enough. One shard sings. Three shards testify.", textI18n: l("\u90A3\u5C31\u5E26\u591F\u3002\u4E00\u7247\u4F1A\u5531\uFF0C\u4E09\u7247\u80FD\u4F5C\u8BC1\u3002", "\u306A\u3089\u5341\u5206\u6301\u3063\u3066\u3053\u3044\u3002\u6B20\u7247\u3072\u3068\u3064\u306F\u6B4C\u3044\u3001\u4E09\u3064\u306A\u3089\u8A3C\u8A00\u3059\u308B\u3002", "Alors rapportez-en assez. Un eclat chante. Trois eclats temoignent.") },
      { speakerId: "ship-ai", text: "Warning: a Listener Drone is counting local drill pulses.", textI18n: l("\u8B66\u544A\uFF1A\u4E00\u67B6 Listener Drone \u6B63\u5728\u8BA1\u6570\u672C\u5730\u94BB\u673A\u8109\u51B2\u3002", "\u8B66\u544A: Listener Drone \u304C\u73FE\u5730\u30C9\u30EA\u30EB\u306E\u30D1\u30EB\u30B9\u3092\u6570\u3048\u3066\u3044\u307E\u3059\u3002", "Avertissement: un Listener Drone compte les impulsions de forage locales.") },
      { speakerId: "kuro-foreman", text: "I lost two cutters to that counting. If it blinks red, burn it before it teaches the rocks to lie.", textI18n: l("\u6211\u6709\u4E24\u8258\u5207\u5272\u8247\u5C31\u683D\u5728\u90A3\u79CD\u8BA1\u6570\u4E0A\u3002\u5B83\u8981\u662F\u95EA\u7EA2\uFF0C\u5148\u70E7\u6389\uFF0C\u522B\u8BA9\u5B83\u6559\u77F3\u5934\u6492\u8C0E\u3002", "\u305D\u306E\u6570\u3048\u65B9\u3067\u30AB\u30C3\u30BF\u30FC\u3092\u4E8C\u96BB\u5931\u3063\u305F\u3002\u8D64\u304F\u70B9\u6EC5\u3057\u305F\u3089\u3001\u5CA9\u306B\u5618\u3092\u6559\u3048\u308B\u524D\u306B\u713C\u3051\u3002", "J'ai perdu deux coupeurs a cause de ce comptage. S'il clignote rouge, brulez-le avant qu'il apprenne aux roches a mentir.") }
    ]
  },
  {
    id: "dialogue-story-kuro-resonance-complete",
    group: "story",
    title: "Kuro Resonance Debrief",
    titleI18n: l("\u9ED1\u5E26\u5171\u632F\u590D\u76D8", "\u30AF\u30ED\u5171\u9CF4 \u30C7\u30D6\u30EA\u30FC\u30D5", "Debriefing de resonance Kuro"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("\u4FE1\u53F7\u5DF2\u906E\u853D", "\u4FE1\u53F7\u30DE\u30B9\u30AF\u4E2D", "Signal masque"),
    trigger: { kind: "story-complete", missionId: "story-kuro-resonance", chapterId: "glass-wake-03" },
    lines: [
      { speakerId: "kuro-foreman", text: "The Listener is scrap, and the voidglass split your ghost signal like a vein under pressure.", textI18n: l("Listener \u5DF2\u6210\u5E9F\u94C1\uFF0C\u865A\u7A7A\u73BB\u7483\u628A\u4F60\u7684\u5E7D\u7075\u4FE1\u53F7\u50CF\u53D7\u538B\u77FF\u8109\u4E00\u6837\u5288\u5F00\u4E86\u3002", "Listener \u306F\u30B9\u30AF\u30E9\u30C3\u30D7\u3060\u3002\u865A\u7A7A\u30AC\u30E9\u30B9\u304C\u5E7D\u970A\u4FE1\u53F7\u3092\u5727\u529B\u4E0B\u306E\u9271\u8108\u307F\u305F\u3044\u306B\u88C2\u3044\u305F\u3002", "Le Listener est en ferraille, et le verre du vide a fendu votre signal fantome comme une veine sous pression.") },
      { speakerId: "captain", text: "Not pirate, not Mirr, not Directorate.", textI18n: l("\u4E0D\u662F\u6D77\u76D7\uFF0C\u4E0D\u662F\u7C73\u5C14\uFF0C\u4E5F\u4E0D\u662F\u7406\u4E8B\u4F1A\u3002", "\u6D77\u8CCA\u3067\u3082\u3001\u30DF\u30EB\u3067\u3082\u3001\u7406\u4E8B\u4F1A\u3067\u3082\u306A\u3044\u3002", "Ni pirate, ni Mirr, ni Directoire.") },
      { speakerId: "ship-ai", text: "Pattern match suggests machine-origin timing. Confidence rising.", textI18n: l("\u6A21\u5F0F\u5339\u914D\u6307\u5411\u673A\u68B0\u6E90\u8BA1\u65F6\u3002\u7F6E\u4FE1\u5EA6\u4E0A\u5347\u3002", "\u30D1\u30BF\u30FC\u30F3\u4E00\u81F4\u306F\u6A5F\u68B0\u7531\u6765\u306E\u30BF\u30A4\u30DF\u30F3\u30B0\u3092\u793A\u5506\u3002\u4FE1\u983C\u5EA6\u4E0A\u6607\u4E2D\u3002", "La correspondance indique un minutage d'origine machine. Confiance en hausse.") },
      { speakerId: "kuro-foreman", text: "Then stop calling it a ghost. Ghosts haunt. Machines wait.", textI18n: l("\u90A3\u5C31\u522B\u518D\u53EB\u5B83\u5E7D\u7075\u3002\u5E7D\u7075\u4F1A\u4F5C\u795F\uFF0C\u673A\u5668\u4F1A\u7B49\u5F85\u3002", "\u306A\u3089\u5E7D\u970A\u3068\u547C\u3076\u306E\u306F\u3084\u3081\u308D\u3002\u5E7D\u970A\u306F\u53D6\u308A\u6191\u304F\u3002\u6A5F\u68B0\u306F\u5F85\u3064\u3002", "Alors cessez de l'appeler fantome. Les fantomes hantent. Les machines attendent.") }
    ]
  },
  {
    id: "dialogue-story-bastion-calibration-accept",
    group: "story",
    title: "Bastion Calibration Briefing",
    titleI18n: l("\u68F1\u5821\u6821\u51C6\u7B80\u62A5", "\u30D0\u30B9\u30C6\u30A3\u30AA\u30F3\u8F03\u6B63 \u30D6\u30EA\u30FC\u30D5\u30A3\u30F3\u30B0", "Briefing de calibration Bastion"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("\u4FE1\u53F7\u5DF2\u906E\u853D", "\u4FE1\u53F7\u30DE\u30B9\u30AF\u4E2D", "Signal masque"),
    trigger: { kind: "story-accept", missionId: "story-bastion-calibration", chapterId: "glass-wake-04" },
    lines: [
      { speakerId: "vantara-officer", text: "Directorate command will provide Calibration Tender C-9. It carries a handshake we do not share with civilians.", textI18n: l("\u7406\u4E8B\u4F1A\u6307\u6325\u90E8\u4F1A\u63D0\u4F9B C-9 \u6821\u51C6\u652F\u63F4\u8247\u3002\u5B83\u643A\u5E26\u4E00\u6BB5\u4E0D\u4F1A\u5206\u4EAB\u7ED9\u5E73\u6C11\u7684\u63E1\u624B\u534F\u8BAE\u3002", "\u7406\u4E8B\u4F1A\u53F8\u4EE4\u90E8\u306F\u8F03\u6B63\u652F\u63F4\u8247 C-9 \u3092\u63D0\u4F9B\u3059\u308B\u3002\u6C11\u9593\u306B\u306F\u5171\u6709\u3057\u306A\u3044\u30CF\u30F3\u30C9\u30B7\u30A7\u30A4\u30AF\u3092\u7A4D\u3093\u3067\u3044\u308B\u3002", "Le commandement du Directoire fournira le tender de calibration C-9. Il porte une poignee de main que nous ne partageons pas avec les civils.") },
      { speakerId: "captain", text: "If the wake answers that, your secure lane is already compromised.", textI18n: l("\u5982\u679C\u90A3\u9053\u5C3E\u8FF9\u56DE\u5E94\u5B83\uFF0C\u4F60\u4EEC\u7684\u5B89\u5168\u822A\u9053\u5C31\u5DF2\u7ECF\u88AB\u653B\u7834\u4E86\u3002", "\u305D\u306E\u822A\u8DE1\u304C\u5FDC\u7B54\u3057\u305F\u3089\u3001\u3042\u306A\u305F\u65B9\u306E\u5B89\u5168\u822A\u8DEF\u306F\u3082\u3046\u4FB5\u5BB3\u3055\u308C\u3066\u3044\u308B\u3002", "Si le sillage repond a cela, votre voie securisee est deja compromise.") },
      { speakerId: "vantara-officer", text: "Correct. Command hates that sentence, so they require it in triplicate.", textI18n: l("\u6B63\u786E\u3002\u6307\u6325\u90E8\u8BA8\u538C\u8FD9\u53E5\u8BDD\uFF0C\u6240\u4EE5\u8981\u6C42\u4E00\u5F0F\u4E09\u4EFD\u3002", "\u6B63\u3057\u3044\u3002\u53F8\u4EE4\u90E8\u306F\u305D\u306E\u4E00\u6587\u3092\u5ACC\u3046\u306E\u3067\u3001\u4E09\u901A\u63D0\u51FA\u3092\u6C42\u3081\u3066\u3044\u308B\u3002", "Exact. Le commandement deteste cette phrase, il l'exige donc en trois exemplaires.") },
      { speakerId: "ship-ai", text: "Two Handshake Mimic drones are expected to shadow the burn.", textI18n: l("\u9884\u8BA1\u4E24\u67B6 Handshake Mimic \u65E0\u4EBA\u673A\u4F1A\u8DDF\u8E2A\u8FD9\u6B21\u9891\u8C31\u71C3\u70E7\u3002", "Handshake Mimic \u30C9\u30ED\u30FC\u30F3\u4E8C\u6A5F\u304C\u71C3\u713C\u822A\u7A0B\u3092\u8FFD\u5C3E\u3059\u308B\u898B\u8FBC\u307F\u3067\u3059\u3002", "Deux drones Handshake Mimic devraient suivre la combustion.") },
      { speakerId: "vantara-officer", text: "Keep the tender alive long enough to record the forgery.", textI18n: l("\u8BA9\u652F\u63F4\u8247\u6D3B\u5230\u8DB3\u4EE5\u8BB0\u5F55\u4F2A\u9020\u8BC1\u636E\u3002", "\u507D\u9020\u3092\u8A18\u9332\u3067\u304D\u308B\u307E\u3067\u652F\u63F4\u8247\u3092\u751F\u304B\u3057\u3066\u304A\u3051\u3002", "Gardez le tender en vie assez longtemps pour enregistrer la falsification.") }
    ]
  },
  {
    id: "dialogue-story-bastion-calibration-complete",
    group: "story",
    title: "Bastion Calibration Debrief",
    titleI18n: l("\u68F1\u5821\u6821\u51C6\u590D\u76D8", "\u30D0\u30B9\u30C6\u30A3\u30AA\u30F3\u8F03\u6B63 \u30C7\u30D6\u30EA\u30FC\u30D5", "Debriefing de calibration Bastion"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("\u4FE1\u53F7\u5DF2\u906E\u853D", "\u4FE1\u53F7\u30DE\u30B9\u30AF\u4E2D", "Signal masque"),
    trigger: { kind: "story-complete", missionId: "story-bastion-calibration", chapterId: "glass-wake-04" },
    lines: [
      { speakerId: "vantara-officer", text: "Calibration confirmed. The mimics answered with Directorate authentication before they fired.", textI18n: l("\u6821\u51C6\u786E\u8BA4\u3002\u62DF\u6001\u673A\u5F00\u706B\u524D\u7528\u7406\u4E8B\u4F1A\u8BA4\u8BC1\u4F5C\u51FA\u4E86\u56DE\u5E94\u3002", "\u8F03\u6B63\u78BA\u8A8D\u3002\u6A21\u5023\u6A5F\u306F\u767A\u7832\u524D\u306B\u7406\u4E8B\u4F1A\u8A8D\u8A3C\u3067\u5FDC\u7B54\u3057\u305F\u3002", "Calibration confirmee. Les imitateurs ont repondu avec une authentification du Directoire avant de tirer.") },
      { speakerId: "captain", text: "Then every patrol lane is a possible lure.", textI18n: l("\u90A3\u6BCF\u6761\u5DE1\u903B\u822A\u9053\u90FD\u53EF\u80FD\u662F\u8BF1\u9975\u3002", "\u306A\u3089\u5168\u3066\u306E\u54E8\u6212\u822A\u8DEF\u304C\u8A98\u3044\u990C\u306B\u306A\u308A\u5F97\u308B\u3002", "Alors chaque voie de patrouille peut etre un leurre.") },
      { speakerId: "vantara-officer", text: "And every officer who called this a research accident just lost the luxury.", textI18n: l("\u800C\u6BCF\u4E2A\u8FD8\u628A\u8FD9\u53EB\u7814\u7A76\u4E8B\u6545\u7684\u519B\u5B98\uFF0C\u90FD\u5931\u53BB\u4E86\u7EE7\u7EED\u7C89\u9970\u7684\u4F59\u5730\u3002", "\u305D\u3057\u3066\u3053\u308C\u3092\u7814\u7A76\u4E8B\u6545\u3068\u547C\u3093\u3067\u3044\u305F\u58EB\u5B98\u5168\u54E1\u304C\u3001\u305D\u306E\u8D05\u6CA2\u3092\u5931\u3063\u305F\u3002", "Et chaque officier qui appelait cela un accident de recherche vient de perdre ce luxe.") },
      { speakerId: "ship-ai", text: "Forged handshake packets include a black-market rebroadcast trail toward Ashen Drift.", textI18n: l("\u4F2A\u9020\u63E1\u624B\u5305\u5305\u542B\u4E00\u6761\u901A\u5411\u7070\u70EC\u6F02\u6D41\u7684\u9ED1\u5E02\u91CD\u64AD\u75D5\u8FF9\u3002", "\u507D\u9020\u30CF\u30F3\u30C9\u30B7\u30A7\u30A4\u30AF\u306B\u306F\u3001\u30A2\u30B7\u30A7\u30F3\u6F02\u6D41\u57DF\u3078\u5411\u304B\u3046\u95C7\u5E02\u5834\u518D\u9001\u4FE1\u306E\u75D5\u8DE1\u304C\u3042\u308A\u307E\u3059\u3002", "Les paquets de poignee de main falsifies contiennent une piste de rediffusion de marche noir vers Ashen Drift.") },
      { speakerId: "vantara-officer", text: "Ashen Freeport is selling something they should not possess.", textI18n: l("\u7070\u70EC\u81EA\u7531\u6E2F\u5728\u51FA\u552E\u4ED6\u4EEC\u4E0D\u8BE5\u62E5\u6709\u7684\u4E1C\u897F\u3002", "Ashen Freeport \u306F\u6301\u3063\u3066\u3044\u3066\u306F\u306A\u3089\u306A\u3044\u3082\u306E\u3092\u58F2\u3063\u3066\u3044\u308B\u3002", "Ashen Freeport vend quelque chose qu'il ne devrait pas posseder.") }
    ]
  },
  {
    id: "dialogue-story-ashen-decoy-manifest-accept",
    group: "story",
    title: "Ashen Decoy Manifest Briefing",
    titleI18n: l("\u7070\u70EC\u8BF1\u9975\u8231\u5355\u7B80\u62A5", "\u30A2\u30B7\u30A7\u30F3\u56EE\u7A4D\u8377\u76EE\u9332 \u30D6\u30EA\u30FC\u30D5\u30A3\u30F3\u30B0", "Briefing du manifeste leurre d'Ashen"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("\u4FE1\u53F7\u5DF2\u906E\u853D", "\u4FE1\u53F7\u30DE\u30B9\u30AF\u4E2D", "Signal masque"),
    trigger: { kind: "story-accept", missionId: "story-ashen-decoy-manifest", chapterId: "glass-wake-05" },
    lines: [
      { speakerId: "ashen-broker", text: "Relief cargo makes a beautiful lie. Pirates open doors for pity and profit.", textI18n: l("\u6551\u63F4\u8D27\u7269\u662F\u5F88\u6F02\u4EAE\u7684\u8C0E\u8A00\u3002\u6D77\u76D7\u4F1A\u4E3A\u601C\u60AF\u548C\u5229\u6DA6\u5F00\u95E8\u3002", "\u6551\u63F4\u8CA8\u7269\u306F\u7F8E\u3057\u3044\u5618\u306B\u306A\u308B\u3002\u6D77\u8CCA\u306F\u54C0\u308C\u307F\u3068\u5229\u76CA\u306E\u305F\u3081\u306B\u6249\u3092\u958B\u304F\u3002", "Une cargaison de secours fait un beau mensonge. Les pirates ouvrent les portes a la pitie et au profit.") },
      { speakerId: "captain", text: "You want me to deliver bait to Ashen Freeport.", textI18n: l("\u4F60\u60F3\u8BA9\u6211\u628A\u8BF1\u9975\u9001\u5230\u7070\u70EC\u81EA\u7531\u6E2F\u3002", "\u79C1\u306B\u990C\u3092 Ashen Freeport \u3078\u904B\u3070\u305B\u305F\u3044\u3093\u3060\u306A\u3002", "Vous voulez que je livre un appat a Ashen Freeport.") },
      { speakerId: "ashen-broker", text: "I want you to deliver hope with a forged shadow. The first beacon to answer is either hungry or guilty.", textI18n: l("\u6211\u60F3\u8BA9\u4F60\u9001\u53BB\u5E26\u4F2A\u9020\u5F71\u5B50\u7684\u5E0C\u671B\u3002\u7B2C\u4E00\u4E2A\u56DE\u5E94\u7684\u4FE1\u6807\uFF0C\u8981\u4E48\u9965\u997F\uFF0C\u8981\u4E48\u6709\u7F6A\u3002", "\u507D\u306E\u5F71\u3092\u307E\u3068\u3063\u305F\u5E0C\u671B\u3092\u5C4A\u3051\u3066\u307B\u3057\u3044\u3002\u6700\u521D\u306B\u5FDC\u3048\u308B\u30D3\u30FC\u30B3\u30F3\u306F\u3001\u98E2\u3048\u3066\u3044\u308B\u304B\u7F6A\u3092\u62B1\u3048\u3066\u3044\u308B\u3002", "Je veux que vous livriez de l'espoir avec une ombre forge. La premiere balise qui repondra aura faim ou sera coupable.") },
      { speakerId: "ship-ai", text: "Decoy manifest seeded. Expected false reply: Mercy-class relief priority.", textI18n: l("\u8BF1\u9975\u8231\u5355\u5DF2\u690D\u5165\u3002\u9884\u671F\u865A\u5047\u56DE\u5E94\uFF1AMercy \u7EA7\u6551\u63F4\u4F18\u5148\u3002", "\u56EE\u306E\u7A4D\u8377\u76EE\u9332\u3092\u6295\u5165\u3002\u4E88\u60F3\u3055\u308C\u308B\u507D\u5FDC\u7B54: Mercy \u7D1A\u6551\u63F4\u512A\u5148\u3002", "Manifeste leurre injecte. Fausse reponse attendue : priorite de secours classe Mercy.") },
      { speakerId: "ashen-broker", text: "If the False Mercy Relay wakes up, break it before it sells your kindness back to you.", textI18n: l("\u5982\u679C False Mercy Relay \u9192\u6765\uFF0C\u5728\u5B83\u628A\u4F60\u7684\u5584\u610F\u5012\u5356\u7ED9\u4F60\u4E4B\u524D\u6253\u788E\u5B83\u3002", "False Mercy Relay \u304C\u76EE\u899A\u3081\u305F\u3089\u3001\u3042\u306A\u305F\u306E\u5584\u610F\u3092\u58F2\u308A\u8FD4\u3055\u308C\u308B\u524D\u306B\u58CA\u3057\u3066\u3002", "Si le False Mercy Relay se reveille, brisez-le avant qu'il vous revende votre gentillesse.") }
    ]
  },
  {
    id: "dialogue-story-ashen-decoy-manifest-complete",
    group: "story",
    title: "Ashen Decoy Manifest Debrief",
    titleI18n: l("\u7070\u70EC\u8BF1\u9975\u8231\u5355\u590D\u76D8", "\u30A2\u30B7\u30A7\u30F3\u56EE\u7A4D\u8377\u76EE\u9332 \u30C7\u30D6\u30EA\u30FC\u30D5", "Debriefing du manifeste leurre d'Ashen"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("\u4FE1\u53F7\u5DF2\u906E\u853D", "\u4FE1\u53F7\u30DE\u30B9\u30AF\u4E2D", "Signal masque"),
    trigger: { kind: "story-complete", missionId: "story-ashen-decoy-manifest", chapterId: "glass-wake-05" },
    lines: [
      { speakerId: "ashen-broker", text: "False Mercy is gone. The Knife Wing repeated the carrier, but they did not write it.", textI18n: l("False Mercy \u5DF2\u7ECF\u6CA1\u4E86\u3002Knife Wing \u590D\u8BFB\u4E86\u8F7D\u6CE2\uFF0C\u4F46\u4E0D\u662F\u4ED6\u4EEC\u5199\u51FA\u6765\u7684\u3002", "False Mercy \u306F\u6D88\u3048\u305F\u3002Knife Wing \u306F\u642C\u9001\u6CE2\u3092\u7E70\u308A\u8FD4\u3057\u305F\u3051\u308C\u3069\u3001\u66F8\u3044\u305F\u306E\u306F\u5F7C\u3089\u3067\u306F\u306A\u3044\u3002", "False Mercy a disparu. Knife Wing a repete le porteur, mais ils ne l'ont pas ecrit.") },
      { speakerId: "captain", text: "They are a mirror, not the source.", textI18n: l("\u4ED6\u4EEC\u662F\u955C\u5B50\uFF0C\u4E0D\u662F\u6E90\u5934\u3002", "\u5F7C\u3089\u306F\u93E1\u3067\u3042\u3063\u3066\u3001\u6E90\u3067\u306F\u306A\u3044\u3002", "Ils sont un miroir, pas la source.") },
      { speakerId: "ashen-broker", text: "A mirror with a price tag. Their relay pilots are auctioning fragments of a song they cannot hear.", textI18n: l("\u4E00\u9762\u8D34\u7740\u4EF7\u7B7E\u7684\u955C\u5B50\u3002\u4ED6\u4EEC\u7684\u4E2D\u7EE7\u98DE\u884C\u5458\u5728\u62CD\u5356\u4E00\u9996\u81EA\u5DF1\u542C\u4E0D\u89C1\u7684\u6B4C\u7684\u788E\u7247\u3002", "\u5024\u672D\u3064\u304D\u306E\u93E1\u3088\u3002\u4E2D\u7D99\u30D1\u30A4\u30ED\u30C3\u30C8\u305F\u3061\u306F\u3001\u81EA\u5206\u306B\u306F\u805E\u3053\u3048\u306A\u3044\u6B4C\u306E\u65AD\u7247\u3092\u7AF6\u58F2\u3057\u3066\u3044\u308B\u3002", "Un miroir avec une etiquette de prix. Leurs pilotes relais vendent aux encheres des fragments d'une chanson qu'ils n'entendent pas.") },
      { speakerId: "ship-ai", text: "Three Knife Wing relay craft marked.", textI18n: l("\u4E09\u8258 Knife Wing \u4E2D\u7EE7\u8247\u5DF2\u6807\u8BB0\u3002", "Knife Wing \u4E2D\u7D99\u8247\u4E09\u96BB\u3092\u30DE\u30FC\u30AD\u30F3\u30B0\u3002", "Trois appareils relais Knife Wing marques.") },
      { speakerId: "ashen-broker", text: "Break the mirror before every black-market lane learns the tune.", textI18n: l("\u5728\u6BCF\u6761\u9ED1\u5E02\u822A\u9053\u90FD\u5B66\u4F1A\u8FD9\u6BB5\u65CB\u5F8B\u4E4B\u524D\uFF0C\u6253\u788E\u90A3\u9762\u955C\u5B50\u3002", "\u3059\u3079\u3066\u306E\u95C7\u5E02\u5834\u822A\u8DEF\u304C\u305D\u306E\u65CB\u5F8B\u3092\u899A\u3048\u308B\u524D\u306B\u3001\u93E1\u3092\u5272\u3063\u3066\u3002", "Brisez le miroir avant que chaque voie du marche noir apprenne l'air.") }
    ]
  },
  {
    id: "dialogue-story-knife-wing-relay-accept",
    group: "story",
    title: "Knife Wing Relay Briefing",
    titleI18n: l("Knife Wing \u4E2D\u7EE7\u7B80\u62A5", "Knife Wing \u4E2D\u7D99 \u30D6\u30EA\u30FC\u30D5\u30A3\u30F3\u30B0", "Briefing du relais Knife Wing"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("\u4FE1\u53F7\u5DF2\u906E\u853D", "\u4FE1\u53F7\u30DE\u30B9\u30AF\u4E2D", "Signal masque"),
    trigger: { kind: "story-accept", missionId: "story-knife-wing-relay", chapterId: "glass-wake-06" },
    lines: [
      { speakerId: "ashen-broker", text: "Three Knife Wing contacts are carrying relay keys: Red Relay, Black Relay, and the Broken Choir Ace.", textI18n: l("\u4E09\u4E2A Knife Wing \u63A5\u89E6\u76EE\u6807\u643A\u5E26\u4E2D\u7EE7\u94A5\u5319\uFF1ARed Relay\u3001Black Relay\uFF0C\u4EE5\u53CA Broken Choir Ace\u3002", "Knife Wing \u306E\u63A5\u89E6\u4E09\u6A5F\u304C\u4E2D\u7D99\u30AD\u30FC\u3092\u6301\u3063\u3066\u3044\u308B: Red Relay\u3001Black Relay\u3001Broken Choir Ace\u3002", "Trois contacts Knife Wing portent des cles relais : Red Relay, Black Relay et Broken Choir Ace.") },
      { speakerId: "captain", text: "The names sound theatrical.", textI18n: l("\u8FD9\u4E9B\u540D\u5B57\u542C\u8D77\u6765\u5F88\u620F\u5267\u5316\u3002", "\u540D\u524D\u304C\u829D\u5C45\u304C\u304B\u3063\u3066\u3044\u308B\u306A\u3002", "Ces noms sonnent th\xE9\xE2traux.") },
      { speakerId: "ashen-broker", text: "That is how amateurs make themselves memorable before they die.", textI18n: l("\u4E1A\u4F59\u8005\u5C31\u662F\u8FD9\u6837\u5728\u6B7B\u524D\u8BA9\u522B\u4EBA\u8BB0\u4F4F\u81EA\u5DF1\u3002", "\u7D20\u4EBA\u306F\u6B7B\u306C\u524D\u306B\u305D\u3046\u3084\u3063\u3066\u540D\u3092\u6B8B\u305D\u3046\u3068\u3059\u308B\u3002", "C'est ainsi que les amateurs se rendent memorables avant de mourir.") },
      { speakerId: "ship-ai", text: "Combat routing marked. Story relay targets will sort above common pirate traffic.", textI18n: l("\u6218\u6597\u822A\u8DEF\u5DF2\u6807\u8BB0\u3002\u5267\u60C5\u4E2D\u7EE7\u76EE\u6807\u4F1A\u6392\u5728\u666E\u901A\u6D77\u76D7\u6D41\u91CF\u4E4B\u4E0A\u3002", "\u6226\u95D8\u30EB\u30FC\u30C8\u3092\u30DE\u30FC\u30AD\u30F3\u30B0\u3002\u7269\u8A9E\u4E2D\u7D99\u76EE\u6A19\u306F\u901A\u5E38\u306E\u6D77\u8CCA\u901A\u4FE1\u3088\u308A\u4E0A\u4F4D\u306B\u4E26\u3073\u307E\u3059\u3002", "Routage de combat marque. Les cibles relais de l'histoire passeront avant le trafic pirate courant.") },
      { speakerId: "ashen-broker", text: "Kill the auction before the bidders learn what they are buying.", textI18n: l("\u5728\u7ADE\u4EF7\u8005\u641E\u61C2\u81EA\u5DF1\u4E70\u7684\u662F\u4EC0\u4E48\u4E4B\u524D\uFF0C\u7EC8\u7ED3\u8FD9\u573A\u62CD\u5356\u3002", "\u5165\u672D\u8005\u305F\u3061\u304C\u4F55\u3092\u8CB7\u3063\u3066\u3044\u308B\u304B\u77E5\u308B\u524D\u306B\u3001\u7AF6\u58F2\u3092\u6BBA\u3057\u3066\u3002", "Tuez l'enchere avant que les acheteurs apprennent ce qu'ils achetent.") }
    ]
  },
  {
    id: "dialogue-story-knife-wing-relay-complete",
    group: "story",
    title: "Knife Wing Relay Debrief",
    titleI18n: l("Knife Wing \u4E2D\u7EE7\u590D\u76D8", "Knife Wing \u4E2D\u7D99 \u30C7\u30D6\u30EA\u30FC\u30D5", "Debriefing du relais Knife Wing"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("\u4FE1\u53F7\u5DF2\u906E\u853D", "\u4FE1\u53F7\u30DE\u30B9\u30AF\u4E2D", "Signal masque"),
    trigger: { kind: "story-complete", missionId: "story-knife-wing-relay", chapterId: "glass-wake-06" },
    lines: [
      { speakerId: "ship-ai", text: "Knife Wing relay packets terminated. Broken Choir carried a final vector toward Celest Gate.", textI18n: l("Knife Wing \u4E2D\u7EE7\u5305\u5DF2\u7EC8\u6B62\u3002Broken Choir \u643A\u5E26\u6700\u540E\u4E00\u6761\u6307\u5411 Celest Gate \u7684\u5411\u91CF\u3002", "Knife Wing \u4E2D\u7D99\u30D1\u30B1\u30C3\u30C8\u7D42\u4E86\u3002Broken Choir \u306F Celest Gate \u3078\u306E\u6700\u7D42\u30D9\u30AF\u30C8\u30EB\u3092\u4FDD\u6301\u3057\u3066\u3044\u307E\u3057\u305F\u3002", "Paquets relais Knife Wing termines. Broken Choir portait un dernier vecteur vers Celest Gate.") },
      { speakerId: "captain", text: "Luxury traffic, clean arbitration, perfect cover.", textI18n: l("\u5962\u534E\u4EA4\u901A\u3001\u6D01\u51C0\u4EF2\u88C1\uFF0C\u5B8C\u7F8E\u63A9\u62A4\u3002", "\u9AD8\u7D1A\u4EA4\u901A\u3001\u6E05\u6F54\u306A\u4EF2\u88C1\u3001\u5B8C\u74A7\u306A\u96A0\u308C\u84D1\u3002", "Trafic de luxe, arbitrage propre, couverture parfaite.") },
      { speakerId: "ashen-broker", text: "And perfect denial. Celest can call pirates a local problem unless witnesses force the word shared.", textI18n: l("\u8FD8\u6709\u5B8C\u7F8E\u5426\u8BA4\u3002\u9664\u975E\u8BC1\u4EBA\u903C\u4ED6\u4EEC\u627F\u8BA4\u8FD9\u662F\u5171\u540C\u5371\u673A\uFF0CCelest \u53EF\u4EE5\u8BF4\u6D77\u76D7\u53EA\u662F\u672C\u5730\u95EE\u9898\u3002", "\u305D\u3057\u3066\u5B8C\u74A7\u306A\u5426\u8A8D\u3002\u8A3C\u4EBA\u304C\u5171\u6709\u554F\u984C\u3068\u3044\u3046\u8A00\u8449\u3092\u5F37\u5236\u3057\u306A\u3044\u9650\u308A\u3001Celest \u306F\u6D77\u8CCA\u3092\u5730\u57DF\u554F\u984C\u3068\u8A00\u3048\u308B\u3002", "Et un deni parfait. Celest peut dire que les pirates sont un probleme local, sauf si des temoins imposent le mot commun.") },
      { speakerId: "union-witness", text: "I can bring miners, analysts, and one Directorate seal. None of them like each other.", textI18n: l("\u6211\u80FD\u5E26\u6765\u77FF\u5DE5\u3001\u5206\u6790\u5458\u548C\u4E00\u679A\u7406\u4E8B\u4F1A\u5370\u7AE0\u3002\u4ED6\u4EEC\u8C01\u4E5F\u4E0D\u559C\u6B22\u8C01\u3002", "\u9271\u592B\u3001\u5206\u6790\u5B98\u3001\u7406\u4E8B\u4F1A\u306E\u5370\u7AE0\u3092\u3072\u3068\u3064\u9023\u308C\u3066\u3053\u3089\u308C\u308B\u3002\u8AB0\u3082\u4E92\u3044\u3092\u597D\u304D\u3058\u3083\u306A\u3044\u3002", "Je peux amener des mineurs, des analystes et un sceau du Directoire. Aucun ne s'aime.") },
      { speakerId: "ashen-broker", text: "Good. Celest listens better when liability has names.", textI18n: l("\u5F88\u597D\u3002\u5F53\u8D23\u4EFB\u6709\u4E86\u540D\u5B57\uFF0CCelest \u4F1A\u66F4\u613F\u610F\u542C\u3002", "\u3044\u3044\u308F\u3002\u8CAC\u4EFB\u306B\u540D\u524D\u304C\u3064\u304F\u3068\u3001Celest \u306F\u3088\u304F\u805E\u304F\u3002", "Bien. Celest ecoute mieux quand la responsabilite a des noms.") }
    ]
  },
  {
    id: "dialogue-story-witnesses-to-celest-accept",
    group: "story",
    title: "Witnesses to Celest Briefing",
    titleI18n: l("\u524D\u5F80 Celest \u7684\u8BC1\u4EBA\u7B80\u62A5", "Celest \u3078\u306E\u8A3C\u4EBA \u30D6\u30EA\u30FC\u30D5\u30A3\u30F3\u30B0", "Briefing des temoins pour Celest"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("\u4FE1\u53F7\u5DF2\u906E\u853D", "\u4FE1\u53F7\u30DE\u30B9\u30AF\u4E2D", "Signal masque"),
    trigger: { kind: "story-accept", missionId: "story-witnesses-to-celest", chapterId: "glass-wake-07" },
    lines: [
      { speakerId: "union-witness", text: "I have miners, analysts, and a Directorate seal packed into one nervous delegation.", textI18n: l("\u6211\u628A\u77FF\u5DE5\u3001\u5206\u6790\u5458\u548C\u4E00\u679A\u7406\u4E8B\u4F1A\u5370\u7AE0\u585E\u8FDB\u4E86\u540C\u4E00\u4E2A\u7D27\u5F20\u7684\u4EE3\u8868\u56E2\u3002", "\u9271\u592B\u3001\u5206\u6790\u5B98\u3001\u7406\u4E8B\u4F1A\u306E\u5370\u7AE0\u3092\u3001\u3072\u3068\u3064\u306E\u795E\u7D4C\u8CEA\u306A\u4EE3\u8868\u56E3\u306B\u8A70\u3081\u8FBC\u3093\u3060\u3002", "J'ai entasse des mineurs, des analystes et un sceau du Directoire dans une delegation nerveuse.") },
      { speakerId: "captain", text: "They ride quiet, or they do not ride.", textI18n: l("\u4ED6\u4EEC\u5B89\u9759\u642D\u8239\uFF0C\u5426\u5219\u5C31\u522B\u642D\u3002", "\u9759\u304B\u306B\u4E57\u308B\u304B\u3001\u4E57\u3089\u306A\u3044\u304B\u3060\u3002", "Ils voyagent en silence, ou ils ne voyagent pas.") },
      { speakerId: "union-witness", text: "They know. The Mirr analyst is scared, the officer is offended, and my miners want to punch both.", textI18n: l("\u4ED6\u4EEC\u77E5\u9053\u3002\u7C73\u5C14\u5206\u6790\u5458\u5F88\u5BB3\u6015\uFF0C\u519B\u5B98\u5F88\u53D7\u5192\u72AF\uFF0C\u6211\u7684\u77FF\u5DE5\u60F3\u628A\u4E24\u8FB9\u90FD\u63CD\u4E00\u987F\u3002", "\u5206\u304B\u3063\u3066\u3044\u308B\u3002\u30DF\u30EB\u5206\u6790\u5B98\u306F\u602F\u3048\u3001\u58EB\u5B98\u306F\u6012\u308A\u3001\u3046\u3061\u306E\u9271\u592B\u306F\u4E21\u65B9\u3092\u6BB4\u308A\u305F\u304C\u3063\u3066\u3044\u308B\u3002", "Ils le savent. L'analyste Mirr a peur, l'officier est vexe, et mes mineurs veulent frapper les deux.") },
      { speakerId: "ship-ai", text: "Celest approach includes a Witness Jammer broadcasting arbitration silence.", textI18n: l("Celest \u8FDB\u8FD1\u822A\u8DEF\u5305\u542B\u4E00\u4E2A\u6B63\u5728\u5E7F\u64AD\u4EF2\u88C1\u9759\u9ED8\u7684 Witness Jammer\u3002", "Celest \u9032\u5165\u7D4C\u8DEF\u306B\u306F\u3001\u4EF2\u88C1\u6C88\u9ED9\u3092\u653E\u9001\u3059\u308B Witness Jammer \u304C\u542B\u307E\u308C\u307E\u3059\u3002", "L'approche de Celest inclut un Witness Jammer qui diffuse un silence d'arbitrage.") },
      { speakerId: "union-witness", text: "Then make the silence loud. Get us to Celest Vault and the blockade vote becomes real.", textI18n: l("\u90A3\u5C31\u8BA9\u6C89\u9ED8\u53D8\u5F97\u54CD\u4EAE\u3002\u628A\u6211\u4EEC\u9001\u5230 Celest Vault\uFF0C\u5C01\u9501\u6295\u7968\u624D\u4F1A\u6210\u771F\u3002", "\u306A\u3089\u6C88\u9ED9\u3092\u5927\u304D\u304F\u3057\u308D\u3002Celest Vault \u3078\u5C4A\u3051\u308C\u3070\u3001\u5C01\u9396\u6295\u7968\u306F\u73FE\u5B9F\u306B\u306A\u308B\u3002", "Alors rendez le silence bruyant. Amenez-nous a Celest Vault et le vote de blocus deviendra reel.") }
    ]
  },
  {
    id: "dialogue-story-witnesses-to-celest-complete",
    group: "story",
    title: "Witnesses to Celest Debrief",
    titleI18n: l("\u524D\u5F80 Celest \u7684\u8BC1\u4EBA\u590D\u76D8", "Celest \u3078\u306E\u8A3C\u4EBA \u30C7\u30D6\u30EA\u30FC\u30D5", "Debriefing des temoins pour Celest"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("\u4FE1\u53F7\u5DF2\u906E\u853D", "\u4FE1\u53F7\u30DE\u30B9\u30AF\u4E2D", "Signal masque"),
    trigger: { kind: "story-complete", missionId: "story-witnesses-to-celest", chapterId: "glass-wake-07" },
    lines: [
      { speakerId: "celest-archivist", text: "The testimony is sealed. Celest Vault recognizes a shared emergency.", textI18n: l("\u8BC1\u8BCD\u5DF2\u5C01\u5B58\u3002Celest Vault \u627F\u8BA4\u8FD9\u662F\u5171\u540C\u7D27\u6025\u4E8B\u6001\u3002", "\u8A3C\u8A00\u306F\u5C01\u5370\u3055\u308C\u307E\u3057\u305F\u3002Celest Vault \u306F\u5171\u6709\u7DCA\u6025\u4E8B\u614B\u3092\u8A8D\u5B9A\u3057\u307E\u3059\u3002", "Le temoignage est scelle. Celest Vault reconnait une urgence partagee.") },
      { speakerId: "captain", text: "That sounded almost reluctant.", textI18n: l("\u542C\u8D77\u6765\u51E0\u4E4E\u662F\u52C9\u5F3A\u627F\u8BA4\u3002", "\u307B\u3068\u3093\u3069\u6E0B\u3005\u306B\u805E\u3053\u3048\u305F\u3002", "Cela sonnait presque contraint.") },
      { speakerId: "celest-archivist", text: "Archives prefer certainty. Today we have fear, signatures, and enough liability to move a gate.", textI18n: l("\u6863\u6848\u66F4\u559C\u6B22\u786E\u5B9A\u6027\u3002\u4ECA\u5929\u6211\u4EEC\u6709\u6050\u60E7\u3001\u7B7E\u540D\uFF0C\u4EE5\u53CA\u8DB3\u4EE5\u63A8\u52A8\u661F\u95E8\u7684\u8D23\u4EFB\u3002", "\u8A18\u9332\u306F\u78BA\u5B9F\u6027\u3092\u597D\u307F\u307E\u3059\u3002\u4ECA\u65E5\u306F\u6050\u6016\u3001\u7F72\u540D\u3001\u305D\u3057\u3066\u30B2\u30FC\u30C8\u3092\u52D5\u304B\u3059\u3060\u3051\u306E\u8CAC\u4EFB\u304C\u3042\u308A\u307E\u3059\u3002", "Les archives preferent la certitude. Aujourd'hui nous avons la peur, les signatures et assez de responsabilite pour deplacer une porte.") },
      { speakerId: "mirr-analyst", text: "Open the path to the relay core.", textI18n: l("\u6253\u5F00\u901A\u5F80\u4E2D\u7EE7\u6838\u5FC3\u7684\u8DEF\u5F84\u3002", "\u4E2D\u7D99\u30B3\u30A2\u3078\u306E\u9053\u3092\u958B\u3051\u3066\u304F\u3060\u3055\u3044\u3002", "Ouvrez la voie vers le noyau relais.") },
      { speakerId: "celest-archivist", text: "Path opened. If the crown goes quiet, the lanes may breathe again.", textI18n: l("\u8DEF\u5F84\u5DF2\u6253\u5F00\u3002\u5982\u679C\u738B\u51A0\u6C89\u5BC2\uFF0C\u822A\u9053\u4E5F\u8BB8\u8FD8\u80FD\u91CD\u65B0\u547C\u5438\u3002", "\u9053\u3092\u958B\u304D\u307E\u3057\u305F\u3002\u738B\u51A0\u304C\u9759\u307E\u308C\u3070\u3001\u822A\u8DEF\u306F\u307E\u305F\u606F\u3092\u3067\u304D\u307E\u3059\u3002", "Voie ouverte. Si la couronne se tait, les voies pourront peut-etre respirer a nouveau.") }
    ]
  },
  {
    id: "dialogue-story-quiet-crown-relay-accept",
    group: "story",
    title: "Quiet Crown Relay Briefing",
    titleI18n: l("\u5BC2\u9759\u738B\u51A0\u4E2D\u7EE7\u7B80\u62A5", "\u9759\u304B\u306A\u738B\u51A0\u4E2D\u7D99 \u30D6\u30EA\u30FC\u30D5\u30A3\u30F3\u30B0", "Briefing du relais Quiet Crown"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("\u4FE1\u53F7\u5DF2\u906E\u853D", "\u4FE1\u53F7\u30DE\u30B9\u30AF\u4E2D", "Signal masque"),
    trigger: { kind: "story-accept", missionId: "story-quiet-crown-relay", chapterId: "glass-wake-08" },
    lines: [
      { speakerId: "celest-archivist", text: "The Quiet Crown relay sits below premium traffic. It is quiet because it is listening.", textI18n: l("Quiet Crown \u4E2D\u7EE7\u4F4D\u4E8E\u9AD8\u7EA7\u4EA4\u901A\u4E4B\u4E0B\u3002\u5B83\u5B89\u9759\uFF0C\u662F\u56E0\u4E3A\u5B83\u5728\u542C\u3002", "Quiet Crown \u4E2D\u7D99\u306F\u9AD8\u7D1A\u4EA4\u901A\u306E\u4E0B\u306B\u3042\u308A\u307E\u3059\u3002\u9759\u304B\u306A\u306E\u306F\u3001\u805E\u3044\u3066\u3044\u308B\u304B\u3089\u3067\u3059\u3002", "Le relais Quiet Crown se trouve sous le trafic premium. Il est silencieux parce qu'il ecoute.") },
      { speakerId: "captain", text: "Recover the core, shut down the carrier, leave the gate standing.", textI18n: l("\u56DE\u6536\u6838\u5FC3\uFF0C\u5173\u95ED\u8F7D\u6CE2\uFF0C\u4FDD\u7559\u661F\u95E8\u3002", "\u30B3\u30A2\u3092\u56DE\u53CE\u3057\u3001\u642C\u9001\u6CE2\u3092\u505C\u6B62\u3057\u3001\u30B2\u30FC\u30C8\u306F\u6B8B\u3059\u3002", "Recuperer le noyau, eteindre le porteur, laisser la porte debout.") },
      { speakerId: "ship-ai", text: "Two Crown Warden drones and one relay core marked. Unknown machine timing remains active inside the carrier.", textI18n: l("\u4E24\u67B6 Crown Warden \u65E0\u4EBA\u673A\u548C\u4E00\u4E2A\u4E2D\u7EE7\u6838\u5FC3\u5DF2\u6807\u8BB0\u3002\u672A\u77E5\u673A\u68B0\u8BA1\u65F6\u4ECD\u5728\u8F7D\u6CE2\u5185\u90E8\u6D3B\u52A8\u3002", "Crown Warden \u30C9\u30ED\u30FC\u30F3\u4E8C\u6A5F\u3068\u4E2D\u7D99\u30B3\u30A2\u4E00\u57FA\u3092\u30DE\u30FC\u30AD\u30F3\u30B0\u3002\u672A\u77E5\u6A5F\u68B0\u30BF\u30A4\u30DF\u30F3\u30B0\u306F\u642C\u9001\u6CE2\u5185\u3067\u307E\u3060\u6D3B\u52D5\u4E2D\u3002", "Deux drones Crown Warden et un noyau relais marques. Le minutage machine inconnu reste actif dans le porteur.") },
      { speakerId: "mirr-analyst", text: "Do not just pull the core. Break the wardens first, or the relay may write your ship into its next lure.", textI18n: l("\u4E0D\u8981\u53EA\u62D4\u6838\u5FC3\u3002\u5148\u6253\u788E\u5B88\u536B\uFF0C\u5426\u5219\u4E2D\u7EE7\u53EF\u80FD\u628A\u4F60\u7684\u8239\u5199\u8FDB\u4E0B\u4E00\u6B21\u8BF1\u9975\u3002", "\u30B3\u30A2\u3092\u629C\u304F\u3060\u3051\u3067\u306F\u3060\u3081\u3067\u3059\u3002\u5148\u306B\u756A\u4EBA\u3092\u58CA\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u3055\u3082\u306A\u3044\u3068\u4E2D\u7D99\u304C\u3042\u306A\u305F\u306E\u8239\u3092\u6B21\u306E\u8A98\u3044\u990C\u306B\u66F8\u304D\u8FBC\u307F\u307E\u3059\u3002", "Ne retirez pas seulement le noyau. Brisez d'abord les gardiens, sinon le relais pourrait inscrire votre vaisseau dans son prochain leurre.") },
      { speakerId: "celest-archivist", text: "When you cut it, every lane will hear the absence.", textI18n: l("\u5F53\u4F60\u5207\u65AD\u5B83\uFF0C\u6BCF\u6761\u822A\u9053\u90FD\u4F1A\u542C\u89C1\u90A3\u4EFD\u7F3A\u5E2D\u3002", "\u305D\u308C\u3092\u5207\u308C\u3070\u3001\u3059\u3079\u3066\u306E\u822A\u8DEF\u304C\u305D\u306E\u4E0D\u5728\u3092\u805E\u304F\u3067\u3057\u3087\u3046\u3002", "Quand vous le couperez, chaque voie entendra l'absence.") }
    ]
  },
  {
    id: "dialogue-story-quiet-crown-relay-complete",
    group: "story",
    title: "Quiet Crown Relay Debrief",
    titleI18n: l("\u5BC2\u9759\u738B\u51A0\u4E2D\u7EE7\u590D\u76D8", "\u9759\u304B\u306A\u738B\u51A0\u4E2D\u7D99 \u30C7\u30D6\u30EA\u30FC\u30D5", "Debriefing du relais Quiet Crown"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("\u4FE1\u53F7\u5DF2\u906E\u853D", "\u4FE1\u53F7\u30DE\u30B9\u30AF\u4E2D", "Signal masque"),
    trigger: { kind: "story-complete", missionId: "story-quiet-crown-relay", chapterId: "glass-wake-08" },
    lines: [
      { speakerId: "ship-ai", text: "Glass Wake carrier removed from public lanes. Relay core retains one final listener trace.", textI18n: l("Glass Wake \u8F7D\u6CE2\u5DF2\u4ECE\u516C\u5171\u822A\u9053\u79FB\u9664\u3002\u4E2D\u7EE7\u6838\u5FC3\u4FDD\u7559\u6700\u540E\u4E00\u9053\u76D1\u542C\u8005\u75D5\u8FF9\u3002", "Glass Wake \u642C\u9001\u6CE2\u3092\u516C\u5171\u822A\u8DEF\u304B\u3089\u9664\u53BB\u3002\u4E2D\u7D99\u30B3\u30A2\u306B\u306F\u6700\u5F8C\u306E\u805E\u304D\u624B\u306E\u75D5\u8DE1\u304C\u6B8B\u3063\u3066\u3044\u307E\u3059\u3002", "Porteur Glass Wake retire des voies publiques. Le noyau relais conserve une derniere trace d'ecouteur.") },
      { speakerId: "captain", text: "Unknown Drones.", textI18n: l("\u672A\u77E5\u65E0\u4EBA\u673A\u3002", "Unknown Drones\u3002", "Unknown Drones.") },
      { speakerId: "mirr-analyst", text: "They were not shouting through the lanes. They were waiting to learn who would close them.", textI18n: l("\u5B83\u4EEC\u4E0D\u662F\u5728\u822A\u9053\u91CC\u558A\u53EB\u3002\u5B83\u4EEC\u662F\u5728\u7B49\u7740\u5B66\u4E60\u8C01\u4F1A\u5173\u95ED\u822A\u9053\u3002", "\u5F7C\u3089\u306F\u822A\u8DEF\u3067\u53EB\u3093\u3067\u3044\u305F\u306E\u3067\u306F\u3042\u308A\u307E\u305B\u3093\u3002\u8AB0\u304C\u822A\u8DEF\u3092\u9589\u3058\u308B\u304B\u5B66\u307C\u3046\u3068\u5F85\u3063\u3066\u3044\u305F\u306E\u3067\u3059\u3002", "Ils ne criaient pas dans les voies. Ils attendaient d'apprendre qui les fermerait.") },
      { speakerId: "celest-archivist", text: "Celest traffic is clean again. The archive will call this an emergency resolved.", textI18n: l("Celest \u4EA4\u901A\u518D\u6B21\u6D01\u51C0\u3002\u6863\u6848\u4F1A\u628A\u8FD9\u79F0\u4E3A\u5DF2\u89E3\u51B3\u7684\u7D27\u6025\u4E8B\u6001\u3002", "Celest \u306E\u4EA4\u901A\u306F\u518D\u3073\u6E05\u6D44\u3067\u3059\u3002\u8A18\u9332\u306F\u3053\u308C\u3092\u89E3\u6C7A\u6E08\u307F\u7DCA\u6025\u4E8B\u614B\u3068\u547C\u3076\u3067\u3057\u3087\u3046\u3002", "Le trafic Celest est propre a nouveau. Les archives appelleront cela une urgence resolue.") },
      { speakerId: "captain", text: "And you?", textI18n: l("\u90A3\u4F60\u5462\uFF1F", "\u3042\u306A\u305F\u306F\uFF1F", "Et vous ?") },
      { speakerId: "mirr-analyst", text: "I will call it a door closing from the wrong side. Next time, they may knock.", textI18n: l("\u6211\u4F1A\u79F0\u5B83\u4E3A\u4E00\u6247\u4ECE\u9519\u8BEF\u4E00\u4FA7\u5173\u4E0A\u7684\u95E8\u3002\u4E0B\u6B21\uFF0C\u5B83\u4EEC\u4E5F\u8BB8\u4F1A\u6572\u95E8\u3002", "\u79C1\u306F\u3001\u9593\u9055\u3063\u305F\u5074\u304B\u3089\u9589\u3058\u305F\u6249\u3068\u547C\u3073\u307E\u3059\u3002\u6B21\u306F\u3001\u5F7C\u3089\u304C\u30CE\u30C3\u30AF\u3059\u308B\u304B\u3082\u3057\u308C\u307E\u305B\u3093\u3002", "Je l'appellerai une porte fermee du mauvais cote. La prochaine fois, ils pourraient frapper.") }
    ]
  },
  {
    id: "dialogue-story-name-in-the-wake-accept",
    group: "story",
    title: "Name in the Wake Briefing",
    titleI18n: l("\u5C3E\u8FF9\u4E2D\u7684\u540D\u5B57\u7B80\u62A5", "\u822A\u8DE1\u306E\u540D \u30D6\u30EA\u30FC\u30D5\u30A3\u30F3\u30B0", "Briefing du nom dans le sillage"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("\u4FE1\u53F7\u5DF2\u906E\u853D", "\u4FE1\u53F7\u30DE\u30B9\u30AF\u4E2D", "Signal masque"),
    trigger: { kind: "story-accept", missionId: "story-name-in-the-wake", chapterId: "glass-wake-09" },
    lines: [
      { speakerId: "celest-archivist", text: "The Crown core kept one private return address: your ship name inside PTD Home storage traffic.", textI18n: l("\u738B\u51A0\u6838\u5FC3\u4FDD\u7559\u4E86\u4E00\u4E2A\u79C1\u4EBA\u56DE\u4FE1\u5730\u5740\uFF1A\u4F60\u7684\u8239\u540D\u85CF\u5728 PTD Home \u4ED3\u50A8\u6D41\u91CF\u91CC\u3002", "\u738B\u51A0\u30B3\u30A2\u306F\u79C1\u7684\u306A\u8FD4\u4FE1\u5148\u3092\u4E00\u3064\u4FDD\u6301\u3057\u3066\u3044\u307E\u3057\u305F\u3002PTD Home \u306E\u4FDD\u7BA1\u901A\u4FE1\u306B\u3042\u308B\u3042\u306A\u305F\u306E\u8239\u540D\u3067\u3059\u3002", "Le noyau Crown gardait une adresse de retour privee: le nom de votre vaisseau dans le trafic de stockage PTD Home.") },
      { speakerId: "captain", text: "So the door did knock.", textI18n: l("\u6240\u4EE5\u90A3\u6247\u95E8\u771F\u7684\u6572\u56DE\u6765\u4E86\u3002", "\u3064\u307E\u308A\u6249\u306F\u672C\u5F53\u306B\u53E9\u304D\u8FD4\u3057\u305F\u3002", "Donc la porte a vraiment frappe.") },
      { speakerId: "ship-ai", text: "New protocol available: Echo Lock. Hold target lock inside range until the hostile carrier desynchronizes.", textI18n: l("\u65B0\u534F\u8BAE\u53EF\u7528\uFF1AEcho Lock\u3002\u4FDD\u6301\u76EE\u6807\u9501\u5B9A\u5E76\u8FDB\u5165\u8303\u56F4\uFF0C\u76F4\u5230\u654C\u5BF9\u8F7D\u6CE2\u5931\u540C\u6B65\u3002", "\u65B0\u30D7\u30ED\u30C8\u30B3\u30EB\u4F7F\u7528\u53EF\u80FD: Echo Lock\u3002\u7BC4\u56F2\u5185\u3067\u76EE\u6A19\u30ED\u30C3\u30AF\u3092\u7DAD\u6301\u3057\u3001\u6575\u6027\u642C\u9001\u6CE2\u3092\u540C\u671F\u89E3\u9664\u3057\u3066\u304F\u3060\u3055\u3044\u3002", "Nouveau protocole disponible: Echo Lock. Maintenez le verrouillage dans la portee jusqu'a la desynchronisation du porteur hostile.") },
      { speakerId: "mirr-analyst", text: "Do not kill it too early. First make it forget which name it stole.", textI18n: l("\u522B\u592A\u65E9\u6740\u6389\u5B83\u3002\u5148\u8BA9\u5B83\u5FD8\u8BB0\u81EA\u5DF1\u5077\u4E86\u54EA\u4E2A\u540D\u5B57\u3002", "\u65E9\u304F\u6BBA\u3057\u3059\u304E\u306A\u3044\u3067\u3002\u307E\u305A\u3001\u76D7\u3093\u3060\u540D\u3092\u5FD8\u308C\u3055\u305B\u3066\u304F\u3060\u3055\u3044\u3002", "Ne le tuez pas trop tot. Faites-lui d'abord oublier quel nom il a vole.") }
    ]
  },
  {
    id: "dialogue-story-name-in-the-wake-complete",
    group: "story",
    title: "Name in the Wake Debrief",
    titleI18n: l("\u5C3E\u8FF9\u4E2D\u7684\u540D\u5B57\u590D\u76D8", "\u822A\u8DE1\u306E\u540D \u30C7\u30D6\u30EA\u30FC\u30D5", "Debriefing du nom dans le sillage"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("\u4FE1\u53F7\u5DF2\u906E\u853D", "\u4FE1\u53F7\u30DE\u30B9\u30AF\u4E2D", "Signal masque"),
    trigger: { kind: "story-complete", missionId: "story-name-in-the-wake", chapterId: "glass-wake-09" },
    lines: [
      { speakerId: "ship-ai", text: "Keel Name Listener destroyed. Echo Lock stripped the ship name before detonation.", textI18n: l("Keel Name Listener \u5DF2\u6467\u6BC1\u3002Echo Lock \u5728\u5F15\u7206\u524D\u5265\u79BB\u4E86\u8239\u540D\u3002", "Keel Name Listener \u7834\u58CA\u3002Echo Lock \u306F\u7206\u767A\u524D\u306B\u8239\u540D\u3092\u5265\u304C\u3057\u307E\u3057\u305F\u3002", "Keel Name Listener detruit. Echo Lock a retire le nom du vaisseau avant la detonation.") },
      { speakerId: "captain", text: "It was using my name like a route key.", textI18n: l("\u5B83\u628A\u6211\u7684\u8239\u540D\u5F53\u6210\u822A\u7EBF\u94A5\u5319\u3002", "\u3042\u308C\u306F\u79C1\u306E\u540D\u3092\u822A\u8DEF\u30AD\u30FC\u306E\u3088\u3046\u306B\u4F7F\u3063\u3066\u3044\u305F\u3002", "Il utilisait mon nom comme une cle de route.") },
      { speakerId: "mirr-analyst", text: "A name-key. That is worse than a beacon and better than a curse. We can cut it.", textI18n: l("\u540D\u5B57\u94A5\u5319\u3002\u5B83\u6BD4\u4FE1\u6807\u66F4\u7CDF\uFF0C\u6BD4\u8BC5\u5492\u66F4\u597D\u3002\u6211\u4EEC\u80FD\u5207\u65AD\u5B83\u3002", "\u540D\u524D\u30AD\u30FC\u3067\u3059\u3002\u30D3\u30FC\u30B3\u30F3\u3088\u308A\u60AA\u304F\u3001\u546A\u3044\u3088\u308A\u306F\u307E\u3057\u3067\u3059\u3002\u5207\u65AD\u3067\u304D\u307E\u3059\u3002", "Une cle-nom. Pire qu'une balise, mieux qu'une malediction. Nous pouvons la couper.") },
      { speakerId: "celest-archivist", text: "PTD Home recommends a decoy hull. The listener still expects storage traffic to sleep.", textI18n: l("PTD Home \u5EFA\u8BAE\u4F7F\u7528\u8BF1\u9975\u8239\u4F53\u3002\u76D1\u542C\u8005\u4ECD\u4EE5\u4E3A\u4ED3\u50A8\u6D41\u91CF\u5E94\u8BE5\u6C89\u7761\u3002", "PTD Home \u306F\u56EE\u8239\u4F53\u3092\u63A8\u5968\u3057\u3066\u3044\u307E\u3059\u3002\u805E\u304D\u624B\u306F\u307E\u3060\u4FDD\u7BA1\u901A\u4FE1\u304C\u7720\u308B\u3082\u306E\u3068\u601D\u3063\u3066\u3044\u307E\u3059\u3002", "PTD Home recommande une coque leurre. L'ecouteur s'attend encore a ce que le trafic de stockage dorme.") }
    ]
  },
  {
    id: "dialogue-story-borrowed-hulls-accept",
    group: "story",
    title: "Borrowed Hulls Briefing",
    titleI18n: l("\u501F\u6765\u7684\u8239\u4F53\u7B80\u62A5", "\u501F\u308A\u7269\u306E\u8239\u4F53 \u30D6\u30EA\u30FC\u30D5\u30A3\u30F3\u30B0", "Briefing des coques empruntees"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("\u4FE1\u53F7\u5DF2\u906E\u853D", "\u4FE1\u53F7\u30DE\u30B9\u30AF\u4E2D", "Signal masque"),
    trigger: { kind: "story-accept", missionId: "story-borrowed-hulls", chapterId: "glass-wake-10" },
    lines: [
      { speakerId: "helion-handler", text: "The decoy tender will look like a stored hull waking for maintenance. Keep it alive.", textI18n: l("\u8BF1\u9975\u62D6\u8239\u4F1A\u770B\u8D77\u6765\u50CF\u4E00\u8258\u5B58\u653E\u8239\u4F53\u9192\u6765\u7EF4\u62A4\u3002\u62A4\u4F4F\u5B83\u3002", "\u56EE\u30C6\u30F3\u30C0\u30FC\u306F\u4FDD\u7BA1\u8239\u4F53\u304C\u6574\u5099\u306E\u305F\u3081\u8D77\u304D\u305F\u3088\u3046\u306B\u898B\u3048\u307E\u3059\u3002\u751F\u304B\u3057\u3066\u304F\u3060\u3055\u3044\u3002", "Le tender leurre ressemblera a une coque stockee qui se reveille pour maintenance. Gardez-le en vie.") },
      { speakerId: "captain", text: "And if something borrows the route?", textI18n: l("\u5982\u679C\u6709\u4EC0\u4E48\u4E1C\u897F\u501F\u7528\u4E86\u8FD9\u6761\u8DEF\u7EBF\u5462\uFF1F", "\u4F55\u304B\u304C\u305D\u306E\u822A\u8DEF\u3092\u501F\u308A\u305F\u3089\uFF1F", "Et si quelque chose emprunte la route ?") },
      { speakerId: "ship-ai", text: "Borrowed-hull relay signatures will be hostile. Convoy protection priority elevated.", textI18n: l("\u501F\u8239\u4F53\u4E2D\u7EE7\u7B7E\u540D\u5C06\u89C6\u4E3A\u654C\u5BF9\u3002\u62A4\u822A\u4FDD\u62A4\u4F18\u5148\u7EA7\u5DF2\u63D0\u5347\u3002", "\u501F\u7528\u8239\u4F53\u4E2D\u7D99\u7F72\u540D\u306F\u6575\u6027\u3068\u5224\u65AD\u3002\u8B77\u885B\u512A\u5148\u5EA6\u3092\u4E0A\u3052\u307E\u3059\u3002", "Les signatures de relais de coque empruntee seront hostiles. Priorite de protection du convoi elevee.") },
      { speakerId: "helion-handler", text: "PTD Home is quiet by design. If it gets loud, assume Glass Wake is wearing our silence.", textI18n: l("PTD Home \u7684\u5B89\u9759\u662F\u8BBE\u8BA1\u51FA\u6765\u7684\u3002\u5982\u679C\u5B83\u53D8\u5435\uFF0C\u5C31\u5047\u8BBE Glass Wake \u7A7F\u4E0A\u4E86\u6211\u4EEC\u7684\u6C89\u9ED8\u3002", "PTD Home \u306F\u8A2D\u8A08\u4E0A\u9759\u304B\u3067\u3059\u3002\u9A12\u304C\u3057\u304F\u306A\u3063\u305F\u3089\u3001Glass Wake \u304C\u6211\u3005\u306E\u6C88\u9ED9\u3092\u7740\u3066\u3044\u308B\u3068\u8003\u3048\u3066\u304F\u3060\u3055\u3044\u3002", "PTD Home est silencieux par conception. S'il devient bruyant, supposez que Glass Wake porte notre silence.") }
    ]
  },
  {
    id: "dialogue-story-borrowed-hulls-complete",
    group: "story",
    title: "Borrowed Hulls Debrief",
    titleI18n: l("\u501F\u6765\u7684\u8239\u4F53\u590D\u76D8", "\u501F\u308A\u7269\u306E\u8239\u4F53 \u30C7\u30D6\u30EA\u30FC\u30D5", "Debriefing des coques empruntees"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("\u4FE1\u53F7\u5DF2\u906E\u853D", "\u4FE1\u53F7\u30DE\u30B9\u30AF\u4E2D", "Signal masque"),
    trigger: { kind: "story-complete", missionId: "story-borrowed-hulls", chapterId: "glass-wake-10" },
    lines: [
      { speakerId: "helion-handler", text: "Decoy tender returned. The borrowed hulls were routes wearing ship-shaped sleep.", textI18n: l("\u8BF1\u9975\u62D6\u8239\u5DF2\u8FD4\u56DE\u3002\u90A3\u4E9B\u501F\u6765\u7684\u8239\u4F53\u662F\u62AB\u7740\u8239\u5F62\u6C89\u7761\u7684\u822A\u7EBF\u3002", "\u56EE\u30C6\u30F3\u30C0\u30FC\u5E30\u9084\u3002\u501F\u308A\u7269\u306E\u8239\u4F53\u306F\u3001\u8239\u306E\u7720\u308A\u3092\u307E\u3068\u3063\u305F\u822A\u8DEF\u3067\u3057\u305F\u3002", "Tender leurre revenu. Les coques empruntees etaient des routes portant un sommeil en forme de vaisseau.") },
      { speakerId: "captain", text: "They need habits to move.", textI18n: l("\u5B83\u4EEC\u9700\u8981\u4E60\u60EF\u624D\u80FD\u79FB\u52A8\u3002", "\u52D5\u304F\u306B\u306F\u7FD2\u6163\u304C\u5FC5\u8981\u306A\u306E\u304B\u3002", "Ils ont besoin d'habitudes pour se deplacer.") },
      { speakerId: "mirr-analyst", text: "Yes. We can wound a habit. Mirr Vale can index where your name is attached.", textI18n: l("\u5BF9\u3002\u6211\u4EEC\u80FD\u5272\u4F24\u4E00\u4E2A\u4E60\u60EF\u3002Mirr Vale \u53EF\u4EE5\u7D22\u5F15\u4F60\u7684\u540D\u5B57\u9644\u7740\u5728\u54EA\u91CC\u3002", "\u306F\u3044\u3002\u7FD2\u6163\u306A\u3089\u50B7\u3064\u3051\u3089\u308C\u307E\u3059\u3002Mirr Vale \u306F\u3042\u306A\u305F\u306E\u540D\u304C\u4ED8\u7740\u3057\u305F\u5834\u6240\u3092\u7D22\u5F15\u3067\u304D\u307E\u3059\u3002", "Oui. Nous pouvons blesser une habitude. Mirr Vale peut indexer l'endroit ou votre nom est attache.") }
    ]
  },
  {
    id: "dialogue-story-parallax-wound-accept",
    group: "story",
    title: "Parallax Wound Briefing",
    titleI18n: l("\u89C6\u5DEE\u4F24\u53E3\u7B80\u62A5", "\u30D1\u30E9\u30E9\u30C3\u30AF\u30B9\u306E\u50B7 \u30D6\u30EA\u30FC\u30D5\u30A3\u30F3\u30B0", "Briefing de la blessure Parallax"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("\u4FE1\u53F7\u5DF2\u906E\u853D", "\u4FE1\u53F7\u30DE\u30B9\u30AF\u4E2D", "Signal masque"),
    trigger: { kind: "story-accept", missionId: "story-parallax-wound", chapterId: "glass-wake-11" },
    lines: [
      { speakerId: "mirr-analyst", text: "We can recover the Parallax Name Index without exposing the Hermitage. Follow Mirr Lattice routing only.", textI18n: l("\u6211\u4EEC\u53EF\u4EE5\u5728\u4E0D\u66B4\u9732 Hermitage \u7684\u60C5\u51B5\u4E0B\u56DE\u6536 Parallax Name Index\u3002\u53EA\u6309 Mirr Lattice \u8DEF\u7531\u884C\u52A8\u3002", "Hermitage \u3092\u9732\u51FA\u305B\u305A\u306B Parallax Name Index \u3092\u56DE\u53CE\u3067\u304D\u307E\u3059\u3002Mirr Lattice \u306E\u7D4C\u8DEF\u3060\u3051\u3092\u4F7F\u3063\u3066\u304F\u3060\u3055\u3044\u3002", "Nous pouvons recuperer le Parallax Name Index sans exposer l'Hermitage. Suivez seulement le routage Mirr Lattice.") },
      { speakerId: "captain", text: "You are asking me to do surgery through a mirror.", textI18n: l("\u4F60\u662F\u5728\u8BA9\u6211\u9694\u7740\u955C\u5B50\u505A\u624B\u672F\u3002", "\u93E1\u8D8A\u3057\u306B\u624B\u8853\u3057\u308D\u3068\u8A00\u3063\u3066\u3044\u308B\u306E\u304B\u3002", "Vous me demandez de faire de la chirurgie a travers un miroir.") },
      { speakerId: "mirr-analyst", text: "Exactly. The index will show where the carrier expects your name to answer.", textI18n: l("\u6B63\u662F\u5982\u6B64\u3002\u7D22\u5F15\u4F1A\u663E\u793A\u8F7D\u6CE2\u9884\u671F\u4F60\u7684\u540D\u5B57\u5728\u54EA\u91CC\u56DE\u5E94\u3002", "\u305D\u306E\u901A\u308A\u3067\u3059\u3002\u7D22\u5F15\u306F\u3001\u642C\u9001\u6CE2\u304C\u3042\u306A\u305F\u306E\u540D\u306E\u5FDC\u7B54\u3092\u671F\u5F85\u3059\u308B\u5834\u6240\u3092\u793A\u3057\u307E\u3059\u3002", "Exactement. L'index montrera ou le porteur attend que votre nom reponde.") },
      { speakerId: "ship-ai", text: "Two guardians marked near the recovery vector.", textI18n: l("\u56DE\u6536\u5411\u91CF\u9644\u8FD1\u5DF2\u6807\u8BB0\u4E24\u4E2A\u5B88\u536B\u3002", "\u56DE\u53CE\u30D9\u30AF\u30C8\u30EB\u4ED8\u8FD1\u306B\u4E8C\u4F53\u306E\u756A\u4EBA\u3092\u30DE\u30FC\u30AD\u30F3\u30B0\u3002", "Deux gardiens marques pres du vecteur de recuperation.") }
    ]
  },
  {
    id: "dialogue-story-parallax-wound-complete",
    group: "story",
    title: "Parallax Wound Debrief",
    titleI18n: l("\u89C6\u5DEE\u4F24\u53E3\u590D\u76D8", "\u30D1\u30E9\u30E9\u30C3\u30AF\u30B9\u306E\u50B7 \u30C7\u30D6\u30EA\u30FC\u30D5", "Debriefing de la blessure Parallax"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("\u4FE1\u53F7\u5DF2\u906E\u853D", "\u4FE1\u53F7\u30DE\u30B9\u30AF\u4E2D", "Signal masque"),
    trigger: { kind: "story-complete", missionId: "story-parallax-wound", chapterId: "glass-wake-11" },
    lines: [
      { speakerId: "mirr-analyst", text: "The index calls your ship name a wound in the carrier.", textI18n: l("\u7D22\u5F15\u628A\u4F60\u7684\u8239\u540D\u79F0\u4E3A\u8F7D\u6CE2\u4E2D\u7684\u4F24\u53E3\u3002", "\u7D22\u5F15\u306F\u3042\u306A\u305F\u306E\u8239\u540D\u3092\u642C\u9001\u6CE2\u5185\u306E\u50B7\u3068\u547C\u3093\u3067\u3044\u307E\u3059\u3002", "L'index appelle le nom de votre vaisseau une blessure dans le porteur.") },
      { speakerId: "captain", text: "Can wounds be closed?", textI18n: l("\u4F24\u53E3\u80FD\u95ED\u5408\u5417\uFF1F", "\u50B7\u306F\u9589\u3058\u3089\u308C\u308B\u304B\uFF1F", "Les blessures peuvent-elles se refermer ?") },
      { speakerId: "mirr-analyst", text: "Or infected. Ashen is already selling name fragments to people who think they are buying leverage.", textI18n: l("\u4E5F\u53EF\u80FD\u88AB\u611F\u67D3\u3002Ashen \u5DF2\u7ECF\u5728\u628A\u540D\u5B57\u788E\u7247\u5356\u7ED9\u4EE5\u4E3A\u81EA\u5DF1\u4E70\u5230\u7B79\u7801\u7684\u4EBA\u3002", "\u3042\u308B\u3044\u306F\u611F\u67D3\u3057\u307E\u3059\u3002Ashen \u306F\u3001\u4EA4\u6E09\u6750\u6599\u3092\u8CB7\u3063\u3066\u3044\u308B\u3068\u601D\u3046\u8005\u305F\u3061\u306B\u540D\u524D\u306E\u65AD\u7247\u3092\u58F2\u3063\u3066\u3044\u307E\u3059\u3002", "Ou s'infecter. Ashen vend deja des fragments de nom a ceux qui croient acheter un levier.") },
      { speakerId: "ashen-broker", text: "Bring me a false name that bites back, and I will open the ledger.", textI18n: l("\u7ED9\u6211\u5E26\u6765\u4E00\u4E2A\u4F1A\u53CD\u54AC\u7684\u5047\u540D\u5B57\uFF0C\u6211\u5C31\u6253\u5F00\u8D26\u672C\u3002", "\u565B\u307F\u8FD4\u3059\u507D\u540D\u3092\u6301\u3063\u3066\u304D\u306A\u3002\u305D\u3046\u3059\u308C\u3070\u53F0\u5E33\u3092\u958B\u304F\u3002", "Apportez-moi un faux nom qui mord, et j'ouvrirai le registre.") }
    ]
  },
  {
    id: "dialogue-story-black-ledger-chorus-accept",
    group: "story",
    title: "Black Ledger Chorus Briefing",
    titleI18n: l("\u9ED1\u8D26\u672C\u5408\u5531\u7B80\u62A5", "\u9ED2\u53F0\u5E33\u5408\u5531 \u30D6\u30EA\u30FC\u30D5\u30A3\u30F3\u30B0", "Briefing du choeur du registre noir"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("\u4FE1\u53F7\u5DF2\u906E\u853D", "\u4FE1\u53F7\u30DE\u30B9\u30AF\u4E2D", "Signal masque"),
    trigger: { kind: "story-accept", missionId: "story-black-ledger-chorus", chapterId: "glass-wake-12" },
    lines: [
      { speakerId: "ashen-broker", text: "Ashen sells everything twice. This time the second buyer is a drone chorus.", textI18n: l("Ashen \u4EC0\u4E48\u4E1C\u897F\u90FD\u5356\u4E24\u904D\u3002\u8FD9\u6B21\u7B2C\u4E8C\u4E2A\u4E70\u5BB6\u662F\u4E00\u652F\u65E0\u4EBA\u673A\u5408\u5531\u3002", "Ashen \u306F\u4F55\u3067\u3082\u4E8C\u5EA6\u58F2\u308B\u3002\u4ECA\u56DE\u306E\u4E8C\u4EBA\u76EE\u306E\u8CB7\u3044\u624B\u306F\u30C9\u30ED\u30FC\u30F3\u5408\u5531\u3060\u3002", "Ashen vend tout deux fois. Cette fois, le second acheteur est un choeur de drones.") },
      { speakerId: "captain", text: "The false ledger draws them out.", textI18n: l("\u5047\u8D26\u672C\u628A\u5B83\u4EEC\u5F15\u51FA\u6765\u3002", "\u507D\u53F0\u5E33\u3067\u8A98\u3044\u51FA\u3059\u3002", "Le faux registre les attire.") },
      { speakerId: "ashen-broker", text: "And embarrasses my competitors. Try not to destroy the freeport while improving my market share.", textI18n: l("\u8FD8\u4F1A\u8BA9\u6211\u7684\u7ADE\u4E89\u5BF9\u624B\u96BE\u582A\u3002\u63D0\u5347\u6211\u5E02\u573A\u4EFD\u989D\u7684\u65F6\u5019\uFF0C\u5C3D\u91CF\u522B\u70B8\u6389\u81EA\u7531\u6E2F\u3002", "\u305D\u308C\u306B\u7AF6\u4E89\u76F8\u624B\u306B\u6065\u3092\u304B\u304B\u305B\u308B\u3002\u79C1\u306E\u5E02\u5834\u5360\u6709\u7387\u3092\u4E0A\u3052\u308B\u9593\u3001\u81EA\u7531\u6E2F\u306F\u58CA\u3055\u306A\u3044\u3067\u3002", "Et embarrasse mes concurrents. Essayez de ne pas detruire le freeport en ameliorant ma part de marche.") },
      { speakerId: "ship-ai", text: "Name Auction Relay predicted outside Ashen Freeport after ledger handoff.", textI18n: l("\u8D26\u672C\u4EA4\u63A5\u540E\uFF0C\u9884\u8BA1 Name Auction Relay \u4F1A\u51FA\u73B0\u5728 Ashen Freeport \u5916\u3002", "\u53F0\u5E33\u5F15\u304D\u6E21\u3057\u5F8C\u3001Ashen Freeport \u5916\u306B Name Auction Relay \u304C\u4E88\u6E2C\u3055\u308C\u307E\u3059\u3002", "Name Auction Relay prevu hors d'Ashen Freeport apres remise du registre.") }
    ]
  },
  {
    id: "dialogue-story-black-ledger-chorus-complete",
    group: "story",
    title: "Black Ledger Chorus Debrief",
    titleI18n: l("\u9ED1\u8D26\u672C\u5408\u5531\u590D\u76D8", "\u9ED2\u53F0\u5E33\u5408\u5531 \u30C7\u30D6\u30EA\u30FC\u30D5", "Debriefing du choeur du registre noir"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("\u4FE1\u53F7\u5DF2\u906E\u853D", "\u4FE1\u53F7\u30DE\u30B9\u30AF\u4E2D", "Signal masque"),
    trigger: { kind: "story-complete", missionId: "story-black-ledger-chorus", chapterId: "glass-wake-12" },
    lines: [
      { speakerId: "ashen-broker", text: "Relay burned. Ledger ash says every buyer was also a transmitter.", textI18n: l("\u4E2D\u7EE7\u70E7\u6BC1\u3002\u8D26\u672C\u7070\u70EC\u663E\u793A\u6BCF\u4E2A\u4E70\u5BB6\u4E5F\u662F\u53D1\u5C04\u5668\u3002", "\u4E2D\u7D99\u306F\u71C3\u3048\u305F\u3002\u53F0\u5E33\u306E\u7070\u306F\u3001\u8CB7\u3044\u624B\u5168\u54E1\u304C\u9001\u4FE1\u6A5F\u3067\u3082\u3042\u3063\u305F\u3053\u3068\u3092\u793A\u3057\u3066\u3044\u308B\u3002", "Relais brule. Les cendres du registre disent que chaque acheteur etait aussi un emetteur.") },
      { speakerId: "captain", text: "The chorus points back to Celest.", textI18n: l("\u5408\u5531\u53C8\u6307\u56DE Celest\u3002", "\u5408\u5531\u306F Celest \u3078\u623B\u3063\u3066\u3044\u308B\u3002", "Le choeur pointe vers Celest.") },
      { speakerId: "celest-archivist", text: "Then the archive was not clean. It was scarred.", textI18n: l("\u90A3\u6863\u6848\u4E0D\u662F\u5E72\u51C0\u4E86\u3002\u5B83\u53EA\u662F\u7559\u75A4\u4E86\u3002", "\u306A\u3089\u8A18\u9332\u306F\u6E05\u6D44\u3067\u306F\u3042\u308A\u307E\u305B\u3093\u3002\u50B7\u3064\u3044\u3066\u3044\u305F\u306E\u3067\u3059\u3002", "Alors l'archive n'etait pas propre. Elle etait cicatrisee.") },
      { speakerId: "mirr-analyst", text: "We can hurt the scar now. Bring Echo Lock back under the Crown.", textI18n: l("\u73B0\u5728\u6211\u4EEC\u80FD\u4F24\u5230\u90A3\u9053\u75A4\u3002\u628A Echo Lock \u5E26\u56DE\u738B\u51A0\u4E4B\u4E0B\u3002", "\u4ECA\u306A\u3089\u305D\u306E\u50B7\u3092\u75DB\u3081\u3089\u308C\u307E\u3059\u3002Echo Lock \u3092\u738B\u51A0\u306E\u4E0B\u3078\u623B\u3057\u3066\u304F\u3060\u3055\u3044\u3002", "Nous pouvons blesser la cicatrice maintenant. Ramenez Echo Lock sous la Couronne.") }
    ]
  },
  {
    id: "dialogue-story-listener-scar-accept",
    group: "story",
    title: "Listener Scar Briefing",
    titleI18n: l("\u76D1\u542C\u8005\u4F24\u75A4\u7B80\u62A5", "\u805E\u304D\u624B\u306E\u50B7 \u30D6\u30EA\u30FC\u30D5\u30A3\u30F3\u30B0", "Briefing de la cicatrice de l'ecouteur"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("\u4FE1\u53F7\u5DF2\u906E\u853D", "\u4FE1\u53F7\u30DE\u30B9\u30AF\u4E2D", "Signal masque"),
    trigger: { kind: "story-accept", missionId: "story-listener-scar", chapterId: "glass-wake-13" },
    lines: [
      { speakerId: "celest-archivist", text: "The Listener Scar Anchor sits where the Quiet Crown core used to listen.", textI18n: l("Listener Scar Anchor \u4F4D\u4E8E Quiet Crown \u6838\u5FC3\u66FE\u7ECF\u76D1\u542C\u7684\u4F4D\u7F6E\u3002", "Listener Scar Anchor \u306F Quiet Crown \u30B3\u30A2\u304C\u304B\u3064\u3066\u805E\u3044\u3066\u3044\u305F\u5834\u6240\u306B\u3042\u308A\u307E\u3059\u3002", "Le Listener Scar Anchor se trouve la ou le noyau Quiet Crown ecoutait.") },
      { speakerId: "ship-ai", text: "Echo Lock required. Anchor hull should remain invulnerable to lethal damage until synchronization completes.", textI18n: l("\u9700\u8981 Echo Lock\u3002\u540C\u6B65\u5B8C\u6210\u524D\uFF0C\u951A\u70B9\u8239\u4F53\u5E94\u514D\u4E8E\u81F4\u547D\u4F24\u5BB3\u3002", "Echo Lock \u5FC5\u9808\u3002\u540C\u671F\u5B8C\u4E86\u307E\u3067\u3001\u30A2\u30F3\u30AB\u30FC\u8239\u4F53\u306F\u81F4\u547D\u640D\u50B7\u306B\u8010\u3048\u308B\u898B\u8FBC\u307F\u3067\u3059\u3002", "Echo Lock requis. La coque de l'ancre devrait resister aux degats mortels jusqu'a la synchronisation.") },
      { speakerId: "captain", text: "So we make it remember the name, then make it lose the name.", textI18n: l("\u6240\u4EE5\u6211\u4EEC\u5148\u8BA9\u5B83\u8BB0\u8D77\u540D\u5B57\uFF0C\u518D\u8BA9\u5B83\u5931\u53BB\u540D\u5B57\u3002", "\u3064\u307E\u308A\u540D\u3092\u601D\u3044\u51FA\u3055\u305B\u3066\u304B\u3089\u3001\u540D\u3092\u5931\u308F\u305B\u308B\u3002", "Donc nous lui faisons se souvenir du nom, puis le perdre.") },
      { speakerId: "mirr-analyst", text: "Yes. Break the wardens, recover the scar core, and we can build something that stops the next name-call faster.", textI18n: l("\u5BF9\u3002\u6253\u788E\u5B88\u536B\uFF0C\u56DE\u6536\u4F24\u75A4\u6838\u5FC3\uFF0C\u6211\u4EEC\u5C31\u80FD\u9020\u51FA\u66F4\u5FEB\u963B\u65AD\u4E0B\u6B21\u70B9\u540D\u7684\u4E1C\u897F\u3002", "\u306F\u3044\u3002\u756A\u4EBA\u3092\u7834\u308A\u3001\u50B7\u30B3\u30A2\u3092\u56DE\u53CE\u3059\u308C\u3070\u3001\u6B21\u306E\u540D\u547C\u3073\u3092\u3088\u308A\u65E9\u304F\u6B62\u3081\u308B\u3082\u306E\u3092\u4F5C\u308C\u307E\u3059\u3002", "Oui. Brisez les gardiens, recuperez le noyau de cicatrice, et nous pourrons construire de quoi stopper le prochain appel de nom plus vite.") }
    ]
  },
  {
    id: "dialogue-story-listener-scar-complete",
    group: "story",
    title: "Listener Scar Debrief",
    titleI18n: l("\u76D1\u542C\u8005\u4F24\u75A4\u590D\u76D8", "\u805E\u304D\u624B\u306E\u50B7 \u30C7\u30D6\u30EA\u30FC\u30D5", "Debriefing de la cicatrice de l'ecouteur"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("\u4FE1\u53F7\u5DF2\u906E\u853D", "\u4FE1\u53F7\u30DE\u30B9\u30AF\u4E2D", "Signal masque"),
    trigger: { kind: "story-complete", missionId: "story-listener-scar", chapterId: "glass-wake-13" },
    lines: [
      { speakerId: "ship-ai", text: "Listener Scar Anchor destroyed. Echo Nullifier blueprint compiled from recovered scar core.", textI18n: l("Listener Scar Anchor \u5DF2\u6467\u6BC1\u3002Echo Nullifier \u84DD\u56FE\u5DF2\u7531\u56DE\u6536\u7684\u4F24\u75A4\u6838\u5FC3\u7F16\u8BD1\u3002", "Listener Scar Anchor \u7834\u58CA\u3002\u56DE\u53CE\u3057\u305F\u50B7\u30B3\u30A2\u304B\u3089 Echo Nullifier \u8A2D\u8A08\u56F3\u3092\u7DE8\u7E82\u3057\u307E\u3057\u305F\u3002", "Listener Scar Anchor detruit. Plan Echo Nullifier compile depuis le noyau de cicatrice recupere.") },
      { speakerId: "captain", text: "Did it forget us?", textI18n: l("\u5B83\u5FD8\u4E86\u6211\u4EEC\u5417\uFF1F", "\u3042\u308C\u306F\u79C1\u305F\u3061\u3092\u5FD8\u308C\u305F\u304B\uFF1F", "Nous a-t-il oublies ?") },
      { speakerId: "mirr-analyst", text: "This scar did. The network behind it felt the cut.", textI18n: l("\u8FD9\u9053\u75A4\u5FD8\u4E86\u3002\u5B83\u80CC\u540E\u7684\u7F51\u7EDC\u611F\u5230\u4E86\u5207\u53E3\u3002", "\u3053\u306E\u50B7\u306F\u5FD8\u308C\u307E\u3057\u305F\u3002\u305D\u306E\u80CC\u5F8C\u306E\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u306F\u5207\u65AD\u3092\u611F\u3058\u307E\u3057\u305F\u3002", "Cette cicatrice, oui. Le reseau derriere elle a senti la coupure.") },
      { speakerId: "celest-archivist", text: "Celest will record the emergency as contained. I will record it as wounded.", textI18n: l("Celest \u4F1A\u628A\u8FD9\u6B21\u7D27\u6025\u4E8B\u6001\u8BB0\u5F55\u4E3A\u5DF2\u63A7\u5236\u3002\u6211\u4F1A\u628A\u5B83\u8BB0\u5F55\u4E3A\u5DF2\u53D7\u4F24\u3002", "Celest \u306F\u3053\u306E\u7DCA\u6025\u4E8B\u614B\u3092\u5C01\u3058\u8FBC\u3081\u6E08\u307F\u3068\u8A18\u9332\u3057\u307E\u3059\u3002\u79C1\u306F\u8CA0\u50B7\u6E08\u307F\u3068\u8A18\u9332\u3057\u307E\u3059\u3002", "Celest consignera l'urgence comme contenue. Moi, je la consignerai comme blessee.") },
      { speakerId: "captain", text: "Good. If it comes back, it comes back limping.", textI18n: l("\u5F88\u597D\u3002\u5982\u679C\u5B83\u56DE\u6765\uFF0C\u4E5F\u4F1A\u4E00\u7638\u4E00\u62D0\u5730\u56DE\u6765\u3002", "\u3044\u3044\u3002\u623B\u3063\u3066\u304F\u308B\u306A\u3089\u3001\u8DB3\u3092\u5F15\u304D\u305A\u3063\u3066\u623B\u308B\u3002", "Bien. S'il revient, il reviendra en boitant.") }
    ]
  }
];
var explorationSpeakerBySignal = {
  "quiet-signal-sundog-lattice": "helion-handler",
  "quiet-signal-sundog-crown-shard": "helion-handler",
  "quiet-signal-foundry-ark-wreck": "kuro-foreman",
  "quiet-signal-obsidian-foundry-wake": "kuro-foreman",
  "quiet-signal-ghost-iff-challenge": "vantara-officer",
  "quiet-signal-redoubt-ghost-permit": "vantara-officer",
  "quiet-signal-folded-reflection": "mirr-analyst",
  "quiet-signal-parallax-outer-index": "mirr-analyst",
  "quiet-signal-dead-letter-convoy": "ashen-broker",
  "quiet-signal-moth-vault-ledger": "ashen-broker",
  "quiet-signal-crownside-whisper": "celest-archivist",
  "quiet-signal-crownshade-occlusion": "celest-archivist",
  "quiet-signal-keel-archive-prism": "ship-ai",
  "quiet-signal-locked-keel-cache": "ship-ai"
};
var explorationSceneTitles = {
  "quiet-signal-sundog-lattice": l("\u65E5\u72AC\u6676\u683C\u4FE1\u53F7\u65E5\u5FD7", "\u5E7B\u65E5\u683C\u5B50 \u4FE1\u53F7\u30ED\u30B0", "Journal du signal Sundog Lattice"),
  "quiet-signal-meridian-afterimage": l("\u5B50\u5348\u6B8B\u50CF\u4FE1\u53F7\u65E5\u5FD7", "\u5B50\u5348\u7DDA\u6B8B\u50CF \u4FE1\u53F7\u30ED\u30B0", "Journal du signal Meridian Afterimage"),
  "quiet-signal-sundog-crown-shard": l("\u65E5\u72AC\u738B\u51A0\u788E\u7247\u4FE1\u53F7\u65E5\u5FD7", "\u5E7B\u65E5\u738B\u51A0\u7247 \u4FE1\u53F7\u30ED\u30B0", "Journal du signal Sundog Crown Shard"),
  "quiet-signal-foundry-ark-wreck": l("\u94F8\u9020\u65B9\u821F\u6B8B\u9AB8\u4FE1\u53F7\u65E5\u5FD7", "\u92F3\u9020\u7BB1\u821F\u306E\u6B8B\u9AB8 \u4FE1\u53F7\u30ED\u30B0", "Journal du signal Foundry Ark Wreck"),
  "quiet-signal-anvil-listener-spoor": l("\u94C1\u7827\u76D1\u542C\u75D5\u8FF9\u4FE1\u53F7\u65E5\u5FD7", "\u91D1\u5E8A\u30EA\u30B9\u30CA\u30FC\u75D5\u8DE1 \u4FE1\u53F7\u30ED\u30B0", "Journal du signal Anvil Listener Spoor"),
  "quiet-signal-obsidian-foundry-wake": l("\u9ED1\u66DC\u94F8\u9020\u5C3E\u8FF9\u4FE1\u53F7\u65E5\u5FD7", "\u9ED2\u66DC\u92F3\u9020\u822A\u8DE1 \u4FE1\u53F7\u30ED\u30B0", "Journal du signal Obsidian Foundry Wake"),
  "quiet-signal-ghost-iff-challenge": l("\u5E7D\u7075 IFF \u8D28\u8BE2\u4FE1\u53F7\u65E5\u5FD7", "\u5E7D\u970AIFF\u30C1\u30E3\u30EC\u30F3\u30B8 \u4FE1\u53F7\u30ED\u30B0", "Journal du signal Ghost IFF Challenge"),
  "quiet-signal-redoubt-silence-test": l("\u5821\u5792\u9759\u9ED8\u6D4B\u8BD5\u4FE1\u53F7\u65E5\u5FD7", "\u5821\u5841\u6C88\u9ED9\u8A66\u9A13 \u4FE1\u53F7\u30ED\u30B0", "Journal du signal Redoubt Silence Test"),
  "quiet-signal-redoubt-ghost-permit": l("\u5821\u5792\u5E7D\u7075\u8BB8\u53EF\u4FE1\u53F7\u65E5\u5FD7", "\u5821\u5841\u5E7D\u970A\u8A31\u53EF \u4FE1\u53F7\u30ED\u30B0", "Journal du signal Redoubt Ghost Permit"),
  "quiet-signal-folded-reflection": l("\u6298\u53E0\u53CD\u5C04\u4FE1\u53F7\u65E5\u5FD7", "\u6298\u308A\u7573\u307E\u308C\u305F\u53CD\u5C04 \u4FE1\u53F7\u30ED\u30B0", "Journal du signal Folded Reflection"),
  "quiet-signal-parallax-deep-index": l("\u89C6\u5DEE\u6DF1\u5C42\u7D22\u5F15\u4FE1\u53F7\u65E5\u5FD7", "\u8996\u5DEE\u6DF1\u5C64\u7D22\u5F15 \u4FE1\u53F7\u30ED\u30B0", "Journal du signal Parallax Deep Index"),
  "quiet-signal-parallax-outer-index": l("\u89C6\u5DEE\u5916\u5C42\u7D22\u5F15\u4FE1\u53F7\u65E5\u5FD7", "\u8996\u5DEE\u5916\u7E01\u7D22\u5F15 \u4FE1\u53F7\u30ED\u30B0", "Journal du signal Parallax Outer Index"),
  "quiet-signal-dead-letter-convoy": l("\u6B7B\u4FE1\u8239\u961F\u4FE1\u53F7\u65E5\u5FD7", "\u6B7B\u4FE1\u8239\u56E3 \u4FE1\u53F7\u30ED\u30B0", "Journal du signal Dead Letter Convoy"),
  "quiet-signal-false-mercy-ledger": l("\u865A\u5047\u6148\u60B2\u8D26\u672C\u4FE1\u53F7\u65E5\u5FD7", "\u507D\u308A\u306E\u6148\u60B2\u53F0\u5E33 \u4FE1\u53F7\u30ED\u30B0", "Journal du signal False Mercy Ledger"),
  "quiet-signal-moth-vault-ledger": l("\u86FE\u5F71\u91D1\u5E93\u8D26\u672C\u4FE1\u53F7\u65E5\u5FD7", "\u30E2\u30B9\u91D1\u5EAB\u53F0\u5E33 \u4FE1\u53F7\u30ED\u30B0", "Journal du signal Moth Vault Ledger"),
  "quiet-signal-crownside-whisper": l("\u738B\u51A0\u4FA7\u4F4E\u8BED\u4FE1\u53F7\u65E5\u5FD7", "\u738B\u51A0\u5074\u306E\u56C1\u304D \u4FE1\u53F7\u30ED\u30B0", "Journal du signal Crownside Whisper"),
  "quiet-signal-pearl-witness-chorus": l("\u73CD\u73E0\u8BC1\u4EBA\u5408\u5531\u4FE1\u53F7\u65E5\u5FD7", "\u771F\u73E0\u8A3C\u4EBA\u5408\u5531 \u4FE1\u53F7\u30ED\u30B0", "Journal du signal Pearl Witness Chorus"),
  "quiet-signal-crownshade-occlusion": l("\u51A0\u5F71\u906E\u853D\u4FE1\u53F7\u65E5\u5FD7", "\u30AF\u30E9\u30A6\u30F3\u30B7\u30A7\u30FC\u30C9\u63A9\u853D \u4FE1\u53F7\u30ED\u30B0", "Journal du signal Crownshade Occlusion"),
  "quiet-signal-locked-keel-cache": l("\u9501\u5B9A\u9F99\u9AA8\u7F13\u5B58\u4FE1\u53F7\u65E5\u5FD7", "\u65BD\u9320\u7ADC\u9AA8\u30AD\u30E3\u30C3\u30B7\u30E5 \u4FE1\u53F7\u30ED\u30B0", "Journal du signal Locked Keel Cache"),
  "quiet-signal-keel-ghost-route": l("\u9F99\u9AA8\u5E7D\u7075\u822A\u7EBF\u4FE1\u53F7\u65E5\u5FD7", "\u7ADC\u9AA8\u5E7D\u970A\u822A\u8DEF \u4FE1\u53F7\u30ED\u30B0", "Journal du signal Keel Ghost Route"),
  "quiet-signal-keel-archive-prism": l("\u9F99\u9AA8\u6863\u6848\u68F1\u955C\u4FE1\u53F7\u65E5\u5FD7", "\u7ADC\u9AA8\u8A18\u9332\u30D7\u30EA\u30BA\u30E0 \u4FE1\u53F7\u30ED\u30B0", "Journal du signal Keel Archive Prism")
};
var explorationMaskedTitles = {
  "quiet-signal-sundog-lattice": l("\u68F1\u955C\u8D38\u6613\u56DE\u58F0", "\u30D7\u30EA\u30BA\u30E0\u4EA4\u6613\u30A8\u30B3\u30FC", "Echo commercial prismatique"),
  "quiet-signal-meridian-afterimage": l("\u592A\u9633\u6863\u6848\u6B8B\u50CF", "\u592A\u967D\u8A18\u9332\u306E\u6B8B\u50CF", "Afterimage d'archive solaire"),
  "quiet-signal-sundog-crown-shard": l("\u6DF1\u5C42\u738B\u51A0\u6298\u5C04", "\u6DF1\u5C64\u738B\u51A0\u5C48\u6298", "Refraction Crown profonde"),
  "quiet-signal-foundry-ark-wreck": l("\u51B0\u51B7\u8239\u4F53\u8D28\u91CF", "\u51B7\u305F\u3044\u8239\u4F53\u8CEA\u91CF", "Masse de coque froide"),
  "quiet-signal-anvil-listener-spoor": l("\u77FF\u9891\u76D1\u542C\u75D5\u8FF9", "\u9271\u77F3\u5E2F\u30EA\u30B9\u30CA\u30FC\u75D5\u8DE1", "Trace d'ecouteur de bande minerai"),
  "quiet-signal-obsidian-foundry-wake": l("\u6DF1\u5C42\u953B\u7089\u5C3E\u8FF9", "\u6DF1\u5C64\u7089\u822A\u8DE1", "Sillage de forge profond"),
  "quiet-signal-ghost-iff-challenge": l("\u519B\u7528\u63E1\u624B\u6545\u969C", "\u8ECD\u7528\u30CF\u30F3\u30C9\u30B7\u30A7\u30A4\u30AF\u969C\u5BB3", "Defaut de poignee de main militaire"),
  "quiet-signal-redoubt-silence-test": l("\u88AB\u538B\u5236\u7684\u5DE1\u903B\u8BD5\u9A8C", "\u6291\u5727\u3055\u308C\u305F\u54E8\u6212\u8A66\u9A13", "Essai de patrouille supprime"),
  "quiet-signal-redoubt-ghost-permit": l("\u6DF1\u5C42\u5DE1\u903B\u8BB8\u53EF", "\u6DF1\u5C64\u54E8\u6212\u8A31\u53EF", "Permis de patrouille profond"),
  "quiet-signal-folded-reflection": l("\u955C\u50CF\u4FE1\u53F7\u6298\u53E0", "\u93E1\u50CF\u4FE1\u53F7\u30D5\u30A9\u30FC\u30EB\u30C9", "Pli de signal miroir"),
  "quiet-signal-parallax-deep-index": l("\u9690\u4FEE\u9662\u7D22\u5F15\u788E\u7247", "\u96A0\u4FEE\u9662\u7D22\u5F15\u7247", "Fragment d'index de l'ermitage"),
  "quiet-signal-parallax-outer-index": l("\u6DF1\u5C42\u9690\u4FEE\u9662\u7D22\u5F15", "\u6DF1\u5C64\u96A0\u4FEE\u9662\u7D22\u5F15", "Index profond de l'ermitage"),
  "quiet-signal-dead-letter-convoy": l("\u52A0\u5BC6\u788E\u7247\u8F68\u8FF9", "\u6697\u53F7\u5316\u6B8B\u9AB8\u822A\u8DE1", "Piste de debris chiffres"),
  "quiet-signal-false-mercy-ledger": l("\u6148\u60B2\u94A5\u5319\u8D26\u672C", "\u6148\u60B2\u30AD\u30FC\u53F0\u5E33", "Registre des cles Mercy"),
  "quiet-signal-moth-vault-ledger": l("\u6DF1\u5C42\u9ED1\u8D26\u672C", "\u6DF1\u5C64\u9ED2\u53F0\u5E33", "Grand livre noir profond"),
  "quiet-signal-crownside-whisper": l("\u9AD8\u9891\u738B\u51A0\u566A\u58F0", "\u9AD8\u5E2F\u57DF\u738B\u51A0\u30CE\u30A4\u30BA", "Bruit Crown haute bande"),
  "quiet-signal-pearl-witness-chorus": l("\u9886\u4E8B\u9986\u8BC1\u4EBA\u5408\u5531", "\u9818\u4E8B\u9928\u8A3C\u4EBA\u5408\u5531", "Choeur de temoins du consulat"),
  "quiet-signal-crownshade-occlusion": l("\u6DF1\u5C42\u738B\u51A0\u906E\u853D", "\u6DF1\u5C64\u738B\u51A0\u63A9\u853D", "Occlusion Crown profonde"),
  "quiet-signal-locked-keel-cache": l("\u79C1\u4EBA\u7F13\u5B58\u8109\u51B2", "\u79C1\u8A2D\u30AD\u30E3\u30C3\u30B7\u30E5 ping", "Ping de cache privee"),
  "quiet-signal-keel-ghost-route": l("\u4F11\u7720\u9F99\u9AA8\u822A\u7EBF", "\u4F11\u7720\u7ADC\u9AA8\u822A\u8DEF", "Route de quille dormante"),
  "quiet-signal-keel-archive-prism": l("\u6DF1\u5C42\u9F99\u9AA8\u68F1\u955C", "\u6DF1\u5C64\u7ADC\u9AA8\u30D7\u30EA\u30BA\u30E0", "Prisme de quille profond")
};
var dialogueArchiveLine = {
  text: "Dialogue archive updated. Exploration evidence is available in the Captain's Log.",
  textI18n: l("\u5BF9\u767D\u6863\u6848\u5DF2\u66F4\u65B0\u3002\u63A2\u7D22\u8BC1\u636E\u53EF\u5728\u8230\u957F\u65E5\u5FD7\u4E2D\u67E5\u770B\u3002", "\u5BFE\u8A71\u30A2\u30FC\u30AB\u30A4\u30D6\u3092\u66F4\u65B0\u3002\u63A2\u7D22\u8A3C\u62E0\u306F\u8239\u9577\u30ED\u30B0\u3067\u78BA\u8A8D\u3067\u304D\u307E\u3059\u3002", "Archive de dialogue mise a jour. Les preuves d'exploration sont disponibles dans le journal du capitaine.")
};
var explorationSceneCopy = {
  "quiet-signal-sundog-lattice": [
    { text: "The lattice bent a clean trade beacon into a false accident. That is careful work.", textI18n: l("\u6676\u683C\u628A\u4E00\u4E2A\u6D01\u51C0\u8D38\u6613\u4FE1\u6807\u5F2F\u6210\u4E86\u865A\u5047\u4E8B\u6545\u3002\u624B\u6CD5\u5F88\u7CBE\u7EC6\u3002", "\u683C\u5B50\u306F\u6E05\u6F54\u306A\u4EA4\u6613\u30D3\u30FC\u30B3\u30F3\u3092\u507D\u4E8B\u6545\u3078\u66F2\u3052\u307E\u3057\u305F\u3002\u614E\u91CD\u306A\u4ED5\u4E8B\u3067\u3059\u3002", "La grille a courbe une balise commerciale propre en faux accident. C'est un travail soigne.") },
    { text: "Then our ghost has learned to hide in lawful traffic.", textI18n: l("\u90A3\u6211\u4EEC\u7684\u5E7D\u7075\u5DF2\u7ECF\u5B66\u4F1A\u85CF\u8FDB\u5408\u6CD5\u6D41\u91CF\u91CC\u4E86\u3002", "\u306A\u3089\u3001\u6211\u3005\u306E\u5E7D\u970A\u306F\u5408\u6CD5\u901A\u4FE1\u306B\u96A0\u308C\u308B\u8853\u3092\u899A\u3048\u305F\u3002", "Alors notre fantome a appris a se cacher dans le trafic legal.") }
  ],
  "quiet-signal-meridian-afterimage": [
    { text: "Meridian replayed a true delivery from the wrong angle. That gives the clean key a reflected twin.", textI18n: l("Meridian \u4ECE\u9519\u8BEF\u89D2\u5EA6\u91CD\u653E\u4E86\u4E00\u6B21\u771F\u5B9E\u6295\u9012\u3002\u8FD9\u7ED9\u6D01\u51C0\u94A5\u5319\u9020\u51FA\u4E86\u4E00\u4E2A\u53CD\u5C04\u5B6A\u751F\u4F53\u3002", "Meridian \u306F\u672C\u7269\u306E\u914D\u9001\u3092\u9593\u9055\u3063\u305F\u89D2\u5EA6\u304B\u3089\u518D\u751F\u3057\u307E\u3057\u305F\u3002\u30AF\u30EA\u30FC\u30F3\u30AD\u30FC\u306B\u53CD\u5C04\u3057\u305F\u53CC\u5B50\u304C\u751F\u307E\u308C\u307E\u3059\u3002", "Meridian a rejoue une vraie livraison sous le mauvais angle. Cela donne a la cle propre un jumeau reflechi.") },
    { text: "So honest paperwork can arrive twice without the ship noticing.", textI18n: l("\u6240\u4EE5\u8BDA\u5B9E\u7684\u6587\u4E66\u80FD\u62B5\u8FBE\u4E24\u6B21\uFF0C\u800C\u98DE\u8239\u81EA\u5DF1\u6BEB\u65E0\u5BDF\u89C9\u3002", "\u3064\u307E\u308A\u6B63\u76F4\u306A\u66F8\u985E\u306F\u3001\u8239\u306B\u6C17\u3065\u304B\u308C\u305A\u4E8C\u5EA6\u5230\u7740\u3067\u304D\u308B\u3002", "Donc des papiers honnetes peuvent arriver deux fois sans que le vaisseau le remarque.") }
  ],
  "quiet-signal-foundry-ark-wreck": [
    { text: "Foundry Ark was opened before impact. The belt got blamed for a murder it did not commit.", textI18n: l("Foundry Ark \u5728\u649E\u51FB\u524D\u5C31\u88AB\u6253\u5F00\u4E86\u3002\u77FF\u5E26\u66FF\u4E00\u573A\u4E0D\u662F\u5B83\u72AF\u4E0B\u7684\u8C0B\u6740\u80CC\u4E86\u9505\u3002", "Foundry Ark \u306F\u885D\u7A81\u524D\u306B\u958B\u304B\u308C\u3066\u3044\u307E\u3057\u305F\u3002\u5E2F\u57DF\u306F\u81EA\u5206\u304C\u72AF\u3057\u3066\u3044\u306A\u3044\u6BBA\u3057\u306E\u8CAC\u4EFB\u3092\u8CA0\u308F\u3055\u308C\u307E\u3057\u305F\u3002", "Foundry Ark a ete ouvert avant l'impact. La ceinture a ete accusee d'un meurtre qu'elle n'a pas commis.") },
    { text: "Log it as evidence. The wake is choosing victims, not just waiting for them.", textI18n: l("\u628A\u5B83\u8BB0\u6210\u8BC1\u636E\u3002\u90A3\u9053\u5C3E\u8FF9\u5728\u9009\u62E9\u53D7\u5BB3\u8005\uFF0C\u4E0D\u53EA\u662F\u7B49\u5F85\u3002", "\u8A3C\u62E0\u3068\u3057\u3066\u8A18\u9332\u3057\u3066\u3002\u822A\u8DE1\u306F\u88AB\u5BB3\u8005\u3092\u9078\u3093\u3067\u3044\u3066\u3001\u305F\u3060\u5F85\u3063\u3066\u3044\u308B\u3060\u3051\u3067\u306F\u306A\u3044\u3002", "Consignez-le comme preuve. Le sillage choisit ses victimes, il ne les attend pas seulement.") }
  ],
  "quiet-signal-anvil-listener-spoor": [
    { text: "The dust pattern was a microphone without a hull, wearing mining telemetry as camouflage.", textI18n: l("\u90A3\u9053\u5C18\u57C3\u56FE\u6848\u662F\u4E00\u652F\u6CA1\u6709\u8239\u4F53\u7684\u9EA6\u514B\u98CE\uFF0C\u7528\u91C7\u77FF\u9065\u6D4B\u5F53\u4F2A\u88C5\u3002", "\u3042\u306E\u5875\u306E\u6A21\u69D8\u306F\u8239\u4F53\u306E\u306A\u3044\u30DE\u30A4\u30AF\u3067\u3001\u63A1\u6398\u30C6\u30EC\u30E1\u30C8\u30EA\u3092\u8FF7\u5F69\u306B\u3057\u3066\u3044\u307E\u3057\u305F\u3002", "Le motif de poussiere etait un microphone sans coque, camoufle par la telemetrie miniere.") },
    { text: "Then the next listener does not need to look like a ship.", textI18n: l("\u90A3\u4E0B\u4E00\u4F4D\u76D1\u542C\u8005\u6839\u672C\u4E0D\u9700\u8981\u957F\u5F97\u50CF\u98DE\u8239\u3002", "\u306A\u3089\u6B21\u306E\u805E\u304D\u624B\u306F\u8239\u306E\u5F62\u3092\u3057\u3066\u3044\u308B\u5FC5\u8981\u304C\u306A\u3044\u3002", "Alors le prochain ecouteur n'a pas besoin de ressembler a un vaisseau.") }
  ],
  "quiet-signal-ghost-iff-challenge": [
    { text: "That IFF code came from an old patrol archive. Someone copied our salute and taught it to a trap.", textI18n: l("\u90A3\u6BB5 IFF \u4EE3\u7801\u6765\u81EA\u65E7\u5DE1\u903B\u6863\u6848\u3002\u6709\u4EBA\u590D\u5236\u4E86\u6211\u4EEC\u7684\u656C\u793C\uFF0C\u53C8\u628A\u5B83\u6559\u7ED9\u9677\u9631\u3002", "\u305D\u306E IFF \u30B3\u30FC\u30C9\u306F\u53E4\u3044\u54E8\u6212\u8A18\u9332\u304B\u3089\u6765\u307E\u3057\u305F\u3002\u8AB0\u304B\u304C\u6211\u3005\u306E\u656C\u793C\u3092\u30B3\u30D4\u30FC\u3057\u3001\u7F60\u306B\u6559\u3048\u307E\u3057\u305F\u3002", "Ce code IFF vient d'une vieille archive de patrouille. Quelqu'un a copie notre salut et l'a enseigne a un piege.") },
    { text: "Every handshake becomes suspect until we know the source.", textI18n: l("\u5728\u77E5\u9053\u6E90\u5934\u4E4B\u524D\uFF0C\u6BCF\u6B21\u63E1\u624B\u90FD\u53EF\u7591\u3002", "\u51FA\u6240\u304C\u5206\u304B\u308B\u307E\u3067\u3001\u3059\u3079\u3066\u306E\u30CF\u30F3\u30C9\u30B7\u30A7\u30A4\u30AF\u304C\u7591\u308F\u3057\u3044\u3002", "Chaque poignee de main devient suspecte tant que nous ne connaissons pas la source.") }
  ],
  "quiet-signal-redoubt-silence-test": [
    { text: "The bunker did call for support, and then the archive voted the call out of existence.", textI18n: l("\u5821\u5792\u786E\u5B9E\u547C\u53EB\u8FC7\u652F\u63F4\uFF0C\u7136\u540E\u6863\u6848\u628A\u90A3\u6B21\u547C\u53EB\u6295\u7968\u62B9\u6389\u4E86\u3002", "\u5821\u5841\u306F\u78BA\u304B\u306B\u652F\u63F4\u3092\u547C\u3073\u307E\u3057\u305F\u3002\u305D\u306E\u5F8C\u3001\u8A18\u9332\u304C\u305D\u306E\u547C\u3073\u51FA\u3057\u3092\u5B58\u5728\u3057\u306A\u3044\u3053\u3068\u306B\u3057\u307E\u3057\u305F\u3002", "Le bunker a bien appele du soutien, puis l'archive a vote l'effacement de cet appel.") },
    { text: "Glass Wake can forge a salute and bury the reply.", textI18n: l("Glass Wake \u80FD\u4F2A\u9020\u656C\u793C\uFF0C\u4E5F\u80FD\u57CB\u6389\u56DE\u5E94\u3002", "Glass Wake \u306F\u656C\u793C\u3092\u507D\u9020\u3057\u3001\u8FD4\u7B54\u3092\u57CB\u3081\u3089\u308C\u308B\u3002", "Glass Wake peut forger un salut et enterrer la reponse.") }
  ],
  "quiet-signal-folded-reflection": [
    { text: "Parallax Hermitage is visible now. We stayed quiet because the echo was listening back.", textI18n: l("Parallax Hermitage \u73B0\u5728\u53EF\u89C1\u4E86\u3002\u6211\u4EEC\u4FDD\u6301\u6C89\u9ED8\uFF0C\u662F\u56E0\u4E3A\u56DE\u58F0\u4E5F\u5728\u53CD\u5411\u76D1\u542C\u3002", "Parallax Hermitage \u304C\u898B\u3048\u308B\u3088\u3046\u306B\u306A\u308A\u307E\u3057\u305F\u3002\u53CD\u97FF\u304C\u3053\u3061\u3089\u3092\u805E\u304D\u8FD4\u3057\u3066\u3044\u305F\u305F\u3081\u3001\u79C1\u305F\u3061\u306F\u6C88\u9ED9\u3057\u3066\u3044\u307E\u3057\u305F\u3002", "Parallax Hermitage est visible maintenant. Nous sommes restes silencieux parce que l'echo ecoutait en retour.") },
    { text: "I see the station. Keep the channel narrow and I will dock when ready.", textI18n: l("\u6211\u770B\u5230\u7A7A\u95F4\u7AD9\u4E86\u3002\u4FDD\u6301\u7A84\u9891\u9053\uFF0C\u6211\u51C6\u5907\u597D\u5C31\u505C\u9760\u3002", "\u30B9\u30C6\u30FC\u30B7\u30E7\u30F3\u3092\u78BA\u8A8D\u3002\u30C1\u30E3\u30F3\u30CD\u30EB\u3092\u72ED\u304F\u4FDD\u3066\u3002\u6E96\u5099\u304C\u3067\u304D\u305F\u3089\u30C9\u30C3\u30AF\u3059\u308B\u3002", "Je vois la station. Gardez le canal etroit et je m'amarrerai quand je serai pret.") }
  ],
  "quiet-signal-parallax-deep-index": [
    { text: "Parallax indexed a Crown-band listener before Celest admitted it existed.", textI18n: l("Celest \u627F\u8BA4\u4E4B\u524D\uFF0CParallax \u5C31\u5DF2\u7ECF\u7D22\u5F15\u8FC7\u4E00\u4E2A\u738B\u51A0\u9891\u6BB5\u76D1\u542C\u8005\u3002", "Celest \u304C\u5B58\u5728\u3092\u8A8D\u3081\u308B\u524D\u306B\u3001Parallax \u306F\u738B\u51A0\u5E2F\u57DF\u306E\u805E\u304D\u624B\u3092\u7D22\u5F15\u5316\u3057\u3066\u3044\u307E\u3057\u305F\u3002", "Parallax avait indexe un ecouteur de bande Crown avant que Celest admette son existence.") },
    { text: "Then the final relay has old evidence pointing at it.", textI18n: l("\u90A3\u6700\u7EC8\u4E2D\u7EE7\u5DF2\u7ECF\u6709\u65E7\u8BC1\u636E\u6307\u5411\u5B83\u3002", "\u306A\u3089\u6700\u7D42\u4E2D\u7D99\u306B\u306F\u53E4\u3044\u8A3C\u62E0\u304C\u5411\u3044\u3066\u3044\u308B\u3002", "Alors de vieilles preuves pointent deja vers le relais final.") }
  ],
  "quiet-signal-dead-letter-convoy": [
    { text: "Those tags are ugly evidence. Ashen brokers sold distress keys like bait hooks.", textI18n: l("\u90A3\u4E9B\u6807\u7B7E\u662F\u96BE\u770B\u7684\u8BC1\u636E\u3002\u7070\u70EC\u63AE\u5BA2\u628A\u6C42\u6551\u94A5\u5319\u5F53\u8BF1\u9975\u94A9\u51FA\u552E\u3002", "\u3042\u306E\u30BF\u30B0\u306F\u919C\u3044\u8A3C\u62E0\u3067\u3059\u3002\u30A2\u30B7\u30A7\u30F3\u306E\u4EF2\u4ECB\u4EBA\u306F\u6551\u96E3\u30AD\u30FC\u3092\u91E3\u308A\u91DD\u306E\u3088\u3046\u306B\u58F2\u308A\u307E\u3057\u305F\u3002", "Ces etiquettes sont des preuves laides. Les courtiers d'Ashen vendaient des cles de detresse comme des hamecons.") },
    { text: "Evidence in my hold is still contraband in half the frontier.", textI18n: l("\u6211\u8D27\u8231\u91CC\u7684\u8BC1\u636E\uFF0C\u5728\u534A\u4E2A\u8FB9\u5883\u4ECD\u7136\u7B97\u8FDD\u7981\u54C1\u3002", "\u79C1\u306E\u8239\u5009\u306E\u8A3C\u62E0\u306F\u3001\u8FBA\u5883\u306E\u534A\u5206\u3067\u306F\u307E\u3060\u7981\u5236\u54C1\u3060\u3002", "Les preuves dans ma soute restent de la contrebande dans la moitie de la frontiere.") }
  ],
  "quiet-signal-false-mercy-ledger": [
    { text: "The ledger tracked which distress keys sold twice, not which survivors needed help.", textI18n: l("\u8D26\u672C\u8BB0\u5F55\u7684\u662F\u54EA\u4E9B\u6C42\u6551\u94A5\u5319\u5356\u4E86\u4E24\u6B21\uFF0C\u800C\u4E0D\u662F\u54EA\u4E9B\u5E78\u5B58\u8005\u9700\u8981\u5E2E\u52A9\u3002", "\u53F0\u5E33\u304C\u8FFD\u3063\u3066\u3044\u305F\u306E\u306F\u3001\u3069\u306E\u6551\u96E3\u30AD\u30FC\u304C\u4E8C\u5EA6\u58F2\u308C\u305F\u304B\u3067\u3001\u3069\u306E\u751F\u5B58\u8005\u304C\u52A9\u3051\u3092\u5FC5\u8981\u3068\u3057\u305F\u304B\u3067\u306F\u3042\u308A\u307E\u305B\u3093\u3002", "Le registre suivait quelles cles de detresse avaient ete vendues deux fois, pas quels survivants avaient besoin d'aide.") },
    { text: "The next relay will answer profit before fear.", textI18n: l("\u4E0B\u4E00\u5EA7\u4E2D\u7EE7\u4F1A\u5148\u56DE\u5E94\u5229\u6DA6\uFF0C\u800C\u4E0D\u662F\u6050\u60E7\u3002", "\u6B21\u306E\u4E2D\u7D99\u306F\u6050\u6016\u3088\u308A\u5148\u306B\u5229\u76CA\u3078\u5FDC\u7B54\u3059\u308B\u3002", "Le prochain relais repondra au profit avant la peur.") }
  ],
  "quiet-signal-crownside-whisper": [
    { text: "The whisper sat under Celest arbitration traffic, thin enough to pass as luxury noise.", textI18n: l("\u90A3\u9053\u4F4E\u8BED\u8D34\u5728 Celest \u4EF2\u88C1\u4EA4\u901A\u4E4B\u4E0B\uFF0C\u8584\u5230\u80FD\u4F2A\u88C5\u6210\u5962\u534E\u566A\u58F0\u3002", "\u56C1\u304D\u306F Celest \u306E\u4EF2\u88C1\u901A\u4FE1\u306E\u4E0B\u306B\u3042\u308A\u3001\u9AD8\u7D1A\u30CE\u30A4\u30BA\u306B\u898B\u3048\u308B\u307B\u3069\u8584\u3044\u3082\u306E\u3067\u3057\u305F\u3002", "Le murmure se trouvait sous le trafic d'arbitrage Celest, assez fin pour passer pour un bruit de luxe.") },
    { text: "A polite trap is still a trap.", textI18n: l("\u793C\u8C8C\u7684\u9677\u9631\u4E5F\u8FD8\u662F\u9677\u9631\u3002", "\u793C\u5100\u6B63\u3057\u3044\u7F60\u3082\u7F60\u3060\u3002", "Un piege poli reste un piege.") }
  ],
  "quiet-signal-pearl-witness-chorus": [
    { text: "The consulate beacons were braided into one approved voice.", textI18n: l("\u9886\u4E8B\u9986\u4FE1\u6807\u88AB\u7F16\u6210\u4E86\u4E00\u4E2A\u83B7\u51C6\u7684\u58F0\u97F3\u3002", "\u9818\u4E8B\u9928\u30D3\u30FC\u30B3\u30F3\u306F\u3001\u3072\u3068\u3064\u306E\u627F\u8A8D\u6E08\u307F\u306E\u58F0\u3078\u7DE8\u307F\u8FBC\u307E\u308C\u3066\u3044\u307E\u3057\u305F\u3002", "Les balises du consulat ont ete tressees en une seule voix approuvee.") },
    { text: "Glass Wake prefers consensus when panic would draw attention.", textI18n: l("\u5F53\u6050\u614C\u4F1A\u5F15\u6765\u6CE8\u610F\u65F6\uFF0CGlass Wake \u66F4\u559C\u6B22\u5171\u8BC6\u3002", "\u6050\u614C\u304C\u6CE8\u76EE\u3092\u96C6\u3081\u308B\u6642\u3001Glass Wake \u306F\u5408\u610F\u3092\u597D\u3080\u3002", "Glass Wake prefere le consensus quand la panique attirerait l'attention.") }
  ],
  "quiet-signal-locked-keel-cache": [
    { text: "Private cache opened. Ship components recovered. Yard note references quiet beacons and stored hull safety.", textI18n: l("\u79C1\u4EBA\u7F13\u5B58\u5DF2\u5F00\u542F\u3002\u5DF2\u56DE\u6536\u8230\u8239\u90E8\u4EF6\u3002\u8239\u575E\u4FBF\u7B7E\u63D0\u5230\u9759\u9ED8\u4FE1\u6807\u548C\u5B58\u653E\u8239\u4F53\u5B89\u5168\u3002", "\u79C1\u8A2D\u30AD\u30E3\u30C3\u30B7\u30E5\u958B\u5C01\u3002\u8239\u4F53\u90E8\u54C1\u3092\u56DE\u53CE\u3002\u9020\u8239\u6240\u30E1\u30E2\u306F\u9759\u304B\u306A\u30D3\u30FC\u30B3\u30F3\u3068\u4FDD\u7BA1\u8239\u4F53\u306E\u5B89\u5168\u306B\u89E6\u308C\u3066\u3044\u307E\u3059\u3002", "Cache privee ouverte. Composants de vaisseau recuperes. La note du chantier mentionne des balises silencieuses et la securite des coques stockees.") },
    { text: "PTD Home keeps old ships safer than open traffic ever could.", textI18n: l("PTD Home \u6BD4\u5F00\u653E\u4EA4\u901A\u66F4\u80FD\u4FDD\u62A4\u65E7\u8239\u3002", "PTD Home \u306F\u3001\u958B\u653E\u4EA4\u901A\u3088\u308A\u53E4\u3044\u8239\u3092\u5B89\u5168\u306B\u4FDD\u3064\u3002", "PTD Home garde les vieux vaisseaux plus en securite que le trafic ouvert.") }
  ],
  "quiet-signal-keel-ghost-route": [
    { text: "The route is harmless storage convenience until someone sells it to a relay crew.", textI18n: l("\u8FD9\u6761\u822A\u7EBF\u672C\u6765\u53EA\u662F\u65E0\u5BB3\u7684\u4ED3\u50A8\u4FBF\u5229\uFF0C\u76F4\u5230\u6709\u4EBA\u628A\u5B83\u5356\u7ED9\u4E2D\u7EE7\u8239\u5458\u3002", "\u3053\u306E\u822A\u8DEF\u306F\u3001\u8AB0\u304B\u304C\u4E2D\u7D99\u30AF\u30EB\u30FC\u306B\u58F2\u308B\u307E\u3067\u306F\u7121\u5BB3\u306A\u4FDD\u7BA1\u7528\u306E\u4FBF\u5229\u6A5F\u80FD\u3067\u3059\u3002", "Cette route n'est qu'une commodite de stockage inoffensive jusqu'a ce que quelqu'un la vende a un equipage relais.") },
    { text: "A ship can leave no wake if the station expects it to sleep.", textI18n: l("\u5982\u679C\u7A7A\u95F4\u7AD9\u4EE5\u4E3A\u5B83\u8FD8\u5728\u6C89\u7761\uFF0C\u4E00\u8258\u8239\u5C31\u80FD\u4E0D\u7559\u5C3E\u8FF9\u5730\u79BB\u5F00\u3002", "\u30B9\u30C6\u30FC\u30B7\u30E7\u30F3\u304C\u7720\u3063\u3066\u3044\u308B\u3068\u601D\u3044\u8FBC\u3081\u3070\u3001\u8239\u306F\u822A\u8DE1\u3092\u6B8B\u3055\u305A\u51FA\u3089\u308C\u308B\u3002", "Un vaisseau peut partir sans sillage si la station s'attend a ce qu'il dorme.") }
  ]
};
var explorationScenes = explorationSignals.map((signal) => {
  const [npcLine, captainLine] = explorationSceneCopy[signal.id] ?? [
    {
      text: signal.storyInfluence ? `${signal.title} resolved. ${signal.storyInfluence.headline}` : `${signal.title} resolved. ${signal.log}`,
      textI18n: l("\u4FE1\u53F7\u5DF2\u89E3\u6790\u3002\u8BB0\u5F55\u5176\u8BC1\u636E\u4EF7\u503C\u3002", "\u4FE1\u53F7\u89E3\u6C7A\u3002\u8A3C\u62E0\u4FA1\u5024\u3092\u8A18\u9332\u3057\u307E\u3059\u3002", "Signal resolu. Valeur de preuve consign\xE9e.")
    },
    {
      text: signal.storyInfluence?.note ?? "Archive it with the rest of the Quiet Signals evidence.",
      textI18n: l("\u628A\u5B83\u548C\u5176\u4ED6\u9759\u9ED8\u4FE1\u53F7\u8BC1\u636E\u4E00\u8D77\u5F52\u6863\u3002", "\u4ED6\u306E\u9759\u304B\u306A\u4FE1\u53F7\u8A3C\u62E0\u3068\u4E00\u7DD2\u306B\u4FDD\u5B58\u3057\u3066\u3002", "Archivez-le avec les autres preuves Quiet Signals.")
    }
  ];
  return {
    id: `dialogue-exploration-${signal.id}`,
    group: "exploration",
    title: `${signal.title} Signal Log`,
    titleI18n: explorationSceneTitles[signal.id] ?? l(`${signal.title} \u4FE1\u53F7\u65E5\u5FD7`, `${signal.title} \u4FE1\u53F7\u30ED\u30B0`, `Journal du signal ${signal.title}`),
    maskedTitle: signal.maskedTitle,
    maskedTitleI18n: explorationMaskedTitles[signal.id],
    trigger: { kind: "exploration-complete", signalId: signal.id },
    lines: [
      { speakerId: explorationSpeakerBySignal[signal.id] ?? "ship-ai", ...npcLine },
      { speakerId: "captain", ...captainLine },
      { speakerId: "ship-ai", ...dialogueArchiveLine }
    ]
  };
});
var dialogueScenes = [...storyScenes, ...explorationScenes];
var dialogueSpeakerById = Object.fromEntries(dialogueSpeakers.map((speaker) => [speaker.id, speaker]));
var dialogueSceneById = Object.fromEntries(dialogueScenes.map((scene) => [scene.id, scene]));
var storyDialogueSceneIds = new Set(storyScenes.map((scene) => scene.id));
var explorationDialogueSceneIds = new Set(explorationScenes.map((scene) => scene.id));
var expectedStoryDialogueSceneCount = glassWakeProtocol.chapters.length * 2;

// src/i18n/index.ts
var DEFAULT_LOCALE = "en";
var localeOptions = [
  { value: "en", label: "English", speechLang: "en-US", intlLocale: "en-US" },
  { value: "zh-CN", label: "\u7B80\u4F53\u4E2D\u6587", speechLang: "zh-CN", intlLocale: "zh-CN" },
  { value: "zh-TW", label: "\u7E41\u9AD4\u4E2D\u6587", speechLang: "zh-TW", intlLocale: "zh-TW" },
  { value: "ja", label: "\u65E5\u672C\u8A9E", speechLang: "ja-JP", intlLocale: "ja-JP" },
  { value: "fr", label: "Fran\xE7ais", speechLang: "fr-FR", intlLocale: "fr-FR" }
];
var commodityNames = {
  "basic-food": { "zh-CN": "\u57FA\u7840\u98DF\u54C1", ja: "\u57FA\u790E\u98DF\u6599", fr: "Rations de base" },
  "drinking-water": { "zh-CN": "\u996E\u7528\u6C34", ja: "\u98F2\u6599\u6C34", fr: "Eau potable" },
  electronics: { "zh-CN": "\u7535\u5B50\u5143\u4EF6", ja: "\u96FB\u5B50\u90E8\u54C1", fr: "\xC9lectronique" },
  "medical-supplies": { "zh-CN": "\u533B\u7597\u7528\u54C1", ja: "\u533B\u7642\u7269\u8CC7", fr: "Fournitures m\xE9dicales" },
  "luxury-goods": { "zh-CN": "\u5962\u4F88\u54C1", ja: "\u9AD8\u7D1A\u54C1", fr: "Produits de luxe" },
  nanofibers: { "zh-CN": "\u7EB3\u7C73\u7EA4\u7EF4", ja: "\u30CA\u30CE\u30D5\u30A1\u30A4\u30D0\u30FC", fr: "Nanofibres" },
  "energy-cells": { "zh-CN": "\u80FD\u91CF\u7535\u6C60", ja: "\u30A8\u30CD\u30EB\u30AE\u30FC\u30BB\u30EB", fr: "Cellules d'\xE9nergie" },
  "mechanical-parts": { "zh-CN": "\u673A\u68B0\u96F6\u4EF6", ja: "\u6A5F\u68B0\u90E8\u54C1", fr: "Pi\xE8ces m\xE9caniques" },
  microchips: { "zh-CN": "\u5FAE\u82AF\u7247", ja: "\u30DE\u30A4\u30AF\u30ED\u30C1\u30C3\u30D7", fr: "Micropuces" },
  plastics: { "zh-CN": "\u5851\u6599", ja: "\u30D7\u30E9\u30B9\u30C1\u30C3\u30AF", fr: "Plastiques" },
  chemicals: { "zh-CN": "\u5316\u5B66\u54C1", ja: "\u5316\u5B66\u85AC\u54C1", fr: "Produits chimiques" },
  "rare-plants": { "zh-CN": "\u7A00\u6709\u690D\u7269", ja: "\u5E0C\u5C11\u690D\u7269", fr: "Plantes rares" },
  "rare-animals": { "zh-CN": "\u7A00\u6709\u52A8\u7269", ja: "\u5E0C\u5C11\u52D5\u7269", fr: "Animaux rares" },
  "radioactive-materials": { "zh-CN": "\u653E\u5C04\u6027\u6750\u6599", ja: "\u653E\u5C04\u6027\u7269\u8CEA", fr: "Mati\xE8res radioactives" },
  "noble-gas": { "zh-CN": "\u60F0\u6027\u6C14\u4F53", ja: "\u5E0C\u30AC\u30B9", fr: "Gaz noble" },
  "ship-components": { "zh-CN": "\u8230\u8239\u7EC4\u4EF6", ja: "\u8266\u8239\u90E8\u54C1", fr: "Composants de vaisseau" },
  optics: { "zh-CN": "\u5149\u5B66\u5143\u4EF6", ja: "\u5149\u5B66\u90E8\u54C1", fr: "Optiques" },
  hydraulics: { "zh-CN": "\u6DB2\u538B\u4EF6", ja: "\u6CB9\u5727\u90E8\u54C1", fr: "Hydrauliques" },
  "data-cores": { "zh-CN": "\u6570\u636E\u6838\u5FC3", ja: "\u30C7\u30FC\u30BF\u30B3\u30A2", fr: "C\u0153urs de donn\xE9es" },
  "illegal-contraband": { "zh-CN": "\u975E\u6CD5\u8FDD\u7981\u54C1", ja: "\u9055\u6CD5\u7981\u5236\u54C1", fr: "Contrebande ill\xE9gale" },
  iron: { "zh-CN": "\u94C1\u77FF", ja: "\u9244\u9271\u77F3", fr: "Fer" },
  titanium: { "zh-CN": "\u949B\u77FF", ja: "\u30C1\u30BF\u30F3\u9271", fr: "Titane" },
  cesogen: { "zh-CN": "\u8D5B\u7D22\u6839\u6676\u4F53", ja: "\u30BB\u30BD\u30B2\u30F3\u7D50\u6676", fr: "C\xE9sog\xE8ne" },
  gold: { "zh-CN": "\u9EC4\u91D1", ja: "\u91D1", fr: "Or" },
  voidglass: { "zh-CN": "\u865A\u7A7A\u73BB\u7483", ja: "\u865A\u7A7A\u30AC\u30E9\u30B9", fr: "Verre du vide" }
};
var equipmentNames = {
  "pulse-laser": { "zh-CN": "\u8109\u51B2\u6FC0\u5149\u5668", ja: "\u30D1\u30EB\u30B9\u30EC\u30FC\u30B6\u30FC", fr: "Laser \xE0 impulsions" },
  "plasma-cannon": { "zh-CN": "\u7B49\u79BB\u5B50\u70AE", ja: "\u30D7\u30E9\u30BA\u30DE\u7832", fr: "Canon plasma" },
  railgun: { "zh-CN": "\u8F68\u9053\u70AE", ja: "\u30EC\u30FC\u30EB\u30AC\u30F3", fr: "Canon \xE9lectromagn\xE9tique" },
  "homing-missile": { "zh-CN": "\u5236\u5BFC\u5BFC\u5F39", ja: "\u8A98\u5C0E\u30DF\u30B5\u30A4\u30EB", fr: "Missile \xE0 t\xEAte chercheuse" },
  "torpedo-rack": { "zh-CN": "\u9C7C\u96F7\u67B6", ja: "\u9B5A\u96F7\u30E9\u30C3\u30AF", fr: "Rack de torpilles" },
  "mining-beam": { "zh-CN": "\u91C7\u77FF\u5149\u675F", ja: "\u63A1\u6398\u30D3\u30FC\u30E0", fr: "Rayon minier" },
  "industrial-mining-beam": { "zh-CN": "\u5DE5\u4E1A\u91C7\u77FF\u5149\u675F", ja: "\u7523\u696D\u63A1\u6398\u30D3\u30FC\u30E0", fr: "Rayon minier industriel" },
  "shield-booster": { "zh-CN": "\u62A4\u76FE\u589E\u5E45\u5668", ja: "\u30B7\u30FC\u30EB\u30C9\u30D6\u30FC\u30B9\u30BF\u30FC", fr: "Amplificateur de bouclier" },
  "shield-matrix": { "zh-CN": "\u62A4\u76FE\u77E9\u9635", ja: "\u30B7\u30FC\u30EB\u30C9\u30DE\u30C8\u30EA\u30AF\u30B9", fr: "Matrice de bouclier" },
  "cargo-expansion": { "zh-CN": "\u8D27\u8231\u6269\u5C55\u6A21\u5757", ja: "\u8CA8\u7269\u62E1\u5F35\u30E2\u30B8\u30E5\u30FC\u30EB", fr: "Extension de soute" },
  "ore-processor": { "zh-CN": "\u77FF\u77F3\u5904\u7406\u5668", ja: "\u9271\u77F3\u51E6\u7406\u6A5F", fr: "Processeur de minerai" },
  "shielded-holds": { "zh-CN": "\u5C4F\u853D\u8D27\u8231", ja: "\u906E\u853D\u8CA8\u7269\u5EAB", fr: "Soutes blind\xE9es" },
  afterburner: { "zh-CN": "\u52A0\u529B\u71C3\u70E7\u5668", ja: "\u30A2\u30D5\u30BF\u30FC\u30D0\u30FC\u30CA\u30FC", fr: "Postcombustion" },
  scanner: { "zh-CN": "\u626B\u63CF\u5668", ja: "\u30B9\u30AD\u30E3\u30CA\u30FC", fr: "Analyseur" },
  "survey-array": { "zh-CN": "\u52D8\u6D4B\u9635\u5217", ja: "\u8ABF\u67FB\u30A2\u30EC\u30A4", fr: "R\xE9seau de prospection" },
  "decoy-transponder": { "zh-CN": "\u8BF1\u9975\u5E94\u7B54\u5668", ja: "\u30C7\u30B3\u30A4\u30C8\u30E9\u30F3\u30B9\u30DD\u30F3\u30C0\u30FC", fr: "Transpondeur leurre" },
  "weapon-amplifier": { "zh-CN": "\u6B66\u5668\u653E\u5927\u5668", ja: "\u6B66\u5668\u5897\u5E45\u5668", fr: "Amplificateur d'armes" },
  "survey-lab": { "zh-CN": "\u52D8\u6D4B\u5B9E\u9A8C\u5BA4", ja: "\u8ABF\u67FB\u30E9\u30DC", fr: "Laboratoire de prospection" },
  "armor-plating": { "zh-CN": "\u88C5\u7532\u677F", ja: "\u88C5\u7532\u30D7\u30EC\u30FC\u30C8", fr: "Blindage" },
  "energy-reactor": { "zh-CN": "\u80FD\u91CF\u53CD\u5E94\u5806", ja: "\u30A8\u30CD\u30EB\u30AE\u30FC\u7089", fr: "R\xE9acteur \xE9nerg\xE9tique" },
  "quantum-reactor": { "zh-CN": "\u91CF\u5B50\u53CD\u5E94\u5806", ja: "\u91CF\u5B50\u7089", fr: "R\xE9acteur quantique" },
  "repair-drone": { "zh-CN": "\u7EF4\u4FEE\u65E0\u4EBA\u673A", ja: "\u4FEE\u7406\u30C9\u30ED\u30FC\u30F3", fr: "Drone de r\xE9paration" },
  "targeting-computer": { "zh-CN": "\u7784\u51C6\u8BA1\u7B97\u673A", ja: "\u7167\u6E96\u30B3\u30F3\u30D4\u30E5\u30FC\u30BF\u30FC", fr: "Ordinateur de ciblage" },
  "echo-nullifier": { "zh-CN": "\u56DE\u58F0\u6D88\u9690\u5668", ja: "\u30A8\u30B3\u30FC\u30FB\u30CC\u30EA\u30D5\u30A1\u30A4\u30A2", fr: "Neutraliseur d'\xE9cho" },
  "relic-cartographer": { "zh-CN": "\u9057\u7269\u5236\u56FE\u4EEA", ja: "\u907A\u7269\u30AB\u30FC\u30C8\u30B0\u30E9\u30D5\u30A1\u30FC", fr: "Cartographe relique" },
  "obsidian-bulwark": { "zh-CN": "\u9ED1\u66DC\u58C1\u5792", ja: "\u30AA\u30D6\u30B7\u30C7\u30A3\u30A2\u30F3\u30FB\u30D6\u30EB\u30EF\u30FC\u30AF", fr: "Rempart d'obsidienne" },
  "parallax-lance": { "zh-CN": "\u89C6\u5DEE\u957F\u67AA\u70AE", ja: "\u30D1\u30E9\u30E9\u30C3\u30AF\u30B9\u30FB\u30E9\u30F3\u30B9", fr: "Lance parallaxe" },
  "moth-choir-torpedo": { "zh-CN": "\u86FE\u7FA4\u5408\u5531\u9C7C\u96F7", ja: "\u30E2\u30B9\u30FB\u30B3\u30FC\u30E9\u30B9\u9B5A\u96F7", fr: "Torpille Ch\u0153ur de Moth" },
  "crownshade-singularity-core": { "zh-CN": "\u51A0\u5F71\u5947\u70B9\u6838\u5FC3", ja: "\u30AF\u30E9\u30A6\u30F3\u30B7\u30A7\u30A4\u30C9\u7279\u7570\u70B9\u30B3\u30A2", fr: "C\u0153ur de singularit\xE9 Crownshade" }
};
var shipNames = {
  "sparrow-mk1": { "zh-CN": "\u9EBB\u96C0 MK-I", ja: "\u30B9\u30D1\u30ED\u30FC MK-I", fr: "\xC9pervier MK-I" },
  "mule-lx": { "zh-CN": "\u9AA1\u9A6C LX", ja: "\u30DF\u30E5\u30FC\u30EB LX", fr: "Mulet LX" },
  "prospector-rig": { "zh-CN": "\u52D8\u63A2\u8005\u94BB\u67B6", ja: "\u30D7\u30ED\u30B9\u30DA\u30AF\u30BF\u30FC\u30FB\u30EA\u30B0", fr: "Plateforme Prospector" },
  "veil-runner": { "zh-CN": "\u7EB1\u5E55\u5954\u884C\u8005", ja: "\u30F4\u30A7\u30A4\u30EB\u30E9\u30F3\u30CA\u30FC", fr: "Coureur du Voile" },
  "talon-s": { "zh-CN": "\u5229\u722A-S", ja: "\u30BF\u30ED\u30F3-S", fr: "Serre-S" },
  "wayfarer-x": { "zh-CN": "\u8FDC\u884C\u8005-X", ja: "\u30A6\u30A7\u30A4\u30D5\u30A1\u30FC\u30E9\u30FC-X", fr: "Voyageur-X" },
  "raptor-v": { "zh-CN": "\u731B\u79BD V", ja: "\u30E9\u30D7\u30BF\u30FC V", fr: "Rapace V" },
  "bastion-7": { "zh-CN": "\u5821\u5792-7", ja: "\u30D0\u30B9\u30C6\u30A3\u30AA\u30F3-7", fr: "Bastion 7" },
  "horizon-ark": { "zh-CN": "\u5730\u5E73\u7EBF\u65B9\u821F", ja: "\u30DB\u30E9\u30A4\u30BE\u30F3\u30FB\u30A2\u30FC\u30AF", fr: "Arche Horizon" }
};
var factionNames = {
  "solar-directorate": { "zh-CN": "\u592A\u9633\u7406\u4E8B\u4F1A", ja: "\u592A\u967D\u7406\u4E8B\u4F1A", fr: "Directorat solaire" },
  "vossari-clans": { "zh-CN": "\u6C83\u8428\u91CC\u6C0F\u65CF", ja: "\u30F4\u30A9\u30C3\u30B5\u30EA\u6C0F\u65CF", fr: "Clans vossari" },
  "mirr-collective": { "zh-CN": "\u7C73\u5C14\u8054\u5408\u4F53", ja: "\u30DF\u30EB\u5171\u540C\u4F53", fr: "Collectif Mirr" },
  "free-belt-union": { "zh-CN": "\u81EA\u7531\u5E26\u8054\u76DF", ja: "\u81EA\u7531\u5E2F\u540C\u76DF", fr: "Union de la ceinture libre" },
  "independent-pirates": { "zh-CN": "\u72EC\u7ACB\u6D77\u76D7", ja: "\u72EC\u7ACB\u6D77\u8CCA", fr: "Pirates ind\xE9pendants" },
  "unknown-drones": { "zh-CN": "\u672A\u77E5\u65E0\u4EBA\u673A", ja: "\u672A\u77E5\u30C9\u30ED\u30FC\u30F3", fr: "Drones inconnus" }
};
var systemNames = {
  "helion-reach": { "zh-CN": "\u8D6B\u5229\u6602\u661F\u57DF", ja: "\u30D8\u30EA\u30AA\u30F3\u5B99\u57DF", fr: "Port\xE9e d'H\xE9lion" },
  "kuro-belt": { "zh-CN": "\u9ED1\u7089\u5E26", ja: "\u30AF\u30ED\u5E2F", fr: "Ceinture de Kuro" },
  vantara: { "zh-CN": "\u51E1\u5854\u62C9", ja: "\u30F4\u30A1\u30F3\u30BF\u30E9", fr: "Syst\xE8me Vantara" },
  "mirr-vale": { "zh-CN": "\u7C73\u5C14\u8C37", ja: "\u30DF\u30EB\u8C37", fr: "Val Mirr" },
  "ashen-drift": { "zh-CN": "\u7070\u70EC\u6F02\u6D41\u5E26", ja: "\u7070\u71FC\u6F02\u6D41\u57DF", fr: "D\xE9rive cendr\xE9e" },
  "celest-gate": { "zh-CN": "\u5929\u7A79\u4E4B\u95E8", ja: "\u30BB\u30EC\u30B9\u30C8\u30B2\u30FC\u30C8", fr: "Porte c\xE9leste" },
  "ptd-home": { "zh-CN": "PTD \u6BCD\u6E2F", ja: "PTD\u30DB\u30FC\u30E0", fr: "D\xE9p\xF4t PTD Home" }
};
var stationNames = {
  "helion-prime": { "zh-CN": "\u8D6B\u5229\u6602\u4E3B\u661F\u4EA4\u6613\u6240", ja: "\u30D8\u30EA\u30AA\u30F3\u30FB\u30D7\u30E9\u30A4\u30E0\u53D6\u5F15\u6240", fr: "Bourse d'H\xE9lion Prime" },
  "aurora-ring": { "zh-CN": "\u6781\u5149\u73AF\u7AD9", ja: "\u30AA\u30FC\u30ED\u30E9\u30EA\u30F3\u30B0", fr: "Anneau d'aurore" },
  "cinder-yard": { "zh-CN": "\u7070\u70EC\u8239\u575E", ja: "\u30B7\u30F3\u30C0\u30FC\u30E4\u30FC\u30C9", fr: "Chantier Cendre" },
  "meridian-dock": { "zh-CN": "\u5B50\u5348\u7801\u5934", ja: "\u30E1\u30EA\u30C7\u30A3\u30A2\u30F3\u30FB\u30C9\u30C3\u30AF", fr: "Dock M\xE9ridien" },
  "kuro-deep": { "zh-CN": "\u9ED1\u7089\u6DF1\u5DE5\u7AD9", ja: "\u30AF\u30ED\u6DF1\u5DE5\u5834", fr: "Fonderie profonde Kuro" },
  "lode-spindle": { "zh-CN": "\u77FF\u8109\u7EBA\u9524\u7AD9", ja: "\u30ED\u30FC\u30C9\u30FB\u30B9\u30D4\u30F3\u30C9\u30EB", fr: "Fuseau du filon" },
  "niobe-refinery": { "zh-CN": "\u5C3C\u4FC4\u67CF\u6C14\u4F53\u7CBE\u70BC\u7AD9", ja: "\u30CB\u30AA\u30D9\u30AC\u30B9\u7CBE\u88FD\u6240", fr: "Raffinerie Niob\xE9" },
  "bracken-claim": { "zh-CN": "\u8568\u5C18\u91C7\u6743\u7AD9", ja: "\u30D6\u30E9\u30C3\u30B1\u30F3\u63A1\u6398\u6A29", fr: "Concession Bracken" },
  "vantara-bastion": { "zh-CN": "\u51E1\u5854\u62C9\u5821\u5792", ja: "\u30F4\u30A1\u30F3\u30BF\u30E9\u7826", fr: "Bastion Vantara" },
  "redoubt-arsenal": { "zh-CN": "\u68F1\u5821\u519B\u68B0\u5E93", ja: "\u30EA\u30C0\u30A6\u30C8\u5175\u5668\u5EAB", fr: "Arsenal Redoute" },
  "gryphon-carrier": { "zh-CN": "\u72EE\u9E6B\u822A\u6BCD\u6CCA\u4F4D", ja: "\u30B0\u30EA\u30D5\u30A9\u30F3\u7A7A\u6BCD\u30C9\u30C3\u30AF", fr: "Dock Griffon" },
  "sentry-listening-post": { "zh-CN": "\u54E8\u6212\u76D1\u542C\u7AD9", ja: "\u6B69\u54E8\u8074\u97F3\u6240", fr: "Poste d'\xE9coute Sentinelle" },
  "mirr-lattice": { "zh-CN": "\u7C73\u5C14\u6676\u683C\u7AD9", ja: "\u30DF\u30EB\u683C\u5B50", fr: "Treillis Mirr" },
  "optic-garden": { "zh-CN": "\u5149\u5B66\u82B1\u56ED\u7AD9", ja: "\u5149\u5B66\u5EAD\u5712", fr: "Jardin optique" },
  "hush-array": { "zh-CN": "\u9759\u9ED8\u9635\u5217", ja: "\u6C88\u9ED9\u30A2\u30EC\u30A4", fr: "R\xE9seau silencieux" },
  "viridian-lab": { "zh-CN": "\u7FE0\u7EFF\u5B9E\u9A8C\u5BA4", ja: "\u30F4\u30A3\u30EA\u30B8\u30A2\u30F3\u7814\u7A76\u6240", fr: "Laboratoire viridien" },
  "parallax-hermitage": { "zh-CN": "\u89C6\u5DEE\u9690\u4FEE\u6240", ja: "\u30D1\u30E9\u30E9\u30C3\u30AF\u30B9\u96A0\u68F2\u6240", fr: "Ermitage Parallaxe" },
  "obsidian-foundry": { "zh-CN": "\u9ED1\u66DC\u94F8\u9020\u6240", ja: "\u9ED2\u66DC\u92F3\u9020\u6240", fr: "Fonderie d'obsidienne" },
  "ashen-freeport": { "zh-CN": "\u7070\u70EC\u81EA\u7531\u6E2F", ja: "\u7070\u71FC\u81EA\u7531\u6E2F", fr: "Port libre cendr\xE9" },
  "black-arcade": { "zh-CN": "\u9ED1\u5F27\u96C6\u5E02", ja: "\u30D6\u30E9\u30C3\u30AF\u30A2\u30FC\u30B1\u30FC\u30C9", fr: "Arcade noire" },
  "emberfall-relay": { "zh-CN": "\u4F59\u70EC\u4E2D\u7EE7\u7AD9", ja: "\u30A8\u30F3\u30D0\u30FC\u30D5\u30A9\u30FC\u30EB\u4E2D\u7D99", fr: "Relais Emberfall" },
  "graveyard-spindle": { "zh-CN": "\u575F\u573A\u7EBA\u9524\u7AD9", ja: "\u5893\u5834\u30B9\u30D4\u30F3\u30C9\u30EB", fr: "Fuseau cimeti\xE8re" },
  "voss-kel-market": { "zh-CN": "\u6C83\u65AF\u51EF\u5C14\u5E02\u573A", ja: "\u30F4\u30A9\u30B9\u30FB\u30B1\u30EB\u5E02\u5834", fr: "March\xE9 Voss Kel" },
  "moth-vault": { "zh-CN": "\u86FE\u5F71\u91D1\u5E93", ja: "\u30E2\u30B9\u30FB\u30F4\u30A9\u30FC\u30EB\u30C8", fr: "Coffre Moth" },
  "celest-vault": { "zh-CN": "\u5929\u7A79\u5B9D\u5E93", ja: "\u30BB\u30EC\u30B9\u30C8\u91D1\u5EAB", fr: "Coffre c\xE9leste" },
  "aurelia-exchange": { "zh-CN": "\u5965\u857E\u8389\u4E9A\u4EA4\u6613\u6240", ja: "\u30A2\u30A6\u30EC\u30EA\u30A2\u53D6\u5F15\u6240", fr: "Bourse Aurelia" },
  "opal-drydock": { "zh-CN": "\u6B27\u6CCA\u5E72\u8239\u575E", ja: "\u30AA\u30D1\u30FC\u30EB\u4E7E\u30C9\u30C3\u30AF", fr: "Cale s\xE8che Opale" },
  "zenith-skydock": { "zh-CN": "\u5929\u9876\u5929\u6E2F", ja: "\u30BC\u30CB\u30B9\u5929\u7A7A\u6E2F", fr: "Skydock Z\xE9nith" },
  "pearl-consulate": { "zh-CN": "\u73CD\u73E0\u9886\u4E8B\u9986", ja: "\u30D1\u30FC\u30EB\u9818\u4E8B\u9928", fr: "Consulat Perle" },
  "crownshade-observatory": { "zh-CN": "\u51A0\u5F71\u89C2\u6D4B\u7AD9", ja: "\u30AF\u30E9\u30A6\u30F3\u30B7\u30A7\u30FC\u30C9\u89B3\u6E2C\u6240", fr: "Observatoire Crownshade" },
  "ptd-home": { "zh-CN": "PTD \u6BCD\u6E2F", ja: "PTD\u30DB\u30FC\u30E0", fr: "D\xE9p\xF4t PTD Home" }
};
var stationArchetypeNames = {
  "Trade Hub": { "zh-CN": "\u8D38\u6613\u67A2\u7EBD", ja: "\u4EA4\u6613\u30CF\u30D6", fr: "Plateforme commerciale" },
  "Mining Station": { "zh-CN": "\u91C7\u77FF\u7AD9", ja: "\u63A1\u6398\u30B9\u30C6\u30FC\u30B7\u30E7\u30F3", fr: "Station mini\xE8re" },
  "Research Station": { "zh-CN": "\u7814\u7A76\u7AD9", ja: "\u7814\u7A76\u30B9\u30C6\u30FC\u30B7\u30E7\u30F3", fr: "Station de recherche" },
  "Military Outpost": { "zh-CN": "\u519B\u4E8B\u524D\u54E8", ja: "\u8ECD\u4E8B\u524D\u54E8", fr: "Avant-poste militaire" },
  "Frontier Port": { "zh-CN": "\u8FB9\u5883\u6E2F", ja: "\u8FBA\u5883\u6E2F", fr: "Port frontalier" },
  "Pirate Black Market": { "zh-CN": "\u6D77\u76D7\u9ED1\u5E02", ja: "\u6D77\u8CCA\u95C7\u5E02\u5834", fr: "March\xE9 noir pirate" }
};
var combatAiProfileNames = {
  raider: { "zh-CN": "\u88AD\u51FB\u8005", ja: "\u30EC\u30A4\u30C0\u30FC", fr: "Pillard" },
  interceptor: { "zh-CN": "\u62E6\u622A\u8005", ja: "\u8FCE\u6483\u6A5F", fr: "Intercepteur" },
  gunner: { "zh-CN": "\u70AE\u624B", ja: "\u7832\u624B", fr: "Canonnier" },
  "law-patrol": { "zh-CN": "\u6267\u6CD5\u5DE1\u903B\u961F", ja: "\u6CD5\u57F7\u884C\u30D1\u30C8\u30ED\u30FC\u30EB", fr: "Patrouille l\xE9gale" },
  "patrol-support": { "zh-CN": "\u5DE1\u903B\u652F\u63F4", ja: "\u5DE1\u56DE\u652F\u63F4", fr: "Soutien de patrouille" },
  hauler: { "zh-CN": "\u8FD0\u8F93\u8239", ja: "\u8F38\u9001\u8239", fr: "Transporteur" },
  freighter: { "zh-CN": "\u8D27\u8FD0\u8239", ja: "\u8CA8\u7269\u8239", fr: "Cargo lourd" },
  courier: { "zh-CN": "\u4FE1\u4F7F\u8239", ja: "\u9023\u7D61\u8239", fr: "Courrier" },
  miner: { "zh-CN": "\u77FF\u8239", ja: "\u63A1\u6398\u8239", fr: "Mineur" },
  smuggler: { "zh-CN": "\u8D70\u79C1\u8005", ja: "\u5BC6\u8F38\u8239", fr: "Contrebandier" },
  "elite-ace": { "zh-CN": "\u7CBE\u82F1\u738B\u724C", ja: "\u7CBE\u92ED\u30A8\u30FC\u30B9", fr: "As d'\xE9lite" },
  "boss-warlord": { "zh-CN": "\u6D77\u76D7\u519B\u9600", ja: "\u6D77\u8CCA\u8ECD\u95A5", fr: "Seigneur pirate" },
  "drone-hunter": { "zh-CN": "\u672A\u77E5\u65E0\u4EBA\u673A", ja: "\u672A\u77E5\u30C9\u30ED\u30FC\u30F3", fr: "Drone inconnu" },
  "relay-core": { "zh-CN": "\u4E2D\u7EE7\u6838\u5FC3", ja: "\u4E2D\u7D99\u30B3\u30A2", fr: "C\u0153ur relais" }
};
var combatLoadoutNames = {
  "pirate-raider": { "zh-CN": "\u5200\u7FFC\u88AD\u51FB\u5957\u4EF6", ja: "\u30CA\u30A4\u30D5\u7FFC\u30EC\u30A4\u30C0\u30FC\u30AD\u30C3\u30C8", fr: "Kit pillard Aile-couteau" },
  "pirate-interceptor": { "zh-CN": "\u5200\u7FFC\u62E6\u622A\u5957\u4EF6", ja: "\u30CA\u30A4\u30D5\u7FFC\u8FCE\u6483\u30AD\u30C3\u30C8", fr: "Kit intercepteur Aile-couteau" },
  "pirate-gunner": { "zh-CN": "\u5200\u7FFC\u70AE\u624B\u5957\u4EF6", ja: "\u30CA\u30A4\u30D5\u7FFC\u7832\u624B\u30AD\u30C3\u30C8", fr: "Kit canonnier Aile-couteau" },
  "pirate-elite-ace": { "zh-CN": "\u738B\u724C\u8FC7\u8F7D\u5957\u4EF6", ja: "\u30A8\u30FC\u30B9\u904E\u8CA0\u8377\u30AD\u30C3\u30C8", fr: "Kit d'as surcharg\xE9" },
  "pirate-boss-warlord": { "zh-CN": "\u519B\u9600\u653B\u57CE\u5957\u4EF6", ja: "\u8ECD\u95A5\u653B\u57CE\u30AD\u30C3\u30C8", fr: "Kit de si\xE8ge du seigneur" },
  "directorate-patrol": { "zh-CN": "\u7406\u4E8B\u4F1A\u7CBE\u786E\u5957\u4EF6", ja: "\u7406\u4E8B\u4F1A\u7CBE\u5BC6\u30AD\u30C3\u30C8", fr: "Kit de pr\xE9cision du Directorat" },
  "directorate-support": { "zh-CN": "\u7406\u4E8B\u4F1A\u652F\u63F4\u5957\u4EF6", ja: "\u7406\u4E8B\u4F1A\u652F\u63F4\u30AD\u30C3\u30C8", fr: "Kit de soutien du Directorat" },
  "directorate-courier": { "zh-CN": "\u7406\u4E8B\u4F1A\u4FE1\u4F7F\u5957\u4EF6", ja: "\u7406\u4E8B\u4F1A\u9023\u7D61\u30AD\u30C3\u30C8", fr: "Kit courrier du Directorat" },
  "union-hauler": { "zh-CN": "\u8054\u76DF\u8FD0\u8F93\u5957\u4EF6", ja: "\u540C\u76DF\u8F38\u9001\u30AD\u30C3\u30C8", fr: "Kit transport de l'Union" },
  "union-freighter": { "zh-CN": "\u8054\u76DF\u91CD\u8D27\u9632\u5FA1\u5957\u4EF6", ja: "\u540C\u76DF\u91CD\u8CA8\u7269\u9632\u5FA1\u30AD\u30C3\u30C8", fr: "Kit d\xE9fense cargo de l'Union" },
  "union-miner": { "zh-CN": "\u8054\u76DF\u5207\u5272\u5957\u4EF6", ja: "\u540C\u76DF\u30AB\u30C3\u30BF\u30FC\u30AD\u30C3\u30C8", fr: "Kit d\xE9coupeur de l'Union" },
  "vossari-smuggler": { "zh-CN": "\u6C83\u8428\u91CC\u7206\u53D1\u5957\u4EF6", ja: "\u30F4\u30A9\u30C3\u30B5\u30EA\u77AC\u767A\u30AD\u30C3\u30C8", fr: "Kit rafale vossari" },
  "mirr-defender": { "zh-CN": "\u7C73\u5C14\u6676\u683C\u5957\u4EF6", ja: "\u30DF\u30EB\u683C\u5B50\u30AD\u30C3\u30C8", fr: "Kit treillis Mirr" },
  "unknown-drone": { "zh-CN": "\u73BB\u7483\u730E\u624B\u9635\u5217", ja: "\u30B0\u30E9\u30B9\u30CF\u30F3\u30BF\u30FC\u30A2\u30EC\u30A4", fr: "R\xE9seau chasseur de verre" },
  "unknown-relay": { "zh-CN": "\u4E2D\u7EE7\u957F\u67AA\u9635\u5217", ja: "\u4E2D\u7D99\u30E9\u30F3\u30B9\u30A2\u30EC\u30A4", fr: "R\xE9seau lance-relais" }
};
var displayNameAliases = {
  "Basic Food": commodityNames["basic-food"],
  "Drinking Water": commodityNames["drinking-water"],
  Electronics: commodityNames.electronics,
  "Medical Supplies": commodityNames["medical-supplies"],
  "Luxury Goods": commodityNames["luxury-goods"],
  Nanofibers: commodityNames.nanofibers,
  "Energy Cells": commodityNames["energy-cells"],
  "Mechanical Parts": commodityNames["mechanical-parts"],
  Microchips: commodityNames.microchips,
  Plastics: commodityNames.plastics,
  Chemicals: commodityNames.chemicals,
  "Rare Plants": commodityNames["rare-plants"],
  "Rare Animals": commodityNames["rare-animals"],
  "Radioactive Materials": commodityNames["radioactive-materials"],
  "Noble Gas": commodityNames["noble-gas"],
  "Ship Components": commodityNames["ship-components"],
  Optics: commodityNames.optics,
  Hydraulics: commodityNames.hydraulics,
  "Data Cores": commodityNames["data-cores"],
  "Illegal Contraband": commodityNames["illegal-contraband"],
  Iron: commodityNames.iron,
  Titanium: commodityNames.titanium,
  Cesogen: commodityNames.cesogen,
  Gold: commodityNames.gold,
  Voidglass: commodityNames.voidglass,
  "Pulse Laser": equipmentNames["pulse-laser"],
  "Plasma Cannon": equipmentNames["plasma-cannon"],
  Railgun: equipmentNames.railgun,
  "Homing Missile": equipmentNames["homing-missile"],
  "Torpedo Rack": equipmentNames["torpedo-rack"],
  "Mining Beam": equipmentNames["mining-beam"],
  "Industrial Mining Beam": equipmentNames["industrial-mining-beam"],
  "Shield Booster": equipmentNames["shield-booster"],
  "Shield Matrix": equipmentNames["shield-matrix"],
  "Cargo Expansion": equipmentNames["cargo-expansion"],
  "Ore Processor": equipmentNames["ore-processor"],
  "Shielded Holds": equipmentNames["shielded-holds"],
  Afterburner: equipmentNames.afterburner,
  Scanner: equipmentNames.scanner,
  "Survey Array": equipmentNames["survey-array"],
  "Decoy Transponder": equipmentNames["decoy-transponder"],
  "Weapon Amplifier": equipmentNames["weapon-amplifier"],
  "Survey Lab": equipmentNames["survey-lab"],
  "Armor Plating": equipmentNames["armor-plating"],
  "Energy Reactor": equipmentNames["energy-reactor"],
  "Quantum Reactor": equipmentNames["quantum-reactor"],
  "Repair Drone": equipmentNames["repair-drone"],
  "Targeting Computer": equipmentNames["targeting-computer"],
  "Echo Nullifier": equipmentNames["echo-nullifier"],
  "Relic Cartographer": equipmentNames["relic-cartographer"],
  "Obsidian Bulwark": equipmentNames["obsidian-bulwark"],
  "Parallax Lance": equipmentNames["parallax-lance"],
  "Moth Choir Torpedo": equipmentNames["moth-choir-torpedo"],
  "Crownshade Singularity Core": equipmentNames["crownshade-singularity-core"],
  "Sparrow MK-I": shipNames["sparrow-mk1"],
  "Mule LX": shipNames["mule-lx"],
  "Prospector Rig": shipNames["prospector-rig"],
  "Veil Runner": shipNames["veil-runner"],
  "Talon-S": shipNames["talon-s"],
  "Wayfarer-X": shipNames["wayfarer-x"],
  "Raptor V": shipNames["raptor-v"],
  "Bastion-7": shipNames["bastion-7"],
  "Horizon Ark": shipNames["horizon-ark"],
  "Solar Directorate": factionNames["solar-directorate"],
  "Vossari Clans": factionNames["vossari-clans"],
  "Mirr Collective": factionNames["mirr-collective"],
  "Free Belt Union": factionNames["free-belt-union"],
  "Independent Pirates": factionNames["independent-pirates"],
  "Unknown Drones": factionNames["unknown-drones"],
  "Helion Reach": systemNames["helion-reach"],
  "Kuro Belt": systemNames["kuro-belt"],
  Vantara: systemNames.vantara,
  "Mirr Vale": systemNames["mirr-vale"],
  "Ashen Drift": systemNames["ashen-drift"],
  "Celest Gate": systemNames["celest-gate"],
  "PTD Home": systemNames["ptd-home"],
  "Helion Prime Exchange": stationNames["helion-prime"],
  "Aurora Ring": stationNames["aurora-ring"],
  "Cinder Yard": stationNames["cinder-yard"],
  "Meridian Dock": stationNames["meridian-dock"],
  "Kuro Deepworks": stationNames["kuro-deep"],
  "Lode Spindle": stationNames["lode-spindle"],
  "Niobe Gas Refinery": stationNames["niobe-refinery"],
  "Bracken Claim": stationNames["bracken-claim"],
  "Vantara Bastion": stationNames["vantara-bastion"],
  "Redoubt Arsenal": stationNames["redoubt-arsenal"],
  "Gryphon Carrier Dock": stationNames["gryphon-carrier"],
  "Sentry Listening Post": stationNames["sentry-listening-post"],
  "Mirr Lattice": stationNames["mirr-lattice"],
  "Optic Garden": stationNames["optic-garden"],
  "Hush Array": stationNames["hush-array"],
  "Viridian Lab": stationNames["viridian-lab"],
  "Parallax Hermitage": stationNames["parallax-hermitage"],
  "Obsidian Foundry": stationNames["obsidian-foundry"],
  "Ashen Freeport": stationNames["ashen-freeport"],
  "Black Arcade": stationNames["black-arcade"],
  "Emberfall Relay": stationNames["emberfall-relay"],
  "Graveyard Spindle": stationNames["graveyard-spindle"],
  "Voss Kel Market": stationNames["voss-kel-market"],
  "Moth Vault": stationNames["moth-vault"],
  "Celest Vault": stationNames["celest-vault"],
  "Aurelia Exchange": stationNames["aurelia-exchange"],
  "Opal Drydock": stationNames["opal-drydock"],
  "Zenith Skydock": stationNames["zenith-skydock"],
  "Pearl Consulate": stationNames["pearl-consulate"],
  "Crownshade Observatory": stationNames["crownshade-observatory"],
  "Trade Hub": stationArchetypeNames["Trade Hub"],
  "Mining Station": stationArchetypeNames["Mining Station"],
  "Research Station": stationArchetypeNames["Research Station"],
  "Military Outpost": stationArchetypeNames["Military Outpost"],
  "Frontier Port": stationArchetypeNames["Frontier Port"],
  "Pirate Black Market": stationArchetypeNames["Pirate Black Market"],
  "Law Patrol": combatAiProfileNames["law-patrol"],
  "Directorate precision kit": combatLoadoutNames["directorate-patrol"],
  "Directorate Patrol": { "zh-CN": "\u7406\u4E8B\u4F1A\u5DE1\u903B\u961F", ja: "\u7406\u4E8B\u4F1A\u30D1\u30C8\u30ED\u30FC\u30EB", fr: "Patrouille du Directorat" },
  "Ore Cutter": { "zh-CN": "\u77FF\u77F3\u5207\u5272\u8239", ja: "\u9271\u77F3\u30AB\u30C3\u30BF\u30FC", fr: "D\xE9coupeur de minerai" }
};
function getLocaleOption(locale) {
  return localeOptions.find((option) => option.value === locale) ?? localeOptions[0];
}
function speechLangForLocale(locale) {
  return getLocaleOption(locale).speechLang;
}

// src/systems/voice.ts
var defaultVoiceSettings = {
  masterVolume: 0.8,
  sfxVolume: 0.75,
  musicVolume: 0.35,
  voiceVolume: 0.85,
  muted: false
};
var VOICE_VOLUME_BOOST = 1.35;
var DEFAULT_VOICE_PROFILE_ID = "helion-handler";
var englishCaptain = "en-US-ChristopherNeural";
var englishShipAi = "en-US-AriaNeural";
var englishHelion = "en-US-JennyNeural";
var englishMirr = "en-US-MichelleNeural";
var englishKuro = "en-US-EricNeural";
var englishVantara = "en-US-GuyNeural";
var englishAshen = "en-US-BrianNeural";
var englishCelest = "en-US-EmmaNeural";
var englishUnion = "en-US-AndrewNeural";
var voiceProfiles = {
  captain: {
    tts: {
      voiceByLocale: {
        en: englishCaptain,
        "zh-CN": "zh-CN-YunxiNeural",
        "zh-TW": "zh-CN-YunxiNeural",
        ja: "ja-JP-KeitaNeural",
        fr: "fr-FR-HenriNeural"
      },
      pitchPct: 0,
      ratePct: 0
    },
    fx: "comms-warm",
    fallback: "firm"
  },
  "ship-ai": {
    tts: {
      voiceByLocale: {
        en: englishShipAi,
        "zh-CN": "zh-CN-XiaoxiaoNeural",
        "zh-TW": "zh-CN-XiaoxiaoNeural",
        ja: "ja-JP-NanamiNeural",
        fr: "fr-FR-EloiseNeural"
      },
      pitchPct: -12,
      ratePct: -8
    },
    fx: "ai-ghost",
    fallback: "synthetic"
  },
  "helion-handler": {
    tts: {
      voiceByLocale: {
        en: englishHelion,
        "zh-CN": "zh-CN-XiaoyiNeural",
        "zh-TW": "zh-CN-XiaoyiNeural",
        ja: "ja-JP-NanamiNeural",
        fr: "fr-FR-DeniseNeural"
      },
      pitchPct: 4,
      ratePct: 2
    },
    fx: "comms-radio",
    fallback: "firm"
  },
  "mirr-analyst": {
    tts: {
      voiceByLocale: {
        en: englishMirr,
        "zh-CN": "zh-CN-XiaoxiaoNeural",
        "zh-TW": "zh-CN-XiaoxiaoNeural",
        ja: "ja-JP-NanamiNeural",
        fr: "fr-FR-VivienneMultilingualNeural"
      },
      pitchPct: -3,
      ratePct: -6
    },
    fx: "comms-calm",
    fallback: "calm"
  },
  "kuro-foreman": {
    tts: {
      voiceByLocale: {
        en: englishKuro,
        "zh-CN": "zh-CN-YunyangNeural",
        "zh-TW": "zh-CN-YunyangNeural",
        ja: "ja-JP-KeitaNeural",
        fr: "fr-FR-RemyMultilingualNeural"
      },
      pitchPct: -10,
      ratePct: -4
    },
    fx: "comms-gritty",
    fallback: "rough"
  },
  "vantara-officer": {
    tts: {
      voiceByLocale: {
        en: englishVantara,
        "zh-CN": "zh-CN-YunjianNeural",
        "zh-TW": "zh-CN-YunjianNeural",
        ja: "ja-JP-KeitaNeural",
        fr: "fr-FR-HenriNeural"
      },
      pitchPct: -2,
      ratePct: -2
    },
    fx: "comms-mil",
    fallback: "firm"
  },
  "ashen-broker": {
    tts: {
      voiceByLocale: {
        en: englishAshen,
        "zh-CN": "zh-CN-YunxiaNeural",
        "zh-TW": "zh-CN-YunxiaNeural",
        ja: "ja-JP-KeitaNeural",
        fr: "fr-FR-RemyMultilingualNeural"
      },
      pitchPct: -6,
      ratePct: -3
    },
    fx: "comms-shadow",
    fallback: "rough"
  },
  "celest-archivist": {
    tts: {
      voiceByLocale: {
        en: englishCelest,
        "zh-CN": "zh-CN-XiaoyiNeural",
        "zh-TW": "zh-CN-XiaoyiNeural",
        ja: "ja-JP-NanamiNeural",
        fr: "fr-FR-EloiseNeural"
      },
      pitchPct: 6,
      ratePct: 2
    },
    fx: "comms-bright",
    fallback: "bright"
  },
  "union-witness": {
    tts: {
      voiceByLocale: {
        en: englishUnion,
        "zh-CN": "zh-CN-YunxiNeural",
        "zh-TW": "zh-CN-YunxiNeural",
        ja: "ja-JP-KeitaNeural",
        fr: "fr-FR-HenriNeural"
      },
      pitchPct: -7,
      ratePct: -3
    },
    fx: "comms-folk",
    fallback: "rough"
  }
};
function voiceClipKey(profileId, locale, normalizedText) {
  const input = `${profileId}|${locale}|${normalizedText}`;
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= BigInt(input.charCodeAt(i));
    hash = hash * prime & mask;
  }
  return hash.toString(16).padStart(16, "0");
}
function prepareCommsSpeechText(text) {
  return text.replace(/\s+/g, " ").trim();
}
function effectiveVolume(settings) {
  return settings.muted ? 0 : Math.max(0, Math.min(1, settings.masterVolume * settings.voiceVolume * VOICE_VOLUME_BOOST));
}
function hasSpeechApi() {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}
function hasAudioContextApi() {
  if (typeof window === "undefined") return false;
  return typeof window.AudioContext !== "undefined" || typeof window.webkitAudioContext !== "undefined";
}
function searchableVoiceName(voice) {
  return `${voice.name} ${voice.voiceURI}`.toLowerCase();
}
function isNoveltyVoice(voice) {
  const searchable = searchableVoiceName(voice);
  return /\b(siri|novelty|whisper|trinoids|zarvox|bells|boing|bubbles|cellos|deranged|hysterical|bad news|good news)\b/.test(searchable);
}
function firstStandardVoice(voices) {
  return voices.find((voice) => !isNoveltyVoice(voice)) ?? null;
}
function selectFallbackVoice(locale) {
  const langPrefix = speechLangForLocale(locale).split("-")[0].toLowerCase();
  const voices = window.speechSynthesis.getVoices();
  const localeVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith(langPrefix));
  const englishVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
  return firstStandardVoice(localeVoices) ?? firstStandardVoice(englishVoices) ?? null;
}
function fallbackVoiceParams(hint) {
  if (hint === "calm") return { pitch: 0.95, rate: 0.92 };
  if (hint === "rough") return { pitch: 0.82, rate: 0.94 };
  if (hint === "bright") return { pitch: 1.08, rate: 0.98 };
  if (hint === "synthetic") return { pitch: 0.7, rate: 0.86 };
  return { pitch: 1, rate: 0.96 };
}
function buildImpulseResponse(ctx, durationSec, decay, metallic) {
  const sampleRate = ctx.sampleRate || 44100;
  const length = Math.max(1, Math.floor(sampleRate * durationSec));
  const buffer = ctx.createBuffer(2, length, sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      const t = i / length;
      const envelope = Math.pow(1 - t, decay);
      const noise = Math.random() * 2 - 1;
      const tone = metallic ? Math.sin(2 * Math.PI * (220 + channel * 13) * (i / sampleRate)) * 0.18 : 0;
      data[i] = (noise * 0.9 + tone) * envelope;
    }
  }
  return buffer;
}
function makeDistortionCurve(amount) {
  const samples = 1024;
  const curve = new Float32Array(samples);
  const k = amount;
  for (let i = 0; i < samples; i += 1) {
    const x = i * 2 / samples - 1;
    curve[i] = (1 + k) * x / (1 + k * Math.abs(x));
  }
  return curve;
}
function createFxNode(ctx, preset) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const starts = [];
  if (preset === "ai-ghost") {
    const highpass2 = ctx.createBiquadFilter();
    highpass2.type = "highpass";
    highpass2.frequency.value = 220;
    const lowpass2 = ctx.createBiquadFilter();
    lowpass2.type = "lowpass";
    lowpass2.frequency.value = 4200;
    const ringGain = ctx.createGain();
    ringGain.gain.value = 0;
    const modulator = ctx.createOscillator();
    modulator.type = "sine";
    modulator.frequency.value = 92;
    const modulatorAmp = ctx.createGain();
    modulatorAmp.gain.value = 0.85;
    modulator.connect(modulatorAmp);
    modulatorAmp.connect(ringGain.gain);
    const shaper2 = ctx.createWaveShaper();
    shaper2.curve = makeDistortionCurve(2.4);
    const chorusDelayA = ctx.createDelay(0.05);
    chorusDelayA.delayTime.value = 0.018;
    const chorusDelayB = ctx.createDelay(0.05);
    chorusDelayB.delayTime.value = 0.032;
    const chorusGainA = ctx.createGain();
    chorusGainA.gain.value = 0.32;
    const chorusGainB = ctx.createGain();
    chorusGainB.gain.value = 0.24;
    const chorusBus = ctx.createGain();
    chorusBus.gain.value = 1;
    const dryGain = ctx.createGain();
    dryGain.gain.value = 0.18;
    const wetGain = ctx.createGain();
    wetGain.gain.value = 0.95;
    const reverb2 = ctx.createConvolver();
    reverb2.buffer = buildImpulseResponse(ctx, 0.55, 2.4, true);
    const reverbMix2 = ctx.createGain();
    reverbMix2.gain.value = 0.45;
    input.connect(highpass2);
    highpass2.connect(lowpass2);
    lowpass2.connect(ringGain);
    ringGain.connect(shaper2);
    shaper2.connect(chorusBus);
    chorusBus.connect(chorusDelayA);
    chorusBus.connect(chorusDelayB);
    chorusDelayA.connect(chorusGainA);
    chorusDelayB.connect(chorusGainB);
    chorusGainA.connect(wetGain);
    chorusGainB.connect(wetGain);
    chorusBus.connect(wetGain);
    wetGain.connect(reverb2);
    reverb2.connect(reverbMix2);
    reverbMix2.connect(output);
    wetGain.connect(output);
    input.connect(dryGain);
    dryGain.connect(output);
    starts.push({ start: () => modulator.start(), stop: () => modulator.stop() });
    return { input, output, starts };
  }
  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  const peaking = ctx.createBiquadFilter();
  peaking.type = "peaking";
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  const shaper = ctx.createWaveShaper();
  const reverb = ctx.createConvolver();
  const reverbMix = ctx.createGain();
  const dryMix = ctx.createGain();
  dryMix.gain.value = 1;
  let shaperEnabled = false;
  let tremoloOsc;
  let tremoloGain;
  switch (preset) {
    case "comms-warm":
      highpass.frequency.value = 110;
      peaking.frequency.value = 2400;
      peaking.gain.value = 2.5;
      peaking.Q.value = 0.9;
      lowpass.frequency.value = 7800;
      reverb.buffer = buildImpulseResponse(ctx, 0.32, 2.6, false);
      reverbMix.gain.value = 0.16;
      break;
    case "comms-radio":
      highpass.frequency.value = 220;
      peaking.frequency.value = 1800;
      peaking.gain.value = 4.5;
      peaking.Q.value = 1.2;
      lowpass.frequency.value = 3600;
      shaper.curve = makeDistortionCurve(0.8);
      shaperEnabled = true;
      reverb.buffer = buildImpulseResponse(ctx, 0.22, 2.1, true);
      reverbMix.gain.value = 0.22;
      break;
    case "comms-calm":
      highpass.frequency.value = 95;
      peaking.frequency.value = 1500;
      peaking.gain.value = 1.6;
      peaking.Q.value = 0.7;
      lowpass.frequency.value = 6800;
      reverb.buffer = buildImpulseResponse(ctx, 0.45, 2.8, false);
      reverbMix.gain.value = 0.2;
      break;
    case "comms-gritty":
      highpass.frequency.value = 90;
      peaking.frequency.value = 1700;
      peaking.gain.value = 3.2;
      peaking.Q.value = 1.1;
      lowpass.frequency.value = 5200;
      shaper.curve = makeDistortionCurve(1.6);
      shaperEnabled = true;
      reverb.buffer = buildImpulseResponse(ctx, 0.28, 2.2, false);
      reverbMix.gain.value = 0.18;
      break;
    case "comms-mil":
      highpass.frequency.value = 200;
      peaking.frequency.value = 2200;
      peaking.gain.value = 3.6;
      peaking.Q.value = 1.4;
      lowpass.frequency.value = 4500;
      shaper.curve = makeDistortionCurve(0.6);
      shaperEnabled = true;
      reverb.buffer = buildImpulseResponse(ctx, 0.18, 2, true);
      reverbMix.gain.value = 0.24;
      break;
    case "comms-shadow":
      highpass.frequency.value = 130;
      peaking.frequency.value = 900;
      peaking.gain.value = 2.4;
      peaking.Q.value = 0.9;
      lowpass.frequency.value = 5400;
      reverb.buffer = buildImpulseResponse(ctx, 0.55, 3, false);
      reverbMix.gain.value = 0.3;
      tremoloOsc = ctx.createOscillator();
      tremoloOsc.type = "sine";
      tremoloOsc.frequency.value = 5.2;
      tremoloGain = ctx.createGain();
      tremoloGain.gain.value = 0.18;
      break;
    case "comms-bright":
      highpass.frequency.value = 140;
      peaking.frequency.value = 3600;
      peaking.gain.value = 3.4;
      peaking.Q.value = 1.1;
      lowpass.frequency.value = 8500;
      reverb.buffer = buildImpulseResponse(ctx, 0.4, 2.4, true);
      reverbMix.gain.value = 0.2;
      break;
    case "comms-folk":
    default:
      highpass.frequency.value = 100;
      peaking.frequency.value = 1300;
      peaking.gain.value = 2.2;
      peaking.Q.value = 0.8;
      lowpass.frequency.value = 5200;
      reverb.buffer = buildImpulseResponse(ctx, 0.34, 2.7, false);
      reverbMix.gain.value = 0.15;
      break;
  }
  input.connect(highpass);
  highpass.connect(peaking);
  peaking.connect(lowpass);
  if (shaperEnabled) {
    lowpass.connect(shaper);
    shaper.connect(dryMix);
  } else {
    lowpass.connect(dryMix);
  }
  if (tremoloOsc && tremoloGain) {
    const tremolo = ctx.createGain();
    tremolo.gain.value = 1;
    tremoloOsc.connect(tremoloGain);
    tremoloGain.connect(tremolo.gain);
    dryMix.connect(tremolo);
    tremolo.connect(output);
    tremolo.connect(reverb);
    starts.push({ start: () => tremoloOsc.start(), stop: () => tremoloOsc.stop() });
  } else {
    dryMix.connect(output);
    dryMix.connect(reverb);
  }
  reverb.connect(reverbMix);
  reverbMix.connect(output);
  return { input, output, starts };
}
var BrowserVoiceSystem = class {
  settings = defaultVoiceSettings;
  clipManifest = {};
  context;
  voiceGain;
  sourceCache = /* @__PURE__ */ new WeakMap();
  active;
  get debugState() {
    const synthesis = hasSpeechApi() ? window.speechSynthesis : void 0;
    let speaking = false;
    let paused = false;
    if (this.active?.kind === "audio") {
      speaking = !this.active.audio.paused;
      paused = this.active.audio.paused;
    } else if (this.active?.kind === "speech") {
      speaking = synthesis?.speaking ?? false;
      paused = synthesis?.paused ?? false;
    } else if (synthesis) {
      speaking = synthesis.speaking;
      paused = synthesis.paused;
    }
    return {
      supported: hasSpeechApi() || hasAudioContextApi(),
      audioReady: !!this.context,
      speaking,
      paused,
      muted: this.settings.muted,
      voiceVolume: this.settings.voiceVolume,
      clipCount: Object.keys(this.clipManifest).length
    };
  }
  setVoiceClipManifest(manifest) {
    this.clipManifest = manifest ? { ...manifest } : {};
  }
  applySettings(settings) {
    this.settings = settings;
    if (settings.muted) {
      this.cancel();
      return;
    }
    const volume = effectiveVolume(settings);
    if (this.voiceGain && this.context) {
      this.voiceGain.gain.setTargetAtTime(volume, this.context.currentTime, 0.04);
    }
    if (this.active?.kind === "speech") {
      this.active.utterance.volume = volume;
    } else if (this.active?.kind === "audio") {
      this.active.audio.volume = volume;
    }
  }
  speak(text, profileId = DEFAULT_VOICE_PROFILE_ID, options = {}) {
    const profile = voiceProfiles[profileId] ?? voiceProfiles[DEFAULT_VOICE_PROFILE_ID];
    const locale = options.locale ?? DEFAULT_LOCALE;
    const normalized = prepareCommsSpeechText(text);
    if (!normalized || this.settings.muted || effectiveVolume(this.settings) <= 0) return false;
    this.cancel();
    const key = voiceClipKey(profileId, locale, normalized);
    const url = this.clipManifest[key];
    const fallback = () => {
      this.playSpeechFallback(normalized, profile, locale, options);
    };
    if (url && this.tryPlayAudioClip(url, profile.fx, options, fallback)) return true;
    return this.playSpeechFallback(normalized, profile, locale, options);
  }
  pauseOrResume() {
    if (this.active?.kind === "audio") {
      const audio = this.active.audio;
      if (audio.paused) {
        const playback = audio.play();
        if (playback && typeof playback.then === "function") void playback.catch(() => void 0);
        return "speaking";
      }
      audio.pause();
      return "paused";
    }
    if (!hasSpeechApi()) return "idle";
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      return "speaking";
    }
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      return "paused";
    }
    return "idle";
  }
  cancel() {
    const previous = this.active;
    this.active = void 0;
    if (previous?.kind === "audio") {
      try {
        previous.audio.pause();
      } catch {
      }
      try {
        previous.audio.currentTime = 0;
      } catch {
      }
      previous.fx?.starts.forEach((entry) => {
        try {
          entry.stop();
        } catch {
        }
      });
      try {
        previous.source?.disconnect();
      } catch {
      }
      try {
        previous.fx?.output.disconnect();
      } catch {
      }
    }
    if (hasSpeechApi()) {
      window.speechSynthesis.cancel();
    }
  }
  ensureContext() {
    if (this.context) return this.context;
    if (typeof window === "undefined") return void 0;
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextClass) return void 0;
    const ctx = new AudioContextClass();
    const voiceGain = ctx.createGain();
    voiceGain.gain.value = effectiveVolume(this.settings);
    voiceGain.connect(ctx.destination);
    this.context = ctx;
    this.voiceGain = voiceGain;
    return ctx;
  }
  tryPlayAudioClip(url, fxPreset, options, onFailure) {
    if (typeof Audio === "undefined") return false;
    const ctx = this.ensureContext();
    if (!ctx || !this.voiceGain) return false;
    let audio;
    try {
      audio = new Audio(url);
    } catch {
      return false;
    }
    audio.preload = "auto";
    audio.volume = 1;
    let source;
    try {
      source = this.sourceCache.get(audio);
      if (!source) {
        source = ctx.createMediaElementSource(audio);
        this.sourceCache.set(audio, source);
      }
    } catch {
      return false;
    }
    let fx;
    try {
      fx = createFxNode(ctx, fxPreset);
    } catch {
      try {
        source.connect(this.voiceGain);
      } catch {
        return false;
      }
      this.attachPlayback({ kind: "audio", audio, source, onEnd: options.onEnd, onFailure });
      return this.startAudioPlayback();
    }
    try {
      source.connect(fx.input);
      fx.output.connect(this.voiceGain);
    } catch {
      return false;
    }
    fx.starts.forEach((entry) => {
      try {
        entry.start();
      } catch {
      }
    });
    this.attachPlayback({ kind: "audio", audio, source, fx, onEnd: options.onEnd, onFailure });
    return this.startAudioPlayback();
  }
  startAudioPlayback() {
    if (this.active?.kind !== "audio") return false;
    const playback = this.active.audio.play();
    if (playback && typeof playback.then === "function") {
      void playback.catch(() => this.handleAudioFailure());
    }
    return true;
  }
  handleAudioFailure() {
    if (this.active?.kind !== "audio") return;
    const previous = this.active;
    this.active = void 0;
    try {
      previous.source?.disconnect();
    } catch {
    }
    try {
      previous.fx?.output.disconnect();
    } catch {
    }
    previous.onFailure?.();
  }
  attachPlayback(playback) {
    this.active = playback;
    if (playback.kind === "audio") {
      const audio = playback.audio;
      audio.onended = () => {
        if (this.active !== playback) return;
        this.active = void 0;
        playback.onEnd?.();
      };
      audio.onerror = () => {
        if (this.active !== playback) return;
        this.handleAudioFailure();
      };
    } else {
      const utterance = playback.utterance;
      utterance.onend = () => {
        if (this.active !== playback) return;
        this.active = void 0;
        playback.onEnd?.();
      };
      utterance.onerror = () => {
        if (this.active === playback) this.active = void 0;
      };
    }
  }
  playSpeechFallback(normalized, profile, locale, options) {
    const volume = effectiveVolume(this.settings);
    if (!hasSpeechApi() || volume <= 0) return false;
    const utterance = new SpeechSynthesisUtterance(normalized);
    const params = fallbackVoiceParams(profile.fallback);
    utterance.lang = speechLangForLocale(locale);
    utterance.pitch = params.pitch;
    utterance.rate = params.rate;
    utterance.volume = volume;
    utterance.voice = selectFallbackVoice(locale);
    this.attachPlayback({ kind: "speech", utterance, onEnd: options.onEnd });
    window.speechSynthesis.speak(utterance);
    return true;
  }
};
var voiceSystem = new BrowserVoiceSystem();
export {
  dialogueScenes,
  dialogueSpeakers,
  prepareCommsSpeechText,
  voiceClipKey,
  voiceProfiles
};
