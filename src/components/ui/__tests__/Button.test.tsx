// @ts-nocheck
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
}

describe("Button", () => {
  it("renders with default variant", () => {
    render(<Button>Click me</Button>, { wrapper: Wrapper });
    expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
  });

  it("renders disabled state", () => {
    render(<Button disabled>Disabled</Button>, { wrapper: Wrapper });
    expect(screen.getByRole("button", { name: /disabled/i })).toBeDisabled();
  });

  it("renders with destructive variant", () => {
    render(<Button variant="destructive">Delete</Button>, { wrapper: Wrapper });
    expect(screen.getByRole("button")).toHaveClass("bg-destructive");
  });
});
