/** The "Apply on the company site" card, shown on a LinkedIn, Indeed or Naukri job tab (see shared/jobs/apply-direct.ts).
 * Only the tab's title and address are used; the platform's page is never read or filled. */

import { companiesNamed, guessedBoards, sameRole, searchUrl, seenJobFromTitle } from "../shared/jobs/apply-direct";
import type { ListedCompany } from "../shared/jobs/companies";
import { FEED_ORIGINS, fetchATSFeed } from "../shared/jobs/feeds";
import { defaultLimiter } from "../shared/jobs/rate-limiter";

const omitCookies = (u: string) => fetch(u, { credentials: "omit" });
let directory: ListedCompany[] | undefined;

export function renderApplyDirect(tab: { url?: string; title?: string } | undefined, handsOff: boolean): void {
  const box = document.getElementById("apply-direct");
  if (!box) return;
  const job = handsOff && tab?.url && tab.title ? seenJobFromTitle(tab.title, tab.url) : undefined;
  if (!job) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  const line = document.createElement("p");
  line.className = "hint";
  line.textContent = `${job.role} at ${job.company}. ${job.platform} does not allow extensions to fill its pages, so ApplyAgent finds this job on ${job.company}'s own careers site, where it can fill the application for you.`;
  const go = document.createElement("button");
  go.type = "button";
  go.className = "btn btn-primary";
  go.textContent = `Apply on ${job.company}'s site`;
  const status = document.createElement("p");
  status.className = "hint";
  status.setAttribute("role", "status");
  go.addEventListener("click", async () => {
    go.disabled = true;
    try {
      // Asked inside the click: the same public job boards Discover reads.
      const granted = await chrome.permissions.request({ origins: Object.values(FEED_ORIGINS) }).catch(() => false);
      if (granted) {
        status.textContent = `Looking for this job on ${job.company}'s job board…`;
        directory ??= await fetch(chrome.runtime.getURL("companies.json")).then((r) => r.json() as Promise<ListedCompany[]>);
        const known = companiesNamed(directory ?? [], job.company).filter((c) => c.ats in FEED_ORIGINS).map((c) => ({ ats: c.ats, slug: c.slug, name: c.name }));
        for (const board of known.length ? known : guessedBoards(job.company)) {
          const postings = await fetchATSFeed(board.ats, board.slug, board.name, omitCookies, defaultLimiter).catch(() => []);
          const match = sameRole(postings, job.role);
          if (match?.url) {
            status.textContent = `Found it on ${job.company}'s own site. Press Fill there.`;
            await chrome.tabs.create({ url: match.url });
            return;
          }
        }
      }
      status.textContent = `Not found on a job board ApplyAgent reads: opened a search for it on ${job.company}'s own site.`;
      await chrome.tabs.create({ url: searchUrl(job) });
    } finally {
      go.disabled = false;
    }
  });
  box.replaceChildren(line, go, status);
}
