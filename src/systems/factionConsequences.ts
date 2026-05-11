import type {
  FactionHeatLevel,
  FactionHeatRecord,
  FactionHeatState,
  FactionId,
  FlightEntityRole,
  LawNotification,
  LawNotificationTone
} from "../types/game";

export const FRIENDLY_FIRE_WARNING_SECONDS = 10;
export const WANTED_DURATION_SECONDS = 90;
export const FACTION_HEAT_DECAY_PER_SECOND = 1 / 180;

const MAX_HEAT = 100;
const DEFAULT_RECORD: FactionHeatRecord = { heat: 0, fineCredits: 0, offenseCount: 0 };

export type FactionIncidentKind =
  | "civilian-hit"
  | "civilian-robbed"
  | "patrol-hit"
  | "smuggler-hit"
  | "civilian-destroyed"
  | "patrol-destroyed"
  | "smuggler-destroyed"
  | "contraband-fine"
  | "contraband-hostile";

interface FactionIncidentRule {
  heat: number;
  reputationDelta: number;
  fineCredits: number;
  forceWanted?: boolean;
  tone: LawNotificationTone;
  title: string;
}

export interface FactionIncidentInput {
  factionHeat: FactionHeatState;
  factionId: FactionId;
  kind: FactionIncidentKind;
  now: number;
  subjectName?: string;
  fineCredits?: number;
}

export interface FactionIncidentResult {
  factionHeat: FactionHeatState;
  record: FactionHeatRecord;
  heatDelta: number;
  reputationDelta: number;
  fineDelta: number;
  wanted: boolean;
  notification: LawNotification;
}

export interface FriendlyFireWarningResult {
  factionHeat: FactionHeatState;
  record: FactionHeatRecord;
  notification: LawNotification;
}

export interface PayFactionFineResult {
  factionHeat: FactionHeatState;
  credits: number;
  paid: boolean;
  paidCredits: number;
  record: FactionHeatRecord;
  notification?: LawNotification;
}

const incidentRules: Record<FactionIncidentKind, FactionIncidentRule> = {
  "civilian-hit": { heat: 12, reputationDelta: -4, fineCredits: 750, tone: "fine", title: "Civilian fire violation" },
  "civilian-robbed": { heat: 45, reputationDelta: -10, fineCredits: 1800, forceWanted: true, tone: "wanted", title: "Civilian robbery warrant" },
  "patrol-hit": { heat: 20, reputationDelta: -8, fineCredits: 1250, tone: "wanted", title: "Security assault" },
  "smuggler-hit": { heat: 12, reputationDelta: -2, fineCredits: 0, tone: "fine", title: "Faction reprisal" },
  "civilian-destroyed": { heat: 35, reputationDelta: -12, fineCredits: 3000, forceWanted: true, tone: "wanted", title: "Civilian vessel destroyed" },
  "patrol-destroyed": { heat: 50, reputationDelta: -20, fineCredits: 6000, forceWanted: true, tone: "wanted", title: "Patrol vessel destroyed" },
  "smuggler-destroyed": { heat: 20, reputationDelta: -6, fineCredits: 0, tone: "fine", title: "Faction reprisal" },
  "contraband-fine": { heat: 8, reputationDelta: -2, fineCredits: 0, tone: "fine", title: "Contraband citation" },
  "contraband-hostile": { heat: 45, reputationDelta: -6, fineCredits: 0, forceWanted: true, tone: "wanted", title: "Contraband pursuit" }
};

export function createInitialFactionHeat(): FactionHeatState {
  return { factions: {} };
}

export function normalizeFactionHeat(input?: Partial<FactionHeatState> | null): FactionHeatState {
  const factions: FactionHeatState["factions"] = {};
  for (const [factionId, record] of Object.entries(input?.factions ?? {})) {
    const normalized = normalizeFactionHeatRecord(record);
    if (normalized.heat > 0 || normalized.fineCredits > 0 || normalized.offenseCount > 0 || normalized.warningUntil || normalized.wantedUntil || normalized.interceptCooldownUntil) {
      factions[factionId as FactionId] = normalized;
    }
  }
  return { factions };
}

export function normalizeFactionHeatRecord(input?: Partial<FactionHeatRecord> | null): FactionHeatRecord {
  return {
    heat: clampHeat(input?.heat ?? 0),
    fineCredits: Math.max(0, Math.round(input?.fineCredits ?? 0)),
    offenseCount: Math.max(0, Math.round(input?.offenseCount ?? 0)),
    lastIncidentAt: finiteOrUndefined(input?.lastIncidentAt),
    warningUntil: finiteOrUndefined(input?.warningUntil),
    wantedUntil: finiteOrUndefined(input?.wantedUntil),
    interceptCooldownUntil: finiteOrUndefined(input?.interceptCooldownUntil)
  };
}

export function getFactionHeatRecord(factionHeat: FactionHeatState | undefined, factionId: FactionId): FactionHeatRecord {
  return normalizeFactionHeatRecord(factionHeat?.factions[factionId] ?? DEFAULT_RECORD);
}

export function getFactionHeatLevel(record: FactionHeatRecord): FactionHeatLevel {
  if (record.heat >= 70) return "kill-on-sight";
  if (record.heat >= 40) return "wanted";
  if (record.heat >= 20) return "watched";
  return "clear";
}

export function getFactionHeatLevelLabel(record: FactionHeatRecord): string {
  const level = getFactionHeatLevel(record);
  if (level === "kill-on-sight") return "Kill-on-sight";
  if (level === "wanted") return "Wanted";
  if (level === "watched") return "Watched";
  return "Clear";
}

export function hasActiveFriendlyFireWarning(factionHeat: FactionHeatState, factionId: FactionId, now: number): boolean {
  return (getFactionHeatRecord(factionHeat, factionId).warningUntil ?? -Infinity) > now;
}

export function isFactionWanted(factionHeat: FactionHeatState | undefined, factionId: FactionId, now: number): boolean {
  const record = getFactionHeatRecord(factionHeat, factionId);
  return record.heat >= 40 || (record.wantedUntil ?? -Infinity) > now;
}

export function isFactionKillOnSight(factionHeat: FactionHeatState | undefined, factionId: FactionId): boolean {
  return getFactionHeatRecord(factionHeat, factionId).heat >= 70;
}

export function applyFriendlyFireWarning(
  factionHeat: FactionHeatState,
  factionId: FactionId,
  subjectName: string,
  now: number
): FriendlyFireWarningResult {
  const record = {
    ...getFactionHeatRecord(factionHeat, factionId),
    warningUntil: now + FRIENDLY_FIRE_WARNING_SECONDS,
    lastIncidentAt: now
  };
  return {
    factionHeat: withRecord(factionHeat, factionId, record),
    record,
    notification: createLawNotification(
      "warning",
      "Friendly fire warning",
      `${subjectName} tagged as non-hostile. Cease fire or security will escalate.`,
      now
    )
  };
}

export function applyFactionIncident(input: FactionIncidentInput): FactionIncidentResult {
  const rule = incidentRules[input.kind];
  const previous = getFactionHeatRecord(input.factionHeat, input.factionId);
  const fineDelta = Math.max(0, Math.round(input.fineCredits ?? rule.fineCredits));
  const heat = clampHeat(previous.heat + rule.heat);
  const wanted = rule.forceWanted || heat >= 40;
  const record: FactionHeatRecord = {
    heat,
    fineCredits: previous.fineCredits + fineDelta,
    offenseCount: previous.offenseCount + 1,
    lastIncidentAt: input.now,
    warningUntil: undefined,
    wantedUntil: wanted ? Math.max(previous.wantedUntil ?? 0, input.now + WANTED_DURATION_SECONDS) : previous.wantedUntil
  };
  const notification = createLawNotification(
    wanted ? "wanted" : rule.tone,
    rule.title,
    incidentBody(input.kind, input.subjectName, heat, fineDelta, wanted),
    input.now
  );
  return {
    factionHeat: withRecord(input.factionHeat, input.factionId, record),
    record,
    heatDelta: rule.heat,
    reputationDelta: rule.reputationDelta,
    fineDelta,
    wanted,
    notification
  };
}

export function incidentKindForShip(role: FlightEntityRole, destroyed: boolean): FactionIncidentKind | undefined {
  if (role === "pirate" || role === "drone" || role === "relay") return undefined;
  if (role === "patrol") return destroyed ? "patrol-destroyed" : "patrol-hit";
  if (role === "smuggler") return destroyed ? "smuggler-destroyed" : "smuggler-hit";
  if (role === "trader" || role === "freighter" || role === "courier" || role === "miner") return destroyed ? "civilian-destroyed" : "civilian-hit";
  return undefined;
}

export function applyFactionHeatDecay(factionHeat: FactionHeatState, deltaSeconds: number, now: number): FactionHeatState {
  if (deltaSeconds <= 0) return normalizeFactionHeat(factionHeat);
  const factions: FactionHeatState["factions"] = {};
  for (const [factionId, record] of Object.entries(factionHeat.factions)) {
    const normalized = normalizeFactionHeatRecord(record);
    const heat = clampHeat(normalized.heat - deltaSeconds * FACTION_HEAT_DECAY_PER_SECOND);
    const next: FactionHeatRecord = {
      ...normalized,
      heat,
      warningUntil: normalized.warningUntil && normalized.warningUntil > now ? normalized.warningUntil : undefined,
      wantedUntil: normalized.wantedUntil && normalized.wantedUntil > now ? normalized.wantedUntil : undefined,
      interceptCooldownUntil: normalized.interceptCooldownUntil && normalized.interceptCooldownUntil > now ? normalized.interceptCooldownUntil : undefined
    };
    if (next.heat > 0 || next.fineCredits > 0 || next.offenseCount > 0 || next.warningUntil || next.wantedUntil || next.interceptCooldownUntil) {
      factions[factionId as FactionId] = next;
    }
  }
  return { factions };
}

export function payFactionFine(
  factionHeat: FactionHeatState,
  factionId: FactionId,
  credits: number,
  now: number
): PayFactionFineResult {
  const previous = getFactionHeatRecord(factionHeat, factionId);
  if (previous.fineCredits <= 0 || credits < previous.fineCredits) {
    return {
      factionHeat,
      credits,
      paid: false,
      paidCredits: 0,
      record: previous
    };
  }
  const record: FactionHeatRecord = {
    ...previous,
    fineCredits: 0,
    heat: Math.min(previous.heat, 19),
    warningUntil: undefined,
    wantedUntil: undefined
  };
  return {
    factionHeat: withRecord(factionHeat, factionId, record),
    credits: credits - previous.fineCredits,
    paid: true,
    paidCredits: previous.fineCredits,
    record,
    notification: createLawNotification(
      "cleared",
      "Fine paid",
      `Paid ${previous.fineCredits.toLocaleString()} cr. Legal status cleared to monitored baseline.`,
      now
    )
  };
}

export function setFactionHeatRecord(factionHeat: FactionHeatState, factionId: FactionId, record: FactionHeatRecord): FactionHeatState {
  return withRecord(factionHeat, factionId, record);
}

export function applyFactionInterceptCooldown(
  factionHeat: FactionHeatState,
  factionId: FactionId,
  cooldownUntil: number
): FactionHeatState {
  const record: FactionHeatRecord = {
    ...getFactionHeatRecord(factionHeat, factionId),
    interceptCooldownUntil: cooldownUntil
  };
  return withRecord(factionHeat, factionId, record);
}

export function createBountyNotification(subjectName: string, credits: number, now: number): LawNotification {
  return createLawNotification("bounty", "Bounty paid", `${subjectName} bounty paid: ${credits.toLocaleString()} cr.`, now);
}

export function bountyRewardForShip({ elite, boss }: { elite?: boolean; boss?: boolean }): number {
  if (boss) return 2500;
  if (elite) return 1200;
  return 600;
}

export function createLawNotification(tone: LawNotificationTone, title: string, body: string, now: number): LawNotification {
  return {
    id: `law-${tone}-${Math.round(now * 1000)}-${title}`,
    tone,
    title,
    body,
    expiresAt: now + 5
  };
}

function withRecord(factionHeat: FactionHeatState, factionId: FactionId, record: FactionHeatRecord): FactionHeatState {
  return normalizeFactionHeat({
    factions: {
      ...factionHeat.factions,
      [factionId]: record
    }
  });
}

function incidentBody(kind: FactionIncidentKind, subjectName: string | undefined, heat: number, fineCredits: number, wanted: boolean): string {
  const subject = subjectName ?? "Target";
  const fine = fineCredits > 0 ? ` Fine ${fineCredits.toLocaleString()} cr.` : "";
  const status = wanted ? " Wanted status active." : "";
  if (kind === "contraband-fine") return `Contraband citation recorded. Heat ${Math.round(heat)}.${fine}${status}`;
  if (kind === "contraband-hostile") return `Contraband confirmed. Patrols have marked you hostile. Heat ${Math.round(heat)}.${status}`;
  if (kind === "civilian-robbed") return `${subject} robbery reported. Heat ${Math.round(heat)}.${fine}${status}`;
  if (kind.endsWith("destroyed")) return `${subject} destroyed. Heat ${Math.round(heat)}.${fine}${status}`;
  return `${subject} hit after warning. Heat ${Math.round(heat)}.${fine}${status}`;
}

function clampHeat(value: number): number {
  return Math.max(0, Math.min(MAX_HEAT, Number.isFinite(value) ? value : 0));
}

function finiteOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
