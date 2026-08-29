"use client";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Power } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { LoadingState } from "@/components/feedback/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { canManage } from "@/clinic/types";
import { ApiError } from "@/lib/api/client";
import { useTenant } from "@/tenancy/tenant-provider";
import { faqKeys, getFaq, updateFaqStatus } from "@/faqs/api";
import { FAQ_CATEGORY_LABELS } from "@/faqs/types";

export function FaqDetail({ faqId }: { faqId: string }) {
  const tenant = useTenant(); const tenantId = tenant.currentTenant?.id ?? ""; const client = useQueryClient(); const editable = canManage(tenant.tenantRole);
  const query = useQuery({ queryKey: faqKeys.detail(tenantId, faqId), queryFn: () => getFaq(tenantId, faqId), enabled: Boolean(tenantId), meta: { tenantScoped: true } });
  const mutation = useMutation({ mutationFn: (status: "ACTIVE" | "INACTIVE") => updateFaqStatus(tenantId, faqId, status), onSuccess: async (faq) => { client.setQueryData(faqKeys.detail(tenantId, faqId), faq); await client.invalidateQueries({ queryKey: faqKeys.all(tenantId) }); } });
  if (query.isLoading) return <AppShell><LoadingState /></AppShell>;
  if (query.isError) {
    const status = query.error instanceof ApiError ? query.error.status : 0;
    const description = status === 404
      ? "This FAQ does not exist or is not available in the current clinic."
      : status === 403
        ? "You do not have permission to view this FAQ."
        : "Something went wrong while loading this FAQ.";
    return <AppShell><State description={description} /></AppShell>;
  }
  const faq = query.data;
  if (!faq) return <AppShell><State description="Something went wrong while loading this FAQ." /></AppShell>;
  return <AppShell><div className="space-y-6"><nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted-foreground"><Link href="/knowledge-base" className="hover:text-foreground">Knowledge Base</Link><span>/</span><span className="text-foreground">{faq.faqNumber}</span></nav><PageHeader title={faq.faqNumber} description="Knowledge Base Entry" actions={editable ? <div className="flex flex-wrap gap-2"><Button asChild><Link href={`/knowledge-base/${faqId}/edit`}><Pencil />Edit FAQ</Link></Button><Button variant="outline" disabled={mutation.isPending} onClick={() => { const next = faq.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"; if (next === "ACTIVE" || window.confirm("Deactivate FAQ? This FAQ will be marked inactive and excluded from future automated retrieval.")) mutation.mutate(next); }}><Power />{mutation.isPending ? "Updating…" : faq.status === "ACTIVE" ? "Deactivate FAQ" : "Activate FAQ"}</Button></div> : undefined} /><div className="flex items-center gap-3"><StatusBadge variant={faq.status === "ACTIVE" ? "success" : "neutral"}>{faq.status === "ACTIVE" ? "Active" : "Inactive"}</StatusBadge><span className="text-sm text-muted-foreground">{FAQ_CATEGORY_LABELS[faq.category]} · {faq.location?.name ?? "All Locations"}</span></div><Card><CardHeader><CardTitle className="text-xl leading-relaxed">{faq.question}</CardTitle></CardHeader><CardContent><p className="whitespace-pre-wrap text-sm leading-7">{faq.answer}</p></CardContent></Card><div className="grid gap-4 lg:grid-cols-2"><Section title="Entry Details"><dl className="grid gap-4 sm:grid-cols-2"><Detail label="Category" value={FAQ_CATEGORY_LABELS[faq.category]} /><Detail label="Scope" value={faq.location?.name ?? "All Locations"} /></dl></Section><Section title="Keywords">{faq.keywords.length ? <div className="flex flex-wrap gap-2">{faq.keywords.map((x) => <span key={x} className="rounded-md bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">{x}</span>)}</div> : <p className="text-sm text-muted-foreground">No keywords</p>}</Section><Section title="Record Information"><dl className="grid gap-4 sm:grid-cols-2"><Detail label="Created" value={formatDateTime(faq.createdAt)} /><Detail label="Updated" value={formatDateTime(faq.updatedAt)} /></dl></Section></div><Button asChild variant="ghost" size="sm"><Link href="/knowledge-base"><ArrowLeft />Back to Knowledge Base</Link></Button></div></AppShell>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent>{children}</CardContent></Card>; }
function Detail({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-medium text-muted-foreground">{label}</dt><dd className="mt-1 text-sm">{value}</dd></div>; }
function State({ description }: { description: string }) { return <div className="space-y-6"><nav aria-label="Breadcrumb" className="text-sm text-muted-foreground"><Link href="/knowledge-base" className="hover:text-foreground">Knowledge Base</Link></nav><div className="p-8 text-center"><h1 className="text-xl font-semibold">Unable to Load FAQ</h1><p className="mt-2 text-sm text-muted-foreground">{description}</p><Button asChild variant="outline" className="mt-5"><Link href="/knowledge-base">Back to Knowledge Base</Link></Button></div></div>; }
function formatDateTime(value: string) { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
