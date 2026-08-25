"use client";
import Link from "next/link";
import { FormEvent } from "react";
import { Plus, Save } from "lucide-react";
import { SearchCombobox } from "@/components/common/search-combobox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { Location } from "@/clinic/types";
import { FAQ_CATEGORIES, FAQ_CATEGORY_LABELS, FaqInput } from "@/faqs/types";
import { KeywordEditor } from "./keyword-editor";

export type FaqFormErrors = Partial<Record<keyof FaqInput, string>>;
export function validateFaqForm(value: FaqInput): FaqFormErrors {
  const errors: FaqFormErrors = {};
  if (!FAQ_CATEGORIES.includes(value.category)) errors.category = "Category is required.";
  if (!value.question.trim()) errors.question = "Question is required.";
  else if (value.question.length > 500) errors.question = "Question must be 500 characters or fewer.";
  if (!value.answer.trim()) errors.answer = "Answer is required.";
  else if (value.answer.length > 8000) errors.answer = "Answer must be 8,000 characters or fewer.";
  if (value.keywords.length > 20) errors.keywords = "Use no more than 20 keywords.";
  else if (value.keywords.some((x) => !x.trim() || x.length > 100)) errors.keywords = "Each keyword must be 1–100 characters.";
  return errors;
}

export function FaqForm({ mode, value, locations, errors, isSubmitting, onChange, onSubmit, cancelHref }: {
  mode: "create" | "edit"; value: FaqInput; locations: Location[]; errors: FaqFormErrors; isSubmitting: boolean;
  onChange(value: FaqInput): void; onSubmit(): void; cancelHref: string;
}) {
  const set = <K extends keyof FaqInput>(key: K, next: FaqInput[K]) => onChange({ ...value, [key]: next });
  const submit = (event: FormEvent) => { event.preventDefault(); onSubmit(); };
  const active = locations.filter((x) => x.status === "ACTIVE" || x.id === value.locationId);
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Card>
        <CardHeader><CardTitle>FAQ Content</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select id="category" required value={value.category} onChange={(e) => set("category", e.target.value as FaqInput["category"])} aria-invalid={Boolean(errors.category)} aria-describedby={errors.category ? "category-error" : undefined} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                {FAQ_CATEGORIES.map((category) => <option key={category} value={category}>{FAQ_CATEGORY_LABELS[category]}</option>)}
              </select>
              {errors.category && <p id="category-error" className="text-sm text-destructive">{errors.category}</p>}
            </div>
            <SearchCombobox id="locationId" label="Scope" value={value.locationId ?? ""} placeholder="All Locations" error={errors.locationId} onChange={(id) => set("locationId", id || null)} options={[{ value: "", label: "All Locations", detail: "Available across this clinic" }, ...active.map((location) => ({ value: location.id, label: location.name, detail: `${location.locationNumber}${location.status === "INACTIVE" ? " — Inactive" : ""}` }))]} />
          </div>
          <TextAreaField id="question" label="Question" value={value.question} maxLength={500} rows={3} error={errors.question} onChange={(next) => set("question", next)} />
          <TextAreaField id="answer" label="Answer" value={value.answer} maxLength={8000} rows={8} error={errors.answer} onChange={(next) => set("answer", next)} />
          <KeywordEditor value={value.keywords} error={errors.keywords} disabled={isSubmitting} onChange={(next) => set("keywords", next)} />
        </CardContent>
      </Card>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button asChild type="button" variant="outline"><Link href={cancelHref}>Cancel</Link></Button>
        <Button type="submit" disabled={isSubmitting}>{mode === "create" ? <Plus /> : <Save />}{isSubmitting ? "Saving…" : mode === "create" ? "Add FAQ" : "Save Changes"}</Button>
      </div>
    </form>
  );
}

function TextAreaField({ id, label, value, rows, maxLength, error, onChange }: { id: string; label: string; value: string; rows: number; maxLength: number; error?: string; onChange(value: string): void }) {
  return <div className="space-y-2"><div className="flex justify-between gap-3"><Label htmlFor={id}>{label}</Label><span className="text-xs text-muted-foreground">{value.length}/{maxLength}</span></div><textarea id={id} required rows={rows} maxLength={maxLength} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className="w-full resize-y rounded-md border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />{error && <p id={`${id}-error`} className="text-sm text-destructive">{error}</p>}</div>;
}
