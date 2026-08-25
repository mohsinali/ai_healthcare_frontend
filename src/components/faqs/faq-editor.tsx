"use client";
/* eslint-disable react-hooks/set-state-in-effect -- server data initializes an editable draft */
import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { LoadingState } from "@/components/feedback/states";
import { Button } from "@/components/ui/button";
import type { Location, Paginated } from "@/clinic/types";
import { mapApiFieldErrors } from "@/lib/api/errors";
import { tenantApiRequest } from "@/lib/api/client";
import { useTenant } from "@/tenancy/tenant-provider";
import { createFaq, faqKeys, getFaq, updateFaq } from "@/faqs/api";
import { FaqInput } from "@/faqs/types";
import { FaqForm, FaqFormErrors, validateFaqForm } from "./faq-form";

const initial: FaqInput = { category: "GENERAL", locationId: null, question: "", answer: "", keywords: [] };
const fields = ["category", "locationId", "question", "answer", "keywords"] as const;
export function FaqEditor({ faqId }: { faqId?: string }) {
  const tenant = useTenant(); const tenantId = tenant.currentTenant?.id ?? ""; const router = useRouter(); const client = useQueryClient();
  const [form, setForm] = useState<FaqInput>(initial); const [errors, setErrors] = useState<FaqFormErrors>({}); const [saveError, setSaveError] = useState<string>();
  const detail = useQuery({ queryKey: faqKeys.detail(tenantId, faqId ?? "new"), queryFn: () => getFaq(tenantId, faqId!), enabled: Boolean(faqId && tenantId), meta: { tenantScoped: true } });
  const locations = useQuery({ queryKey: faqKeys.locations(tenantId), queryFn: () => tenantApiRequest<Paginated<Location>>("/locations?page=1&limit=100", tenantId), enabled: Boolean(tenantId), meta: { tenantScoped: true } });
  useEffect(() => { if (detail.data) setForm({ category: detail.data.category, locationId: detail.data.locationId, question: detail.data.question, answer: detail.data.answer, keywords: detail.data.keywords }); }, [detail.data]);
  const mutation = useMutation({ mutationFn: () => faqId ? updateFaq(tenantId, faqId, form) : createFaq(tenantId, form), onSuccess: async (faq) => { client.setQueryData(faqKeys.detail(tenantId, faq.id), faq); await client.invalidateQueries({ queryKey: faqKeys.all(tenantId) }); router.push(`/knowledge-base/${faq.id}`); }, onError: (error) => { const mapped = mapApiFieldErrors(error, fields); if (Object.keys(mapped).length) setErrors(mapped); else setSaveError("Unable to save FAQ. Please try again."); } });
  function submit() { const next = validateFaqForm(form); setErrors(next); setSaveError(undefined); if (!Object.keys(next).length && !mutation.isPending) mutation.mutate(); }
  if ((faqId && detail.isLoading) || locations.isLoading) return <AppShell><LoadingState /></AppShell>;
  if ((faqId && detail.isError) || locations.isError) return <AppShell><EditorError faqId={faqId} /></AppShell>;
  return <AppShell><div className="space-y-6"><Button asChild variant="ghost" size="sm"><Link href={faqId ? `/knowledge-base/${faqId}` : "/knowledge-base"}><ArrowLeft />{faqId ? "Back to FAQ" : "Back to Knowledge Base"}</Link></Button><PageHeader title={faqId ? "Edit FAQ" : "Add FAQ"} description={faqId ? `Update ${detail.data?.faqNumber ?? "this Knowledge Base entry"}.` : "Add a clinic-approved answer to the Knowledge Base."} />{saveError && <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{saveError}</div>}<FaqForm mode={faqId ? "edit" : "create"} value={form} locations={locations.data?.data ?? []} errors={errors} isSubmitting={mutation.isPending} onChange={(next) => { setForm(next); setErrors({}); setSaveError(undefined); }} onSubmit={submit} cancelHref={faqId ? `/knowledge-base/${faqId}` : "/knowledge-base"} /></div></AppShell>;
}
function EditorError({ faqId }: { faqId?: string }) { return <div className="p-6 text-center"><h2 className="font-semibold">{faqId ? "Unable to Load FAQ" : "Unable to Load Locations"}</h2><p className="mt-1 text-sm text-muted-foreground">Please return to the Knowledge Base and try again.</p></div>; }
