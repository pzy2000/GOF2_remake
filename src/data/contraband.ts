import type { ContrabandLaw } from "../types/game";

export const contrabandLawBySystem: Record<string, ContrabandLaw> = {
  "helion-reach": {
    systemId: "helion-reach",
    label: "Fine + Confiscate",
    disposition: "fine-confiscate",
    summary: "Solar customs confiscate cargo and issue a 450 cr/unit fine."
  },
  "kuro-belt": {
    systemId: "kuro-belt",
    label: "Fine + Confiscate",
    disposition: "fine-confiscate",
    summary: "Union inspectors confiscate cargo and issue a 450 cr/unit fine."
  },
  vantara: {
    systemId: "vantara",
    label: "Hostile Pursuit",
    disposition: "hostile-pursuit",
    summary: "Directorate patrols treat confirmed contraband as a hostile pursuit trigger."
  },
  "mirr-vale": {
    systemId: "mirr-vale",
    label: "Fine + Confiscate",
    disposition: "fine-confiscate",
    summary: "Mirr security confiscates cargo and issues a 450 cr/unit fine."
  },
  "ashen-drift": {
    systemId: "ashen-drift",
    label: "Legal",
    disposition: "legal",
    summary: "Ashen Drift ports tolerate contraband as open black-market cargo."
  },
  "celest-gate": {
    systemId: "celest-gate",
    label: "Hostile Pursuit",
    disposition: "hostile-pursuit",
    summary: "Celest Gate patrols escalate confirmed contraband to hostile pursuit."
  },
  "ptd-home": {
    systemId: "ptd-home",
    label: "Legal",
    disposition: "legal",
    summary: "PTD Home treats contraband as private vault cargo."
  }
};
