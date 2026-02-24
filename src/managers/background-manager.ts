/**
 * Manages the full-viewport background image element.
 * Creates a fixed-position div on document.body with blur/opacity support
 * and Jinja template evaluation for dynamic image URLs.
 */

export interface BackgroundConfig {
  background_image?: string;
  background_blur?: string;
  background_opacity?: number;
}

export class BackgroundManager {
  private _lastBackgroundImage?: string;
  private _bgElementId: string = `sgl-bg-${Math.random().toString(36).slice(2, 8)}`;
  private _hostElement: HTMLElement;

  constructor(hostElement: HTMLElement) {
    this._hostElement = hostElement;
  }

  /**
   * Set up the background from config.
   * Static URLs are applied immediately; template URLs are evaluated with hass.
   */
  setup(config: BackgroundConfig, hass: any): void {
    const template = config.background_image;
    if (!template) return;
    if (!template.includes("{{") && !template.includes("{%")) {
      this._updateBackgroundWithImage(template, config);
      return;
    }
    this.evaluateTemplate(config, hass);
  }

  /**
   * Re-evaluate a templated background_image against current hass state.
   */
  evaluateTemplate(config: BackgroundConfig, hass: any): void {
    const template = config.background_image;
    if (!template || !hass) return;
    try {
      const statesMatch = template.match(/states\(['"]([^'"]+)['"]\)/);
      if (statesMatch) {
        const val = hass.states[statesMatch[1]]?.state;
        if (val && val !== "unknown" && val !== "unavailable") {
          this._updateBackgroundWithImage(val, config);
        }
        return;
      }
      const attrMatch = template.match(/state_attr\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)/);
      if (attrMatch) {
        const val = hass.states[attrMatch[1]]?.attributes?.[attrMatch[2]];
        if (val) this._updateBackgroundWithImage(val, config);
        return;
      }
      this._updateBackgroundWithImage(template, config);
    } catch {
      this._updateBackgroundWithImage(template, config);
    }
  }

  /**
   * Remove the background element from the DOM and clear memoized state.
   */
  destroy(): void {
    document.getElementById(this._bgElementId)?.remove();
    this._lastBackgroundImage = undefined;
  }

  private _updateBackgroundWithImage(bgImage: string, config: BackgroundConfig): void {
    if (!bgImage || bgImage === "null" || bgImage === "undefined") return;
    if (bgImage === this._lastBackgroundImage) return;
    this._lastBackgroundImage = bgImage;

    const blur = config.background_blur || "0px";
    const opacity = config.background_opacity ?? 1;
    const headerHeight = this._getHeaderHeight();

    // Attach to document.body so position:fixed is relative to the viewport,
    // not broken by ancestor transforms/filters inside HA's layout containers.
    let bgEl = document.getElementById(this._bgElementId);
    if (!bgEl) {
      bgEl = document.createElement("div");
      bgEl.id = this._bgElementId;
      Object.assign(bgEl.style, {
        position: "fixed", left: "0", right: "0", bottom: "0",
        backgroundPosition: "center", backgroundRepeat: "no-repeat",
        backgroundSize: "cover", zIndex: "-1",
        pointerEvents: "none",
      });
      document.body.appendChild(bgEl);
    }
    bgEl.style.top = `${headerHeight}px`;
    bgEl.style.backgroundImage = `url('${bgImage}')`;
    bgEl.style.filter = `blur(${blur})`;
    bgEl.style.opacity = opacity.toString();
  }

  private _getHeaderHeight(): number {
    if (this._hostElement.closest("hui-panel-view")) return 0;
    const candidates = [
      document.querySelector("app-header"),
      document.querySelector(".header"),
      document.querySelector("ha-app-layout")?.querySelector("[slot='header']"),
    ];
    for (const el of candidates) {
      if (el) return (el as HTMLElement).getBoundingClientRect().height;
    }
    return 0;
  }
}
