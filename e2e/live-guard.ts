/** The guard of the real-life runs on live forms: the browser may READ (GET, and GraphQL queries, which is how Ashby
 * loads its form), but nothing the page could send is let out: no form posts, mutations (Ashby's "submit
 * application"), uploads, autosaves or tracking beacons. */
import type { Request } from "@playwright/test";

export function isReadOnly(req: Request): boolean {
  const method = req.method();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;
  if (method !== "POST" || !/graphql/i.test(req.url())) return false;
  try {
    const body = JSON.parse(req.postData() ?? "null") as { query?: string } | Array<{ query?: string }> | null;
    const ops = Array.isArray(body) ? body : body ? [body] : [];
    return ops.length > 0 && ops.every((op) => typeof op.query === "string" && /^\s*(?:query\b|\{)/.test(op.query) && !/\bmutation\b/.test(op.query));
  } catch {
    return false;
  }
}
