"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { LoadingState } from "@/components/feedback/states";
import { Button } from "@/components/ui/button";
import { ApiError, tenantApiRequest } from "@/lib/api/client";
import { apiErrorBody, mapApiFieldErrors } from "@/lib/api/errors";
import { useTenant } from "@/tenancy/tenant-provider";
import {
  DuplicateCandidate,
  emptyPatient,
  Patient,
  PatientInput,
  patientName,
} from "@/patients/types";
import { PatientForm } from "./patient-form";
import {
  normalizeInternationalPhone,
  patientFields,
  PatientFieldErrors,
  validatePatient,
} from "@/patients/validation";
const payload = (v: PatientInput) =>
  Object.fromEntries(
    Object.entries(v).map(([k, x]) => [
      k,
      k === "phone"
        ? normalizeInternationalPhone(String(x))
        : x === ""
          ? null
          : x,
    ]),
  );
export function PatientEditor({ id }: { id?: string }) {
  const tenant = useTenant();
  const tenantId = tenant.currentTenant?.id ?? "";
  const router = useRouter();
  const qc = useQueryClient();
  const [value, setValue] = useState(emptyPatient);
  const [candidates, setCandidates] = useState<DuplicateCandidate[]>([]);
  const [error, setError] = useState<string>();
  const [errors, setErrors] = useState<PatientFieldErrors>({});
  const focusFirstError = (next: PatientFieldErrors) =>
    requestAnimationFrame(() => {
      const first = patientFields.find((field) => next[field]);
      if (first)
        document.getElementById(first)?.focus({ preventScroll: false });
    });
  const changeField = (field: keyof PatientInput, next: string) => {
    setValue((current) => ({ ...current, [field]: next }));
    setErrors((current) => {
      if (!current[field]) return current;
      const copy = { ...current };
      delete copy[field];
      return copy;
    });
    setError(undefined);
  };
  const submit = () => {
    const next = validatePatient(value);
    setErrors(next);
    setError(undefined);
    if (Object.keys(next).length) {
      focusFirstError(next);
      return;
    }
    mutation.mutate(false);
  };
  const query = useQuery({
    queryKey: ["patient", tenantId, id],
    queryFn: () => tenantApiRequest<Patient>(`/patients/${id}`, tenantId),
    enabled: Boolean(id && tenantId),
    meta: { tenantScoped: true },
  });
  useEffect(() => {
    if (query.data)
      // Query hydration initializes the single edit form after the record loads.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue({
        firstName: query.data.firstName,
        middleName: query.data.middleName ?? "",
        lastName: query.data.lastName,
        dateOfBirth: query.data.dateOfBirth.slice(0, 10),
        phone: query.data.phone,
        email: query.data.email ?? "",
        addressLine1: query.data.addressLine1 ?? "",
        addressLine2: query.data.addressLine2 ?? "",
        city: query.data.city ?? "",
        stateProvince: query.data.stateProvince ?? "",
        postalCode: query.data.postalCode ?? "",
        countryCode: query.data.countryCode ?? "",
        preferredContactMethod: query.data.preferredContactMethod ?? "",
      });
  }, [query.data]);
  const mutation = useMutation<Patient, Error, boolean>({
    mutationFn: async (force = false) => {
      const body = {
        ...payload(value),
        ...(id ? {} : { createAnyway: force }),
      };
      return tenantApiRequest<Patient>(
        id ? `/patients/${id}` : "/patients",
        tenantId,
        { method: id ? "PATCH" : "POST", body: JSON.stringify(body) },
      );
    },
    onSuccess: async (p) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["patients", tenantId] }),
        qc.invalidateQueries({ queryKey: ["patient", tenantId, p.id] }),
      ]);
      router.push(`/patients/${p.id}`);
    },
    onError: (e) => {
      const api = e as ApiError;
      const details = apiErrorBody(e) as
        { code?: string; candidates?: DuplicateCandidate[] } | undefined;
      if (!id && api.status === 409 && details?.code === "POSSIBLE_DUPLICATE")
        setCandidates(details.candidates ?? []);
      else {
        const mapped = mapApiFieldErrors(e, patientFields);
        if (Object.keys(mapped).length) {
          setErrors(mapped);
          focusFirstError(mapped);
          return;
        }
        setError(
          "Unable to Save Patient. Something went wrong while saving this patient. Please try again.",
        );
      }
    },
  });
  if (id && query.isLoading)
    return (
      <AppShell>
        <LoadingState />
      </AppShell>
    );
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader
          title={id ? "Edit Patient" : "Add Patient"}
          description={
            id
              ? "Update patient contact and administrative information."
              : "Create an administrative patient record."
          }
        />
        <PatientForm
          value={value}
          onFieldChange={changeField}
          onSubmit={submit}
          cancelHref={id ? `/patients/${id}` : "/patients"}
          mode={id ? "edit" : "create"}
          busy={mutation.isPending}
          error={error}
          errors={errors}
        />
      </div>
      {candidates.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="duplicate-title"
        >
          <div className="w-full max-w-lg rounded-lg border bg-background p-6 shadow-xl">
            <h2 id="duplicate-title" className="text-lg font-semibold">
              Possible Existing Patient
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              We found patients with similar information.
            </p>
            <div className="my-4 space-y-3">
              {candidates.map((p) => (
                <div className="rounded-md border p-3" key={p.id}>
                  <p className="font-medium">{patientName(p)}</p>
                  <p className="text-sm text-muted-foreground">
                    DOB: {p.dateOfBirth.slice(0, 10)} · Phone: {p.maskedPhone}
                  </p>
                  <Button asChild variant="ghost" className="px-0">
                    <Link href={`/patients/${p.id}`}>
                      View Existing Patient
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCandidates([])}>
                Review Form
              </Button>
              <Button
                disabled={mutation.isPending}
                onClick={() => mutation.mutate(true)}
              >
                Create Anyway
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
