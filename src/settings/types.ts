export type DateFormat = "MM_DD_YYYY" | "DD_MM_YYYY" | "YYYY_MM_DD";
export interface TenantSettings {
  dateFormat: DateFormat;
  timezone: string;
}
export const dateFormatOptions: { value: DateFormat; label: string }[] = [
  { value: "MM_DD_YYYY", label: "MM/DD/YYYY" },
  { value: "DD_MM_YYYY", label: "DD/MM/YYYY" },
  { value: "YYYY_MM_DD", label: "YYYY-MM-DD" },
];
