"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { timezoneOptions } from "@/clinic/types";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function TimezoneCombobox({ id, label, value, disabled, error, onChange }: {
  id: string; label: string; value: string; disabled: boolean; error?: string;
  onChange(value: string): void;
}) {
  const [open, setOpen] = useState(false);
  const options = timezoneOptions.includes(value) ? timezoneOptions : [value, ...timezoneOptions];

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : undefined}
            disabled={disabled}
            className={cn("w-full justify-between bg-background font-normal", error && "border-destructive ring-1 ring-destructive")}
          >
            <span className="truncate">{value}</span>
            <ChevronsUpDown className="opacity-50" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
          <Command label="Search timezones" filter={(option, search) => normalizeTimezone(option).includes(normalizeTimezone(search)) ? 1 : 0}>
            <CommandInput placeholder="Search timezones..." aria-label="Search timezones" />
            <CommandList>
              <CommandEmpty>No Timezones Found</CommandEmpty>
              {options.map((zone) => (
                <CommandItem
                  key={zone}
                  value={zone}
                  onSelect={() => {
                    onChange(zone);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2", value === zone ? "opacity-100" : "opacity-0")} aria-hidden="true" />
                  {zone}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <p id={`${id}-error`} className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function normalizeTimezone(value: string) {
  return value.toLocaleLowerCase().replaceAll("_", " ");
}
