/** Safe pacing: honest limits that keep the queue well under what job sites allow, and an immediate stop when a site
 * shows a robot check or says "too many requests". This is protection, not evasion: the waits are fixed and visible,
 * nothing is randomised to look human, and a challenge is never solved or bypassed. Everything stays in this browser. */

import { companyKey, hostOf } from "../background/queue";
import { exclusive } from "./storage";

export interface PacingSettings {
  /** Applications started per hour (rolling 60 minutes). */
  maxPerHour: number;
  /** Applications started per calendar day (local time). */
  maxPerDay: number;
  /** Minutes between two starts on the same site (same ATS company, or the same host). */
  perSiteCooldownMinutes: number;
  /** A fixed pause after each field the agent fills, so the page's own scripts can react (reliability). */
  pauseBetweenFieldsMs: number;
  /** Stop the run at once when the page shows a robot check or a rate-limit message. */
  stopOnChallenge: boolean;
}

export const DEFAULT_PACING: PacingSettings = {
  maxPerHour: 8, maxPerDay: 40, perSiteCooldownMinutes: 3, pauseBetweenFieldsMs: 150, stopOnChallenge: true,
};

export const PACING_BOUNDS = {
  maxPerHour: [1, 20], maxPerDay: [1, 100], perSiteCooldownMinutes: [0, 30], pauseBetweenFieldsMs: [0, 1000],
} as const;

/** After a robot check: how long that site, and the whole queue, wait. */
export const CHALLENGE_SITE_PAUSE_MS = 30 * 60_000;
export const CHALLENGE_QUEUE_PAUSE_MS = 10 * 60_000;

const HOUR_MS = 60 * 60_000;
const MINUTE_MS = 60_000;

function clampNumber(value: unknown, [min, max]: readonly [number, number], fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.round(n), min), max);
}

export function clampPacing(p: Partial<PacingSettings> | undefined): PacingSettings {
  const s = { ...DEFAULT_PACING, ...(p ?? {}) };
  return {
    maxPerHour: clampNumber(s.maxPerHour, PACING_BOUNDS.maxPerHour, DEFAULT_PACING.maxPerHour),
    maxPerDay: clampNumber(s.maxPerDay, PACING_BOUNDS.maxPerDay, DEFAULT_PACING.maxPerDay),
    perSiteCooldownMinutes: clampNumber(s.perSiteCooldownMinutes, PACING_BOUNDS.perSiteCooldownMinutes, DEFAULT_PACING.perSiteCooldownMinutes),
    pauseBetweenFieldsMs: clampNumber(s.pauseBetweenFieldsMs, PACING_BOUNDS.pauseBetweenFieldsMs, DEFAULT_PACING.pauseBetweenFieldsMs),
    stopOnChallenge: s.stopOnChallenge !== false,
  };
}

/** One application the queue really started (a tab was opened for it). */
export interface PacingStart {
  at: number;
  site: string;
}

export interface PacingState {
  starts: PacingStart[];
  /** Site → time until which it is paused (after a robot check). */
  sitePausedUntil: Record<string, number>;
  /** The whole queue waits until this time (after a robot check). */
  queuePausedUntil: number;
  /** What caused the last pause, for the status line. */
  lastChallenge?: { site: string; at: number; detail: string };
}

export const EMPTY_PACING_STATE: PacingState = { starts: [], sitePausedUntil: {}, queuePausedUntil: 0 };

/** The site a pause or cooldown applies to: the employer on a shared ATS host (boards.greenhouse.io/acme), else the host. */
export function siteKey(url: string): string {
  return companyKey(url) || hostOf(url) || url;
}

function startOfDay(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function nextMidnight(now: number): number {
  const d = new Date(now);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

/** Drop what no limit can ever look at again (starts before today and older than an hour, expired pauses). */
export function prune(state: PacingState, now: number): PacingState {
  const keepFrom = Math.min(startOfDay(now), now - HOUR_MS);
  const sitePausedUntil: Record<string, number> = {};
  for (const [site, until] of Object.entries(state.sitePausedUntil ?? {})) if (until > now) sitePausedUntil[site] = until;
  return {
    ...state,
    starts: (state.starts ?? []).filter((s) => s.at >= keepFrom && s.at <= now + MINUTE_MS),
    sitePausedUntil,
    queuePausedUntil: state.queuePausedUntil > now ? state.queuePausedUntil : 0,
  };
}

export type PaceReason = "hour" | "day" | "site_cooldown" | "site_paused" | "queue_paused";

export type PaceDecision = { ok: true } | { ok: false; reason: PaceReason; nextAt: number };

export function startsThisHour(state: PacingState, now: number): PacingStart[] {
  return (state.starts ?? []).filter((s) => s.at > now - HOUR_MS && s.at <= now);
}

export function startsToday(state: PacingState, now: number): PacingStart[] {
  const from = startOfDay(now);
  return (state.starts ?? []).filter((s) => s.at >= from && s.at <= now);
}

/** May an application on this site start now? The first limit that says no, and when it next allows a start. */
export function checkStart(state: PacingState, settings: PacingSettings, site: string, now: number): PaceDecision {
  if (state.queuePausedUntil > now) return { ok: false, reason: "queue_paused", nextAt: state.queuePausedUntil };
  const sitePause = state.sitePausedUntil?.[site] ?? 0;
  if (sitePause > now) return { ok: false, reason: "site_paused", nextAt: sitePause };
  const today = startsToday(state, now);
  if (today.length >= settings.maxPerDay) return { ok: false, reason: "day", nextAt: nextMidnight(now) };
  const hour = startsThisHour(state, now);
  if (hour.length >= settings.maxPerHour) {
    // The oldest start inside the window leaves it first; enough of them must leave to make room for one more.
    const sorted = hour.map((s) => s.at).sort((a, b) => a - b);
    return { ok: false, reason: "hour", nextAt: sorted[hour.length - settings.maxPerHour]! + HOUR_MS };
  }
  const cooldown = settings.perSiteCooldownMinutes * MINUTE_MS;
  if (cooldown > 0) {
    const last = Math.max(0, ...(state.starts ?? []).filter((s) => s.site === site && s.at <= now).map((s) => s.at));
    if (last && now - last < cooldown) return { ok: false, reason: "site_cooldown", nextAt: last + cooldown };
  }
  return { ok: true };
}

export function recordStart(state: PacingState, site: string, now: number): PacingState {
  return { ...state, starts: [...(state.starts ?? []), { at: now, site }] };
}

/** A robot check or rate-limit page on this site: pause the site for 30 minutes and the whole queue for 10. */
export function applyChallenge(state: PacingState, site: string, now: number, detail = ""): PacingState {
  return {
    ...state,
    sitePausedUntil: { ...(state.sitePausedUntil ?? {}), [site]: Math.max(state.sitePausedUntil?.[site] ?? 0, now + CHALLENGE_SITE_PAUSE_MS) },
    queuePausedUntil: Math.max(state.queuePausedUntil ?? 0, now + CHALLENGE_QUEUE_PAUSE_MS),
    lastChallenge: { site, at: now, detail },
  };
}

export function clockTime(at: number): string {
  const d = new Date(at);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** When the time is not today, say which day too. */
function whenText(at: number, now: number): string {
  if (startOfDay(at) === startOfDay(now)) return clockTime(at);
  if (startOfDay(at) === nextMidnight(now) && new Date(at).getHours() === 0 && new Date(at).getMinutes() === 0) return "midnight";
  return `${clockTime(at)} tomorrow`;
}

/** Why an item waits, in plain words. */
export function waitNote(decision: Exclude<PaceDecision, { ok: true }>, settings: PacingSettings, now: number): string {
  const when = whenText(decision.nextAt, now);
  switch (decision.reason) {
    case "hour": return `Waiting: ${settings.maxPerHour} started this hour (your safe pace). Next at ${when}.`;
    case "day": return `Waiting: ${settings.maxPerDay} started today (your safe pace). Next at ${when}.`;
    case "site_cooldown": return `Waiting: ${settings.perSiteCooldownMinutes} min between applications on this site. Next at ${when}.`;
    case "site_paused": return `Waiting: this site showed a robot check, so it is paused until ${when}.`;
    case "queue_paused": return `Waiting: a site showed a robot check, so the queue is paused until ${when}.`;
  }
}

/** The earliest time anything global (hour, day, queue pause) allows a new start, if something blocks now. */
export function nextGlobalStart(state: PacingState, settings: PacingSettings, now: number): number | undefined {
  const d = checkStart({ ...state, sitePausedUntil: {} }, { ...settings, perSiteCooldownMinutes: 0 }, "", now);
  return d.ok ? undefined : d.nextAt;
}

/** "3 of 8 this hour · 12 of 40 today · next at 14:05" */
export function statusLine(state: PacingState, settings: PacingSettings, now: number): string {
  const parts = [
    `${startsThisHour(state, now).length} of ${settings.maxPerHour} this hour`,
    `${startsToday(state, now).length} of ${settings.maxPerDay} today`,
  ];
  const next = nextGlobalStart(state, settings, now);
  if (next !== undefined) parts.push(`next at ${whenText(next, now)}`);
  return parts.join(" · ");
}

// --- storage -------------------------------------------------------------------------------------------
const SETTINGS_KEY = "pacing";
const STATE_KEY = "pacingState";

export async function loadPacing(): Promise<PacingSettings> {
  const data = await chrome.storage.local.get(SETTINGS_KEY);
  return clampPacing(data[SETTINGS_KEY] as Partial<PacingSettings> | undefined);
}

export async function savePacing(settings: Partial<PacingSettings>): Promise<PacingSettings> {
  const clamped = clampPacing({ ...(await loadPacing()), ...settings });
  await chrome.storage.local.set({ [SETTINGS_KEY]: clamped });
  return clamped;
}

export async function loadPacingState(): Promise<PacingState> {
  const data = await chrome.storage.local.get(STATE_KEY);
  const stored = data[STATE_KEY] as Partial<PacingState> | undefined;
  return { ...EMPTY_PACING_STATE, ...(stored ?? {}), starts: stored?.starts ?? [], sitePausedUntil: stored?.sitePausedUntil ?? {} };
}

function updatePacingState<T>(change: (state: PacingState) => { state: PacingState; result: T }, now: number): Promise<T> {
  return exclusive("pacing", async () => {
    const { state, result } = change(prune(await loadPacingState(), now));
    await chrome.storage.local.set({ [STATE_KEY]: state });
    return result;
  });
}

/** Check every limit and, when they allow it, count the start, as one locked step: several starts at the same
 * moment never slip past a limit together. */
export async function tryStart(url: string, now = Date.now()): Promise<PaceDecision> {
  const settings = await loadPacing();
  const site = siteKey(url);
  return updatePacingState((state) => {
    const decision = checkStart(state, settings, site, now);
    return { state: decision.ok ? recordStart(state, site, now) : state, result: decision };
  }, now);
}

export async function recordChallenge(url: string, detail = "", now = Date.now()): Promise<PacingState> {
  return updatePacingState((state) => {
    const next = applyChallenge(state, siteKey(url), now, detail);
    return { state: next, result: next };
  }, now);
}
