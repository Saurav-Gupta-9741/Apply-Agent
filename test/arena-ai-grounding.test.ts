import { afterEach, describe, expect, it } from "vitest";
import {
  aiStatus,
  buildDraftPrompt,
  checkDraft,
  detectWordLimit,
  draftAnswer,
  formatLengthInstruction,
  INSUFFICIENT,
  profileFacts,
  SYSTEM_PROMPT,
} from "../src/shared/ai";
import { EMPTY_PROFILE } from "../src/shared/storage";
import type { Profile } from "../src/shared/types";

const CANDIDATE: Profile = {
  ...EMPTY_PROFILE,
  firstName: "Priya",
  lastName: "Sharma",
  email: "priya.sharma@example.com",
  phone: "+91 98765 43210",
  currentTitle: "Staff Infrastructure Engineer",
  currentCompany: "ScaleGrid Systems",
  experienceYears: "7",
  degree: "Bachelor of Technology",
  discipline: "Computer Science and Engineering",
  school: "IIT Madras",
  graduationYear: "2017",
  targetRoles: "Staff Platform Engineer, Lead Distributed Systems Engineer",
  skills: "Rust, Go, Kubernetes, Kafka, Distributed Consensus, PostgreSQL, Raft, gRPC",
  portfolio: "https://priyasharma.io",
  github: "https://github.com/psharma-infra",
  projectUrl: "https://github.com/psharma-infra/raft-distributed-kv",
  workHistory: [
    {
      title: "Staff Infrastructure Engineer",
      company: "ScaleGrid Systems",
      location: "Bengaluru, India",
      start: "2021-06",
      end: "",
      current: true,
      summary:
        "Architected multi-region Kafka data pipeline processing 120k msgs/sec, reducing p99 latency from 140ms to 22ms and cutting infrastructure spend by 35%.",
    },
    {
      title: "Senior Backend Engineer",
      company: "FinFlow Tech",
      location: "Hyderabad, India",
      start: "2018-08",
      end: "2021-05",
      current: false,
      summary:
        "Implemented ledger transaction engine handling 450 financial transactions/sec with zero loss across double-entry balance updates in PostgreSQL.",
    },
  ],
};

const JOB = { title: "Founding Platform Engineer", company: "Aetheria AI" };

function fakeModel(reply: string, onPrompt?: (prompt: string) => void) {
  (globalThis as Record<string, unknown>).LanguageModel = {
    availability: async () => "available",
    create: async () => ({
      prompt: async (promptText: string) => {
        onPrompt?.(promptText);
        return reply;
      },
      destroy: () => undefined,
    }),
  };
}

afterEach(() => {
  delete (globalThis as Record<string, unknown>).LanguageModel;
});

describe("Startup & Scaleup Essay Prompts & Grounding Validation", () => {
  it("includes rich candidate profile facts, portfolio, and project URLs in prompt", () => {
    const prompt = buildDraftPrompt(
      "Why do you want to join our team at this stage?",
      CANDIDATE,
      JOB,
    );

    // Profile fundamentals
    expect(prompt).toContain("Current title: Staff Infrastructure Engineer");
    expect(prompt).toContain("Current company: ScaleGrid Systems");
    expect(prompt).toContain("Total years of experience: 7");
    expect(prompt).toContain("Degree: Bachelor of Technology");
    expect(prompt).toContain("School: IIT Madras");

    // URLs and projects
    expect(prompt).toContain("Portfolio: https://priyasharma.io");
    expect(prompt).toContain("GitHub: https://github.com/psharma-infra");
    expect(prompt).toContain(
      "Featured project: https://github.com/psharma-infra/raft-distributed-kv",
    );

    // Work history summaries & metrics
    expect(prompt).toContain("Work #1: Staff Infrastructure Engineer at ScaleGrid Systems");
    expect(prompt).toContain("120k msgs/sec");
    expect(prompt).toContain("p99 latency from 140ms to 22ms");
    expect(prompt).toContain("Work #2: Senior Backend Engineer at FinFlow Tech");
    expect(prompt).toContain("450 financial transactions/sec");

    // Negative constraints: privacy (no contact details)
    expect(prompt).not.toContain("priya.sharma@example.com");
    expect(prompt).not.toContain("+91 98765 43210");
  });

  it("enforces clear negative constraints in prompt instructions", () => {
    const prompt = buildDraftPrompt(
      "Describe a challenging technical project you built, the tradeoffs you made, and what you would do differently.",
      CANDIDATE,
      JOB,
    );

    expect(prompt).toContain("Do not invent degrees or companies not listed.");
    expect(prompt).toContain("Never invent metrics, dates, titles, or achievements");
    expect(prompt).toContain("If facts are insufficient, output INSUFFICIENT");
  });

  it("handles 'Why do you want to join our team at this stage?' with strict grounding", () => {
    const question = "Why do you want to join our team at this stage?";
    const prompt = buildDraftPrompt(question, CANDIDATE, JOB, { targetLength: "short" });

    expect(prompt).toContain(`Job: ${JOB.title} at ${JOB.company}`);
    expect(prompt).toContain(`Question: ${question}`);
    expect(prompt).toContain("Keep answer short and concise (approximately 50-100 words).");

    // Grounded draft using only real facts
    const groundedDraft =
      "At ScaleGrid Systems, I built distributed pipelines handling 120k msgs/sec and cut latency to 22ms. Aetheria AI is at the stage where high-throughput infrastructure decisions directly dictate scale and unit economics. As a Founding Platform Engineer, I want to establish resilient foundations using Rust, Kafka, and Kubernetes from day one.";

    const warnings = checkDraft(groundedDraft, CANDIDATE, JOB, { question, targetLength: "short" });
    expect(warnings).toEqual([]);

    // Ungrounded draft with hallucinated startup metrics and unlisted roles
    const ungroundedDraft =
      "At my previous startup where I managed 45 engineers and scaled ARR by 500%, I discovered my passion for Seed stage companies. At Aetheria AI, I will lead the 80 person organization.";
    const badWarnings = checkDraft(ungroundedDraft, CANDIDATE, JOB, { question });
    expect(badWarnings.some((w) => /numbers not in your profile.*45.*500.*80/.test(w))).toBe(true);
  });

  it("handles 'Describe a challenging technical project you built, the tradeoffs you made, and what you would do differently.'", () => {
    const question =
      "Describe a challenging technical project you built, the tradeoffs you made, and what you would do differently.";
    const prompt = buildDraftPrompt(question, CANDIDATE, JOB, { targetLength: "medium" });

    expect(prompt).toContain("Featured project: https://github.com/psharma-infra/raft-distributed-kv");
    expect(prompt).toContain("Provide a structured, substantive answer (approximately 150-250 words).");

    const groundedDraft = `At ScaleGrid Systems, I architected our multi-region data pipeline processing 120k msgs/sec across distributed event brokers. The central challenge was maintaining strict chronological ordering while reducing p99 latency from 140ms to 22ms. We chose Kafka with partitioned replication and Go workers, making an explicit architectural tradeoff: prioritizing linearizability and bounded latency over low write amplification. In our open-source Raft key-value implementation, we navigated similar synchronization tradeoffs during leader elections and network partitioning scenarios. At FinFlow Tech, I previously saw the cost of unpartitioned updates when handling 450 transactions/sec, which convinced me that partition isolation is essential for financial correctness. If I were designing this architecture again today, I would adopt Rust earlier for the critical path ingest pipeline to completely eliminate GC pauses under sudden traffic surges, and implement automated canary deployments across Kubernetes clusters to validate partition rebalancing under actual production traffic load. This systematic focus on profiling and deterministic failover cut our infrastructure spend by 35%. Every architectural choice was validated with concrete benchmarks before rollout.`;

    const warnings = checkDraft(groundedDraft, CANDIDATE, JOB, { question, targetLength: "medium" });
    expect(warnings).toEqual([]);
  });

  it("handles 'What is your biggest superpower and how did it help your previous company?'", () => {
    const question = "What is your biggest superpower and how did it help your previous company?";
    const prompt = buildDraftPrompt(question, CANDIDATE, JOB);

    expect(prompt).toContain("ScaleGrid Systems");
    expect(prompt).toContain("FinFlow Tech");
    expect(prompt).toContain("Avoid generic corporate fluff");

    // Authentic, high-signal draft
    const groundedDraft =
      "My biggest superpower is systematic performance profiling under extreme load. At ScaleGrid Systems, our event ingest pipeline suffered from latency spikes during burst traffic. By instrumenting distributed traces across our Kafka cluster and identifying GC stalls, I restructured message batching and memory allocations, cutting p99 latency from 140ms to 22ms and reducing infrastructure spend by 35%.";

    const warnings = checkDraft(groundedDraft, CANDIDATE, JOB);
    expect(warnings).toEqual([]);
  });

  it("handles 'How do you handle disagreements on technical design within an engineering team?'", () => {
    const question =
      "How do you handle disagreements on technical design within an engineering team? (50-100 words)";
    const prompt = buildDraftPrompt(question, CANDIDATE, JOB);

    // Auto-detects 50-100 words from question string
    expect(prompt).toContain("Keep answer short and concise (approximately 50-100 words).");

    const groundedDraft =
      "I resolve architectural disagreements through written RFCs and empirical benchmarking rather than subjective debate. When deciding between storage engines at FinFlow Tech, I created isolated micro-benchmarks measuring throughput under 450 transactions/sec. Grounding debates in concrete data, documented constraints, and blameless post-implementation reviews builds consensus and keeps the team aligned on shipping high-velocity, reliable software.";

    const warnings = checkDraft(groundedDraft, CANDIDATE, JOB, question);
    expect(warnings).toEqual([]);
  });
});

describe("Word Limit Constraints & Length Instructions", () => {
  it("detects and formats instructions for short questions (50-100 words)", () => {
    const detected1 = detectWordLimit("Why us? (50-100 words)");
    expect(detected1).toEqual({ min: 50, max: 100, target: "short" });

    const detected2 = detectWordLimit("Keep it brief (max 100 words)");
    expect(detected2).toEqual({ min: 50, max: 100, target: "short" });

    const instruction = formatLengthInstruction("short", 50, 100);
    expect(instruction).toBe("Keep answer short and concise (approximately 50-100 words).");
  });

  it("detects and formats instructions for medium questions (150-250 words)", () => {
    const detected1 = detectWordLimit("Describe your greatest challenge (150-250 words)");
    expect(detected1).toEqual({ min: 150, max: 250, target: "medium" });

    const detected2 = detectWordLimit("In 150 to 250 words, explain...");
    expect(detected2).toEqual({ min: 150, max: 250, target: "medium" });

    const instruction = formatLengthInstruction("medium", 150, 250);
    expect(instruction).toBe("Provide a structured, substantive answer (approximately 150-250 words).");
  });

  it("detects and formats instructions for long questions (300-500 words)", () => {
    const detected1 = detectWordLimit("Deep dive into your technical background (300-500 words)");
    expect(detected1).toEqual({ min: 300, max: 500, target: "long" });

    const detected2 = detectWordLimit("Provide an in-depth essay (up to 500 words)");
    expect(detected2).toEqual({ min: 300, max: 500, target: "long" });

    const instruction = formatLengthInstruction("long", 300, 500);
    expect(instruction).toBe(
      "Provide an in-depth answer covering context, tradeoffs, and impact (approximately 300-500 words).",
    );
  });

  it("warns in checkDraft when draft violates short target length", () => {
    const shortQuestion = "Tell us about yourself (50-100 words)";

    // Too short (below 50 words)
    const tooShort = "I am a staff engineer with 7 years of experience in distributed systems.";
    const warningsUnder = checkDraft(tooShort, CANDIDATE, JOB, shortQuestion);
    expect(warningsUnder.some((w) => w.includes("Below recommended word count"))).toBe(true);

    // Too long (over 100 words)
    const tooLong = new Array(125).fill("word").join(" ");
    const warningsOver = checkDraft(tooLong, CANDIDATE, JOB, shortQuestion);
    expect(warningsOver.some((w) => w.includes("Exceeds word limit"))).toBe(true);

    // Ideal (75 words)
    const ideal = new Array(75).fill("experience").join(" ");
    const warningsIdeal = checkDraft(ideal, CANDIDATE, JOB, shortQuestion);
    expect(warningsIdeal).toEqual([]);
  });

  it("warns in checkDraft when draft violates medium target length", () => {
    const mediumQuestion = "Describe your project (150-250 words)";

    // Too short (< 150 words)
    const tooShort = new Array(90).fill("architecture").join(" ");
    const warningsUnder = checkDraft(tooShort, CANDIDATE, JOB, mediumQuestion);
    expect(warningsUnder.some((w) => w.includes("Below recommended word count"))).toBe(true);

    // Too long (> 250 words)
    const tooLong = new Array(285).fill("systems").join(" ");
    const warningsOver = checkDraft(tooLong, CANDIDATE, JOB, mediumQuestion);
    expect(warningsOver.some((w) => w.includes("Exceeds word limit"))).toBe(true);

    // Ideal (200 words)
    const ideal = new Array(200).fill("systems").join(" ");
    const warningsIdeal = checkDraft(ideal, CANDIDATE, JOB, mediumQuestion);
    expect(warningsIdeal).toEqual([]);
  });

  it("warns in checkDraft when draft violates long target length", () => {
    const longQuestion = "In 300-500 words, tell us about your journey";

    // Too short (< 300 words)
    const tooShort = new Array(210).fill("engineering").join(" ");
    const warningsUnder = checkDraft(tooShort, CANDIDATE, JOB, longQuestion);
    expect(warningsUnder.some((w) => w.includes("Below recommended word count"))).toBe(true);

    // Too long (> 500 words)
    const tooLong = new Array(540).fill("engineering").join(" ");
    const warningsOver = checkDraft(tooLong, CANDIDATE, JOB, longQuestion);
    expect(warningsOver.some((w) => w.includes("Exceeds word limit"))).toBe(true);

    // Ideal (380 words)
    const ideal = new Array(380).fill("engineering").join(" ");
    const warningsIdeal = checkDraft(ideal, CANDIDATE, JOB, longQuestion);
    expect(warningsIdeal).toEqual([]);
  });
});

describe("Tone Calibration & Anti-Fluff Enforcement", () => {
  it("includes anti-fluff instructions in both SYSTEM_PROMPT and buildDraftPrompt", () => {
    expect(SYSTEM_PROMPT).toContain("Avoid generic corporate fluff");
    expect(SYSTEM_PROMPT).toContain("concrete, high-signal answers");

    const prompt = buildDraftPrompt("Why this team?", CANDIDATE, JOB);
    expect(prompt).toContain(
      "Avoid generic corporate fluff (e.g. 'I am excited to synergize...', 'dynamic self-starter')",
    );
    expect(prompt).toContain("concrete, high-signal answers");
  });

  it("flags generic corporate fluff buzzwords in checkDraft", () => {
    const fluffyDraft =
      "I am excited to synergize with your team! As a 10x rockstar ninja and dynamic self-starter who always thinks outside the box, I bring thought leadership and strong alignment.";

    const warnings = checkDraft(fluffyDraft, CANDIDATE, JOB);
    expect(warnings.some((w) => w.includes("generic corporate fluff"))).toBe(true);
    expect(warnings.some((w) => /synergize|rockstar|ninja|outside the box/i.test(w))).toBe(true);
  });

  it("accepts concrete technical language without triggering fluff warnings", () => {
    const technicalDraft =
      "At ScaleGrid Systems, I built distributed event pipelines with Kafka and Go, improving p99 latency from 140ms to 22ms. I focus on automated verification, bounded queueing, and reliable Raft consensus.";

    const warnings = checkDraft(technicalDraft, CANDIDATE, JOB);
    expect(warnings).toEqual([]);
  });
});

describe("Strict Invariant 1: Zero Hallucination of Candidate Facts", () => {
  it("flags ungrounded degrees claimed in draft (e.g. PhD, MBA when candidate has B.Tech)", () => {
    const phdDraft =
      "During my PhD in Distributed Systems at Stanford, I proved consensus bounds for partitioned networks.";
    const warnings = checkDraft(phdDraft, CANDIDATE, JOB);
    expect(warnings.some((w) => w.includes("PhD / Doctorate"))).toBe(true);

    const mbaDraft =
      "I completed my MBA and led business strategy across our enterprise divisions.";
    const mbaWarnings = checkDraft(mbaDraft, CANDIDATE, JOB);
    expect(mbaWarnings.some((w) => w.includes("MBA"))).toBe(true);
  });

  it("allows candidate's real degree without false-positive warnings", () => {
    const realDegreeDraft =
      "After graduating with my Bachelor of Technology in Computer Science from IIT Madras, I have spent 7 years engineering infrastructure.";
    const warnings = checkDraft(realDegreeDraft, CANDIDATE, JOB);
    expect(warnings).toEqual([]);
  });

  it("flags invented numbers not grounded in profile facts", () => {
    // 7 is allowed (experienceYears), but 999 and 45 are invented
    const draft = "Over my 7 years, I led a squad of 45 engineers managing 999 microservices.";
    const warnings = checkDraft(draft, CANDIDATE, JOB);
    expect(warnings.some((w) => /numbers not in your profile.*45.*999/.test(w))).toBe(true);
  });

  it("returns null when model replies with INSUFFICIENT for questions candidate cannot ground", async () => {
    fakeModel(INSUFFICIENT);

    const result = await draftAnswer(
      "Describe your 10+ years of Salesforce APEX administration and CPQ customization.",
      CANDIDATE,
      JOB,
    );

    expect(result).toBeNull();
  });

  it("returns null when model output is empty or whitespace", async () => {
    fakeModel("   ");

    const result = await draftAnswer(
      "Why do you want to join our team at this stage?",
      CANDIDATE,
      JOB,
    );

    expect(result).toBeNull();
  });
});

describe("End-to-End On-Device Drafting Simulation", () => {
  it("generates grounded draft for all 4 startup questions via mock Prompt API session", async () => {
    const testCases = [
      {
        question: "Why do you want to join our team at this stage?",
        mockReply:
          "With 7 years of infrastructure experience at ScaleGrid Systems, I have seen how critical early platform decisions are. Aetheria AI is scaling rapidly, and my work scaling Kafka pipelines to 120k msgs/sec directly fits your infrastructure stage.",
        expectedKeyword: "ScaleGrid Systems",
      },
      {
        question:
          "Describe a challenging technical project you built, the tradeoffs you made, and what you would do differently.",
        mockReply:
          "At ScaleGrid Systems, I built a pipeline processing 120k msgs/sec, dropping p99 latency from 140ms to 22ms. We made an explicit tradeoff: prioritizing consistency over write amplification. Today I would implement the ingestion layer in Rust earlier.",
        expectedKeyword: "tradeoff",
      },
      {
        question: "What is your biggest superpower and how did it help your previous company?",
        mockReply:
          "My superpower is root-cause profiling under load. At ScaleGrid Systems, I traced thread contention and reduced p99 latency from 140ms to 22ms while reducing spend by 35%.",
        expectedKeyword: "ScaleGrid Systems",
      },
      {
        question: "How do you handle disagreements on technical design within an engineering team?",
        mockReply:
          "I resolve disagreements through clear RFCs and benchmark data. At FinFlow Tech, benchmark testing under 450 transactions/sec resolved our storage engine debate with objective data.",
        expectedKeyword: "FinFlow Tech",
      },
    ];

    for (const { question, mockReply, expectedKeyword } of testCases) {
      let promptSent = "";
      fakeModel(mockReply, (p) => {
        promptSent = p;
      });

      const draft = await draftAnswer(question, CANDIDATE, JOB);
      expect(draft).not.toBeNull();
      expect(draft).toContain(expectedKeyword);

      // Verify the prompt sent to the LLM has grounding facts and constraints
      expect(promptSent).toContain("Candidate facts:");
      expect(promptSent).toContain("Do not invent degrees or companies not listed.");
      expect(promptSent).toContain("Avoid generic corporate fluff");

      // Verify the returned draft has 0 hallucination warnings
      const warnings = checkDraft(draft!, CANDIDATE, JOB);
      expect(warnings).toEqual([]);
    }
  });
});
