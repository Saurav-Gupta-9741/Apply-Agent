/** On-device AI drafts for free-text application questions.
 *
 * The writer, in order: Chrome's built-in model (Gemini Nano) when it is ready; when Chrome can download it, a button
 * to start that download, next to our own model; otherwise our own model (downloaded once, sized to this computer and
 * run in the offscreen page), or none on a computer too small for it.
 * Flow: "Draft answer" → (first time: consent + download) → the words appear as they are written → fact check →
 * [Use] [Edit] [Skip].
 *
 * Hard rules:
 *  - 100% on-device: no cloud calls. The only network use is downloading the model file, which sends nothing about the
 *    user.
 *  - Strictly grounded: every draft passes the fact checker (src/shared/writer/factcheck.ts); sentences with invented
 *    numbers, tools or claims are removed, and too little left means "not enough facts".
 *  - Never typed into the page until the user clicks [Use]; never submitted.
 */

import { checkDraft, downloadNano, draftAnswerRaw, nanoStatus, profileFacts } from "../shared/ai";
import { docxToText, extractPdfText } from "../shared/resume-parse";
import { isNeverRemembered, isSecretField, questionTopic } from "../content/classify";
import { isEssayQuestion } from "../shared/essay-question";
import type { FieldDescriptor, Profile } from "../shared/types";
import { checkLength, lengthCounter, lengthLimit, type LengthLimit } from "../shared/length-limit";
import { factCheck, removedSummary, type FactSources } from "../shared/writer/factcheck";
import { loadWriterSettings, saveWriterSettings, testOverride, writer } from "../shared/writer/client";
import { draftId, type FromWriter, type WriterStatus } from "../shared/writer/protocol";
import { chooseWriter, pickTier, probeHardware, type WriterChoice } from "../shared/writer/tier";
import { gb, modelById, type WriterModel } from "../shared/writer/catalog";
import { currentJobText } from "./fit-card";


/** The length limit of a question: its words, help text and placeholder, and the box's maxlength. */
export function limitOfField(field: FieldDescriptor): LengthLimit | undefined {
  return lengthLimit(`${field.label} ${field.hint ?? ""} ${field.placeholder ?? ""}`, field.maxLength);
}

/** A live "143 / 200 words" line under a text box; red when over a hard limit. Nothing when there is no limit. */
export function limitCounter(input: HTMLInputElement | HTMLTextAreaElement, limit: LengthLimit | undefined): HTMLElement | undefined {
  if (!limit) return undefined;
  const line = document.createElement("p");
  line.className = "length-counter";
  line.setAttribute("aria-live", "polite");
  const update = () => {
    line.textContent = lengthCounter(input.value, limit) ?? "";
    const fit = checkLength(input.value, limit);
    line.classList.toggle("over", !fit.ok);
    line.title = fit.problem ?? "";
  };
  input.addEventListener("input", update);
  update();
  return line;
}

export interface DraftContext {
  question: string;
  field: FieldDescriptor;
  profile: Profile;
  job: { title: string; company: string };
  onUse: (draftText: string) => Promise<void> | void;
  onSkip?: () => void;
  toast?: (message: string, kind?: "ok" | "warn" | "bad") => void;
}

const DRAFTABLE_QUESTION_PATTERNS = [
  /why (do you want|are you interested|work here|apply|join|salesforce|walmart|adobe|this company)/i,
  /tell (us|me) about (yourself|a time|a project|an accomplishment|a challenge)/i,
  /describe (your|a|how you|an experience)/i,
  /what (makes you|motivates you|interests you|is your experience|are your strengths)/i,
  /cover letter|statement of interest|additional (information|notes)|summary of qualifications/i,
  /how (did you|would you|do you approach)/i,
];

const NOT_DRAFTABLE_NAMES = /^(first_?name|last_?name|full_?name|email|phone|mobile|tel|address|street|city|state|zip|postal|country|url|linkedin|github|website|salary|ctc|notice|gender|race|veteran|disability|signature)$/i;

/** Determines whether a form field is an open-ended question suitable for AI drafting. */
export function isDraftableField(field: { control: string; label: string; name?: string; options?: string[] }): boolean {
  if (field.options && field.options.length > 0) return false;
  if (isSecretField({ label: field.label, name: field.name ?? "" })) return false;
  if (field.name && NOT_DRAFTABLE_NAMES.test(field.name)) return false;
  if (isNeverRemembered(field.label)) return false;

  // Salary, visa, consent and the other sensitive topics are the user's own facts, never an AI draft.
  if (questionTopic(field.label)) return false;
  if (field.control !== "textarea" && field.control !== "text") return false;
  // Only real essay questions: not links, start dates, "How did you hear about us?" or yes/no facts in a big box.
  return isEssayQuestion(field.label, field.control === "textarea")
    || (field.control === "text" && DRAFTABLE_QUESTION_PATTERNS.some((pat) => pat.test(field.label)) && isEssayQuestion(field.label, true));
}

/** Status message and guidance when built-in AI is missing or downloadable. */
export function getAiStatusInfo(status: "available" | "downloadable" | "unavailable"): {
  ready: boolean;
  title: string;
  detail: string;
  flagUrl?: string;
} {
  if (status === "available") {
    return {
      ready: true,
      title: "Chrome Built-in AI ready",
      detail: "Runs 100% on-device (Gemini Nano via Chrome Prompt API). Zero cloud calls.",
    };
  }
  if (status === "downloadable") {
    return {
      ready: false,
      title: "Chrome can download its built-in AI",
      detail: "Chrome downloads its built-in model (Gemini Nano) once. After that, drafts are written on this computer and nothing is sent anywhere.",
    };
  }
  return {
    ready: false,
    title: "Drafts need Chrome's built-in AI",
    detail: "Enable Chrome's built-in model (Gemini Nano) in chrome://flags/#prompt-api-for-gemini-nano. ApplyAgent runs drafts 100% locally with zero cloud calls.",
    flagUrl: "chrome://flags/#prompt-api-for-gemini-nano",
  };
}

/** The text of the saved resume file (PDF, Word or plain text), read once per file: the drafts' second source of
 * facts. Read on this device only; an unreadable file gives "" (the profile alone is used). */
let resumeCache: { id: string; text: Promise<string> } | undefined;
export function resumeTextOf(profile: Profile): Promise<string> {
  const file = profile.resume;
  if (!file?.dataBase64) return Promise.resolve("");
  const id = `${file.name}:${file.dataBase64.length}`;
  if (resumeCache?.id !== id) {
    const text = (async () => {
      const bytes = Uint8Array.from(atob(file.dataBase64), (c) => c.charCodeAt(0));
      const name = file.name.toLowerCase();
      if (name.endsWith(".pdf") || file.type === "application/pdf") return extractPdfText(bytes);
      if (name.endsWith(".docx")) return (await docxToText(bytes)) ?? "";
      if (name.endsWith(".txt") || file.type.startsWith("text/")) return new TextDecoder("utf-8").decode(bytes);
      return "";
    })().catch(() => "");
    resumeCache = { id, text };
  }
  return resumeCache.text;
}

// ---------------------------------------------------------------------------------------------------------------
// Which writer

/** Gemini Nano when ready; otherwise our model for this computer (or the one already downloaded), or none. */
export async function resolveWriter(): Promise<WriterChoice> {
  const nano = await nanoStatus();
  if (nano === "available") return chooseWriter(nano, { kind: "none", reason: "memory" });
  const [hw, settings, test] = await Promise.all([probeHardware(), loadWriterSettings(), testOverride()]);
  let tier = pickTier({ ...hw, tokensPerSec: settings.tokensPerSec });
  const chosen = modelById(test.modelId) ?? (settings.consented ? modelById(settings.modelId) : undefined);
  if (chosen) tier = { kind: "model", model: chosen };
  return chooseWriter(nano, tier);
}

/** After the browser was closed during a download: continue it when the panel opens (the user agreed earlier). */
let resumeChecked = false;
async function resumePendingDownload(): Promise<void> {
  if (resumeChecked) return;
  resumeChecked = true;
  const settings = await loadWriterSettings();
  const model = modelById(settings.modelId);
  if (!settings.consented || !settings.downloading || !model) return;
  const status = await writer.fetchStatus();
  if (status.download || status.files[model.id]?.complete) return;
  await writer.send({ type: "download", modelId: model.id, baseUrl: (await testOverride()).baseUrl });
}

// ---------------------------------------------------------------------------------------------------------------
// Small DOM helpers

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
function btn(label: string, variant: "primary" | "secondary" | "ghost", onClick: () => void): HTMLButtonElement {
  const b = el("button", `btn btn-${variant} btn-sm`, label);
  b.type = "button";
  b.addEventListener("click", onClick);
  return b;
}
function bar(fraction: number): HTMLElement {
  const outer = el("div", "writer-progress");
  outer.setAttribute("role", "progressbar");
  outer.setAttribute("aria-valuemin", "0");
  outer.setAttribute("aria-valuemax", "100");
  outer.setAttribute("aria-valuenow", String(Math.round(fraction * 100)));
  const inner = el("i");
  inner.style.width = `${Math.max(0, Math.min(100, fraction * 100)).toFixed(1)}%`;
  outer.append(inner);
  return outer;
}
const minutes = (ms: number) => (ms < 60_000 ? `${Math.max(1, Math.round(ms / 1000))} s` : `${Math.floor(ms / 60_000)} min ${Math.round((ms % 60_000) / 1000)} s`);

// ---------------------------------------------------------------------------------------------------------------
// The widget

interface WidgetHandle {
  id: string;
  container: HTMLElement;
  /** Starts a draft. `queued`: part of "Draft all" (no setup card if the model is missing). */
  start: (queued: boolean) => Promise<void>;
}
const widgets = new Set<WidgetHandle>();
const liveWidgets = () => [...widgets].filter((w) => w.container.isConnected);

const DRAFT_LABEL = "Draft answer";

/** Creates the 1-click draft container UI. */
export function createDraftWidget(ctx: DraftContext): HTMLElement {
  const container = el("div", "draft-widget");
  const draftBtn = el("button", "btn btn-ghost btn-sm draft-trigger", DRAFT_LABEL);
  draftBtn.type = "button";
  const previewBox = el("div", "draft-preview-box");
  previewBox.style.display = "none";
  container.append(draftBtn, previewBox);

  const id = draftId(ctx.job, ctx.question);
  const limit = limitOfField(ctx.field);
  let mode: "idle" | "setup" | "drafting" | "done" = "idle";
  let localModel: WriterModel | undefined;
  let lastChoice: WriterChoice | undefined;
  let attached = false;

  const show = (...nodes: Node[]) => {
    previewBox.replaceChildren(...nodes);
    previewBox.style.display = nodes.length ? "block" : "none";
  };
  const reset = () => {
    mode = "idle";
    show();
    draftBtn.disabled = false;
    draftBtn.textContent = DRAFT_LABEL;
  };

  const sources = async (): Promise<FactSources> => ({
    profileFacts: profileFacts(ctx.profile),
    resumeText: await resumeTextOf(ctx.profile),
    question: ctx.question,
    job: { ...ctx.job, description: currentJobText() },
  });

  // ---- results -------------------------------------------------------------------------------------------------

  const insufficientCard = (removedNote?: string) => {
    const card = el("div", "draft-insufficient", "Not enough facts in your profile or resume to draft an accurate answer. ApplyAgent never invents experience or facts.");
    if (removedNote) card.append(el("p", "draft-note", removedNote));
    card.append(btn("Write answer manually", "ghost", reset));
    return card;
  };

  async function showResult(raw: string, writerNote?: string): Promise<void> {
    const src = await sources();
    const r = factCheck(raw, src, limit);
    const removedNote = removedSummary(r.removed);
    mode = "done";
    draftBtn.disabled = false;
    draftBtn.textContent = "Regenerate draft";
    if (r.status === "insufficient") return show(insufficientCard(removedNote));
    if (r.status === "too-long") {
      const card = el("div", "draft-insufficient", `The draft did not fit this question's limit (${lengthCounter("", limit)?.replace(/^0 \/ /, "") ?? "length"}). Please write a short answer yourself.`);
      card.append(btn("Write answer manually", "ghost", reset));
      return show(card);
    }
    const text = r.text!;
    const textarea = el("textarea", "input draft-textarea");
    textarea.rows = 5;
    textarea.value = text;
    textarea.setAttribute("aria-label", `Draft answer for: ${ctx.question}`);
    const nodes: Node[] = [textarea];
    const counter = limitCounter(textarea, limit);
    if (counter) nodes.push(counter);
    if (r.shortened) nodes.push(el("p", "draft-note", "Shortened at a whole sentence to fit this question's limit."));
    if (removedNote) nodes.push(el("p", "draft-note draft-removed", removedNote));
    const warnings = checkDraft(text, ctx.profile, ctx.job, { question: ctx.question, reference: src.resumeText });
    if (warnings.length) {
      const list = el("ul", "draft-warnings");
      for (const w of warnings) list.append(el("li", "", w));
      nodes.push(list);
    }
    const useBtn = btn("Use", "primary", async () => {
      const finalDraft = textarea.value.trim();
      const fit = checkLength(finalDraft, limit);
      if (!fit.ok) {
        ctx.toast?.(`Too long: ${fit.problem}`, "warn");
        textarea.focus();
        return;
      }
      useBtn.disabled = true;
      await ctx.onUse(finalDraft);
      show();
      draftBtn.textContent = "Draft accepted (assisted)";
      draftBtn.disabled = true;
    });
    useBtn.title = "Accept this draft and fill it on the page";
    const editBtn = btn("Edit", "secondary", () => {
      textarea.focus();
      textarea.select();
    });
    editBtn.title = "Focus text area to edit before using";
    const skipBtn = btn("Skip", "ghost", () => {
      reset();
      ctx.onSkip?.();
    });
    skipBtn.title = "Discard this draft";
    const row = el("div", "button-row draft-actions");
    row.append(useBtn, editBtn, skipBtn);
    nodes.push(row);
    if (writerNote) nodes.push(el("p", "draft-note", writerNote));
    show(...nodes);
  }

  // ---- Chrome's built-in model -----------------------------------------------------------------------------------

  async function startNano(): Promise<void> {
    mode = "drafting";
    draftBtn.disabled = true;
    draftBtn.textContent = "Drafting answer (on-device)...";
    show(el("p", "draft-note", "Writing with Chrome's built-in AI, on this computer…"));
    try {
      const resumeText = await resumeTextOf(ctx.profile);
      const raw = await draftAnswerRaw(ctx.question, ctx.profile, ctx.job, { resumeText, limit });
      if (raw === null) return void showSetup(await resolveWriter());
      await showResult(raw, "Written by Chrome's built-in AI on this computer.");
    } catch (err) {
      showError(err);
    }
  }

  function nanoBlock(): HTMLElement {
    const box = el("div", "writer-option");
    box.append(el("p", "draft-note", "Or use Chrome's built-in AI: Chrome downloads it once, then it writes on this computer."));
    const status = el("p", "draft-note");
    const go = btn("Download Chrome's built-in AI", "secondary", () => {
      // Chrome starts this download only during a click: call it right here, before any other await.
      go.disabled = true;
      status.replaceChildren(el("span", "", "Starting Chrome's download…"));
      void downloadNano((f) => {
        status.replaceChildren(el("span", "", `Chrome is downloading its built-in AI: ${Math.round(f * 100)}%`), bar(f));
      }).then((ok) => {
        if (ok) void startNano();
        else {
          go.disabled = false;
          status.textContent = "Chrome could not download its built-in AI on this computer.";
        }
      });
    });
    box.append(go, status);
    return box;
  }

  // ---- our own model -----------------------------------------------------------------------------------------------

  function showError(err: unknown): void {
    mode = "idle";
    const box = el("div", "draft-error", `Drafting failed: ${String((err as Error)?.message ?? err)}`);
    box.append(btn("Dismiss", "ghost", reset));
    show(box);
    draftBtn.disabled = false;
    draftBtn.textContent = DRAFT_LABEL;
  }

  /** The first-time card: consent and download (and the Nano download when Chrome offers it), or the honest "none". */
  function showSetup(choice: WriterChoice, status?: WriterStatus, problem?: string): void {
    mode = "setup";
    lastChoice = choice;
    draftBtn.disabled = true;
    const card = el("div", "draft-alert writer-setup");
    const model = choice.local;
    if (model) {
      card.append(el("strong", "", "Write answers on this computer"));
      const file = status?.files[model.id];
      const active = status?.download?.modelId === model.id ? status.download : undefined;
      const shown = previewBox.querySelector<HTMLElement>(".writer-setup[data-phase='downloading']");
      if (active && shown) {
        // Same card, new numbers: the Cancel button stays put.
        shown.querySelector(".writer-dl-text")!.textContent = `Downloading the writing model: ${gb(active.done)} of ${gb(active.bytes)}. You can keep using ApplyAgent meanwhile.`;
        shown.querySelector(".writer-progress")?.replaceWith(bar(active.done / active.bytes));
        return;
      }
      card.dataset.phase = active ? "downloading" : "consent";
      if (active) {
        card.append(el("p", "writer-dl-text", `Downloading the writing model: ${gb(active.done)} of ${gb(active.bytes)}. You can keep using ApplyAgent meanwhile.`), bar(active.done / active.bytes));
        const row = el("div", "button-row");
        row.append(btn("Cancel download", "ghost", () => {
          void saveWriterSettings({ downloading: false });
          void writer.send({ type: "cancel-download" });
        }));
        card.append(row);
      } else {
        card.append(el("p", "", `Download the writing model once (${gb(model.bytes)}). After that, essays are written on this computer and nothing is sent anywhere.`));
        if (file && file.done > 0 && !file.complete) card.append(el("p", "draft-note", `${gb(file.done)} of ${gb(file.bytes)} already downloaded.`));
        if (problem) card.append(el("p", "draft-note writer-problem", problem));
        const row = el("div", "button-row");
        row.append(
          btn(file && file.done > 0 ? "Continue download" : "Download", "primary", () => void startDownload(model)),
          btn("Not now", "ghost", reset),
        );
        card.append(row);
      }
    }
    if (choice.offerNano) card.append(nanoBlock());
    if (!model && !choice.offerNano) {
      card.append(el("p", "", "This computer is too slow for the on-device writer. Please write this answer yourself."));
      card.append(btn("OK", "ghost", reset));
    } else if (!model) {
      card.append(btn("Not now", "ghost", reset));
    }
    show(card);
  }

  async function startDownload(model: WriterModel): Promise<void> {
    attach();
    await saveWriterSettings({ consented: true, modelId: model.id, downloading: true });
    await writer.send({ type: "download", modelId: model.id, baseUrl: (await testOverride()).baseUrl });
  }

  function showDrafting(text: string, status?: WriterStatus): void {
    mode = "drafting";
    draftBtn.disabled = true;
    draftBtn.textContent = "Drafting…";
    const s = status ?? writer.status;
    const line = el("p", "draft-note writer-line");
    const ahead = s ? s.queue.indexOf(id) + (s.running && s.running !== id ? 1 : 0) : 0;
    if (s?.loading) line.textContent = "Loading the writing model…";
    else if (s && s.running !== id && ahead > 0) line.textContent = `Waiting: ${ahead} answer${ahead > 1 ? "s" : ""} before this one.`;
    else line.textContent = "Writing on this computer… This can take a few minutes. Nothing is typed until you press Use.";
    // Updated in place while words stream in, so the Stop button stays put under the pointer.
    const oldLine = previewBox.querySelector<HTMLElement>(".writer-line");
    const oldLive = previewBox.querySelector<HTMLElement>(".draft-live");
    if (oldLine && oldLive) {
      oldLine.textContent = line.textContent;
      if (text || !oldLive.textContent) oldLive.textContent = text;
      return;
    }
    const live = el("div", "draft-live", text);
    live.setAttribute("aria-label", "Draft so far");
    const row = el("div", "button-row");
    row.append(btn("Stop", "ghost", () => void writer.send({ type: "stop", id })));
    show(line, live, row);
  }

  let seen = false;
  function attach(): void {
    if (attached) return;
    attached = true;
    const off = writer.on((msg: FromWriter) => {
      seen ||= container.isConnected;
      if (seen && !container.isConnected && mode !== "drafting") {
        // Removed from the panel (a new run re-rendered the questions): stop listening.
        off();
        attached = false;
        widgets.delete(handle);
        return;
      }
      void onWriter(msg);
    });
  }

  async function onWriter(msg: FromWriter): Promise<void> {
    switch (msg.type) {
      case "status": {
        const s = msg.status;
        if (mode === "setup" && lastChoice?.local) {
          const m = lastChoice.local;
          if (s.files[m.id]?.complete && !s.download) {
            await saveWriterSettings({ downloading: false });
            void startLocal(m);
          } else showSetup(lastChoice, s);
        } else if (mode === "drafting" && (s.queue.includes(id) || s.running === id)) {
          const live = previewBox.querySelector(".draft-live")?.textContent ?? "";
          showDrafting(live, s);
        }
        return;
      }
      case "token":
        if (msg.id === id) showDrafting(msg.text);
        return;
      case "draft-done":
        if (msg.id !== id) return;
        if (msg.tokensPerSec && localModel) {
          const settings = await loadWriterSettings();
          await saveWriterSettings({ tokensPerSec: { ...(settings.tokensPerSec ?? {}), [localModel.id]: msg.tokensPerSec } });
        }
        await showResult(msg.raw, `Written on this computer${localModel ? ` by ${localModel.name}` : ""} in ${minutes(msg.ms)}.`);
        return;
      case "draft-error":
        if (msg.id !== id) return;
        if (msg.message === "stopped") reset();
        else showError(msg.message);
        return;
      case "download-error":
        if (mode === "setup" && lastChoice?.local?.id === msg.modelId) {
          await saveWriterSettings({ downloading: false });
          const plain = msg.code === "mismatch" ? "The downloaded file was damaged, so it was deleted. Please try again."
            : msg.code === "aborted" ? "Download paused."
              : "The download stopped (check your internet connection). It continues from where it stopped.";
          showSetup(lastChoice, await writer.fetchStatus(), plain);
        }
        return;
      default:
    }
  }

  async function startLocal(model: WriterModel, queued = false): Promise<void> {
    localModel = model;
    attach();
    // No writer page (it could not start): offer the setup anyway; the download starts it again.
    const status = await writer.fetchStatus().catch(() => undefined);
    if (!status?.files[model.id]?.complete) {
      if (queued) return; // "Draft all" without a model: the first card shows the setup instead
      return showSetup(lastChoice ?? { writer: "local", offerNano: false, local: model }, status);
    }
    const src = await sources();
    showDrafting("", status);
    await writer.send({ type: "draft", modelId: model.id, request: { id, question: ctx.question, limit, profileFacts: src.profileFacts, resumeText: src.resumeText, job: src.job } });
  }

  async function start(queued: boolean): Promise<void> {
    if (mode === "drafting" || mode === "setup") return;
    draftBtn.disabled = true;
    draftBtn.textContent = "Checking on-device model...";
    try {
      const choice = await resolveWriter();
      lastChoice = choice;
      if (choice.writer === "nano") {
        if ((await nanoStatus()) === "available") return await startNano();
        if (queued) return reset();
        return showSetup(choice);
      }
      if (choice.writer === "local" && choice.local) return await startLocal(choice.local, queued);
      if (queued) return reset();
      showSetup(choice);
    } catch (err) {
      showError(err);
    }
  }

  draftBtn.addEventListener("click", () => void start(false));
  const handle: WidgetHandle = { id, container, start };
  widgets.add(handle);

  // A draft written while the panel was closed (or queued by "Draft all") is shown when the card comes back.
  void (async () => {
    const settings = await loadWriterSettings();
    if (!settings.consented) return;
    localModel = modelById(settings.modelId);
    attach();
    await resumePendingDownload().catch(() => undefined);
    const s = await writer.fetchStatus().catch(() => undefined);
    if (!s || mode !== "idle") return;
    const done = s.finished[id];
    if (done) await showResult(done.raw, `Written on this computer${localModel ? ` by ${localModel.name}` : ""} in ${minutes(done.ms)}.`);
    else if (s.running === id || s.queue.includes(id)) showDrafting("", s);
  })().catch(() => undefined);

  return container;
}

/** "Draft all answers" above the questions: queues every essay box of the page; the offscreen engine drafts them one
 * at a time in the background (the panel may close meanwhile). Drafts are only shown, never filled. */
export function createDraftAllBar(): HTMLElement {
  const box = el("div", "draft-all");
  const go = btn("Draft all answers", "secondary", () => void run());
  const line = el("p", "draft-note", "Writes a draft for each long question, one at a time, on this computer. Nothing is typed until you press Use.");
  line.setAttribute("aria-live", "polite");
  box.append(go, line);
  let ids: string[] = [];

  const update = (s: WriterStatus) => {
    if (!ids.length || !box.isConnected) return;
    const done = ids.filter((i) => s.finished[i]).length;
    const runningAt = ids.indexOf(s.running ?? "");
    if (runningAt >= 0 || ids.some((i) => s.queue.includes(i))) {
      line.textContent = `Drafting ${done + 1} of ${ids.length}…`;
      go.disabled = true;
    } else {
      line.textContent = done ? `${done} draft${done > 1 ? "s" : ""} ready to review. Nothing is typed until you press Use.` : line.textContent;
      go.disabled = false;
    }
  };
  writer.on((msg) => {
    if (msg.type === "status") update(msg.status);
  });

  async function run(): Promise<void> {
    const all = liveWidgets();
    if (!all.length) return;
    go.disabled = true;
    const choice = await resolveWriter();
    if (choice.writer === "local" && choice.local) {
      const status = await writer.fetchStatus();
      if (!status.files[choice.local.id]?.complete) {
        go.disabled = false;
        return all[0]!.start(false); // shows the consent and download card
      }
      ids = all.map((w) => w.id);
      for (const w of all) await w.start(true);
      return;
    }
    ids = [];
    if (choice.writer === "nano" && (await nanoStatus()) === "available") {
      // Chrome's built-in model is quick: one after another, here.
      for (const w of all) await w.start(true);
    } else {
      await all[0]!.start(false); // the setup card (Nano download, or "this computer is too slow")
    }
    go.disabled = false;
  }
  return box;
}
