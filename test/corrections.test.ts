import { describe, expect, it, vi } from "vitest";
import { applyCorrection, findSuggestedCorrection, isLearnableCorrection } from "../src/shared/corrections";
import { trackCorrection } from "../src/content/corrections";
import type { ExtractedField } from "../src/content/extract";

describe("user correction safety guards (isLearnableCorrection)", () => {
  it("rejects passwords and pin codes", () => {
    expect(isLearnableCorrection("Enter your password")).toBe(false);
    expect(isLearnableCorrection("Confirm Password")).toBe(false);
    expect(isLearnableCorrection("Account PIN")).toBe(false);
    expect(isLearnableCorrection("Any label", "password")).toBe(false);
  });

  it("rejects someone else's details", () => {
    expect(isLearnableCorrection("Reference Name")).toBe(false);
    expect(isLearnableCorrection("Please provide 2 references")).toBe(false);
    expect(isLearnableCorrection("Manager Name & Title")).toBe(false);
    expect(isLearnableCorrection("Emergency Contact Phone Number")).toBe(false);
    expect(isLearnableCorrection("Who referred you to this role?")).toBe(false);
    expect(isLearnableCorrection("Spouse Employer")).toBe(false);
    expect(isLearnableCorrection("Relative working at the company")).toBe(false);
  });

  it("rejects identity and financial numbers", () => {
    expect(isLearnableCorrection("SSN (Social Security Number)")).toBe(false);
    expect(isLearnableCorrection("Passport Number")).toBe(false);
    expect(isLearnableCorrection("Tax ID / PAN")).toBe(false);
    expect(isLearnableCorrection("Driver's license number")).toBe(false);
    expect(isLearnableCorrection("National ID number")).toBe(false);
    expect(isLearnableCorrection("Bank Account Number")).toBe(false);
  });

  it("rejects legal declarations, attestations, signatures, and consents", () => {
    expect(isLearnableCorrection("I certify that all statements above are true")).toBe(false);
    expect(isLearnableCorrection("Signature of Applicant")).toBe(false);
    expect(isLearnableCorrection("Are you subject to any non-compete agreement?")).toBe(false);
    expect(isLearnableCorrection("Do you agree to the privacy policy?")).toBe(false);
    expect(isLearnableCorrection("Consent to drug testing and background check")).toBe(false);
  });

  it("accepts safe screening and role preference questions", () => {
    expect(isLearnableCorrection("What is your primary programming language?")).toBe(true);
    expect(isLearnableCorrection("How many years of experience do you have with TypeScript?")).toBe(true);
    expect(isLearnableCorrection("Are you willing to work overtime?")).toBe(true);
    expect(isLearnableCorrection("Notice period at current job")).toBe(true);
    expect(isLearnableCorrection("Preferred working hours")).toBe(true);
  });
});

describe("applyCorrection logic and threshold", () => {
  it("records first correction with count=1 and does not promote to answer bank", () => {
    const initial: any[] = [];
    const res = applyCorrection(initial, "Preferred editor", "Neovim");
    expect(res.promotedToAnswerBank).toBe(false);
    expect(res.promotedEntry).toBeUndefined();
    expect(res.updatedCorrections.length).toBe(1);
    expect(res.updatedCorrections[0]!.count).toBe(1);
    expect(res.updatedCorrections[0]!.answer).toBe("Neovim");
  });

  it("promotes to answer bank on the second identical correction", () => {
    const list1 = applyCorrection([], "Preferred editor", "Neovim").updatedCorrections;
    const res2 = applyCorrection(list1, "Preferred editor", "Neovim");
    expect(res2.promotedToAnswerBank).toBe(true);
    expect(res2.promotedEntry).toBeDefined();
    expect(res2.promotedEntry!.question).toBe("Preferred editor");
    expect(res2.promotedEntry!.answer).toBe("Neovim");
    expect(res2.updatedCorrections[0]!.count).toBe(2);
  });

  it("matches question text case-insensitively", () => {
    const list1 = applyCorrection([], "Preferred Editor", "VS Code").updatedCorrections;
    const res2 = applyCorrection(list1, "preferred editor", "VS Code");
    expect(res2.promotedToAnswerBank).toBe(true);
    expect(res2.promotedEntry?.answer).toBe("VS Code");
  });

  it("findSuggestedCorrection returns the suggestion for count=1", () => {
    const list = applyCorrection([], "Favorite IDE", "IntelliJ").updatedCorrections;
    const suggestion = findSuggestedCorrection(list, "favorite ide");
    expect(suggestion).toBeDefined();
    expect(suggestion?.answer).toBe("IntelliJ");
    expect(suggestion?.count).toBe(1);
  });
});

describe("content script correction tracking (trackCorrection)", () => {
  it("fires RECORD_CORRECTION only when a filled field is edited on blur/change", () => {
    const input = document.createElement("input");
    input.type = "text";
    input.value = "Original";
    document.body.appendChild(input);

    const field: ExtractedField = {
      descriptor: {
        key: "ide",
        name: "ide",
        label: "Preferred IDE",
        control: "text",
        options: [],
        required: true,
        autocomplete: "",
        placeholder: "",
      },
      elements: [input],
    };

    const messages: any[] = [];
    const mockSendMessage = vi.fn((msg) => {
      messages.push(msg);
      return Promise.resolve();
    });
    (globalThis as any).chrome = {
      runtime: {
        sendMessage: mockSendMessage,
      },
    };

    trackCorrection(document, field);

    // Blurring without change does nothing
    input.dispatchEvent(new Event("blur"));
    expect(messages.length).toBe(0);

    // Typing and blurring records correction
    input.value = "Emacs";
    input.dispatchEvent(new Event("blur"));
    expect(messages.length).toBe(1);
    expect(messages[0]).toEqual({
      type: "RECORD_CORRECTION",
      question: "Preferred IDE",
      answer: "Emacs",
    });

    // Blurring again with same value does not repeat
    input.dispatchEvent(new Event("blur"));
    expect(messages.length).toBe(1);

    document.body.removeChild(input);
  });

  it("never tracks unlearnable fields like passwords or references", () => {
    const input = document.createElement("input");
    input.type = "text";
    input.value = "Secret";
    document.body.appendChild(input);

    const field: ExtractedField = {
      descriptor: {
        key: "ref",
        name: "ref",
        label: "Reference Name",
        control: "text",
        options: [],
        required: true,
        autocomplete: "",
        placeholder: "",
      },
      elements: [input],
    };

    const messages: any[] = [];
    (globalThis as any).chrome = {
      runtime: {
        sendMessage: vi.fn((msg) => {
          messages.push(msg);
          return Promise.resolve();
        }),
      },
    };

    trackCorrection(document, field);
    input.value = "New Person";
    input.dispatchEvent(new Event("blur"));
    expect(messages.length).toBe(0);

    document.body.removeChild(input);
  });
});
