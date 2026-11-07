// Word and sentence counting in scripts without spaces (Thai, Lao, Khmer, Myanmar) and with their own sentence ends
// (Hindi danda, Arabic/Urdu marks, Armenian, Ethiopic, Myanmar, CJK).
import { describe, expect, it } from "vitest";
import { checkLength, countWords, fitToLimit, sentences } from "../src/shared/length-limit";

describe("countWords in every script", () => {
  it("splits Thai, Lao, Khmer and Myanmar into dictionary words, not one blob", () => {
    expect(countWords("ฉันเป็นวิศวกรข้อมูล")).toBeGreaterThanOrEqual(3); // I am a data engineer
    expect(countWords("ខ្ញុំជាវិស្វករ")).toBeGreaterThanOrEqual(2); // Khmer: I am an engineer
    expect(countWords("ຂ້ອຍເປັນວິສະວະກອນ")).toBeGreaterThanOrEqual(2); // Lao
    expect(countWords("ကျွန်တော်အင်ဂျင်နီယာပါ")).toBeGreaterThanOrEqual(2); // Myanmar
  });
  it("keeps the old counts for spaced scripts and CJK", () => {
    expect(countWords("I built a Kafka pipeline, end-to-end.")).toBe(6);
    expect(countWords("私はエンジニアです")).toBe(9);
    expect(countWords("मैं एक डेटा इंजीनियर हूँ।")).toBe(5);
    expect(countWords("أنا مهندس بيانات")).toBe(3);
  });
  it("mixes scripts in one answer", () => {
    expect(countWords("ฉันใช้ Python ทุกวัน")).toBeGreaterThanOrEqual(4);
  });
  it("a Thai essay over a word limit is now caught", () => {
    const long = "ฉันเป็นวิศวกรข้อมูลที่ทำงานกับระบบขนาดใหญ่ ".repeat(20);
    expect(checkLength(long, { maxWords: 50 }).ok).toBe(false);
  });
});

describe("sentences in every script", () => {
  it.each([
    ["मैंने यह बनाया। फिर मैंने इसे सुधारा।", 2],
    ["আমি এটি তৈরি করেছি। তারপর উন্নত করেছি।", 2],
    ["لماذا تريد هذا؟ لأنني أحب البيانات.", 2],
    ["میں نے یہ بنایا۔ پھر بہتر کیا۔", 2],
    ["Ես կառուցեցի։ Հետո բարելավեցի։", 2],
    ["ይህን ሠራሁ። ከዚያ አሻሻልኩት።", 2],
    ["私が作りました。改善しました！", 2],
    ["I built it. Then I improved it!", 2],
    ['He said "done." Then left.', 2],
  ])("%s → %i", (text, n) => {
    expect(sentences(text as string)).toHaveLength(n as number);
  });
  it("cuts a Hindi answer at a whole sentence to meet a 1-sentence limit", () => {
    expect(fitToLimit("मैंने यह बनाया। फिर मैंने इसे सुधारा।", { maxSentences: 1 })).toBe("मैंने यह बनाया।");
  });
});
