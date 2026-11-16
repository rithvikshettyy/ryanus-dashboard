"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { useLang, useT } from "@/components/i18n-provider";
import { LANG_COOKIE, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Lang; label: string }[] = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिन्दी" },
];

/** Writes the cookie the server reads, then re-fetches the page so every server component re-renders in the new language. */
export function useSetLang() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const set = (lang: Lang) => {
    document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = lang;
    startTransition(() => router.refresh());
  };
  return { set, pending };
}

/** variant "segmented": two-button switch (sidebar, settings). variant "icon": one button that flips language (header). */
export function LanguageSwitcher({ variant = "segmented", className }: { variant?: "segmented" | "icon"; className?: string }) {
  const lang = useLang();
  const t = useT();
  const { set, pending } = useSetLang();

  if (variant === "icon") {
    const next = OPTIONS.find((o) => o.value !== lang)!;
    return (
      <button
        type="button"
        onClick={() => set(next.value)}
        disabled={pending}
        aria-label={t("Switch language")}
        title={t("Switch language")}
        className={cn(
          "flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border bg-card px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-70",
          className,
        )}
      >
        <Languages className="size-[18px]" aria-hidden />
        <span lang={next.value}>{next.label}</span>
      </button>
    );
  }

  return (
    <div role="group" aria-label={t("Language")} className={cn("grid grid-cols-2 gap-1 rounded-xl bg-muted p-1", className)}>
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          lang={o.value}
          aria-pressed={lang === o.value}
          disabled={pending}
          onClick={() => lang !== o.value && set(o.value)}
          className={cn(
            "flex h-10 items-center justify-center rounded-lg text-sm font-medium transition-[color,background-color,border-color,box-shadow,transform,opacity]",
            lang === o.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
