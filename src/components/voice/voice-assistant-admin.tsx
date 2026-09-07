"use client";
/* eslint-disable react-hooks/set-state-in-effect -- server data initializes an editable draft */
import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clipboard, Plus, Save, Trash2 } from "lucide-react";
import { tenantApiRequest } from "@/lib/api/client";
import { mapApiFieldErrors } from "@/lib/api/errors";
import { Location, Paginated } from "@/clinic/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/feedback/states";
import { StatusBadge } from "@/components/common/status-badge";
import {
  canonicalizeOrigin,
  ChannelList,
  configuredLoaderBase,
  installationSnippet,
  validateWebsiteOrigin,
  WebVoiceChannel,
} from "@/voice/admin";

export function VoiceAssistantAdmin({
  tenantId,
  tenantName,
}: {
  tenantId: string;
  tenantName: string;
}) {
  const client = useQueryClient();
  const [origins, setOrigins] = useState<string[]>([]);
  const [locationId, setLocationId] = useState("");
  const [newOrigin, setNewOrigin] = useState("");
  const [originError, setOriginError] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState<"key" | "snippet" | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [localBase, setLocalBase] = useState<string | null>(null);
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && typeof window !== "undefined")
      setLocalBase(window.location.origin);
  }, []);
  const channels = useQuery({
    queryKey: ["web-voice-channels", tenantId],
    queryFn: () =>
      tenantApiRequest<ChannelList>(
        "/web-voice-channels?page=1&limit=20",
        tenantId,
      ),
    enabled: Boolean(tenantId),
    meta: { tenantScoped: true },
  });
  const locations = useQuery({
    queryKey: ["locations", tenantId, "voice-active"],
    queryFn: () =>
      tenantApiRequest<Paginated<Location>>(
        "/web-voice-channels/locations?page=1&limit=100",
        tenantId,
      ),
    enabled: Boolean(tenantId),
    meta: { tenantScoped: true },
  });
  const channel =
    channels.data?.data.find((item) => item.id === selectedChannelId) ??
    channels.data?.data[0];
  useEffect(() => {
    if (channel) {
      setSelectedChannelId(channel.id);
      setOrigins(channel.allowedOrigins);
      setLocationId(channel.locationId ?? "");
    }
  }, [channel]);
  const updateCache = (value: WebVoiceChannel) => {
    client.setQueryData<ChannelList>(["web-voice-channels", tenantId], (old) =>
      old
        ? { ...old, data: old.data.map((x) => (x.id === value.id ? value : x)) }
        : old,
    );
    setOrigins(value.allowedOrigins);
    setLocationId(value.locationId ?? "");
  };
  const create = useMutation({
    mutationFn: () =>
      tenantApiRequest<WebVoiceChannel>("/web-voice-channels", tenantId, {
        method: "POST",
        body: JSON.stringify({
          locationId: locationId || null,
          allowedOrigins: origins,
        }),
      }),
    onSuccess: async () => {
      setMessage("Web voice channel created.");
      await client.invalidateQueries({
        queryKey: ["web-voice-channels", tenantId],
      });
    },
  });
  const save = useMutation({
    mutationFn: () =>
      tenantApiRequest<WebVoiceChannel>(
        `/web-voice-channels/${channel!.id}`,
        tenantId,
        {
          method: "PATCH",
          body: JSON.stringify({
            locationId: locationId || null,
            allowedOrigins: origins,
          }),
        },
      ),
    onSuccess: (value) => {
      updateCache(value);
      setMessage("Channel configuration saved.");
    },
  });
  const toggle = useMutation({
    mutationFn: () =>
      tenantApiRequest<WebVoiceChannel>(
        `/web-voice-channels/${channel!.id}/status`,
        tenantId,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: channel!.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
          }),
        },
      ),
    onSuccess: (value) => {
      updateCache(value);
      setMessage(
        value.status === "ACTIVE" ? "Channel enabled." : "Channel disabled.",
      );
    },
  });
  const dirty =
    channel != null &&
    (locationId !== (channel.locationId ?? "") ||
      JSON.stringify(origins) !== JSON.stringify(channel.allowedOrigins));
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const loaderBase = configuredLoaderBase() ?? localBase;
  const ready =
    channel?.status === "ACTIVE" &&
    Boolean(channel.locationId) &&
    channel.allowedOrigins.length > 0;
  const snippet =
    loaderBase && channel?.publicWidgetKey
      ? installationSnippet(loaderBase, channel.publicWidgetKey)
      : null;
  const fieldErrors = mapApiFieldErrors(save.error ?? create.error, [
    "locationId",
    "allowedOrigins",
  ] as const);
  const readiness = !channel
    ? "No channel"
    : channel.status !== "ACTIVE"
      ? "Disabled"
      : !channel.locationId
        ? "Missing location"
        : !channel.allowedOrigins.length
          ? "No allowed origins"
          : "Active and ready";
  function addOrigin(event: FormEvent) {
    event.preventDefault();
    const error = validateWebsiteOrigin(newOrigin);
    if (error) return setOriginError(error);
    const value = canonicalizeOrigin(newOrigin);
    if (origins.includes(value))
      return setOriginError("This origin is already listed.");
    setOrigins((items) => [...items, value]);
    setNewOrigin("");
    setOriginError("");
    setMessage("");
  }
  async function copy(value: string, kind: "key" | "snippet") {
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1800);
  }
  if (channels.isLoading || locations.isLoading) return <LoadingState />;
  if (channels.isError || locations.isError) return <ErrorState />;
  if (!channel)
    return (
      <Card>
        <EmptyState
          title="No Web Voice Channel"
          description={`Create the first website voice channel for ${tenantName}. CareFlow operations will configure it with an empty origin allowlist initially.`}
          action={
            <Button loading={create.isPending} onClick={() => create.mutate()}>
              <Plus />
              Create Web Voice Channel
            </Button>
          }
        />
        {create.error && (
          <p className="pb-5 text-center text-sm text-destructive">
            Unable to create the channel. Check the configuration and try again.
          </p>
        )}
      </Card>
    );
  return (
    <div className="space-y-6">
      {(channels.data?.data.length ?? 0) > 1 && (
        <div className="max-w-md space-y-2">
          <Label htmlFor="web-voice-channel">Web voice channel</Label>
          <select
            id="web-voice-channel"
            value={channel.id}
            onChange={(event) => {
              if (dirty && !window.confirm("Discard unsaved channel changes?"))
                return;
              setSelectedChannelId(event.target.value);
            }}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            {channels.data!.data.map((item, index) => (
              <option key={item.id} value={item.id}>
                Website widget {index + 1} —{" "}
                {item.location?.name ?? "No location"}
              </option>
            ))}
          </select>
        </div>
      )}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Channel overview</CardTitle>
            <StatusBadge
              variant={
                ready
                  ? "success"
                  : channel.status === "INACTIVE"
                    ? "neutral"
                    : "warning"
              }
            >
              {readiness}
            </StatusBadge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Channel" value="Web voice" />
          <Info label="Type" value="Website widget" />
          <Info label="Tenant" value={tenantName} />
          <Info
            label="Location"
            value={channel.location?.name ?? "Not selected"}
          />
        </CardContent>
      </Card>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Channel configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="voice-location">Clinic location</Label>
                <select
                  id="voice-location"
                  value={locationId}
                  onChange={(e) => {
                    setLocationId(e.target.value);
                    setMessage("");
                  }}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="">No default location</option>
                  {locations.data?.data.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name} ({x.locationNumber})
                    </option>
                  ))}
                </select>
                {!locations.data?.data.length && (
                  <p className="text-sm text-warning">
                    This tenant has no active locations. Create or activate a
                    location before installation.
                  </p>
                )}
                {fieldErrors.locationId && (
                  <p className="text-sm text-destructive">
                    {fieldErrors.locationId}
                  </p>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <Label>Allowed website origins</Label>
                  <p className="text-sm text-muted-foreground">
                    Use only scheme://hostname[:port]. Paths, credentials,
                    queries, fragments, and wildcards are not allowed.
                  </p>
                </div>
                <form
                  className="flex flex-col gap-2 sm:flex-row"
                  onSubmit={addOrigin}
                >
                  <Input
                    aria-label="Website origin"
                    value={newOrigin}
                    onChange={(e) => setNewOrigin(e.target.value)}
                    placeholder="https://clinic.example"
                    aria-invalid={Boolean(originError)}
                  />
                  <Button type="submit" variant="outline">
                    <Plus />
                    Add origin
                  </Button>
                </form>
                {originError && (
                  <p role="alert" className="text-sm text-destructive">
                    {originError}
                  </p>
                )}
                <div className="space-y-2">
                  {origins.map((origin) => (
                    <div
                      key={origin}
                      className="flex items-center justify-between gap-3 rounded-md border p-3"
                    >
                      <code className="break-all text-xs">{origin}</code>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Remove ${origin}`}
                        onClick={() => {
                          setOrigins((x) =>
                            x.filter((item) => item !== origin),
                          );
                          setMessage("");
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ))}
                </div>
                {!origins.length && (
                  <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                    An empty allowlist blocks all external embedding.
                  </p>
                )}
                {fieldErrors.allowedOrigins && (
                  <p className="text-sm text-destructive">
                    {fieldErrors.allowedOrigins}
                  </p>
                )}
              </div>
              {save.error && (
                <p role="alert" className="text-sm text-destructive">
                  Unable to save this configuration. Review the fields and try
                  again.
                </p>
              )}
              {message && (
                <p role="status" className="text-sm text-emerald-700">
                  {message}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => save.mutate()}
                  disabled={!dirty || save.isPending}
                >
                  <Save />
                  {save.isPending ? "Saving…" : "Save changes"}
                </Button>
                <Button
                  variant="outline"
                  disabled={!dirty || save.isPending}
                  onClick={() => {
                    setOrigins(channel.allowedOrigins);
                    setLocationId(channel.locationId ?? "");
                    setOriginError("");
                  }}
                >
                  Cancel changes
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Installation snippet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!snippet ? (
                <p className="text-sm text-destructive">
                  A valid public widget-loader base URL and widget key are
                  required before the snippet can be generated.
                </p>
              ) : (
                <>
                  <pre className="overflow-x-auto rounded-md bg-slate-950 p-4 text-xs text-slate-50">
                    <code>{snippet}</code>
                  </pre>
                  <Button
                    variant="outline"
                    onClick={() => copy(snippet, "snippet")}
                  >
                    <Clipboard />
                    {copied === "snippet" ? "Copied" : "Copy script"}
                  </Button>
                </>
              )}
              {!ready && (
                <p className="text-sm text-warning">
                  Finish the location, origins, and channel status configuration
                  before installing.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Channel status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {channel.status === "ACTIVE"
                  ? "Enabled and accepting new widget conversations when configuration is ready."
                  : "Disabled. The widget cannot start new conversations."}
              </p>
              <Button
                variant={
                  channel.status === "ACTIVE" ? "destructive" : "default"
                }
                loading={toggle.isPending}
                onClick={() => {
                  if (
                    channel.status === "ACTIVE" &&
                    !window.confirm(
                      "Disable this channel? The widget will stop starting new conversations.",
                    )
                  )
                    return;
                  toggle.mutate();
                }}
              >
                {channel.status === "ACTIVE"
                  ? "Disable channel"
                  : "Enable channel"}
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Public widget key</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <code className="block break-all rounded-md bg-muted p-3 text-xs">
                {channel.publicWidgetKey}
              </code>
              <Button
                variant="outline"
                onClick={() => copy(channel.publicWidgetKey, "key")}
              >
                <Clipboard />
                {copied === "key" ? "Copied" : "Copy key"}
              </Button>
              <p className="text-xs text-muted-foreground">
                This public identifier selects the channel; origin authorization
                still applies. It is not an ElevenLabs API key or CareFlow
                gateway credential.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Install and test</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ol className="list-decimal space-y-2 pl-5">
                <li>
                  Configure every legitimate client website origin and save.
                </li>
                <li>
                  Copy the script and install it—or provide it to the
                  client&apos;s website administrator—before the closing
                  &lt;/body&gt; tag.
                </li>
                <li>Publish the clinic website.</li>
                <li>Start the assistant on the published site.</li>
                <li>
                  Test a clinic-information request and a backend tool
                  operation.
                </li>
              </ol>
              <p className="text-xs text-muted-foreground">
                www and non-www, HTTP and HTTPS, and different ports are
                distinct origins. Never enter paths. The clinic site needs no
                CareFlow admin login. The widget key is safe to publish; private
                credentials are not.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Troubleshooting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                <b>Widget unavailable:</b> confirm the script URL and service
                availability.
              </p>
              <p>
                <b>Origin not authorized:</b> add the exact published origin.
              </p>
              <p>
                <b>Channel disabled:</b> enable it above.
              </p>
              <p>
                <b>Missing location:</b> choose an active clinic location.
              </p>
              <p>
                <b>Invalid installation URL:</b> configure a valid public loader
                origin.
              </p>
              <p>
                <b>Backend unavailable:</b> retry after service is restored.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
