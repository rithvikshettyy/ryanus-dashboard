"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useT } from "@/components/i18n-provider";
import { SidebarContent } from "./sidebar-content";

export function MobileNav() {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="outline" size="icon" className="size-10 md:hidden" aria-label={t("Open navigation")} />}
      >
        <Menu />
      </SheetTrigger>
      <SheetContent side="left" showCloseButton={false} className="w-72 gap-0 p-0 sm:max-w-72">
        <SheetTitle className="sr-only">{t("Navigation")}</SheetTitle>
        <SheetDescription className="sr-only">{t("Main navigation menu")}</SheetDescription>
        <SidebarContent onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
