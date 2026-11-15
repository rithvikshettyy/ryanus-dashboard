import { titleMeta } from "@/lib/i18n/server";
import { ModulePage } from "@/components/modules/module-page";
import { SettingsForm } from "@/components/modules/settings-form";

export const generateMetadata = titleMeta("Settings");

export default function SettingsPage() {
  return (
    <ModulePage title="Settings" subtitle="Alert thresholds, notifications and display units">
      <SettingsForm />
    </ModulePage>
  );
}
