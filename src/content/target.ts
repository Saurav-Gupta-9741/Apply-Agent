/** Is this page the application itself, or the job description around it? A page that still offers its own "Apply"
 * button outside any form is the description; a small form there is job alerts, a newsletter or a job search, unless
 * it takes an upload (applications do: the resume). Filling or submitting those would sign the user up for emails or
 * be counted as an application that never happened. */

import { generic, pickAdapter } from "./adapters";
import { extractFields } from "./extract";
import { findApplyControl } from "./sense";

export function isApplicationPage(doc: Document): boolean {
  if (!findApplyControl(doc)) return true;
  const root = pickAdapter(doc).formRoot(doc) ?? generic.formRoot(doc);
  return !!root && extractFields(root).some((f) => f.descriptor.control === "file");
}
