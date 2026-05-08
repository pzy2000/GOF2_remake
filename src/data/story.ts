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
    "Trace the Glass Wake carrier through research arrays, mining belts, patrol routes, pirate relays, Celest Gate, and the Listener Scar before the Unknown Drones turn civilian navigation into a name-bearing trap.",
  epilogue:
    "The Listener Scar anchor is broken and the captain's ship no longer answers to its stolen name. Glass Wake is not gone; the local listener has been forced to blink, and the larger drone network now knows who taught it pain.",
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
      log:
        "The Keel Name Listener tried to answer as the captain's own dormant hull. Echo Lock proved the name had become a key, not a call sign."
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
      log:
        "The decoy tender survived. The borrowed hulls were not stolen ships; they were routes wearing ship-shaped silence."
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
      log:
        "The Parallax Name Index mapped the stolen name as a wound in the carrier, not a signature. Glass Wake is trying to make identity behave like navigation."
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
      log:
        "The Name Auction Relay burned with its ledger still open. Ashen was selling access to the captain's wake, but the buyers were the real broadcast array."
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
      log:
        "The Listener Scar Anchor fractured under Echo Lock. The drones still exist beyond the lane maps, but this scar no longer knows how to call the captain home."
    }
  ]
};

export const storyArcs: StoryArcDefinition[] = [glassWakeProtocol];
