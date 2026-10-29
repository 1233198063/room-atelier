import { create } from "zustand";
import { type Lang, MESSAGES, type Messages } from "./messages";
import { localizeName } from "./names";
import { followUnitInOtherTabs } from "./units";

export type { ColorPart, Lang, Messages } from "./messages";
export { localizeName, nameKey } from "./names";
export { describe, type Len } from "./messages";
export { getLengthUnit, setLengthUnit, useLength, useLengthUnit } from "./units";

/**
 * The interface language. A viewer preference, not part of the document: it
 * lives in its own store and its own localStorage key, so it never enters
 * undo history or the saved layout.
 */
export const LANG_KEY = "room-atelier:lang";

const isLang = (v: unknown): v is Lang => v === "en" || v === "zh";

function detectLang(): Lang {
  try {
    const saved = globalThis.localStorage?.getItem(LANG_KEY);
    if (isLang(saved)) return saved;
  } catch {
    // Storage can be blocked; fall back to the browser language.
  }
  return globalThis.navigator?.language?.toLowerCase().startsWith("zh") ? "zh" : "en";
}

export const useI18n = create<{ lang: Lang }>()(() => ({ lang: detectLang() }));

export const getLang = (): Lang => useI18n.getState().lang;
export const useLang = (): Lang => useI18n((s) => s.lang);
/** Interface text in the current language. */
export const useT = (): Messages => MESSAGES[useLang()];
/** The same, outside React (store actions). */
export const t = (): Messages => MESSAGES[getLang()];
/** Shows a stored name in the current language; see names.ts. */
export function useName(): (name: string) => string {
  const lang = useLang();
  return (name) => localizeName(name, lang);
}

function applyToDocument(lang: Lang) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  document.title = MESSAGES[lang].meta.title;
  document.querySelector('meta[name="description"]')?.setAttribute("content", MESSAGES[lang].meta.description);
}

export function setLang(lang: Lang) {
  if (lang === getLang()) return;
  useI18n.setState({ lang });
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // Still switches for this visit.
  }
  applyToDocument(lang);
}

/** Sync the document with the language, and follow language and unit switches made in other tabs. */
export function startI18n() {
  applyToDocument(getLang());
  followUnitInOtherTabs();
  window.addEventListener("storage", (e) => {
    if (e.key !== LANG_KEY || !isLang(e.newValue) || e.newValue === getLang()) return;
    useI18n.setState({ lang: e.newValue });
    applyToDocument(e.newValue);
  });
}
