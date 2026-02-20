import { css, html, LitElement } from "lit";
import { property } from "lit/decorators.js";
import {
  CardConfig,
  CardConfigGroup,
  GridViewConfig,
  HuiCard,
  LovelaceCard,
  OverlayConfig,
} from "../types";

class GridLayout extends LitElement {
  // ── External properties set by HA ───────────────────────────────────────
  @property() cards: Array<LovelaceCard | HuiCard> = [];
  @property() index: number;
  @property() narrow: boolean;
  @property() hass: any;
  @property() lovelace: any;
  @property() _editMode: boolean = false;

  // ── Internal state ───────────────────────────────────────────────────────
  _config: GridViewConfig;
  _mediaQueries: Array<MediaQueryList | null> = [];
  _layoutMQs: Array<MediaQueryList | null> = [];
  _lastBackgroundImage?: string;
  _lastEvaluatedCss?: string;
  _trackedEntities: Set<string> = new Set();
  _sectionsCache: Map<number, any> = new Map();
  _updateQueued: boolean = false;
  _savingConfig: boolean = false;
  _overlayStates: Map<number, boolean> = new Map();
  _rendered: boolean = false;
  _dialogObserver: MutationObserver | null = null;

  // Stable bound handlers so addEventListener/removeEventListener match
  _onCardMQChange = () => this._placeCards();
  _onLayoutMQChange = () => this._setGridStyles();

  // ── Lifecycle ────────────────────────────────────────────────────────────

  async setConfig(config: GridViewConfig) {
    this._config = { ...config };
    // Allow `view_layout:` as an alias for `layout:`
    if (this._config.view_layout && this._config.layout === undefined) {
      this._config.layout = this._config.view_layout;
    }

    // Per-card media query listeners (view-level cards only; normally empty
    // in sections mode but kept for backward compat)
    this._mediaQueries.forEach(mq => mq?.removeEventListener("change", this._onCardMQChange));
    this._mediaQueries = [];
    for (const card of (this._config.cards || [])) {
      if (typeof card.view_layout?.show !== "string" && card.view_layout?.show?.mediaquery) {
        const mq = window.matchMedia(`${card.view_layout.show.mediaquery}`);
        this._mediaQueries.push(mq);
        mq.addEventListener("change", this._onCardMQChange);
      } else {
        this._mediaQueries.push(null);
      }
    }

    // Layout-level media query listeners
    this._layoutMQs.forEach(mq => mq?.removeEventListener("change", this._onLayoutMQChange));
    this._layoutMQs = [];
    if (this._config.layout?.mediaquery) {
      for (const query of Object.keys(this._config.layout.mediaquery)) {
        const mq = window.matchMedia(query);
        this._layoutMQs.push(mq);
        mq.addEventListener("change", this._onLayoutMQChange);
      }
    }

    this._setGridStyles();

    if (this._rendered) {
      this._createOverlays();
      this._updateOverlayStates();
    }
  }

  async updated(changedProperties: Map<string, any>) {
    // Edit mode: propagate to view-level cards and update internal flag
    const editModeChanged =
      changedProperties.has("lovelace") &&
      this.lovelace?.editMode !== changedProperties.get("lovelace")?.editMode;
    if (editModeChanged) {
      this.cards.forEach((c) => (c.editMode = this.lovelace?.editMode));
      this._editMode = this.lovelace?.editMode ?? false;
      this._createOverlays(); // call directly here — reliable, no secondary property-change cycle needed
    }

    // Keep CSS class in sync with edit mode
    const root = this.shadowRoot?.querySelector("#root") as HTMLElement;
    if (root) root.classList.toggle("edit-mode", !!this.lovelace?.editMode);

    // Hass: propagate to sections; re-evaluate templates if tracked entities changed
    if (changedProperties.has("hass")) {
      this._queueSectionHassUpdate();
      if (this._hasTrackedEntitiesChanged(changedProperties)) {
        const layout = this._config?.layout;
        if (layout?.background_image &&
            (layout.background_image.includes("{{") || layout.background_image.includes("{%"))) {
          this._evaluateTemplate();
        }
        if (layout?.custom_css &&
            (layout.custom_css.includes("{{") || layout.custom_css.includes("{%"))) {
          this._updateStyles();
        }
        this._updateOverlayStates();
      }
    }

    if (changedProperties.has("lovelace")) this._updateSectionsLovelace();

    if (changedProperties.has("cards")) {
      this._sectionsCache.clear();
      this._placeCards();
    } else if (changedProperties.has("_editMode")) {
      this._sectionsCache.clear();
      if (this._editMode) {
        this._ensureAllSectionsExistInConfig();
      } else {
        this._placeCards();
      }
    }
  }

  async firstUpdated() {
    this._rendered = true;
    this._setGridStyles();
    this._extractEntitiesFromTemplates();
    this._setupTemplateSubscription();

    const styleEl = document.createElement("style");
    styleEl.id = "layout-styles";
    this.shadowRoot.appendChild(styleEl);
    this._updateStyles();

    this._createOverlays();
    if (this.hass) this._updateOverlayStates();

    if (this.lovelace?.editMode) this._ensureAllSectionsExistInConfig();
    this._setupDialogObserver();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._mediaQueries.forEach(mq => mq?.removeEventListener("change", this._onCardMQChange));
    this._layoutMQs.forEach(mq => mq?.removeEventListener("change", this._onLayoutMQChange));
    this._overlayStates.clear();
    this._dialogObserver?.disconnect();
    this._dialogObserver = null;
  }

  _setupDialogObserver() {
    if (this._dialogObserver) return;
    this._dialogObserver = new MutationObserver(() => {
      const tester = this.shadowRoot?.querySelector(".sgl-overlay-tester") as HTMLElement;
      if (!tester) return;
      const dialogOpen = !!document.querySelector("ha-dialog, ha-more-info-dialog, dialog[open]");
      tester.style.display = dialogOpen ? "none" : "";
    });
    this._dialogObserver.observe(document.body, { childList: true, subtree: true });
  }

  // ── Card helpers (used for view-level loose cards) ────────────────────────

  _shouldShow(card: LovelaceCard | HuiCard, config: CardConfig, index: number): boolean {
    if (config.view_layout?.show === "always") return true;
    if (config.view_layout?.show === "never") return false;
    if (config.view_layout?.show?.sidebar === "shown" &&
        (this.hass?.dockedSidebar === "auto" || this.narrow)) return false;
    if (config.view_layout?.show?.sidebar === "hidden" &&
        this.hass?.dockedSidebar === "docked" && !this.narrow) return false;
    const mq = this._mediaQueries[index];
    if (mq) return mq.matches;
    return true;
  }

  getCardElement(card: CardConfigGroup) {
    if (!this.lovelace?.editMode) return card.card;
    const wrapper = document.createElement("hui-card-options") as any;
    wrapper.hass = this.hass;
    wrapper.lovelace = this.lovelace;
    wrapper.path = [this.index, card.index];
    card.card.editMode = true;
    wrapper.appendChild(card.card);
    if (card.show === false) wrapper.style.border = "1px solid red";
    return wrapper;
  }

  // ── Section hass / lovelace propagation ──────────────────────────────────

  _queueSectionHassUpdate() {
    if (this._updateQueued) return;
    this._updateQueued = true;
    requestAnimationFrame(() => {
      this.shadowRoot.querySelectorAll("hui-section").forEach((s: any) => {
        s.hass = this.hass;
      });
      this._updateQueued = false;
    });
  }

  _updateSectionsLovelace() {
    const liveSections: any[] =
      (this.lovelace?.config?.views?.[this.index]?.sections as any[]) ?? [];
    this.shadowRoot.querySelectorAll("hui-section").forEach((section: any) => {
      section.lovelace = this.lovelace;
      if (section.config?.grid_area) {
        const fresh = liveSections.find((s: any) => s.grid_area === section.config.grid_area);
        if (fresh) section.config = fresh;
      }
    });
  }

  // ── Grid styles ──────────────────────────────────────────────────────────

  _setGridStyles() {
    const root = this.shadowRoot?.querySelector("#root") as HTMLElement;
    if (!root) return;
    root.style.cssText = "";
    const apply = (layout: Record<string, any>) => {
      for (const [key, value] of Object.entries(layout)) {
        if (key.startsWith("grid") || key === "place-items" || key === "place-content")
          root.style.setProperty(key, value as string);
      }
    };
    if (this._config?.layout) apply(this._config.layout);
    for (const mq of this._layoutMQs) {
      if (mq?.matches) {
        apply(this._config.layout.mediaquery[mq.media]);
        break;
      }
    }
  }

  _updateStyles() {
    const styleEl = this.shadowRoot?.querySelector("#layout-styles") as HTMLStyleElement;
    if (!styleEl) return;
    const layout = this._config?.layout;
    const customCss = this._evaluateCssTemplates(layout?.custom_css || "");

    let kioskCss = "";
    if (layout?.kiosk) {
      kioskCss = `
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

    let zoomCss = "";
    if (layout?.zoom != null) {
      zoomCss = `#root { zoom: ${layout.zoom}; }`;
    }

    // Generate @media overrides for kiosk and zoom from mediaquery config
    let mediaCss = "";
    if (layout?.mediaquery) {
      for (const [query, overrides] of Object.entries(layout.mediaquery)) {
        const rules: string[] = [];
        if (layout.kiosk && (overrides as any).kiosk === false) {
          rules.push(`
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
          }`);
        }
        if ((overrides as any).zoom != null) {
          rules.push(`#root { zoom: ${(overrides as any).zoom}; }`);
        }
        if (rules.length) {
          mediaCss += `@media ${query} { ${rules.join("\n")} }`;
        }
      }
    }

    let overlayCss = "";
    const overlays = this._config?.layout?.overlays;
    if (overlays) {
      for (const overlay of overlays) {
        if (overlay.custom_css) {
          overlayCss += this._evaluateCssTemplates(overlay.custom_css);
        }
      }
    }

    styleEl.innerHTML = `
      :host {
        --layout-margin: ${layout?.margin ?? "0px 4px 0px 4px"};
        --layout-padding: ${layout?.padding ?? "4px 0px 4px 0px"};
        --layout-height: ${layout?.height ?? "auto"};
        --layout-overflow: ${layout?.height !== undefined ? "auto" : "visible"};
      }
      ${kioskCss}
      ${zoomCss}
      ${mediaCss}
      ${customCss}
      ${overlayCss}`;
  }

  // ── Template evaluation ──────────────────────────────────────────────────

  _hasTrackedEntitiesChanged(changedProperties: Map<string, any>): boolean {
    if (!changedProperties.has("hass")) return false;
    const oldHass = changedProperties.get("hass");
    if (!oldHass || !this.hass) return true;
    for (const entityId of this._trackedEntities) {
      if (oldHass.states[entityId]?.state !== this.hass.states[entityId]?.state) return true;
    }
    return false;
  }

  _extractEntitiesFromTemplates() {
    this._trackedEntities.clear();
    const extract = (str: string) => {
      if (!str) return;
      for (const re of [
        /is_state\(['"]([^'"]+)['"]/g,
        /states\(['"]([^'"]+)['"]/g,
        /state_attr\(['"]([^'"]+)['"]/g,
      ]) {
        let m;
        while ((m = re.exec(str)) !== null) this._trackedEntities.add(m[1]);
      }
    };
    extract(this._config.layout?.custom_css);
    extract(this._config.layout?.background_image);
    const overlays = this._config.layout?.overlays;
    if (overlays) {
      for (const overlay of overlays) {
        if (overlay.entity) this._trackedEntities.add(overlay.entity);
        extract(overlay.custom_css);
        extract(overlay.content);
      }
    }
  }

  _evaluateCssTemplates(css: string): string {
    if (!css || !this.hass) return css;
    if (!css.includes("{{") && !css.includes("{%")) return css;
    if (css === this._lastEvaluatedCss) return css;
    try {
      let out = css;
      out = out.replace(
        /\{%\s*if\s+is_state\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g,
        (_, eid, expected, content) => {
          this._trackedEntities.add(eid);
          return this.hass.states[eid]?.state === expected ? content : "";
        }
      );
      out = out.replace(
        /\{%\s*if\s+not\s+is_state\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g,
        (_, eid, expected, content) => {
          this._trackedEntities.add(eid);
          return this.hass.states[eid]?.state !== expected ? content : "";
        }
      );
      out = out.replace(/\{\{\s*states\(['"]([^'"]+)['"]\)\s*\}\}/g, (m, eid) => {
        this._trackedEntities.add(eid);
        return this.hass.states[eid]?.state ?? m;
      });
      out = out.replace(/\{\{\s*state_attr\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)\s*\}\}/g,
        (m, eid, attr) => {
          this._trackedEntities.add(eid);
          const val = this.hass.states[eid]?.attributes?.[attr];
          return val !== undefined ? val : m;
        }
      );
      this._lastEvaluatedCss = out;
      return out;
    } catch {
      return css;
    }
  }

  // ── Overlays ─────────────────────────────────────────────────────────

  _createOverlays() {
    this.shadowRoot.querySelectorAll(".sgl-overlay").forEach(el => el.remove());
    this.shadowRoot.querySelectorAll(".sgl-overlay-tester").forEach(el => el.remove());
    this._overlayStates.clear();

    const overlays = this._config?.layout?.overlays;
    if (!overlays?.length) return;

    for (let i = 0; i < overlays.length; i++) {
      const cfg = overlays[i];

      const el = document.createElement("div");
      el.className = "sgl-overlay";
      el.setAttribute("data-overlay-index", String(i));
      el.setAttribute("data-animation", cfg.animation ?? "pulse");

      // CSS variables for animation customisation
      if (cfg.color) el.style.setProperty("--sgl-overlay-color", cfg.color);
      if (cfg.duration) el.style.setProperty("--sgl-overlay-duration", cfg.duration);
      if (cfg.backdrop_blur) el.style.setProperty("--sgl-overlay-blur", cfg.backdrop_blur);
      if (cfg.font_size) el.style.setProperty("--sgl-overlay-font-size", cfg.font_size);
      if (cfg.z_index != null) el.style.setProperty("--sgl-overlay-z-index", String(cfg.z_index));
      if (cfg.background) el.style.background = cfg.background;

      const contentEl = document.createElement("div");
      contentEl.className = "sgl-overlay-content";
      if (cfg.text_shadow) contentEl.style.textShadow = cfg.text_shadow;
      el.appendChild(contentEl);

      this.shadowRoot.appendChild(el);
    }

    // Edit mode: show test panel
    if (this._editMode) this._createOverlayTester(overlays);
  }

  _createOverlayTester(overlays: OverlayConfig[]) {
    const tester = document.createElement("div");
    tester.className = "sgl-overlay-tester";

    const header = document.createElement("div");
    header.className = "sgl-overlay-tester-header";

    const title = document.createElement("div");
    title.className = "sgl-overlay-tester-title";
    title.textContent = "Overlays";

    const minimizeBtn = document.createElement("button");
    minimizeBtn.className = "sgl-overlay-tester-minimize";
    minimizeBtn.textContent = "−";
    minimizeBtn.title = "Minimize";
    minimizeBtn.addEventListener("click", () => {
      const collapsed = tester.classList.toggle("collapsed");
      minimizeBtn.textContent = collapsed ? "+" : "−";
      minimizeBtn.title = collapsed ? "Expand" : "Minimize";
      // Directly toggle visibility so we don't rely on CSS alone
      title.style.display = collapsed ? "none" : "";
      body.style.display = collapsed ? "none" : "";
      tester.style.minWidth = collapsed ? "0" : "";
      tester.style.padding = collapsed ? "4px" : "";
      tester.style.borderRadius = collapsed ? "50%" : "";
    });

    header.append(title, minimizeBtn);
    tester.appendChild(header);

    const body = document.createElement("div");
    body.className = "sgl-overlay-tester-body";

    for (let i = 0; i < overlays.length; i++) {
      const cfg = overlays[i];
      const row = document.createElement("div");
      row.className = "sgl-overlay-tester-row";

      const label = document.createElement("span");
      label.className = "sgl-overlay-tester-label";
      label.textContent = `${cfg.content || "overlay"} — ${cfg.entity}`;

      const btn = document.createElement("button");
      btn.className = "sgl-overlay-tester-btn";
      btn.textContent = "Test";
      btn.addEventListener("click", () => this._testOverlay(i));

      row.append(label, btn);
      body.appendChild(row);
    }

    tester.appendChild(body);
    this.shadowRoot.appendChild(tester);
  }

  _testOverlay(index: number) {
    const el = this.shadowRoot.querySelector(
      `.sgl-overlay[data-overlay-index="${index}"]`
    ) as HTMLElement;
    if (!el) return;

    // Update content before testing
    const cfg = this._config?.layout?.overlays?.[index];
    if (cfg?.content) {
      const contentEl = el.querySelector(".sgl-overlay-content") as HTMLElement;
      if (contentEl) contentEl.textContent = this._evaluateOverlayContent(cfg.content);
    }

    el.classList.remove("active");
    void el.offsetWidth; // force reflow to restart animation
    el.classList.add("active");

    // Auto-remove active class after animation ends
    const duration = parseFloat(cfg?.duration || "3") * 1000;
    setTimeout(() => el.classList.remove("active"), duration + 100);
  }

  _updateOverlayStates() {
    const overlays = this._config?.layout?.overlays;
    if (!overlays?.length || !this.hass) return;

    for (let i = 0; i < overlays.length; i++) {
      const cfg = overlays[i];
      const targetState = cfg.state ?? "on";
      const currentState = this.hass.states[cfg.entity]?.state;
      const isActive = currentState === targetState;
      const wasActive = this._overlayStates.get(i) ?? false;

      const el = this.shadowRoot.querySelector(
        `.sgl-overlay[data-overlay-index="${i}"]`
      ) as HTMLElement;
      if (!el) continue;

      // Update content (may have Jinja templates)
      const contentEl = el.querySelector(".sgl-overlay-content") as HTMLElement;
      if (contentEl && cfg.content) {
        contentEl.textContent = this._evaluateOverlayContent(cfg.content);
      }

      if (isActive && !wasActive) {
        el.classList.remove("active");
        void el.offsetWidth; // force reflow to restart animation
        el.classList.add("active");
      } else if (!isActive && wasActive) {
        el.classList.remove("active");
      }

      this._overlayStates.set(i, isActive);
    }
  }

  _evaluateOverlayContent(content: string): string {
    if (!content || !this.hass) return content || "";
    if (!content.includes("{{")) return content;
    let out = content;
    out = out.replace(/\{\{\s*states\(['"]([^'"]+)['"]\)\s*\}\}/g, (m, eid) => {
      return this.hass.states[eid]?.state ?? m;
    });
    out = out.replace(
      /\{\{\s*state_attr\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)\s*\}\}/g,
      (m, eid, attr) => {
        const val = this.hass.states[eid]?.attributes?.[attr];
        return val !== undefined ? String(val) : m;
      }
    );
    return out;
  }

  // ── Background image ─────────────────────────────────────────────────────

  _setupTemplateSubscription() {
    const template = this._config.layout?.background_image;
    if (!template) return;
    if (!template.includes("{{") && !template.includes("{%")) {
      this._updateBackgroundWithImage(template);
      return;
    }
    this._evaluateTemplate();
  }

  _evaluateTemplate() {
    const template = this._config.layout?.background_image;
    if (!template || !this.hass) return;
    try {
      const statesMatch = template.match(/states\(['"]([^'"]+)['"]\)/);
      if (statesMatch) {
        const val = this.hass.states[statesMatch[1]]?.state;
        if (val && val !== "unknown" && val !== "unavailable") this._updateBackgroundWithImage(val);
        return;
      }
      const attrMatch = template.match(/state_attr\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)/);
      if (attrMatch) {
        const val = this.hass.states[attrMatch[1]]?.attributes?.[attrMatch[2]];
        if (val) this._updateBackgroundWithImage(val);
        return;
      }
      this._updateBackgroundWithImage(template);
    } catch {
      this._updateBackgroundWithImage(template);
    }
  }

  _updateBackgroundWithImage(bgImage: string) {
    if (!bgImage || bgImage === "null" || bgImage === "undefined") return;
    if (bgImage === this._lastBackgroundImage) return;
    this._lastBackgroundImage = bgImage;

    const blur = this._config.layout?.background_blur || "0px";
    const opacity = this._config.layout?.background_opacity ?? 1;
    const headerHeight = this._getHeaderHeight();

    let bgEl = this.shadowRoot.querySelector(".background") as HTMLElement;
    if (!bgEl) {
      bgEl = document.createElement("div");
      bgEl.className = "background";
      Object.assign(bgEl.style, {
        position: "fixed", left: "0", right: "0", bottom: "0",
        backgroundPosition: "center", backgroundRepeat: "no-repeat",
        backgroundSize: "cover", backgroundAttachment: "fixed", zIndex: "-1",
      });
      this.shadowRoot.insertBefore(bgEl, this.shadowRoot.firstChild);
    }
    bgEl.style.top = `${headerHeight}px`;
    bgEl.style.backgroundImage = `url('${bgImage}')`;
    bgEl.style.filter = `blur(${blur})`;
    bgEl.style.opacity = opacity.toString();
  }

  _getHeaderHeight(): number {
    if (this.closest("hui-panel-view")) return 0;
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

  // ── Card / section placement ──────────────────────────────────────────────

  async _placeCards() {
    const root = this.shadowRoot.querySelector("#root") as HTMLElement;
    while (root.firstChild) root.removeChild(root.firstChild);

    if (this._config.sections?.length > 0) {
      await this._placeNativeSections(root);
      return;
    }

    // Fallback: view-level cards placed by grid-area (no sections defined)
    for (const [index, card] of (this.cards || []).entries()) {
      const config = (this._config.cards || [])[index];
      if (!config) continue;
      const group: CardConfigGroup = {
        card, config, index,
        show: this._shouldShow(card, config, index),
      };
      if (!this.lovelace?.editMode && !group.show) continue;
      const el = this.getCardElement(group) as HTMLElement;
      for (const [key, value] of Object.entries(config.view_layout ?? {})) {
        if (key.startsWith("grid") || key === "place-self")
          el.style.setProperty(key, value as string);
      }
      root.appendChild(el);
    }
  }

  async _placeNativeSections(root: Element) {
    const isEditMode = this.lovelace?.editMode;
    const allGridAreas = this._detectAllGridAreas();
    const sectionsToRender = this._ensureSectionsForAllAreas(allGridAreas);

    const liveSections: any[] =
      (this.lovelace?.config?.views?.[this.index]?.sections as any[]) ??
      this._config.sections ?? [];

    for (let i = 0; i < sectionsToRender.length; i++) {
      const sectionConfig = sectionsToRender[i];

      // Skip empty sections outside edit mode
      if (!isEditMode && (!sectionConfig.cards || sectionConfig.cards.length === 0)) continue;

      const configIndex = liveSections.findIndex(
        (s: any) => s.grid_area === sectionConfig.grid_area
      );
      const sectionIndex = configIndex >= 0 ? configIndex : i;

      const container = document.createElement("div");
      const classes = ["section-container"];
      if (isEditMode) classes.push("edit-mode");
      if (sectionConfig.grid_area) classes.push(`section-${sectionConfig.grid_area}`);
      container.className = classes.join(" ");

      if (sectionConfig.grid_area) {
        container.style.gridArea = sectionConfig.grid_area;
        container.setAttribute("data-grid-area", sectionConfig.grid_area);
      }

      // Per-section styling
      if (sectionConfig.scrollable) {
        container.classList.add("scrollable");
      }
      if (sectionConfig.background) {
        container.style.background = sectionConfig.background;
      }
      if (sectionConfig.backdrop_blur) {
        container.style.backdropFilter = `blur(${sectionConfig.backdrop_blur})`;
        (container.style as any).webkitBackdropFilter = `blur(${sectionConfig.backdrop_blur})`;
      }
      if (sectionConfig.zoom != null) {
        (container.style as any).zoom = String(sectionConfig.zoom);
      }
      if (sectionConfig.overflow) {
        container.style.overflow = sectionConfig.overflow;
      }

      if (isEditMode && sectionConfig.grid_area) {
        const label = document.createElement("div");
        label.className = "section-grid-label";
        label.addEventListener("click", (e) => {
          e.stopPropagation();
          this._openSectionEditor(sectionConfig.grid_area, sectionIndex);
        });

        const nameSpan = document.createElement("span");
        nameSpan.className = "section-grid-label-text";
        nameSpan.textContent = sectionConfig.grid_area;
        label.appendChild(nameSpan);

        const editOverlay = document.createElement("div");
        editOverlay.className = "section-grid-edit-overlay";
        editOverlay.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/></svg>`;
        label.appendChild(editOverlay);

        container.appendChild(label);
      }

      container.appendChild(await this._createNativeSection(sectionConfig, sectionIndex));
      root.appendChild(container);
    }

    // In edit mode show any view-level cards that aren't in sections
    if (isEditMode && this.cards?.length > 0) {
      root.appendChild(this._createLooseCardsContainer());
    }
  }

  _detectAllGridAreas(): string[] {
    const areas = this._config.layout?.["grid-template-areas"];
    if (!areas) return [];
    const found = new Set<string>();
    for (const line of areas.split("\n").map(l => l.trim()).filter(Boolean)) {
      for (const area of line.replace(/['"]/g, "").split(/\s+/)) {
        if (area !== "." && area !== "") found.add(area);
      }
    }
    return Array.from(found);
  }

  _ensureSectionsForAllAreas(allGridAreas: string[]): any[] {
    if (!allGridAreas.length) return this._config.sections || [];
    const sections = [...(this._config.sections || [])];
    const existing = new Set(sections.map(s => s.grid_area).filter(Boolean));
    for (const area of allGridAreas) {
      if (!existing.has(area)) {
        sections.push({ type: "grid", title: this._formatAreaName(area), grid_area: area, cards: [] });
      }
    }
    return sections;
  }

  _formatAreaName(area: string): string {
    return area.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }

  _createLooseCardsContainer(): HTMLElement {
    const container = document.createElement("div");
    container.className = "loose-cards-container";

    const header = document.createElement("div");
    header.className = "loose-cards-header";
    const title = document.createElement("span");
    title.className = "loose-cards-title";
    title.textContent = "Unassigned Cards";
    const subtitle = document.createElement("span");
    subtitle.className = "loose-cards-subtitle";
    subtitle.textContent = "Drag these cards into sections above";
    header.append(title, subtitle);
    container.appendChild(header);

    const wrapper = document.createElement("div");
    wrapper.className = "loose-cards-wrapper";
    (this.cards || []).forEach((card, index) => {
      const config = (this._config.cards || [])[index];
      if (!config) return;
      const group: CardConfigGroup = { card, config, index, show: this._shouldShow(card, config, index) };
      wrapper.appendChild(this.getCardElement(group) as HTMLElement);
    });
    container.appendChild(wrapper);
    return container;
  }

  async _createNativeSection(config: any, configIndex: number) {
    if (!customElements.get("hui-section")) await customElements.whenDefined("hui-section");
    const section: any = document.createElement("hui-section");
    section.hass = this.hass;
    section.lovelace = this.lovelace;
    section.viewIndex = this.index;
    section.index = configIndex;
    section.config = config;
    section.addEventListener("config-changed", (e: CustomEvent) => {
      e.stopPropagation();
      this._handleSectionConfigChanged(config.grid_area, e.detail.config);
    });
    section.addEventListener("ll-delete-section", (e: CustomEvent) => {
      e.stopPropagation();
      this._handleDeleteSection(config.grid_area);
    });
    return section;
  }

  // ── Section config management ─────────────────────────────────────────────

  _handleSectionConfigChanged(gridArea: string, newSectionConfig: any) {
    if (!this.lovelace || this._savingConfig) return;
    const sections = [...(this.lovelace.config.views[this.index].sections as any[] || [])];
    const idx = sections.findIndex((s: any) => s.grid_area === gridArea);
    const updated = { ...newSectionConfig, grid_area: gridArea };
    if (idx >= 0) sections[idx] = updated;
    else sections.push(updated);
    this._saveViewSections(sections);
  }

  _handleDeleteSection(gridArea: string) {
    if (!this.lovelace || this._savingConfig) return;
    const sections = ((this.lovelace.config.views[this.index].sections as any[]) || [])
      .filter((s: any) => s.grid_area !== gridArea);
    this._saveViewSections(sections);
  }

  async _ensureAllSectionsExistInConfig() {
    if (!this.lovelace || this._savingConfig) {
      this._placeCards();
      return;
    }
    const allGridAreas = this._detectAllGridAreas();
    if (!allGridAreas.length) { this._placeCards(); return; }

    const existing: any[] = (this.lovelace.config.views[this.index].sections as any[]) || [];
    const existingAreas = new Set(existing.map((s: any) => s.grid_area).filter(Boolean));
    const toAdd = allGridAreas.filter(a => !existingAreas.has(a));
    if (!toAdd.length) { this._placeCards(); return; }

    await this._saveViewSections([
      ...existing,
      ...toAdd.map(area => ({ type: "grid", title: this._formatAreaName(area), grid_area: area, cards: [] })),
    ]);
  }

  async _saveViewSections(sections: any[]) {
    if (!this.lovelace || this._savingConfig) return;
    this._savingConfig = true;
    try {
      const views = [...this.lovelace.config.views];
      views[this.index] = { ...views[this.index], sections };
      await this.lovelace.saveConfig({ ...this.lovelace.config, views });
    } catch (e) {
      console.error("sections-grid-layout: failed to save section config", e);
    } finally {
      this._savingConfig = false;
    }
  }

  // ── Section editor ──────────────────────────────────────────────────────

  _openSectionEditor(gridArea: string, _sectionIndex: number) {
    this._openSectionYamlEditor(gridArea);
  }

  _sectionConfigToYaml(config: any): string {
    const SKIP = new Set(["type", "cards", "grid_area"]);
    const lines: string[] = [];
    for (const [key, value] of Object.entries(config)) {
      if (SKIP.has(key)) continue;
      if (value === undefined || value === null) continue;
      if (typeof value === "object") continue;
      lines.push(`${key}: ${typeof value === "string" && value.includes(":") ? `"${value}"` : value}`);
    }
    return lines.join("\n");
  }

  _yamlToSectionConfig(yaml: string): Record<string, any> {
    const result: Record<string, any> = {};
    for (const line of yaml.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx < 0) continue;
      const key = trimmed.slice(0, colonIdx).trim();
      let val: any = trimmed.slice(colonIdx + 1).trim();
      // Strip surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      } else if (val === "true") {
        val = true;
      } else if (val === "false") {
        val = false;
      } else if (val !== "" && !isNaN(Number(val))) {
        val = Number(val);
      }
      result[key] = val;
    }
    return result;
  }

  _openSectionYamlEditor(gridArea: string) {
    // Remove any existing editor
    this.shadowRoot.querySelector(".sgl-yaml-editor")?.remove();

    const liveSections: any[] =
      (this.lovelace?.config?.views?.[this.index]?.sections as any[]) ?? [];
    const sectionConfig = liveSections.find((s: any) => s.grid_area === gridArea) || {};
    const yaml = this._sectionConfigToYaml(sectionConfig);

    const backdrop = document.createElement("div");
    backdrop.className = "sgl-yaml-editor";

    const dialog = document.createElement("div");
    dialog.className = "sgl-yaml-dialog";

    const header = document.createElement("div");
    header.className = "sgl-yaml-header";
    header.textContent = gridArea;

    const textarea = document.createElement("textarea");
    textarea.className = "sgl-yaml-textarea";
    textarea.value = yaml;
    textarea.spellcheck = false;

    const actions = document.createElement("div");
    actions.className = "sgl-yaml-actions";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "sgl-yaml-btn sgl-yaml-btn-cancel";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", () => backdrop.remove());

    const saveBtn = document.createElement("button");
    saveBtn.className = "sgl-yaml-btn sgl-yaml-btn-save";
    saveBtn.textContent = "Save";
    saveBtn.addEventListener("click", () => {
      const parsed = this._yamlToSectionConfig(textarea.value);
      const merged = {
        ...sectionConfig,
        ...parsed,
        type: sectionConfig.type || "grid",
        grid_area: gridArea,
        cards: sectionConfig.cards || [],
      };
      // Remove keys that were deleted from the YAML
      for (const key of Object.keys(sectionConfig)) {
        if (key === "type" || key === "cards" || key === "grid_area") continue;
        if (!(key in parsed)) delete merged[key];
      }
      this._handleSectionConfigChanged(gridArea, merged);
      backdrop.remove();
    });

    actions.append(cancelBtn, saveBtn);
    dialog.append(header, textarea, actions);
    backdrop.appendChild(dialog);

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) backdrop.remove();
    });

    this.shadowRoot.appendChild(backdrop);
    textarea.focus();
  }

  // ── FAB (Add card) ──────────────────────────────────────────────────────

  _addCard() {
    this.dispatchEvent(new CustomEvent("ll-create-card"));
  }

  _render_fab() {
    // In sections mode hui-section provides its own per-section "Add card"
    // buttons, so the view-level FAB would only add orphan cards.
    if (this._config?.sections?.length) return html``;
    if (!this.lovelace?.editMode) return html``;
    return html`
      <ha-fab .label=${"Add card"} extended @click=${this._addCard}>
        <ha-icon slot="icon" .icon=${"mdi:plus"}></ha-icon>
      </ha-fab>
    `;
  }

  // ── Render ───────────────────────────────────────────────────────────────

  render() {
    return html`<div id="root"></div>${this._render_fab()}`;
  }

  static get styles() {
    return css`
      ha-fab {
        position: fixed;
        right: calc(16px + env(safe-area-inset-right));
        bottom: calc(16px + env(safe-area-inset-bottom));
        z-index: 1;
      }
      :host {
        height: 100%;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
      }
      #root {
        display: grid;
        justify-content: stretch;
        margin: var(--layout-margin);
        padding: var(--layout-padding);
        flex: 1;
        min-height: 0;
        overflow-y: var(--layout-overflow);
      }
      #root > *:not(.loose-cards-container) {
        margin: var(--grid-section-margin, 4px 4px 8px);
      }

      /* Section containers */
      .section-container {
        position: relative;
        display: flex;
        flex-direction: column;
      }
      .section-container.scrollable {
        overflow-y: auto;
        scrollbar-width: none;
        -webkit-overflow-scrolling: touch;
      }
      .section-container.scrollable::-webkit-scrollbar {
        display: none;
      }
      .section-container.edit-mode {
        border: 2px dashed var(--primary-color, #03a9f4);
        border-radius: 8px;
        padding: 8px;
        background: rgba(var(--rgb-primary-color, 3, 169, 244), 0.05);
        transition: all 0.2s ease;
      }
      .section-container.edit-mode:hover {
        background: rgba(var(--rgb-primary-color, 3, 169, 244), 0.1);
        border-color: var(--accent-color, #ff9800);
      }
      .section-grid-label {
        position: absolute;
        bottom: 4px;
        right: 4px;
        display: inline-flex;
        align-items: center;
        background: var(--primary-color, #03a9f4);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        opacity: 0.4;
        z-index: 1;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        backdrop-filter: blur(4px);
        transition: opacity 0.15s;
        cursor: pointer;
        pointer-events: auto;
        white-space: nowrap;
        overflow: hidden;
      }
      .section-grid-edit-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.55);
        border-radius: 4px;
        opacity: 0;
        transition: opacity 0.15s;
      }
      .section-grid-label:hover .section-grid-edit-overlay {
        opacity: 1;
      }
      .section-container.edit-mode:hover .section-grid-label {
        opacity: 0.7;
      }
      .section-container.edit-mode:has(hui-section:empty),
      .section-container.edit-mode:has(hui-section[cards=""]) {
        border-style: dotted;
        background: rgba(var(--rgb-primary-color, 3, 169, 244), 0.02);
      }
      .section-container.edit-mode:has(hui-section:empty):hover,
      .section-container.edit-mode:has(hui-section[cards=""]):hover {
        background: rgba(var(--rgb-accent-color, 255, 152, 0), 0.08);
        border-color: var(--accent-color, #ff9800);
      }

      /* Loose cards container (edit mode only, for orphan view-level cards) */
      .loose-cards-container {
        grid-column: 1 / -1;
        margin-top: 24px;
        padding: 16px;
        border: 2px dashed var(--warning-color, #ff9800);
        border-radius: 8px;
        background: rgba(255, 152, 0, 0.05);
      }
      .loose-cards-header {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 12px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--divider-color, #e0e0e0);
      }
      .loose-cards-title {
        font-size: 16px;
        font-weight: 600;
        color: var(--warning-color, #ff9800);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .loose-cards-subtitle {
        font-size: 13px;
        color: var(--secondary-text-color, #727272);
        font-style: italic;
      }
      .loose-cards-wrapper {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 12px;
      }
      .loose-cards-wrapper > * {
        margin: 0;
      }

      /* ── Section YAML editor ──────────────────────────────────────── */

      .sgl-yaml-editor {
        position: fixed;
        inset: 0;
        z-index: 8;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(4px);
      }
      .sgl-yaml-dialog {
        background: var(--card-background-color, #1c1c1c);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 16px;
        min-width: 340px;
        max-width: 480px;
        width: 90vw;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        font-family: var(--paper-font-body1_-_font-family, sans-serif);
      }
      .sgl-yaml-header {
        font-size: 13px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: var(--primary-color, #03a9f4);
        margin-bottom: 12px;
      }
      .sgl-yaml-textarea {
        width: 100%;
        min-height: 200px;
        background: rgba(0, 0, 0, 0.2);
        color: var(--primary-text-color, #fff);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 12px;
        font-family: "Roboto Mono", "SFMono-Regular", monospace;
        font-size: 13px;
        line-height: 1.5;
        resize: vertical;
        box-sizing: border-box;
        tab-size: 2;
      }
      .sgl-yaml-textarea:focus {
        outline: none;
        border-color: var(--primary-color, #03a9f4);
      }
      .sgl-yaml-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 12px;
      }
      .sgl-yaml-btn {
        border: none;
        border-radius: 6px;
        padding: 6px 16px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.15s;
      }
      .sgl-yaml-btn:hover { opacity: 0.85; }
      .sgl-yaml-btn-cancel {
        background: rgba(255, 255, 255, 0.1);
        color: var(--primary-text-color, #fff);
      }
      .sgl-yaml-btn-save {
        background: var(--primary-color, #03a9f4);
        color: white;
      }

      /* ── Overlays ─────────────────────────────────────────────────── */

      .sgl-overlay {
        position: fixed;
        inset: 0;
        pointer-events: none;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        z-index: var(--sgl-overlay-z-index, 9999);
      }
      .sgl-overlay-content {
        font-size: var(--sgl-overlay-font-size, 80px);
        font-weight: 200;
        color: var(--sgl-overlay-color, white);
      }

      /* Pulse */
      .sgl-overlay[data-animation="pulse"] {
        background:
          radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.3) 0%, transparent 70%);
        background-size: 0% 0%, 100% 100%;
        background-position: center;
        background-repeat: no-repeat;
      }
      .sgl-overlay.active[data-animation="pulse"] {
        animation: sgl-pulse var(--sgl-overlay-duration, 3s) cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .sgl-overlay.active[data-animation="pulse"] .sgl-overlay-content {
        animation: sgl-pulse-content var(--sgl-overlay-duration, 3s) cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      @keyframes sgl-pulse {
        0%   { opacity: 0; backdrop-filter: blur(0px); background-size: 0% 0%, 100% 100%; }
        15%  { opacity: 1; backdrop-filter: blur(var(--sgl-overlay-blur, 6px)); background-size: 120% 120%, 100% 100%; }
        60%  { opacity: 1; backdrop-filter: blur(var(--sgl-overlay-blur, 6px)); background-size: 250% 250%, 100% 100%; }
        100% { opacity: 0; backdrop-filter: blur(0px); background-size: 400% 400%, 100% 100%; }
      }
      @keyframes sgl-pulse-content {
        0%   { transform: scale(0); opacity: 0; text-shadow: none; }
        20%  { transform: scale(1.4); opacity: 1; text-shadow: 0 0 40px currentColor, 0 0 100px currentColor; }
        35%  { transform: scale(1); text-shadow: 0 0 30px currentColor, 0 0 80px currentColor; }
        60%  { opacity: 1; text-shadow: 0 0 20px currentColor; }
        100% { transform: scale(1); opacity: 0; text-shadow: none; }
      }

      /* Fade */
      .sgl-overlay.active[data-animation="fade"] {
        animation: sgl-fade var(--sgl-overlay-duration, 3s) ease forwards;
      }
      .sgl-overlay.active[data-animation="fade"] .sgl-overlay-content {
        animation: sgl-fade var(--sgl-overlay-duration, 3s) ease forwards;
      }
      @keyframes sgl-fade {
        0%   { opacity: 0; }
        15%  { opacity: 1; }
        85%  { opacity: 1; }
        100% { opacity: 0; }
      }

      /* Flash */
      .sgl-overlay.active[data-animation="flash"] {
        animation: sgl-flash var(--sgl-overlay-duration, 1.5s) ease-out forwards;
      }
      .sgl-overlay.active[data-animation="flash"] .sgl-overlay-content {
        animation: sgl-flash-content var(--sgl-overlay-duration, 1.5s) ease-out forwards;
      }
      @keyframes sgl-flash {
        0%   { opacity: 0; backdrop-filter: blur(0px); }
        8%   { opacity: 1; backdrop-filter: blur(var(--sgl-overlay-blur, 4px)); }
        20%  { opacity: 1; }
        100% { opacity: 0; backdrop-filter: blur(0px); }
      }
      @keyframes sgl-flash-content {
        0%   { transform: scale(0.5); opacity: 0; }
        8%   { transform: scale(1.2); opacity: 1; }
        20%  { transform: scale(1); opacity: 1; }
        100% { transform: scale(0.95); opacity: 0; }
      }

      /* Slide Up */
      .sgl-overlay.active[data-animation="slide-up"] {
        animation: sgl-slide-up var(--sgl-overlay-duration, 3s) cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .sgl-overlay.active[data-animation="slide-up"] .sgl-overlay-content {
        animation: sgl-slide-up-content var(--sgl-overlay-duration, 3s) cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      @keyframes sgl-slide-up {
        0%   { opacity: 0; }
        15%  { opacity: 1; }
        85%  { opacity: 1; }
        100% { opacity: 0; }
      }
      @keyframes sgl-slide-up-content {
        0%   { transform: translateY(100px); opacity: 0; }
        20%  { transform: translateY(0); opacity: 1; }
        80%  { transform: translateY(0); opacity: 1; }
        100% { transform: translateY(-30px); opacity: 0; }
      }

      /* None (static — visible while state matches) */
      .sgl-overlay.active[data-animation="none"] {
        opacity: 1;
      }
      .sgl-overlay.active[data-animation="none"] .sgl-overlay-content {
        opacity: 1;
      }

      /* ── Overlay tester (edit mode) ──────────────────────────────── */

      .sgl-overlay-tester {
        position: fixed;
        bottom: 80px;
        right: calc(16px + env(safe-area-inset-right));
        z-index: 7;
        background: color-mix(in srgb, var(--card-background-color, #1c1c1c) 75%, transparent);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 12px;
        padding: 10px 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        min-width: 200px;
        max-width: 320px;
        font-family: var(--paper-font-body1_-_font-family, sans-serif);
        transition: padding 0.2s ease, min-width 0.2s ease, border-radius 0.2s ease;
      }
      .sgl-overlay-tester.collapsed {
        min-width: 0;
        padding: 4px 6px;
        border-radius: 8px;
      }
      .sgl-overlay-tester-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .sgl-overlay-tester-title {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: var(--primary-color, #03a9f4);
        transition: font-size 0.2s ease, width 0.2s ease, opacity 0.2s ease;
        overflow: hidden;
      }
      .sgl-overlay-tester.collapsed .sgl-overlay-tester-title {
        font-size: 0;
        width: 0;
        opacity: 0;
      }
      .sgl-overlay-tester-minimize {
        background: none;
        border: none;
        color: var(--secondary-text-color, #aaa);
        font-size: 16px;
        line-height: 1;
        cursor: pointer;
        padding: 0 2px;
        pointer-events: auto;
        transition: color 0.15s;
      }
      .sgl-overlay-tester-minimize:hover {
        color: var(--primary-text-color, #fff);
      }
      .sgl-overlay-tester-body {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid rgba(255,255,255,0.08);
        overflow: hidden;
        transition: max-height 0.2s ease, opacity 0.2s ease, margin 0.2s ease;
        max-height: 400px;
        opacity: 1;
      }
      .sgl-overlay-tester.collapsed .sgl-overlay-tester-body {
        max-height: 0;
        opacity: 0;
        margin-top: 0;
        padding-top: 0;
        border-top: none;
      }
      .sgl-overlay-tester-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 4px 0;
      }
      .sgl-overlay-tester-label {
        font-size: 12px;
        color: var(--primary-text-color, #fff);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
      }
      .sgl-overlay-tester-btn {
        background: var(--primary-color, #03a9f4);
        color: white;
        border: none;
        border-radius: 6px;
        padding: 4px 12px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
        transition: opacity 0.15s;
        pointer-events: auto;
      }
      .sgl-overlay-tester-btn:hover {
        opacity: 0.85;
      }
      .sgl-overlay-tester-btn:active {
        opacity: 0.7;
      }
    `;
  }
}

customElements.define("sections-grid-layout", GridLayout);
