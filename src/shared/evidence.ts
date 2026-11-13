/** Suggestions for questions about the user's experience that ApplyAgent leaves for them ("Have you sold into
 * mid-market or enterprise-level accounts?", "Do you have experience supporting employee immigration…?", "How many
 * years of relevant work experience do you have?"; live round 8: about 60 such required questions on 182 forms).
 *
 * A suggestion is shown beside the question with the line of the user's own resume it rests on, and is used only when
 * the user presses it: nothing is filled on its own. Only "Yes" is ever suggested (a resume that does not mention
 * something is no proof of "No"), and only when a resume line names the question's own distinctive words. */

import { normalize } from "./text";
import { yesNoOption } from "./text";

export interface Suggestion {
  /** The option (or text) to put in the answer box. */
  value: string;
  /** Why: the resume line, or the saved fact, it rests on. */
  because: string;
}

/** An experience question asked yes or no: "Have you sold…", "Do you have experience…", "Are you familiar with…". */
const EXPERIENCE_Q = /^(have you (ever |consistently |previously |personally |directly |successfully |already )?(\w+ed|met|built|led|sold|run|done|held|taught|written|grown|won|been responsible)|do you have (any |prior |previous |professional |hands on |direct )?(experience|background|exposure|knowledge|familiarity)|are you (familiar|experienced|proficient|comfortable|skilled)|did you (\w+)|can you (\w+))\b/;
/** Questions about something other than the user's work: kept away from suggestions. */
const NOT_WORK = /\b(employed (at|by)|worked (at|for) (us|this company)|previously (applied|worked)|related to|relative|family|criminal|convicted|sponsor|visa|authori[sz]|citizen|veteran|disabilit|licen[cs]e to practice|non compete|government|clearance|vaccin|drug|background check|over 18|years of age)\b/;

const STOP = new Set(("a an the and or of in on at to for with by from into about as is are be been being do does did have has had having you your yours " +
  "we our us it its this that these those any some all each every other another such than then so very can could would should will " +
  "shall may might must not no yes if when where which who whom whose what why how ever previous prior previously current currently " +
  "professional direct directly hands experience experienced background knowledge familiarity familiar exposure proficient comfortable " +
  "skilled level levels role roles position positions work worked working job jobs company companies team teams please tell us " +
  "least more most years year months month time based using use used within across over under environment setting " +
  "specifically particularly especially including include such like").split(" "));

/** Business words most resumes share: a match on them alone proves nothing ("sales or account management in the DACH
 * market" is not shown by "sold into mid-market accounts"). Stems. */
const COMMON = new Set(["sell", "account", "market", "management", "manage", "manag", "customer", "client", "support", "employee",
  "process", "team", "business", "product", "service", "data", "project", "global", "system", "develop", "build", "lead",
  "run", "new", "large", "small", "mid", "level", "high", "growth", "strategy", "operation", "met", "deliver", "drive",
  "own", "responsible", "responsibility", "industry", "organization", "organisation", "people", "stakeholder"]);

/** A light stem so "sold"/"selling"/"sales", "supporting"/"support", "processes"/"process" meet. */
function stem(word: string): string {
  const w = word.toLowerCase();
  const irregular: Record<string, string> = { sold: "sell", sales: "sell", sale: "sell", selling: "sell", led: "lead", leading: "lead", built: "build", ran: "run", wrote: "write", written: "write", grew: "grow", grown: "grow", taught: "teach" };
  if (irregular[w]) return irregular[w]!;
  return w.replace(/(ization|isation)$/, "ize").replace(/(ing|ed|es|s)$/, "").replace(/(.)\1$/, "$1");
}

function terms(text: string): string[] {
  return [...new Set(normalize(text).split(" ").filter((w) => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w)).map(stem))];
}

/** Resume lines worth quoting (bullets and sentences, not headings or contact lines). */
function resumeLines(resume: string): string[] {
  return resume.split(/\r?\n|(?<=[.;])\s+(?=[A-Z])/).map((l) => l.replace(/^[\s•▪◦●·\-–—*]+/, "").trim())
    .filter((l) => l.length >= 25 && l.length <= 300 && !/@|https?:|\+?\d[\d ()-]{8,}/.test(l));
}

/** "Yes", with the resume line that names the question's distinctive words; nothing when no line clearly does. */
export function experienceSuggestion(label: string, options: string[], resume: string): Suggestion | undefined {
  const q = normalize(label);
  if (!EXPERIENCE_Q.test(q) || NOT_WORK.test(q) || /\?.*\?/.test(label)) return undefined;
  const yes = options.length ? yesNoOption(options, "Yes") : "Yes";
  if (!yes) return undefined;
  const wanted = terms(label.split("?")[0]!);
  if (!wanted.length) return undefined;
  // The words that make this question this one (DACH, immigration, quota): a line must name them, not only the
  // business words every resume has. With none, two of the question's words.
  const distinctive = wanted.filter((t) => !COMMON.has(t));
  const pool = distinctive.length ? distinctive : wanted;
  const need = distinctive.length ? Math.max(Math.min(2, distinctive.length), Math.ceil(distinctive.length / 2)) : Math.min(2, wanted.length);
  let best: { line: string; hits: number } | undefined;
  for (const line of resumeLines(resume)) {
    const have = new Set(terms(line));
    const hits = pool.filter((t) => have.has(t)).length;
    if (!best || hits > best.hits) best = { line, hits };
  }
  if (!best || best.hits < need) return undefined;
  const quote = best.line.length > 160 ? `${best.line.slice(0, 157)}…` : best.line;
  return { value: yes, because: `your resume: "${quote}"` };
}

/** "How many years of relevant work experience do you have?": the range holding the user's total years, to confirm
 * (relevant years may be fewer than total ones, so it is only offered, never filled). */
export function yearsSuggestion(label: string, options: string[], totalYears: string): Suggestion | undefined {
  const q = normalize(label);
  // Only the general question: "…in People Operations", "…managing teams", "…with solar installations" ask about one
  // area, and total years say nothing about it (a data engineer is not 5 years in solar; round 9 review).
  const general = /^(how many|number of|total) years of (relevant |professional |work |working |industry |overall |total )*(work )?experience (do you have|have you had)( for this (role|position|job))?$|^(relevant |professional |total |overall )*years of (relevant |professional |work )*experience$/;
  if (!general.test(q.trim()) || NOT_WORK.test(q)) return undefined;
  const years = Number.parseFloat(totalYears);
  if (!Number.isFinite(years) || years < 0) return undefined;
  const because = `your Profile: ${totalYears} years of experience in total. Check that they are relevant here`;
  if (!options.length) return { value: String(totalYears).trim(), because };
  // Read from the option's own text: normalising drops "+" ("8+ years") and splits "0.5".
  const numsOf = (s: string) => (s.toLowerCase().replace(/\bone\b/g, "1").match(/\d+(\.\d+)?/g) ?? []).map(Number);
  const fits = options.filter((o) => {
    const n = o.toLowerCase();
    const nums = numsOf(o);
    if (!nums.length) return false;
    if (/\b(less than|under|below|fewer than|up to)\b/.test(n)) return years < nums[0]! || (/\bup to\b/.test(n) && years <= nums[0]!);
    if (/\+|\bor more\b|\bplus\b|\bover\b|\bmore than\b|\babove\b/.test(n)) return years >= nums[0]!;
    if (nums.length >= 2) return years >= nums[0]! && years < nums[1]! + (Number.isInteger(nums[1]) ? 1 : 0) && !(years === nums[1] && options.some((p) => p !== o && numsOf(p)[0] === nums[1]));
    return years === nums[0];
  });
  return fits.length === 1 ? { value: fits[0]!, because } : undefined;
}
