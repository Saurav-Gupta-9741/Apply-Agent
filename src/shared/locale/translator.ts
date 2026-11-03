/**
 * On-device Translation Coordinator.
 *
 * Uses Chrome 138+ on-device Translation API (window.translation / self.ai.translator)
 * when available, falling back to local deterministic dictionaries in i18n-labels.ts.
 * Caches translated strings in memory per session.
 *
 * Rule: Zero network requests. Never sends candidate text or form labels to any remote endpoint.
 */

import { translateLabel, SupportedLanguage } from "../i18n-labels";

const translationCache = new Map<string, string>();

/**
 * Translates a label or option on-device using local APIs or built-in dictionary.
 */
export async function translateOnDevice(
  text: string,
  sourceLanguage: string,
  targetLanguage = "en"
): Promise<string> {
  const source = sourceLanguage.toLowerCase().split("-")[0] ?? "";
  if (!text || !source || source === "en" || source === "unknown") {
    return text;
  }

  const cacheKey = `${source}:${targetLanguage}:${text.toLowerCase().trim()}`;
  const cached = translationCache.get(cacheKey);
  if (cached !== undefined) return cached;

  // 1. Chrome's built-in on-device Translator (Chrome 138+). Only when the language pair is already "available":
  //    never triggers a model download from a page script. Nothing leaves the device.
  try {
    const T = (globalThis as any).Translator;
    if (T?.create && (await T.availability?.({ sourceLanguage: source, targetLanguage })) === "available") {
      const translator = await T.create({ sourceLanguage: source, targetLanguage });
      const result = await translator.translate(text);
      if (typeof result === "string" && result.trim()) {
        translationCache.set(cacheKey, result);
        return result;
      }
    }
  } catch {
    // fall through to the dictionary
  }

  // 2. The reviewed local dictionary, for the languages it covers.
  const translated = (["de", "fr", "es", "nl", "pt"] as string[]).includes(source)
    ? translateLabel(text, source as SupportedLanguage)
    : text;
  translationCache.set(cacheKey, translated);
  return translated;
}

/** For fields the dictionary did not translate, on a page whose language is not English: the browser's on-device
 * translation becomes the field's English label, marked machineTranslated. */
export async function translateFieldsOnDevice(
  descriptors: Array<{ label: string; originalLabel?: string; translatedLabel?: string; machineTranslated?: boolean }>,
  pageLang: string,
): Promise<number> {
  const lang = pageLang.toLowerCase().split("-")[0] ?? "";
  if (!lang || lang === "en") return 0;
  let changed = 0;
  for (const d of descriptors) {
    if (d.translatedLabel || !d.label.trim()) continue;
    const english = await translateOnDevice(d.label, lang);
    if (english && english.trim().toLowerCase() !== d.label.trim().toLowerCase()) {
      d.originalLabel = d.label;
      d.translatedLabel = english;
      d.machineTranslated = true;
      changed++;
    }
  }
  return changed;
}

/**
 * Clears the in-memory translation cache (e.g. on new page navigation).
 */
export function clearTranslationCache(): void {
  translationCache.clear();
}
