// @vitest-environment node
import { describe, expect, it } from "vitest";
import { checkCountryWorkAuthorization, evaluateEeoPolicy } from "../src/shared/locale/country-rules";

describe("L4: Locale Country Rules & Compliance", () => {
  describe("1. EEO & Demographic Policies", () => {
    it("allows standard voluntary self-identification in the United States", () => {
      expect(evaluateEeoPolicy("race", "US")).toBe("standard_voluntary");
      expect(evaluateEeoPolicy("veteran", "US")).toBe("standard_voluntary");
      expect(evaluateEeoPolicy("disability", "US")).toBe("standard_voluntary");
      expect(evaluateEeoPolicy("gender", "US")).toBe("standard_voluntary");
    });

    it("prohibits or skips EEO tracking in Germany and France", () => {
      expect(evaluateEeoPolicy("race", "DE")).toBe("prohibited_or_skip");
      expect(evaluateEeoPolicy("race", "FR")).toBe("prohibited_or_skip");
    });

    it("uses UK diversity monitoring standard in Great Britain", () => {
      expect(evaluateEeoPolicy("race", "GB")).toBe("uk_monitoring");
      expect(evaluateEeoPolicy("gender", "GB")).toBe("uk_monitoring");
    });

    it("strictly flags consent and legal declarations as human_only across all countries", () => {
      expect(evaluateEeoPolicy("consent", "US")).toBe("human_only");
      expect(evaluateEeoPolicy("consent", "DE")).toBe("human_only");
      expect(evaluateEeoPolicy("legal_declaration", "GB")).toBe("human_only");
      expect(evaluateEeoPolicy("signature", "IN")).toBe("human_only");
    });
  });

  describe("2. Work Authorization Country Checks", () => {
    const auth = ["United States", "Canada"];
    const unauth = ["India", "United Kingdom", "Germany"];

    it("returns 'yes' for authorized country", () => {
      expect(checkCountryWorkAuthorization("United States", auth, unauth)).toBe("yes");
      expect(checkCountryWorkAuthorization("Canada", auth, unauth)).toBe("yes");
    });

    it("returns 'no' for explicitly unauthorized country", () => {
      expect(checkCountryWorkAuthorization("United Kingdom", auth, unauth)).toBe("no");
      expect(checkCountryWorkAuthorization("Germany", auth, unauth)).toBe("no");
    });

    it("returns 'ask' for unlisted country rather than guessing 'no'", () => {
      expect(checkCountryWorkAuthorization("Australia", auth, unauth)).toBe("ask");
      expect(checkCountryWorkAuthorization("Singapore", auth, unauth)).toBe("ask");
      expect(checkCountryWorkAuthorization("Japan", auth, unauth)).toBe("ask");
    });

    it("returns 'ask' when unauthorized countries list is not provided and country is not in auth", () => {
      expect(checkCountryWorkAuthorization("United Kingdom", auth, undefined)).toBe("ask");
    });
  });
});
