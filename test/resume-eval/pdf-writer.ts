/** A tiny PDF writer for tests: positioned text in Helvetica (regular and bold) and link annotations, so the resume
 * reader can be tested on real PDF bytes (layout, columns, hyperlinks) without any PDF library. */

export interface PdfText {
  text: string;
  x: number;
  y: number;
  size?: number;
  bold?: boolean;
}

export interface PdfLink {
  /** Rectangle in PDF points: [x0, y0, x1, y1]. */
  rect: [number, number, number, number];
  url: string;
}

export interface PdfPageSpec {
  texts: PdfText[];
  links?: PdfLink[];
}

// WinAnsi codes for the few non-Latin-1 characters resumes use.
const WIN_ANSI: Record<string, number> = { "•": 0x95, "–": 0x96, "—": 0x97, "’": 0x92, "‘": 0x91, "“": 0x93, "”": 0x94, "€": 0x80, "…": 0x85 };

function encodeText(s: string): number[] {
  const out: number[] = [];
  for (const ch of s) {
    const code = WIN_ANSI[ch] ?? ch.codePointAt(0)!;
    if (code > 255) throw new Error(`pdf-writer: character not in WinAnsi: ${ch}`);
    if (code === 0x28 || code === 0x29 || code === 0x5c) out.push(0x5c); // escape ( ) \
    out.push(code);
  }
  return out;
}

const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0));

/** Approximate Helvetica width (points) of a string, for placing link rectangles over words. */
export function textWidth(s: string, size = 10): number {
  let w = 0;
  for (const ch of s) w += /[il.,:;|'!]/.test(ch) ? 0.28 : /[mwMW@]/.test(ch) ? 0.85 : /[A-Z]/.test(ch) ? 0.68 : ch === " " ? 0.28 : 0.55;
  return w * size;
}

/** A rectangle over `word` inside `t` (the first occurrence). */
export function linkOver(t: PdfText, word: string, url: string): PdfLink {
  const size = t.size ?? 10;
  const at = t.text.indexOf(word);
  if (at < 0) throw new Error(`pdf-writer: "${word}" not in "${t.text}"`);
  const x0 = t.x + textWidth(t.text.slice(0, at), size);
  return { rect: [x0 - 1, t.y - 2, x0 + textWidth(word, size) + 1, t.y + size], url };
}

export function makePdf(pages: PdfPageSpec[], width = 612, height = 792): Uint8Array {
  const objects: number[][] = [];
  const add = (bytes: number[]) => {
    objects.push(bytes);
    return objects.length; // object number
  };
  // 1 catalog, 2 pages, 3 font regular, 4 font bold; then per page: page, contents, annotations.
  add([]);
  add([]);
  add(ascii("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"));
  add(ascii("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"));
  const pageIds: number[] = [];
  for (const page of pages) {
    const content: number[] = [];
    for (const t of page.texts) {
      content.push(...ascii(`BT /${t.bold ? "F2" : "F1"} ${t.size ?? 10} Tf 1 0 0 1 ${t.x} ${t.y} Tm (`), ...encodeText(t.text), ...ascii(") Tj ET\n"));
    }
    const contentId = add([...ascii(`<< /Length ${content.length} >>\nstream\n`), ...content, ...ascii("\nendstream")]);
    const annotIds = (page.links ?? []).map((l) =>
      add([...ascii(`<< /Type /Annot /Subtype /Link /Rect [${l.rect.map((n) => n.toFixed(1)).join(" ")}] /Border [0 0 0] /A << /S /URI /URI (`), ...encodeText(l.url), ...ascii(") >> >>")]));
    const annots = annotIds.length ? ` /Annots [${annotIds.map((i) => `${i} 0 R`).join(" ")}]` : "";
    pageIds.push(add(ascii(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R${annots} >>`)));
  }
  objects[0] = ascii("<< /Type /Catalog /Pages 2 0 R >>");
  objects[1] = ascii(`<< /Type /Pages /Kids [${pageIds.map((i) => `${i} 0 R`).join(" ")}] /Count ${pageIds.length} >>`);

  const out: number[] = ascii("%PDF-1.4\n");
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out.push(...ascii(`${i + 1} 0 obj\n`), ...body, ...ascii("\nendobj\n"));
  });
  const xref = out.length;
  out.push(...ascii(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`));
  for (const o of offsets) out.push(...ascii(`${String(o).padStart(10, "0")} 00000 n \n`));
  out.push(...ascii(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`));
  return new Uint8Array(out);
}

// --- DOCX (a stored ZIP, no compression) ----------------------------------------------------------------------

export function makeZip(files: Record<string, string>): Uint8Array {
  const enc = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const nb = enc.encode(name);
    const fb = enc.encode(content);
    const lh = new Uint8Array(30 + nb.length + fb.length);
    const lv = new DataView(lh.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint32(18, fb.length, true);
    lv.setUint32(22, fb.length, true);
    lv.setUint16(26, nb.length, true);
    lh.set(nb, 30);
    lh.set(fb, 30 + nb.length);
    const cd = new Uint8Array(46 + nb.length);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint32(20, fb.length, true);
    cv.setUint32(24, fb.length, true);
    cv.setUint16(28, nb.length, true);
    cv.setUint32(42, offset, true);
    cd.set(nb, 46);
    locals.push(lh);
    centrals.push(cd);
    offset += lh.length;
  }
  const cdSize = centrals.reduce((n, c) => n + c.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, centrals.length, true);
  ev.setUint16(10, centrals.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);
  const zip = new Uint8Array(offset + cdSize + 22);
  let at = 0;
  for (const part of [...locals, ...centrals, eocd]) {
    zip.set(part, at);
    at += part.length;
  }
  return zip;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** A paragraph is a list of runs: plain text, or a hyperlink with its target. */
export type DocxRun = string | { text: string; url: string; field?: boolean };

export function makeDocx(paragraphs: DocxRun[][]): Uint8Array {
  const rels: string[] = [];
  const body = paragraphs.map((runs) => `<w:p>${runs.map((r) => {
    if (typeof r === "string") return `<w:r><w:t xml:space="preserve">${esc(r)}</w:t></w:r>`;
    if (r.field) {
      // The older way Word writes links: a HYPERLINK field code.
      return `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> HYPERLINK "${esc(r.url)}" </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>${esc(r.text)}</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>`;
    }
    const id = `rId${rels.length + 10}`;
    rels.push(`<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${esc(r.url)}" TargetMode="External"/>`);
    return `<w:hyperlink r:id="${id}"><w:r><w:rPr><w:rStyle w:val="Hyperlink"/></w:rPr><w:t>${esc(r.text)}</w:t></w:r></w:hyperlink>`;
  }).join("")}</w:p>`).join("");
  return makeZip({
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>`,
    "word/document.xml": `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body}</w:body></w:document>`,
    "word/_rels/document.xml.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${rels.join("")}</Relationships>`,
  });
}
