/** DOM queries that also look inside open shadow roots: forms built from web components (Lit, Stencil,
 * Salesforce, SmartRecruiters-style widgets) keep their inputs there, out of reach of querySelectorAll. */

function shadowHosts(root: ParentNode): Element[] {
  const all = root.querySelectorAll("*");
  const hosts: Element[] = [];
  for (let i = 0; i < all.length; i++) {
    if (all[i]!.shadowRoot) hosts.push(all[i]!);
  }
  return hosts;
}

/** querySelectorAll through open shadow roots, in document order (each shadow tree right after its host). */
export function deepQueryAll<T extends Element = Element>(root: ParentNode, selector: string): T[] {
  const hosts = shadowHosts(root);
  if (!hosts.length) return Array.from(root.querySelectorAll<T>(selector));
  const out: T[] = [];
  const visit = (node: ParentNode) => {
    // Document order: walk every element once, descending into a shadow root right after its host.
    for (const el of Array.from(node.querySelectorAll("*"))) {
      if (el.matches(selector)) out.push(el as T);
      if (el.shadowRoot) visit(el.shadowRoot);
    }
  };
  visit(root);
  return out;
}

export function deepQuery<T extends Element = Element>(root: ParentNode, selector: string): T | null {
  return deepQueryAll<T>(root, selector)[0] ?? null;
}

/** The document or shadow root an element lives in: ids and label[for] resolve there. */
export function scopeOf(el: Element): Document | ShadowRoot {
  const root = el.getRootNode();
  return typeof ShadowRoot !== "undefined" && root instanceof ShadowRoot ? (root as ShadowRoot) : el.ownerDocument;
}

/** parentElement that climbs out of a shadow root to its host, so containers are found across the boundary. */
export function parentAcross(el: Element): Element | null {
  if (el.parentElement) return el.parentElement;
  const root = el.getRootNode();
  return typeof ShadowRoot !== "undefined" && root instanceof ShadowRoot ? (root as ShadowRoot).host : null;
}
