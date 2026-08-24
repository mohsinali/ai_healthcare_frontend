"use client";
import { use } from "react";
import { PatientEditor } from "@/components/patients/patient-editor";
export default function Page({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  return <PatientEditor id={use(params).patientId} />;
}
