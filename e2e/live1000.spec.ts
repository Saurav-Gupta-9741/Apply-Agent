/** The 1,000-form real-life run: LIVE application forms (Greenhouse, Ashby), filled by the extension's own fill code,
 * the same RUN message (review, fill only) the panel's "Fill this application" sends. Every field is recorded: the
 * question, its options, what the extension decided, the value it used and the status, plus the value actually on the
 * page afterwards. The accuracy audit (scripts/live1000-audit.mjs) judges each filled answer.
 *
 * Nothing reaches the employers: a fictional candidate, Submit is never pressed (review mode, fill only), and every
 * request from these pages other than a plain GET is blocked and logged. One page every few seconds per run.
 *
 *   LIVE1000=1 LIVE1000_JOBS=reports/live1000/jobs-a.json LIVE1000_OUT=reports/live1000/results-a.jsonl \
 *     npx playwright test e2e/live1000.spec.ts --reporter=line
 * Resumable: jobs already in the output file are skipped. */

import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { expect, setStorage, test } from "./fixtures";
import { isReadOnly } from "./live-guard";
import type { AnswerEntry, Message, Profile, RunReport } from "../src/shared/types";
import { isCoverLetterField, letterFile, wrapLetter } from "../src/shared/cover-letter";

/** A fixed test letter body (the on-device writer is tested on its own in writer-llm.spec.ts): what the panel attaches
 * after the user approves a draft. */
const TEST_LETTER = "I build and run data pipelines in Python and Apache Airflow, and this role matches that work closely.\n\nIn my current role I moved reporting queries onto partitioned tables and added data quality checks that catch schema breaks early.\n\nI would welcome the chance to talk about the role.";

/** File names the page now holds or shows (every frame): did the attached file stick? */
async function attachedNames(page: Page): Promise<string> {
  const parts: string[] = [];
  for (const frame of page.frames()) {
    const v = await frame.evaluate(() => {
      const names = Array.from(document.querySelectorAll<HTMLInputElement>("input[type=file]")).flatMap((i) => Array.from(i.files ?? []).map((f) => f.name));
      return `${names.join(" ")} ${document.body?.innerText ?? ""}`;
    }).catch(() => "");
    parts.push(v);
  }
  return parts.join(" ");
}

test.skip(!process.env.LIVE1000, "real-life 1,000-form run: set LIVE1000=1");
test.setTimeout(12 * 60 * 60_000);

const JOBS = JSON.parse(readFileSync(process.env.LIVE1000_JOBS ?? "reports/live1000/jobs.json", "utf8")) as Array<{ platform: string; company: string; title: string; url: string }>;
const OUT = process.env.LIVE1000_OUT ?? "reports/live1000/results.jsonl";
const PAUSE_MS = 2500;

// A fictional candidate (not a real person), set up the way a real user finishes onboarding.
const RESUME = [
  "Asha Verma | asha.verma.test@example.com | +91 90000 00000 | Pune, India",
  "Data Engineer, Acme Pay, Bengaluru (Jul 2021 to present): built batch and streaming data pipelines in Python and Apache Airflow.",
  "Software Engineering Intern, Bluefin Labs (Jan 2021 to Jun 2021): built a Django REST API for internal reporting.",
  "B.Tech in Computer Science, State Technical University, 2021.",
].join("\n");
const INDIA_CANDIDATE: Profile = {
  firstName: "Asha", lastName: "Verma", email: "asha.verma.test@example.com", phone: "+91 90000 00000", location: "Pune", country: "India",
  linkedin: "https://www.linkedin.com/in/asha-verma-test", github: "https://github.com/asha-verma-test", portfolio: "", currentCompany: "Acme Pay", currentTitle: "Data Engineer",
  school: "State Technical University", degree: "Bachelor's Degree", discipline: "Computer Science", graduationYear: "2021", experienceYears: "5",
  targetRoles: "Data Engineer", preferredLocations: "Pune, Remote", skills: "Python, SQL, BigQuery, Apache Airflow, Docker",
  // Round 8: a fictional address, a summary in the user's words, and citizenship.
  state: "Maharashtra", addressLine1: "12 Test Road, Kothrud", postalCode: "411038", address: "12 Test Road, Kothrud, Pune, Maharashtra 411038",
  summary: "Data engineer with 5 years of experience building batch and streaming data pipelines in Python, SQL and Apache Airflow.",
  resume: { name: "Asha_Verma_Resume.txt", type: "text/plain", dataBase64: Buffer.from(RESUME).toString("base64") },
  // Quick answers, as a user gives them once in onboarding (LIVE1000_NO_FACTS=1 runs without them).
  ...(process.env.LIVE1000_NO_FACTS ? {} : {
    facts: {
      workCountries: "India", citizenship: "India", needsFutureSponsorship: "No", noticePeriod: "30 days", currentCtc: "12 LPA", expectedCtc: "18 LPA",
      relocate: "Yes", heardFrom: "LinkedIn", gender: "Decline", hispanic: "Decline", race: "Decline", veteran: "Decline", disability: "Decline",
      workMode: "any", travel: "Yes", travelPercent: "25", needsAccommodation: "No", pronouns: "she/her", sexualOrientation: "Decline",
      transgender: "Decline", over18: "Yes",
      // Quick answers added 2026-11-08 (improvements measured in live run 5).
      otherCountries: "sponsorship", nonCompete: "No", relativesAtCompanies: "No", securityClearance: "None",
      expectedSalaryAbroad: "USD 70,000; EUR 60,000; GBP 55,000",
    },
    workHistory: [
      { title: "Data Engineer", company: "Acme Pay", location: "Bengaluru, India", start: "2021-07", end: "", current: true, summary: "Batch and streaming data pipelines in Python and Apache Airflow." },
      { title: "Software Engineering Intern", company: "Bluefin Labs", location: "Pune, India", start: "2021-01", end: "2021-06", current: false, summary: "Django REST API for internal reporting." },
    ],
    workHistoryComplete: true,
  }),
};
const now = "2026-11-07T00:00:00Z";
const INDIA_ANSWERS: AnswerEntry[] = [
  { question: "Are you legally authorized to work in India?", answer: "Yes", topic: "work_authorization", country: "India", updatedAt: now },
  { question: "Will you now or in the future require visa sponsorship to work in the United States?", answer: "Yes", topic: "sponsorship", country: "United States", updatedAt: now },
  { question: "What is your notice period?", answer: "30 days", topic: "notice_period", updatedAt: now },
  { question: "Are you willing to relocate?", answer: "Yes", topic: "relocation", updatedAt: now },
  { question: "Gender", answer: "Decline to self identify", topic: "gender", updatedAt: now },
  { question: "Race / Ethnicity", answer: "Decline to self identify", topic: "race", updatedAt: now },
  { question: "Veteran status", answer: "I don't wish to answer", topic: "veteran", updatedAt: now },
  { question: "Disability status", answer: "I do not want to answer", topic: "disability", updatedAt: now },
  { question: "How did you hear about this job?", answer: "LinkedIn", updatedAt: now },
  { question: "How many years of experience do you have with Python?", answer: "5", updatedAt: now },
];

// A second fictional candidate based in the US (live run 7: every earlier run used the India-based one). A US citizen:
// authorized in the US only, needs sponsorship anywhere else; salary saved as bare dollar figures. Same EEO declines,
// pronouns and years of experience as Asha, so the audit rules carry over.
const US_RESUME = [
  "Emily Carter | emily.carter.test@example.com | +1 512 555 0142 | Austin, TX, United States",
  "Data Engineer, Northwind Analytics, Austin, TX (Jul 2021 to present): built batch and streaming data pipelines in Python and Apache Airflow.",
  "Software Engineering Intern, Contoso Labs, Dallas, TX (Jan 2021 to Jun 2021): built a Django REST API for internal reporting.",
  "B.S. in Computer Science, Lone Star State University, 2021.",
].join("\n");
const US_CANDIDATE: Profile = {
  firstName: "Emily", lastName: "Carter", email: "emily.carter.test@example.com", phone: "+1 512 555 0142", location: "Austin, TX", state: "Texas", country: "United States",
  linkedin: "https://www.linkedin.com/in/emily-carter-test", github: "https://github.com/emily-carter-test", portfolio: "", currentCompany: "Northwind Analytics", currentTitle: "Data Engineer",
  school: "Lone Star State University", degree: "Bachelor's Degree", discipline: "Computer Science", graduationYear: "2021", experienceYears: "5",
  targetRoles: "Data Engineer", preferredLocations: "Austin, Remote", skills: "Python, SQL, BigQuery, Apache Airflow, Docker",
  addressLine1: "100 Test Street", postalCode: "78701", address: "100 Test Street, Austin, TX 78701",
  summary: "Data engineer with 5 years of experience building batch and streaming data pipelines in Python, SQL and Apache Airflow.",
  resume: { name: "Emily_Carter_Resume.txt", type: "text/plain", dataBase64: Buffer.from(US_RESUME).toString("base64") },
  facts: {
    workCountries: "United States", citizenship: "United States", needsFutureSponsorship: "No", noticePeriod: "2 weeks", currentCtc: "105000", expectedCtc: "120000",
    relocate: "Yes", heardFrom: "LinkedIn", gender: "Decline", hispanic: "Decline", race: "Decline", veteran: "Decline", disability: "Decline",
    workMode: "any", travel: "Yes", travelPercent: "25", needsAccommodation: "No", pronouns: "she/her", sexualOrientation: "Decline",
    transgender: "Decline", over18: "Yes", otherCountries: "sponsorship", nonCompete: "No", relativesAtCompanies: "No", securityClearance: "None",
    expectedSalaryAbroad: "EUR 95,000; GBP 85,000; CAD 140,000",
  },
  workHistory: [
    { title: "Data Engineer", company: "Northwind Analytics", location: "Austin, TX", start: "2021-07", end: "", current: true, summary: "Batch and streaming data pipelines in Python and Apache Airflow." },
    { title: "Software Engineering Intern", company: "Contoso Labs", location: "Dallas, TX", start: "2021-01", end: "2021-06", current: false, summary: "Django REST API for internal reporting." },
  ],
  workHistoryComplete: true,
};
const US_ANSWERS: AnswerEntry[] = [
  { question: "Are you legally authorized to work in the United States?", answer: "Yes", topic: "work_authorization", country: "United States", updatedAt: now },
  { question: "Will you now or in the future require visa sponsorship to work in the United States?", answer: "No", topic: "sponsorship", country: "United States", updatedAt: now },
  ...INDIA_ANSWERS.filter((a) => a.topic !== "work_authorization" && a.topic !== "sponsorship" && a.topic !== "notice_period"),
  { question: "What is your notice period?", answer: "2 weeks", topic: "notice_period", updatedAt: now },
];
const IS_US = process.env.LIVE1000_CANDIDATE === "us";
export const CANDIDATE: Profile = IS_US ? US_CANDIDATE : INDIA_CANDIDATE;
export const CANDIDATE_ANSWERS: AnswerEntry[] = IS_US ? US_ANSWERS : INDIA_ANSWERS;

/** Asks the page like the panel does (the content script in every frame; the frame holding the form answers). */
async function send(ext: Page, page: Page, message: Message): Promise<RunReport | undefined> {
  return ext.evaluate(async ({ url, message }) => {
    const tabs = await chrome.tabs.query({});
    const tab = tabs.find((t) => t.url === url) ?? tabs.reduce((a, b) => ((a.id ?? 0) > (b.id ?? 0) ? a : b));
    await chrome.scripting.executeScript({ target: { tabId: tab.id!, allFrames: true }, files: ["content.js"] }).catch(() => undefined);
    try {
      return (await chrome.tabs.sendMessage(tab.id!, message)) as RunReport | undefined;
    } catch {
      return undefined;
    }
  }, { url: page.url(), message });
}

/** Values on the page after the fill, by element id/name (what the employer would receive). */
/** Required SECTIONS that are not single boxes (Breezy "Work History*" / "Education*": a hidden
 * `#work_required` / `#education_required` set to "required" and a list that starts empty, filled with
 * "Add Position"). The field list cannot show them, so the stats would miss a required item left empty. */
async function requiredSections(page: Page): Promise<Array<{ name: string; filled: boolean }>> {
  const all: Array<{ name: string; filled: boolean }> = [];
  for (const frame of page.frames()) {
    const found = await frame.evaluate(() => {
      const out: Array<{ name: string; filled: boolean }> = [];
      for (const flag of document.querySelectorAll<HTMLInputElement>("input[type=hidden][id$='_required']")) {
        if (flag.value.trim().toLowerCase() !== "required") continue;
        // A list section (work history, education): its list items. Otherwise (resume, summary) the boxes of the
        // section itself, up to the next section flag; a file box counts when a file is attached.
        let list: Element | null = flag.nextElementSibling;
        while (list && list.tagName !== "UL" && !(list instanceof HTMLInputElement && /_required$/.test(list.id))) list = list.nextElementSibling;
        let boxes: Array<HTMLInputElement | HTMLTextAreaElement> = [];
        if (list?.tagName === "UL") boxes = [...list.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("li input, li textarea")];
        else {
          for (let el = flag.nextElementSibling; el && el !== list; el = el.nextElementSibling) {
            if (el.matches("input, textarea")) boxes.push(el as HTMLInputElement);
            boxes.push(...el.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input:not([type=hidden]), textarea"));
          }
        }
        const has = (b: HTMLInputElement | HTMLTextAreaElement) => (b instanceof HTMLInputElement && b.type === "file" ? (b.files?.length ?? 0) > 0 : b.value.trim() !== "");
        out.push({ name: flag.id.replace(/_required$/, ""), filled: boxes.some(has) });
      }
      return out;
    }).catch(() => []);
    all.push(...found);
  }
  return all;
}

async function pageValues(page: Page): Promise<Record<string, string>> {
  const all: Record<string, string> = {};
  for (const frame of page.frames()) {
    const v = await frame.evaluate(() => {
      const out: Record<string, string> = {};
      for (const el of document.querySelectorAll("input, textarea, select")) {
        const i = el as HTMLInputElement;
        if (["hidden", "submit", "button"].includes(i.type)) continue;
        const key = i.id || i.name;
        if (!key) continue;
        const value = i.type === "checkbox" || i.type === "radio" ? (i.checked ? i.value || "on" : "") : i.type === "file" ? [...(i.files ?? [])].map((f) => f.name).join(",") : i.value;
        if (value) out[key] = (out[key] ? `${out[key]} | ` : "") + value.slice(0, 300);
      }
      return out;
    }).catch(() => ({}));
    Object.assign(all, v);
  }
  return all;
}

const CLOSED = /no longer (accepting|available|open)|position (has been|is) (filled|closed)|job (not found|is closed|has expired)|page not found|isn't accepting applications|not accepting applications/i;

test("real-life: the extension fills live application forms (nothing submitted or sent)", async ({ ext, context }) => {
  const blocked = new Map<Page, string[]>();
  await context.route("**/*", async (route) => {
    const req = route.request();
    if (isReadOnly(req)) return route.continue();
    let page: Page | undefined;
    try { page = req.frame()?.page(); } catch { /* a site's service worker: no page, still blocked */ }
    if (page) blocked.set(page, [...(blocked.get(page) ?? []), `${req.method()} ${new URL(req.url()).host}${new URL(req.url()).pathname.slice(0, 50)}`]);
    return route.abort("blockedbyclient");
  });
  await setStorage(ext, { profile: CANDIDATE, answers: CANDIDATE_ANSWERS });
  writeFileSync(OUT.replace(/\.jsonl$/, ".candidate.json"), JSON.stringify({ profile: { ...CANDIDATE, resume: { name: CANDIDATE.resume!.name } }, answers: CANDIDATE_ANSWERS }, null, 1));

  const done = new Set(existsSync(OUT) ? readFileSync(OUT, "utf8").split("\n").filter(Boolean).map((l) => (JSON.parse(l) as { url: string }).url) : []);
  let n = done.size;
  for (const job of JOBS) {
    if (done.has(job.url)) continue;
    const t0 = Date.now();
    const page = await context.newPage();
    const row: Record<string, unknown> = { ...job, outcome: "error" };
    try {
      await page.goto(job.url, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.waitForTimeout(3000);
      const body = await page.locator("body").innerText({ timeout: 10_000 }).catch(() => "");
      if (CLOSED.test(body.slice(0, 3000))) { row.outcome = "closed"; continue; }
      const applyTab = page.getByRole("tab", { name: /application/i }).or(page.getByRole("button", { name: /^apply( for this job| now)?$/i })).first();
      if (await applyTab.isVisible().catch(() => false)) await applyTab.click({ timeout: 5000 }).catch(() => undefined);
      await page.locator("input:not([type=hidden]), textarea").first().waitFor({ timeout: 15_000 }).catch(() => undefined);
      if (/captcha|are you a robot|verify you are human|security verification|security check|verifies you are not a bot|just a moment|checking your browser/i.test(body.slice(0, 2000)) && !(await page.locator("input[type=email]").count())) { row.outcome = "robot_check"; continue; }
      const startUrl = page.url();
      let report = await send(ext, page, { type: "RUN", mode: "review", fillOnly: true });
      if (!report || (report.status === "not_a_form" && !report.fields.length)) {
        // The job page lives on the company's own site with the form embedded from Greenhouse/Ashby: like the panel
        // ("Opening the application form…"), open the form's own page and fill there.
        let embedded = page.frames().map((f) => f.url()).find((u) => /(greenhouse\.io|ashbyhq\.com)\/.*(embed|job_app|application|jobs\/\d)/i.test(u));
        if (!embedded) {
          // Only the job description: the panel's "Open the application" button (the page's own Apply link or button).
          const opened = (await send(ext, page, { type: "OPEN_APPLICATION" })) as unknown as { href?: string; clicked?: boolean } | undefined;
          if (opened?.href) embedded = opened.href;
          else if (opened?.clicked) { await page.waitForTimeout(4000); embedded = page.url(); }
        }
        if (embedded) {
          row.openedEmbeddedForm = embedded.slice(0, 200);
          // The form opened on this same page (BambooHR shows it in a pop-up after "Apply for This Job"): never
          // reload, which would close it. Only a form at another address is opened.
          if (embedded !== page.url()) await page.goto(embedded, { waitUntil: "domcontentloaded", timeout: 45_000 });
          await page.waitForTimeout(3000);
          await page.locator("input:not([type=hidden]), textarea").first().waitFor({ timeout: 15_000 }).catch(() => undefined);
          report = await send(ext, page, { type: "RUN", mode: "review", fillOnly: true, continuing: true });
        }
      }
      if (!report || report.status === "not_a_form" || !report.fields.length) {
        row.outcome = "no_form";
        row.runStatus = report?.status ?? "no answer from the page";
        row.errors = report?.errors;
        row.inputsOnPage = await page.locator("input:not([type=hidden]), textarea, select").count();
        continue;
      }
      await page.waitForTimeout(800);
      const values = await pageValues(page);
      row.outcome = "filled";
      row.runStatus = report.status;
      row.jobTitle = report.jobTitle;
      row.errors = report.errors;
      row.fields = report.fields.map((f) => {
        const d = f.decision;
        return {
          label: f.field.label.slice(0, 300), hint: f.field.hint?.slice(0, 200), control: f.field.control, required: f.field.required,
          options: f.field.options.slice(0, 40), name: f.field.name, section: f.field.section,
          decision: d.kind, key: d.kind === "profile" ? d.key : d.kind === "work" ? `${d.part}#${d.index + 1}` : d.kind === "ask" ? (d.topic ?? d.reason) : d.kind === "skip" ? d.reason : undefined,
          value: "value" in d ? d.value : undefined, matched: d.kind === "answer" ? d.question : undefined, source: "source" in d ? d.source : undefined,
          status: f.status, detail: f.detail, understood: f.understood, review: f.review,
          onPage: values[f.field.name] ?? undefined,
        };
      });
      row.requiredSections = await requiredSections(page);
      // Round 8: a cover-letter upload gets the approved letter as a PDF made on this computer (ATTACH_FILE, as the
      // panel sends after "Use this answer"). Uploads to the site's storage are blocked like every other send.
      const covers = report.fields.filter((f) => f.field.control === "file" && isCoverLetterField(f.field) && f.status !== "filled");
      if (covers.length) {
        const text = wrapLetter(TEST_LETTER, CANDIDATE, { company: String(job.company ?? "") });
        const file = letterFile(text, CANDIDATE, { company: String(job.company ?? "") });
        const res = (await send(ext, page, { type: "ATTACH_FILE", label: covers[0]!.field.label, key: covers[0]!.field.key, file })) as unknown as { ok?: boolean; detail?: string } | undefined;
        await page.waitForTimeout(1500);
        row.coverLetter = { label: covers[0]!.field.label.slice(0, 120), ok: !!res?.ok, detail: res?.detail, shown: (await attachedNames(page)).includes(file.name), bytes: Math.round(file.dataBase64.length * 0.75) };
      }
      row.urlUnchanged = page.url() === startUrl || page.url() === row.openedEmbeddedForm;
    } catch (e) {
      row.error = String((e as Error)?.message ?? e).split("\n")[0]!.slice(0, 200);
    } finally {
      row.seconds = Math.round((Date.now() - t0) / 1000);
      row.blocked = blocked.get(page) ?? [];
      appendFileSync(OUT, `${JSON.stringify(row)}\n`);
      n++;
      const fs = (row.fields as Array<{ status: string }> | undefined) ?? [];
      console.log(`${n}/${JOBS.length} ${String(row.outcome).padEnd(8)} ${job.platform}:${job.company} fields=${fs.length} filled=${fs.filter((f) => f.status === "filled").length} blocked=${(row.blocked as string[]).length}`);
      blocked.delete(page);
      await page.close().catch(() => undefined);
      await ext.waitForTimeout(PAUSE_MS);
    }
  }
  expect(n).toBeGreaterThan(0);
});
