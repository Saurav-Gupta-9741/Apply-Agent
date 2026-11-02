/** Form structure export for crowdsourced structure capture.
 * Captures form schema (labels, control types, options, automation/aria IDs)
 * with EVERY personal value, text input, name, email, phone, and address strictly blanked.
 *
 * Designed to let users help improve support for complex enterprise ATSs (Workday, etc.)
 * by saving structure locally. Nothing is sent automatically over the network.
 */

import { pickAdapter } from "../content/adapters";
import { extractFields, type ExtractedField } from "../content/extract";

export interface FormFieldStructure {
  label: string;
  originalLabel?: string;
  control: string;
  required: boolean;
  name?: string;
  id?: string;
  automationId?: string;
  ariaLabel?: string;
  placeholder?: string;
  options?: string[];
  section?: string;
  workBlock?: number;
}

export interface FormStructureExport {
  version: 1;
  savedAt: string;
  platform: string;
  domain: string;
  path: string;
  jobTitle?: string;
  actionText?: string;
  fieldCount: number;
  fields: FormFieldStructure[];
}

/** Sanitize URL to keep only domain and pathname, stripping all query parameters, tokens, and hashes. */
export function sanitizePageUrl(rawUrl: string): { domain: string; path: string } {
  try {
    const parsed = new URL(rawUrl);
    return {
      domain: parsed.hostname,
      path: parsed.pathname,
    };
  } catch {
    return {
      domain: "unknown",
      path: "",
    };
  }
}

/** Convert an ExtractedField into a strictly blanked FormFieldStructure.
 * Never includes values, typed text, uploaded file paths, or private data. */
export function extractFieldStructure(f: ExtractedField): FormFieldStructure {
  const el = f.elements[0];
  const automationId = el?.getAttribute("data-automation-id")
    || el?.getAttribute("data-testid")
    || el?.getAttribute("data-sf-field")
    || undefined;
  const ariaLabel = el?.getAttribute("aria-label") || undefined;
  const id = el?.id || undefined;
  const placeholder = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el.placeholder || undefined : undefined;

  return {
    label: f.descriptor.label,
    originalLabel: f.descriptor.originalLabel,
    control: f.descriptor.control,
    required: !!f.descriptor.required,
    name: f.descriptor.name || undefined,
    id,
    automationId,
    ariaLabel,
    placeholder,
    options: f.descriptor.options && f.descriptor.options.length ? [...f.descriptor.options] : undefined,
    section: f.descriptor.section,
    workBlock: f.descriptor.workBlock,
  };
}

/** Extract structure from a Document DOM without extracting or retaining any user values. */
export function extractFormStructure(doc: Document, overrideUrl?: string): FormStructureExport {
  const pageUrl = overrideUrl || doc.location?.href || "https://example.com";
  const { domain, path } = sanitizePageUrl(pageUrl);
  const adapter = pickAdapter(doc, pageUrl);
  const root = adapter.formRoot(doc) ?? doc.body;
  const fields = root ? extractFields(root) : [];
  const action = root ? adapter.action(root) : null;
  const actionText = action ? (action.button.textContent || action.button.getAttribute("value") || "").trim() : undefined;

  return {
    version: 1,
    savedAt: new Date().toISOString(),
    platform: adapter.platform,
    domain,
    path,
    jobTitle: adapter.jobTitle(doc) || doc.title || undefined,
    actionText,
    fieldCount: fields.length,
    fields: fields.map(extractFieldStructure),
  };
}

/** Format FormStructureExport as pretty-printed JSON. */
export function exportFormStructureAsJson(structure: FormStructureExport): string {
  return JSON.stringify(structure, null, 2);
}

/** Generate a standard filename for saving structure: applyagent-structure-<domain>-<timestamp>.json */
export function structureFilename(domain: string, date = new Date()): string {
  const safeHost = (domain || "unknown").replace(/[^a-z0-9.-]/gi, "_").toLowerCase();
  const dateStr = date.toISOString().replace(/[:.]/g, "-");
  return `applyagent-structure-${safeHost}-${dateStr}.json`;
}

/** Download structure JSON locally. */
export function downloadFormStructure(structure: FormStructureExport): void {
  const json = exportFormStructureAsJson(structure);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = structureFilename(structure.domain);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Mount handler to the panel button. */
export function mountFormStructureButton(
  btn: HTMLElement,
  getStructure: () => Promise<FormStructureExport | null>,
  onToast: (msg: string) => void = () => {},
): void {
  btn.addEventListener("click", async () => {
    try {
      const structure = await getStructure();
      if (!structure || structure.fieldCount === 0) {
        onToast("No form structure found on the active page.");
        return;
      }
      downloadFormStructure(structure);
      onToast(`Form structure saved (${structure.fieldCount} fields, all personal values blanked).`);
    } catch (err) {
      onToast(`Failed to export structure: ${String(err)}`);
    }
  });
}
