/** Salary lists of ranges: the one range holding the saved figure, never across currencies (round 12). */
import { describe, expect, it } from "vitest";
import { amountOf, salaryBandOption } from "../src/shared/salary-band";

describe("salary ranges", () => {
  const cad = ["Less than $100,000", "$100,000 - $120,000", "$120,001 - $140,000", "$140,001 - $160,000", "$160,001+"];
  it("reads saved figures", () => {
    expect(amountOf("CAD 140,000")).toEqual({ amount: 140000, currency: "CAD" });
    expect(amountOf("$120k")).toMatchObject({ amount: 120000 });
    expect(amountOf("12 LPA")).toMatchObject({ amount: 1200000 });
  });
  it("the one range holding the figure", () => {
    expect(salaryBandOption(cad, "CAD 140,000")).toBe("$120,001 - $140,000");
    expect(salaryBandOption(cad, "CAD 170,000")).toBe("$160,001+");
    expect(salaryBandOption(["80k-100k", "100k-120k", "120k-150k"], "USD 130,000")).toBe("120k-150k");
    expect(salaryBandOption(["100,000-120,000", "120,000-140,000"], "120000")).toBe("120,000-140,000"); // the edge: the range that starts there
  });
  it("never across currencies, never a guess", () => {
    expect(salaryBandOption(["€80,000 - €100,000", "€100,000 - €120,000"], "USD 110,000")).toBeUndefined();
    expect(salaryBandOption(["£50k-£60k", "£60k-£70k"], "EUR 65,000")).toBeUndefined();
    expect(salaryBandOption(["Competitive", "Negotiable"], "USD 110,000")).toBeUndefined();
    expect(salaryBandOption(cad, "")).toBeUndefined();
  });
});
