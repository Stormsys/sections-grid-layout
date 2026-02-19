import { css, html, LitElement } from "lit";
import { property } from "lit/decorators.js";
import {
  CardConfig,
  CardConfigGroup,
  GridViewConfig,
  HuiCard,
  LovelaceCard,
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
  }

  async updated(changedProperties: Map<string, any>) {
    // Edit mode: propagate to view-level cards and update internal flag
    if (
      changedProperties.has("lovelace") &&
      this.lovelace?.editMode !== changedProperties.get("lovelace")?.editMode
    ) {
      this.cards.forEach((c) => (c.editMode = this.lovelace?.editMode));
      this._editMode = this.lovelace?.editMode ?? false;
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
      }
    }

    if (changedProperties.has("lovelace")) this._updateSectionsLovelace();

    if (changedProperties.has("cards")) {
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
    this._setGridStyles();
    this._extractEntitiesFromTemplates();
    this._setupTemplateSubscription();

    const styleEl = document.createElement("style");
    styleEl.id = "layout-styles";
    this.shadowRoot.appendChild(styleEl);
    this._updateStyles();

    if (this.lovelace?.editMode) this._ensureAllSectionsExistInConfig();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._mediaQueries.forEach(mq => mq?.removeEventListener("change", this._onCardMQChange));
    this._layoutMQs.forEach(mq => mq?.removeEventListener("change", this._onLayoutMQChange));
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
          top: var(--header-height, 56px);
          margin: 0 !important;
          padding: 0 !important;
        }
        #root.edit-mode {
          top: calc(var(--header-height, 56px) + var(--tab-bar-height, 56px) - 2px);
        }`;
    }

    let zoomCss = "";
    if (layout?.zoom != null) {
      zoomCss = `#root { zoom: ${layout.zoom}; }`;
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
      ${customCss}`;
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
        label.textContent = sectionConfig.grid_area;
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
        top: 4px;
        right: 4px;
        background: var(--primary-color, #03a9f4);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        opacity: 0.4;
        pointer-events: none;
        z-index: 1;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        backdrop-filter: blur(4px);
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
    `;
  }
}

customElements.define("sections-grid-layout", GridLayout);
