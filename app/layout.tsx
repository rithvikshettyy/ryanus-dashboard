import type { Metadata } from "next";
import { Geist, Noto_Sans_Devanagari } from "next/font/google";
import { Toaster } from "sonner";
import { I18nProvider } from "@/components/i18n-provider";
import { getLang, getT } from "@/lib/i18n/server";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
// Geist has no Devanagari glyphs. Latin text and digits stay Geist; Hindi falls through to this font.
const devanagari = Noto_Sans_Devanagari({ variable: "--font-devanagari", subsets: ["devanagari"], display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { default: t("GEOVIA Fleetsched"), template: `%s · ${t("GEOVIA Fleetsched")}` },
    description: t("Mining operations analytics and alerts platform"),
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang(); // cookie set by the language switcher
  return (
    <html lang={lang} className={`${geistSans.variable} ${devanagari.variable} h-full`}>
      <body className="min-h-full">
        <I18nProvider lang={lang}>
          {children}
          <Toaster position="bottom-right" richColors closeButton />
        </I18nProvider>
      </body>
    </html>
  );
}
