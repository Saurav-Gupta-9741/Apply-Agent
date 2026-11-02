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
  sourceLanguage: SupportedLanguage | "unknown" | "en",
  targetLanguage = "en"
): Promise<string> {
  if (!text || sourceLanguage === "en" || sourceLanguage === "unknown") {
    return text;
  }

  const cacheKey = `${sourceLanguage}:${targetLanguage}:${text.toLowerCase().trim()}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  // 1. Try Chrome Built-in on-device Translator if available in environment
  try {
    const ai = (typeof self !== "undefined" ? (self as any).ai : undefined) ??
               (typeof window !== "undefined" ? (window as any).ai : undefined);
    if (ai?.translator) {
      const translator = await ai.translator.create({
        sourceLanguage,
        targetLanguage,
      });
      const result = await translator.translate(text);
      if (result && typeof result === "string") {
        translationCache.set(cacheKey, result);
        return result;
      }
    }
  } catch {
    // Graceful fallback to offline dictionary
  }

  // 2. Deterministic local dictionary fallback
  const translated = translateLabel(text, sourceLanguage);
  translationCache.set(cacheKey, translated);
  return translated;
}

/**
 * Clears the in-memory translation cache (e.g. on new page navigation).
 */
export function clearTranslationCache(): void {
  translationCache.clear();
}
