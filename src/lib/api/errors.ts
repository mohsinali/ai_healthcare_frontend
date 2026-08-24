import { ApiError } from "./client";

export interface ApiFieldError {
  field: string;
  message: string;
}
export interface ApiErrorBody {
  statusCode?: number;
  message?: string | string[];
  errors?: ApiFieldError[];
  code?: string;
  candidates?: unknown[];
}

export function apiErrorBody(error: unknown): ApiErrorBody | undefined {
  if (
    !(error instanceof ApiError) ||
    !error.details ||
    typeof error.details !== "object"
  )
    return undefined;
  return error.details as ApiErrorBody;
}

export function mapApiFieldErrors<Field extends string>(
  error: unknown,
  fields: readonly Field[],
) {
  const allowed = new Set<string>(fields);
  const mapped: Partial<Record<Field, string>> = {};
  for (const item of apiErrorBody(error)?.errors ?? []) {
    if (allowed.has(item.field) && !mapped[item.field as Field])
      mapped[item.field as Field] = item.message;
  }
  return mapped;
}
