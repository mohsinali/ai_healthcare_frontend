import { Location, Provider, Service } from "@/clinic/types";
import { Patient } from "@/patients/types";

export type AppointmentStatus =
  "BOOKED" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
export interface AppointmentEvent {
  id: string;
  type: string;
  occurredAt: string;
  metadata?: Record<string, string> | null;
}
export interface Appointment {
  id: string;
  appointmentNumber: string;
  status: AppointmentStatus;
  startAt: string;
  endAt: string;
  localStart: string;
  localEnd: string;
  timezone: string;
  reason: string | null;
  notes: string | null;
  cancellationReason: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  patient: Patient;
  location: Location;
  provider: Provider;
  service: Service;
  events?: AppointmentEvent[];
}
export interface Availability {
  date: string;
  timezone: string;
  durationMinutes: number;
  slotIntervalMinutes: number;
  slots: { start: string; end: string }[];
}
export interface PaginatedAppointments {
  data: Appointment[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
export const appointmentName = (status: AppointmentStatus) =>
  status === "NO_SHOW"
    ? "No Show"
    : `${status[0]}${status.slice(1).toLowerCase()}`;
export const appointmentVariant = (status: AppointmentStatus) =>
  status === "CONFIRMED"
    ? "success"
    : status === "CANCELLED"
      ? "danger"
      : status === "NO_SHOW"
        ? "warning"
        : status === "BOOKED"
          ? "info"
          : "neutral";
export const clinicDateTime = (value: string, zone: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
export const clinicTime = (value: string, zone: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
