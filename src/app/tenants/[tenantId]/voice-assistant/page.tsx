"use client";
import Link from "next/link";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PlatformGate } from "@/components/auth/platform-gate";
import { PageHeader } from "@/components/common/page-header";
import { VoiceAssistantAdmin } from "@/components/voice/voice-assistant-admin";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/feedback/states";
import { apiRequest } from "@/lib/api/client";
import { PlatformTenant } from "@/tenancy/types";
export default function TenantVoiceAssistantPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = use(params);
  const tenant = useQuery({
    queryKey: ["platform", "tenant", tenantId],
    queryFn: () => apiRequest<PlatformTenant>(`/tenants/${tenantId}`),
  });
  return (
    <AppShell>
      <PlatformGate>
        {tenant.isLoading ? (
          <LoadingState />
        ) : tenant.isError || !tenant.data ? (
          <ErrorState />
        ) : (
          <div className="space-y-6">
            <Button asChild variant="ghost" size="sm">
              <Link href={`/tenants/${tenantId}`}>
                <ArrowLeft />
                Back to tenant
              </Link>
            </Button>
            <PageHeader
              title="Voice Assistant"
              description={`Configure the website voice widget for ${tenant.data.name}.`}
            />
            <VoiceAssistantAdmin
              tenantId={tenantId}
              tenantName={tenant.data.name}
            />
          </div>
        )}
      </PlatformGate>
    </AppShell>
  );
}
