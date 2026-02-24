import { html, LitElement } from "lit";
import { property } from "lit/decorators.js";
import {
  CardConfig,
  CardConfigGroup,
  GridViewConfig,
  HuiCard,
  LovelaceCard,
} from "../types";
import {
  evaluateCssTemplates,
  extractEntitiesFromTemplate,
} from "../template";
import { detectAllGridAreas, ensureSectionsForAllAreas } from "../grid-utils";
import {
  resolveMediaQuery,
  extractGridProperties,
  generateHostVariables,
  generateTintCss,
  generateBackdropBlurCss,
  generateZoomCss,
  generateVariablesCss,
  generateKioskCss,
  generateLayoutMediaCss,
  generateSectionMediaCss,
  computeSectionStyles,
  computeSectionVariables,
  computeSectionClasses,
} from "../styles";
import { gridStyles } from "./grid-styles";
import { BackgroundManager } from "../managers/background-manager";
import { OverlayManager } from "../managers/overlay-manager";
import { SectionConfigManager } from "../managers/section-config-manager";
import {
  ROOT_ID,
  LAYOUT_STYLES_ID,
  CLASS_EDIT_MODE,
  CLASS_SECTION_GRID_LABEL,
  CLASS_SECTION_GRID_LABEL_TEXT,
  CLASS_SECTION_GRID_EDIT_OVERLAY,
  CLASS_LOOSE_CARDS_CONTAINER,
  CLASS_LOOSE_CARDS_HEADER,
  CLASS_LOOSE_CARDS_TITLE,
  CLASS_LOOSE_CARDS_SUBTITLE,
  CLASS_LOOSE_CARDS_WRAPPER,
  ATTR_GRID_AREA,
} from "../constants";

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
  _layoutMQMap: Map<string, string> = new Map();
  _lastEvaluatedCss?: string;
  _trackedEntities: Set<string> = new Set();
  _sectionsCache: Map<number, any> = new Map();
  _updateQueued: boolean = false;
  _rendered: boolean = false;

  // ── Managers ────────────────────────────────────────────────────────────
  _backgroundManager: BackgroundManager;
  _overlayManager: OverlayManager;
  _sectionConfigManager = new SectionConfigManager();

  // Stable bound handlers so addEventListener/removeEventListener match
  _onCardMQChange = () => this._placeCards();
  _onLayoutMQChange = () => this._setGridStyles();

  // ── Lifecycle ────────────────────────────────────────────────────────────

  async setConfig(config: GridViewConfig) {
    this._config = { ...config };
    if (this._config.view_layout && this._config.layout === undefined) {
      this._config.layout = this._config.view_layout;
    }

    // Per-card media query listeners
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
    this._layoutMQMap.clear();
    if (this._config.layout?.mediaquery) {
      for (const queryKey of Object.keys(this._config.layout.mediaquery)) {
        const resolved = resolveMediaQuery(queryKey, this._config?.layout?.breakpoints);
        const mq = window.matchMedia(resolved);
        this._layoutMQs.push(mq);
        this._layoutMQMap.set(mq.media, queryKey);
        mq.addEventListener("change", this._onLayoutMQChange);
      }
    }

    this._setGridStyles();

    if (this._rendered) {
      this._updateStyles();
      this._overlayManager?.createOverlays(this._config?.layout?.overlays, this._editMode);
      this._overlayManager?.updateStates(this._config?.layout?.overlays, this.hass);
    }
  }

  async updated(changedProperties: Map<string, any>) {
    const editModeChanged =
      changedProperties.has("lovelace") &&
      this.lovelace?.editMode !== changedProperties.get("lovelace")?.editMode;
    if (editModeChanged) {
      this.cards.forEach((c) => (c.editMode = this.lovelace?.editMode));
      this._editMode = this.lovelace?.editMode ?? false;
      this._overlayManager?.createOverlays(this._config?.layout?.overlays, this._editMode);
    }

    const root = this.shadowRoot?.querySelector(`#${ROOT_ID}`) as HTMLElement;
    if (root) root.classList.toggle(CLASS_EDIT_MODE, !!this.lovelace?.editMode);

    if (changedProperties.has("hass")) {
      this._queueSectionHassUpdate();
      if (this._overlayManager) this._overlayManager.hass = this.hass;
      if (this._hasTrackedEntitiesChanged(changedProperties)) {
        const layout = this._config?.layout;
        if (layout?.background_image &&
            (layout.background_image.includes("{{") || layout.background_image.includes("{%"))) {
          this._backgroundManager?.evaluateTemplate(layout, this.hass);
        }
        if (layout?.custom_css &&
            (layout.custom_css.includes("{{") || layout.custom_css.includes("{%"))) {
          this._updateStyles();
        }
        this._overlayManager?.updateStates(this._config?.layout?.overlays, this.hass);
      }
    }

    if (changedProperties.has("lovelace")) this._updateSectionsLovelace();

    if (changedProperties.has("cards")) {
      this._sectionsCache.clear();
      this._placeCards();
    } else if (changedProperties.has("_editMode")) {
      this._sectionsCache.clear();
      if (this._editMode) {
        this._sectionConfigManager.ensureAllSectionsExistInConfig(
          this._config.layout?.["grid-template-areas"],
          this.lovelace,
          this.index,
          () => this._placeCards()
        );
      } else {
        this._placeCards();
      }
    }
  }

  async firstUpdated() {
    this._rendered = true;
    this._setGridStyles();
    this._extractEntitiesFromTemplates();

    // Background manager
    this._backgroundManager = new BackgroundManager(this);
    if (this._config.layout) {
      this._backgroundManager.setup(this._config.layout, this.hass);
    }

    // Dynamic styles
    const styleEl = document.createElement("style");
    styleEl.id = LAYOUT_STYLES_ID;
    this.shadowRoot.appendChild(styleEl);
    this._updateStyles();

    // Overlay manager
    this._overlayManager = new OverlayManager(this.shadowRoot);
    this._overlayManager.hass = this.hass;
    this._overlayManager.createOverlays(this._config?.layout?.overlays, this._editMode);
    if (this.hass) this._overlayManager.updateStates(this._config?.layout?.overlays, this.hass);
    this._overlayManager.setupDialogObserver();

    if (this.lovelace?.editMode) {
      this._sectionConfigManager.ensureAllSectionsExistInConfig(
        this._config.layout?.["grid-template-areas"],
        this.lovelace,
        this.index,
        () => this._placeCards()
      );
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._mediaQueries.forEach(mq => mq?.removeEventListener("change", this._onCardMQChange));
    this._layoutMQs.forEach(mq => mq?.removeEventListener("change", this._onLayoutMQChange));
    this._overlayManager?.destroy();
    this._backgroundManager?.destroy();
  }

  // ── Card helpers ─────────────────────────────────────────────────────────

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
    const root = this.shadowRoot?.querySelector(`#${ROOT_ID}`) as HTMLElement;
    if (!root) return;
    root.style.cssText = "";
    const apply = (layout: Record<string, any>) => {
      for (const [key, value] of Object.entries(extractGridProperties(layout))) {
        root.style.setProperty(key, value);
      }
    };
    if (this._config?.layout) apply(this._config.layout);
    for (const mq of this._layoutMQs) {
      if (mq?.matches) {
        const configKey = this._layoutMQMap.get(mq.media) || mq.media;
        apply(this._config.layout.mediaquery[configKey]);
        break;
      }
    }
  }

  _updateStyles() {
    const styleEl = this.shadowRoot?.querySelector(`#${LAYOUT_STYLES_ID}`) as HTMLStyleElement;
    if (!styleEl) return;
    const layout = this._config?.layout;
    const evalCss = (css: string) => this._evaluateCssTemplates(css);
    const customCss = evalCss(layout?.custom_css || "");

    const mediaCss = layout ? generateLayoutMediaCss(layout, evalCss) : "";
    const sectionMediaCss = generateSectionMediaCss(
      this._config?.sections || [], layout?.breakpoints, evalCss
    );

    let overlayCss = "";
    if (layout?.overlays) {
      for (const overlay of layout.overlays) {
        if (overlay.custom_css) overlayCss += evalCss(overlay.custom_css);
      }
    }

    styleEl.innerHTML = `
      ${generateHostVariables(layout)}
      ${generateVariablesCss(layout?.variables)}
      ${generateTintCss(layout?.tint)}
      ${generateBackdropBlurCss(layout?.backdrop_blur)}
      ${generateKioskCss(layout?.kiosk)}
      ${generateZoomCss(layout?.zoom)}
      ${mediaCss}
      ${sectionMediaCss}
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
    const addAll = (str: string) => {
      for (const eid of extractEntitiesFromTemplate(str)) this._trackedEntities.add(eid);
    };
    addAll(this._config.layout?.custom_css);
    addAll(this._config.layout?.background_image);
    const overlays = this._config.layout?.overlays;
    if (overlays) {
      for (const overlay of overlays) {
        if (overlay.entity) this._trackedEntities.add(overlay.entity);
        addAll(overlay.custom_css);
        addAll(overlay.content);
      }
    }
  }

  _evaluateCssTemplates(css: string): string {
    if (!css || !this.hass) return css;
    if (!css.includes("{{") && !css.includes("{%")) return css;
    if (css === this._lastEvaluatedCss) return css;
    const out = evaluateCssTemplates(css, this.hass.states, this._trackedEntities);
    this._lastEvaluatedCss = out;
    return out;
  }

  // ── Card / section placement ──────────────────────────────────────────────

  async _placeCards() {
    const root = this.shadowRoot.querySelector(`#${ROOT_ID}`) as HTMLElement;
    while (root.firstChild) root.removeChild(root.firstChild);

    if (this._config.sections?.length > 0) {
      await this._placeNativeSections(root);
      return;
    }

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
    const allGridAreas = detectAllGridAreas(this._config.layout?.["grid-template-areas"]);
    const sectionsToRender = ensureSectionsForAllAreas(allGridAreas, this._config.sections || []);

    const liveSections: any[] =
      (this.lovelace?.config?.views?.[this.index]?.sections as any[]) ??
      this._config.sections ?? [];

    for (let i = 0; i < sectionsToRender.length; i++) {
      const sectionConfig = sectionsToRender[i];

      if (!isEditMode && (!sectionConfig.cards || sectionConfig.cards.length === 0)) continue;

      const configIndex = liveSections.findIndex(
        (s: any) => s.grid_area === sectionConfig.grid_area
      );
      const sectionIndex = configIndex >= 0 ? configIndex : i;

      const container = document.createElement("div");
      container.className = computeSectionClasses(sectionConfig, !!isEditMode).join(" ");

      if (sectionConfig.grid_area) {
        container.setAttribute(ATTR_GRID_AREA, sectionConfig.grid_area);
      }

      for (const [prop, val] of Object.entries(computeSectionStyles(sectionConfig))) {
        container.style.setProperty(prop, val);
      }
      for (const [prop, val] of Object.entries(computeSectionVariables(sectionConfig.variables))) {
        container.style.setProperty(prop, val);
      }

      if (isEditMode && sectionConfig.grid_area) {
        const label = document.createElement("div");
        label.className = CLASS_SECTION_GRID_LABEL;
        label.addEventListener("click", (e) => {
          e.stopPropagation();
          this._sectionConfigManager.openSectionYamlEditor(
            sectionConfig.grid_area, this.shadowRoot, this.lovelace, this.index, this.hass
          );
        });

        const nameSpan = document.createElement("span");
        nameSpan.className = CLASS_SECTION_GRID_LABEL_TEXT;
        nameSpan.textContent = sectionConfig.grid_area;
        label.appendChild(nameSpan);

        const editOverlay = document.createElement("div");
        editOverlay.className = CLASS_SECTION_GRID_EDIT_OVERLAY;
        editOverlay.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/></svg>`;
        label.appendChild(editOverlay);

        container.appendChild(label);
      }

      container.appendChild(await this._createNativeSection(sectionConfig, sectionIndex));
      root.appendChild(container);
    }

    if (isEditMode && this.cards?.length > 0) {
      root.appendChild(this._createLooseCardsContainer());
    }
  }

  _createLooseCardsContainer(): HTMLElement {
    const container = document.createElement("div");
    container.className = CLASS_LOOSE_CARDS_CONTAINER;

    const header = document.createElement("div");
    header.className = CLASS_LOOSE_CARDS_HEADER;
    const title = document.createElement("span");
    title.className = CLASS_LOOSE_CARDS_TITLE;
    title.textContent = "Unassigned Cards";
    const subtitle = document.createElement("span");
    subtitle.className = CLASS_LOOSE_CARDS_SUBTITLE;
    subtitle.textContent = "Drag these cards into sections above";
    header.append(title, subtitle);
    container.appendChild(header);

    const wrapper = document.createElement("div");
    wrapper.className = CLASS_LOOSE_CARDS_WRAPPER;
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
      this._sectionConfigManager.handleSectionConfigChanged(
        config.grid_area, e.detail.config, this.lovelace, this.index
      );
    });
    section.addEventListener("ll-delete-section", (e: CustomEvent) => {
      e.stopPropagation();
      this._sectionConfigManager.handleDeleteSection(config.grid_area, this.lovelace, this.index);
    });
    return section;
  }

  // ── FAB (Add card) ──────────────────────────────────────────────────────

  _addCard() {
    this.dispatchEvent(new CustomEvent("ll-create-card"));
  }

  _render_fab() {
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
    return html`<div id=${ROOT_ID}></div>${this._render_fab()}`;
  }

  static get styles() {
    return gridStyles;
  }
}

if (!customElements.get("sections-grid-layout")) {
  customElements.define("sections-grid-layout", GridLayout);
}
