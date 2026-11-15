import type { Metadata } from "next";
import { ModulePage } from "@/components/modules/module-page";
import { SettingsForm } from "@/components/modules/settings-form";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <ModulePage title="Settings" subtitle="Alert thresholds, notifications and display units">
      <SettingsForm />
    </ModulePage>
  );
}
