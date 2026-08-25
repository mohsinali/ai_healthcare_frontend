import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ThemeProvider } from "./theme-provider";

const providerProps = vi.fn();

vi.mock("next-themes", () => ({
  ThemeProvider: ({ children, ...props }: React.PropsWithChildren) => {
    providerProps(props);
    return children;
  },
}));

it("configures class-based Light, Dark, and System theme support", () => {
  render(
    <ThemeProvider>
      <span>Application</span>
    </ThemeProvider>,
  );

  expect(screen.getByText("Application")).toBeInTheDocument();
  expect(providerProps).toHaveBeenCalledWith({
    attribute: "class",
    defaultTheme: "system",
    enableSystem: true,
    disableTransitionOnChange: true,
  });
});
