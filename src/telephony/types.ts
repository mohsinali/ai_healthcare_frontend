import type { Paginated } from "@/clinic/types";

export type TelephonyProvider = "TWILIO";
export type TelephonyNumberStatus = "ACTIVE" | "INACTIVE";
export interface TelephonyLocation {
  id: string;
  locationNumber: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
}
export interface TelephonyNumber {
  id: string;
  locationId: string | null;
  location: TelephonyLocation | null;
  phoneNumber: string;
  provider: TelephonyProvider;
  providerPhoneNumberId: string | null;
  status: TelephonyNumberStatus;
  createdAt: string;
  updatedAt: string;
}
export interface TelephonyNumberInput {
  locationId: string | null;
  phoneNumber: string;
  provider: TelephonyProvider;
  providerPhoneNumberId: string | null;
}
export interface TelephonyFilters {
  page: number;
  limit?: number;
  search?: string;
  status?: TelephonyNumberStatus;
  locationId?: string;
}
export type TelephonyListResponse = Paginated<TelephonyNumber>;
