import { describe, it, expect } from "vitest";
import { sanitizeHTML, stripHTML } from "@/lib/sanitize";

describe("sanitize", () => {
  it("sanitizeHTML strips script tags", () => {
    const result = sanitizeHTML("<p>Safe</p><script>bad</script>");
    expect(result).not.toContain("<script>");
    expect(result).toContain("Safe");
  });

  it("sanitizeHTML preserves allowed tags", () => {
    const result = sanitizeHTML("<p>Hello <strong>world</strong></p>");
    expect(result).toContain("<p>");
    expect(result).toContain("<strong>");
  });

  it("stripHTML removes all tags", () => {
    expect(stripHTML("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });

  it("handles empty input", () => {
    expect(sanitizeHTML("")).toBe("");
    expect(stripHTML("")).toBe("");
  });
});
