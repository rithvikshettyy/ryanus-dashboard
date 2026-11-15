/**
 * Tiny i18n layer (no library). The English text in the code IS the key:
 *   t("Reset")                  -> "रीसेट" when the language is Hindi, "Reset" otherwise
 *   t("{n} trips", { n: 5 })    -> "5 यात्राएँ"
 * Lookup order for Hindi: exact dictionary entry, then PATTERNS (dynamic strings such as "5 min ago"),
 * then the GLOSSARY (names, months), then the English text itself.
 * Only pure functions here, so the same code runs in server components, client components and plain lib code.
 */
import { GLOSSARY, HI, PATTERNS } from "./hi";

export type Lang = "en" | "hi";
export const LANGS: Lang[] = ["en", "hi"];
export const LANG_COOKIE = "lang";
export const DEFAULT_LANG: Lang = "en";

export type TParams = Record<string, string | number>;
export type TFn = (text: string, params?: TParams) => string;

export const isLang = (v: unknown): v is Lang => v === "en" || v === "hi";

const escapeRe = (k: string) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Longest terms first, so "Coal Dumper" wins over "Dumper". Built once, and only when there is something to match.
const GLOSSARY_KEYS = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length);
const GLOSSARY_RE =
  GLOSSARY_KEYS.length > 0
    ? new RegExp(`(?<![\\p{L}\\p{N}])(${GLOSSARY_KEYS.map(escapeRe).join("|")})(?![\\p{L}\\p{N}])`, "gu")
    : null;

function lookupHi(text: string): string {
  const hit = HI[text];
  if (hit !== undefined) return hit;
  for (const [re, tpl] of PATTERNS) {
    const m = re.exec(text);
    if (m) return tpl.replace(/\{(\d)\}/g, (_, i: string) => lookupHi(m[Number(i)] ?? ""));
  }
  return GLOSSARY_RE ? text.replace(GLOSSARY_RE, (m) => GLOSSARY[m] ?? m) : text;
}

function fill(template: string, params: TParams | undefined, lang: Lang): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = params[k];
    if (v === undefined) return `{${k}}`;
    // String params (vehicle names, dates) are translated too; numbers pass through untouched.
    return typeof v === "string" && lang === "hi" ? lookupHi(v) : String(v);
  });
}

export function makeT(lang: Lang): TFn {
  return (text, params) => fill(lang === "hi" ? lookupHi(text) : text, params, lang);
}

/** Locale tags for Intl / date-fns. */
export const LOCALE: Record<Lang, string> = { en: "en-IN", hi: "hi-IN" };
