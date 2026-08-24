"use client";
import { use } from "react";
import { ConfigDetail } from "@/components/clinic/config-detail";
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ConfigDetail kind="providers" id={use(params).id} />;
}
