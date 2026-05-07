export interface StoryChapterDefinition {
  id: string;
  order: number;
  missionId: string;
  title: string;
  lockedTitle: string;
  briefing: string;
  fieldObjective: string;
  reveal: string;
  log: string;
}

export interface StoryArcDefinition {
  id: string;
  title: string;
  subtitle: string;
  summary: string;
  epilogue: string;
  chapters: StoryChapterDefinition[];
}

export const GLASS_WAKE_ARC_ID = "glass-wake-protocol";

export const glassWakeProtocol: StoryArcDefinition = {
  id: GLASS_WAKE_ARC_ID,
  title: "Glass Wake Protocol",
  subtitle: "A missing Mirr probe exposes a drone signal hidden inside trusted trade beacons.",
  summary:
    "Trace the Glass Wake carrier through research arrays, mining belts, patrol routes, pirate relays, and Celest Gate before the Unknown Drones turn civilian navigation into a trap.",
  epilogue:
    "Celest traffic is clean again, but the Quiet Crown core preserved a listening scar beyond known faction code. The Glass Wake door is closed; whatever waited behind it now knows the captain's ship by name.",
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
      log:
        "Mirr Lattice confirmed the Helion key was clean. The missing probe did not drift off course; something answered it with a trusted trade signature and left a wake in the static."
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
      log:
        "The Glass Echo Drone broke apart beside the wreck. The core carried a new signature: Glass Wake, a carrier that wakes only when a ship trusts the signal enough to answer."
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
      log:
        "Voidglass split the carrier cleanly while the Listener tried to silence the belt. The wake is not Mirr code, Directorate encryption, or pirate noise. It is colder and older."
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
      log:
        "Vantara's calibration burn survived the mimics and proved the signal can wear military handshakes. Directorate command stopped calling it a research accident."
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
      log:
        "The decoy worked. The False Mercy Relay answered first, and Ashen pirates were only repeating a deeper drone instruction they barely understood."
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
      log:
        "The Knife Wing relay wing broke apart under fire. Their last packet pointed past Ashen Drift, toward the luxury traffic and clean liability shields around Celest Gate."
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
      log:
        "The witnesses reached Celest Vault after the jammer fell silent. For once, Mirr analysts, union miners, and Directorate officers agreed on the same warning: shut the relay down now."
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
      log:
        "The Quiet Crown relay went dark. The Glass Wake carrier is no longer riding the public lanes, but the core kept one final trace: Unknown Drones were listening."
    }
  ]
};

export const storyArcs: StoryArcDefinition[] = [glassWakeProtocol];
