import { describe, it, expect } from "vitest";
import { readFileSync, statSync } from "fs";
import { join } from "path";

const OUTPUT_PATH = join(__dirname, "..", "sections-grid-layout.js");

describe("build output", () => {
  it("compiled JS file exists", () => {
    expect(() => statSync(OUTPUT_PATH)).not.toThrow();
  });

  it("contains sections-grid-layout registration", () => {
    const content = readFileSync(OUTPUT_PATH, "utf-8");
    expect(content).toContain("sections-grid-layout");
  });

  it("does not contain layout-card element registration", () => {
    const content = readFileSync(OUTPUT_PATH, "utf-8");
    // Should not register any layout-card elements
    expect(content).not.toContain('"layout-card"');
    expect(content).not.toContain('"masonry-layout"');
    expect(content).not.toContain('"horizontal-layout"');
    expect(content).not.toContain('"vertical-layout"');
  });

  it("has a reasonable file size (20KB-200KB)", () => {
    const stats = statSync(OUTPUT_PATH);
    expect(stats.size).toBeGreaterThan(20_000);
    expect(stats.size).toBeLessThan(200_000);
  });
});
