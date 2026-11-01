// @vitest-environment node
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "..");
const real = JSON.parse(readFileSync(join(ROOT, "site/site.config.json"), "utf8")) as Record<string, string>;
const temp = mkdtempSync(join(tmpdir(), "applyagent-site-"));
afterAll(() => rmSync(temp, { recursive: true, force: true }));

const FILLED = {
  CONTACT_EMAIL: "hello@example.org",
  OPERATOR: "Test Operator",
  CITY: "Jodhpur",
  STORE_URL: "https://chromewebstore.google.com/detail/test-id",
  DATE: "1 November 2026",
};

function build(name: string, config: Record<string, string>) {
  const configPath = join(temp, `${name}.json`);
  const out = join(temp, `${name}-dist`);
  writeFileSync(configPath, JSON.stringify(config));
  const run = spawnSync(process.execPath, ["site/build.mjs"], {
    cwd: ROOT, encoding: "utf8", env: { ...process.env, SITE_CONFIG: configPath, SITE_OUT: out },
  });
  const html = existsSync(out)
    ? Object.fromEntries(readdirSync(out).filter((f) => f.endsWith(".html")).map((f) => [f, readFileSync(join(out, f), "utf8")]))
    : {};
  return { status: run.status, stderr: run.stderr, out, html };
}

/** Visible text and attributes, without the CSS (which has numbers like 100% widths). */
const content = (html: string) => html.replace(/<style[\s\S]*?<\/style>/g, "");

describe("site build", () => {
  it("has the decided prices in its config", () => {
    expect(real).toMatchObject({ PRICE_PRO_INR: "149", PRICE_PRO_USD: "9", PRICE_FOUNDER_INR: "2999", PRICE_FOUNDER_USD: "49" });
  });

  it("refuses to build while contact, operator, city or store values are empty", () => {
    const { status, stderr, out } = build("empty", real);
    expect(status).not.toBe(0);
    for (const k of ["CONTACT_EMAIL", "OPERATOR", "CITY", "STORE_URL"]) expect(stderr).toContain(k);
    expect(existsSync(out)).toBe(false);
    for (const k of ["CONTACT_EMAIL", "OPERATOR", "CITY", "STORE_URL"]) {
      expect(build(`one-${k}`, { ...real, ...FILLED, [k]: " " }).status).not.toBe(0);
    }
  });

  const filled = build("filled", { ...real, ...FILLED });

  it("builds with a filled config, with every placeholder replaced", () => {
    expect(filled.status, filled.stderr).toBe(0);
    expect(Object.keys(filled.html).sort()).toEqual(["index.html", "privacy.html", "refund.html", "terms.html"]);
    expect(existsSync(join(ROOT, "site/login.html"))).toBe(false);
    for (const html of Object.values(filled.html)) expect(html).not.toMatch(/\{\{\w+\}\}/);
  });

  it("makes no invented claims", () => {
    for (const [file, html] of Object.entries(filled.html)) {
      const text = content(html);
      for (const banned of ["San Francisco", "Bangalore", "Guarantee", "support@applyagent.dev", "499", "100%"]) {
        expect(text, `${file}: ${banned}`).not.toContain(banned);
      }
      for (const banned of [/swarm/i, /lifetime/i, /retrained/i, /\bVIP\b/i, /testimonial/i, /\bratings?\b/i, /0-day/i,
        /tamper-proof/i, /Simplify|LazyApply|Sonara|LoopCV|\bTeal\b/]) {
        expect(text, `${file}: ${banned}`).not.toMatch(banned);
      }
      // The only email address is the configured one.
      for (const email of text.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) ?? []) expect(email).toBe(FILLED.CONTACT_EMAIL);
    }
  });

  it("shows the prices from the config, and the honest pages", () => {
    const index = filled.html["index.html"];
    for (const price of ["₹149", "$9", "₹2999", "$49"]) expect(index).toContain(price);
    expect(index).toContain("Founder · 10 years");
    expect(index).toMatch(/no auto-renewal/i);
    expect(index).toContain('id="never"');
    for (const rule of [/never submits/i, /consent/i, /ID numbers/i, /signatures/i, /LinkedIn, Naukri, Indeed/]) expect(index).toMatch(rule);
    expect(filled.html["privacy.html"]).toMatch(/only your licence key/);
    expect(filled.html["refund.html"]).toMatch(/within 7 days/);
    expect(filled.html["terms.html"]).toContain(FILLED.CITY);
  });

  it("changes prices only through the config", () => {
    const other = build("other", { ...real, ...FILLED, PRICE_PRO_INR: "199", PRICE_PRO_USD: "12", PRICE_FOUNDER_INR: "3299", PRICE_FOUNDER_USD: "59" });
    expect(other.status, other.stderr).toBe(0);
    const index = other.html["index.html"];
    for (const price of ["₹199", "$12", "₹3299", "$59"]) expect(index).toContain(price);
    for (const old of ["₹149", "$9 ", "₹2999", "$49"]) expect(index).not.toContain(old);
  });
});
