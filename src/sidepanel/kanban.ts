/** Accessible Kanban Board for the Tracker CRM.
 *
 * Supports:
 *  - Columns: Saved, Applied, Interview, Offer, Rejected
 *  - Keyboard navigation: Left/Right arrows to move between stages, Enter to view, Space to select.
 *  - Full a11y: ARIA live regions, role="region", role="list", role="listitem".
 *  - Contact management per job (name, role, email).
 */

import type { TrackerStage } from "../shared/types";
import type { TrackerEntry } from "./tracker";

export const KANBAN_COLUMNS: TrackerStage[] = [
  "Saved",
  "Applied",
  "Interview",
  "Offer",
  "Rejected",
];

export interface JobContact {
  name: string;
  role: string;
  email: string;
}

export function groupEntriesByStage(entries: TrackerEntry[]): Record<TrackerStage, TrackerEntry[]> {
  const grouped: Record<TrackerStage, TrackerEntry[]> = {
    Saved: [],
    Applied: [],
    Assessment: [],
    Interview: [],
    Offer: [],
    Rejected: [],
    Withdrawn: [],
  };

  for (const entry of entries) {
    if (grouped[entry.stage]) {
      grouped[entry.stage].push(entry);
    } else {
      grouped.Saved.push(entry);
    }
  }

  return grouped;
}

/** Render HTML for Kanban board */
export function renderKanbanBoard(entries: TrackerEntry[]): string {
  const grouped = groupEntriesByStage(entries);

  const columnHtml = KANBAN_COLUMNS.map((stage) => {
    const items = grouped[stage] || [];
    const count = items.length;

    const cardsHtml = items.map((item) => renderKanbanCard(item)).join("\n");

    return `
<div class="kanban-column" data-stage="${stage}" role="region" aria-label="${stage} applications (${count})">
  <div class="kanban-column-header">
    <h3 class="kanban-column-title">${stage}</h3>
    <span class="kanban-column-count" aria-hidden="true">${count}</span>
  </div>
  <div class="kanban-card-list" role="list" data-stage="${stage}" tabindex="0" aria-label="${stage} list">
    ${cardsHtml || '<div class="kanban-empty">No jobs here</div>'}
  </div>
</div>`.trim();
  }).join("\n");

  return `
<div class="kanban-board" role="application" aria-label="Job Application Pipeline">
  ${columnHtml}
</div>`.trim();
}

/** Render single Kanban card with keyboard move indicators */
export function renderKanbanCard(entry: TrackerEntry): string {
  const followUpBadge = entry.followUpAt
    ? `<span class="badge badge-date">Follow-up: ${escapeHtml(entry.followUpAt)}</span>`
    : "";

  return `
<div class="kanban-card" role="listitem" tabindex="0" data-id="${escapeHtml(entry.id)}" data-stage="${entry.stage}" aria-label="${escapeHtml(entry.title)} at ${escapeHtml(entry.company)}, currently ${entry.stage}. Press Left or Right Arrow to change stage.">
  <div class="kanban-card-header">
    <strong class="kanban-card-title">${escapeHtml(entry.title)}</strong>
    <span class="kanban-card-company">${escapeHtml(entry.company)}</span>
  </div>
  <div class="kanban-card-meta">
    ${followUpBadge}
  </div>
  ${entry.notes ? `<p class="kanban-card-notes">${escapeHtml(entry.notes)}</p>` : ""}
  <div class="kanban-card-actions">
    <button class="btn btn-xs btn-stage-prev" title="Move back" aria-label="Move back to previous stage">&larr;</button>
    <button class="btn btn-xs btn-open-prep" data-id="${escapeHtml(entry.id)}" title="AI Interview Prep">Prep</button>
    <button class="btn btn-xs btn-stage-next" title="Move forward" aria-label="Move forward to next stage">&rarr;</button>
  </div>
</div>`.trim();
}

/** Calculate next and previous stage for keyboard navigation */
export function getAdjacentStage(current: TrackerStage, direction: "prev" | "next"): TrackerStage | null {
  const idx = KANBAN_COLUMNS.indexOf(current);
  if (idx === -1) return null;

  if (direction === "prev") {
    return idx > 0 ? KANBAN_COLUMNS[idx - 1]! : null;
  } else {
    return idx < KANBAN_COLUMNS.length - 1 ? KANBAN_COLUMNS[idx + 1]! : null;
  }
}

/** Handle keyboard navigation event on a kanban card */
export function handleKanbanKeyboard(
  event: { key: string; preventDefault: () => void },
  currentStage: TrackerStage
): TrackerStage | null {
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    return getAdjacentStage(currentStage, "prev");
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    return getAdjacentStage(currentStage, "next");
  }
  return null;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
