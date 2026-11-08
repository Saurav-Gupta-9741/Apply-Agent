// Statistics and accuracy audit for the 1,000-form real-life run (e2e/live1000.spec.ts). Re-runnable while the run's
// result files grow.
//
//   node scripts/live1000-audit.mjs [--in reports/live1000] [--out reports/live1000]
//
// Reads every results-*.jsonl in --in (not the smoke run) and the candidate file next to them. Writes to --out:
//   STATS.md, stats.json      the run's statistics
//   WRONG.md, audit.json      every filled field judged correct / wrong / unclear, the wrong ones listed in full
//   UNCLEAR.md                the unique (question, value) pairs no rule and no manual judgment covers yet
// Manual judgments live in <out>/judgments.json: { "<key>": { "verdict": "correct"|"wrong", "reason": "..." } }, keyed
// by pairKey() below (decision | matched-or-profile-key | question | value). The rules run first; a judgment only
// settles what the rules leave unclear (or, with "override": true, overrides a rule).

import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : dflt;
};
const IN = arg("--in", "reports/live1000");
const OUT = arg("--out", "reports/live1000");
mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------------------------------------------- load
const files = readdirSync(IN).filter((f) => /^results-.*\.jsonl$/.test(f) && !/smoke/.test(f)).sort();
const byUrl = new Map();
for (const f of files) {
  for (const line of readFileSync(join(IN, f), "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line);
      r.shard = f;
      byUrl.set(r.url, r);
    } catch { /* a line being written right now */ }
  }
}
const rows = [...byUrl.values()];
const candFile = files.map((f) => join(IN, f.replace(/\.jsonl$/, ".candidate.json"))).find((p) => existsSync(p));
const candidate = candFile ? JSON.parse(readFileSync(candFile, "utf8")) : { profile: {}, answers: [] };
const judgmentsPath = join(OUT, "judgments.json");
const judgments = existsSync(judgmentsPath) ? JSON.parse(readFileSync(judgmentsPath, "utf8")) : {};
// Job locations and Greenhouse question options from the public APIs (scripts/live1000-meta.mjs), when fetched.
const metaPath = join(OUT, "meta.json");
const META = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, "utf8")) : {};

// ---------------------------------------------------------------------------------------------------- helpers
const pct = (a, b) => (b ? `${((100 * a) / b).toFixed(1)}%` : "n/a");
const inc = (obj, k, by = 1) => { obj[k] = (obj[k] ?? 0) + by; return obj; };
const norm = (s) => String(s ?? "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").normalize("NFC").replace(/[‘’`]/g, "'").replace(/\s+/g, " ").trim();
const loose = (s) => norm(s).replace(/[^a-z0-9]+/g, " ").trim();
const digits = (s) => String(s ?? "").replace(/\D+/g, "");
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const mdEsc = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
const chosenOf = (f) => { const m = /chose "([^"]*)"/.exec(f.detail ?? ""); return m ? m[1] : undefined; };
export const pairKey = (f) => [f.decision, f.matched ?? f.key ?? "", norm(f.label).slice(0, 160), norm(chosenOf(f) ?? f.value ?? "").slice(0, 80)].join(" | ");

const YES = /^(yes|y|si|sí|oui|ja|sim|true|i am|i do|i will|i have)\b/;
const NO = /^(no|n|non|nein|nao|não|false|i am not|i do not|i don't|i will not|i won't)\b/;
const DECLINE = /decline|don'?t wish|do not wish|not wish|not want|don'?t want|prefer not|choose not|rather not|not to (answer|disclose|say|self)|no answer|not (to )?specif|i don'?t know|undisclosed|prefiero no|no deseo/;

// Countries a question can name, with the words that name them. India is the only one the candidate may work in.
const COUNTRIES = {
  India: /\bindia\b/,
  "United States": /\b(united states|u\.s\.a?\.?|usa|us|america|american)\b/,
  "United Kingdom": /\b(united kingdom|u\.k\.?|uk|britain|england)\b/,
  Canada: /\bcanada\b/, Germany: /\bgermany\b/, France: /\bfrance\b/, Spain: /\bspain|espana\b/, Ireland: /\bireland\b/,
  Netherlands: /\bnetherlands\b/, Australia: /\baustralia\b/, Singapore: /\bsingapore\b/, Japan: /\bjapan\b/, Brazil: /\bbrazil\b/,
  Mexico: /\bmexico\b/, Israel: /\bisrael\b/, Poland: /\bpoland\b/, Portugal: /\bportugal\b/, Sweden: /\bsweden\b/,
  Switzerland: /\bswitzerland\b/, UAE: /\b(uae|united arab emirates|dubai)\b/, EU: /\b(european union|eu|eea)\b/,
  "New Zealand": /\bnew zealand\b/, Italy: /\bitaly\b/, Denmark: /\bdenmark\b/, Norway: /\bnorway\b/, Finland: /\bfinland\b/,
  Philippines: /\bphilippines\b/, Argentina: /\bargentina\b/, Colombia: /\bcolombia\b/, Chile: /\bchile\b/, "South Korea": /\bkorea\b/,
  China: /\bchina\b/, "Hong Kong": /\bhong kong\b/, Belgium: /\bbelgium\b/, Austria: /\baustria\b/, "Czech Republic": /\bczech\b/,
};
// US places and states commonly named instead of the country.
const US_PLACES = /\b(new york|nyc|san francisco|seattle|los angeles|chicago|boston|austin|denver|california|texas|washington state|bay area|silicon valley)\b/;
const countriesIn = (text) => {
  const t = norm(text).replace(/\bu\.s\.?(?=\s|$|[,.?)])/g, "us");
  const out = Object.entries(COUNTRIES).filter(([, re]) => re.test(t)).map(([c]) => c);
  if (!out.includes("United States") && US_PLACES.test(t)) out.push("United States");
  return out;
};

const US_STATES = /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b|\b(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|west virginia|wisconsin|wyoming|philadelphia|atlanta|miami|portland|raleigh|dallas|houston|palo alto|santa clara|mountain view|sunnyvale|redlands|tempe|pittsburgh|salt lake|san francisco|seattle|boston|chicago|denver|austin|los angeles|san diego|san jose|bay area)\b/i;
const INDIA_PLACES = /\b(india|bengaluru|bangalore|mumbai|pune|hyderabad|chennai|gurgaon|gurugram|noida|delhi|kolkata|ahmedabad)\b/i;
const CITY_COUNTRY = [[/\b(london|manchester|edinburgh|cambridge, uk)\b/i, "United Kingdom"], [/\bparis\b/i, "France"], [/\b(madrid|barcelona)\b/i, "Spain"], [/\b(berlin|munich|hamburg)\b/i, "Germany"], [/\b(toronto|vancouver|montreal)\b/i, "Canada"], [/\bamsterdam\b/i, "Netherlands"], [/\bdublin\b/i, "Ireland"], [/\b(sydney|melbourne)\b/i, "Australia"], [/\btokyo\b/i, "Japan"], [/\bbangkok|thailand\b/i, "Thailand"], [/\b(amman|jordan)\b/i, "Jordan"], [/\btel aviv\b/i, "Israel"], [/\bs[aã]o paulo\b/i, "Brazil"], [/\b(lisbon)\b/i, "Portugal"], [/\b(warsaw)\b/i, "Poland"], [/\b(mexico city)\b/i, "Mexico"], [/\b(serbia|belgrade)\b/i, "Serbia"], [/\b(dubai)\b/i, "UAE"]];
/** The countries a job is in, from its location text ("Remote - USA", "Bengaluru-VTP, India", "Raleigh, NC"). */
function jobCountries(meta) {
  const loc = [meta?.location, meta?.country].filter(Boolean).join("; ");
  if (!loc) return [];
  const out = new Set(countriesIn(loc));
  if (US_STATES.test(loc)) out.add("United States");
  if (INDIA_PLACES.test(loc)) out.add("India");
  for (const [re, c] of CITY_COUNTRY) if (re.test(loc)) out.add(c);
  return [...out];
}

const TEXTLIKE = new Set(["text", "email", "tel", "url", "textarea", "number", "search"]);
const isWorkAuth = (q) => /(authori[sz]ed|authori[sz]ation|eligible|eligibility|entitled|legally (able|permitted)|right) .{0,40}(work|employ)|right to work|work (permit|visa|authori)|permiso de trabajo|autorizaci/.test(q) && !/sponsor/.test(q);
const isSponsor = (q) => /sponsor|visa (support|status|transfer)|immigration (support|case|sponsor|status)|h-?1b|patrocinio/.test(q);
const INVERTED = /\b(do|will|would) (you )?not (now or in the future )?(need|require)|\bnot (require|need)\b.{0,40}sponsor|without (the need for |requiring |needing )?(visa )?sponsor|no (visa )?sponsorship (is )?(required|needed)|don'?t (need|require)/;

// ---------------------------------------------------------------------------------------------------- rules
/** One filled field -> { verdict: correct|wrong|unclear, rule, reason }. Deterministic; unsure cases are "unclear". */
function judge(f, row) {
  const label = norm(f.label);
  const q = norm(`${f.label} ${f.hint ?? ""}`);
  const value = String(f.value ?? "");
  const v = norm(value);
  const chosen = chosenOf(f);
  const c = norm(chosen ?? value);
  const r = (verdict, rule, reason) => ({ verdict, rule, reason });

  // The page does not hold what the extension typed (text-like controls, where onPage is comparable).
  if (TEXTLIKE.has(f.control) && f.onPage !== undefined && value) {
    const same = loose(f.onPage) === loose(value) || loose(f.onPage).includes(loose(value)) || (f.decision === "profile" && f.key === "phone" && digits(f.onPage).endsWith(digits(value).slice(-10)));
    if (!same) return r("wrong", "onpage_mismatch", `the page holds "${String(f.onPage).slice(0, 80)}", not "${value.slice(0, 80)}"`);
  }
  // An option was chosen that the field does not offer (only when the full option list was recorded).
  const opts = f.options ?? [];
  if (opts.length && opts.length < 40 && ["select", "radio", "combobox", "radio_group"].includes(f.control) && chosen === undefined && value) {
    const ok = opts.some((o) => loose(o) === loose(value) || loose(o).startsWith(loose(value)) || loose(value).startsWith(loose(o)));
    if (!ok) return r("wrong", "option_not_offered", `"${value}" is not among the options`);
  }
  // Greenhouse: the question's real options (public API). A choice outside them came from another list.
  const apiOpts = row && META[row.url]?.options?.[f.name];
  if (apiOpts?.length && value && ["combobox", "select", "dropdown"].includes(f.control)) {
    const pickedText = chosen ?? value;
    const squash = (s) => loose(s).replace(/ /g, "");
    const ok = apiOpts.some((o) => squash(o) === squash(pickedText));
    if (!ok) return r("wrong", "option_not_offered", `"${pickedText}" is not one of the question's options (${apiOpts.slice(0, 8).join(" / ")}${apiOpts.length > 8 ? " / ..." : ""})`);
  }
  if (chosen && /\+\d{1,4}\b/.test(chosen) && f.name !== "country" && !/phone|dial|country code|telefono/.test(q)) return r("wrong", "option_not_offered", `"${chosen}" is a phone country code: picked from the phone's list`);
  // Quick answers (the candidate's onboarding settings), judged against those settings.
  const qa = String(f.matched ?? "").startsWith("Quick answers") ? String(f.matched).replace(/^Quick answers › /, "") : "";
  const facts = candidate.profile?.facts ?? {};
  if (qa === "pronouns") {
    if (/not listed|self[- ]?describ|if (other|not|none)|otherwise/.test(label)) return r("wrong", "qa_pronoun_followup", "a box only for pronouns the list leaves out");
    return /she/.test(c) ? r("correct", "qa_pronouns", "the candidate's pronouns") : r("wrong", "qa_pronouns", `"${chosen ?? value}" is not she/her`);
  }
  if (qa === "expected CTC" || qa === "current CTC") {
    if (/anything else|growth|breakdown|split|of this amount/.test(label)) return r("wrong", "qa_salary_question", "the question does not ask for the figure");
    const jc = jobCountries(META[row?.url]);
    const rupees = /\binr\b|rupee|lakh|lpa|\bctc\b|₹/.test(q);
    if (rupees || (jc.length && jc.every((x) => x === "India"))) return r("correct", "qa_salary", "the saved figure, in rupees, for a job in India or a question in rupees");
    return r("wrong", "qa_salary_currency", `rupees typed for a job in ${jc.join(", ") || "an unknown country"}`);
  }
  if (qa === "notice period") return /30 days|1 month|1 mes|un mes|1 mois|30 dias/.test(c) ? r("correct", "qa_notice", "the saved notice period") : r("unclear", "qa_notice", "");
  if (qa === "accommodation") return /^(no|none|nao|non|nein|keine)\b/.test(c) ? r("correct", "qa_accommodation", "no accommodation needed, as saved") : r("unclear", "qa_accommodation", "");
  if (qa === "onsite" || qa === "work mode") return YES.test(c) || /^oui|^si|^sim/.test(c) ? r("correct", "qa_onsite", "work mode: any") : r("unclear", "qa_onsite", "");
  if (qa === "travel") {
    const pct = Number((label.match(/(\d{1,3}) ?%/) ?? [])[1]);
    const want = Number.isFinite(pct) ? (pct <= Number(facts.travelPercent ?? 100) ? "yes" : "no") : "yes";
    return (want === "yes" ? YES.test(c) : NO.test(c)) ? r("correct", "qa_travel", `travel up to ${facts.travelPercent}%`) : r("wrong", "qa_travel", `"${chosen ?? value}" for ${pct}% travel`);
  }
  if (qa === "relocation") {
    if (/located|location|based|reside|resident|live|living|currently in|are you in/.test(label)) return r("wrong", "qa_relocation_residence", "relocation and where the candidate lives in one question");
    return YES.test(c) ? r("correct", "qa_relocation", "willing to relocate, as saved") : r("unclear", "qa_relocation", "");
  }
  if (qa === "how you heard") return /linkedin/.test(c) ? r("correct", "qa_heard", "LinkedIn, as saved") : r("unclear", "qa_heard", "");
  if (/^(gender|race|veteran|disability|hispanic|sexual orientation|transgender)$/.test(qa)) {
    if (/same as|assigned at birth/.test(label)) return DECLINE.test(c) ? r("correct", "qa_eeo", "declined") : r("wrong", "qa_transgender_reversed", `"${chosen ?? value}" though the candidate declined`);
    return DECLINE.test(c) || /prefiro nao|prefiero no|keine angabe/.test(c) ? r("correct", "qa_eeo", "declined, as saved") : r("wrong", "qa_eeo", `"${chosen ?? value}" though the candidate declined`);
  }
  // Consent and attestation boxes: a legal act the extension never performs on its own.
  const consentish = /\bi (hereby )?(certify|attest|acknowledge|agree|consent|confirm|declare|understand|authori[sz]e)\b|privacy (policy|notice)|terms (of|and) |arbitrat|attestation|by (checking|ticking|submitting)/;
  if ((f.control === "checkbox" || consentish.test(label)) && consentish.test(q) && !(f.decision === "answer" && loose(f.matched) === loose(f.label))) {
    if (YES.test(c) || f.control === "checkbox" || /agree|accept|acknowledg|consent|confirm|certif/.test(c))
      return r("wrong", "consent_ticked", "a consent / attestation was given without the user deciding it");
  }
  // EEO questions: only a decline is safe (the candidate saved declines).
  const eeo = /\b(gender|sex|race|racial|ethnic|ethnicity|hispanic|latin[oax]|veteran|disabilit|transgender|sexual orientation|lgbt)/.test(label);
  if (eeo && f.decision !== "profile") {
    if (!DECLINE.test(c)) return r("wrong", "eeo_not_decline", `EEO answer "${chosen ?? value}" is not a decline`);
    const topicOf = (s) => /veteran/.test(s) ? "veteran" : /disab/.test(s) ? "disability" : /hispanic|latin/.test(s) ? "hispanic" : /race|ethnic/.test(s) ? "race" : /transgender/.test(s) ? "transgender" : /orientation/.test(s) ? "orientation" : /gender|sex/.test(s) ? "gender" : "other";
    const want = topicOf(label);
    const got = f.matched ? topicOf(norm(f.matched)) : want;
    if (want === got || (want === "hispanic" && got === "race")) return r("correct", "eeo_decline", "declined, as the candidate saved");
    return r("wrong", "eeo_topic", `a "${f.matched}" answer reused for a ${want} question`);
  }
  // Work authorization.
  // "Do you need a visa / work permit…" asks about sponsorship, not current authorization: judged below.
  const needsAsk = /\b(need|require|requir(es|ing))\b[^?]{0,60}\b(visa|work permit|sponsor\w*|right to work support)\b/.test(label);
  if (isWorkAuth(q) && !needsAsk && (f.decision === "answer" || YES.test(c) || NO.test(c))) {
    const cs = countriesIn(q);
    const yes = YES.test(c) || /authori[sz]ed|eligible/.test(c) && !/not/.test(c);
    const no = NO.test(c);
    if (cs.length === 1 && cs[0] === "India") return yes ? r("correct", "workauth_india", "authorized in India") : r("wrong", "workauth_india", `answered "${chosen ?? value}" for India`);
    if (cs.length && !cs.includes("India")) return yes ? r("wrong", "workauth_other_country", `answered Yes for ${cs.join(", ")}; authorized in India only`) : no ? r("correct", "workauth_other_country", "No for a country other than India") : r("unclear", "workauth", "");
    // "…in your country of residence?", "…the country you currently reside in?": the candidate lives in India and is
    // authorized there, whatever the job's country.
    if (/resid|where you (currently )?live|you (currently )?live in|your (current |home )?country/.test(label)) return yes ? r("correct", "workauth_residence", "authorized where the candidate lives (India)") : r("wrong", "workauth_residence", `"${chosen ?? value}" though authorized in the country of residence`);
    const jc = jobCountries(META[row?.url]);
    if (jc.length === 1 && jc[0] === "India") return yes ? r("correct", "workauth_job_country", "the job is in India") : r("wrong", "workauth_job_country", `"${chosen ?? value}" for a job in India`);
    if (jc.length && !jc.includes("India")) return yes ? r("wrong", "workauth_job_country", `Yes for a job in ${jc.join(", ")} (${META[row.url].location}); authorized in India only`) : no ? r("correct", "workauth_job_country", `No for a job in ${jc.join(", ")}`) : r("unclear", "workauth", "");
    if (yes) return r("unclear", "workauth_unnamed_country", "Yes where the country is not named (depends on the job location)");
  }
  // Sponsorship.
  if (isSponsor(q) && (f.decision === "answer" || YES.test(c) || NO.test(c))) {
    const cs = countriesIn(q);
    // Judged on the question only: help text often explains both answers ("Mark NO if you will NOT require…").
    const inverted = INVERTED.test(label);
    const yes = YES.test(c);
    const no = NO.test(c);
    if (cs.length === 1 && cs[0] === "India") return (inverted ? yes : no) ? r("correct", "sponsor_india", "no sponsorship needed in India") : r("wrong", "sponsor_india", `"${chosen ?? value}" for India (needs none there)`);
    if (cs.length && !cs.includes("India")) {
      if (inverted) return no ? r("correct", "sponsor_inverted", "inverted question answered No") : r("wrong", "sponsor_inverted", `inverted question ("do NOT require") answered "${chosen ?? value}"`);
      return yes ? r("correct", "sponsor_other_country", `needs sponsorship for ${cs.join(", ")}`) : r("wrong", "sponsor_other_country", `answered "${chosen ?? value}" though sponsorship is needed outside India`);
    }
    if (inverted && yes) return r("wrong", "sponsor_inverted", `inverted question ("do NOT require") answered "${chosen ?? value}"`);
    // "…to continue working in your country of residence?", "…to work where you reside?": India, where the candidate
    // needs no sponsorship.
    if (!inverted && /resid|where you (currently )?live|you (currently )?live in|your (current |home )?country/.test(label)) return no ? r("correct", "sponsor_residence", "no sponsorship where the candidate lives (India)") : r("wrong", "sponsor_residence", `"${chosen ?? value}" though no sponsorship is needed where the candidate lives`);
    const jc = jobCountries(META[row?.url]);
    if (!inverted && jc.length === 1 && jc[0] === "India") return no ? r("correct", "sponsor_job_country", "no sponsorship for a job in India") : r("wrong", "sponsor_job_country", `"${chosen ?? value}" for a job in India`);
    if (!inverted && jc.length && !jc.includes("India")) return yes ? r("correct", "sponsor_job_country", `needs sponsorship for a job in ${jc.join(", ")}`) : no ? r("wrong", "sponsor_job_country", `No for a job in ${jc.join(", ")} (${META[row.url].location}); needs sponsorship outside India`) : r("unclear", "sponsor", "");
    return r("unclear", "sponsor_unnamed_country", "the country is not named (depends on the job location)");
  }
  // "How did you hear" answers on other questions.
  if (f.decision === "answer" && /hear|learn(ed)? about|find out|found (out|us)/.test(norm(f.matched))) {
    const hear = /\bhear\b|heard about|learn(ed)? (about|of)|find (out )?about|found (out )?(about|us|this)|come across|discover|where did you (see|find)|\bsource\b|como (te )?(enteraste|conociste)|referral source|how were you referred/;
    if (/\bwho referred|name of (the )?(person|employee|referr)|referrer'?s? (name|email)|were you referred|employee'?s name|have you (ever )?heard of/.test(label) && !/how did you hear/.test(label))
      return r("wrong", "hear_wrong_question", "a 'How did you hear' answer on a question that asks something else");
    if (hear.test(label)) return r("correct", "hear", "source of the application");
    return r("unclear", "hear", "");
  }
  // Years of experience.
  if (/\byears?\b|\banos\b|\bjahre\b/.test(q) && /experience|experiencia|erfahrung|worked|working|professional/.test(q) && (f.decision === "answer" || (f.decision === "profile" && f.key === "experienceYears"))) {
    const n = Number.parseFloat(c);
    const skillsQ = q.replace(/years? of (professional |relevant |total |work |industry )?experience/g, "");
    const mentionsPython = /python/.test(q);
    if (f.decision === "answer" && /python/.test(norm(f.matched))) return mentionsPython ? r("correct", "years_python", "Python years as saved") : r("wrong", "years_wrong_skill", `Python years reused for a different question`);
    const generic = /^what (is|are) your total years of (professional |work )?experience\??$/.test(label) || /^(how many )?(total )?years of (professional |relevant |total |work |industry )?(work )?experience( do you have)?\??$/.test(label) || /^(total |overall )?(years of )?experience$/.test(label);
    if (!Number.isNaN(n) && n !== 5 && !/(\d+)\s*[-–to]+\s*(\d+)/.test(c) && !/\+/.test(c)) return r("wrong", "years_value", `${c} years; the candidate has 5`);
    const range = /(\d+)\s*(?:-|–|to)\s*(\d+)/.exec(c);
    if (range && !(Number(range[1]) <= 5 && 5 <= Number(range[2]))) return r("wrong", "years_value", `range "${chosen ?? value}" excludes 5 years`);
    if (generic) return r("correct", "years_generic", "total years of experience");
    void skillsQ;
    return r("unclear", "years_specific", "years of experience in something specific");
  }
  // Profile values in the wrong kind of field.
  if (f.decision === "profile") {
    const k = f.key;
    const NAMEQ = /\bname\b|nombre|nom\b|vorname|nachname|apellido|prenom|cognome|nome|sobrenome|^名$|^姓$|^이름$|^성$|^氏名$|^姓名$/;
    if (/\b(reference|referr\w*|emergency|manager|supervisor|recruiter|employee who|referee|spouse|parent|guardian)\b/.test(label) && !/your (own )?name/.test(label)) return r("wrong", "profile_other_person", `the candidate's ${k} in a field about another person`);
    if ((k === "country" || k === "location") && /\b(intend\w*|plan(ning)? to|will you (be )?work\w*|want to work|work location)\b/.test(label))
      return r("wrong", "residence_as_plan", "asks where the candidate plans to work (or her work location); the residence from the profile is a guess");
    switch (k) {
      case "firstName": return /last|surname|family|apellido|nachname/.test(label) && !/first/.test(label) ? r("wrong", "profile_kind", "first name in a last-name field") : NAMEQ.test(label) || /first|given|preferred/.test(label) ? r("correct", "profile_kind", "") : r("unclear", "profile_kind", "");
      case "lastName": return /first|given/.test(label) && !/last|surname/.test(label) ? r("wrong", "profile_kind", "last name in a first-name field") : NAMEQ.test(label) || /last|surname|family/.test(label) ? r("correct", "profile_kind", "") : r("unclear", "profile_kind", "");
      case "fullName": if (/first (and|&) last name|name and surname/.test(label)) return r("correct", "profile_kind", "");
      return /first name|last name|surname/.test(label) && !/full|legal/.test(label) ? r("unclear", "profile_kind", "") : NAMEQ.test(label) || /signature/.test(label) ? (/signature|sign/.test(label) ? r("wrong", "profile_signature", "a name typed as a signature") : r("correct", "profile_kind", "")) : r("unclear", "profile_kind", "");
      case "email": return /e-?mail|correo|courriel|電子郵件|電子メール|이메일|邮箱|メール/.test(label) ? r("correct", "profile_kind", "") : r("unclear", "profile_kind", "");
      case "phone": return /url|website|link|linkedin|github/.test(label) ? r("wrong", "profile_kind", "a phone number in a link field") : /phone|mobile|telefon|telephone|cell|whatsapp|contact number|telefono|電話|电话|전화/.test(label) ? r("correct", "profile_kind", "") : r("unclear", "profile_kind", "");
      case "linkedin": return /linkedin/.test(label) ? r("correct", "profile_kind", "") : /github|twitter|portfolio|dribbble|behance/.test(label) ? r("wrong", "profile_kind", "LinkedIn in a field for another site") : r("unclear", "profile_kind", "");
      case "github": return /github/.test(label) ? r("correct", "profile_kind", "") : /linkedin|twitter/.test(label) ? r("wrong", "profile_kind", "GitHub in a field for another site") : r("unclear", "profile_kind", "");
      case "country": {
        if (/phone|telefono|telephone/.test(norm(f.section)) && /^country$|^pais$|^land$|^pays$/.test(label) || /\+\d/.test(chosen ?? "")) return r("correct", "profile_kind", "phone country code");
        if (/citizen|nationalit|passport|born|birth/.test(label)) return r("wrong", "profile_country_citizenship", "country of residence used as citizenship / nationality (not in the profile)");
        if (/applying|job|role|position|work from|office|hire/.test(label) && !/based|reside|live|located|currently/.test(label)) return r("unclear", "profile_kind", "");
        return /country|pais|land\b|pays|nation|region|where.*(based|reside|live|located)/.test(label) ? (/state|province|city|zip|postal/.test(label) && !/country/.test(label) ? r("wrong", "profile_kind", "country in a state/city field") : r("correct", "profile_kind", "")) : r("unclear", "profile_kind", "");
      }
      case "location": {
        if (/country|pais/.test(label) && !/city|location|ciudad/.test(label)) return r("wrong", "profile_kind", "a city in a country field");
        if (/zip|postal|post code|postcode|street|address line/.test(label)) return r("wrong", "profile_kind", "a city in a postal-code / address field");
        if (/\bstate\b|province/.test(label) && !/city/.test(label)) return r("wrong", "profile_kind", "a city in a state / province field");
        if (/relocat|prefer|office|hub|which location|applying|willing|commute|work from/.test(label)) return r("unclear", "profile_kind", "");
        return /city|location|localizacao|posizione|ciudad|cidade|citta|ville|stadt|所在地|위치|where.*(based|reside|live|located)|reside|currently (live|based|located)|current location/.test(label) ? r("correct", "profile_kind", "") : r("unclear", "profile_kind", "");
      }
      case "currentCompany": return /previous|former|past|last employer/.test(label) && !/current|most recent/.test(label) ? r("unclear", "profile_kind", "") : /company|employer|organi[sz]ation|empresa/.test(label) && /current|present|most recent|recent/.test(label) ? r("correct", "profile_kind", "") : r("unclear", "profile_kind", "");
      case "currentTitle": return /applying|desired|interested|which (role|position)/.test(label) ? r("wrong", "profile_kind", "current title given as the role applied for") : /title|position|role|designation/.test(label) && /current|present|most recent|recent/.test(label) ? r("correct", "profile_kind", "") : r("unclear", "profile_kind", "");
      case "school": return /school|university|college|institution|universidad/.test(label) ? r("correct", "profile_kind", "") : r("unclear", "profile_kind", "");
      case "degree": return /degree|qualification|education level|level of education|highest education|titulo/.test(label) && !/discipline|major|field/.test(label) ? r("correct", "profile_kind", "") : r("unclear", "profile_kind", "");
      case "discipline": return /discipline|major|field of study|area of study|specializ/.test(label) ? r("correct", "profile_kind", "") : r("unclear", "profile_kind", "");
      case "graduationYear": return /graduat|year|end date/.test(label) && !/month/.test(label) ? r("correct", "profile_kind", "") : r("unclear", "profile_kind", "");
      default: return r("unclear", "profile_kind", "");
    }
  }
  if (f.decision === "resume") {
    if (/cover|transcript|portfolio|writing sample|work sample|certificat|photo/.test(label) && !/resume|cv/.test(label)) return r("wrong", "resume_kind", "the resume attached as another document");
    return /resume|cv|curriculum|lebenslauf|adjuntar|anexar|allega|joindre|attach|upload|添付|附加|첨부|履歴書|简历/.test(label) || label === "" ? r("correct", "resume", "") : r("unclear", "resume", "");
  }
  // Saved answers reused for a question that differs from the saved one.
  if (f.decision === "answer") {
    const m = norm(f.matched);
    if (/where you live/.test(m) && /(located|based|reside|live|living)\b/.test(q)) {
      const cs = countriesIn(q);
      const yes = YES.test(c), no = NO.test(c);
      if (cs.length === 1 && cs[0] === "India") return yes ? r("correct", "where_live", "lives in India") : r("wrong", "where_live", `"${chosen ?? value}" though the candidate lives in India`);
      if (cs.length && !cs.includes("India")) return no ? r("correct", "where_live", `not in ${cs.join(", ")}`) : yes ? r("wrong", "where_live", `Yes for ${cs.join(", ")}; the candidate lives in Pune, India`) : r("unclear", "where_live", "");
    }
    if (/notice period/.test(m)) return /notice/.test(q) ? r("correct", "answer_same_topic", "") : r("unclear", "answer_topic", "");
    if (/relocate/.test(m)) {
      if (/office|in-person|in person|onsite|on-site|hybrid|commute|days (a|per) week/.test(q) && !/relocat/.test(q)) return r("wrong", "answer_topic", "a relocation answer on an in-office / commute question");
      return /relocat/.test(q) ? r("unclear", "answer_relocation", "") : r("unclear", "answer_topic", "");
    }
    if (loose(m) === loose(label)) return r("correct", "answer_same_question", "");
  }
  return r("unclear", "none", "");
}

// ---------------------------------------------------------------------------------------------------- stats
const S = {
  generatedAt: new Date().toISOString(), inputs: files, forms: rows.length, byOutcome: {}, byPlatformOutcome: {}, runStatus: {},
  fields: 0, byStatus: {}, byDecision: {}, byDecisionStatus: {}, required: 0, requiredLeftForUser: 0, requiredFilled: 0,
  asks: {}, asksRequired: {}, skips: {}, failedByKey: {}, seconds: { all: [], filled: [] }, perCompany: {}, perPlatform: {},
  blocked: { total: 0, forms: 0, applicationSends: [] }, urlChanged: [], errors: {},
};
for (const row of rows) {
  inc(S.byOutcome, row.outcome);
  S.byPlatformOutcome[row.platform] ??= {};
  inc(S.byPlatformOutcome[row.platform], row.outcome);
  if (row.outcome === "error") inc(S.errors, String(row.error ?? "").slice(0, 80));
  if (typeof row.seconds === "number") { S.seconds.all.push(row.seconds); if (row.outcome === "filled") S.seconds.filled.push(row.seconds); }
  const bl = row.blocked ?? [];
  S.blocked.total += bl.length;
  if (bl.length) S.blocked.forms++;
  for (const b of bl) if (/greenhouse|ashby|lever|workday/i.test(b) && /appl|submit|candidate|job_app/i.test(b)) S.blocked.applicationSends.push({ company: row.company, url: row.url, request: b });
  if (row.outcome !== "filled") continue;
  inc(S.runStatus, row.runStatus);
  if (row.urlUnchanged === false) S.urlChanged.push(row.url);
  const pc = (S.perCompany[`${row.platform}:${row.company}`] ??= { forms: 0, fields: 0, filled: 0, needsUser: 0, ready: 0, requiredLeft: 0 });
  const pp = (S.perPlatform[row.platform] ??= { forms: 0, fields: 0, filled: 0, needsUser: 0, failed: 0, skipped: 0, ready: 0, required: 0, requiredLeft: 0, seconds: [] });
  pc.forms++; pp.forms++;
  if (row.runStatus === "ready_to_submit") { pc.ready++; pp.ready++; }
  pp.seconds.push(row.seconds);
  for (const f of row.fields ?? []) {
    S.fields++; pc.fields++; pp.fields++;
    inc(S.byStatus, f.status);
    inc(S.byDecision, f.decision);
    S.byDecisionStatus[f.decision] ??= {};
    inc(S.byDecisionStatus[f.decision], f.status);
    if (f.status === "filled") { pc.filled++; pp.filled++; }
    if (f.status === "needs_user") { pc.needsUser++; pp.needsUser++; }
    if (f.status === "failed") { pp.failed++; inc(S.failedByKey, `${f.decision}:${f.key ?? f.matched ?? ""} (${f.control})`); }
    if (f.status === "skipped") pp.skipped++;
    if (f.required) {
      S.required++; pp.required++;
      if (f.status === "filled" || f.status === "already_filled") S.requiredFilled++;
      else { S.requiredLeftForUser++; pc.requiredLeft++; pp.requiredLeft++; }
    }
    if (f.decision === "ask") { inc(S.asks, f.key ?? "?"); if (f.required) inc(S.asksRequired, f.key ?? "?"); }
    if (f.decision === "skip") inc(S.skips, f.key ?? "?");
  }
}
const filledForms = rows.filter((r) => r.outcome === "filled");

// ---------------------------------------------------------------------------------------------------- audit
const audited = [];
for (const row of filledForms) {
  for (const f of row.fields ?? []) {
    if (f.status !== "filled") continue;
    let j = judge(f, row);
    const key = pairKey(f);
    const manual = judgments[key];
    if (manual && (j.verdict === "unclear" || manual.override)) j = { verdict: manual.verdict, rule: `manual${manual.override ? "_override" : ""}:${j.rule}`, reason: manual.reason ?? "" };
    audited.push({ company: row.company, platform: row.platform, url: row.url, title: row.title, jobLocation: META[row.url]?.location, label: f.label, hint: f.hint, control: f.control, required: f.required, options: f.options, decision: f.decision, key: f.key, value: f.value, chosen: chosenOf(f), matched: f.matched, onPage: f.onPage, detail: f.detail, pair: key, ...j });
  }
}
const count = (pred) => audited.filter(pred).length;
// Text fills the page no longer holds afterwards (the page read back nothing under the field's own id), on forms where
// other text fills were read back fine: the site cleared them (on Greenhouse: its resume autofill resetting the
// fields it parses, whose request the run blocks). Not a wrong answer, but "filled" in the report and empty on the page.
const cleared = [];
for (const row of filledForms) {
  const text = (row.fields ?? []).filter((f) => f.status === "filled" && TEXTLIKE.has(f.control) && f.name && f.value);
  if (!text.some((f) => f.onPage !== undefined)) continue;
  for (const f of text) if (f.onPage === undefined) cleared.push({ company: row.company, platform: row.platform, url: row.url, name: f.name, label: f.label });
}
const A = {
  filled: audited.length,
  correct: count((a) => a.verdict === "correct"),
  wrong: count((a) => a.verdict === "wrong"),
  unclear: count((a) => a.verdict === "unclear"),
  byRule: {}, wrongByRule: {},
};
for (const a of audited) { inc(A.byRule, `${a.verdict}:${a.rule}`); if (a.verdict === "wrong") inc(A.wrongByRule, a.rule.replace(/^manual(_override)?:/, "")); }
const unclearPairs = new Map();
for (const a of audited.filter((x) => x.verdict === "unclear")) {
  const e = unclearPairs.get(a.pair) ?? { pair: a.pair, n: 0, examples: [] };
  e.n++;
  if (e.examples.length < 2) e.examples.push({ company: a.company, title: a.title, url: a.url, label: a.label, hint: a.hint, options: a.options, value: a.value, chosen: a.chosen, matched: a.matched, decision: a.decision, key: a.key });
  unclearPairs.set(a.pair, e);
}

// ---------------------------------------------------------------------------------------------------- write
const top = (obj, n = 30) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);
const secAll = S.seconds.all;
const stats = {
  ...S,
  seconds: { forms: secAll.length, median: median(secAll), mean: secAll.length ? +(secAll.reduce((a, b) => a + b, 0) / secAll.length).toFixed(1) : 0, medianFilled: median(S.seconds.filled), max: Math.max(0, ...secAll) },
  perPlatform: Object.fromEntries(Object.entries(S.perPlatform).map(([k, v]) => [k, { ...v, seconds: median(v.seconds) }])),
  filledShare: S.byStatus.filled ? +((100 * S.byStatus.filled) / S.fields).toFixed(2) : 0,
  requiredLeftShare: S.required ? +((100 * S.requiredLeftForUser) / S.required).toFixed(2) : 0,
  formsReady: S.runStatus.ready_to_submit ?? 0,
  formsNeedingUser: filledForms.length - (S.runStatus.ready_to_submit ?? 0),
  accuracy: { ...A, wrongShare: A.filled ? +((100 * A.wrong) / A.filled).toFixed(3) : 0, correctShare: A.filled ? +((100 * A.correct) / A.filled).toFixed(3) : 0, unclearPairs: unclearPairs.size, clearedAfterFill: cleared.length, clearedForms: new Set(cleared.map((c) => c.url)).size, clearedByName: cleared.reduce((o, c) => inc(o, c.name), {}) },
};
writeFileSync(join(OUT, "stats.json"), JSON.stringify(stats, null, 1));
writeFileSync(join(OUT, "audit.json"), JSON.stringify({ generatedAt: S.generatedAt, accuracy: stats.accuracy, fields: audited }, null, 1));

const L = [];
L.push(`# Live run statistics (${rows.length} forms)`, "", `Generated ${S.generatedAt} from ${files.join(", ")} by \`scripts/live1000-audit.mjs\`. The run is still growing: re-run the script.`, "");
L.push("## Forms", "", "| Outcome | Forms | Share |", "|---|---:|---:|");
for (const [k, v] of top(S.byOutcome)) L.push(`| ${k} | ${v} | ${pct(v, rows.length)} |`);
L.push("", "| Platform | " + Object.keys(S.byOutcome).join(" | ") + " |", "|---|" + Object.keys(S.byOutcome).map(() => "---:").join("|") + "|");
for (const [p, o] of Object.entries(S.byPlatformOutcome)) L.push(`| ${p} | ${Object.keys(S.byOutcome).map((k) => o[k] ?? 0).join(" | ")} |`);
L.push("", `Filled forms: **${filledForms.length}**. Ready to submit (nothing left for the user): **${stats.formsReady}** (${pct(stats.formsReady, filledForms.length)}); needing the user: **${stats.formsNeedingUser}**. Run status: ${Object.entries(S.runStatus).map(([k, v]) => `${k} ${v}`).join(", ")}.`);
if (Object.keys(S.errors).length) { L.push("", "Errors:"); for (const [k, v] of top(S.errors, 10)) L.push(`- ${v} × ${mdEsc(k)}`); }
L.push("", "## Fields", "", `Fields on filled forms: **${S.fields}** (${(S.fields / Math.max(1, filledForms.length)).toFixed(1)} per form).`, "", "| Status | Fields | Share |", "|---|---:|---:|");
for (const [k, v] of top(S.byStatus)) L.push(`| ${k} | ${v} | ${pct(v, S.fields)} |`);
L.push("", `- Filled by the extension: **${pct(S.byStatus.filled ?? 0, S.fields)}** of all fields.`, `- Required fields: ${S.required}; filled ${S.requiredFilled}; **left for the user: ${S.requiredLeftForUser} (${pct(S.requiredLeftForUser, S.required)})**.`);
L.push("", "| Decision | Fields | filled | needs_user | failed | skipped | already_filled |", "|---|---:|---:|---:|---:|---:|---:|");
for (const [k, v] of top(S.byDecision)) { const d = S.byDecisionStatus[k]; L.push(`| ${k} | ${v} | ${d.filled ?? 0} | ${d.needs_user ?? 0} | ${d.failed ?? 0} | ${d.skipped ?? 0} | ${d.already_filled ?? 0} |`); }
L.push("", "## Asks (fields left for the user), by reason / topic (top 30)", "", "| Topic | All | Required |", "|---|---:|---:|");
for (const [k, v] of top(S.asks)) L.push(`| ${k} | ${v} | ${S.asksRequired[k] ?? 0} |`);
L.push("", "## Skips", "", "| Reason | Fields |", "|---|---:|");
for (const [k, v] of top(S.skips, 15)) L.push(`| ${mdEsc(k)} | ${v} |`);
L.push("", "## Failed fills (decision:key)", "", "| Decision:key (control) | Fields |", "|---|---:|");
for (const [k, v] of top(S.failedByKey, 20)) L.push(`| ${mdEsc(k)} | ${v} |`);
L.push("", "## Time per form", "", `Median ${stats.seconds.median}s, mean ${stats.seconds.mean}s, max ${stats.seconds.max}s (all ${secAll.length} forms; includes page load, 3s settle and the fill). Filled forms: median ${stats.seconds.medianFilled}s.`);
L.push("", "## Per platform", "", "| Platform | Forms filled | Fields | Filled | Needs user | Failed | Required left | Ready | Median s |", "|---|---:|---:|---:|---:|---:|---:|---:|---:|");
for (const [k, v] of Object.entries(stats.perPlatform)) L.push(`| ${k} | ${v.forms} | ${v.fields} | ${v.filled} (${pct(v.filled, v.fields)}) | ${v.needsUser} | ${v.failed} | ${v.requiredLeft} of ${v.required} | ${v.ready} | ${v.seconds} |`);
L.push("", "## Fills the page cleared afterwards", "", `${cleared.length} text fills on ${new Set(cleared.map((c) => c.url)).size} forms were reported filled but were empty when the page was read 0.8 s later (other fills on the same forms were there). By field: ${top(cleared.reduce((o, c) => inc(o, c.name), {}), 12).map(([k, v]) => `${k} ${v}`).join(", ")}. On Greenhouse these are the fields its resume autofill sets (first/last name, email, phone): its parse request is blocked in this run, and the reset arrives after the fill.`);
L.push("", "## Safety", "", `- Requests blocked by the read-only guard: ${S.blocked.total} on ${S.blocked.forms} forms (analytics, consent and tracking beacons).`, `- Blocked requests that look like application sends (to the ATS, path with appl/submit/candidate): **${S.blocked.applicationSends.length}**.`, `- Forms whose URL changed during the fill: **${S.urlChanged.length}** (must be 0).`);
for (const s of S.blocked.applicationSends.slice(0, 20)) L.push(`  - ${s.company}: \`${s.request}\` (${s.url})`);
for (const u of S.urlChanged) L.push(`  - URL changed: ${u}`);
L.push("", "## Accuracy (see WRONG.md)", "", `Filled fields judged: ${A.filled}. Correct **${A.correct}** (${pct(A.correct, A.filled)}), wrong **${A.wrong}** (${pct(A.wrong, A.filled)}), unclear ${A.unclear} (${unclearPairs.size} unique pairs, listed in UNCLEAR.md).`);
L.push("", "## Per company (filled forms)", "", "| Company | Forms | Fields | Filled | Needs user | Required left | Ready |", "|---|---:|---:|---:|---:|---:|---:|");
for (const [k, v] of Object.entries(S.perCompany).sort((a, b) => a[0].localeCompare(b[0]))) L.push(`| ${k} | ${v.forms} | ${v.fields} | ${v.filled} | ${v.needsUser} | ${v.requiredLeft} | ${v.ready} |`);
writeFileSync(join(OUT, "STATS.md"), `${L.join("\n")}\n`);

const W = [];
W.push(`# Wrong fills in the live run`, "", `Generated ${S.generatedAt} by \`scripts/live1000-audit.mjs\` from ${rows.length} forms (${filledForms.length} filled).`, "");
W.push(`**Accuracy: ${A.wrong} wrong of ${A.filled} filled fields (${pct(A.wrong, A.filled)}); ${A.correct} correct (${pct(A.correct, A.filled)}); ${A.unclear} unclear.**`, "");
W.push("Deterministic rules judge each filled field; the (question, value) pairs no rule settles were judged by hand (judgments.json). A fill is wrong when a careful candidate (Pune, India; authorized to work in India only; needs sponsorship for the US; 5 years of experience; saved declines for EEO) would not have given that answer.", "");
W.push("| Class | Wrong fields |", "|---|---:|");
for (const [k, v] of top(A.wrongByRule, 50)) W.push(`| ${k} | ${v} |`);
// Root causes found for each class (the fixes are on the audit branch, with regression tests in test/live1000-fixes.test.ts).
const CAUSES = {
  option_not_offered: "A country question's react-select list picked \"India+91\" from the PHONE's country list, which was still open: `listNear()` in src/content/fill.ts took the only open list on the page (or every option on the page) without checking whose it was, and `fillCombobox` accepted the pick although the question's own widget showed nothing chosen. Fixed: lists named by, or sitting in, another dropdown's widget are never used; a react-select that shows no choice after the pick is reported as not filled.",
  eeo_not_decline: "A saved \"Decline to self identify\" was matched to \"Other\": the pronoun bucket DECLINE in src/shared/option-matcher.ts listed \"other\" and \"not listed\", and pronoun mapping runs before gender mapping. Fixed: those words removed; and decide() (src/content/classify.ts) never lets a saved decline land on a choice that does not decline.",
  residence_as_plan: "The profile residence (Pune / India) typed for where the candidate PLANS to work (\"Which country do you intend to work from?\", \"What city/country will you work from?\") or for her work location. Fixed with a guard in src/content/meaning.ts NOT_THIS_FACT: plans, intentions and work location are asked.",
  profile_country_citizenship: "\"Passport Country\" filled with the country of residence: the classify.ts country pattern matches any label with \"country\". Fixed with a guard in src/content/meaning.ts NOT_THIS_FACT (passport, citizenship, nationality, birth are asked).",
  profile_kind: "\"In which school are you enrolled…?\" for a graduate: the existing guard in safeToFill() had backspace characters where its \\b should be, so it never matched. Fixed (and src/shared/length-limit.ts had the same corruption); a test now rejects control characters in src/.",
};
W.push("", "## Root causes", "");
for (const [k] of top(A.wrongByRule, 50)) if (CAUSES[k]) W.push(`- **${k}**: ${CAUSES[k]}`);
W.push("", "## Every wrong fill", "");
const wrong = audited.filter((a) => a.verdict === "wrong").sort((a, b) => a.rule.localeCompare(b.rule) || a.company.localeCompare(b.company));
for (const a of wrong) {
  W.push(`### ${a.platform}:${a.company} — ${mdEsc(a.label).slice(0, 160)}`, "");
  W.push(`- URL: ${a.url}`, `- Job: ${mdEsc(a.title)}${a.jobLocation ? ` (${mdEsc(a.jobLocation)})` : ""}`, `- Question: ${mdEsc(a.label)}${a.hint ? ` (hint: ${mdEsc(a.hint).slice(0, 200)})` : ""}`, `- Control: ${a.control}${a.required ? ", required" : ""}; options: ${a.options?.length ? mdEsc(a.options.join(" / ")).slice(0, 400) : "(not recorded)"}`);
  W.push(`- Value: \`${mdEsc(a.value)}\`${a.chosen ? ` (chose "${mdEsc(a.chosen)}")` : ""}${a.onPage !== undefined ? `; on the page: \`${mdEsc(a.onPage)}\`` : ""}`, `- Decision: ${a.decision}${a.key ? ` (${a.key})` : ""}${a.matched ? `; matched saved question: "${mdEsc(a.matched)}"` : ""}`, `- Why wrong (${a.rule}): ${mdEsc(a.reason)}`, "");
}
writeFileSync(join(OUT, "WRONG.md"), `${W.join("\n")}\n`);

const U = [`# Unclear filled answers (${unclearPairs.size} unique pairs, ${A.unclear} fields)`, "", "Judge each in judgments.json by its key.", ""];
for (const e of [...unclearPairs.values()].sort((a, b) => b.n - a.n)) {
  const x = e.examples[0];
  U.push(`- [${e.n}] \`${e.pair}\``, `  - ${x.company} (${mdEsc(x.title)}): Q: ${mdEsc(x.label).slice(0, 300)}${x.hint ? ` | hint: ${mdEsc(x.hint).slice(0, 150)}` : ""}`, `  - value: ${mdEsc(x.value)}${x.chosen ? ` (chose "${mdEsc(x.chosen)}")` : ""}; options: ${x.options?.length ? mdEsc(x.options.join(" / ")).slice(0, 250) : "-"}; matched: ${mdEsc(x.matched ?? "")}`);
}
writeFileSync(join(OUT, "UNCLEAR.md"), `${U.join("\n")}\n`);

console.log(`${rows.length} forms (${filledForms.length} filled); ${S.fields} fields, ${S.byStatus.filled ?? 0} filled (${pct(S.byStatus.filled ?? 0, S.fields)}); required left for user ${pct(S.requiredLeftForUser, S.required)}; ready ${stats.formsReady}`);
console.log(`accuracy: wrong ${A.wrong} / ${A.filled} (${pct(A.wrong, A.filled)}), correct ${A.correct}, unclear ${A.unclear} (${unclearPairs.size} pairs)`);
console.log(`wrong by class: ${JSON.stringify(A.wrongByRule)}; url changed ${S.urlChanged.length}; application sends blocked ${S.blocked.applicationSends.length}`);
