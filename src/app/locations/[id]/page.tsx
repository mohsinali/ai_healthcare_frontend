"use client";
import { use } from "react";
import { ConfigEditor } from "@/components/clinic/config-editor";
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ConfigEditor kind="locations" id={use(params).id} />;
}
