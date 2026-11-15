"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Bot, Search, SendHorizontal, Sparkles, User } from "lucide-react";
import { useLang, useT } from "@/components/i18n-provider";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { applyStatuses, useAlertStatuses } from "@/hooks/use-alert-statuses";
import { alertChunks } from "@/lib/knowledge-alerts";
import { buildIndex, search, type Chunk, type Hit } from "@/lib/rag";
import type { Alert } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Message {
  id: number;
  from: "user" | "bot";
  text?: string; // what the user typed
  kind?: "greeting" | "found" | "none"; // bot messages are translated when shown, so a language switch updates them
  count?: number;
  hits?: Hit[];
}

const SUGGESTIONS = [
  "How many critical alerts are open?",
  "Which trucks have no signal?",
  "Coal Dumper 03 status",
  "Is any maintenance overdue?",
  "Which shipments are delayed?",
  "How is fuel per tonne calculated?",
];

const GREETING: Message = { id: 0, from: "bot", kind: "greeting" };

/**
 * Retrieval chatbot: no external API. Every answer is built from chunks of this site's own data
 * (see lib/knowledge.ts), ranked with BM25 (lib/rag.ts). It quotes the data and links to the page.
 */
export function SupportChat({
  open,
  onOpenChange,
  chunks,
  alerts,
  serverNow,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  chunks: Chunk[];
  alerts: Alert[];
  serverNow: number;
}) {
  const t = useT();
  const lang = useLang();
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(1);

  // Alerts are rebuilt in the browser so answers match what the user acknowledged or resolved.
  const { overrides } = useAlertStatuses();
  const index = useMemo(
    () => buildIndex([...chunks, ...alertChunks(applyStatuses(alerts, overrides), serverNow, t, lang)]),
    [chunks, alerts, overrides, serverNow, t, lang],
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, thinking]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function ask(question: string) {
    const q = question.trim();
    if (!q || thinking) return;
    setMessages((m) => [...m, { id: nextId.current++, from: "user", text: q }]);
    setDraft("");
    setThinking(true);
    // short pause so it feels like a conversation; the search itself is instant
    timer.current = setTimeout(() => {
      const hits = search(index, q);
      const reply: Message = hits.length
        ? {
            id: nextId.current++,
            from: "bot",
            kind: "found",
            count: hits.length,
            hits,
          }
        : { id: nextId.current++, from: "bot", kind: "none" };
      setMessages((m) => [...m, reply]);
      setThinking(false);
    }, 350);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <div className="flex items-center gap-3 border-b px-4 py-3 pr-12">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="size-[18px]" aria-hidden />
          </span>
          <div className="min-w-0">
            <SheetTitle className="text-sm font-semibold">{t("Ask support")}</SheetTitle>
            <SheetDescription className="text-xs">{t("Answers come from this site's data, nothing leaves your browser.")}</SheetDescription>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4" role="log" aria-live="polite" aria-label={t("Conversation")}>
          {messages.map((m) => (
            <div key={m.id} className={cn("flex gap-2.5", m.from === "user" && "flex-row-reverse")}>
              <span
                className={cn(
                  "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                  m.from === "user" ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground",
                )}
                aria-hidden
              >
                {m.from === "user" ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
              </span>
              <div className={cn("min-w-0 max-w-[88%] space-y-2", m.from === "user" && "text-right")}>
                <p
                  className={cn(
                    "inline-block rounded-2xl px-3.5 py-2 text-left text-sm",
                    m.from === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                  )}
                >
                  {m.text ??
                    (m.kind === "greeting"
                      ? t("Hi, I am the Ryanus support assistant. What do you need?")
                      : m.kind === "found"
                        ? m.count === 1
                          ? t("Here is what I found:")
                          : t("I found {n} matching records:", { n: m.count ?? 0 })
                        : t("I could not find that in the site data. Try a truck name (Coal Dumper 03), an alert, a work order such as WO-2411, a shipment, or a topic like fuel per tonne."))}
                </p>
                {m.hits?.map(({ chunk }) => (
                  <div key={chunk.id} className="rounded-xl border bg-card p-3 text-left shadow-xs">
                    <p className="text-sm font-semibold">{chunk.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{chunk.text}</p>
                    <Link
                      href={chunk.href}
                      onClick={() => onOpenChange(false)}
                      className="mt-2 inline-flex h-8 items-center gap-1 rounded-md px-1 text-xs font-medium text-primary hover:underline"
                    >
                      {t("Open in the app")} <ArrowUpRight className="size-3.5" aria-hidden />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {thinking && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Search className="size-3.5 animate-pulse" aria-hidden /> {t("Searching site data…")}
            </p>
          )}

          {messages.length === 1 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(t(s))}
                  className="min-h-9 rounded-full border px-3 py-1.5 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {t(s)}
                </button>
              ))}
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(draft);
          }}
          className="flex items-center gap-2 border-t p-3"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("Ask about alerts, trucks, fuel…")}
            aria-label={t("Your question")}
            className="h-11 min-w-0 flex-1 rounded-xl border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30"
          />
          <button
            type="submit"
            disabled={!draft.trim() || thinking}
            aria-label={t("Send")}
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
          >
            <SendHorizontal className="size-[18px]" aria-hidden />
          </button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
