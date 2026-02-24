/**
 * Pure CSS generation functions for the layout view.
 * These produce CSS strings from config objects without any DOM dependency.
 */

import type { OverlayConfig, SectionConfig } from "./types";

export interface LayoutConfig {
  margin?: string;
  padding?: string;
  height?: string;
  kiosk?: boolean;
  zoom?: number | string;
  tint?: string;
  backdrop_blur?: string;
  variables?: Record<string, string>;
  breakpoints?: Record<string, string>;
  mediaquery?: Record<string, Record<string, any>>;
  custom_css?: string;
  overlays?: OverlayConfig[];
  [key: string]: any;
}

/**
 * Resolve a named breakpoint to its media query string.
 * If the key is already a raw query (e.g. "(max-width: 768px)"), returns it as-is.
 */
export function resolveMediaQuery(key: string, breakpoints?: Record<string, string>): string {
  return breakpoints?.[key] || key;
}

/**
 * Filter grid/placement CSS properties from a layout config object.
 * Returns only keys that start with "grid" or are "place-items"/"place-content".
 */
export function extractGridProperties(layout: Record<string, any>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(layout)) {
    if (key.startsWith("grid") || key === "place-items" || key === "place-content") {
      result[key] = value as string;
    }
  }
  return result;
}

/**
 * Generate the :host CSS custom properties block.
 */
export function generateHostVariables(layout?: LayoutConfig): string {
  return `:host {
        --layout-margin: ${layout?.margin ?? "0px 4px 0px 4px"};
        --layout-padding: ${layout?.padding ?? "4px 0px 4px 0px"};
        --layout-height: ${layout?.height ?? "auto"};
        --layout-overflow: ${layout?.height !== undefined ? "auto" : "visible"};
      }`;
}

/**
 * Generate CSS for layout-level tint.
 */
export function generateTintCss(tint?: string): string {
  if (!tint) return "";
  return `#root { background-color: ${tint}; }`;
}

/**
 * Generate CSS for layout-level backdrop blur.
 */
export function generateBackdropBlurCss(blur?: string): string {
  if (!blur) return "";
  return `#root { backdrop-filter: blur(${blur}); -webkit-backdrop-filter: blur(${blur}); }`;
}

/**
 * Generate CSS for layout-level zoom.
 */
export function generateZoomCss(zoom?: number | string): string {
  if (zoom == null) return "";
  return `#root { zoom: ${zoom}; }`;
}

/**
 * Generate CSS custom properties on :host from a variables map.
 */
export function generateVariablesCss(variables?: Record<string, string>): string {
  if (!variables) return "";
  const vars = Object.entries(variables)
    .map(([k, v]) => `--${k}: ${v};`)
    .join(" ");
  return `:host { ${vars} }`;
}

/**
 * Generate kiosk mode CSS (fixed position, hidden scrollbars).
 */
export function generateKioskCss(kiosk?: boolean): string {
  if (!kiosk) return "";
  return `
        #root {
          position: fixed !important;
          bottom: 0;
          right: 0;
          left: var(--mdc-drawer-width, 0px);
          top: var(--kiosk-header-height, calc(var(--header-height, 56px) + var(--safe-area-inset-top, 0px) + var(--view-container-padding-top, 0px)));
          margin: 0 !important;
          padding: 0 !important;
        }
        #root.edit-mode {
          top: calc(var(--header-height, 56px) + var(--tab-bar-height, 56px) - 2px + var(--safe-area-inset-top, 0px));
        }
        .section-container {
          overflow-y: scroll;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
          margin: 0 !important;
        }
        .section-container::-webkit-scrollbar {
          display: none;
        }`;
}

/**
 * Generate the kiosk-disable override CSS block (used inside @media).
 */
export function generateKioskDisableCss(): string {
  return `
          #root {
            position: relative !important;
            top: 0;
            bottom: auto;
            left: auto;
            right: auto;
            height: auto;
            min-height: 100vh;
            overflow: visible;
            margin: var(--layout-margin) !important;
            padding: var(--layout-padding, 12px) !important;
            gap: 8px;
            grid-template-rows: auto;
            grid-auto-rows: max-content;
          }
          #root.edit-mode {
            top: 0;
          }
          .section-container {
            height: auto;
          }`;
}

/**
 * Generate @media CSS rules from layout-level mediaquery overrides.
 * The evaluateCss callback handles template resolution for custom_css fields.
 */
export function generateLayoutMediaCss(
  layout: LayoutConfig,
  evaluateCss: (css: string) => string
): string {
  if (!layout.mediaquery) return "";
  let mediaCss = "";
  for (const [queryKey, overrides] of Object.entries(layout.mediaquery)) {
    const resolved = resolveMediaQuery(queryKey, layout.breakpoints);
    const rules: string[] = [];
    if (layout.kiosk && (overrides as any).kiosk === false) {
      rules.push(generateKioskDisableCss());
    }
    if ((overrides as any).zoom != null) {
      rules.push(`#root { zoom: ${(overrides as any).zoom}; }`);
    }
    if ((overrides as any).tint) {
      rules.push(`#root { background-color: ${(overrides as any).tint}; }`);
    }
    if ((overrides as any).backdrop_blur) {
      rules.push(`#root { backdrop-filter: blur(${(overrides as any).backdrop_blur}); -webkit-backdrop-filter: blur(${(overrides as any).backdrop_blur}); }`);
    }
    if ((overrides as any).variables) {
      const vars = Object.entries((overrides as any).variables)
        .map(([k, v]) => `--${k}: ${v};`)
        .join(" ");
      rules.push(`:host { ${vars} }`);
    }
    if ((overrides as any).custom_css) {
      rules.push(evaluateCss((overrides as any).custom_css));
    }
    if (rules.length) {
      mediaCss += `@media ${resolved} { ${rules.join("\n")} }\n`;
    }
  }
  return mediaCss;
}

/**
 * Generate @media CSS rules from per-section mediaquery overrides.
 */
export function generateSectionMediaCss(
  sections: SectionConfig[],
  breakpoints: Record<string, string> | undefined,
  evaluateCss: (css: string) => string
): string {
  if (!sections?.length) return "";
  let sectionMediaCss = "";
  for (const section of sections) {
    if (!section.mediaquery || !section.grid_area) continue;
    for (const [queryKey, overrides] of Object.entries(section.mediaquery)) {
      const resolved = resolveMediaQuery(queryKey, breakpoints);
      const props: string[] = [];
      const o = overrides as any;
      if (o.tint) props.push(`background-color: ${o.tint} !important;`);
      if (o.padding != null) props.push(`padding: ${o.padding} !important;`);
      if (o.background) props.push(`background: ${o.background} !important;`);
      if (o.backdrop_blur) {
        props.push(`backdrop-filter: blur(${o.backdrop_blur}) !important;`);
        props.push(`-webkit-backdrop-filter: blur(${o.backdrop_blur}) !important;`);
      }
      if (o.zoom != null) props.push(`zoom: ${o.zoom} !important;`);
      if (o.overflow) props.push(`overflow: ${o.overflow} !important;`);
      if (o.display) props.push(`display: ${o.display} !important;`);
      if (o.variables) {
        for (const [k, v] of Object.entries(o.variables)) {
          props.push(`--${k}: ${v} !important;`);
        }
      }
      let sectionRules = "";
      if (props.length) {
        sectionRules += `.section-${section.grid_area} { ${props.join(" ")} }`;
      }
      if (o.custom_css) {
        sectionRules += "\n" + evaluateCss(o.custom_css);
      }
      if (sectionRules) {
        sectionMediaCss += `@media ${resolved} { ${sectionRules} }\n`;
      }
    }
  }
  return sectionMediaCss;
}

/**
 * Compute inline styles for a section container from its config.
 * Returns a map of CSS property → value.
 */
export function computeSectionStyles(section: SectionConfig): Record<string, string> {
  const styles: Record<string, string> = {};
  if (section.grid_area) styles["grid-area"] = section.grid_area;
  if (section.background) styles["background"] = section.background;
  if (section.backdrop_blur) {
    styles["backdrop-filter"] = `blur(${section.backdrop_blur})`;
    styles["-webkit-backdrop-filter"] = `blur(${section.backdrop_blur})`;
  }
  if (section.zoom != null) styles["zoom"] = String(section.zoom);
  if (section.overflow) styles["overflow"] = section.overflow;
  if (section.padding != null) styles["padding"] = String(section.padding);
  if (section.tint) styles["background-color"] = section.tint;
  return styles;
}

/**
 * Compute CSS custom properties for a section from its variables config.
 * Returns a map of --name → value.
 */
export function computeSectionVariables(variables?: Record<string, string>): Record<string, string> {
  if (!variables) return {};
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(variables)) {
    result[`--${k}`] = String(v);
  }
  return result;
}

/**
 * Compute CSS classes for a section container.
 */
export function computeSectionClasses(
  section: SectionConfig,
  editMode: boolean
): string[] {
  const classes = ["section-container"];
  if (editMode) classes.push("edit-mode");
  if (section.grid_area) classes.push(`section-${section.grid_area}`);
  if (section.scrollable) classes.push("scrollable");
  return classes;
}

/**
 * Compute CSS variable properties for an overlay element from its config.
 * Returns a map of CSS variable name → value.
 */
export function computeOverlayStyles(cfg: OverlayConfig): Record<string, string> {
  const styles: Record<string, string> = {};
  if (cfg.color) styles["--sgl-overlay-color"] = cfg.color;
  if (cfg.duration) styles["--sgl-overlay-duration"] = cfg.duration;
  if (cfg.backdrop_blur) styles["--sgl-overlay-blur"] = cfg.backdrop_blur;
  if (cfg.font_size) styles["--sgl-overlay-font-size"] = cfg.font_size;
  if (cfg.z_index != null) styles["--sgl-overlay-z-index"] = String(cfg.z_index);
  if (cfg.background) styles["background"] = cfg.background;
  return styles;
}

/**
 * Determine the default animation type for an overlay.
 */
export function getOverlayAnimation(cfg: OverlayConfig): string {
  return cfg.animation ?? "pulse";
}

/**
 * Determine whether an overlay should be active given the current entity state.
 */
export function isOverlayActive(
  cfg: OverlayConfig,
  entityState: string | undefined
): boolean {
  const targetState = cfg.state ?? "on";
  return entityState === targetState;
}
