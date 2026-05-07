import type { FactionId } from "../types/game";
import { explorationSignals } from "./exploration";
import { glassWakeProtocol } from "./story";

export type DialogueSceneGroup = "story" | "exploration";
export type DialogueTrigger =
  | { kind: "story-accept"; missionId: string; chapterId: string }
  | { kind: "story-complete"; missionId: string; chapterId: string }
  | { kind: "exploration-complete"; signalId: string };

export interface DialogueSpeakerDefinition {
  id: string;
  name: string;
  role: string;
  kind: "npc" | "player" | "ai";
  factionId?: FactionId;
  color: string;
  voiceHint: "calm" | "firm" | "rough" | "bright" | "synthetic";
}

export interface DialogueLineDefinition {
  speakerId: string;
  text: string;
}

export interface DialogueSceneDefinition {
  id: string;
  group: DialogueSceneGroup;
  title: string;
  maskedTitle: string;
  trigger: DialogueTrigger;
  lines: DialogueLineDefinition[];
}

export const dialogueSpeakers: DialogueSpeakerDefinition[] = [
  { id: "captain", name: "Captain", role: "Player ship", kind: "player", color: "#80d6ff", voiceHint: "firm" },
  { id: "ship-ai", name: "Ship AI", role: "Navigation core", kind: "ai", color: "#9bffe8", voiceHint: "synthetic" },
  { id: "helion-handler", name: "Rhea Vale", role: "Helion traffic handler", kind: "npc", factionId: "solar-directorate", color: "#f8c15d", voiceHint: "firm" },
  { id: "mirr-analyst", name: "Sera Voss", role: "Mirr signal analyst", kind: "npc", factionId: "mirr-collective", color: "#bda7ff", voiceHint: "calm" },
  { id: "kuro-foreman", name: "Mako Dren", role: "Kuro belt foreman", kind: "npc", factionId: "free-belt-union", color: "#f0a45b", voiceHint: "rough" },
  { id: "vantara-officer", name: "Cmdr. Hale", role: "Directorate spectrum officer", kind: "npc", factionId: "solar-directorate", color: "#7bc8ff", voiceHint: "firm" },
  { id: "ashen-broker", name: "Nyx Calder", role: "Ashen information broker", kind: "npc", factionId: "vossari-clans", color: "#ff8a6a", voiceHint: "rough" },
  { id: "celest-archivist", name: "Ione Sel", role: "Celest archive keeper", kind: "npc", factionId: "solar-directorate", color: "#fff0a8", voiceHint: "bright" },
  { id: "union-witness", name: "Talla Rook", role: "Union witness", kind: "npc", factionId: "free-belt-union", color: "#ffd166", voiceHint: "rough" }
];

const storyScenes: DialogueSceneDefinition[] = [
  {
    id: "dialogue-story-clean-carrier-accept",
    group: "story",
    title: "Clean Carrier Briefing",
    maskedTitle: "Signal Masked",
    trigger: { kind: "story-accept", missionId: "story-clean-carrier", chapterId: "glass-wake-01" },
    lines: [
      { speakerId: "helion-handler", text: "Captain, Helion traffic is handing you a clean sync key. It has never touched a pirate repeater, a private courier, or a Mirr filter." },
      { speakerId: "captain", text: "That is a lot of purity for one missing probe." },
      { speakerId: "helion-handler", text: "Purity is the point. Mirr needs an honest mirror before they accuse the lane itself of lying." },
      { speakerId: "ship-ai", text: "Advisory: a weak ghost ping is nested in the launch queue. It is not attached to Helion tower." },
      { speakerId: "helion-handler", text: "Then keep your receiver open and your mouth shut until Sera sees the key." }
    ]
  },
  {
    id: "dialogue-story-clean-carrier-complete",
    group: "story",
    title: "Clean Carrier Debrief",
    maskedTitle: "Signal Masked",
    trigger: { kind: "story-complete", missionId: "story-clean-carrier", chapterId: "glass-wake-01" },
    lines: [
      { speakerId: "mirr-analyst", text: "The Helion key is clean. That is the uncomfortable part." },
      { speakerId: "captain", text: "The probe did not chase a bad signal." },
      { speakerId: "mirr-analyst", text: "No. It answered a beacon shaped exactly like lawful trade traffic, but the registry has no birth record for it." },
      { speakerId: "ship-ai", text: "Ghost ping confirmed. Wake residue persists behind the legal interval." },
      { speakerId: "mirr-analyst", text: "We are naming the carrier Glass Wake until we know what woke it." }
    ]
  },
  {
    id: "dialogue-story-probe-in-glass-accept",
    group: "story",
    title: "Probe in the Glass Briefing",
    maskedTitle: "Signal Masked",
    trigger: { kind: "story-accept", missionId: "story-probe-in-glass", chapterId: "glass-wake-02" },
    lines: [
      { speakerId: "mirr-analyst", text: "The probe core is still drifting in the Vale. Its carrier logs are decaying, and the debris field has started answering hails in your voiceprint." },
      { speakerId: "captain", text: "That is new." },
      { speakerId: "ship-ai", text: "Recovery vector includes an unregistered machine silhouette near the wreck." },
      { speakerId: "mirr-analyst", text: "We call it Glass Echo. If it repeats your ship name, do not answer. Destroy it and bring back the core." }
    ]
  },
  {
    id: "dialogue-story-probe-in-glass-complete",
    group: "story",
    title: "Probe in the Glass Debrief",
    maskedTitle: "Signal Masked",
    trigger: { kind: "story-complete", missionId: "story-probe-in-glass", chapterId: "glass-wake-02" },
    lines: [
      { speakerId: "ship-ai", text: "Glass Echo destroyed. Recovered core contains a wake pattern behind legal traffic intervals." },
      { speakerId: "captain", text: "It knew my ship before I touched the wreck." },
      { speakerId: "mirr-analyst", text: "That means it is not a trap waiting for any ship. It is choosing who trusts the lane." },
      { speakerId: "captain", text: "Can we separate the carrier from the noise?" },
      { speakerId: "mirr-analyst", text: "Not with station filters. Kuro voidglass can split frequencies that software cannot." }
    ]
  },
  {
    id: "dialogue-story-kuro-resonance-accept",
    group: "story",
    title: "Kuro Resonance Briefing",
    maskedTitle: "Signal Masked",
    trigger: { kind: "story-accept", missionId: "story-kuro-resonance", chapterId: "glass-wake-03" },
    lines: [
      { speakerId: "kuro-foreman", text: "You want voidglass, you fly slow and mine clean. The belt hates rushed hands." },
      { speakerId: "captain", text: "This sample may tell us who is hiding inside the beacons." },
      { speakerId: "kuro-foreman", text: "Then bring enough. One shard sings. Three shards testify." },
      { speakerId: "ship-ai", text: "Warning: a Listener Drone is counting local drill pulses." },
      { speakerId: "kuro-foreman", text: "I lost two cutters to that counting. If it blinks red, burn it before it teaches the rocks to lie." }
    ]
  },
  {
    id: "dialogue-story-kuro-resonance-complete",
    group: "story",
    title: "Kuro Resonance Debrief",
    maskedTitle: "Signal Masked",
    trigger: { kind: "story-complete", missionId: "story-kuro-resonance", chapterId: "glass-wake-03" },
    lines: [
      { speakerId: "kuro-foreman", text: "The Listener is scrap, and the voidglass split your ghost signal like a vein under pressure." },
      { speakerId: "captain", text: "Not pirate, not Mirr, not Directorate." },
      { speakerId: "ship-ai", text: "Pattern match suggests machine-origin timing. Confidence rising." },
      { speakerId: "kuro-foreman", text: "Then stop calling it a ghost. Ghosts haunt. Machines wait." }
    ]
  },
  {
    id: "dialogue-story-bastion-calibration-accept",
    group: "story",
    title: "Bastion Calibration Briefing",
    maskedTitle: "Signal Masked",
    trigger: { kind: "story-accept", missionId: "story-bastion-calibration", chapterId: "glass-wake-04" },
    lines: [
      { speakerId: "vantara-officer", text: "Directorate command will provide Calibration Tender C-9. It carries a handshake we do not share with civilians." },
      { speakerId: "captain", text: "If the wake answers that, your secure lane is already compromised." },
      { speakerId: "vantara-officer", text: "Correct. Command hates that sentence, so they require it in triplicate." },
      { speakerId: "ship-ai", text: "Two Handshake Mimic drones are expected to shadow the burn." },
      { speakerId: "vantara-officer", text: "Keep the tender alive long enough to record the forgery." }
    ]
  },
  {
    id: "dialogue-story-bastion-calibration-complete",
    group: "story",
    title: "Bastion Calibration Debrief",
    maskedTitle: "Signal Masked",
    trigger: { kind: "story-complete", missionId: "story-bastion-calibration", chapterId: "glass-wake-04" },
    lines: [
      { speakerId: "vantara-officer", text: "Calibration confirmed. The mimics answered with Directorate authentication before they fired." },
      { speakerId: "captain", text: "Then every patrol lane is a possible lure." },
      { speakerId: "vantara-officer", text: "And every officer who called this a research accident just lost the luxury." },
      { speakerId: "ship-ai", text: "Forged handshake packets include a black-market rebroadcast trail toward Ashen Drift." },
      { speakerId: "vantara-officer", text: "Ashen Freeport is selling something they should not possess." }
    ]
  },
  {
    id: "dialogue-story-ashen-decoy-manifest-accept",
    group: "story",
    title: "Ashen Decoy Manifest Briefing",
    maskedTitle: "Signal Masked",
    trigger: { kind: "story-accept", missionId: "story-ashen-decoy-manifest", chapterId: "glass-wake-05" },
    lines: [
      { speakerId: "ashen-broker", text: "Relief cargo makes a beautiful lie. Pirates open doors for pity and profit." },
      { speakerId: "captain", text: "You want me to deliver bait to Ashen Freeport." },
      { speakerId: "ashen-broker", text: "I want you to deliver hope with a forged shadow. The first beacon to answer is either hungry or guilty." },
      { speakerId: "ship-ai", text: "Decoy manifest seeded. Expected false reply: Mercy-class relief priority." },
      { speakerId: "ashen-broker", text: "If the False Mercy Relay wakes up, break it before it sells your kindness back to you." }
    ]
  },
  {
    id: "dialogue-story-ashen-decoy-manifest-complete",
    group: "story",
    title: "Ashen Decoy Manifest Debrief",
    maskedTitle: "Signal Masked",
    trigger: { kind: "story-complete", missionId: "story-ashen-decoy-manifest", chapterId: "glass-wake-05" },
    lines: [
      { speakerId: "ashen-broker", text: "False Mercy is gone. The Knife Wing repeated the carrier, but they did not write it." },
      { speakerId: "captain", text: "They are a mirror, not the source." },
      { speakerId: "ashen-broker", text: "A mirror with a price tag. Their relay pilots are auctioning fragments of a song they cannot hear." },
      { speakerId: "ship-ai", text: "Three Knife Wing relay craft marked." },
      { speakerId: "ashen-broker", text: "Break the mirror before every black-market lane learns the tune." }
    ]
  },
  {
    id: "dialogue-story-knife-wing-relay-accept",
    group: "story",
    title: "Knife Wing Relay Briefing",
    maskedTitle: "Signal Masked",
    trigger: { kind: "story-accept", missionId: "story-knife-wing-relay", chapterId: "glass-wake-06" },
    lines: [
      { speakerId: "ashen-broker", text: "Three Knife Wing contacts are carrying relay keys: Red Relay, Black Relay, and the Broken Choir Ace." },
      { speakerId: "captain", text: "The names sound theatrical." },
      { speakerId: "ashen-broker", text: "That is how amateurs make themselves memorable before they die." },
      { speakerId: "ship-ai", text: "Combat routing marked. Story relay targets will sort above common pirate traffic." },
      { speakerId: "ashen-broker", text: "Kill the auction before the bidders learn what they are buying." }
    ]
  },
  {
    id: "dialogue-story-knife-wing-relay-complete",
    group: "story",
    title: "Knife Wing Relay Debrief",
    maskedTitle: "Signal Masked",
    trigger: { kind: "story-complete", missionId: "story-knife-wing-relay", chapterId: "glass-wake-06" },
    lines: [
      { speakerId: "ship-ai", text: "Knife Wing relay packets terminated. Broken Choir carried a final vector toward Celest Gate." },
      { speakerId: "captain", text: "Luxury traffic, clean arbitration, perfect cover." },
      { speakerId: "ashen-broker", text: "And perfect denial. Celest can call pirates a local problem unless witnesses force the word shared." },
      { speakerId: "union-witness", text: "I can bring miners, analysts, and one Directorate seal. None of them like each other." },
      { speakerId: "ashen-broker", text: "Good. Celest listens better when liability has names." }
    ]
  },
  {
    id: "dialogue-story-witnesses-to-celest-accept",
    group: "story",
    title: "Witnesses to Celest Briefing",
    maskedTitle: "Signal Masked",
    trigger: { kind: "story-accept", missionId: "story-witnesses-to-celest", chapterId: "glass-wake-07" },
    lines: [
      { speakerId: "union-witness", text: "I have miners, analysts, and a Directorate seal packed into one nervous delegation." },
      { speakerId: "captain", text: "They ride quiet, or they do not ride." },
      { speakerId: "union-witness", text: "They know. The Mirr analyst is scared, the officer is offended, and my miners want to punch both." },
      { speakerId: "ship-ai", text: "Celest approach includes a Witness Jammer broadcasting arbitration silence." },
      { speakerId: "union-witness", text: "Then make the silence loud. Get us to Celest Vault and the blockade vote becomes real." }
    ]
  },
  {
    id: "dialogue-story-witnesses-to-celest-complete",
    group: "story",
    title: "Witnesses to Celest Debrief",
    maskedTitle: "Signal Masked",
    trigger: { kind: "story-complete", missionId: "story-witnesses-to-celest", chapterId: "glass-wake-07" },
    lines: [
      { speakerId: "celest-archivist", text: "The testimony is sealed. Celest Vault recognizes a shared emergency." },
      { speakerId: "captain", text: "That sounded almost reluctant." },
      { speakerId: "celest-archivist", text: "Archives prefer certainty. Today we have fear, signatures, and enough liability to move a gate." },
      { speakerId: "mirr-analyst", text: "Open the path to the relay core." },
      { speakerId: "celest-archivist", text: "Path opened. If the crown goes quiet, the lanes may breathe again." }
    ]
  },
  {
    id: "dialogue-story-quiet-crown-relay-accept",
    group: "story",
    title: "Quiet Crown Relay Briefing",
    maskedTitle: "Signal Masked",
    trigger: { kind: "story-accept", missionId: "story-quiet-crown-relay", chapterId: "glass-wake-08" },
    lines: [
      { speakerId: "celest-archivist", text: "The Quiet Crown relay sits below premium traffic. It is quiet because it is listening." },
      { speakerId: "captain", text: "Recover the core, shut down the carrier, leave the gate standing." },
      { speakerId: "ship-ai", text: "Two Crown Warden drones and one relay core marked. Unknown machine timing remains active inside the carrier." },
      { speakerId: "mirr-analyst", text: "Do not just pull the core. Break the wardens first, or the relay may write your ship into its next lure." },
      { speakerId: "celest-archivist", text: "When you cut it, every lane will hear the absence." }
    ]
  },
  {
    id: "dialogue-story-quiet-crown-relay-complete",
    group: "story",
    title: "Quiet Crown Relay Debrief",
    maskedTitle: "Signal Masked",
    trigger: { kind: "story-complete", missionId: "story-quiet-crown-relay", chapterId: "glass-wake-08" },
    lines: [
      { speakerId: "ship-ai", text: "Glass Wake carrier removed from public lanes. Relay core retains one final listener trace." },
      { speakerId: "captain", text: "Unknown Drones." },
      { speakerId: "mirr-analyst", text: "They were not shouting through the lanes. They were waiting to learn who would close them." },
      { speakerId: "celest-archivist", text: "Celest traffic is clean again. The archive will call this an emergency resolved." },
      { speakerId: "captain", text: "And you?" },
      { speakerId: "mirr-analyst", text: "I will call it a door closing from the wrong side. Next time, they may knock." }
    ]
  }
];

const explorationSpeakerBySignal: Record<string, string> = {
  "quiet-signal-sundog-lattice": "helion-handler",
  "quiet-signal-foundry-ark-wreck": "kuro-foreman",
  "quiet-signal-ghost-iff-challenge": "vantara-officer",
  "quiet-signal-folded-reflection": "mirr-analyst",
  "quiet-signal-dead-letter-convoy": "ashen-broker",
  "quiet-signal-crownside-whisper": "celest-archivist",
  "quiet-signal-locked-keel-cache": "ship-ai"
};

const explorationSceneCopy: Record<string, [string, string]> = {
  "quiet-signal-sundog-lattice": [
    "The lattice bent a clean trade beacon into a false accident. That is careful work.",
    "Then our ghost has learned to hide in lawful traffic."
  ],
  "quiet-signal-foundry-ark-wreck": [
    "Foundry Ark was opened before impact. The belt got blamed for a murder it did not commit.",
    "Log it as evidence. The wake is choosing victims, not just waiting for them."
  ],
  "quiet-signal-ghost-iff-challenge": [
    "That IFF code came from an old patrol archive. Someone copied our salute and taught it to a trap.",
    "Every handshake becomes suspect until we know the source."
  ],
  "quiet-signal-folded-reflection": [
    "Parallax Hermitage is visible now. We stayed quiet because the echo was listening back.",
    "I see the station. Keep the channel narrow and I will dock when ready."
  ],
  "quiet-signal-dead-letter-convoy": [
    "Those tags are ugly evidence. Ashen brokers sold distress keys like bait hooks.",
    "Evidence in my hold is still contraband in half the frontier."
  ],
  "quiet-signal-crownside-whisper": [
    "The whisper sat under Celest arbitration traffic, thin enough to pass as luxury noise.",
    "A polite trap is still a trap."
  ],
  "quiet-signal-locked-keel-cache": [
    "Private cache opened. Ship components recovered. Yard note references quiet beacons and stored hull safety.",
    "PTD Home keeps old ships safer than open traffic ever could."
  ]
};

const explorationScenes: DialogueSceneDefinition[] = explorationSignals.map((signal) => {
  const [npcLine, captainLine] = explorationSceneCopy[signal.id];
  return {
    id: `dialogue-exploration-${signal.id}`,
    group: "exploration",
    title: `${signal.title} Signal Log`,
    maskedTitle: signal.maskedTitle,
    trigger: { kind: "exploration-complete", signalId: signal.id },
    lines: [
      { speakerId: explorationSpeakerBySignal[signal.id] ?? "ship-ai", text: npcLine },
      { speakerId: "captain", text: captainLine },
      { speakerId: "ship-ai", text: "Dialogue archive updated. Exploration evidence is available in the Captain's Log." }
    ]
  };
});

export const dialogueScenes: DialogueSceneDefinition[] = [...storyScenes, ...explorationScenes];

export const dialogueSpeakerById = Object.fromEntries(dialogueSpeakers.map((speaker) => [speaker.id, speaker])) as Record<
  string,
  DialogueSpeakerDefinition
>;

export const dialogueSceneById = Object.fromEntries(dialogueScenes.map((scene) => [scene.id, scene])) as Record<
  string,
  DialogueSceneDefinition
>;

export const storyDialogueSceneIds = new Set(storyScenes.map((scene) => scene.id));
export const explorationDialogueSceneIds = new Set(explorationScenes.map((scene) => scene.id));

export const expectedStoryDialogueSceneCount = glassWakeProtocol.chapters.length * 2;
