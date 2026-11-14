/** A salary list of ranges ("$100,000 - $120,000", "120k-150k", "Above 200,000"): the one range holding the user's
 * saved figure (Benevity, live round 11: "CAD 140,000" matched no option and the field failed). Never across
 * currencies: an option naming another currency is never chosen, and none is chosen when two ranges hold the figure. */

const SIGN: Record<string, RegExp> = {
  USD: /\$|\busd\b/i, CAD: /\bcad\b|c\$|\$/i, AUD: /\baud\b|a\$|\$/i, SGD: /\bsgd\b|s\$|\$/i, EUR: /€|\beur\b/i, GBP: /£|\bgbp\b/i,
  INR: /₹|\binr\b|\brs\.?\b|\blpa\b|\blakh/i, JPY: /¥|\bjpy\b/i,
};
const ANY_CURRENCY = /[$€£₹¥]|\b(usd|cad|aud|sgd|eur|gbp|inr|jpy|chf|brl|mxn)\b/i;

/** The amount and currency of a saved figure ("CAD 140,000", "$120k", "140000"). */
export function amountOf(value: string): { amount: number; currency?: string } | undefined {
  const m = /(\d[\d,.\s]*)\s*(k|m|lpa|lakhs?)?\b/i.exec(value.replace(/(\d)[\s,](?=\d{3}\b)/g, "$1"));
  if (!m) return undefined;
  let n = Number(m[1]!.replace(/[,\s]/g, ""));
  if (!Number.isFinite(n)) return undefined;
  const unit = (m[2] ?? "").toLowerCase();
  if (unit === "k") n *= 1_000;
  else if (unit === "m") n *= 1_000_000;
  else if (unit.startsWith("lakh") || unit === "lpa") n *= 100_000;
  const code = Object.keys(SIGN).find((c) => new RegExp(`\\b${c}\\b`, "i").test(value)) ?? (/€/.test(value) ? "EUR" : /£/.test(value) ? "GBP" : /₹/.test(value) ? "INR" : undefined);
  return { amount: n, currency: code };
}

/** The numbers of a range option, scaled ("120k" → 120000). */
function numbersOf(option: string): number[] {
  return [...option.replace(/(\d),(?=\d{3}\b)/g, "$1").matchAll(/(\d+(?:\.\d+)?)\s*(k|m)?\b/gi)].map((m) => Number(m[1]) * ((m[2] ?? "").toLowerCase() === "k" ? 1_000 : (m[2] ?? "").toLowerCase() === "m" ? 1_000_000 : 1));
}

export function salaryBandOption(options: string[], value: string): string | undefined {
  const saved = amountOf(value);
  if (!saved || saved.amount < 100) return undefined;
  const fits = options.filter((o) => {
    // Another currency named in the option: never (a "$" is several currencies, so it only stops a non-dollar figure).
    if (ANY_CURRENCY.test(o) && saved.currency && !SIGN[saved.currency]?.test(o)) return false;
    if (ANY_CURRENCY.test(o) && !saved.currency && !/\$/.test(o)) return false;
    const n = o.toLowerCase();
    const nums = numbersOf(o).filter((x) => x >= 100);
    if (!nums.length) return false;
    if (/\b(less than|under|below|up to|upto|<)\b|^</.test(n)) return saved.amount < nums[0]! || (/\bup ?to\b/.test(n) && saved.amount <= nums[0]!);
    if (/\+|\b(or more|and above|above|over|more than|greater than)\b|^>/.test(n)) return saved.amount >= nums[0]!;
    if (nums.length >= 2) return saved.amount >= nums[0]! && saved.amount <= nums[1]!;
    return false;
  });
  if (fits.length === 1) return fits[0];
  // On the shared edge of two ranges ("100,000-120,000" and "120,000-140,000"): the range that starts there.
  if (fits.length === 2) {
    const starts = fits.filter((o) => numbersOf(o).filter((x) => x >= 100)[0] === saved.amount);
    return starts.length === 1 ? starts[0] : undefined;
  }
  return undefined;
}
