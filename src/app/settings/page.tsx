import { PageHeader } from "@/components/common/page-header";
import { AppShell } from "@/components/layout/app-shell";
import { SettingsForm } from "@/components/settings/settings-form";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader title="Settings" description="Manage tenant-wide configuration." />
        <SettingsForm />
      </div>
    </AppShell>
  );
}
