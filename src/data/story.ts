export interface StoryChapterDefinition {
  id: string;
  order: number;
  missionId: string;
  title: string;
  lockedTitle: string;
  briefing: string;
  log: string;
}

export interface StoryArcDefinition {
  id: string;
  title: string;
  subtitle: string;
  summary: string;
  chapters: StoryChapterDefinition[];
}

export const GLASS_WAKE_ARC_ID = "glass-wake-protocol";

export const glassWakeProtocol: StoryArcDefinition = {
  id: GLASS_WAKE_ARC_ID,
  title: "Glass Wake Protocol",
  subtitle: "A missing Mirr probe exposes a drone signal hidden inside trusted trade beacons.",
  summary:
    "Trace the Glass Wake carrier through research arrays, mining belts, patrol routes, pirate relays, and Celest Gate before the Unknown Drones turn civilian navigation into a trap.",
  chapters: [
    {
      id: "glass-wake-01",
      order: 1,
      missionId: "story-clean-carrier",
      title: "01: Clean Carrier",
      lockedTitle: "01: Signal Masked",
      briefing: "Carry a clean Helion sync key to Mirr Lattice so the Collective can compare it against the missing probe's final beacon.",
      log:
        "Mirr Lattice confirmed the Helion key was clean. The missing probe did not drift off course; something answered it with a trusted trade signature."
    },
    {
      id: "glass-wake-02",
      order: 2,
      missionId: "story-probe-in-glass",
      title: "02: Probe in the Glass",
      lockedTitle: "02: Signal Masked",
      briefing: "Recover the Mirr probe core before its carrier logs decay in the Vale debris field.",
      log:
        "The probe core carried a new signature: Glass Wake. It rides behind legal beacon traffic and wakes only when a ship trusts the signal."
    },
    {
      id: "glass-wake-03",
      order: 3,
      missionId: "story-kuro-resonance",
      title: "03: Kuro Resonance",
      lockedTitle: "03: Signal Masked",
      briefing: "Mine voidglass in Kuro Belt to isolate the drone carrier frequency from normal comm noise.",
      log:
        "Voidglass split the carrier cleanly. The wake is not Mirr code, Directorate encryption, or pirate noise. It is something colder and older."
    },
    {
      id: "glass-wake-04",
      order: 4,
      missionId: "story-bastion-calibration",
      title: "04: Bastion Calibration",
      lockedTitle: "04: Signal Masked",
      briefing: "Escort a Directorate calibration tender while it burns a military spectrum sample into the shared evidence chain.",
      log:
        "Vantara's calibration burn proved the signal can mimic military handshakes too. Directorate command stopped calling it a research accident."
    },
    {
      id: "glass-wake-05",
      order: 5,
      missionId: "story-ashen-decoy-manifest",
      title: "05: Ashen Decoy Manifest",
      lockedTitle: "05: Signal Masked",
      briefing: "Carry relief cargo under a decoy manifest into Ashen Freeport and watch which beacon answers first.",
      log:
        "The decoy worked. Ashen pirates rebroadcast the Glass Wake carrier as bait, but their relay was only repeating a deeper drone instruction."
    },
    {
      id: "glass-wake-06",
      order: 6,
      missionId: "story-knife-wing-relay",
      title: "06: Knife Wing Relay",
      lockedTitle: "06: Signal Masked",
      briefing: "Destroy the Knife Wing relay craft before they sell the carrier to every black-market lane in Ashen Drift.",
      log:
        "The Knife Wing relay broke apart under fire. Its last packet pointed past Ashen Drift, toward the luxury traffic around Celest Gate."
    },
    {
      id: "glass-wake-07",
      order: 7,
      missionId: "story-witnesses-to-celest",
      title: "07: Witnesses to Celest",
      lockedTitle: "07: Signal Masked",
      briefing: "Carry faction witnesses to Celest Vault so the evidence cannot be buried as a local pirate incident.",
      log:
        "The witnesses reached Celest Vault. For once, Mirr analysts, union miners, and Directorate officers agreed on the same warning: shut the relay down now."
    },
    {
      id: "glass-wake-08",
      order: 8,
      missionId: "story-quiet-crown-relay",
      title: "08: Quiet Crown Relay",
      lockedTitle: "08: Signal Masked",
      briefing: "Recover the quiet relay core near Celest Crown and cut the Glass Wake carrier out of civilian navigation.",
      log:
        "The Quiet Crown relay went dark. The Glass Wake carrier is no longer riding the public lanes, but the core kept one final trace: Unknown Drones were listening."
    }
  ]
};

export const storyArcs: StoryArcDefinition[] = [glassWakeProtocol];
