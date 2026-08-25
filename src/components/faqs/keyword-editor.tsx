"use client";
import { KeyboardEvent, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function KeywordEditor({ value, onChange, error, disabled }: { value: string[]; onChange(value: string[]): void; error?: string; disabled?: boolean }) {
  const [draft, setDraft] = useState("");
  function add(raw = draft) {
    const keyword = raw.trim();
    if (!keyword || keyword.length > 100 || value.length >= 20 || value.some((x) => x.toLocaleLowerCase() === keyword.toLocaleLowerCase())) return;
    onChange([...value, keyword]);
    setDraft("");
  }
  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") { event.preventDefault(); add(); }
    else if (event.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
  }
  return (
    <div className="space-y-2">
      <Label htmlFor="keywords">Keywords</Label>
      <div className="flex min-h-10 flex-wrap items-center gap-2 rounded-md border bg-background p-2 focus-within:ring-2 focus-within:ring-ring">
        {value.map((keyword) => <span key={keyword.toLocaleLowerCase()} className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground">{keyword}<button type="button" disabled={disabled} onClick={() => onChange(value.filter((x) => x !== keyword))} aria-label={`Remove ${keyword}`} className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X className="size-3" /></button></span>)}
        <Input id="keywords" value={draft} disabled={disabled || value.length >= 20} maxLength={100} onKeyDown={keyDown} onBlur={() => add()} onChange={(e) => setDraft(e.target.value.replace(/^,/, ""))} placeholder={value.length ? "Add another" : "Type a keyword and press Enter"} className="h-7 min-w-48 flex-1 border-0 p-0 shadow-none focus-visible:ring-0" aria-invalid={Boolean(error)} aria-describedby={error ? "keywords-error" : "keywords-help"} />
      </div>
      <p id="keywords-help" className="text-xs text-muted-foreground">Add alternate terms callers might use, such as “car park” for “parking”. {value.length}/20</p>
      {error && <p id="keywords-error" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
