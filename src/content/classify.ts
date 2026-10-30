/** Decides what goes into each field. Order matters: sensitive questions are checked before anything else,
 * so a question like "Are you legally authorized to work in the US?" can never be answered from a guess. */

import {
  NEVER_REMEMBER, type AnswerEntry, type Decision, type FieldDescriptor, type Profile, type ProfileKey, type SensitiveTopic, type WorkEntry,
} from "../shared/types";
import { bestOption, normalize, sameQuestionScore, yesNoOption } from "../shared/text";
import { hasExceptionClause, isCompanyOrPlaceSpecific, questionPolarity, sameScreeningQuestion } from "../shared/screening";
import { factDecision, hasConfirmedApplication, HEARD_ABOUT, isAppliedBeforeQuestion, isStartImmediatelyQuestion, isPreviousEmployeeQuestion, previousEmployerAnswer, isWorkModeQuestion, workModeAnswer, isTravelQuestion, travelAnswer, isLanguageQuestion, languageAnswer, skillsExperienceAnswer, type PageFacts } from "./facts";

const SENSITIVE: Array<[SensitiveTopic, RegExp]> = [
  // Checked first: identity numbers and signatures are never filled or remembered by the agent.
  ["identity", /personalausweis|steuer ?id|steueridentifikationsnummer|\biban\b|securite sociale|\bdni\b|\bnie\b|\bcpf\b|codice fiscale|\bbsn\b|aadhaa?r|\bpan\b( card| number| no)?|passport (number|no)|social security|\bssn\b|national (id|insurance)|bank account|\bifsc\b|account number|routing number|tax (id|identification)|driver'?s? licen[cs]e (number|no)/],
  // A typed name that signs something ("Signed (full name)", "Declaration: Full name", "I hereby declare… Name of the
  // candidate:") is a signature: the user types it.
  ["signature", /unterschrift|assinatura|handtekening|signature|\be ?sign(ature)?\b|sign here|\bsigned\b|type your (full )?(legal )?name|electronically sign|\bdeclaration\b|hereby declare|\backnowledg\w*\b.*\bname\b|\binitials\b/],
  ["sponsorship", /sponsor|visa|visum/],
  ["work_authorization", /\bwork permit\b|arbeitserlaubnis|aufenthaltstitel|arbeitsgenehmigung|permis de travail|autorisation de travail|autorizacion de trabajo|permiso de trabajo|autorizacao de trabalho|permesso di (lavoro|soggiorno)|werkvergunning|authori[sz]ed to work|work authori[sz]ation|right to work|eligible to work|legally (able|permitted|entitled)/],
  ["salary", /gehalt|salaire|salari|retribuzione|stipendio|pretension|salary|compensation|\bctc\b|pay expectation|expected pay|desired pay|remuneration/],
  ["notice_period", /when (are|would|will|could) you (be )?available|available to start|available for employment|^date available$|earliest (date )?(you|to) (could |would |can )?start|kundigungsfrist|eintrittstermin|fruhester eintritt|preavis|disponibilite|preaviso|disponibilidad|fecha de incorporacion|aviso previo|preavviso|opzegtermijn|notice period|start date|when can you (start|join)|earliest (start|joining)|availability to start|when would be your earliest availability|earliest availability|can you start (immediately|right away)|are you (able|available) to start (immediately|right away)|start (immediately|right away)/],
  ["relocation", /relocat|umzug|umziehen|demenag|reubic|mudanza|trasferi|verhuiz/],
  ["pronouns", /\bpronouns?\b/],
  ["sexual_orientation", /\bsexual orientation\b|\blgbt|\bmember of the (lesbian|lgbt)/],
  ["transgender", /\btransgender\b|sex.*assigned at birth/],
  ["gender", /gender|geschlecht|\bgenre\b|\bsexe\b|genero|\bsexo\b|\bsesso\b|geslacht/],
  ["race", /\brace\b|ethnic|hispanic|latin[oax]|\betnia\b|etnicidad|origine ethnique/],
  ["veteran", /veteran|military|armed forces/],
  ["accommodation", /\baccommodat|ajustements?|adjustments? (to|during|for)|recursos ou adaptacoes|necessidade de acessibilidade/],
  ["disability", /disabilit|behinderung|schwerbehindert|handicap|discapacidad|deficiencia|disabile/],
  ["age", /geburtsdatum|\balter\b|date de naissance|fecha de nacim(i)?ento|\bedad\b|data de nascimento|\bidade\b|data di nascita|geboortedatum|date of birth|\bdob\b|\bage\b|birth ?date|18 years of age|18 years old|over the age of 18|current age|how old are you|what is your age/],
  ["criminal", /vorstrafe|fuhrungszeugnis|casier judiciaire|antecedentes penales|antecedentes criminais|casellario|convict|criminal|felony|background check/],
  ["consent", /datenschutz|einwilligung|ich (stimme|akzeptiere|bestatige|willige)|\bj accepte\b|je (certifie|consens|confirme)|confidentialite|\bacepto\b|consiento|privacidad|\baceito\b|\bconcordo\b|privacidade|\bacconsento\b|ik ga akkoord|\brgpd\b|\bdsgvo\b|\bi (certify|agree|acknowledge|consent|confirm|understand)\b|privacy (policy|notice)|terms (of|and)|data processing|gdpr/],
];

/** Profile facts, matched on the field's label, name, autocomplete hint and placeholder. */
const PROFILE_RULES: Array<[ProfileKey | "fullName", RegExp]> = [
  // Abbreviations only as whole words: "fullname" must not match "lname".
  // "First Name and Last Name" is one box for both.
  ["fullName", /first (name )?(and )?(last|family|sur) ?name|name and surname/],
  ["firstName", /first ?name|given ?name|^(what is |whats )?your preferred name$|^preferred name$|\bfname\b|forename|vorname|\bprenom\b|^nombre$|primer nombre|primeiro nome|voornaam/],
  ["lastName", /last ?name|family ?name|surname|\blname\b|nachname|familienname|nom de famille|^nom$|apellido|sobrenome|cognome|achternaam/],
  ["fullName", /^(full )?name$|^your name$|full name|legal name|vollstandiger name|vor und nachname|nom complet|nombre completo|nombre y apellidos|nome completo|volledige naam/],
  ["email", /e ?mail|courriel|correo|メール|ईमेल|이메일|电子邮件|電子郵件/],
  ["phone", /phone|mobile|\btel\b|contact number|telef|\bhandy|rufnummer|portable|movil|celular|cellulare|mobiel|電話|电话|फ़?ोन|मोबाइल|전화/],
  ["linkedin", /linked ?in/],
  ["github", /git ?hub/],
  ["portfolio", /portfolio|personal (web)?site|^website$|website url|blog/],
  ["resumeUrl", /\b(?:resume|cv|curriculum\s*vitae)\s*[\(/]?\s*(?:url|link|drive|google\s*drive|doc|web\s*link|online)\b|\b(?:link|url)\s*(?:to|for)?\s*(?:your\s*)?(?:resume|cv|curriculum\s*vitae)\b|\b(?:google\s*drive|drive\s*link|cloud\s*link)\b.*\b(?:resume|cv)\b/i],
  ["currentCompany", /aktueller arbeitgeber|derzeitiger arbeitgeber|employeur actuel|entreprise actuelle|empresa actual|empresa atual|azienda attuale|huidige werkgever|current (company|employer)|present employer|(most )?recent employer|current or most recent (company|employer)|organi[sz]ation name/],
  ["currentTitle", /current (title|role|position|designation)|job title|aktuelle position|berufsbezeichnung|poste actuel|intitule du poste|cargo actual|puesto actual|cargo atual|ruolo attuale|huidige functie/],
  ["graduationYear", /graduat\w* (year|date)|year of graduation|class of|quelle annee|annee (de|d) (diplom|obtention)|abschlussjahr|jahr des abschlusses|ano de (formatura|conclusao|graduacao|graduacion|egreso)|anno di (laurea|diploma)/],
  // Only total experience. "Years of experience with Python" is a different question and goes to the user.
  ["experienceYears", /total (years? of )?(work |professional )?experience|^years of (professional |work )?experience$|^experience (in )?years$/],
  ["degree", /\bdegree\b|qualification|abschluss|diplome|titulacion|formacao|laurea|opleiding/],
  ["discipline", /discipline|major|field of study|speciali[sz]ation|studiengang|studienfach|filiere|carrera|indirizzo di studio|studierichting/],
  ["school", /school|universi|college|institution|hochschule|ecole|escuela|faculdade|istituto|hogeschool/],
  ["educationLevel", /\b(highest level of education|highest education|level of education completed|possui curso superior|completed bachelor s degree)\b/],
  ["timezone", /\b(time ?zone|est \/ mst)\b/],
  // Address Line 2 must be checked BEFORE address line 1 and full address:
  ["addressLine2", /\b(?:address\s*(?:line\s*)?2|address\s*2|apt(?:,?\s*suite|\s*#)?|suite\b|unit\b|apartment|bldg\b|floor\b)/i],
  ["addressLine1", /\b(?:address\s*(?:line\s*)?1|address\s*1|street\s*address)\b/i],
  // Full address before postal code:
  ["address", /\b(full.*address|complete\s*address|current address|permanent address|mailing address|^address$)\b/i],
  ["postalCode", /^(?!.*\b(street address|full.*address)\b).*\b(zip( code)?|postal code|pin ?code)\b/],
  // Where both city and state are requested, it is a location question:
  ["location", /\b(?:city\s*(?:and|,|\/|or)?\s*state|state\s*(?:and|,|\/|or)?\s*city)\b/],
  ["state", /^(?!.*\bcity\b).*\b(state\s*\/\s*province|state or province|u\.s\.\s*state|canadian province|^state$|^province$|canton|departement)\b/],
  // Where both city and country are requested in one field ("City, Country" or "country and city"), it is a location question:
  ["location", /\b(?:city\s*country|country\s*city|city\s*(?:and|,|\/)\s*country|country\s*(?:and|,|\/)\s*city)\b/],
  ["country", /country|^land$|\bpays\b|\bpais\b|\bpaese\b/],
  // Where the user WANTS to work, before where they live.
  ["preferredLocations", /preferred (job |work )?(location|cit(y|ies))|location preference|desired (job |work )?location|where would you (like|prefer) to work|bevorzugte[rn]? (arbeits)?ort|lieu souhaite|ubicacion (deseada|preferida)/],
  ["location", /\bcity\b|location|where are you (currently )?(based|located)|where do you (currently )?(live|reside)|town|wohnort|\bstadt\b|\bort\b|\bville\b|ciudad|localidad|cidade|\bcitta\b|woonplaats/],
];

const AUTOCOMPLETE: Record<string, ProfileKey | "fullName"> = {
  "given-name": "firstName",
  "family-name": "lastName",
  name: "fullName",
  email: "email",
  tel: "phone",
  "tel-national": "phone",
  "address-level2": "location",
  "country-name": "country",
  country: "country",
  organization: "currentCompany",
  "organization-title": "currentTitle",
  "address-line1": "addressLine1",
  "address-line2": "addressLine2",
  "street-address": "addressLine1",
  "postal-code": "postalCode",
  "address-level1": "state",
};

/** Answers reused for a new question only when it is clearly the same question. */
const ANSWER_MATCH_THRESHOLD = 0.75;

/** Statements announcing purpose of data collection must not turn a question into a sensitive topic. */
const PURPOSE_DISCLOSURE = /\b(?:used (?:solely )?for|for (?:compensation|employment|compliance|tax|reporting|record|administrative) purposes)\b/i;

export function sensitiveTopic(field: FieldDescriptor): SensitiveTopic | undefined {
  const labelWithoutPurpose = field.label
    .split(/(?<=[.?!])\s+/)
    .filter((s) => !PURPOSE_DISCLOSURE.test(s))
    .join(" ");
  const text = normalize(`${labelWithoutPurpose} ${field.name}`);
  for (const [topic, pattern] of SENSITIVE) {
    if (pattern.test(text)) return topic;
  }
  return undefined;
}

/** Questions asked in many wordings whose answer does not depend on the job: answered once, reused everywhere.
 * ("How did you hear about this job?" / "…about this opportunity at Grafana?" / "Where have you learned about us?") */
const SAME_ANSWER_EVERYWHERE: RegExp[] = [HEARD_ABOUT];

function sameKindOfQuestion(a: string, b: string): boolean {
  const x = normalize(a);
  const y = normalize(b);
  return SAME_ANSWER_EVERYWHERE.some((p) => p.test(x) && p.test(y));
}

/** The question an answer is saved under. A field in someone else's section is saved with that section
 * ("References › Name"), so the referee's name can never come back as the user's own "Name". */
export function questionKey(field: Pick<FieldDescriptor, "label" | "section">): string {
  return field.section && OTHER_PERSON_SECTION.test(normalize(field.section)) ? `${field.section} › ${field.label}` : field.label;
}

/** A single tick box, or choices that include both a Yes and a No. */
function yesNoChoice(field: FieldDescriptor): boolean {
  if (field.control === "checkbox") return true;
  return field.options.length > 0 && !!yesNoOption(field.options, "Yes") && !!yesNoOption(field.options, "No");
}

export function findAnswer(field: FieldDescriptor, answers: AnswerEntry[], topic?: SensitiveTopic): AnswerEntry | undefined {
  const label = field.label ? questionKey(field) : "";
  if (!label) return undefined;

  const labelPolarity = questionPolarity(label);

  let best: AnswerEntry | undefined;
  let bestScore = 0;
  for (const entry of (answers ?? [])) {
    // A sensitive answer is only reused for a question about the same topic.
    const entryTopic = entry.topic ?? sensitiveTopic({ label: entry.question, name: "", control: "text", required: false, options: [], autocomplete: "", placeholder: "", key: "" });
    if (topic && entryTopic !== topic) continue;

    // Strict polarity: a saved answer is reused only for a question with the same polarity.
    if (questionPolarity(entry.question) !== labelPolarity) continue;

    // An exact match always reuses the user's saved answer to this exact question.
    if (normalize(entry.question) === normalize(label)) {
      bestScore = 1;
      best = entry;
      break;
    }

    // A general screening answer or fuzzy match must never match company/place-specific questions or questions with exceptions.
    if (isCompanyOrPlaceSpecific(label) || hasExceptionClause(label)) continue;

    // A common screening answer is a bare Yes/No: reused only where the form asks for exactly that.
    const score = sameKindOfQuestion(entry.question, label)
      || yesNoChoice(field) && sameScreeningQuestion(entry.question, label)
      ? 1 : sameQuestionScore(entry.question, label);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  if (bestScore >= ANSWER_MATCH_THRESHOLD) return best;
  return topic ? sameFactAnswer(field, answers, topic) : undefined;
}

/** Facts about the person that do not depend on the job, asked in many wordings ("Gender" / "What is your gender
 * identity?" / "How do you identify?"). The user's answer is reused only where the form offers a list of choices and
 * the answer is one of them, never typed as free text, and never a bare yes/no (a "Yes" to one yes/no question is
 * not a "Yes" to another). */
const SAME_FACT_TOPICS = new Set<SensitiveTopic>(["gender", "race", "veteran", "disability", "sexual_orientation"]);
const BARE_YES_NO = /^(yes|no|y|n|true|false|oui|non|si|ja|nein|sim|nao)$/;

function sameFactAnswer(field: FieldDescriptor, answers: AnswerEntry[], topic: SensitiveTopic): AnswerEntry | undefined {
  if (!SAME_FACT_TOPICS.has(topic) || !field.options.length) return undefined;
  return [...answers]
    .filter((a) => a.topic === topic && !BARE_YES_NO.test(normalize(a.answer)))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .find((a) => bestOption(field.options, a.answer, 0.75) !== undefined);
}

export function profileValue(profile: Profile, key: ProfileKey | "fullName"): string {
  if (key === "fullName") return `${profile.firstName} ${profile.lastName}`.trim();
  if (key === "addressLine1") return (profile.addressLine1 || profile.address || "").trim();
  if (key === "addressLine2") return (profile.addressLine2 ?? "").trim();
  if (key === "address") return (profile.address || profile.addressLine1 || "").trim();
  return (profile[key] ?? "").trim();
}

/** Uploads that are not the resume, even when the question mentions it. */
const OTHER_DOCUMENT = /portfolio|cover ?letter|transcript|writing sample|work sample|code sample|certificat|photo|picture|headshot|passport|id proof|marksheet|mark sheet|recommendation|reference letter|anschreiben|zeugnis|lettre de motivation|carta de (presentacion|motivacion)/;

/** "Phone Device Type", "Country Phone Code", "Extension": about the phone, but not the number. */
const NOT_THE_NUMBER = /device type|phone type|type of phone|country (phone )?code|phone code|dial(l)?ing code|extension|\bext\b/;

// --- work history (repeating "My Experience" blocks) -----------------------------------------------------------
/** Order matters: "I currently work here" before dates, "Role description" before "Role". */
const WORK_RULES: Array<[keyof WorkEntry, RegExp]> = [
  ["current", /currently (work|employed)|i (currently )?work here|current (job|role|position|employer)|present|bis heute|actuel|actualmente/],
  ["summary", /description|responsibilit|summary|achievements|duties|beschreibung|taches|funciones/],
  ["start", /\bfrom\b|start|begin|\bvon\b|depuis|debut|desde|inicio/],
  ["end", /\bto\b|\bend\b|until|\bbis\b|\bfin\b|hasta|termino/],
  ["company", /company|employer|organi[sz]ation|arbeitgeber|unternehmen|firma|entreprise|empresa|azienda|bedrijf/],
  ["location", /location|city|\bort\b|ville|ciudad|cidade|citta/],
  ["title", /title|position|role|designation|berufsbezeichnung|poste|cargo|ruolo|functie/],
];

/** The user's jobs, newest first. Without a work history, the current job from the profile is the first block. */
export function workEntries(profile: Profile): WorkEntry[] {
  if (profile.workHistory?.length) return profile.workHistory;
  if (!profile.currentTitle && !profile.currentCompany) return [];
  return [{ title: profile.currentTitle, company: profile.currentCompany, location: "", start: "", end: "", current: true, summary: "" }];
}

function workDecision(field: FieldDescriptor, profile: Profile): Decision | undefined {
  const index = field.workBlock;
  if (index === undefined) return undefined;
  const text = normalize(`${field.label} ${field.name.replace(/([a-z])([A-Z])/g, "$1 $2")}`);
  const part = WORK_RULES.find(([, pattern]) => pattern.test(text))?.[0];
  if (!part) return undefined;
  const entry = workEntries(profile)[index];
  if (!entry) {
    return field.required ? { kind: "ask", reason: "missing_profile_value" } : { kind: "skip", reason: `no job #${index + 1} in your work history` };
  }
  if (part === "current") return { kind: "work", index, part, value: entry.current ? "Yes" : "No" };
  if (part === "end" && entry.current) return { kind: "skip", reason: "current job: no end date" };
  const value = String(entry[part] ?? "").trim();
  if (value) return { kind: "work", index, part, value };
  return field.required ? { kind: "ask", reason: "missing_profile_value" } : { kind: "skip", reason: `no ${part} for job #${index + 1}` };
}

/** Questions about SOMEONE ELSE (emergency contact, referee, referrer, manager…): the user's own name, email or
 * phone must never go there, even when the field is an email or phone box. */
// Word starts matter: "preferred" contains "referr", "management" is not "manager".
const OTHER_PERSON = /\bemployee\b|colaborador|funcionari|empleado|mitarbeiter|emergency|next of kin|\bkin\b|\breferr|\breferee|\breference|\brecommender|manager|supervisor|reporting to|recruiter|spouse|\bpartner\b|\bparent|guardian|father|mother|nominee|contact person|\bfriend|colleague|notfall|ansprechpartner|vorgesetzt|referenz|personne a contacter|urgence|emergencia|referencia|responsavel|emergenza|husband|\bwifes?\b|sibling|brother|sister|\bson\b|daughter|relative|team leads?\b|advis[oe]r|mentor|professor|\bhr (contact|email|manager|person|representative)\b|human resources|point of contact|\bpoc\b|hiring|interviewer/;
/** "Husband's phone", "Company's email": a possessive names someone else, unless it is the user ("candidate's name"). */
const SOMEONE_ELSES = /\b(?!(candidate|applicant|student|user|your|my|company|employer|organi[sz]ation|school|universit\w*|college|institut\w*)['’])[a-z]+['’]s (e-?mail|phone|mobile|name|number|address|contact|details)\b/i;

/** Section headings that announce someone else's details. Narrower than OTHER_PERSON: headings such as
 * "Manager approval" are rare, but "References" and "Emergency contact" sections are common. */
const OTHER_PERSON_SECTION = /emergency|next of kin|\breferences?\b|\breferee|\breferr|contact person|notfall|referenz|urgence|emergencia|referencia|emergenza|supervisor|manager|spouse|partner|parent|guardian|family|relative|nominee|husband|\bwifes?\b/;

/** A yes/no question ("Are you comfortable commuting to our office location?", "Is your country of citizenship one
 * of…") or a choice about the job ("Which location are you applying for?") is never answered with a profile fact,
 * whatever words it shares with one. Seen on real forms, in every case below. */
/* Never a profile fact: yes/no questions, follow-ups to an earlier answer ("If you selected international, what
 * location(s)?"), details of a past job at this company ("…please list your work email address"), part of a value
 * ("Email address without domain"), "What is your experience with GitHub Copilot?", requests to describe something
 * ("Describe any training or qualifications…") and full street addresses (a city is not one). */
const NOT_A_FACT = /^(are|is|do|does|did|have|has|had|will|would|can|could|should|were|was|may|might|shall|sind|haben|hast|bist|konnen|wurden|etes|avez|pouvez|seriez|esta|estas|tiene|tienes|puede|eres|voce|tem)\b|\b(applying|apply) (for|to)\b|^(?!(which|what)\b).*\bdid you attend\b|\binterested in\b|\bif (different|yes|so)\b|^se sim\b|^si oui\b|^wenn ja\b|^if (you )?(selected|chose|choose|answered|picked|ticked|checked)\b|\bif you (have )?(previously|ever|formerly) (worked|been employed)\b|\b(work|company|corporate) email\b|without (the )?domain|before the @|\bexperience (with|in|using|of)\b|^(please )?(briefly )?(describe|tell us|explain|elaborate)\b|\bexamples of (your )?work\b|\bvisual merchandising\b|\b(want|wish|plan|hope|like) to (attend|study|join|work)\b|\b(target|preferred|desired|dream|future)\b (school|universit\w*|college|institut\w*|compan\w*|employer|job|role|position|title)|\bhigh school\b|\bsecondary\b|\b(10th|12th|tenth|twelfth|ssc|hsc|matric\w*|intermediate)\b|\bbirth\b|\bcitizenship\b|\bcountry code\b|\bdial\w*\b|\bpass ?(word|code)\b|\bpin\b|\b(event|fair|conference|meetup|webinar|info session)\b/;
/** "…3 days a week in the office, are you able to commute to the location?" asks yes or no, wherever the "are you" is.
 * Questions that open with a question word ("Where are you located?") still ask for a fact. */
const YES_NO_INSIDE = /\b(are|do|would|will|can|could|should|have) you\b/;
const OPENS_WITH_QUESTION_WORD = /^(what|where|which|how|when|who|whom|please|your|current|in what|in which|from where)\b/;
/** Long questions ("Share 2–3 links to technical content you created… add your LinkedIn") want more than one fact. */
const MAX_FACT_WORDS = 16;

/** "Would you like to include your LinkedIn profile, personal website or blog?" asks for a link, not a yes or no. */
const LINK_INVITE = /^(would you like to |do you want to |feel free to |please |you can |optionally )?(include|share|add|provide|link|paste|enter)\b.*\b(linked ?in|git ?hub|website|portfolio|blog|resume|cv)\b/;

/** Questions that never take one of the user's profile facts, whatever they seem to ask: yes/no questions, choices
 * about the job, long questions, and questions about someone else (by their words or by their section). */
export function notAProfileFact(field: FieldDescriptor): boolean {
  const labelWithoutPurpose = field.label
    .split(/(?<=[.?!])\s+/)
    .filter((s) => !PURPOSE_DISCLOSURE.test(s))
    .join(" ");
  const asked = normalize(labelWithoutPurpose);
  if (NOT_A_FACT.test(asked)) return true;
  if (YES_NO_INSIDE.test(asked) && !OPENS_WITH_QUESTION_WORD.test(asked)) return true;
  if (asked.split(" ").length > MAX_FACT_WORDS) return true;
  // Open-ended lists of alternative links ("etc.", "other..") must not be guessed as a single profile fact:
  if (/\b(?:etc|other\w*)\b/i.test(field.label) && /(?:linked ?in|git ?hub|website|portfolio|twitter|\bx\b|reddit|youtube)/i.test(field.label)) return true;
  if (OTHER_PERSON.test(normalize(`${field.label} ${field.name.replace(/([a-z])([A-Z])/g, "$1 $2")}`)) || SOMEONE_ELSES.test(field.label)) return true;
  return !!field.section && OTHER_PERSON_SECTION.test(normalize(field.section));
}

export function profileKeyFor(field: FieldDescriptor): ProfileKey | "fullName" | undefined {
  const labelWithoutPurpose = field.label
    .split(/(?<=[.?!])\s+/)
    .filter((s) => !PURPOSE_DISCLOSURE.test(s))
    .join(" ");
  const asked = normalize(labelWithoutPurpose);
  if ((field.control === "text" || field.control === "url") && LINK_INVITE.test(asked)) {
    // Open-ended lists of alternative links ("etc.", "other..") must not be guessed; ask the user:
    if (/\b(?:etc|other\w*)\b/.test(asked) && /(?:linked ?in|git ?hub|website|portfolio)/.test(asked)) return undefined;
    // Strip optional side mentions (e.g. "(portfolio optional)" or "; a portfolio is optional"):
    const primary = asked.replace(/\([^)]*optional[^)]*\)/g, "").replace(/;\s*a portfolio is optional/g, "");
    const first = /linked ?in|git ?hub|website|portfolio|blog|resume|cv/.exec(primary)?.[0] ?? "";
    if (!first) return undefined;
    return /linked/.test(first) ? "linkedin" : /git/.test(first) ? "github" : /resume|cv/.test(first) ? "resumeUrl" : "portfolio";
  }
  if (field.control === "url" && /\b(resume|cv|curriculum\s*vitae)\b/i.test(asked)) {
    return "resumeUrl";
  }
  if (notAProfileFact(field)) return undefined;
  const hint = AUTOCOMPLETE[field.autocomplete.toLowerCase()];
  if (hint) return hint;
  if (field.control === "email") return "email";
  if (field.control === "tel") return "phone";
  // Split camelCase ids ("fullName" → "full Name") so they read as words.
  const name = field.name.replace(/([a-z])([A-Z])/g, "$1 $2");
  const text = normalize(`${field.label} ${name} ${field.placeholder}`);
  const labelOnly = normalize(field.label);
  for (const [key, pattern] of PROFILE_RULES) {
    if (key === "phone" && NOT_THE_NUMBER.test(text)) continue;
    if (key === "fullName" ? pattern.test(labelOnly) : pattern.test(text)) return key;
  }
  return undefined;
}

export function decide(field: FieldDescriptor, profile: Profile, answers: AnswerEntry[], page?: PageFacts): Decision {
  if (isStartImmediatelyQuestion(field.label)) {
    // An answer the user saved for this kind of question (never a notice period such as "30 days"), else the quick answer.
    const entry = findAnswer(field, answers, "notice_period");
    if (entry && isStartImmediatelyQuestion(entry.question)) {
      const val = field.options.length ? yesNoOption(field.options, entry.answer) ?? bestOption(field.options, entry.answer) : entry.answer;
      if (val) return { kind: "answer", value: val, question: entry.question };
    }
    const quick = factDecision(field, profile, "notice_period", page);
    return quick ?? { kind: "ask", reason: "sensitive", topic: "notice_period" };
  }
  if (isAppliedBeforeQuestion(field.label)) {
    if (hasConfirmedApplication(page)) {
      let val = "Yes";
      if (field.options.length) {
        const match = yesNoOption(field.options, val) ?? bestOption(field.options, val);
        if (match) val = match;
      }
      return { kind: "answer", value: val, question: "Tracker › confirmed previous application" };
    }
    return { kind: "ask", reason: "unknown" };
  }

  const topic = sensitiveTopic(field);
  // Identity numbers and signatures: the user types them on the page; optional ones stay blank.
  if (topic && NEVER_REMEMBER.has(topic)) {
    return field.required ? { kind: "ask", reason: "sensitive", topic } : { kind: "skip", reason: `${topic}: entered by you only` };
  }
  if (topic) {
    const entry = findAnswer(field, answers, topic);
    if (entry) {
      let val = entry.answer;
      if (field.options.length) {
        const match = yesNoOption(field.options, val) ?? bestOption(field.options, val);
        if (match) val = match;
      }
      return { kind: "answer", value: val, question: entry.question };
    }
    // The user's quick answers, only where the question clearly is that question (see facts.ts).
    const someoneElse = OTHER_PERSON.test(normalize(field.label)) || SOMEONE_ELSES.test(field.label)
      || (!!field.section && OTHER_PERSON_SECTION.test(normalize(field.section)));
    return (someoneElse ? undefined : factDecision(field, profile, topic, page)) ?? { kind: "ask", reason: "sensitive", topic };
  }

  if (field.control === "file") {
    const text = normalize(`${field.label} ${field.name}`);
    // "Autofill from resume" helpers re-parse the resume and may overwrite fields: leave them alone.
    if (/autofill|auto fill|parse/.test(text)) return { kind: "skip", reason: "resume autofill helper" };
    // "Please attach your portfolio if it is not linked in your resume" asks for a portfolio, not the resume
    // (seen on a real form). Another document named in the question wins, unless the question starts with the resume.
    const label = normalize(field.label);
    if (OTHER_DOCUMENT.test(text) && !/^(upload )?(your )?(resume|cv|curriculum|lebenslauf|curriculo)\b/.test(label)) {
      return field.required ? { kind: "ask", reason: "unknown" } : { kind: "skip", reason: "optional attachment (not your resume)" };
    }
    if (/resume|\bcv\b|curriculum|lebenslauf|curriculo/.test(text)) {
      return profile.resume ? { kind: "resume" } : { kind: "ask", reason: "missing_profile_value" };
    }
    return field.required ? { kind: "ask", reason: "unknown" } : { kind: "skip", reason: "optional attachment" };
  }

  if (page?.url && isPreviousEmployeeQuestion(field)) {
    const prev = previousEmployerAnswer(field, profile, page);
    if (prev) return prev;
  }
  if (isWorkModeQuestion(field)) {
    const wm = workModeAnswer(field, profile);
    if (wm) return wm;
  }
  if (isTravelQuestion(field)) {
    const tr = travelAnswer(field, profile.facts);
    if (tr) return tr;
  }
  const la = languageAnswer(field, profile);
  if (la) return la;

  const sk = skillsExperienceAnswer(field, profile);
  if (sk) return sk;

  // Work-experience blocks come from the work history, never from an answer given for another job.
  const work = workDecision(field, profile);
  if (work) return work;

  const remembered = findAnswer(field, answers);
  if (remembered) {
    let val = remembered.answer;
    if (field.options.length) {
      const match = yesNoOption(field.options, val) ?? bestOption(field.options, val);
      if (match) val = match;
    }
    return { kind: "answer", value: val, question: remembered.question };
  }
  const quick = factDecision(field, profile, undefined);
  if (quick) return quick;

  // Yes/no and multiple-choice questions are never answered from profile text ("Email me alerts?" is not an email field).
  if (field.control === "checkbox" || field.control === "radio" || field.control === "checkbox_group") {
    return field.required ? { kind: "ask", reason: "unknown" } : { kind: "skip", reason: "optional choice" };
  }

  const key = profileKeyFor(field);
  if (key) {
    const value = profileValue(profile, key);
    if (value) return { kind: "profile", key, value };
    if (key === "addressLine2" && !field.required) {
      return { kind: "skip", reason: "optional address line 2 empty" };
    }
    return field.required ? { kind: "ask", reason: "missing_profile_value" } : { kind: "skip", reason: `no ${key} in profile` };
  }

  // Never invent an answer: unknown required questions go to the user, unknown optional ones stay blank.
  return field.required ? { kind: "ask", reason: "unknown" } : { kind: "skip", reason: "optional, not in profile" };
}
