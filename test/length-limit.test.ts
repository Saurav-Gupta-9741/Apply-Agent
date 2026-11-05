// Round 7: answers must respect the length a question asks for ("in 200 words or less", "max. 500 Zeichen",
// "2-3 sentences", "400字以内") and the box's own cap. Wordings from real forms in several languages, plus traps that
// are not limits at all.
import { describe, expect, it } from "vitest";
import { checkLength, countWords, fitToLimit, lengthCounter, lengthLimit, limitInstruction } from "../src/shared/length-limit";

describe("reading the limit", () => {
  it.each([
    ["Why do you want to join us? (max 200 words)", { maxWords: 200 }],
    ["Tell us about yourself in 150 words or less", { maxWords: 150 }],
    ["Describe a project you led. Please keep it under 300 words.", { maxWords: 300 }],
    ["What motivates you? No more than 100 words.", { maxWords: 100 }],
    ["Cover note (maximum of 250 words)", { maxWords: 250 }],
    ["Please answer within 120 words", { maxWords: 120 }],
    ["Short answer, 50-100 words", { maxWords: 100, minWords: 50 }],
    ["Answer in 150 to 250 words", { maxWords: 250, minWords: 150 }],
    ["Word limit: 300", { maxWords: 300 }],
    ["Please write at least 100 words", { minWords: 100 }],
    ["Summary (500 characters max)", { maxChars: 500 }],
    ["Describe your role (max. 1,000 characters)", { maxChars: 1000 }],
    ["Character limit: 280", { maxChars: 280 }],
    ["Explain in 2-3 sentences", { maxSentences: 3 }],
    ["Describe it in one sentence", { maxSentences: 1 }],
    ["In a few sentences, tell us why", { maxSentences: 3 }],
    ["Describe yourself in one word", { maxWords: 1 }],
    ["Write one paragraph about your goals", { maxParagraphs: 1 }],
    // Other languages
    ["Warum möchtest du bei uns arbeiten? (max. 200 Wörter)", { maxWords: 200 }],
    ["Motivation (höchstens 1.000 Zeichen)", { maxChars: 1000 }],
    ["Pourquoi nous ? (500 caractères maximum)", { maxChars: 500 }],
    ["Pourquoi ce poste ? 200 mots maximum", { maxWords: 200 }],
    ["¿Por qué quieres unirte? (máximo 150 palabras)", { maxWords: 150 }],
    ["Conte sobre você (até 300 caracteres)", { maxChars: 300 }],
    ["Perché vuoi lavorare con noi? (massimo 100 parole)", { maxWords: 100 }],
    ["志望動機（400字以内）", { maxChars: 400 }],
    ["자기소개 (500자 이내)", { maxChars: 500 }],
    // Real wordings from the worldwide Greenhouse questions (round 7).
    ["請用 250 字告訴我們為什麼想加入 Dcard？", { maxChars: 250 }],
    ["What exceptional work have you done? In 100 words or less, tell us about a piece of work you are most proud of.", { maxWords: 100 }],
    ["Have you owned a data platform that other teams built on? In 2–3 sentences: what it was, who used it.", { maxSentences: 3 }],
    ["In two sentences, explain why it stood out to you.", { maxSentences: 2 }],
  ])("%s", (text, want) => {
    expect(lengthLimit(text)).toMatchObject(want);
  });
  it("a rough size is a target, not a cap", () => {
    expect(lengthLimit("Tell us about yourself in about 200 words")).toMatchObject({ maxWords: 220, approximate: true });
    expect(lengthLimit("Please write a 300-word essay")).toMatchObject({ maxWords: 300, approximate: true });
    expect(lengthLimit("Why Medium? (~100 words or less.)")).toEqual({ maxWords: 100 }); // "or less" is a cap
  });
  it("the box's own cap counts, and the smaller cap wins", () => {
    expect(lengthLimit("Why us?", 500)).toEqual({ maxChars: 500 });
    expect(lengthLimit("Why us? (max 1000 characters)", 800)).toMatchObject({ maxChars: 800 });
  });
  it("a counter shown under the box", () => {
    expect(lengthLimit("Additional information 0 / 2000 characters")).toMatchObject({ maxChars: 2000 });
  });
  it.each([
    "Why do you want to work here?",
    "How many years of experience do you have with Python?",
    "Do you have 3+ years of experience?",
    "Tell us a few words about yourself",
    "Describe a character from a book you love",
    "List 3 projects you are proud of",
    "What is your expected salary? (in USD, numbers only)",
    "Rate your English from 1 to 10",
    "Phone number (10 digits)",
  ])("not a limit: %s", (text) => {
    expect(lengthLimit(text)).toBeUndefined();
  });
  it("'no more than' is a cap only, 'no less than' a minimum only", () => {
    expect(lengthLimit("no more than 200 words")).toEqual({ maxWords: 200 });
    expect(lengthLimit("no less than 50 words")).toEqual({ minWords: 50 });
  });
});

describe("counting and fitting", () => {
  it("counts words, and Japanese or Chinese characters one by one", () => {
    expect(countWords("I built a Kafka pipeline, end-to-end.")).toBe(6);
    expect(countWords("私はエンジニアです")).toBe(9);
  });
  it("an answer over a hard limit is reported; a rough size never is", () => {
    const long = Array.from({ length: 30 }, () => "word").join(" ");
    expect(checkLength(long, { maxWords: 20 })).toMatchObject({ ok: false, words: 30, problem: "30 words; this question allows 20" });
    expect(checkLength(long, { maxWords: 22, approximate: true }).ok).toBe(true);
    expect(checkLength("x".repeat(501), { maxChars: 500 })).toMatchObject({ ok: false, problem: "501 characters; this question allows 500" });
  });
  it("a draft is cut at the last whole sentence that fits, nothing is added", () => {
    const draft = "I built a data pipeline at Initech. It cut report time by 40%. I also mentored two interns. I want to grow here.";
    expect(fitToLimit(draft, { maxWords: 14 })).toBe("I built a data pipeline at Initech. It cut report time by 40%.");
    expect(fitToLimit(draft, { maxSentences: 1 })).toBe("I built a data pipeline at Initech.");
    expect(fitToLimit(draft, { maxChars: 40 })).toBe("I built a data pipeline at Initech.");
    expect(fitToLimit(draft, { maxWords: 100 })).toBe(draft);
    expect(fitToLimit(draft, { maxWords: 3 })).toBeUndefined(); // not even one sentence fits: no draft
  });
  it("tells the AI the exact limit, and shows a counter", () => {
    expect(limitInstruction({ maxWords: 200, maxChars: 1500 })).toBe("Length: at most 200 words, at most 1500 characters including spaces. This is a hard limit.");
    expect(lengthCounter("one two three", { maxWords: 200 })).toBe("3 / 200 words");
    expect(lengthCounter("abc", { maxChars: 500 })).toBe("3 / 500 characters");
  });
});

describe("on the page", async () => {
  const { extractFields } = await import("../src/content/extract");
  const { fillField } = await import("../src/content/fill");
  const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(" ") + ".";
  it("reads the help text of the box, never another question's", () => {
    document.body.innerHTML = `
      <div class="field"><label for="a">Why do you want to join us?</label><textarea id="a"></textarea><p class="description">Max 50 words</p></div>
      <div class="field"><label for="b">Anything else?</label><textarea id="b" aria-describedby="bh"></textarea><span id="bh">0 / 300 characters</span></div>
      <div class="field"><label for="c">Your city</label><input id="c" type="text"></div>`;
    const fields = extractFields(document);
    const by = (l: string) => fields.find((f) => f.descriptor.label.startsWith(l))!;
    expect(by("Why do you").descriptor.hint).toBe("Max 50 words");
    expect(by("Anything else").descriptor.hint).toContain("0 / 300 characters");
    expect(by("Your city").descriptor.hint).toBeUndefined();
  });
  it("an answer over the stated limit is not typed; one that fits is", () => {
    document.body.innerHTML = `<div class="field"><label for="a">Why do you want to join us?</label><textarea id="a"></textarea><p class="description">Max 50 words</p></div>`;
    const [field] = extractFields(document);
    expect(fillField(field!, words(60))).toEqual({ ok: false, detail: "answer is 60 words; this question allows 50" });
    expect((document.getElementById("a") as HTMLTextAreaElement).value).toBe("");
    expect(fillField(field!, words(40)).ok).toBe(true);
  });
});
