import { tenantApiRequest } from "@/lib/api/client";
import type {
  TelephonyFilters,
  TelephonyListResponse,
  TelephonyNumber,
  TelephonyNumberInput,
  TelephonyNumberStatus,
} from "./types";

export const telephonyKeys = {
  all: (tenantId: string) => ["telephony-numbers", tenantId] as const,
  list: (tenantId: string, filters: TelephonyFilters) =>
    ["telephony-numbers", tenantId, filters] as const,
  detail: (tenantId: string, id: string) =>
    ["telephony-number", tenantId, id] as const,
  locations: (tenantId: string) => ["telephony-locations", tenantId] as const,
};
export function listTelephonyNumbers(
  tenantId: string,
  filters: TelephonyFilters,
) {
  const params = new URLSearchParams({
    page: String(filters.page),
    limit: String(filters.limit ?? 20),
  });
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.locationId) params.set("locationId", filters.locationId);
  return tenantApiRequest<TelephonyListResponse>(
    `/telephony-numbers?${params}`,
    tenantId,
  );
}
export const getTelephonyNumber = (tenantId: string, id: string) =>
  tenantApiRequest<TelephonyNumber>(`/telephony-numbers/${id}`, tenantId);
export const createTelephonyNumber = (
  tenantId: string,
  input: TelephonyNumberInput,
) =>
  tenantApiRequest<TelephonyNumber>("/telephony-numbers", tenantId, {
    method: "POST",
    body: JSON.stringify(input),
  });
export const updateTelephonyNumber = (
  tenantId: string,
  id: string,
  input: TelephonyNumberInput,
) =>
  tenantApiRequest<TelephonyNumber>(`/telephony-numbers/${id}`, tenantId, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
export const updateTelephonyNumberStatus = (
  tenantId: string,
  id: string,
  status: TelephonyNumberStatus,
) =>
  tenantApiRequest<TelephonyNumber>(
    `/telephony-numbers/${id}/status`,
    tenantId,
    { method: "PATCH", body: JSON.stringify({ status }) },
  );
