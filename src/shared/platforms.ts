/** Where ApplyAgent may help. Job platforms whose terms forbid automated applications are hands-off: the agent
 * never reads or fills their forms (users' accounts would be restricted). Their "Apply on company site" links lead
 * to the employer's own form, where ApplyAgent helps normally. */

export type Policy = "assist" | "hands_off";

export interface PlatformInfo {
  name: string;
  policy: Policy;
  /** An applicant-tracking system: forms there are almost always job applications. */
  ats: boolean;
}

const HANDS_OFF: Array<[RegExp, string]> = [
  [/(^|\.)linkedin\.com$/, "LinkedIn"],
  [/(^|\.)indeed\.[a-z.]+$/, "Indeed"],
  [/(^|\.)naukri\.com$/, "Naukri"],
  [/(^|\.)glassdoor\.[a-z.]+$/, "Glassdoor"],
  [/(^|\.)(foundit|monsterindia)\.[a-z.]+$|(^|\.)monster\.[a-z.]+$/, "foundit / Monster"],
  [/(^|\.)wellfound\.com$|(^|\.)angel\.co$/, "Wellfound"],
  [/(^|\.)instahyre\.com$/, "Instahyre"],
  [/(^|\.)internshala\.com$/, "Internshala"],
  [/(^|\.)(hirist|iimjobs|updazz)\.[a-z.]+$/, "Hirist / iimjobs"],
  [/(^|\.)cutshort\.io$/, "Cutshort"],
  [/(^|\.)ziprecruiter\.com$/, "ZipRecruiter"],
  [/(^|\.)dice\.com$/, "Dice"],
  [/(^|\.)shine\.com$/, "Shine"],
  [/(^|\.)apna\.co$/, "apna"],
];

const ATS: Array<[RegExp, string]> = [
  [/(^|\.)greenhouse\.io$/, "Greenhouse"],
  [/(^|\.)lever\.co$/, "Lever"],
  [/(^|\.)ashbyhq\.com$/, "Ashby"],
  [/(^|\.)workable\.com$/, "Workable"],
  [/(^|\.)smartrecruiters\.com$/, "SmartRecruiters"],
  [/(^|\.)recruitee\.com$/, "Recruitee"],
  [/(^|\.)myworkdayjobs\.com$|(^|\.)workday\.com$/, "Workday"],
  [/(^|\.)icims\.com$/, "iCIMS"],
  [/(^|\.)taleo\.net$/, "Taleo"],
  [/(^|\.)successfactors\.(com|eu)$/, "SuccessFactors"],
  [/(^|\.)oraclecloud\.com$/, "Oracle Recruiting"],
  [/(^|\.)bamboohr\.com$/, "BambooHR"],
  [/(^|\.)jobvite\.com$/, "Jobvite"],
  [/(^|\.)breezy\.hr$/, "Breezy"],
  [/(^|\.)teamtailor\.com$/, "Teamtailor"],
  [/(^|\.)personio\.(de|com)$/, "Personio"],
  [/(^|\.)keka\.com$/, "Keka"],
  [/(^|\.)darwinbox\.(in|com)$/, "Darwinbox"],
  [/(^|\.)zohorecruit\.(com|in|eu)$/, "Zoho Recruit"],
  [/(^|\.)freshteam\.com$/, "Freshteam"],
];

/** A URL's host as the platform lists expect it: lower case, without the trailing dot browsers accept
 * ("www.linkedin.com." is LinkedIn too). Empty for a URL that cannot be read. */
export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/\.+$/, "");
  } catch {
    return "";
  }
}

export function platformFor(url: string): PlatformInfo {
  const host = hostnameOf(url);
  if (!host) return { name: "", policy: "assist", ats: false };
  for (const [pattern, name] of HANDS_OFF) if (pattern.test(host)) return { name, policy: "hands_off", ats: false };
  for (const [pattern, name] of ATS) if (pattern.test(host)) return { name, policy: "assist", ats: true };
  return { name: host.replace(/^www\./, ""), policy: "assist", ats: false };
}

export function isHandsOff(url: string): boolean {
  return platformFor(url).policy === "hands_off";
}

export const HANDS_OFF_MESSAGE = (name: string) =>
  `${name} doesn't allow automated applications, so ApplyAgent won't read or fill forms here (your account could be restricted). ` +
  `If this job says "Apply on company site", open that link: ApplyAgent helps there.`;

/** Hosts that are about jobs: an ATS, or a company careers site (careers.acme.com, jobs.acme.com, acme.jobs). */
export function isJobHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\*\./, "");
  return platformFor(`https://${h}/`).ats || /^(careers?|jobs?|apply|hiring|talent|recruiting)\./.test(h) || /\.jobs$/.test(h);
}

/** Whether the page script may silently read this page: never when detection is off; on job sites only, unless the
 * user chose every site they allowed. */
export function shouldDetect(detection: "off" | "job_sites" | "allowed_sites", href: string): boolean {
  if (detection === "off") return false;
  if (detection === "allowed_sites") return true;
  try {
    return isJobHost(hostnameOf(href));
  } catch {
    return false;
  }
}

/** Where "Job sites only" detection runs when the user granted access to every site. */
export const JOB_SITE_MATCHES = [
  "https://*.greenhouse.io/*", "https://*.lever.co/*", "https://*.ashbyhq.com/*", "https://*.workable.com/*",
  "https://*.smartrecruiters.com/*", "https://*.recruitee.com/*", "https://*.myworkdayjobs.com/*", "https://*.icims.com/*",
  "https://*.taleo.net/*", "https://*.bamboohr.com/*", "https://*.jobvite.com/*", "https://*.breezy.hr/*",
  "https://*.teamtailor.com/*", "https://*.keka.com/*", "https://*.darwinbox.in/*", "https://*.zohorecruit.com/*",
];

/** Match patterns for the detector's registration: never on hands-off platforms. */
export const HANDS_OFF_MATCHES = [
  "*://*.linkedin.com/*", "*://*.indeed.com/*", "*://*.indeed.co.in/*", "*://*.naukri.com/*", "*://*.glassdoor.com/*",
  "*://*.glassdoor.co.in/*", "*://*.foundit.in/*", "*://*.monster.com/*", "*://*.wellfound.com/*", "*://*.instahyre.com/*",
  "*://*.internshala.com/*", "*://*.iimjobs.com/*", "*://*.hirist.tech/*", "*://*.cutshort.io/*", "*://*.ziprecruiter.com/*",
  "*://*.dice.com/*", "*://*.shine.com/*", "*://*.apna.co/*",
];
