import { describe, expect, it } from "vitest";
import { claimsTerm, cleanModelOutput, factCheck, jobOnlyTerms, numbersIn, removedSummary, type FactSources } from "../src/shared/writer/factcheck";
import { splitSentences } from "../src/shared/writer/words";
import { lengthLimit } from "../src/shared/length-limit";

// The fictional candidate of the on-device model test (not a real person).
const FACTS = [
  "Current title: Data Engineer",
  "Current company: Acme Pay",
  "Total years of experience: about 5 years",
  "Degree: B.Tech in Computer Science",
  "School: State Technical University",
  "Graduation year: 2021",
  "Skills: Python, SQL, BigQuery, Apache Airflow, Docker, Great Expectations, Git, Looker",
];
const RESUME = [
  "Data Engineer, Acme Pay, Bengaluru (Jul 2021 to present): built batch and streaming data pipelines in Python and Apache Airflow that process about 40 million payment events per day.",
  "Data Engineer, Acme Pay: rewrote slow BigQuery reporting queries with partitioning and clustering; cut monthly query cost by 35% and report time from 20 minutes to 3 minutes.",
  "Data Engineer, Acme Pay: led the migration of 120 tables from MySQL to BigQuery over 6 weeks with zero data loss.",
  "Data Engineer, Acme Pay: added data quality checks with Great Expectations that catch schema breaks before they reach dashboards.",
  "Data Engineer, Acme Pay: mentored 2 junior engineers.",
  "Software Engineering Intern, Bluefin Labs (Jan 2021 to Jun 2021): built a Django REST API for internal reporting.",
].join("\n");
const JOB = {
  title: "Data Engineer",
  company: "Northwind Data",
  description:
    "Northwind Data builds real-time analytics for logistics companies. In this role you will build streaming pipelines with Kafka and Spark, own data quality for customer-facing dashboards, and run services on Kubernetes. We value ownership, clear communication and pragmatic engineering.",
};
const src = (question: string): FactSources => ({ profileFacts: FACTS, resumeText: RESUME, question, job: JOB });
const PROUD = "What exceptional work have you done? In 100 words or less, tell us about a piece of work you are most proud of.";
const proudLimit = lengthLimit(PROUD);

describe("cleaning model output", () => {
  it("removes thinking text, chatter, labels and word counts", () => {
    const raw = "<think>The user wants an answer. Let me plan.</think>\nSure, here is a draft answer:\n\n**Answer:** I rewrote slow BigQuery queries.\n\n(Word count: 5)";
    expect(cleanModelOutput(raw)).toBe("I rewrote slow BigQuery queries.");
  });
  it("drops an unfinished thinking block entirely", () => {
    expect(cleanModelOutput("<think>I should mention Kafka and")).toBe("");
  });
  it("keeps the text after a lone closing think tag and strips wrapping quotes", () => {
    expect(cleanModelOutput('planning…</think>\n"I built data pipelines in Python."')).toBe("I built data pipelines in Python.");
  });
});

describe("sentences and numbers", () => {
  it("does not split decimals, abbreviations or names with dots", () => {
    expect(splitSentences("I hold a B.Tech. in CS, e.g. data systems. I used Node.js and cut cost by 3.5x. Done!")).toEqual([
      "I hold a B.Tech. in CS, e.g. data systems.",
      "I used Node.js and cut cost by 3.5x.",
      "Done!",
    ]);
  });
  it("reads digits, separators, percentages and number words, but not digits inside names", () => {
    expect(numbersIn("Cut cost by 35% across 1,200 jobs for a team of four on EC2 with GPT-4 and S3 24/7")).toEqual(["35", "1200", "4"]);
    expect(numbersIn("I mentored two engineers in 2021.")).toEqual(["2021", "2"]);
    expect(numbersIn("我带领了四个人的团队")).toEqual(["4"]);
  });
});

describe("job-only skills", () => {
  it("finds tools named only in the job description or the question", () => {
    const terms = jobOnlyTerms(src("Briefly explain your experience with Kubernetes")).map((t) => t.term);
    expect(terms).toEqual(expect.arrayContaining(["Kafka", "Spark", "Kubernetes"]));
    expect(terms).not.toContain("BigQuery");
    expect(terms).not.toContain("Northwind");
  });
  it("tells claims from negations, wishes and remarks about the company", () => {
    expect(claimsTerm("I have hands-on experience running services on Kubernetes.", "Kubernetes")).toBe(true);
    expect(claimsTerm("Over five years I built pipelines, mostly with Kafka.", "Kafka")).toBe(true);
    expect(claimsTerm("I'm excited to apply my Kafka experience at Northwind.", "Kafka", "Northwind Data")).toBe(true);
    expect(claimsTerm("I haven't used Kubernetes yet, but I containerized services with Docker.", "Kubernetes")).toBe(false);
    expect(claimsTerm("I'd love to learn Kafka and Spark on your team.", "Kafka")).toBe(false);
    expect(claimsTerm("Northwind uses Kafka and Spark, which matches my interest in streaming.", "Kafka", "Northwind Data")).toBe(false);
    expect(claimsTerm("Construí pipelines con Kafka.", "Kafka", "", false)).toBe(true);
  });
});

describe("factCheck: the real failures of small models", () => {
  it("removes an invented team size ('led a team of 4')", () => {
    const draft = "I led the migration of 120 tables from MySQL to BigQuery over 6 weeks with zero data loss. I led a team of 4 engineers to do it. I also rewrote slow BigQuery reporting queries, cutting monthly query cost by 35%.";
    const r = factCheck(draft, src(PROUD), proudLimit);
    expect(r.status).toBe("ok");
    expect(r.text).not.toMatch(/team of 4/);
    expect(r.text).toMatch(/120 tables/);
    expect(r.removed).toEqual([expect.objectContaining({ reason: "number", detail: "4" })]);
  });
  it("removes the same invention written as a word ('a team of four')", () => {
    const r = factCheck("I led the migration of 120 tables to BigQuery with zero data loss. I managed a team of four engineers during the project.", src(PROUD), proudLimit);
    expect(r.removed[0]).toMatchObject({ reason: "number", detail: "4" });
  });
  it("answers INSUFFICIENT when the whole answer claims Kubernetes from the question and job", () => {
    const draft = "I have two years of experience deploying services on Kubernetes. At Acme Pay I ran our Airflow workers on Kubernetes and managed Helm charts for every pipeline.";
    const r = factCheck(draft, src("Briefly explain your experience with Kubernetes"), lengthLimit("Keep it under 80 words."));
    expect(r.status).toBe("insufficient");
    expect(r.removed.map((x) => x.reason)).toEqual(expect.arrayContaining(["skill"]));
  });
  it("keeps an honest Kubernetes answer that says it has not been used", () => {
    const draft = "I haven't used Kubernetes in production yet. I run my Airflow pipelines in Docker containers at Acme Pay, and I built batch and streaming data pipelines in Python and Apache Airflow.";
    const r = factCheck(draft, src("Briefly explain your experience with Kubernetes"), lengthLimit("Keep it under 80 words."));
    expect(r.status).toBe("ok");
    expect(r.text).toMatch(/haven't used Kubernetes/);
  });
  it("removes a Kafka claim copied from the job description but keeps the true sentences", () => {
    const draft = "At Acme Pay I built batch and streaming data pipelines in Python and Apache Airflow that process about 40 million payment events per day. I also built real-time pipelines with Kafka and Spark. I added data quality checks with Great Expectations that catch schema breaks before they reach dashboards.";
    const r = factCheck(draft, src("Why are you a good fit?"));
    expect(r.status).toBe("ok");
    expect(r.text).not.toMatch(/Kafka/);
    expect(r.removed).toEqual([expect.objectContaining({ reason: "skill" })]);
  });
  it("removes an invented percentage", () => {
    const r = factCheck("I rewrote slow BigQuery reporting queries with partitioning and clustering, which cut monthly query cost by 35%. That work improved dashboard speed by 60% for every team. I built pipelines in Python and Apache Airflow that process about 40 million payment events per day.", src(PROUD), proudLimit);
    expect(r.removed[0]).toMatchObject({ reason: "number", detail: "60" });
    expect(r.status).toBe("ok");
  });
  it("removes an unsupported strong verb ('founded')", () => {
    const r = factCheck("I founded a data engineering guild at Acme Pay. I built batch and streaming data pipelines in Python and Apache Airflow that process about 40 million payment events per day. I added data quality checks with Great Expectations.", src(PROUD), proudLimit);
    expect(r.removed[0]).toMatchObject({ reason: "strong-verb" });
    expect(r.text).not.toMatch(/founded/);
  });
  it("removes 'managed a team' when the resume only says mentored", () => {
    const r = factCheck("I managed the junior engineers on my team. I mentored 2 junior engineers at Acme Pay and built batch and streaming data pipelines in Python and Apache Airflow.", src("Tell us about your leadership experience."));
    expect(r.removed[0]).toMatchObject({ reason: "strong-verb", detail: "managed" });
  });
  it("keeps 'led' when the resume backs it", () => {
    const r = factCheck("I led the migration of 120 tables from MySQL to BigQuery over 6 weeks with zero data loss, planning each step with the analytics team.", src(PROUD), proudLimit);
    expect(r.status).toBe("ok");
    expect(r.removed).toEqual([]);
  });
  it("removes a first-person claim with no support in the resume", () => {
    const r = factCheck("I designed a fraud detection model using gradient boosting for card payments. I rewrote slow BigQuery reporting queries with partitioning and clustering and cut monthly query cost by 35%. I also added data quality checks with Great Expectations.", src(PROUD), proudLimit);
    expect(r.removed[0]?.sentence).toMatch(/fraud detection/);
  });
  it("keeps opinions and motivation without asking the resume for them", () => {
    const r = factCheck("I'm excited about Northwind Data's real-time analytics for logistics. I built batch and streaming data pipelines in Python and Apache Airflow at Acme Pay, so streaming work feels like home. I value clear communication and pragmatic engineering.", src("Why are you interested in joining Northwind Data?"));
    expect(r.status).toBe("ok");
    expect(r.removed).toEqual([]);
  });
  it("allows the company's own numbers when they are not claimed by the candidate", () => {
    const sources = { ...src("Why us?"), job: { ...JOB, description: `${JOB.description} We serve 300 logistics companies.` } };
    const r = factCheck("Northwind Data serves 300 logistics companies with real-time analytics. I built streaming data pipelines in Python and Apache Airflow at Acme Pay that process about 40 million payment events per day.", sources);
    expect(r.status).toBe("ok");
    expect(r.text).toMatch(/300/);
  });
  it("allows numbers taken from the question itself", () => {
    const r = factCheck("In the last 12 months I rewrote slow BigQuery reporting queries with partitioning and clustering, cutting monthly query cost by 35% and report time from 20 minutes to 3 minutes.", src("Describe the most technically complex project you've worked on in the last 12 months."));
    expect(r.status).toBe("ok");
  });
  it("removes sentences with blanks to fill in", () => {
    const r = factCheck("I am applying to [Company Name] because of its mission. I built batch and streaming data pipelines in Python and Apache Airflow that process about 40 million payment events per day.", src("Why us?"));
    expect(r.removed[0]).toMatchObject({ reason: "placeholder" });
  });
});

describe("factCheck: INSUFFICIENT and length", () => {
  it("treats a plain INSUFFICIENT as not enough facts", () => {
    expect(factCheck("INSUFFICIENT", src("Describe your Rust work.")).status).toBe("insufficient");
    expect(factCheck("INSUFFICIENT.", src("Describe your Rust work.")).status).toBe("insufficient");
  });
  it("keeps an answer mixed with INSUFFICIENT only when it passes the checks", () => {
    const good = factCheck("I rewrote slow BigQuery reporting queries with partitioning and clustering, which cut monthly query cost by 35% and report time from 20 minutes to 3 minutes. INSUFFICIENT", src(PROUD), proudLimit);
    expect(good.status).toBe("ok");
    expect(good.text).not.toMatch(/INSUFFICIENT/);
    const bad = factCheck("INSUFFICIENT\nI deployed Kafka clusters on Kubernetes for 5 teams.", src(PROUD), proudLimit);
    expect(bad.status).toBe("insufficient");
  });
  it("says insufficient when most of the draft was invented", () => {
    const draft = "I built batch pipelines in Python at Acme Pay. I ran 8 Kafka clusters on Kubernetes. I led a Spark migration for 12 teams. I cut cloud spend by 70% using Kubernetes autoscaling across 9 regions.";
    expect(factCheck(draft, src(PROUD), proudLimit).status).toBe("insufficient");
  });
  it("cuts a long but true answer to the limit at a whole sentence", () => {
    const limit = lengthLimit("In 2-3 sentences, what excites you about this position?");
    const draft = "I'm excited by Northwind Data's real-time analytics. At Acme Pay I built batch and streaming data pipelines in Python and Apache Airflow. I added data quality checks with Great Expectations. I rewrote slow BigQuery reporting queries with partitioning and clustering.";
    const r = factCheck(draft, src("In 2-3 sentences, what excites you about this position?"), limit);
    expect(r.status).toBe("ok");
    expect(r.shortened).toBe(true);
    expect(splitSentences(r.text!).length).toBeLessThanOrEqual(3);
  });
  it("reports too-long when not even the first sentence fits", () => {
    const r = factCheck("I built batch and streaming data pipelines in Python and Apache Airflow that process about 40 million payment events per day at Acme Pay.", src("Your skills (max 50 characters)"), lengthLimit("Your skills (max 50 characters)"));
    expect(r.status).toBe("too-long");
  });
});

describe("factCheck: other languages", () => {
  it("checks numbers and job-only skills in a Spanish answer", () => {
    const q = "¿Por qué crees que eres un buen fit? Cuéntanos retos que has afrontado.";
    const draft = "En Acme Pay construí pipelines en Python y Apache Airflow que procesan unos 40 millones de eventos de pago al día. También reduje el costo de las consultas de BigQuery en un 35%. Además, desplegué servicios con Kubernetes para 7 equipos.";
    const r = factCheck(draft, src(q));
    expect(r.status).toBe("ok");
    expect(r.text).not.toMatch(/Kubernetes/);
    expect(r.text).toMatch(/40 millones/);
  });
  it("checks numbers in a Chinese answer", () => {
    const q = "請用 250 字告訴我們為什麼想加入 Northwind Data？";
    const draft = "我在 Acme Pay 用 Python 和 Apache Airflow 建立了每天處理約 40 million 筆支付事件的資料管道。我也帶領了 8 人的團隊。";
    const r = factCheck(draft, src(q), lengthLimit(q));
    expect(r.removed.map((x) => x.detail)).toContain("8");
  });
});

describe("removedSummary", () => {
  it("explains removals in plain words", () => {
    const r = factCheck("I led the migration of 120 tables from MySQL to BigQuery with zero data loss over 6 weeks. I led a team of 4 engineers to do it. I mentored 2 junior engineers along the way at Acme Pay.", src(PROUD), proudLimit);
    expect(removedSummary(r.removed)).toBe("Removed 1 sentence that could not be checked: the number 4 is not in your profile or resume.");
    expect(removedSummary([])).toBeUndefined();
  });
});
