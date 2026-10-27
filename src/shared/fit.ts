/** Fit scoring for feed jobs. Hard filters run first (in code, not AI), so a user never gets jobs in the
 * wrong city, far above their experience, or in an unrelated role: the most common complaint about
 * competing tools. Every score comes with human-readable reasons. */

import type { FeedJob, FitResult, Profile } from "./types";
import { normalize, similarity, tokens } from "./text";

export const GOOD_MATCH = 70;
/** Jobs open longer than this are likely stale or "ghost" postings. */
export const STALE_AFTER_DAYS = 45;

export function splitList(text: string): string[] {
  return text.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
}

function roleScore(title: string, roles: string[]): { sim: number; role?: string } {
  let best = { sim: 0, role: undefined as string | undefined };
  const t = normalize(title);
  for (const role of roles) {
    const r = normalize(role);
    // "Backend Engineer" inside "Senior Backend Engineer, Payments" is a full match.
    const sim = r && t.includes(r) ? 1 : similarity(title, role);
    if (sim > best.sim) best = { sim, role };
  }
  return best;
}

const OPEN_REMOTE = /\b(anywhere|worldwide|global|globally|any location)\b/;
const REMOTE_WORDS = /\b(remote|fully|first|friendly|work from home|wfh|hybrid|based|only|position|role|or|and|in)\b/g;

/** A remote job the user can actually take. "Remote - Spain" names a place, so it hires only there,
 * unless that place is one the user accepts. Any named place counts (no country list to go stale). */
function remoteOpenTo(job: FeedJob, prefs: string[]): boolean {
  const loc = normalize(job.location);
  if (OPEN_REMOTE.test(loc) || job.is_india) return true;
  const namedPlace = loc.replace(REMOTE_WORDS, " ").trim();
  if (!namedPlace) return true; // plain "Remote"
  return prefs.some((p) => {
    const n = normalize(p);
    return n && !/^(remote|anywhere)$/.test(n) && loc.includes(n);
  });
}

function locationMatch(job: FeedJob, prefs: string[]): { ok: boolean; reason: string } {
  if (!prefs.length) return { ok: true, reason: "" };
  const wantsRemote = prefs.some((p) => /remote|anywhere/i.test(p));
  if (job.is_remote && wantsRemote && remoteOpenTo(job, prefs)) return { ok: true, reason: "Remote" };
  const loc = normalize(job.location);
  for (const p of prefs) {
    const n = normalize(p);
    if (!n || /^remote|anywhere$/.test(n)) continue;
    if (n === "india" && job.is_india) return { ok: true, reason: "In India" };
    if (loc.includes(n) || (n === "bangalore" && loc.includes("bengaluru")) || (n === "bengaluru" && loc.includes("bangalore"))
      || (n === "gurgaon" && loc.includes("gurugram")) || (n === "gurugram" && loc.includes("gurgaon"))) {
      return { ok: true, reason: `In ${p}` };
    }
  }
  return { ok: false, reason: "" };
}

function ageDays(job: FeedJob, now: Date): number {
  const posted = Date.parse(job.posted_at ?? job.first_seen_at);
  return Number.isFinite(posted) ? Math.max(0, (now.getTime() - posted) / 86_400_000) : 999;
}

export function scoreJob(job: FeedJob, profile: Profile, now: Date): FitResult {
  const reasons: string[] = [];
  const roles = splitList(profile.targetRoles);
  const places = splitList(profile.preferredLocations);
  const years = Number.parseFloat(profile.experienceYears);

  // --- hard filters ---
  const role = roleScore(job.title, roles);
  if (roles.length && role.sim < 0.25) return { job, score: 0, reasons, excluded: "Role does not match your target roles" };
  const place = locationMatch(job, places);
  if (!place.ok) return { job, score: 0, reasons, excluded: "Outside your preferred locations" };
  // One year short is worth a try; two or more is not (a fresher should not see "2+ years" jobs).
  if (Number.isFinite(years) && job.exp_min !== null && job.exp_min - years >= 2) {
    return { job, score: 0, reasons, excluded: `Needs ${job.exp_min}+ years; you have ${years}` };
  }
  if (Number.isFinite(years) && years <= 1 && /^(lead|senior)$/.test(job.seniority)) {
    return { job, score: 0, reasons, excluded: `${job.seniority} role` };
  }
  const age = ageDays(job, now);

  // --- score (max 100) ---
  let score = 0;
  if (roles.length) {
    score += Math.round(40 * role.sim);
    reasons.push(role.sim === 1 ? `Matches "${role.role}"` : `Similar to "${role.role}"`);
  } else score += 20;

  if (place.reason) {
    score += 20;
    reasons.push(place.reason);
  } else score += 10;

  if (Number.isFinite(years) && job.exp_min !== null) {
    const fits = years >= job.exp_min && (job.exp_max === null || years <= job.exp_max + 1);
    score += fits ? 20 : 10;
    reasons.push(fits ? `Fits your ${years} yrs experience` : `Asks ${job.exp_min}${job.exp_max !== null ? `–${job.exp_max}` : "+"} yrs`);
  } else score += 10;

  const skills = splitList(profile.skills);
  if (skills.length) {
    const titleTokens = tokens(job.title);
    const hit = skills.filter((s) => [...tokens(s)].every((t) => titleTokens.has(t)));
    if (hit.length) {
      score += 5;
      reasons.push(`Mentions ${hit.slice(0, 2).join(", ")}`);
    }
  }

  if (age <= 3) {
    score += 15;
    reasons.push("Posted in the last 3 days");
  } else if (age <= 7) score += 10;
  else if (age <= 14) score += 5;
  else if (age > STALE_AFTER_DAYS) {
    score -= 15;
    reasons.push(`Open ${Math.round(age)} days: may be stale`);
  }

  return { job, score: Math.max(0, Math.min(100, score)), reasons };
}

/** Score, filter and rank the whole feed. */
export function rankFeed(jobs: FeedJob[], profile: Profile, now: Date): { matches: FitResult[]; excluded: number } {
  const scored = jobs.map((j) => scoreJob(j, profile, now));
  const matches = scored.filter((r) => !r.excluded).sort((a, b) => b.score - a.score);
  return { matches, excluded: scored.length - matches.length };
}

/** Validate an untrusted feed file before using it. */
export function parseFeed(data: unknown): FeedJob[] {
  const jobs = (data as { jobs?: unknown })?.jobs;
  if (!Array.isArray(jobs)) throw new Error("Not a JobReach feed (no jobs list)");
  return jobs.filter((j): j is FeedJob =>
    !!j && typeof j === "object" && typeof (j as FeedJob).url === "string" && /^https?:\/\//.test((j as FeedJob).url)
    && typeof (j as FeedJob).title === "string" && typeof (j as FeedJob).company === "string")
    .map((j) => ({
      ...j,
      location: String(j.location ?? ""),
      seniority: String(j.seniority ?? ""),
      exp_min: typeof j.exp_min === "number" ? j.exp_min : null,
      exp_max: typeof j.exp_max === "number" ? j.exp_max : null,
      is_india: !!j.is_india,
      is_remote: !!j.is_remote,
      first_seen_at: String(j.first_seen_at ?? ""),
      apply_url: typeof j.apply_url === "string" && /^https:\/\//.test(j.apply_url) ? j.apply_url : undefined,
    }));
}
