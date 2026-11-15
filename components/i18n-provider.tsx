"use client";

import { createContext, useContext, useMemo } from "react";
import { DEFAULT_LANG, makeT, type Lang, type TFn } from "@/lib/i18n";

interface Ctx {
  lang: Lang;
  t: TFn;
}

const I18nContext = createContext<Ctx>({ lang: DEFAULT_LANG, t: makeT(DEFAULT_LANG) });

/** The root layout reads the cookie on the server and hands the language down, so server and client always agree. */
export function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const value = useMemo(() => ({ lang, t: makeT(lang) }), [lang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useT = () => useContext(I18nContext).t;
export const useLang = () => useContext(I18nContext).lang;

/** <T>Some text</T>: translate a literal inside JSX. Works inside server components too (it is a client leaf). */
export function T({ children, params }: { children: string; params?: Record<string, string | number> }) {
  return <>{useT()(children, params)}</>;
}
