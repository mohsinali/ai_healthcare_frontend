import { PatientInput } from "./types";

export type PatientField = keyof PatientInput;
export type PatientFieldErrors = Partial<Record<PatientField, string>>;
export const patientFields = [
  "firstName",
  "middleName",
  "lastName",
  "dateOfBirth",
  "phone",
  "email",
  "addressLine1",
  "addressLine2",
  "city",
  "stateProvince",
  "postalCode",
  "countryCode",
  "preferredContactMethod",
] as const satisfies readonly PatientField[];

export function normalizeInternationalPhone(value: string) {
  return value.trim().replace(/[\s().-]/g, "");
}

export function validatePatient(value: PatientInput): PatientFieldErrors {
  const errors: PatientFieldErrors = {};
  if (!value.firstName.trim()) errors.firstName = "First name is required.";
  else if (value.firstName.trim().length > 80)
    errors.firstName = "First name must be 80 characters or fewer.";
  if (!value.lastName.trim()) errors.lastName = "Last name is required.";
  else if (value.lastName.trim().length > 80)
    errors.lastName = "Last name must be 80 characters or fewer.";
  if (!value.dateOfBirth) errors.dateOfBirth = "Date of birth is required.";
  else if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value.dateOfBirth) ||
    Number.isNaN(new Date(`${value.dateOfBirth}T00:00:00Z`).valueOf()) ||
    new Date(`${value.dateOfBirth}T00:00:00Z`).toISOString().slice(0, 10) !==
      value.dateOfBirth
  )
    errors.dateOfBirth = "Enter a valid date of birth.";
  else if (value.dateOfBirth > new Date().toISOString().slice(0, 10))
    errors.dateOfBirth = "Date of birth cannot be in the future.";
  const phone = normalizeInternationalPhone(value.phone);
  if (!phone) errors.phone = "Phone is required.";
  else if (!/^\+[1-9]\d{7,14}$/.test(phone))
    errors.phone = "Enter a valid international phone number.";
  if (value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email.trim()))
    errors.email = "Enter a valid email address.";
  if (value.countryCode && !/^[A-Za-z]{2}$/.test(value.countryCode.trim()))
    errors.countryCode = "Enter a two-letter country code.";
  if (
    value.preferredContactMethod &&
    !["PHONE", "EMAIL"].includes(value.preferredContactMethod)
  )
    errors.preferredContactMethod = "Select a valid contact method.";
  const limits: Partial<Record<PatientField, number>> = {
    middleName: 80,
    email: 254,
    addressLine1: 160,
    addressLine2: 160,
    city: 100,
    stateProvince: 100,
    postalCode: 24,
  };
  for (const [field, max] of Object.entries(limits) as [PatientField, number][])
    if (String(value[field]).trim().length > max)
      errors[field] = `Must be ${max} characters or fewer.`;
  return errors;
}
