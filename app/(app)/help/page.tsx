import type { Metadata } from "next";
import { connection } from "next/server";
import { ModulePage } from "@/components/modules/module-page";
import { HelpCenter } from "@/components/modules/help-center";
import { currentTime, loadAlerts } from "@/lib/alerts";
import { buildKnowledge } from "@/lib/knowledge";

export const metadata: Metadata = { title: "Help & support" };

export default async function HelpPage() {
  await connection(); // real request time, not build time
  const now = currentTime();
  return (
    <ModulePage title="Help & support" subtitle="Guides, answers and how to reach the control room">
      <HelpCenter chunks={buildKnowledge(now)} alerts={loadAlerts(now)} serverNow={now} />
    </ModulePage>
  );
}
