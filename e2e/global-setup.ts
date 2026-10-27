import { execFileSync } from "node:child_process";

/** Build the test variant of the extension and the React practice page before any test runs. */
export default function globalSetup(): void {
  execFileSync(process.execPath, ["build.mjs", "--test"], { stdio: "inherit" });
}
