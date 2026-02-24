import { describe, it, expect } from "vitest";
import {
  resolveMediaQuery,
  extractGridProperties,
  generateHostVariables,
  generateTintCss,
  generateBackdropBlurCss,
  generateZoomCss,
  generateVariablesCss,
  generateKioskCss,
  generateKioskDisableCss,
  generateLayoutMediaCss,
  generateSectionMediaCss,
  computeSectionStyles,
  computeSectionVariables,
  computeSectionClasses,
  computeOverlayStyles,
  getOverlayAnimation,
  isOverlayActive,
} from "../src/styles";

// ── Breakpoint resolution ──────────────────────────────────────────────

describe("resolveMediaQuery", () => {
  const breakpoints = {
    mobile: "(max-width: 768px)",
    tablet: "(max-width: 1024px)",
    desktop: "(min-width: 1025px)",
  };

  it("resolves a named breakpoint", () => {
    expect(resolveMediaQuery("mobile", breakpoints)).toBe("(max-width: 768px)");
  });

  it("resolves another named breakpoint", () => {
    expect(resolveMediaQuery("tablet", breakpoints)).toBe("(max-width: 1024px)");
  });

  it("passes through a raw media query", () => {
    expect(resolveMediaQuery("(max-width: 600px)", breakpoints)).toBe("(max-width: 600px)");
  });

  it("passes through when breakpoints is undefined", () => {
    expect(resolveMediaQuery("mobile", undefined)).toBe("mobile");
  });

  it("passes through unknown breakpoint name", () => {
    expect(resolveMediaQuery("widescreen", breakpoints)).toBe("widescreen");
  });
});

// ── Grid property extraction ───────────────────────────────────────────

describe("extractGridProperties", () => {
  it("extracts grid-template-areas", () => {
    const result = extractGridProperties({ "grid-template-areas": '"a b"', margin: "10px" });
    expect(result).toEqual({ "grid-template-areas": '"a b"' });
  });

  it("extracts grid-template-columns and grid-template-rows", () => {
    const result = extractGridProperties({
      "grid-template-columns": "1fr 2fr",
      "grid-template-rows": "auto 1fr",
      tint: "red",
    });
    expect(result).toEqual({
      "grid-template-columns": "1fr 2fr",
      "grid-template-rows": "auto 1fr",
    });
  });

  it("extracts grid-gap", () => {
    const result = extractGridProperties({ "grid-gap": "16px", zoom: 0.8 });
    expect(result).toEqual({ "grid-gap": "16px" });
  });

  it("extracts place-items and place-content", () => {
    const result = extractGridProperties({
      "place-items": "center",
      "place-content": "stretch",
      kiosk: true,
    });
    expect(result).toEqual({ "place-items": "center", "place-content": "stretch" });
  });

  it("returns empty object when no grid properties", () => {
    expect(extractGridProperties({ tint: "red", zoom: 1 })).toEqual({});
  });

  it("extracts all grid-prefixed properties", () => {
    const result = extractGridProperties({
      "grid-auto-rows": "max-content",
      "grid-auto-flow": "dense",
    });
    expect(result).toEqual({ "grid-auto-rows": "max-content", "grid-auto-flow": "dense" });
  });
});

// ── Host variables ─────────────────────────────────────────────────────

describe("generateHostVariables", () => {
  it("uses defaults when no layout", () => {
    const css = generateHostVariables(undefined);
    expect(css).toContain("--layout-margin: 0px 4px 0px 4px");
    expect(css).toContain("--layout-padding: 4px 0px 4px 0px");
    expect(css).toContain("--layout-height: auto");
    expect(css).toContain("--layout-overflow: visible");
  });

  it("uses custom margin and padding", () => {
    const css = generateHostVariables({ margin: "0", padding: "8px" });
    expect(css).toContain("--layout-margin: 0");
    expect(css).toContain("--layout-padding: 8px");
  });

  it("sets overflow to auto when height is defined", () => {
    const css = generateHostVariables({ height: "100vh" });
    expect(css).toContain("--layout-height: 100vh");
    expect(css).toContain("--layout-overflow: auto");
  });

  it("sets overflow to visible when no height", () => {
    const css = generateHostVariables({ margin: "0" });
    expect(css).toContain("--layout-overflow: visible");
  });
});

// ── Individual CSS generators ──────────────────────────────────────────

describe("generateTintCss", () => {
  it("returns empty string for no tint", () => {
    expect(generateTintCss()).toBe("");
    expect(generateTintCss(undefined)).toBe("");
  });

  it("generates background-color rule", () => {
    const css = generateTintCss("rgba(0,0,0,0.5)");
    expect(css).toBe("#root { background-color: rgba(0,0,0,0.5); }");
  });
});

describe("generateBackdropBlurCss", () => {
  it("returns empty string for no blur", () => {
    expect(generateBackdropBlurCss()).toBe("");
  });

  it("generates backdrop-filter with webkit prefix", () => {
    const css = generateBackdropBlurCss("10px");
    expect(css).toContain("backdrop-filter: blur(10px)");
    expect(css).toContain("-webkit-backdrop-filter: blur(10px)");
  });
});

describe("generateZoomCss", () => {
  it("returns empty string for no zoom", () => {
    expect(generateZoomCss()).toBe("");
    expect(generateZoomCss(undefined)).toBe("");
  });

  it("generates zoom rule from number", () => {
    expect(generateZoomCss(0.8)).toBe("#root { zoom: 0.8; }");
  });

  it("generates zoom rule from string", () => {
    expect(generateZoomCss("1.2")).toBe('#root { zoom: 1.2; }');
  });

  it("handles zero zoom", () => {
    expect(generateZoomCss(0)).toBe("#root { zoom: 0; }");
  });
});

describe("generateVariablesCss", () => {
  it("returns empty string for no variables", () => {
    expect(generateVariablesCss()).toBe("");
    expect(generateVariablesCss(undefined)).toBe("");
  });

  it("generates CSS custom properties on :host", () => {
    const css = generateVariablesCss({ color: "red", size: "16px" });
    expect(css).toContain(":host {");
    expect(css).toContain("--color: red;");
    expect(css).toContain("--size: 16px;");
  });

  it("handles complex values like blur functions", () => {
    const css = generateVariablesCss({ blur: "blur(10px);" });
    expect(css).toContain("--blur: blur(10px);;");
  });
});

// ── Kiosk CSS ──────────────────────────────────────────────────────────

describe("generateKioskCss", () => {
  it("returns empty string when kiosk is false", () => {
    expect(generateKioskCss(false)).toBe("");
  });

  it("returns empty string when kiosk is undefined", () => {
    expect(generateKioskCss(undefined)).toBe("");
  });

  it("generates fixed position CSS when kiosk is true", () => {
    const css = generateKioskCss(true);
    expect(css).toContain("position: fixed !important");
    expect(css).toContain("var(--mdc-drawer-width, 0px)");
    expect(css).toContain("var(--header-height, 56px)");
  });

  it("includes edit-mode offset for tab bar", () => {
    const css = generateKioskCss(true);
    expect(css).toContain("#root.edit-mode");
    expect(css).toContain("var(--tab-bar-height, 56px)");
  });

  it("makes sections scrollable with hidden scrollbars", () => {
    const css = generateKioskCss(true);
    expect(css).toContain("overflow-y: scroll");
    expect(css).toContain("scrollbar-width: none");
    expect(css).toContain("margin: 0 !important");
  });

  it("hides webkit scrollbar", () => {
    const css = generateKioskCss(true);
    expect(css).toContain("::-webkit-scrollbar");
    expect(css).toContain("display: none");
  });
});

describe("generateKioskDisableCss", () => {
  it("resets position to relative", () => {
    const css = generateKioskDisableCss();
    expect(css).toContain("position: relative !important");
  });

  it("restores layout margins and padding", () => {
    const css = generateKioskDisableCss();
    expect(css).toContain("var(--layout-margin)");
    expect(css).toContain("var(--layout-padding, 12px)");
  });

  it("resets edit-mode top to 0", () => {
    const css = generateKioskDisableCss();
    expect(css).toContain("#root.edit-mode");
  });

  it("sets section containers to auto height", () => {
    const css = generateKioskDisableCss();
    expect(css).toContain(".section-container");
    expect(css).toContain("height: auto");
  });
});

// ── Layout media queries ───────────────────────────────────────────────

describe("generateLayoutMediaCss", () => {
  const identity = (css: string) => css;

  it("returns empty string when no mediaquery", () => {
    expect(generateLayoutMediaCss({}, identity)).toBe("");
  });

  it("generates @media block with zoom override", () => {
    const css = generateLayoutMediaCss({
      mediaquery: { "(max-width: 768px)": { zoom: 0.7 } },
    }, identity);
    expect(css).toContain("@media (max-width: 768px)");
    expect(css).toContain("zoom: 0.7");
  });

  it("generates tint override in media query", () => {
    const css = generateLayoutMediaCss({
      mediaquery: { "(max-width: 768px)": { tint: "rgba(0,0,0,0.3)" } },
    }, identity);
    expect(css).toContain("background-color: rgba(0,0,0,0.3)");
  });

  it("generates backdrop_blur override in media query", () => {
    const css = generateLayoutMediaCss({
      mediaquery: { "(max-width: 768px)": { backdrop_blur: "5px" } },
    }, identity);
    expect(css).toContain("backdrop-filter: blur(5px)");
    expect(css).toContain("-webkit-backdrop-filter: blur(5px)");
  });

  it("generates variables override in media query", () => {
    const css = generateLayoutMediaCss({
      mediaquery: { "(max-width: 768px)": { variables: { gap: "4px" } } },
    }, identity);
    expect(css).toContain("--gap: 4px;");
  });

  it("includes custom_css via evaluator callback", () => {
    const css = generateLayoutMediaCss({
      mediaquery: { "(max-width: 768px)": { custom_css: ".foo { color: red; }" } },
    }, identity);
    expect(css).toContain(".foo { color: red; }");
  });

  it("generates kiosk disable when kiosk is true and override is false", () => {
    const css = generateLayoutMediaCss({
      kiosk: true,
      mediaquery: { mobile: { kiosk: false } },
      breakpoints: { mobile: "(max-width: 768px)" },
    }, identity);
    expect(css).toContain("@media (max-width: 768px)");
    expect(css).toContain("position: relative !important");
  });

  it("resolves named breakpoints", () => {
    const css = generateLayoutMediaCss({
      breakpoints: { mobile: "(max-width: 768px)" },
      mediaquery: { mobile: { zoom: 0.5 } },
    }, identity);
    expect(css).toContain("@media (max-width: 768px)");
  });

  it("skips media block when no overrides match", () => {
    const css = generateLayoutMediaCss({
      mediaquery: { "(max-width: 768px)": {} },
    }, identity);
    expect(css).toBe("");
  });

  it("handles multiple media queries", () => {
    const css = generateLayoutMediaCss({
      mediaquery: {
        "(max-width: 768px)": { zoom: 0.7 },
        "(max-width: 480px)": { zoom: 0.5 },
      },
    }, identity);
    expect(css).toContain("@media (max-width: 768px)");
    expect(css).toContain("@media (max-width: 480px)");
  });
});

// ── Section media queries ──────────────────────────────────────────────

describe("generateSectionMediaCss", () => {
  const identity = (css: string) => css;

  it("returns empty string for empty sections", () => {
    expect(generateSectionMediaCss([], undefined, identity)).toBe("");
  });

  it("skips sections without mediaquery", () => {
    expect(generateSectionMediaCss(
      [{ type: "grid", grid_area: "main" }], undefined, identity
    )).toBe("");
  });

  it("skips sections without grid_area", () => {
    expect(generateSectionMediaCss(
      [{ type: "grid", mediaquery: { "(max-width: 768px)": { tint: "red" } } }],
      undefined, identity
    )).toBe("");
  });

  it("generates tint override for a section", () => {
    const css = generateSectionMediaCss([{
      type: "grid",
      grid_area: "sidebar",
      mediaquery: { "(max-width: 768px)": { tint: "rgba(0,0,0,0.5)" } },
    }], undefined, identity);
    expect(css).toContain("@media (max-width: 768px)");
    expect(css).toContain(".section-sidebar");
    expect(css).toContain("background-color: rgba(0,0,0,0.5) !important");
  });

  it("generates padding override", () => {
    const css = generateSectionMediaCss([{
      type: "grid",
      grid_area: "main",
      mediaquery: { "(max-width: 768px)": { padding: "0" } },
    }], undefined, identity);
    expect(css).toContain("padding: 0 !important");
  });

  it("generates background override", () => {
    const css = generateSectionMediaCss([{
      type: "grid",
      grid_area: "header",
      mediaquery: { "(max-width: 768px)": { background: "linear-gradient(red, blue)" } },
    }], undefined, identity);
    expect(css).toContain("background: linear-gradient(red, blue) !important");
  });

  it("generates backdrop_blur with webkit prefix", () => {
    const css = generateSectionMediaCss([{
      type: "grid",
      grid_area: "main",
      mediaquery: { "(max-width: 768px)": { backdrop_blur: "8px" } },
    }], undefined, identity);
    expect(css).toContain("backdrop-filter: blur(8px) !important");
    expect(css).toContain("-webkit-backdrop-filter: blur(8px) !important");
  });

  it("generates zoom override", () => {
    const css = generateSectionMediaCss([{
      type: "grid",
      grid_area: "main",
      mediaquery: { "(max-width: 768px)": { zoom: 0.5 } },
    }], undefined, identity);
    expect(css).toContain("zoom: 0.5 !important");
  });

  it("generates overflow override", () => {
    const css = generateSectionMediaCss([{
      type: "grid",
      grid_area: "main",
      mediaquery: { "(max-width: 768px)": { overflow: "hidden" } },
    }], undefined, identity);
    expect(css).toContain("overflow: hidden !important");
  });

  it("generates display override (for hiding sections)", () => {
    const css = generateSectionMediaCss([{
      type: "grid",
      grid_area: "sidebar",
      mediaquery: { "(max-width: 768px)": { display: "none" } },
    }], undefined, identity);
    expect(css).toContain("display: none !important");
  });

  it("generates per-section variables with !important", () => {
    const css = generateSectionMediaCss([{
      type: "grid",
      grid_area: "main",
      mediaquery: { "(max-width: 768px)": { variables: { gap: "4px", color: "red" } } },
    }], undefined, identity);
    expect(css).toContain("--gap: 4px !important");
    expect(css).toContain("--color: red !important");
  });

  it("includes custom_css via evaluator", () => {
    const css = generateSectionMediaCss([{
      type: "grid",
      grid_area: "main",
      mediaquery: { "(max-width: 768px)": { custom_css: ".card { opacity: 0.5; }" } },
    }], undefined, identity);
    expect(css).toContain(".card { opacity: 0.5; }");
  });

  it("resolves named breakpoints", () => {
    const css = generateSectionMediaCss([{
      type: "grid",
      grid_area: "main",
      mediaquery: { mobile: { tint: "red" } },
    }], { mobile: "(max-width: 768px)" }, identity);
    expect(css).toContain("@media (max-width: 768px)");
  });
});

// ── Section styling ────────────────────────────────────────────────────

describe("computeSectionStyles", () => {
  it("returns empty object for minimal section", () => {
    expect(computeSectionStyles({ type: "grid" })).toEqual({});
  });

  it("sets grid-area", () => {
    const styles = computeSectionStyles({ type: "grid", grid_area: "main" });
    expect(styles["grid-area"]).toBe("main");
  });

  it("sets background", () => {
    const styles = computeSectionStyles({ type: "grid", background: "linear-gradient(red, blue)" });
    expect(styles["background"]).toBe("linear-gradient(red, blue)");
  });

  it("sets backdrop-filter with webkit prefix", () => {
    const styles = computeSectionStyles({ type: "grid", backdrop_blur: "10px" });
    expect(styles["backdrop-filter"]).toBe("blur(10px)");
    expect(styles["-webkit-backdrop-filter"]).toBe("blur(10px)");
  });

  it("sets zoom from number", () => {
    const styles = computeSectionStyles({ type: "grid", zoom: 0.8 });
    expect(styles["zoom"]).toBe("0.8");
  });

  it("sets zoom from string", () => {
    const styles = computeSectionStyles({ type: "grid", zoom: "1.2" });
    expect(styles["zoom"]).toBe("1.2");
  });

  it("sets overflow", () => {
    const styles = computeSectionStyles({ type: "grid", overflow: "hidden" });
    expect(styles["overflow"]).toBe("hidden");
  });

  it("sets padding", () => {
    const styles = computeSectionStyles({ type: "grid", padding: "20px" });
    expect(styles["padding"]).toBe("20px");
  });

  it("sets tint as background-color", () => {
    const styles = computeSectionStyles({ type: "grid", tint: "rgba(0,0,0,0.3)" });
    expect(styles["background-color"]).toBe("rgba(0,0,0,0.3)");
  });

  it("sets all properties together", () => {
    const styles = computeSectionStyles({
      type: "grid",
      grid_area: "sidebar",
      background: "white",
      backdrop_blur: "5px",
      zoom: 0.9,
      overflow: "auto",
      padding: "8px",
      tint: "rgba(255,255,255,0.1)",
    });
    expect(Object.keys(styles).length).toBe(8); // grid-area, background, backdrop x2, zoom, overflow, padding, tint
  });
});

describe("computeSectionVariables", () => {
  it("returns empty object for undefined", () => {
    expect(computeSectionVariables(undefined)).toEqual({});
  });

  it("prefixes keys with --", () => {
    const vars = computeSectionVariables({ color: "red", size: "16px" });
    expect(vars["--color"]).toBe("red");
    expect(vars["--size"]).toBe("16px");
  });
});

describe("computeSectionClasses", () => {
  it("always includes section-container", () => {
    const classes = computeSectionClasses({ type: "grid" }, false);
    expect(classes).toContain("section-container");
  });

  it("adds edit-mode class when editing", () => {
    const classes = computeSectionClasses({ type: "grid" }, true);
    expect(classes).toContain("edit-mode");
  });

  it("does not add edit-mode when not editing", () => {
    const classes = computeSectionClasses({ type: "grid" }, false);
    expect(classes).not.toContain("edit-mode");
  });

  it("adds section-{area} class", () => {
    const classes = computeSectionClasses({ type: "grid", grid_area: "sidebar" }, false);
    expect(classes).toContain("section-sidebar");
  });

  it("adds scrollable class", () => {
    const classes = computeSectionClasses({ type: "grid", scrollable: true }, false);
    expect(classes).toContain("scrollable");
  });

  it("does not add scrollable when false", () => {
    const classes = computeSectionClasses({ type: "grid", scrollable: false }, false);
    expect(classes).not.toContain("scrollable");
  });

  it("combines all classes", () => {
    const classes = computeSectionClasses({
      type: "grid", grid_area: "main", scrollable: true,
    }, true);
    expect(classes).toEqual(["section-container", "edit-mode", "section-main", "scrollable"]);
  });
});

// ── Overlay helpers ────────────────────────────────────────────────────

describe("computeOverlayStyles", () => {
  it("returns empty object for minimal config", () => {
    expect(computeOverlayStyles({ entity: "sensor.test" })).toEqual({});
  });

  it("sets color variable", () => {
    const styles = computeOverlayStyles({ entity: "sensor.test", color: "red" });
    expect(styles["--sgl-overlay-color"]).toBe("red");
  });

  it("sets duration variable", () => {
    const styles = computeOverlayStyles({ entity: "sensor.test", duration: "5s" });
    expect(styles["--sgl-overlay-duration"]).toBe("5s");
  });

  it("sets backdrop_blur variable", () => {
    const styles = computeOverlayStyles({ entity: "sensor.test", backdrop_blur: "8px" });
    expect(styles["--sgl-overlay-blur"]).toBe("8px");
  });

  it("sets font_size variable", () => {
    const styles = computeOverlayStyles({ entity: "sensor.test", font_size: "120px" });
    expect(styles["--sgl-overlay-font-size"]).toBe("120px");
  });

  it("sets z_index variable", () => {
    const styles = computeOverlayStyles({ entity: "sensor.test", z_index: 5000 });
    expect(styles["--sgl-overlay-z-index"]).toBe("5000");
  });

  it("sets background directly", () => {
    const styles = computeOverlayStyles({
      entity: "sensor.test",
      background: "linear-gradient(red, blue)",
    });
    expect(styles["background"]).toBe("linear-gradient(red, blue)");
  });

  it("sets all properties together", () => {
    const styles = computeOverlayStyles({
      entity: "sensor.test",
      color: "white",
      duration: "3s",
      backdrop_blur: "6px",
      font_size: "80px",
      z_index: 9999,
      background: "rgba(0,0,0,0.5)",
    });
    expect(Object.keys(styles).length).toBe(6);
  });
});

describe("getOverlayAnimation", () => {
  it("defaults to pulse", () => {
    expect(getOverlayAnimation({ entity: "sensor.test" })).toBe("pulse");
  });

  it("returns configured animation", () => {
    expect(getOverlayAnimation({ entity: "sensor.test", animation: "fade" })).toBe("fade");
    expect(getOverlayAnimation({ entity: "sensor.test", animation: "flash" })).toBe("flash");
    expect(getOverlayAnimation({ entity: "sensor.test", animation: "slide-up" })).toBe("slide-up");
    expect(getOverlayAnimation({ entity: "sensor.test", animation: "none" })).toBe("none");
  });
});

describe("isOverlayActive", () => {
  it("defaults target state to 'on'", () => {
    expect(isOverlayActive({ entity: "sensor.test" }, "on")).toBe(true);
    expect(isOverlayActive({ entity: "sensor.test" }, "off")).toBe(false);
  });

  it("uses custom target state", () => {
    expect(isOverlayActive({ entity: "sensor.test", state: "armed" }, "armed")).toBe(true);
    expect(isOverlayActive({ entity: "sensor.test", state: "armed" }, "disarmed")).toBe(false);
  });

  it("returns false for undefined entity state", () => {
    expect(isOverlayActive({ entity: "sensor.test" }, undefined)).toBe(false);
  });

  it("handles numeric state strings", () => {
    expect(isOverlayActive({ entity: "sensor.test", state: "100" }, "100")).toBe(true);
    expect(isOverlayActive({ entity: "sensor.test", state: "100" }, "99")).toBe(false);
  });
});
