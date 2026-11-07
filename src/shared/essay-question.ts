/** Which free-text boxes are real essay questions, the only ones an AI draft is offered for.
 *
 * A multi-line box is not enough: real forms (round 7, 222 Greenhouse boards) use text areas for salary, visa
 * sponsorship, start dates, portfolio links, pronouns, "How did you hear about us?" and yes/no questions. An AI draft
 * there would be invented (a salary, a visa status, a referrer), so those are left to the user's own facts. And a
 * one-line box can still be an essay ("Please share 3-5 sentences explaining your interest …"). Pure, so tested on the
 * real wordings. */

/** Facts about the candidate that only the candidate knows, or links: never written by AI. */
const FACTUAL = new RegExp(
  [
    String.raw`\b(?:links?|urls?|linkedin|github|gitlab|website|web ?site|portfolio|blog|behance|dribbble)\b`,
    String.raw`\bhow did you (?:hear|learn|find out|come across)\b|\bwhere did you (?:hear|see|find)\b|\brefer(?:red|ral|rer)\b`,
    String.raw`\b(?:salary|compensation|pay range|base pay|ctc|ote|on target earnings|equity|bonus)\b`,
    String.raw`\b(?:visa|sponsor(?:ship)?|work (?:permit|authori[sz]ation)|authori[sz]ed to work|citizenship|passport|immigration)\b`,
    String.raw`\b(?:start date|earliest (?:possible )?(?:start|date)|notice period|available to start|availability)\b`,
    String.raw`\bpronouns?\b|\bhow (?:would|should) (?:you|we) (?:like to )?(?:be )?address`,
    String.raw`\b(?:family members?|relatives?|friends?|significant others?|spouse|partner)\b[^.?]{0,60}\b(?:work|employ)`,
    String.raw`\bconflicts? of interest\b|\bnon[- ]?compete\b|\bagreements? with (?:a |your )?(?:current|former)\b`,
    String.raw`\b(?:current|most recent|present) (?:job )?(?:title|employer|company|location|city|address)\b|\bwhich is your current\b|\bwhat is your current location\b`,
    String.raw`\bat which (?:organi[sz]ations?|compan(?:y|ies)|employers?)\b|\bwhich compan(?:y|ies)\b`,
    String.raw`\b(?:mm\/dd|dd\/mm|yyyy)\b`,
    String.raw`\b(?:offsites?|onsite|on-site|in[- ]person|office|relocat\w*|commute)\b`,
  ].join("|"),
  "i",
);

/** Words that ask for an account of the candidate's own experience or motivation. */
const ESSAY_ASK = /\b(?:describe|tell (?:us|me)|explain|walk (?:us|me) through|share (?:an?|one|your|with us (?:an?|your))\s+(?:\w+\s+){0,2}(?:example|experience|story|project|approach|thoughts?|interest|reasons?|motivation)|give (?:us )?an example|what (?:excites|interests|motivates|attracts|drew|draws) you|why (?:do|are|would) you|why (?:this|our|us)|what makes you|how (?:do|did|would) you (?:approach|handle|solve|design|prioriti[sz]e|measure|build|lead|manage)|proud|accomplishment|achievement|challenge|cover letter|statement of interest|summary of qualifications|key strengths|additional information|anything else)\b/i;

/** "3-5 sentences", "in two sentences", "in 150 words": a length for prose is itself a sign of an essay. */
const PROSE_LENGTH = /\b\d+\s*(?:-|–|to)\s*\d+\s+sentences\b|\bin (?:a few|one|two|three|four|five|\d+) (?:sentences|words)\b|\b\d+\s*words?\b|\b(?:max(?:imum)?|up to|under|no more than)\s+\d+\s+(?:words|characters)\b/i;

/** Questions that start like a yes/no question ("Are you …", "Do you have 5+ years …"). */
const YES_NO_START = /^\s*(?:are|is|will|would|do|does|did|can|could|have|has|were|was)\s+(?:you|there|your)\b/i;

/** A bare follow-up ("If yes, please describe:", "If (f) Other, please explain:"): no subject to write about. */
const BARE_FOLLOW_UP = /^\s*(?:if\b[^.?:]{0,50}[,:]?\s*(?:please\s+)?(?:describe|explain|specify|elaborate|list|tell us|provide (?:details|more information))\b[^a-z]*$|if (?:yes|no|not|so|other)\b)/i;

/** Whether an AI draft may be offered for this question. `multiLine` is true for a text area. */
export function isEssayQuestion(label: string, multiLine: boolean): boolean {
  const text = label.replace(/\s+/g, " ").trim();
  if (text.length < 12) return false;
  if (FACTUAL.test(text)) return false;
  if (BARE_FOLLOW_UP.test(text)) return false;
  const asks = ESSAY_ASK.test(text) || PROSE_LENGTH.test(text);
  // "Are you able to attend … ? If not, please elaborate" is a fact about the candidate, not an essay; "Have you led a
  // team? If yes, describe your experience" asks for an account, so it stays.
  if (YES_NO_START.test(text) && !asks) return false;
  if (asks) return true;
  // Other multi-line questions ("What does great customer success look like to you?") are open questions; a one-line
  // box without an essay ask is a short fact.
  return multiLine && /\?|\b(?:what|how|which)\b/i.test(text);
}
