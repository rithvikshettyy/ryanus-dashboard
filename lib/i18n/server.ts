import { cookies } from "next/headers";
import { DEFAULT_LANG, LANG_COOKIE, isLang, makeT, type Lang, type TFn } from "./index";

/** Server components: the language comes from the cookie the switcher sets. */
export async function getLang(): Promise<Lang> {
  const v = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(v) ? v : DEFAULT_LANG;
}

export async function getT(): Promise<TFn> {
  return makeT(await getLang());
}

/** One-liner for pages: `export const generateMetadata = titleMeta("Alerts");` */
export function titleMeta(title: string) {
  return async (): Promise<{ title: string }> => ({ title: (await getT())(title) });
}
