/** Builds the extension and zips dist/ into release/applyagent-beta-<version>.zip for testers ("Load unpacked").
 * Usage: node scripts/package-beta.mjs   (needs the model once: node scripts/fetch-model.mjs) */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";

const version = JSON.parse(readFileSync("static/manifest.json", "utf8")).version;
execFileSync(process.execPath, ["build.mjs", "--beta"], { stdio: "inherit" });
if (!existsSync("dist/manifest.json")) throw new Error("build did not produce dist/manifest.json");
mkdirSync("release", { recursive: true });
const out = `release/applyagent-beta-${version}.zip`;
rmSync(out, { force: true });
// Windows 10+ and macOS/Linux all ship tar that writes zip archives.
execFileSync("tar", ["-a", "-c", "-f", out, "-C", "dist", "."], { stdio: "inherit" });
console.log(`Wrote ${out}`);
