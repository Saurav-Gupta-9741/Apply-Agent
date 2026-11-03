/** Bugs found by Claude's probes of origin/arena (553c7fe). Each test failed before arena-fix Step 3. */
import { describe, expect, it } from "vitest";
import { decide } from "../src/content/classify";
import { bestOption } from "../src/shared/option-matcher";
import { EMPTY_PROFILE } from "../src/shared/storage";
import type { FieldDescriptor, Profile } from "../src/shared/types";
import { PROFILE } from "./fixtures";

const yesNo = (label: string): FieldDescriptor =>
  ({ key: "k", label, control: "select", required: true, options: ["Yes", "No"], name: "field", autocomplete: "", placeholder: "" });
const IN: Profile = { ...PROFILE, country: "India", facts: { ...EMPTY_PROFILE.facts!, workCountries: "India" } };
const withUnauth = (countries: string): Profile => ({ ...IN, facts: { ...IN.facts!, unauthorizedCountries: countries } });
const SPONSOR_UK = "Will you require visa sponsorship to work in the UK?";

describe("sponsorship for a country the user did not list", () => {
  it("asks when the UK is neither allowed nor marked unauthorized", () => {
    expect(decide(yesNo(SPONSOR_UK), IN, []).kind).toBe("ask");
  });
  it("answers Yes when the user marked the UK as not authorized", () => {
    expect(decide(yesNo(SPONSOR_UK), withUnauth("United Kingdom"), [])).toMatchObject({ kind: "answer", value: "Yes" });
  });
  it("answers No for a country the user may work in", () => {
    expect(decide(yesNo("Will you require visa sponsorship to work in India?"), IN, [])).toMatchObject({ kind: "answer", value: "No" });
  });
  it("still asks for Canada when only the UK is marked unauthorized", () => {
    expect(decide(yesNo("Do you need sponsorship to work in Canada?"), withUnauth("United Kingdom"), []).kind).toBe("ask");
  });
});

describe("overlapping year brackets", () => {
  it("asks when both a range and an N+ option contain the value", () => {
    expect(bestOption(["1-2 years", "3-5 years", "5+ years"], "5")).toBeUndefined();
  });
  it("still picks the single containing range", () => {
    expect(bestOption(["1-2 years", "3-5 years", "6+ years"], "4")).toBe("3-5 years");
  });
  it("still picks N+ above every range", () => {
    expect(bestOption(["1-2 years", "3-5 years", "5+ years"], "7")).toBe("5+ years");
  });
});

describe("city aliases pick the city itself, never a district", () => {
  it.each([
    ["Bengaluru", ["Bangalore", "Bangalore Rural", "Mysore"], "Bangalore"],
    ["Gurugram", ["Gurgaon", "Faridabad"], "Gurgaon"],
    ["Mumbai", ["Bombay", "Navi Mumbai", "Thane"], "Bombay"],
    ["Chennai", ["Madras", "Coimbatore"], "Madras"],
    ["Kolkata", ["Calcutta", "Howrah"], "Calcutta"],
  ])("%s → %s", (wanted, options, want) => {
    expect(bestOption(options as string[], wanted as string)).toBe(want);
  });
  it("never maps Bengaluru to Bangalore Rural alone", () => {
    expect(bestOption(["Bangalore Rural", "Mysore"], "Bengaluru")).toBeUndefined();
  });
});

describe("city with its region still matches", () => {
  it.each([
    ["Bengaluru", ["Bangalore, India", "Mysore, India"], "Bangalore, India"],
    ["Bangalore", ["Bengaluru (Karnataka)", "Hyderabad (Telangana)"], "Bengaluru (Karnataka)"],
  ])("%s → %s", (wanted, options, want) => {
    expect(bestOption(options as string[], wanted as string)).toBe(want);
  });
});
