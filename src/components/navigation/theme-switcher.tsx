"use client";

import { useSyncExternalStore } from "react";
import { Check, Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

const themes = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Laptop },
] as const;

const subscribe = () => () => undefined;

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  return (
    <details className="group relative">
      <summary className="list-none">
        <Button variant="ghost" size="icon" aria-label="Change color theme">
          <Sun className="dark:hidden" />
          <Moon className="hidden dark:block" />
        </Button>
      </summary>
      <div className="absolute right-0 z-50 mt-1 min-w-36 rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
        {themes.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-sm hover:bg-muted focus:bg-muted"
          >
            <Icon className="size-4" />
            <span className="flex-1 text-left">{label}</span>
            {mounted && theme === value && <Check className="size-4" />}
          </button>
        ))}
      </div>
    </details>
  );
}
