export type ConfigStatus = "ACTIVE" | "INACTIVE";
export interface Meta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
export interface Paginated<T> {
  data: T[];
  meta: Meta;
}
export interface BusinessHour {
  id: string;
  dayOfWeek: string;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
}
export interface Location {
  id: string;
  name: string;
  status: ConfigStatus;
  phone: string;
  email: string | null;
  timezone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  stateProvince: string;
  postalCode: string;
  countryCode: string;
  escalationPhoneNumber: string | null;
  businessHours?: BusinessHour[];
  providerCount?: number;
  serviceCount?: number;
  services?: Service[];
  providers?: Provider[];
  createdAt?: string;
  updatedAt?: string;
}
export interface Provider {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  status: ConfigStatus;
  locationCount?: number;
  serviceCount?: number;
  locations?: Location[];
  services?: Service[];
  createdAt?: string;
  updatedAt?: string;
}
export interface Service {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  status: ConfigStatus;
  providerCount?: number;
  locationCount?: number;
  providers?: Provider[];
  locations?: Location[];
  createdAt?: string;
  updatedAt?: string;
}
export const canManage = (role: string | null) =>
  role === "CLINIC_OWNER" || role === "CLINIC_ADMIN";
export const timezoneOptions =
  typeof Intl.supportedValuesOf === "function"
    ? Intl.supportedValuesOf("timeZone")
    : [
        "America/New_York",
        "America/Chicago",
        "America/Denver",
        "America/Los_Angeles",
        "America/Toronto",
        "America/Vancouver",
        "Europe/London",
        "Asia/Karachi",
      ];
