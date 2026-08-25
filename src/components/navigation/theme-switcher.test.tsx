import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeSwitcher } from "./theme-switcher";

const setTheme = vi.fn();
let currentTheme = "system";
let currentResolvedTheme = "dark";

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: currentTheme,
    resolvedTheme: currentResolvedTheme,
    setTheme,
  }),
}));

describe("ThemeSwitcher", () => {
  beforeEach(() => {
    setTheme.mockClear();
    currentTheme = "system";
    currentResolvedTheme = "dark";
  });

  it("offers Light, Dark, and System choices", () => {
    render(<ThemeSwitcher />);

    fireEvent.click(screen.getByRole("button", { name: "Change Theme" }));

    expect(
      screen.getByRole("menuitemradio", { name: "Light" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitemradio", { name: "Dark" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitemradio", { name: "System" }),
    ).toHaveAttribute("aria-checked", "true");
  });

  it.each(["Light", "Dark", "System"])("selects %s", (label) => {
    render(<ThemeSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: "Change Theme" }));

    fireEvent.click(screen.getByRole("menuitemradio", { name: label }));

    expect(setTheme).toHaveBeenCalledWith(label.toLowerCase());
  });

  it("uses the resolved System theme for the trigger icon", () => {
    const { rerender } = render(<ThemeSwitcher />);
    expect(
      screen
        .getByRole("button", { name: "Change Theme" })
        .querySelector(".lucide-moon"),
    ).toBeInTheDocument();

    currentResolvedTheme = "light";
    rerender(<ThemeSwitcher />);
    expect(
      screen
        .getByRole("button", { name: "Change Theme" })
        .querySelector(".lucide-sun"),
    ).toBeInTheDocument();
  });
});
