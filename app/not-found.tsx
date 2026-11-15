import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Page not found") };
}

/**
 * 404 page built around public/404page.jpg. The picture is cropped to just the artwork
 * (public/404-illustration.jpg) so the message below it can be real, selectable text
 * with working links instead of pixels baked into the image.
 */
export default async function NotFound() {
  const t = await getT();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-10 text-center text-[#222]">
      <Image
        src="/404-illustration.jpg"
        alt={t("A man hides behind a newspaper headlined “Oh no! It’s”, standing between a 4 and a 4 so the three shapes read 404.")}
        width={785}
        height={445}
        priority
        className="h-auto w-full max-w-[760px]"
      />

      <h1 className="mt-8 text-xl font-medium sm:text-2xl">{t("We are sorry, but the page you are looking for can not be found.")}</h1>
      <p className="mt-4 text-sm text-[#555] sm:text-base">
        {t("You might try searching our site or visit the")}{" "}
        <Link href="/dashboard" className="font-semibold text-primary underline underline-offset-2 hover:opacity-80">
          {t("homepage")}
        </Link>
        .
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex h-11 items-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          {t("Back to dashboard")}
        </Link>
        <Link href="/help" className="inline-flex h-11 items-center rounded-lg border px-5 text-sm font-medium transition-colors hover:bg-muted">
          {t("Help & support")}
        </Link>
      </div>
    </main>
  );
}
