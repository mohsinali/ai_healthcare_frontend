import { PageHeader } from "@/components/common/page-header";
import { AppShell } from "@/components/layout/app-shell";
import { WebVoiceCard } from "@/components/voice/web-voice-card";

export default function VoiceAgentTestPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Voice Agent Test"
          description="Validate the browser connection to the clinic voice assistant."
        />
        <WebVoiceCard />
      </div>
    </AppShell>
  );
}
