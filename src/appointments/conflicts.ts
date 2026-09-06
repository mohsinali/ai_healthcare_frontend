import { ApiError } from "@/lib/api/client";
import { apiErrorBody } from "@/lib/api/errors";

export function isAppointmentSlotConflict(error: unknown) {
  return (
    error instanceof ApiError &&
    error.status === 409 &&
    apiErrorBody(error)?.code === "APPOINTMENT_SLOT_NO_LONGER_AVAILABLE"
  );
}
