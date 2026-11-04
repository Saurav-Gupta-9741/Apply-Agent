/** Which companies Discover checks, and adding a company of the user's own from its careers-page link.
 *
 * Choosing companies is done on this computer from the person's profile: each listed company carries a small,
 * public profile of what it hires for (made by scripts/grow-companies.mjs from its own job board): the countries its
 * jobs are in, how many are remote, the role families it posts and how many are entry level. Companies that hire
 * for the person's field, where they can work, come first. No model is trained and nothing is sent anywhere. */

import { countryCode } from "../profile-validate";
import type { CompanyListing, SupportedATS } from "./types";
import type { RoleFamily, SearchProfile } from "./matching";

export interface ListedCompany extends CompanyListing {
  unverified?: boolean;
  verifiedAt?: string;
  jobCount?: number;
  /** Open jobs per country (ISO code), when the job board says. */
  hires?: Record<string, number>;
  remote?: number;
  families?: Partial<Record<RoleFamily, number>>;
  entry?: number;
  /** Added by the user (always checked first). */
  mine?: boolean;
}

/** A company the user added from its careers page. Kept in this browser (and in backups). */
export interface MyCompany {
  ats: SupportedATS;
  slug: string;
  name: string;
  addedAt: string;
  /** The link the user pasted. */
  source: string;
  jobCount?: number;
}

export const MY_COMPANIES_KEY = "myCompanies";
export const MAX_MY_COMPANIES = 40;

const RELATED_FAMILY: Partial<Record<RoleFamily, RoleFamily[]>> = {
  software: ["data"], data: ["software"], design: ["product"], product: ["design"], sales: ["marketing"], marketing: ["sales"],
};

/** How well a company suits the person (higher first). Exported for tests. */
export function companyRelevance(c: ListedCompany, sp: SearchProfile): number {
  const total = Math.max(1, c.jobCount ?? 0);
  if (!c.families && !c.hires) return Math.log1p(total) * 0.35; // an old listing without a hiring profile
  let fieldJobs = total;
  if (sp.families.length && c.families) {
    fieldJobs = 0;
    for (const f of sp.families) {
      fieldJobs += c.families[f] ?? 0;
      for (const r of RELATED_FAMILY[f] ?? []) fieldJobs += 0.3 * (c.families[r] ?? 0);
    }
  }
  if (fieldJobs <= 0) return 0;
  const codes = sp.workCountries.map((n) => countryCode(n)).filter((x): x is string => !!x);
  const local = codes.reduce((s, code) => s + (c.hires?.[code] ?? 0), 0);
  const remote = sp.wantsRemote ? (c.remote ?? 0) : 0;
  // The share of its jobs the person could take where they live (or remotely), from 0.1 (none) to 1.1 (all).
  const placeShare = codes.length && c.hires ? 0.1 + Math.min(1, (local + 0.6 * remote) / total) : 0.5;
  const junior = sp.years !== undefined && sp.years <= 1 ? 1 + Math.min(1, (c.entry ?? 0) / Math.max(1, fieldJobs)) : 1;
  return Math.log1p(fieldJobs) * placeShare * junior;
}

/** The companies to check, best first: the user's own companies, then the directory ranked for this person.
 * Companies with no job in the person's field, and none where they can work, are left to the end. */
export function rankCompanies(all: ListedCompany[], mine: MyCompany[], sp: SearchProfile): ListedCompany[] {
  const own: ListedCompany[] = mine.map((m) => ({ slug: m.slug, name: m.name, ats: m.ats, country: "", industry: "", mine: true, jobCount: m.jobCount }));
  const seen = new Set(own.map((c) => `${c.ats}:${c.slug.toLowerCase()}`));
  const rest = all
    .filter((c) => !c.unverified && !seen.has(`${c.ats}:${c.slug.toLowerCase()}`))
    .map((c) => ({ c, r: companyRelevance(c, sp) }))
    .sort((a, b) => b.r - a.r || a.c.name.localeCompare(b.c.name))
    .map((x) => x.c);
  return [...own, ...rest];
}

/** Why a company was chosen, in a few words ("Hires in India · 40 software jobs"). */
export function companyReason(c: ListedCompany, sp: SearchProfile): string {
  if (c.mine) return "Added by you";
  const bits: string[] = [];
  const code = sp.homeCountry ? countryCode(sp.homeCountry) : undefined;
  if (code && c.hires?.[code]) bits.push(`${c.hires[code]} jobs in ${sp.homeCountry}`);
  else if (sp.wantsRemote && c.remote) bits.push(`${c.remote} remote jobs`);
  const fam = sp.families[0];
  if (fam && c.families?.[fam]) bits.push(`${c.families[fam]} ${fam} jobs`);
  return bits.join(" · ");
}

// --- adding a company from a link ---------------------------------------------------------------------------

export interface BoardRef {
  ats: SupportedATS;
  slug: string;
}

const NOT_SLUG = new Set(["embed", "v1", "api", "jobs", "j", "job", "o", "careers", "boards", "postings", "posting-api", "job-board", "widget", "accounts", "js"]);

const BOARD_PATTERNS: Array<[SupportedATS, RegExp]> = [
  ["greenhouse", /\b(?:boards|job-boards)(?:\.eu)?\.greenhouse\.io\/embed\/job_board(?:\/js)?\?(?:[^"'\s]*&)?for=([A-Za-z0-9_-]+)/i],
  ["greenhouse", /\bboards-api\.greenhouse\.io\/v1\/boards\/([A-Za-z0-9_-]+)/i],
  ["greenhouse", /\b(?:boards|job-boards)\.greenhouse\.io\/([A-Za-z0-9_-]+)/i],
  ["lever", /\b(?:jobs\.lever\.co|api\.lever\.co\/v0\/postings)\/([A-Za-z0-9._-]+)/i],
  ["ashby", /\b(?:jobs\.ashbyhq\.com|api\.ashbyhq\.com\/posting-api\/job-board)\/([A-Za-z0-9._%-]+)/i],
  ["smartrecruiters", /\b(?:jobs|careers)\.smartrecruiters\.com\/([A-Za-z0-9_-]+)/i],
  ["smartrecruiters", /\bapi\.smartrecruiters\.com\/v1\/companies\/([A-Za-z0-9_-]+)/i],
  ["workable", /\bapply\.workable\.com\/(?:api\/v1\/widget\/accounts\/)?([A-Za-z0-9_-]+)/i],
  ["recruitee", /\b([a-z0-9-]+)\.recruitee\.com\b/i],
  ["personio", /\b([a-z0-9-]+)\.jobs\.personio\.(?:de|com)\b/i],
];

function cleanSlug(raw: string): string {
  try {
    return decodeURIComponent(raw).replace(/[?#].*$/, "").replace(/\.$/, "");
  } catch {
    return raw;
  }
}

/** Every job board named in a text (a link, or the HTML of a careers page), first one first. */
export function boardsIn(text: string): BoardRef[] {
  const found: BoardRef[] = [];
  for (const [ats, re] of BOARD_PATTERNS) {
    const g = new RegExp(re.source, "gi");
    for (const m of text.matchAll(g)) {
      const slug = cleanSlug(m[1] ?? "");
      if (!slug || NOT_SLUG.has(slug.toLowerCase()) || (ats === "recruitee" && /^(www|app|api|careers)$/i.test(slug))) continue;
      if (!found.some((f) => f.ats === ats && f.slug.toLowerCase() === slug.toLowerCase())) found.push({ ats, slug });
    }
  }
  return found;
}

export type LinkReading =
  | { kind: "board"; board: BoardRef }
  | { kind: "page"; url: URL }
  | { kind: "workday" }
  | { kind: "invalid"; message: string };

/** What a pasted link is: a job board ApplyAgent can read, a company's own careers page (to look inside once), or
 * something it cannot use. Job sites (LinkedIn, Naukri, …) are refused by the caller. */
export function readCareersLink(raw: string): LinkReading {
  const text = raw.trim();
  if (!text) return { kind: "invalid", message: "Paste the link of the company's careers page." };
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return { kind: "invalid", message: "That doesn't look like a web link. Copy it from the browser's address bar." };
  }
  if (url.protocol !== "https:") return { kind: "invalid", message: "Use the https:// link of the careers page." };
  if (!/\./.test(url.hostname) || /^(localhost|\d+\.\d+\.\d+\.\d+)$/.test(url.hostname)) {
    return { kind: "invalid", message: "That isn't a public website address." };
  }
  if (/\.myworkdayjobs\.com$|\.myworkdaysite\.com$/i.test(url.hostname)) return { kind: "workday" };
  const board = boardsIn(url.href)[0];
  if (board) return { kind: "board", board };
  return { kind: "page", url };
}

/** robots.txt rules for "*": may this path be read? (Simple prefix rules, as most sites write them.) */
export function robotsAllows(robotsTxt: string, path: string): boolean {
  let star = false;
  const disallow: string[] = [];
  const allow: string[] = [];
  for (const line of robotsTxt.split(/\r?\n/)) {
    const [k, ...v] = line.replace(/#.*$/, "").split(":");
    const key = (k ?? "").trim().toLowerCase();
    const val = v.join(":").trim();
    if (key === "user-agent") star = val === "*";
    else if (star && key === "disallow" && val) disallow.push(val);
    else if (star && key === "allow" && val) allow.push(val);
  }
  const longest = (rules: string[]): number => Math.max(-1, ...rules.filter((r) => path.startsWith(r.replace(/\*.*$/, ""))).map((r) => r.length));
  return longest(allow) >= longest(disallow);
}

export function sameBoard(a: BoardRef, b: BoardRef): boolean {
  return a.ats === b.ats && a.slug.toLowerCase() === b.slug.toLowerCase();
}
