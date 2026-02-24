import { describe, it, expect } from "vitest";
import { detectAllGridAreas, formatAreaName, ensureSectionsForAllAreas } from "../src/grid-utils";

describe("detectAllGridAreas", () => {
  it("parses a simple grid-template-areas string", () => {
    const areas = `"header header"
    "main   sidebar"
    "footer footer"`;
    expect(detectAllGridAreas(areas)).toEqual(["header", "main", "sidebar", "footer"]);
  });

  it("deduplicates repeated area names", () => {
    const areas = `"a a a"
    "b b b"`;
    expect(detectAllGridAreas(areas)).toEqual(["a", "b"]);
  });

  it("excludes dots (unnamed cells)", () => {
    const areas = `"header header"
    "main   ."
    "footer footer"`;
    const result = detectAllGridAreas(areas);
    expect(result).not.toContain(".");
    expect(result).toEqual(["header", "main", "footer"]);
  });

  it("handles single-quoted areas", () => {
    const areas = `'header header'
    'main sidebar'`;
    expect(detectAllGridAreas(areas)).toEqual(["header", "main", "sidebar"]);
  });

  it("returns empty array for undefined input", () => {
    expect(detectAllGridAreas(undefined)).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(detectAllGridAreas("")).toEqual([]);
  });

  it("handles areas with hyphens and underscores", () => {
    const areas = `"top-bar top-bar"
    "main_content side-panel"`;
    expect(detectAllGridAreas(areas)).toEqual(["top-bar", "main_content", "side-panel"]);
  });
});

describe("formatAreaName", () => {
  it("converts kebab-case to Title Case", () => {
    expect(formatAreaName("footer-right")).toBe("Footer Right");
  });

  it("converts snake_case to Title Case", () => {
    expect(formatAreaName("main_content")).toBe("Main Content");
  });

  it("handles single word", () => {
    expect(formatAreaName("header")).toBe("Header");
  });

  it("handles multiple segments", () => {
    expect(formatAreaName("top-left-corner")).toBe("Top Left Corner");
  });
});

describe("ensureSectionsForAllAreas", () => {
  it("returns existing sections when no grid areas", () => {
    const sections = [{ grid_area: "main", type: "grid", cards: [] }];
    expect(ensureSectionsForAllAreas([], sections)).toEqual(sections);
  });

  it("auto-creates sections for missing areas", () => {
    const sections = [{ grid_area: "main", type: "grid", cards: [] }];
    const result = ensureSectionsForAllAreas(["main", "sidebar"], sections);
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual({
      type: "grid",
      title: "Sidebar",
      grid_area: "sidebar",
      cards: [],
    });
  });

  it("does not duplicate existing sections", () => {
    const sections = [
      { grid_area: "header", type: "grid", cards: [] },
      { grid_area: "main", type: "grid", cards: [] },
    ];
    const result = ensureSectionsForAllAreas(["header", "main"], sections);
    expect(result).toHaveLength(2);
  });

  it("handles empty sections array", () => {
    const result = ensureSectionsForAllAreas(["header", "main"], []);
    expect(result).toHaveLength(2);
    expect(result[0].grid_area).toBe("header");
    expect(result[0].title).toBe("Header");
    expect(result[1].grid_area).toBe("main");
  });

  it("generates Title Case titles from kebab-case areas", () => {
    const result = ensureSectionsForAllAreas(["top-bar"], []);
    expect(result[0].title).toBe("Top Bar");
  });
});
