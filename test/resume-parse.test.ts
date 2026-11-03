import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseResume, skillInText, splitColumns, docxXmlToText, pdfPagesToText, extractPdfText, docxToText } from "../src/shared/resume-parse";

describe("Resume Import & Parsing Engine", () => {
  const load = (name: string) => readFileSync(`test/fixtures/resumes/${name}`, "utf8");

  describe("1. Fresher India (fresher-india.txt)", () => {
    it("extracts exact fields for Indian fresher profile", () => {
      const text = load("fresher-india.txt");
      const parsed = parseResume(text, new Date("2026-06-01"));

      expect(parsed.fullName).toBe("Priya Sharma");
      
      const byField = new Map(parsed.suggestions.map((s) => [s.field, s.value]));
      expect(byField.get("firstName")).toBe("Priya");
      expect(byField.get("lastName")).toBe("Sharma");
      expect(byField.get("email")).toBe("priya.sharma+jobs@gmail.com");
      expect(byField.get("phone")).toBe("+91 98765 43210");
      expect(byField.get("location")).toBe("Jodhpur");
      expect(byField.get("country")).toBe("India");
      expect(byField.get("linkedin")).toBe("https://linkedin.com/in/priya-sharma-dev");
      expect(byField.get("github")).toBe("https://github.com/priyasharma");

      // Education
      expect(byField.get("school")).toBe("Indian Institute of Technology Jodhpur");
      expect(byField.get("degree")).toBe("B.Tech");
      expect(byField.get("discipline")).toBe("Computer Science and Engineering");
      expect(byField.get("graduationYear")).toBe("2025");
      expect(byField.get("educationLevel")).toBe("Bachelor's");

      // Internships only -> total years experience not worked out
      expect(byField.get("experienceYears")).toBeUndefined();
      expect(parsed.questions).toContain("Only internships were found, so total years of experience were not worked out.");

      // Skills
      expect(parsed.skills).toContain("Python");
      expect(parsed.skills).toContain("Java");
      expect(parsed.skills).toContain("React");
      expect(parsed.skills).toContain("Node.js");
      expect(parsed.skills).toContain("Docker");

      // Languages
      const langs = parsed.suggestions.filter((s) => s.field === "languages").map((s) => s.value);
      expect(langs).toContain("English (Fluent)");
      expect(langs).toContain("Hindi (Native)");
    });
  });

  describe("2. EU Berlin (eu-berlin.txt)", () => {
    it("extracts exact fields for European bilingual profile with dates", () => {
      const text = load("eu-berlin.txt");
      // Anchor to a specific date for current job calculation
      const parsed = parseResume(text, new Date("2026-06-01"));

      expect(parsed.fullName).toBe("Lukas Müller");
      const byField = new Map(parsed.suggestions.map((s) => [s.field, s.value]));

      expect(byField.get("firstName")).toBe("Lukas");
      expect(byField.get("lastName")).toBe("Müller");
      expect(byField.get("email")).toBe("lukas.mueller@posteo.de");
      expect(byField.get("phone")).toBe("+49 30 12345678");
      expect(byField.get("location")).toBe("Berlin");
      expect(byField.get("country")).toBe("Germany");
      expect(byField.get("portfolio")).toBe("https://lukasmueller.eu");

      // Education (highest degree)
      expect(byField.get("school")).toBe("Technical University of Munich");
      expect(byField.get("degree")).toBe("Master of Science");
      expect(byField.get("discipline")).toBe("Informatics");
      expect(byField.get("graduationYear")).toBe("2022");
      expect(byField.get("educationLevel")).toBe("Master's");

      // Work experience: April 2022 to June 2026 = 4 years 2 months = 4 years
      expect(byField.get("currentCompany")).toBe("Zalando SE");
      expect(byField.get("currentTitle")).toBe("Backend Developer");
      expect(byField.get("experienceYears")).toBe("4");

      // Skills
      expect(parsed.skills).toContain("Kotlin");
      expect(parsed.skills).toContain("Scala");
      expect(parsed.skills).toContain("Kubernetes");
      expect(parsed.skills).toContain("PostgreSQL");

      // Languages
      const langs = parsed.suggestions.filter((s) => s.field === "languages").map((s) => s.value);
      expect(langs).toContain("German (Native)");
      expect(langs).toContain("English (Fluent)");
      expect(langs).toContain("French (Basic)");
    });
  });

  describe("3. Senior SWE (senior-swe.txt)", () => {
    it("extracts multi-job career timeline with overlapping months counted once", () => {
      const text = load("senior-swe.txt");
      const parsed = parseResume(text, new Date("2026-06-01"));

      expect(parsed.fullName).toBe("Rahul Verma");
      const byField = new Map(parsed.suggestions.map((s) => [s.field, s.value]));

      expect(byField.get("firstName")).toBe("Rahul");
      expect(byField.get("lastName")).toBe("Verma");
      expect(byField.get("email")).toBe("rahul.verma@outlook.com");
      expect(byField.get("phone")).toBe("+91-99887-76655");
      expect(byField.get("location")).toBe("Bengaluru");
      expect(byField.get("country")).toBe("India");
      expect(byField.get("linkedin")).toBe("https://www.linkedin.com/in/rahulverma88");
      expect(byField.get("portfolio")).toBe("https://rahulverma.dev");

      expect(byField.get("currentCompany")).toBe("Razorpay");
      expect(byField.get("currentTitle")).toBe("Senior Software Engineer");

      // Jun 2016 to Jun 2026 = 10 years
      expect(byField.get("experienceYears")).toBe("10");

      // Education
      expect(byField.get("school")).toBe("National Institute of Technology, Trichy");
      expect(byField.get("degree")).toBe("B.E.");
      expect(byField.get("discipline")).toBe("Electronics and Communication Engineering");
      expect(byField.get("graduationYear")).toBe("2016");

      // Skills
      expect(parsed.skills).toContain("Go");
      expect(parsed.skills).toContain("Kafka");
      expect(parsed.skills).toContain("Redis");
    });
  });

  describe("4. Two-Column Layout (two-column.txt)", () => {
    it("parses two-column resumes without interleaving columns", () => {
      const text = load("two-column.txt");
      const parsed = parseResume(text, new Date("2026-06-01"));

      expect(parsed.fullName).toBe("Meera Nair");
      const byField = new Map(parsed.suggestions.map((s) => [s.field, s.value]));

      expect(byField.get("firstName")).toBe("Meera");
      expect(byField.get("lastName")).toBe("Nair");
      expect(byField.get("email")).toBe("meera.nair@gmail.com");
      expect(byField.get("phone")).toBe("+91 87654 32109");
      expect(byField.get("location")).toBe("Kochi");
      expect(byField.get("country")).toBe("India");
      expect(byField.get("linkedin")).toBe("https://linkedin.com/in/meeranair");

      expect(byField.get("currentCompany")).toBe("Swiggy");
      expect(byField.get("currentTitle")).toBe("Frontend Developer");

      // Jul 2019 to Jun 2026 = ~7 years
      expect(byField.get("experienceYears")).toBe("6");

      expect(byField.get("school")).toBe("College of Engineering Trivandrum");
      expect(byField.get("degree")).toBe("B.Tech");
      expect(byField.get("discipline")).toBe("Information Technology");
      expect(byField.get("graduationYear")).toBe("2019");

      expect(parsed.skills).toContain("React");
      expect(parsed.skills).toContain("TypeScript");
      expect(parsed.skills).toContain("Redux");

      const langs = parsed.suggestions.filter((s) => s.field === "languages").map((s) => s.value);
      expect(langs).toContain("Malayalam (Native)");
      expect(langs).toContain("English (Fluent)");
    });
  });

  describe("5. US New York (us-new-york.txt)", () => {
    it("extracts US contact formats, state codes and multi-degree hierarchies", () => {
      const text = load("us-new-york.txt");
      const parsed = parseResume(text, new Date("2026-06-01"));

      expect(parsed.fullName).toBe("Emily J. Carter");
      const byField = new Map(parsed.suggestions.map((s) => [s.field, s.value]));

      expect(byField.get("firstName")).toBe("Emily");
      expect(byField.get("lastName")).toBe("Carter");
      expect(byField.get("email")).toBe("emily.carter@protonmail.com");
      expect(byField.get("phone")).toBe("(212) 555-0147");
      expect(byField.get("location")).toBe("New York");
      expect(byField.get("state")).toBe("NY");
      expect(byField.get("country")).toBe("United States");
      expect(byField.get("github")).toBe("https://github.com/emcarter");

      // Education: highest degree should be M.S. (Columbia University) over B.S. (Michigan)
      expect(byField.get("school")).toBe("Columbia University");
      expect(byField.get("degree")).toBe("M.S.");
      expect(byField.get("discipline")).toBe("Data Science");
      expect(byField.get("graduationYear")).toBe("2017");
      expect(byField.get("educationLevel")).toBe("Master's");

      expect(byField.get("currentCompany")).toBe("Spotify");
      expect(byField.get("currentTitle")).toBe("Data Scientist");

      // Aug 2017 to Jun 2026 = 8 years 10 months = 8 years
      expect(byField.get("experienceYears")).toBe("8");

      expect(parsed.skills).toContain("PyTorch");
      expect(parsed.skills).toContain("Spark");
      expect(parsed.skills).toContain("Tableau");
    });
  });

  describe("6. Weird Spacing (weird-spacing.txt)", () => {
    it("handles spaced letters like 'S A N J A Y' and tab-separated columns", () => {
      const text = load("weird-spacing.txt");
      const parsed = parseResume(text, new Date("2026-06-01"));

      expect(parsed.fullName).toBe("Sanjay Kumar");
      const byField = new Map(parsed.suggestions.map((s) => [s.field, s.value]));

      expect(byField.get("firstName")).toBe("Sanjay");
      expect(byField.get("lastName")).toBe("Kumar");
      expect(byField.get("email")).toBe("sanjay.k.kumar@gmail.com");
      expect(byField.get("phone")).toBe("+91 9012345678");
      expect(byField.get("location")).toBe("Mumbai");
      expect(byField.get("country")).toBe("India");

      expect(byField.get("school")).toBe("IIT Bombay");
      expect(byField.get("degree")).toBe("M.Tech");
      expect(byField.get("discipline")).toBe("Computer Science");
      expect(byField.get("graduationYear")).toBe("2023");

      expect(byField.get("currentCompany")).toBe("Fractal Analytics");
      expect(byField.get("currentTitle")).toBe("Machine Learning Engineer");

      expect(parsed.skills).toContain("TensorFlow");
      expect(parsed.skills).toContain("Pandas");
    });
  });

  describe("7. No Dates (no-dates.txt)", () => {
    it("asks user when work dates are missing instead of inventing experience", () => {
      const text = load("no-dates.txt");
      const parsed = parseResume(text, new Date("2026-06-01"));

      expect(parsed.fullName).toBe("Ananya Iyer");
      const byField = new Map(parsed.suggestions.map((s) => [s.field, s.value]));

      expect(byField.get("firstName")).toBe("Ananya");
      expect(byField.get("lastName")).toBe("Iyer");
      expect(byField.get("email")).toBe("ananya.iyer@yahoo.co.in");
      expect(byField.get("phone")).toBe("044 2345 6789");
      expect(byField.get("location")).toBe("Chennai");
      expect(byField.get("country")).toBe("India");

      // No dates on jobs -> experienceYears must NOT be suggested
      expect(byField.get("experienceYears")).toBeUndefined();
      expect(parsed.questions.some((q) => q.includes("Some jobs have no dates"))).toBe(true);

      expect(byField.get("school")).toBe("Anna University");
      expect(byField.get("degree")).toBe("B.Sc.");
      expect(byField.get("discipline")).toBe("Computer Science");

      expect(parsed.skills).toContain("Selenium");
      expect(parsed.skills).toContain("Jira");
    });
  });

  describe("8. Zero Invented Values Invariant", () => {
    const fixtureNames = [
      "fresher-india.txt", "eu-berlin.txt", "senior-swe.txt",
      "two-column.txt", "us-new-york.txt", "weird-spacing.txt", "no-dates.txt"
    ];

    for (const name of fixtureNames) {
      it(`guarantees every suggested value in ${name} is in text or explicitly marked computed`, () => {
        const text = load(name);
        const parsed = parseResume(text);

        for (const s of parsed.suggestions) {
          if (s.computed) {
            // Computed values must have an explanation note
            expect(s.note).toBeDefined();
            expect(s.note!.length).toBeGreaterThan(0);
          } else {
            // Non-computed values MUST have a source line found in the resume
            expect(s.source).toBeDefined();
            expect(s.source.length).toBeGreaterThan(0);

            if (s.field === "skills") {
              const skillsList = s.value.split(", ");
              for (const skill of skillsList) {
                expect(skillInText(skill, text), `Skill "${skill}" should be in text`).toBe(true);
              }
            } else if (s.field === "linkedin" || s.field === "github" || s.field === "portfolio") {
              const domainOrPath = s.value.replace(/^https?:\/\/(?:www\.)?/i, "").replace(/\/$/, "");
              expect(text.toLowerCase()).toContain(domainOrPath.toLowerCase());
            } else if (s.field === "phone") {
              const digitsOnly = s.value.replace(/\D/g, "");
              const textDigits = text.replace(/\D/g, "");
              // Last 8 digits of phone must be in the resume
              expect(textDigits).toContain(digitsOnly.slice(-8));
            } else if (s.field === "languages") {
              expect(s.language).toBeDefined();
            } else if (s.field === "workHistory") {
              expect(s.work).toBeDefined();
            } else {
              const normText = text.replace(/[\u00A0\s]+/g, " ").toLowerCase();
              const normVal = s.value.replace(/[\u00A0\s]+/g, " ").toLowerCase();
              expect(normText, `Field ${s.field}="${s.value}" must appear in resume text`).toContain(normVal);
            }
          }
        }
      });
    }
  });

  describe("9. DOCX XML parsing", () => {
    it("extracts text with paragraphs, table cells and tabs preserved", () => {
      const xml = `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Alex Smith</w:t></w:r></w:p><w:p><w:r><w:t>alex@example.com</w:t><w:tab/><w:t>+1 555-0199</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Senior Engineer</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Google</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>`;
      const text = docxXmlToText(xml);
      expect(text).toContain("Alex Smith");
      expect(text).toContain("alex@example.com   +1 555-0199");
      expect(text).toContain("Senior Engineer | Google");
    });
  });

  describe("10. PDF Two-Column Segment Assembly", () => {
    it("assembles two-column PDF page layout in left-then-right order", () => {
      // Page width 600, gutter around 300
      const page = {
        width: 600,
        items: [
          // Header spanning full width
          { str: "SARAH CONNOR", x: 200, y: 750, w: 200, h: 14 },
          // Left column (x: 50 to 250)
          { str: "SKILLS", x: 50, y: 700, w: 60, h: 12 },
          { str: "Python, SQL", x: 50, y: 680, w: 100, h: 10 },
          { str: "EDUCATION", x: 50, y: 640, w: 80, h: 12 },
          { str: "MIT, B.S. CS 2020", x: 50, y: 620, w: 120, h: 10 },
          // Right column (x: 350 to 550)
          { str: "EXPERIENCE", x: 350, y: 700, w: 80, h: 12 },
          { str: "Software Engineer at Cyberdyne", x: 350, y: 680, w: 180, h: 10 },
          { str: "Jan 2021 - Present", x: 350, y: 660, w: 100, h: 10 },
          { str: "Built autonomous agent systems", x: 350, y: 640, w: 170, h: 10 },
        ],
      };

      const assembled = pdfPagesToText([page]);
      expect(assembled).toContain("SARAH CONNOR");
      // Must read left column before right column content
      const leftIdx = assembled.indexOf("MIT, B.S. CS 2020");
      const rightIdx = assembled.indexOf("Software Engineer at Cyberdyne");
      expect(leftIdx).toBeGreaterThan(0);
      expect(rightIdx).toBeGreaterThan(0);
      expect(leftIdx).toBeLessThan(rightIdx);
    });
  });

  describe("11. Real-Looking PDF #1 (Single-column Data Science Resume)", () => {
    function makePdf(lines: Array<{ text: string; x: number; y: number }>): Uint8Array {
      let stream = "BT /F1 11 Tf ";
      for (const l of lines) {
        stream += `${l.x} ${l.y} Td (${l.text.replace(/[\(\)]/g, "")}) Tj -${l.x} -${l.y} Td `;
      }
      stream += "ET";
      const body = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n5 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000227 00000 n \n0000000302 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n500\n%%EOF`;
      return new TextEncoder().encode(body);
    }

    it("parses binary PDF directly via extractPdfText and extracts exact profile", async () => {
      const pdfBytes = makePdf([
        { text: "ALEX CHEN", x: 50, y: 740 },
        { text: "San Francisco, CA, United States | alex.chen@nyu.edu | +1 415-555-0123", x: 50, y: 720 },
        { text: "linkedin.com/in/alexchen-ai | github.com/alexchen-ai", x: 50, y: 700 },
        { text: "EDUCATION", x: 50, y: 660 },
        { text: "New York University - M.S. in Computer Science - 2023", x: 50, y: 640 },
        { text: "EXPERIENCE", x: 50, y: 600 },
        { text: "Data Scientist at OpenAI | Aug 2023 - Present", x: 50, y: 580 },
        { text: "SKILLS", x: 50, y: 540 },
        { text: "Python, PyTorch, Transformers, SQL, Docker", x: 50, y: 520 },
      ]);

      const text = await extractPdfText(pdfBytes);
      expect(text).toContain("ALEX CHEN");
      expect(text).toContain("alex.chen@nyu.edu");

      const parsed = parseResume(text, new Date("2026-06-01"));
      expect(parsed.fullName).toBe("Alex Chen");

      const byField = new Map(parsed.suggestions.map((s) => [s.field, s.value]));
      expect(byField.get("firstName")).toBe("Alex");
      expect(byField.get("lastName")).toBe("Chen");
      expect(byField.get("email")).toBe("alex.chen@nyu.edu");
      expect(byField.get("phone")).toBe("+1 415-555-0123");
      expect(byField.get("location")).toBe("San Francisco");
      expect(byField.get("country")).toBe("United States");
      expect(byField.get("linkedin")).toBe("https://linkedin.com/in/alexchen-ai");
      expect(byField.get("github")).toBe("https://github.com/alexchen-ai");

      expect(byField.get("school")).toBe("New York University");
      expect(byField.get("degree")).toBe("M.S.");
      expect(byField.get("discipline")).toBe("Computer Science");
      expect(byField.get("graduationYear")).toBe("2023");

      expect(byField.get("currentCompany")).toBe("OpenAI");
      expect(byField.get("currentTitle")).toBe("Data Scientist");

      expect(parsed.skills).toContain("Python");
      expect(parsed.skills).toContain("PyTorch");
      expect(parsed.skills).toContain("Docker");
    });
  });

  describe("12. Real-Looking PDF #2 (Two-Column Layout via extractPdfText)", () => {
    function makeTwoColumnPdf(): Uint8Array {
      // 612x792 page, header at top, left column (x=50..200), right column (x=320..550)
      const lines = [
        // Left column: Contact info, Skills, Education
        { text: "KAVITA RAO", x: 50, y: 750 },
        { text: "Bengaluru, Karnataka, India", x: 50, y: 730 },
        { text: "+91 91234 56789 | kavita.rao@gmail.com", x: 50, y: 710 },
        { text: "linkedin.com/in/kavitarao", x: 50, y: 690 },

        { text: "SKILLS", x: 50, y: 650 },
        { text: "React, TypeScript, Node.js, CSS", x: 50, y: 630 },
        { text: "EDUCATION", x: 50, y: 590 },
        { text: "IIT Delhi", x: 50, y: 570 },
        { text: "B.Tech in Electrical Engineering", x: 50, y: 550 },
        { text: "2018 - 2022", x: 50, y: 530 },

        // Right column: Experience
        { text: "EXPERIENCE", x: 320, y: 650 },
        { text: "Frontend Engineer | Uber | Bengaluru", x: 320, y: 630 },
        { text: "Sep 2022 - Present", x: 320, y: 610 },
        { text: "Built driver dispatch interfaces in React", x: 320, y: 590 },
        { text: "Led performance optimization across web portal", x: 320, y: 570 },
      ];

      let stream = "BT /F1 11 Tf ";
      for (const l of lines) {
        stream += `${l.x} ${l.y} Td (${l.text.replace(/[\(\)]/g, "")}) Tj -${l.x} -${l.y} Td `;
      }
      stream += "ET";
      const body = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n5 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000227 00000 n \n0000000302 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n500\n%%EOF`;
      return new TextEncoder().encode(body);
    }

    it("extracts two-column PDF without column crossing", async () => {
      const pdfBytes = makeTwoColumnPdf();
      const text = await extractPdfText(pdfBytes);
      const parsed = parseResume(text, new Date("2026-06-01"));

      expect(parsed.fullName).toBe("Kavita Rao");
      const byField = new Map(parsed.suggestions.map((s) => [s.field, s.value]));

      expect(byField.get("firstName")).toBe("Kavita");
      expect(byField.get("lastName")).toBe("Rao");
      expect(byField.get("email")).toBe("kavita.rao@gmail.com");
      expect(byField.get("phone")).toBe("+91 91234 56789");
      expect(byField.get("location")).toBe("Bengaluru");
      expect(byField.get("country")).toBe("India");

      expect(byField.get("school")).toBe("IIT Delhi");
      expect(byField.get("degree")).toBe("B.Tech");
      expect(byField.get("discipline")).toBe("Electrical Engineering");

      expect(byField.get("currentCompany")).toBe("Uber");
      expect(byField.get("currentTitle")).toBe("Frontend Engineer");

      expect(parsed.skills).toContain("React");
      expect(parsed.skills).toContain("TypeScript");
    });
  });

  describe("13. Real-Looking DOCX (Backend Engineer via docxToText)", () => {
    function makeDocx(documentXml: string): Uint8Array {
      const enc = new TextEncoder();
      const fb = enc.encode(documentXml);
      const nb = enc.encode("word/document.xml");

      const lh = new Uint8Array(30 + nb.length + fb.length);
      const lv = new DataView(lh.buffer);
      lv.setUint32(0, 0x04034b50, true);
      lv.setUint16(4, 20, true);
      lv.setUint16(8, 0, true);
      lv.setUint32(18, fb.length, true);
      lv.setUint32(22, fb.length, true);
      lv.setUint16(26, nb.length, true);
      lh.set(nb, 30);
      lh.set(fb, 30 + nb.length);

      const cd = new Uint8Array(46 + nb.length);
      const cv = new DataView(cd.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(10, 0, true);
      cv.setUint32(20, fb.length, true);
      cv.setUint32(24, fb.length, true);
      cv.setUint16(28, nb.length, true);
      cv.setUint32(42, 0, true);
      cd.set(nb, 46);

      const eocd = new Uint8Array(22);
      const ev = new DataView(eocd.buffer);
      ev.setUint32(0, 0x06054b50, true);
      ev.setUint16(8, 1, true);
      ev.setUint16(10, 1, true);
      ev.setUint32(12, cd.length, true);
      ev.setUint32(16, lh.length, true);

      const zip = new Uint8Array(lh.length + cd.length + eocd.length);
      zip.set(lh, 0);
      zip.set(cd, lh.length);
      zip.set(eocd, lh.length + cd.length);
      return zip;
    }

    it("parses valid Word DOCX container and extracts profile without loss", async () => {
      const docXml = `
        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
          <w:body>
            <w:p><w:r><w:t>Marcus Schmidt</w:t></w:r></w:p>
            <w:p><w:r><w:t>Munich, Germany | +49 89 1234567 | marcus.schmidt@tum.de</w:t></w:r></w:p>
            <w:p><w:r><w:t>WORK EXPERIENCE</w:t></w:r></w:p>
            <w:p><w:r><w:t>Senior Backend Engineer at BMW Group</w:t></w:r></w:p>
            <w:p><w:r><w:t>01/2021 – Present</w:t></w:r></w:p>
            <w:p><w:r><w:t>EDUCATION</w:t></w:r></w:p>
            <w:p><w:r><w:t>Technical University of Munich</w:t></w:r></w:p>
            <w:p><w:r><w:t>Master of Science in Informatics | 2020</w:t></w:r></w:p>
            <w:p><w:r><w:t>SKILLS</w:t></w:r></w:p>
            <w:p><w:r><w:t>Java, Go, Kubernetes, PostgreSQL</w:t></w:r></w:p>
          </w:body>
        </w:document>
      `;

      const docxBytes = makeDocx(docXml);
      const text = await docxToText(docxBytes);
      expect(text).toBeDefined();
      expect(text).toContain("Marcus Schmidt");

      const parsed = parseResume(text!, new Date("2026-06-01"));
      expect(parsed.fullName).toBe("Marcus Schmidt");

      const byField = new Map(parsed.suggestions.map((s) => [s.field, s.value]));
      expect(byField.get("firstName")).toBe("Marcus");
      expect(byField.get("lastName")).toBe("Schmidt");
      expect(byField.get("email")).toBe("marcus.schmidt@tum.de");
      expect(byField.get("location")).toBe("Munich");
      expect(byField.get("country")).toBe("Germany");

      expect(byField.get("school")).toBe("Technical University of Munich");
      expect(byField.get("degree")).toBe("Master of Science");
      expect(byField.get("discipline")).toBe("Informatics");

      expect(byField.get("currentCompany")).toBe("BMW Group");
      expect(byField.get("currentTitle")).toBe("Senior Backend Engineer");

      expect(parsed.skills).toContain("Java");
      expect(parsed.skills).toContain("Go");
      expect(parsed.skills).toContain("Kubernetes");
    });
  });

  describe("14. Phase 3B Resume Parsing Hardening", () => {
    function makeDocx(xml: string): Uint8Array {
      const enc = new TextEncoder();
      const nb = enc.encode("word/document.xml");
      const fb = enc.encode(xml);

      const lh = new Uint8Array(30 + nb.length + fb.length);
      const lv = new DataView(lh.buffer);
      lv.setUint32(0, 0x04034b50, true);
      lv.setUint16(4, 20, true);
      lv.setUint16(8, 0, true);
      lv.setUint32(18, fb.length, true);
      lv.setUint32(22, fb.length, true);
      lv.setUint16(26, nb.length, true);
      lh.set(nb, 30);
      lh.set(fb, 30 + nb.length);

      const cd = new Uint8Array(46 + nb.length);
      const cv = new DataView(cd.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(10, 0, true);
      cv.setUint32(20, fb.length, true);
      cv.setUint32(24, fb.length, true);
      cv.setUint16(28, nb.length, true);
      cv.setUint32(42, 0, true);
      cd.set(nb, 46);

      const eocd = new Uint8Array(22);
      const ev = new DataView(eocd.buffer);
      ev.setUint32(0, 0x06054b50, true);
      ev.setUint16(8, 1, true);
      ev.setUint16(10, 1, true);
      ev.setUint32(12, cd.length, true);
      ev.setUint32(16, lh.length, true);

      const zip = new Uint8Array(lh.length + cd.length + eocd.length);
      zip.set(lh, 0);
      zip.set(cd, lh.length);
      zip.set(eocd, lh.length + cd.length);
      return zip;
    }

    it("isolates REFERENCES section: never takes referee name, email, or phone as candidate values", () => {
      const resume = `
Jane Doe
jane.doe@example.com
+1 415-555-0100
San Francisco, CA

EXPERIENCE
Software Engineer at Acme Corp | 2021 – Present
• Built distributed systems.

REFERENCES
Dr. Robert Reference
Email: robert.ref@mit.edu
Phone: +1 617-555-9999
      `;
      const parsed = parseResume(resume);
      expect(parsed.fullName).toBe("Jane Doe");
      const byField = new Map(parsed.suggestions.map((s) => [s.field, s.value]));
      expect(byField.get("firstName")).toBe("Jane");
      expect(byField.get("lastName")).toBe("Doe");
      expect(byField.get("email")).toBe("jane.doe@example.com");
      expect(byField.get("phone")).toBe("+1 415-555-0100");

      const allValues = parsed.suggestions.map((s) => s.value);
      expect(allValues).not.toContain("Robert");
      expect(allValues).not.toContain("robert.ref@mit.edu");
      expect(allValues).not.toContain("+1 617-555-9999");
    });

    it("ignores manager's phone inside an experience bullet", () => {
      const resume = `
Alice Smith
alice@example.com
New York, NY

EXPERIENCE
Senior Developer at BigTech | 2022 – Present
• Reported directly to VP Engineering Mark Vance (contact: +1 212-555-8844) on cloud migration.
• Led team of 5 engineers delivering high throughput pipeline.
      `;
      const parsed = parseResume(resume);
      const byField = new Map(parsed.suggestions.map((s) => [s.field, s.value]));
      expect(byField.get("phone")).toBeUndefined();
    });

    it("extracts obfuscated email with medium confidence (unticked)", () => {
      const resume = `
Bob Brown
bob.brown [at] gmail [dot] com
+1 555-432-1000
Seattle, WA

EXPERIENCE
Frontend Engineer at WebCo | 2020 – Present
      `;
      const parsed = parseResume(resume);
      const emailSuggestion = parsed.suggestions.find((s) => s.field === "email");
      expect(emailSuggestion).toBeDefined();
      expect(emailSuggestion!.value).toBe("bob.brown@gmail.com");
      expect(emailSuggestion!.confidence).toBe("medium");
    });

    it("calculates overlapping jobs (2020–2023 and 2022–2024) as 4 years, not 5", () => {
      const resume = `
Dev User
dev@example.com

EXPERIENCE
Software Engineer | Alpha Corp
2020 – 2023
• Full stack development.

Contract Engineer | Beta LLC
2022 – 2024
• Systems programming.
      `;
      const parsed = parseResume(resume, new Date("2026-06-01"));
      const byField = new Map(parsed.suggestions.map((s) => [s.field, s.value]));
      expect(byField.get("experienceYears")).toBe("4");
    });

    it("parses Indian resume formats: Jan'22 – Present, B.E. (Computer Engg.), CGPA: 8.21/10, Percentage: 78%", () => {
      const resume = `
Rohit Sharma
rohit.sharma@example.com
+91 98200 12345
Mumbai, Maharashtra, India

EDUCATION
B.E. (Computer Engg.) | University of Mumbai | 2018 – 2022
CGPA: 8.21/10 | Percentage: 78%

EXPERIENCE
Software Engineer | Tata Consultancy Services
Jan'22 – Present
• Developing enterprise microservices using Spring Boot.
      `;
      const parsed = parseResume(resume, new Date("2026-06-01"));
      const byField = new Map(parsed.suggestions.map((s) => [s.field, s.value]));
      expect(byField.get("degree")).toBe("B.E.");
      expect(byField.get("discipline")).toBe("Computer Engg.");
      expect(byField.get("educationLevel")).toBe("Bachelor's");

      expect(parsed.education[0]?.degree).toBe("B.E.");
      expect(parsed.education[0]?.discipline).toBe("Computer Engg.");
      expect(parsed.education[0]?.score).toMatch(/8\.21\/10|78%/);

      expect(parsed.work[0]?.start).toBe("2022-01");
      expect(parsed.work[0]?.current).toBe(true);
    });

    it("extracts a real DOCX file built with zip of word/document.xml matching its text version output", async () => {
      const docXml = `
        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
          <w:body>
            <w:p><w:r><w:t>Kavita Patel</w:t></w:r></w:p>
            <w:p><w:r><w:t>kavita.patel@example.com | +91 98765 11111 | Ahmedabad, Gujarat</w:t></w:r></w:p>
            <w:p><w:r><w:t>EXPERIENCE</w:t></w:r></w:p>
            <w:p><w:r><w:t>DevOps Engineer at CloudWorks | 2023 – Present</w:t></w:r></w:p>
            <w:p><w:r><w:t>EDUCATION</w:t></w:r></w:p>
            <w:p><w:r><w:t>Gujarat Technological University</w:t></w:r></w:p>
            <w:p><w:r><w:t>B.Tech in Information Technology | 2023</w:t></w:r></w:p>
            <w:p><w:r><w:t>SKILLS</w:t></w:r></w:p>
            <w:p><w:r><w:t>Docker, Terraform, AWS, Linux</w:t></w:r></w:p>
          </w:body>
        </w:document>
      `;
      const docxBytes = makeDocx(docXml);
      const textFromDocx = await docxToText(docxBytes);
      expect(textFromDocx).toBeDefined();

      const parsedFromDocx = parseResume(textFromDocx!, new Date("2026-06-01"));
      const parsedDirectText = parseResume(textFromDocx!, new Date("2026-06-01"));

      expect(parsedFromDocx.fullName).toBe("Kavita Patel");
      expect(parsedFromDocx.fullName).toBe(parsedDirectText.fullName);
      expect(parsedFromDocx.suggestions.length).toBe(parsedDirectText.suggestions.length);

      const byField = new Map(parsedFromDocx.suggestions.map((s) => [s.field, s.value]));
      expect(byField.get("firstName")).toBe("Kavita");
      expect(byField.get("lastName")).toBe("Patel");
      expect(byField.get("email")).toBe("kavita.patel@example.com");
      expect(byField.get("phone")).toBe("+91 98765 11111");
      expect(byField.get("location")).toBe("Ahmedabad");
      expect(byField.get("country")).toBe("India");
      expect(byField.get("degree")).toBe("B.Tech");
      expect(byField.get("discipline")).toBe("Information Technology");
      expect(parsedFromDocx.skills).toContain("Docker");
      expect(parsedFromDocx.skills).toContain("Terraform");
    });
  });
});
