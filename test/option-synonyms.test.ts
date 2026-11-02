// @vitest-environment node
import { describe, expect, it } from "vitest";
import { bestOption } from "../src/shared/option-matcher";

describe("L4: Option Synonyms & Robust Matching Engine", () => {
  describe("1. Degree Synonyms & Traps (Exact Level & Specialization)", () => {
    // Degree positive tests
    it("matches B.Tech to Bachelor of Technology", () => {
      expect(bestOption(["High School", "Bachelor of Technology", "Master of Science"], "B.Tech")).toBe("Bachelor of Technology");
    });

    it("matches B.Tech to generic Bachelor's Degree", () => {
      expect(bestOption(["High School", "Bachelor's Degree", "Master's Degree"], "B.Tech")).toBe("Bachelor's Degree");
    });

    it("matches B.E. to Bachelor of Engineering", () => {
      expect(bestOption(["High School", "Bachelor of Engineering", "Doctorate"], "B.E.")).toBe("Bachelor of Engineering");
    });

    it("matches BSc to Bachelor of Science", () => {
      expect(bestOption(["Associate", "Bachelor of Science", "Master of Arts"], "BSc")).toBe("Bachelor of Science");
    });

    it("matches M.Tech to Master of Technology", () => {
      expect(bestOption(["Bachelor of Technology", "Master of Technology", "PhD"], "M.Tech")).toBe("Master of Technology");
    });

    it("matches MBA to Master of Business Administration", () => {
      expect(bestOption(["Bachelor of Commerce", "Master of Business Administration", "Doctorate"], "MBA")).toBe("Master of Business Administration");
    });

    it("matches MBA to generic Master's Degree", () => {
      expect(bestOption(["Bachelor's Degree", "Master's Degree", "PhD"], "MBA")).toBe("Master's Degree");
    });

    it("matches MSc to Master of Science", () => {
      expect(bestOption(["Bachelor of Science", "Master of Science", "Doctorate"], "MSc")).toBe("Master of Science");
    });

    it("matches PhD to Doctorate", () => {
      expect(bestOption(["Bachelor's", "Master's", "Doctorate"], "PhD")).toBe("Doctorate");
    });

    it("matches 4 year college degree to Bachelor", () => {
      expect(bestOption(["High School", "4 year college degree", "Graduate degree"], "Bachelor")).toBe("4 year college degree");
    });

    // Degree Traps
    it("TRAP: completed Bachelor's must NOT match Bachelor's (in progress)", () => {
      expect(bestOption(["High School", "Bachelor's (in progress)", "Associate"], "Bachelor's Degree")).toBeUndefined();
    });

    it("TRAP: completed Bachelor's must NOT match currently enrolled / pursuing", () => {
      expect(bestOption(["High School", "Bachelor's degree currently enrolled"], "B.Tech")).toBeUndefined();
    });

    it("TRAP: completed Master's must NOT match incomplete Master's", () => {
      expect(bestOption(["Bachelor's Degree", "Master's (incomplete)"], "Master of Science")).toBeUndefined();
    });

    it("TRAP: MBA (business) must NOT match Master of Engineering", () => {
      expect(bestOption(["Bachelor of Engineering", "Master of Engineering"], "MBA")).toBeUndefined();
    });

    it("TRAP: B.Tech (technology) must NOT match Bachelor of Arts", () => {
      expect(bestOption(["Associate Degree", "Bachelor of Arts"], "B.Tech")).toBeUndefined();
    });

    it("TRAP: High School must NOT match Bachelor's", () => {
      expect(bestOption(["High School / GED", "Bachelor's Degree"], "High School")).toBe("High School / GED");
      expect(bestOption(["Bachelor's Degree", "Master's Degree"], "High School")).toBeUndefined();
    });
  });

  describe("2. City Synonyms & Traps (Canonical Bidirectional Mappings)", () => {
    // City positive tests
    it("matches Bengaluru to Bangalore", () => {
      expect(bestOption(["Delhi", "Bangalore", "Hyderabad"], "Bengaluru")).toBe("Bangalore");
    });

    it("matches Bangalore to Bengaluru", () => {
      expect(bestOption(["New Delhi", "Bengaluru", "Mumbai"], "Bangalore")).toBe("Bengaluru");
    });

    it("matches Gurugram to Gurgaon", () => {
      expect(bestOption(["Noida", "Gurgaon", "Pune"], "Gurugram")).toBe("Gurgaon");
    });

    it("matches Gurgaon to Gurugram", () => {
      expect(bestOption(["Noida", "Gurugram", "Pune"], "Gurgaon")).toBe("Gurugram");
    });

    it("matches Mumbai to Bombay", () => {
      expect(bestOption(["Delhi", "Bombay", "Chennai"], "Mumbai")).toBe("Bombay");
    });

    it("matches Bombay to Mumbai", () => {
      expect(bestOption(["Delhi", "Mumbai", "Chennai"], "Bombay")).toBe("Mumbai");
    });

    it("matches Kolkata to Calcutta", () => {
      expect(bestOption(["Delhi", "Calcutta", "Chennai"], "Kolkata")).toBe("Calcutta");
    });

    it("matches Chennai to Madras", () => {
      expect(bestOption(["Bangalore", "Madras", "Hyderabad"], "Chennai")).toBe("Madras");
    });

    it("matches München to Munich", () => {
      expect(bestOption(["Berlin", "Munich", "Frankfurt"], "München")).toBe("Munich");
    });

    it("matches Munich to München", () => {
      expect(bestOption(["Berlin", "München", "Frankfurt"], "Munich")).toBe("München");
    });

    it("matches Köln to Cologne", () => {
      expect(bestOption(["Hamburg", "Cologne", "Stuttgart"], "Köln")).toBe("Cologne");
    });

    it("matches Wien to Vienna", () => {
      expect(bestOption(["Salzburg", "Vienna", "Graz"], "Wien")).toBe("Vienna");
    });

    it("matches Roma to Rome", () => {
      expect(bestOption(["Milan", "Rome", "Naples"], "Roma")).toBe("Rome");
    });

    it("matches Praha to Prague", () => {
      expect(bestOption(["Brno", "Prague", "Ostrava"], "Praha")).toBe("Prague");
    });

    it("matches Warszawa to Warsaw", () => {
      expect(bestOption(["Krakow", "Warsaw", "Gdansk"], "Warszawa")).toBe("Warsaw");
    });

    it("matches Lisboa to Lisbon", () => {
      expect(bestOption(["Porto", "Lisbon", "Coimbra"], "Lisboa")).toBe("Lisbon");
    });

    it("matches Kyiv to Kiev", () => {
      expect(bestOption(["Lviv", "Kiev", "Odessa"], "Kyiv")).toBe("Kiev");
    });

    it("matches city with location qualifier (e.g. Bangalore, India)", () => {
      expect(bestOption(["Delhi, India", "Bangalore, India", "Hyderabad, India"], "Bengaluru")).toBe("Bangalore, India");
    });

    // City Traps
    it("TRAP: Pune must NOT match Bangalore", () => {
      expect(bestOption(["Delhi", "Bangalore", "Hyderabad"], "Pune")).toBeUndefined();
    });

    it("TRAP: Mumbai must NOT match Dubai (phonetic trap)", () => {
      expect(bestOption(["Doha", "Dubai", "Riyadh"], "Mumbai")).toBeUndefined();
    });

    it("TRAP: Berlin must NOT match Munich", () => {
      expect(bestOption(["Munich", "Frankfurt", "Hamburg"], "Berlin")).toBeUndefined();
    });
  });

  describe("3. Country Synonyms & Traps (Exact ISO Mapping)", () => {
    it("matches USA to United States", () => {
      expect(bestOption(["Canada", "United States", "Mexico"], "USA")).toBe("United States");
    });

    it("matches US to United States of America", () => {
      expect(bestOption(["Canada", "United States of America"], "US")).toBe("United States of America");
    });

    it("matches UK to United Kingdom", () => {
      expect(bestOption(["France", "United Kingdom", "Germany"], "UK")).toBe("United Kingdom");
    });

    it("matches Great Britain to United Kingdom", () => {
      expect(bestOption(["Ireland", "United Kingdom", "Germany"], "Great Britain")).toBe("United Kingdom");
    });

    it("matches Deutschland to Germany", () => {
      expect(bestOption(["Austria", "Germany", "Switzerland"], "Deutschland")).toBe("Germany");
    });

    it("matches Bharat to India", () => {
      expect(bestOption(["Pakistan", "India", "Bangladesh"], "Bharat")).toBe("India");
    });

    // Country Traps
    it("TRAP: Niger must NOT match Nigeria", () => {
      expect(bestOption(["Nigeria", "Ghana", "Kenya"], "Niger")).toBeUndefined();
    });

    it("TRAP: Austria must NOT match Australia", () => {
      expect(bestOption(["Australia", "New Zealand"], "Austria")).toBeUndefined();
    });

    it("TRAP: Iran must NOT match Iraq", () => {
      expect(bestOption(["Iraq", "Kuwait"], "Iran")).toBeUndefined();
    });
  });

  describe("4. Notice Ranges & Traps (Contained Numeric Brackets)", () => {
    it("matches 60 days to 2+ months", () => {
      expect(bestOption(["Immediate", "1 month", "2+ months"], "60 days")).toBe("2+ months");
    });

    it("matches 60 days to 2 months or more", () => {
      expect(bestOption(["Immediate", "30 days", "2 months or more"], "60 days")).toBe("2 months or more");
    });

    it("matches 45 days in 31-60 days range", () => {
      expect(bestOption(["Immediate", "1-30 days", "31-60 days", "60+ days"], "45 days")).toBe("31-60 days");
    });

    it("matches 15 days in 15 to 30 days bracket", () => {
      expect(bestOption(["Immediate", "15 to 30 days", "30+ days"], "15 days")).toBe("15 to 30 days");
    });

    it("matches 30 days in 1 to 2 months range", () => {
      expect(bestOption(["Immediate", "1 to 2 months", "3+ months"], "30 days")).toBe("1 to 2 months");
    });

    it("matches 90 days in 2-3 months range", () => {
      expect(bestOption(["1 month", "2-3 months", "4+ months"], "90 days")).toBe("2-3 months");
    });

    it("matches 0 days to Immediate", () => {
      expect(bestOption(["Immediate", "15 days", "30 days"], "0 days")).toBe("Immediate");
    });

    // Notice Traps
    it("TRAP: 30 days with overlapping ranges [15-30 days, 30-60 days] must be ambiguous (undefined)", () => {
      expect(bestOption(["15-30 days", "30-60 days"], "30 days")).toBeUndefined();
    });

    it("TRAP: 60 days with overlapping ranges [1-2 months, 2-3 months] must be ambiguous (undefined)", () => {
      expect(bestOption(["1-2 months", "2-3 months"], "60 days")).toBeUndefined();
    });

    it("TRAP: 45 days must NOT snap to 30 days or 60 days single tiers", () => {
      expect(bestOption(["Immediate", "30 days", "60 days"], "45 days")).toBeUndefined();
    });
  });

  describe("5. Experience Ranges & Traps (Exact Contained Brackets)", () => {
    it("matches 4 years in 3–5 years range", () => {
      expect(bestOption(["0-2 years", "3-5 years", "5+ years"], "4 years")).toBe("3-5 years");
    });

    it("matches 18 months in 1-2 years range", () => {
      expect(bestOption(["Less than 1 year", "1-2 years", "2-4 years"], "18 months")).toBe("1-2 years");
    });

    it("matches 6 years in 5+ years tier", () => {
      expect(bestOption(["1+ years", "3+ years", "5+ years"], "6 years")).toBe("5+ years");
    });

    it("matches 8 years in 5 to 10 years bracket", () => {
      expect(bestOption(["0-2 years", "3-5 years", "5 to 10 years", "10+ years"], "8 years")).toBe("5 to 10 years");
    });

    it("matches 1 year in single value 1 year", () => {
      expect(bestOption(["1 year", "2 years", "3 years"], "1 year")).toBe("1 year");
    });

    it("matches 0.5 years in less than 1 year", () => {
      expect(bestOption(["Less than 1 year", "1-3 years", "3+ years"], "6 months")).toBe("Less than 1 year");
    });

    // Experience Traps
    it("TRAP: 5 years with overlapping brackets [3-5 years, 5-8 years] must be ambiguous (undefined)", () => {
      expect(bestOption(["3-5 years", "5-8 years"], "5 years")).toBeUndefined();
    });

    it("TRAP: 2.5 years must NOT be truncated into 0-2 years", () => {
      expect(bestOption(["0-2 years", "3-5 years", "5+ years"], "2.5 years")).toBeUndefined();
    });

    it("TRAP: experience bracket logic must NOT fire on non-experience text", () => {
      expect(bestOption(["0-2 years", "3-5 years", "5+ years"], "Bachelor 2019")).toBeUndefined();
    });
  });

  describe("6. Polarity, Workplace, & Fluency Synonyms", () => {
    it("matches Yes in German (Ja)", () => {
      expect(bestOption(["Ja", "Nein"], "Yes")).toBe("Ja");
    });

    it("matches No in German (Nein)", () => {
      expect(bestOption(["Ja", "Nein"], "No")).toBe("Nein");
    });

    it("matches Yes in French (Oui)", () => {
      expect(bestOption(["Oui", "Non"], "Yes")).toBe("Oui");
    });

    it("matches No in French (Non)", () => {
      expect(bestOption(["Oui", "Non"], "No")).toBe("Non");
    });

    it("matches Remote workplace", () => {
      expect(bestOption(["On-site", "Hybrid", "Work from home / Remote"], "Remote")).toBe("Work from home / Remote");
    });

    it("matches Hybrid workplace", () => {
      expect(bestOption(["On-site", "Hybrid (2-3 days office)", "100% Remote"], "Hybrid")).toBe("Hybrid (2-3 days office)");
    });

    it("matches Fluent language level to Full Professional / C1", () => {
      expect(bestOption(["Basic (A1/A2)", "Conversational (B1/B2)", "Full professional proficiency (C1/C2)"], "Fluent")).toBe("Full professional proficiency (C1/C2)");
    });

    it("matches Native language proficiency", () => {
      expect(bestOption(["Elementary", "Intermediate", "Native / Bilingual"], "Native")).toBe("Native / Bilingual");
    });

    // Traps
    it("TRAP: 'No' must never pick 'Require sponsorship'", () => {
      const r = bestOption(["Require sponsorship", "Do not require sponsorship"], "No");
      expect(r).not.toBe("Require sponsorship");
      expect(r).toBeUndefined();
    });

    it("TRAP: 'No' must never pick 'N/A'", () => {
      expect(bestOption(["Yes", "N/A"], "No")).toBeUndefined();
    });

    it("TRAP: multiple different agreements makes 'Yes' ambiguous", () => {
      expect(bestOption(["I agree to terms", "I agree to marketing emails"], "Yes")).toBeUndefined();
    });
  });
});
