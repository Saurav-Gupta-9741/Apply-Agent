/** "Apply on the company site": a job seen on LinkedIn, Indeed or Naukri, found on the company's own public job board,
 * where ApplyAgent may help. Those platforms forbid extensions that fill or automate their pages, so ApplyAgent never
 * reads or fills them: only the tab's title (which the browser shows the extension once the user opens it there) is
 * used, to name the role and the company. The company's board is then read through its public job API, exactly like
 * Discover. Nothing about the user is sent anywhere. */

import type { ListedCompany } from "./companies";
import type { JobPosting, SupportedATS } from "./types";
import { roleWords } from "./matching";

export interface SeenJob { role: string; company: string; platform: "LinkedIn" | "Indeed" | "Naukri" }

const clean = (s: string) => s.replace(/^\(\d+\)\s*/, "").replace(/\s+/g, " ").trim();

/** The role and company from a job tab's title, or undefined when the title does not name both. */
export function seenJobFromTitle(title: string, url: string): SeenJob | undefined {
  const t = clean(title);
  if (/linkedin\.com\/jobs|linkedin\.com\/.*currentJobId=/i.test(url)) {
    // "Stripe hiring Senior Data Engineer in Bengaluru, Karnataka, India | LinkedIn"
    const hiring = /^(.+?) hiring (.+?)(?: in .+?)? \| LinkedIn$/i.exec(t);
    if (hiring) return { company: clean(hiring[1]!), role: clean(hiring[2]!), platform: "LinkedIn" };
    // "Senior Data Engineer | Stripe | LinkedIn" or "Senior Data Engineer - Stripe | LinkedIn"
    const parts = /^(.+?) (?:\||-|–|at) (.+?) \| LinkedIn$/i.exec(t);
    if (parts) return { role: clean(parts[1]!), company: clean(parts[2]!), platform: "LinkedIn" };
    return undefined;
  }
  if (/indeed\.[a-z.]+\/(viewjob|.*jk=)/i.test(url)) {
    // "Data Engineer - Stripe - Bengaluru, Karnataka | Indeed.com"
    const m = /^(.+?) - (.+?)(?: - .+?)? \| Indeed(?:\.[a-z.]+)?$/i.exec(t);
    return m ? { role: clean(m[1]!), company: clean(m[2]!), platform: "Indeed" } : undefined;
  }
  if (/naukri\.com\/job-listings/i.test(url)) {
    // "Data Engineer - Stripe - 3 to 5 years of experience - Naukri.com" / "Data Engineer Job in Stripe at Bengaluru - Naukri.com"
    const inAt = /^(.+?) Job in (.+?) at .+? - Naukri\.com$/i.exec(t);
    if (inAt) return { role: clean(inAt[1]!), company: clean(inAt[2]!), platform: "Naukri" };
    const dash = /^(.+?) - (.+?) - .+? - Naukri\.com$/i.exec(t);
    return dash ? { role: clean(dash[1]!), company: clean(dash[2]!), platform: "Naukri" } : undefined;
  }
  return undefined;
}

export const squashName = (s: string) => s.toLowerCase().normalize("NFKD").replace(/\b(inc|llc|ltd|limited|gmbh|pvt|private|corp|corporation|technologies|technology|labs?|ai|hq|co)\b\.?/g, "").replace(/[^a-z0-9]/g, "");

/** The verified companies in the directory with this name. */
export function companiesNamed(directory: ListedCompany[], company: string): ListedCompany[] {
  const want = squashName(company);
  if (want.length < 2) return [];
  return directory.filter((c) => squashName(c.name) === want || c.slug.toLowerCase().replace(/[^a-z0-9]/g, "") === want);
}

/** Boards to try for a company the directory does not know: its name as a slug on the boards that answer by slug. */
export function guessedBoards(company: string): Array<{ ats: SupportedATS; slug: string; name: string }> {
  const one = squashName(company);
  const dashed = company.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (one.length < 2) return [];
  const slugs = [...new Set([one, dashed])];
  return slugs.flatMap((slug) => (["greenhouse", "lever", "ashby"] as SupportedATS[]).map((ats) => ({ ats, slug, name: company })));
}

/** The posting on the company's board that is this role: the same role words, and only one such posting. */
export function sameRole(postings: JobPosting[], role: string): JobPosting | undefined {
  // The exact title first: role words drop the level ("Senior Data Engineer" and "Data Engineer" read alike).
  const plain = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
  const same = [...new Map(postings.filter((p) => p.url && plain(p.title) === plain(role)).map((p) => [p.url, p])).values()];
  if (same.length === 1) return same[0];
  if (same.length > 1) return undefined;
  const want = roleWords(role).trim();
  const exact = postings.filter((p) => p.url && roleWords(p.title).trim() === want);
  if (exact.length === 1) return exact[0];
  // Titles written alike ("Senior Data Engineer, Payments" for "Senior Data Engineer"): the posting starting with it.
  const starts = postings.filter((p) => p.url && (` ${roleWords(p.title).trim()} `.startsWith(` ${want} `) || ` ${want} `.startsWith(` ${roleWords(p.title).trim()} `)));
  const unique = [...new Map(starts.map((p) => [p.url, p])).values()];
  return exact.length === 0 && unique.length === 1 ? unique[0] : undefined;
}

/** A web search for the job on the company's own site, when its board cannot be found or read. */
export function searchUrl(job: SeenJob): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`"${job.role}" "${job.company}" careers apply -site:linkedin.com -site:indeed.com -site:naukri.com`)}`;
}
