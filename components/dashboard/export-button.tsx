"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ExportButton({ csv, filename }: { csv: string; filename: string }) {
  function download() {
    // Blob + temporary <a download> link: the standard browser-side file download trick
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported", { description: filename });
  }
  return (
    <Button onClick={download} aria-label="Export CSV" className="h-10 gap-2 px-3 shadow-sm sm:px-4">
      <Download /> <span className="hidden sm:inline">Export CSV</span>
    </Button>
  );
}
