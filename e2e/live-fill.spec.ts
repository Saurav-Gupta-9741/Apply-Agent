/** Real-life test on LIVE application forms (Greenhouse, Ashby), used exactly as a person would: open the form, press
 * "Fill this application" in the panel, press "Draft answer" on essay questions (the real model, downloaded from
 * Hugging Face on first use, sized to this computer), read the draft, press "Use this answer".
 *
 * Nothing reaches the employers: the candidate is fictional, Submit is never pressed, and EVERY request from these
 * pages other than a plain GET (form posts, autosaves, resume uploads, analytics beacons) is blocked and logged.
 *
 *   LIVE_FILL=1 npx playwright test e2e/live-fill.spec.ts         (jobs from reports/live-fill-jobs.json)
 *   LIVE_FILL_DRAFTS=4 limits how many essays get a real draft (each takes minutes on a laptop).
 * Writes reports/live-fill.json and reports/live-fill-log.md. */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { Page, Request } from "@playwright/test";
import { ANSWERS, expect, goTo, setStorage, test } from "./fixtures";
import { isReadOnly } from "./live-guard";
import type { Profile } from "../src/shared/types";

test.skip(!process.env.LIVE_FILL, "real-life run on live forms: set LIVE_FILL=1");
test.setTimeout(4 * 60 * 60_000);

const JOBS = JSON.parse(readFileSync("reports/live-fill-jobs.json", "utf8")) as Array<{ platform: string; company: string; url: string }>;
const MAX_DRAFTS = Number(process.env.LIVE_FILL_DRAFTS ?? 5);

// A fictional candidate (not a real person).
const RESUME = [
  "Asha Verma | asha.verma.test@example.com | +91 90000 00000 | Pune, India",
  "Data Engineer, Acme Pay, Bengaluru (Jul 2021 to present): built batch and streaming data pipelines in Python and Apache Airflow that process about 40 million payment events per day.",
  "Data Engineer, Acme Pay: rewrote slow BigQuery reporting queries with partitioning and clustering; cut monthly query cost by 35% and report time from 20 minutes to 3 minutes.",
  "Data Engineer, Acme Pay: led the migration of 120 tables from MySQL to BigQuery over 6 weeks with zero data loss.",
  "Data Engineer, Acme Pay: added data quality checks with Great Expectations that catch schema breaks before they reach dashboards.",
  "Data Engineer, Acme Pay: mentored 2 junior engineers.",
  "Software Engineering Intern, Bluefin Labs (Jan 2021 to Jun 2021): built a Django REST API for internal reporting.",
  "B.Tech in Computer Science, State Technical University, 2021.",
].join("\n");
const PROFILE: Profile = {
  firstName: "Asha", lastName: "Verma", email: "asha.verma.test@example.com", phone: "+91 90000 00000", location: "Pune", country: "India",
  linkedin: "https://www.linkedin.com/in/asha-verma-test", github: "", portfolio: "", currentCompany: "Acme Pay", currentTitle: "Data Engineer",
  school: "State Technical University", degree: "Bachelor's Degree", discipline: "Computer Science", graduationYear: "2021", experienceYears: "5",
  targetRoles: "Data Engineer", preferredLocations: "Pune, Remote", skills: "Python, SQL, BigQuery, Apache Airflow, Docker, Great Expectations",
  resume: { name: "Asha_Verma_Resume.txt", type: "text/plain", dataBase64: Buffer.from(RESUME).toString("base64") },
};

/** Values of the candidate that must only ever appear in their own kind of field. */
const OWN: Array<{ value: string; field: RegExp; name: string }> = [
  { value: PROFILE.email, field: /e-?mail|correo|courriel/i, name: "email" },
  { value: "90000 00000", field: /phone|mobile|tel|cell|whatsapp/i, name: "phone" },
  { value: PROFILE.linkedin, field: /linkedin|profile|url|link|website/i, name: "LinkedIn" },
  { value: "Verma", field: /last|surname|family|full|^name|legal name|your name|nombre|apellido/i, name: "last name" },
];

interface PageField { label: string; tag: string; type: string; value: string; required: boolean }

/** Every visible field on the page (all frames) with its label and value, as the employer would receive it. */
async function pageFields(page: Page): Promise<PageField[]> {
  const out: PageField[] = [];
  for (const frame of page.frames()) {
    const rows = await frame.evaluate(() => {
      const labelOf = (el: Element): string => {
        const id = el.getAttribute("id");
        const byFor = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
        const aria = el.getAttribute("aria-label") || (el.getAttribute("aria-labelledby") ? document.getElementById(el.getAttribute("aria-labelledby")!.split(" ")[0]!)?.textContent : "");
        return (byFor?.textContent || aria || el.closest("label")?.textContent || el.closest("fieldset")?.querySelector("legend")?.textContent || el.getAttribute("placeholder") || el.getAttribute("name") || "").replace(/\s+/g, " ").trim().slice(0, 160);
      };
      return [...document.querySelectorAll("input, textarea, select")].filter((el) => {
        const t = (el as HTMLInputElement).type;
        if (["hidden", "submit", "button", "search"].includes(t)) return false;
        const r = (el as HTMLElement).getBoundingClientRect();
        return r.width > 0 || r.height > 0 || t === "file" || t === "checkbox" || t === "radio";
      }).map((el) => {
        const i = el as HTMLInputElement;
        const value = i.type === "checkbox" || i.type === "radio" ? (i.checked ? `checked:${i.value}` : "") : i.type === "file" ? [...(i.files ?? [])].map((f) => f.name).join(",") : (el as HTMLInputElement).value;
        return { label: labelOf(el), tag: el.tagName.toLowerCase(), type: i.type ?? "", value: value ?? "", required: i.required || el.getAttribute("aria-required") === "true" };
      });
    }).catch(() => [] as PageField[]);
    out.push(...rows);
  }
  return out;
}

/** Problems a careful human reviewer would flag on the filled page. */
function wrongFills(fields: PageField[]): string[] {
  const problems: string[] = [];
  for (const f of fields) {
    if (!f.value || f.type === "file") continue;
    for (const own of OWN) {
      if (f.value.includes(own.value) && !own.field.test(f.label)) problems.push(`${own.name} typed into "${f.label}"`);
    }
    if (/e-?mail/i.test(f.label) && f.tag !== "select" && !/confirm|verify/i.test(f.label) && f.value && f.value !== PROFILE.email && /@/.test(f.value)) problems.push(`email field "${f.label}" holds "${f.value}"`);
    if (/^first name|^first$|given name|^nombre$/i.test(f.label) && f.value && f.value !== PROFILE.firstName) problems.push(`first name field "${f.label}" holds "${f.value}"`);
    if (/^last name|^last$|surname|family name|apellido/i.test(f.label) && f.value && f.value !== PROFILE.lastName) problems.push(`last name field "${f.label}" holds "${f.value}"`);
  }
  return problems;
}

interface Row {
  platform: string;
  company: string;
  url: string;
  outcome: "filled" | "closed" | "no_form" | "error";
  error?: string;
  seconds?: number;
  fields?: number;
  filledByUs?: number;
  requiredEmptyAfter?: string[];
  essaysEmptyAfterFill?: boolean;
  wrong?: string[];
  panelStatus?: string;
  aiRuleNote?: string;
  trapNotes?: number;
  draftButtons?: number;
  blockedRequests?: string[];
  urlUnchanged?: boolean;
  drafts?: Array<{ question: string; seconds: number; words: number; text: string; removed?: string; usedOnPage: boolean; outcome: string }>;
}

test("real-life: fill and draft on live application forms (nothing is submitted or sent)", async ({ ext, context }) => {
  // Block everything the pages could send: only plain GETs may pass (pages, scripts, images, the model download).
  const blocked = new Map<Page, string[]>();
  await context.route("**/*", async (route) => {
    const req: Request = route.request();
    if (isReadOnly(req)) return route.continue();
    let page: Page | undefined;
    try { page = req.frame()?.page(); } catch { /* a site's service worker: no page, still blocked */ }
    if (page) blocked.set(page, [...(blocked.get(page) ?? []), `${req.method()} ${new URL(req.url()).host}${new URL(req.url()).pathname.slice(0, 60)}`]);
    return route.abort("blockedbyclient");
  });
  await ext.setViewportSize({ width: 380, height: 1000 });
  await setStorage(ext, { profile: PROFILE, answers: ANSWERS });

  const rows: Row[] = [];
  let draftsDone = 0;
  mkdirSync("test-results/live-fill", { recursive: true });
  for (const job of JOBS) {
    const row: Row = { platform: job.platform, company: job.company, url: job.url, outcome: "error" };
    const t0 = Date.now();
    const page = await context.newPage();
    try {
      await page.goto(job.url, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.waitForTimeout(4000);
      if (/no longer (accepting|available|open)|job (not found|is closed)|page not found|not accepting applications/i.test(await page.locator("body").innerText({ timeout: 10_000 }).catch(() => ""))) {
        row.outcome = "closed";
        continue;
      }
      // Ashby and some Greenhouse pages show the form after an "Apply" tab/button.
      const applyTab = page.getByRole("tab", { name: /application/i }).or(page.getByRole("button", { name: /^apply( for this job| now)?$/i })).first();
      if (await applyTab.isVisible().catch(() => false)) await applyTab.click().catch(() => undefined);
      await page.locator("input:not([type=hidden]), textarea").first().waitFor({ timeout: 20_000 }).catch(() => undefined);
      if (!(await page.locator("input[type=email], input[name*=email i], input[id*=email i]").count())) {
        row.outcome = "no_form";
        continue;
      }
      const startUrl = page.url();

      // The panel, pointed at this tab, exactly as the user opens it.
      const tabId = await ext.evaluate(async (url) => (await chrome.tabs.query({})).find((t) => t.url === url)?.id, page.url());
      await ext.goto(`${ext.url().split("?")[0]}?tabId=${tabId}`);
      await goTo(ext, "apply");
      await ext.locator("#run").click();
      await expect(ext.locator("#fields-box")).toBeVisible({ timeout: 60_000 });
      await ext.waitForTimeout(2500);
      row.panelStatus = (await ext.locator("#run-status, .run-status, [role=status]").first().innerText({ timeout: 3000 }).catch(() => "")).slice(0, 200);

      const after = await pageFields(page);
      row.outcome = "filled";
      row.fields = after.length;
      row.filledByUs = after.filter((f) => f.value).length;
      row.requiredEmptyAfter = after.filter((f) => f.required && !f.value && f.type !== "checkbox" && f.type !== "radio").map((f) => f.label).slice(0, 15);
      row.essaysEmptyAfterFill = after.filter((f) => f.tag === "textarea").every((f) => !f.value || ANSWERS.some((a) => a.answer === f.value));
      row.wrong = wrongFills(after);
      row.aiRuleNote = (await ext.locator("#questions .ai-rule-note:not(.question .ai-rule-note)").first().innerText({ timeout: 2000 }).catch(() => "")) || undefined;
      row.trapNotes = await ext.locator("#questions .question .ai-rule-note").count();
      const triggers = ext.locator("#questions .draft-trigger");
      row.draftButtons = await triggers.count();
      await ext.bringToFront();
      await ext.locator("#questions").screenshot({ path: `test-results/live-fill/${job.platform}-${job.company}.png`, timeout: 15_000 }).catch(() => undefined);

      // Real drafts with the real model, one essay per form, until the budget is spent.
      row.drafts = [];
      if (row.draftButtons && draftsDone < MAX_DRAFTS) {
        const card = ext.locator("#questions .question", { has: ext.locator(".draft-trigger") }).first();
        const question = (await card.locator(".question-title").innerText({ timeout: 5000 })).slice(0, 140);
        const d0 = Date.now();
        await card.locator(".draft-trigger").click();
        const setup = card.locator(".writer-setup");
        if (await setup.isVisible({ timeout: 15_000 }).catch(() => false)) {
          // First time on this computer: the one-time download, from Hugging Face, of the model sized to this PC.
          const dl = setup.getByRole("button", { name: /Download now|Continue the download/ });
          if (await dl.isVisible().catch(() => false)) await dl.click();
        }
        const result = card.locator(".draft-textarea, .draft-insufficient, .draft-error");
        await expect(result).toBeVisible({ timeout: 45 * 60_000 });
        await ext.bringToFront();
        const kind = (await card.locator(".draft-textarea").count()) ? "draft" : (await card.locator(".draft-insufficient").count()) ? "insufficient" : "error";
        const text = kind === "draft" ? await card.locator(".draft-textarea").inputValue() : await result.innerText();
        const removed = (await card.locator(".draft-removed").innerText({ timeout: 2000 }).catch(() => "")) || undefined;
        let usedOnPage = false;
        if (kind === "draft") {
          await card.getByRole("button", { name: "Use this answer" }).click({ timeout: 30_000 });
          await expect.poll(async () => (await pageFields(page)).some((f) => f.tag === "textarea" && f.value.replace(/\s+/g, " ").trim() === text.replace(/\s+/g, " ").trim()), { timeout: 60_000 }).toBe(true).catch(() => undefined);
          usedOnPage = (await pageFields(page)).some((f) => f.tag === "textarea" && f.value.replace(/\s+/g, " ").trim() === text.replace(/\s+/g, " ").trim());
        }
        row.drafts.push({ question, seconds: Math.round((Date.now() - d0) / 1000), words: text.split(/\s+/).filter(Boolean).length, text, removed, usedOnPage, outcome: kind });
        draftsDone++;
        await ext.locator("#questions").screenshot({ path: `test-results/live-fill/${job.platform}-${job.company}-draft.png`, timeout: 15_000 }).catch(() => undefined);
        // The draft typed into the page must not have moved anything else on the form.
        row.wrong = [...row.wrong, ...wrongFills(await pageFields(page))].filter((v, i, a) => a.indexOf(v) === i);
      }
      row.urlUnchanged = page.url() === startUrl;
    } catch (e) {
      row.outcome = "error";
      row.error = String((e as Error)?.message ?? e).split("\n")[0]!.slice(0, 200);
    } finally {
      row.seconds = Math.round((Date.now() - t0) / 1000);
      row.blockedRequests = blocked.get(page) ?? [];
      rows.push(row);
      console.log(`${rows.length}/${JOBS.length} ${row.outcome.padEnd(8)} ${job.platform}:${job.company} fields=${row.fields ?? 0} wrong=${row.wrong?.length ?? 0} drafts=${row.drafts?.length ?? 0} blocked=${row.blockedRequests.length}`);
      writeFileSync("reports/live-fill.json", JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 1));
      await page.close().catch(() => undefined);
      await ext.waitForTimeout(2000); // human pace between forms
    }
  }

  // The log a reviewer reads.
  const md: string[] = ["# Live forms: real-life fill and draft log", "", `Run ${new Date().toISOString()}. Fictional candidate; Submit never pressed; every non-GET request from the pages blocked.`, "",
    "| Form | Outcome | Fields | Filled | Required left for user | Wrong | AI rule | Traps | Draft buttons | Blocked sends | Page not submitted |", "|---|---|---|---|---|---|---|---|---|---|---|"];
  for (const r of rows) {
    md.push(`| ${r.platform}:${r.company} | ${r.outcome}${r.error ? ` (${r.error.slice(0, 50)})` : ""} | ${r.fields ?? ""} | ${r.filledByUs ?? ""} | ${r.requiredEmptyAfter?.length ?? ""} | ${r.wrong?.length ? `**${r.wrong.length}**` : r.outcome === "filled" ? 0 : ""} | ${r.aiRuleNote ? "yes" : ""} | ${r.trapNotes || ""} | ${r.draftButtons ?? ""} | ${r.blockedRequests?.length ?? 0} | ${r.urlUnchanged === undefined ? "" : r.urlUnchanged ? "yes" : "**NO**"} |`);
  }
  md.push("", "## Problems found");
  for (const r of rows) for (const w of r.wrong ?? []) md.push(`- ${r.company}: ${w}`);
  md.push("", "## Drafts (real model, this computer)");
  for (const r of rows) for (const d of r.drafts ?? []) md.push(`- **${r.company}** — "${d.question}" — ${d.outcome}, ${d.seconds} s, ${d.words} words, ${d.usedOnPage ? "typed into the page after Use" : "NOT on the page"}${d.removed ? ` — ${d.removed}` : ""}`, `  > ${d.text.replace(/\n+/g, " ")}`);
  md.push("", "## Left for the user (required, empty after Fill)");
  for (const r of rows) if (r.requiredEmptyAfter?.length) md.push(`- ${r.company}: ${r.requiredEmptyAfter.join(" · ")}`);
  writeFileSync("reports/live-fill-log.md", md.join("\n") + "\n");

  const filled = rows.filter((r) => r.outcome === "filled");
  expect(filled.length).toBeGreaterThan(0);
  expect(filled.flatMap((r) => r.wrong ?? [])).toEqual([]);
  expect(filled.every((r) => r.urlUnchanged !== false)).toBe(true);
});
