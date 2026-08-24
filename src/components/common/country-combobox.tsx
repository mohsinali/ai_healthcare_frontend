"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { countryName, countryOptions } from "@/clinic/countries";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function CountryCombobox({
  id,
  label,
  value,
  disabled,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  error?: string;
  onChange(value: string): void;
}) {
  const [open, setOpen] = useState(false);
  const selectedName = countryName(value);

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
            className={cn(
              "w-full justify-between bg-background font-normal",
              error && "border-destructive ring-1 ring-destructive",
            )}
          >
            <span className={cn("truncate", !selectedName && "text-muted-foreground")}>
              {selectedName ?? "Select a country"}
            </span>
            <ChevronsUpDown className="opacity-50" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
          <Command
            label="Search countries"
            filter={(option, search) =>
              option.toLocaleLowerCase().includes(search.toLocaleLowerCase())
                ? 1
                : 0
            }
          >
            <CommandInput
              placeholder="Search countries..."
              aria-label="Search countries"
            />
            <CommandList>
              <CommandEmpty>No Countries Found</CommandEmpty>
              {countryOptions.map((country) => (
                <CommandItem
                  key={country.code}
                  value={`${country.name} ${country.code}`}
                  onSelect={() => {
                    onChange(country.code);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2",
                      value === country.code ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden="true"
                  />
                  {country.name}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
