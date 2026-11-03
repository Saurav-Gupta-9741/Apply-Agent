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
// A real .zip with manifest.json at its root. Not "tar": Git Bash's GNU tar ignores -a and writes a tar file
// named .zip, which Windows cannot open (beta 1 shipped that way first).
if (process.platform === "win32") {
  execFileSync("powershell.exe", ["-NoProfile", "-Command", `Compress-Archive -Path 'dist/*' -DestinationPath '${out}' -Force`], { stdio: "inherit" });
} else {
  execFileSync("zip", ["-r", "-q", `../${out}`, "."], { cwd: "dist", stdio: "inherit" });
}
const head = readFileSync(out).subarray(0, 2).toString("latin1");
if (head !== "PK") throw new Error(`${out} is not a zip file (starts with ${JSON.stringify(head)})`);
console.log(`Wrote ${out}`);
