import { tenantApiRequest } from "@/lib/api/client";
import type { Faq, FaqFilters, FaqInput, FaqListResponse, FaqStatus } from "./types";

export const faqKeys = {
  all: (tenantId: string) => ["faqs", tenantId] as const,
  list: (tenantId: string, filters: FaqFilters) => ["faqs", tenantId, filters] as const,
  detail: (tenantId: string, faqId: string) => ["faq", tenantId, faqId] as const,
  locations: (tenantId: string) => ["faq-locations", tenantId] as const,
};

export function listFaqs(tenantId: string, filters: FaqFilters) {
  const params = new URLSearchParams({ page: String(filters.page), limit: String(filters.limit ?? 20) });
  if (filters.search) params.set("search", filters.search);
  if (filters.category) params.set("category", filters.category);
  if (filters.status) params.set("status", filters.status);
  if (filters.locationId) params.set("locationId", filters.locationId);
  return tenantApiRequest<FaqListResponse>(`/faqs?${params}`, tenantId);
}
export const getFaq = (tenantId: string, faqId: string) => tenantApiRequest<Faq>(`/faqs/${faqId}`, tenantId);
export const createFaq = (tenantId: string, input: FaqInput) => tenantApiRequest<Faq>("/faqs", tenantId, { method: "POST", body: JSON.stringify(input) });
export const updateFaq = (tenantId: string, faqId: string, input: FaqInput) => tenantApiRequest<Faq>(`/faqs/${faqId}`, tenantId, { method: "PATCH", body: JSON.stringify(input) });
export const updateFaqStatus = (tenantId: string, faqId: string, status: FaqStatus) => tenantApiRequest<Faq>(`/faqs/${faqId}/status`, tenantId, { method: "PATCH", body: JSON.stringify({ status }) });
