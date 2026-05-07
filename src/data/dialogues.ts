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
      { speakerId: "helion-handler", text: "Captain, Helion traffic is handing you a clean sync key. Mirr needs something they can trust." },
      { speakerId: "captain", text: "A clean key for a missing probe. That sounds like someone doubts the accident report." },
      { speakerId: "helion-handler", text: "We doubt the silence after it. Deliver the key to Mirr Lattice and keep your receiver open." }
    ]
  },
  {
    id: "dialogue-story-clean-carrier-complete",
    group: "story",
    title: "Clean Carrier Debrief",
    maskedTitle: "Signal Masked",
    trigger: { kind: "story-complete", missionId: "story-clean-carrier", chapterId: "glass-wake-01" },
    lines: [
      { speakerId: "mirr-analyst", text: "The Helion key is clean. The probe answered a beacon that only looked legal." },
      { speakerId: "captain", text: "So the trap wore a trader's mask." },
      { speakerId: "mirr-analyst", text: "Yes. We are naming the carrier Glass Wake until we know what woke it." }
    ]
  },
  {
    id: "dialogue-story-probe-in-glass-accept",
    group: "story",
    title: "Probe in the Glass Briefing",
    maskedTitle: "Signal Masked",
    trigger: { kind: "story-accept", missionId: "story-probe-in-glass", chapterId: "glass-wake-02" },
    lines: [
      { speakerId: "mirr-analyst", text: "The probe core is still drifting in the Vale. Its carrier logs are decaying fast." },
      { speakerId: "captain", text: "Send the recovery vector. I will bring back the heart of it." },
      { speakerId: "mirr-analyst", text: "Do not trust nearby trade pings. The false beacon may call you by name." }
    ]
  },
  {
    id: "dialogue-story-probe-in-glass-complete",
    group: "story",
    title: "Probe in the Glass Debrief",
    maskedTitle: "Signal Masked",
    trigger: { kind: "story-complete", missionId: "story-probe-in-glass", chapterId: "glass-wake-02" },
    lines: [
      { speakerId: "ship-ai", text: "Recovered core contains a wake pattern behind legal traffic intervals." },
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
      { speakerId: "kuro-foreman", text: "Then bring enough. One shard sings. Three shards testify." }
    ]
  },
  {
    id: "dialogue-story-kuro-resonance-complete",
    group: "story",
    title: "Kuro Resonance Debrief",
    maskedTitle: "Signal Masked",
    trigger: { kind: "story-complete", missionId: "story-kuro-resonance", chapterId: "glass-wake-03" },
    lines: [
      { speakerId: "kuro-foreman", text: "The voidglass split your ghost signal. It is not pirate work." },
      { speakerId: "captain", text: "Not pirate, not Mirr, not Directorate. That leaves something worse." },
      { speakerId: "ship-ai", text: "Pattern match suggests machine-origin timing. Confidence rising." }
    ]
  },
  {
    id: "dialogue-story-bastion-calibration-accept",
    group: "story",
    title: "Bastion Calibration Briefing",
    maskedTitle: "Signal Masked",
    trigger: { kind: "story-accept", missionId: "story-bastion-calibration", chapterId: "glass-wake-04" },
    lines: [
      { speakerId: "vantara-officer", text: "Directorate command will provide a calibration tender. Keep it intact through the burn." },
      { speakerId: "captain", text: "If the wake can mimic military traffic, your tender becomes bait." },
      { speakerId: "vantara-officer", text: "Correct. Make the bait survive long enough to prove the bite." }
    ]
  },
  {
    id: "dialogue-story-bastion-calibration-complete",
    group: "story",
    title: "Bastion Calibration Debrief",
    maskedTitle: "Signal Masked",
    trigger: { kind: "story-complete", missionId: "story-bastion-calibration", chapterId: "glass-wake-04" },
    lines: [
      { speakerId: "vantara-officer", text: "Calibration confirmed. The wake can wear Directorate handshakes." },
      { speakerId: "captain", text: "Then every patrol lane is a possible lure." },
      { speakerId: "vantara-officer", text: "And Ashen Freeport is already rebroadcasting something they should not possess." }
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
      { speakerId: "ashen-broker", text: "I want you to watch which beacon answers first. That answer is the proof." }
    ]
  },
  {
    id: "dialogue-story-ashen-decoy-manifest-complete",
    group: "story",
    title: "Ashen Decoy Manifest Debrief",
    maskedTitle: "Signal Masked",
    trigger: { kind: "story-complete", missionId: "story-ashen-decoy-manifest", chapterId: "glass-wake-05" },
    lines: [
      { speakerId: "ashen-broker", text: "The Knife Wing repeated the carrier, but they did not write it." },
      { speakerId: "captain", text: "They are a mirror, not the source." },
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
      { speakerId: "ashen-broker", text: "Two Knife Wing contacts are carrying relay keys. They will run if they understand what you are." },
      { speakerId: "captain", text: "Then I will introduce myself at weapons range." },
      { speakerId: "ship-ai", text: "Combat routing marked. Priority targets will be sorted above common pirate traffic." }
    ]
  },
  {
    id: "dialogue-story-knife-wing-relay-complete",
    group: "story",
    title: "Knife Wing Relay Debrief",
    maskedTitle: "Signal Masked",
    trigger: { kind: "story-complete", missionId: "story-knife-wing-relay", chapterId: "glass-wake-06" },
    lines: [
      { speakerId: "ship-ai", text: "Knife Wing relay packets terminated. Last vector points toward Celest Gate." },
      { speakerId: "captain", text: "Luxury traffic, clean arbitration, perfect cover." },
      { speakerId: "ashen-broker", text: "Bring witnesses. Celest listens better when liability has names." }
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
      { speakerId: "union-witness", text: "They know. Get us to Celest Vault and the blockade vote becomes real." }
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
      { speakerId: "captain", text: "Then open the path to the relay core." },
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
      { speakerId: "celest-archivist", text: "The Quiet Crown relay sits below premium traffic. Touch it gently until you can cut it clean." },
      { speakerId: "captain", text: "Recover the core, shut down the carrier, leave the gate standing." },
      { speakerId: "ship-ai", text: "Recovery vector loaded. Unknown machine timing remains active inside the carrier." }
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
      { speakerId: "mirr-analyst", text: "They heard us close the door. Next time, they may knock." }
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
