import { notFound } from "next/navigation";
import { PageHeader } from "@/components/common/page-header";
import { AppShell } from "@/components/layout/app-shell";
import { ElevenLabsWidgetSpike } from "@/components/voice/elevenlabs-widget-spike";

export default function ElevenLabsWidgetSpikePage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="ElevenLabs Widget Spike"
          description="Development-only signed-session compatibility test."
        />
        <ElevenLabsWidgetSpike />
      </div>
    </AppShell>
  );
}
