import type { Paginated } from "@/clinic/types";

export const FAQ_CATEGORIES = [
  "GENERAL", "HOURS", "LOCATION", "PARKING", "APPOINTMENTS", "INSURANCE",
  "PAYMENTS", "SERVICES", "PREPARATION", "POLICIES", "ACCESSIBILITY", "OTHER",
] as const;
export type FaqCategory = (typeof FAQ_CATEGORIES)[number];
export type FaqStatus = "ACTIVE" | "INACTIVE";

export const FAQ_CATEGORY_LABELS: Record<FaqCategory, string> = {
  GENERAL: "General", HOURS: "Hours", LOCATION: "Location", PARKING: "Parking",
  APPOINTMENTS: "Appointments", INSURANCE: "Insurance", PAYMENTS: "Payments",
  SERVICES: "Services", PREPARATION: "Preparation", POLICIES: "Policies",
  ACCESSIBILITY: "Accessibility", OTHER: "Other",
};

export interface FaqLocation {
  id: string;
  locationNumber: string;
  name: string;
}
export interface Faq {
  id: string;
  faqNumber: string;
  locationId: string | null;
  location: FaqLocation | null;
  category: FaqCategory;
  question: string;
  answer: string;
  keywords: string[];
  status: FaqStatus;
  createdAt: string;
  updatedAt: string;
}
export type FaqListResponse = Paginated<Faq>;
export interface FaqInput {
  category: FaqCategory;
  locationId: string | null;
  question: string;
  answer: string;
  keywords: string[];
}
export interface FaqFilters {
  page: number;
  limit?: number;
  search?: string;
  category?: FaqCategory;
  status?: FaqStatus;
  locationId?: string;
}
