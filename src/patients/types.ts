export type PatientStatus = "ACTIVE" | "INACTIVE";
export type PreferredContactMethod = "PHONE" | "EMAIL";
export interface Patient {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  email: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateProvince: string | null;
  postalCode: string | null;
  countryCode: string | null;
  preferredContactMethod: PreferredContactMethod | null;
  status: PatientStatus;
  createdAt: string;
  updatedAt: string;
}
export interface PatientInput {
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  countryCode: string;
  preferredContactMethod: "" | PreferredContactMethod;
}
export interface DuplicateCandidate {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  dateOfBirth: string;
  maskedPhone: string;
  maskedEmail: string | null;
  status: PatientStatus;
}
export interface PaginatedPatients {
  data: Patient[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
export const emptyPatient: PatientInput = {
  firstName: "",
  middleName: "",
  lastName: "",
  dateOfBirth: "",
  phone: "",
  email: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  stateProvince: "",
  postalCode: "",
  countryCode: "",
  preferredContactMethod: "",
};
export const patientName = (
  p: Pick<Patient, "firstName" | "middleName" | "lastName">,
) => [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ");
export const dateOnly = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
export const canEditPatient = (role: string | null) =>
  role === "CLINIC_OWNER" || role === "CLINIC_ADMIN" || role === "RECEPTIONIST";
export const canChangePatientStatus = (role: string | null) =>
  role === "CLINIC_OWNER" || role === "CLINIC_ADMIN";
