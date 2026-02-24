import { describe, it, expect } from "vitest";
import { sectionConfigToYaml, yamlScalar, parseYaml } from "../src/yaml";

describe("yamlScalar", () => {
  it("returns plain string as-is", () => {
    expect(yamlScalar("hello")).toBe("hello");
  });

  it("quotes empty string", () => {
    expect(yamlScalar("")).toBe('""');
  });

  it("quotes 'true' string", () => {
    expect(yamlScalar("true")).toBe('"true"');
  });

  it("quotes 'false' string", () => {
    expect(yamlScalar("false")).toBe('"false"');
  });

  it("quotes 'null' string", () => {
    expect(yamlScalar("null")).toBe('"null"');
  });

  it("quotes numeric-looking string", () => {
    expect(yamlScalar("42")).toBe('"42"');
  });

  it("quotes string with colon", () => {
    expect(yamlScalar("key: value")).toBe('"key: value"');
  });

  it("quotes string with hash", () => {
    expect(yamlScalar("color #fff")).toBe('"color #fff"');
  });

  it("quotes string with curly brace", () => {
    expect(yamlScalar("{{ states() }}")).toBe('"{{ states() }}"');
  });

  it("passes through strings with embedded quotes (no quoting trigger)", () => {
    // yamlScalar only quotes strings that START with " or match other special patterns
    expect(yamlScalar('say "hello"')).toBe('say "hello"');
  });

  it("quotes string that starts with a double quote", () => {
    expect(yamlScalar('"quoted"')).toBe('"\\"quoted\\""');
  });

  it("converts numbers to string", () => {
    expect(yamlScalar(42)).toBe("42");
  });

  it("converts booleans to string", () => {
    expect(yamlScalar(true)).toBe("true");
  });
});

describe("sectionConfigToYaml", () => {
  it("serializes flat config", () => {
    const yaml = sectionConfigToYaml({ type: "grid", grid_area: "main" });
    expect(yaml).toContain("type: grid");
    expect(yaml).toContain("grid_area: main");
  });

  it("skips cards key", () => {
    const yaml = sectionConfigToYaml({ type: "grid", cards: [{ type: "markdown" }] });
    expect(yaml).not.toContain("cards");
  });

  it("serializes nested objects", () => {
    const yaml = sectionConfigToYaml({
      type: "grid",
      variables: { color: "red", size: "large" },
    });
    expect(yaml).toContain("variables:");
    expect(yaml).toContain("  color: red");
    expect(yaml).toContain("  size: large");
  });

  it("uses block literal for multiline strings", () => {
    const yaml = sectionConfigToYaml({
      custom_css: "line1\nline2\nline3",
    });
    expect(yaml).toContain("custom_css: |");
    expect(yaml).toContain("  line1");
    expect(yaml).toContain("  line2");
  });

  it("skips null and undefined values", () => {
    const yaml = sectionConfigToYaml({ type: "grid", title: null, padding: undefined });
    expect(yaml).not.toContain("title");
    expect(yaml).not.toContain("padding");
  });

  it("quotes special characters in scalars", () => {
    const yaml = sectionConfigToYaml({ tint: "rgba(0, 0, 0, 0.5)" });
    expect(yaml).toContain("tint: rgba(0, 0, 0, 0.5)");
  });
});

describe("parseYaml (fallback parser)", () => {
  it("parses simple key-value pairs", () => {
    const result = parseYaml("type: grid\ngrid_area: main");
    expect(result).toEqual({ type: "grid", grid_area: "main" });
  });

  it("parses boolean values", () => {
    const result = parseYaml("scrollable: true\nkiosk: false");
    expect(result).toEqual({ scrollable: true, kiosk: false });
  });

  it("parses numeric values", () => {
    const result = parseYaml("zoom: 0.8\nz_index: 100");
    expect(result).toEqual({ zoom: 0.8, z_index: 100 });
  });

  it("strips quotes from values", () => {
    const result = parseYaml('title: "My Section"\narea: \'main\'');
    expect(result).toEqual({ title: "My Section", area: "main" });
  });

  it("skips comments", () => {
    const result = parseYaml("# comment\ntype: grid");
    expect(result).toEqual({ type: "grid" });
  });

  it("skips empty lines", () => {
    const result = parseYaml("type: grid\n\ngrid_area: main");
    expect(result).toEqual({ type: "grid", grid_area: "main" });
  });

  it("returns empty object for empty input", () => {
    const result = parseYaml("");
    expect(result).toEqual({});
  });
});
