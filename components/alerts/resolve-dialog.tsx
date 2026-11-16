"use client";

import { useState } from "react";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { Alert } from "@/lib/types";
import { cn } from "@/lib/utils";

/** One tap each: a Critical alert cannot be closed without saying why (audit trail). */
export const RESOLVE_REASONS = ["Fixed on site", "Operator corrected", "False alarm", "Equipment replaced"] as const;
export type ResolveReason = (typeof RESOLVE_REASONS)[number];

export function ResolveDialog({
  alert,
  onCancel,
  onConfirm,
}: {
  alert: Alert | null;
  onCancel: () => void;
  onConfirm: (a: Alert, reason: ResolveReason) => void;
}) {
  const t = useT();
  const [reason, setReason] = useState<ResolveReason | null>(null);

  return (
    <Dialog
      open={alert !== null}
      onOpenChange={(o) => {
        if (!o) {
          setReason(null);
          onCancel();
        }
      }}
    >
      <DialogContent>
        {alert && (
          <>
            <DialogTitle>{t("Resolve {name}?", { name: alert.equipmentName })}</DialogTitle>
            <DialogDescription>{t("Critical alerts need a reason. Pick one.")}</DialogDescription>
            <div role="group" aria-label={t("Resolution reason")} className="mt-4 grid grid-cols-2 gap-2">
              {RESOLVE_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={reason === r}
                  onClick={() => setReason(r)}
                  className={cn(
                    "min-h-10 rounded-lg border px-3 text-sm font-medium transition-colors",
                    reason === r ? "border-foreground bg-foreground text-background" : "border-input bg-card hover:bg-muted",
                  )}
                >
                  {t(r)}
                </button>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" className="h-10" onClick={() => { setReason(null); onCancel(); }}>
                {t("Cancel")}
              </Button>
              <Button
                className="h-10"
                disabled={!reason}
                onClick={() => {
                  if (!reason) return;
                  onConfirm(alert, reason);
                  setReason(null);
                }}
              >
                {t("Resolve")}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
