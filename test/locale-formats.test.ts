// @vitest-environment node
import { describe, expect, it } from "vitest";
import { formatAddress, formatDate, formatName, formatPhone, formatSalary } from "../src/shared/locale/formats";

describe("L4: Locale Formats (Date, Phone, Salary, Name, Address)", () => {
  describe("1. Date Formatting", () => {
    const parts = { year: 2026, month: 11, day: 3 };

    it("respects explicit DD/MM/YYYY placeholder", () => {
      expect(formatDate(parts, "DD/MM/YYYY")).toBe("03/11/2026");
    });

    it("respects explicit MM/DD/YYYY placeholder", () => {
      expect(formatDate(parts, "MM/DD/YYYY")).toBe("11/03/2026");
    });

    it("respects explicit YYYY-MM-DD placeholder", () => {
      expect(formatDate(parts, "YYYY-MM-DD")).toBe("2026-11-03");
    });

    it("respects Japanese kanji date placeholder", () => {
      expect(formatDate(parts, "YYYY年MM月DD日")).toBe("2026年11月03日");
    });

    it("applies US default date format (MM/DD/YYYY)", () => {
      expect(formatDate(parts, undefined, "US")).toBe("11/03/2026");
    });

    it("applies Germany default date format (DD.MM.YYYY)", () => {
      expect(formatDate(parts, undefined, "DE")).toBe("03.11.2026");
    });

    it("applies Japan default date format (YYYY-MM-DD)", () => {
      expect(formatDate(parts, undefined, "JP")).toBe("2026-11-03");
    });

    it("applies India default date format (DD/MM/YYYY)", () => {
      expect(formatDate(parts, undefined, "IN")).toBe("03/11/2026");
    });
  });

  describe("2. Phone Formatting", () => {
    it("formats US phone to E.164 and national format", () => {
      const res = formatPhone("5125551234", "US");
      expect(res.e164).toBe("+15125551234");
      expect(res.national).toBe("(512) 555-1234");
      expect(res.dialCode).toBe("+1");
    });

    it("formats Indian phone to E.164 and national format", () => {
      const res = formatPhone("9876543210", "IN");
      expect(res.e164).toBe("+919876543210");
      expect(res.national).toBe("98765 43210");
      expect(res.dialCode).toBe("+91");
    });

    it("formats UK phone to E.164 and national format", () => {
      const res = formatPhone("7911123456", "GB");
      expect(res.e164).toBe("+447911123456");
      expect(res.national).toBe("07911 123456");
      expect(res.dialCode).toBe("+44");
    });
  });

  describe("3. Salary Formatting & Strict Currency Non-Conversion", () => {
    it("formats INR in LPA notation", () => {
      expect(formatSalary(1200000, "INR", "lakh_crore")).toBe("₹12 LPA");
      expect(formatSalary(1450000, "INR", "lakh_crore")).toBe("₹14.5 LPA");
    });

    it("formats USD in standard and k notation", () => {
      expect(formatSalary(140000, "USD", "k")).toBe("$140k");
      expect(formatSalary(140000, "USD", "standard")).toBe("$140,000");
    });

    it("formats EUR with symbol", () => {
      expect(formatSalary(75000, "EUR", "standard")).toBe("€75,000");
    });

    it("formats GBP with symbol", () => {
      expect(formatSalary(85000, "GBP", "standard")).toBe("£85,000");
    });
  });

  describe("4. Name Ordering (Family-First vs Given-First)", () => {
    it("uses family-first ordering for Japan, China, Korea", () => {
      const jp = formatName("Taro", "Tanaka", "JP");
      expect(jp.display).toBe("Tanaka Taro");
      expect(jp.familyFirst).toBe(true);

      const cn = formatName("Wei", "Zhang", "CN");
      expect(cn.display).toBe("Zhang Wei");
      expect(cn.familyFirst).toBe(true);
    });

    it("uses given-first ordering for Western and Indian locales", () => {
      const us = formatName("Alex", "Morgan", "US");
      expect(us.display).toBe("Alex Morgan");
      expect(us.familyFirst).toBe(false);

      const ind = formatName("Aarav", "Sharma", "IN");
      expect(ind.display).toBe("Aarav Sharma");
      expect(ind.familyFirst).toBe(false);
    });
  });

  describe("5. Address Sequence", () => {
    it("orders postal code before city in Germany and France", () => {
      const de = formatAddress({
        line1: "Musterstr. 12",
        city: "Berlin",
        postalCode: "10115",
        country: "Germany",
        countryAlpha2: "DE",
      });
      expect(de.fieldOrder).toEqual(["line1", "line2", "postalCode", "city", "state", "country"]);
      expect(de.formatted).toContain("10115 Berlin");
    });

    it("orders city before postal code in US and India", () => {
      const us = formatAddress({
        line1: "123 Main St",
        city: "Austin",
        state: "TX",
        postalCode: "78701",
        country: "United States",
        countryAlpha2: "US",
      });
      expect(us.fieldOrder).toEqual(["line1", "line2", "city", "state", "postalCode", "country"]);
      expect(us.formatted).toContain("Austin, TX, 78701");
    });
  });
});
