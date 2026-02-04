import { css, html } from "lit";
import {
  CardConfig,
  CardConfigGroup,
  GridViewConfig,
  HuiCard,
  LovelaceCard,
} from "../types";
import { BaseLayout } from "./base-layout";

class GridLayout extends BaseLayout {
  _mediaQueries: Array<MediaQueryList | null> = [];
  _layoutMQs: Array<MediaQueryList | null> = [];
  _config: GridViewConfig;

  async setConfig(config: GridViewConfig) {
    await super.setConfig(config);

    for (const card of this._config.cards) {
      if (
        typeof card.view_layout?.show !== "string" &&
        card.view_layout?.show?.mediaquery
      ) {
        const mq = window.matchMedia(`${card.view_layout.show.mediaquery}`);
        this._mediaQueries.push(mq);
        mq.addEventListener("change", () => this._placeCards());
      } else {
        this._mediaQueries.push(null);
      }
    }

    if (this._config.layout?.mediaquery) {
      for (const [query, layout] of Object.entries(
        this._config.layout?.mediaquery
      )) {
        const mq = window.matchMedia(query);
        this._layoutMQs.push(mq);
        mq.addEventListener("change", () => this._setGridStyles());
      }
    }
    this._setGridStyles();
  }

  async updated(changedProperties) {
    await super.updated(changedProperties);
    if (changedProperties.has("cards") || changedProperties.has("_editMode")) {
      this._placeCards();
    }
  }

  async firstUpdated() {
    this._setGridStyles();

    const styleEl = document.createElement("style");
    styleEl.innerHTML = `
      :host {
        --layout-margin: ${this._config.layout?.margin ?? "0px 4px 0px 4px"};
        --layout-padding: ${this._config.layout?.padding ?? "4px 0px 4px 0px"};
        --layout-height: ${this._config.layout?.height ?? "auto"};
        --layout-overflow: ${
          this._config.layout?.height !== undefined ? "auto" : "visible"
        };
      }
      ${this._config.layout?.custom_css || ""}`;
    this.shadowRoot.appendChild(styleEl);
  }

  _setGridStyles() {
    const root = this.shadowRoot?.querySelector("#root") as HTMLElement;
    if (!root) return;
    const addStyles = (layout) => {
      for (const [key, value] of Object.entries(layout)) {
        if (
          key.startsWith("grid") ||
          key === "grid" ||
          key === "place-items" ||
          key === "place-content"
        )
          root.style.setProperty(key, value as any as string);
      }
    };

    root.style.cssText = "";

    if (this._config.layout) addStyles(this._config.layout);

    for (const q of this._layoutMQs) {
      if (q.matches) {
        addStyles(this._config.layout.mediaquery[q.media]);
        break;
      }
    }
  }

  _shouldShow(card: LovelaceCard | HuiCard, config: CardConfig, index: number) {
    if (!super._shouldShow(card, config, index)) return false;

    const mq = this._mediaQueries[index];
    if (!mq) return true;
    if (mq.matches) return true;
    return false;
  }

  _placeCards() {
    const root = this.shadowRoot.querySelector("#root");
    while (root.firstChild) root.removeChild(root.firstChild);
    
    // Section-based layout - use sections if defined or auto-detect from grid-template-areas
    const sections = this._config.layout?.sections || this._autoDetectSections();
    if (sections && Object.keys(sections).length > 0) {
      this._placeSectionCards(root, sections);
      return;
    }
    
    // Traditional card placement
    let cards: CardConfigGroup[] = this.cards.map((card, index) => {
      const config = this._config.cards[index];
      return {
        card,
        config,
        index,
        show: this._shouldShow(card, config, index),
      };
    });

    for (const card of cards.filter((c) => this.lovelace?.editMode || c.show)) {
      const el = this.getCardElement(card);
      for (const [key, value] of Object.entries(
        card.config?.view_layout ?? {}
      )) {
        if (key.startsWith("grid") || key === "place-self")
          el.style.setProperty(key, value as string);
      }
      root.appendChild(el);
    }
  }

  _autoDetectSections() {
    // Auto-detect grid areas from grid-template-areas in edit mode
    if (!this.lovelace?.editMode) return null;
    
    const gridTemplateAreas = this._config.layout?.["grid-template-areas"];
    if (!gridTemplateAreas) return null;
    
    // Parse grid-template-areas to extract unique area names
    const areaNames = new Set<string>();
    const lines = gridTemplateAreas.split('\n').map(line => line.trim()).filter(line => line);
    
    for (const line of lines) {
      const areas = line.replace(/['"]/g, '').split(/\s+/);
      areas.forEach(area => {
        if (area !== '.' && area !== '') {
          areaNames.add(area);
        }
      });
    }
    
    // Create section configs for each detected area
    const sections: Record<string, any> = {};
    areaNames.forEach(name => {
      sections[name] = { grid_area: name };
    });
    
    return Object.keys(sections).length > 0 ? sections : null;
  }

  _placeSectionCards(root: Element, sections?: Record<string, any>) {
    // Create section containers
    sections = sections || this._config.layout?.sections || {};
    const isEditMode = this.lovelace?.editMode;
    
    for (const [sectionName, sectionConfig] of Object.entries(sections)) {
      const sectionEl = document.createElement("div");
      sectionEl.className = isEditMode ? "grid-section edit-mode" : "grid-section";
      sectionEl.setAttribute("data-section", sectionName);
      
      // Apply grid area if specified
      if (sectionConfig.grid_area) {
        sectionEl.style.gridArea = sectionConfig.grid_area;
      }
      
      // Add section header in edit mode
      if (isEditMode) {
        const headerEl = document.createElement("div");
        headerEl.className = "section-header";
        headerEl.textContent = sectionName;
        sectionEl.appendChild(headerEl);
      }
      
      // Add cards to this section
      const sectionCards = this._getSectionCards(sectionName);
      for (const cardGroup of sectionCards) {
        const el = this.getCardElement(cardGroup);
        sectionEl.appendChild(el);
      }
      
      // Show empty placeholder in edit mode
      if (isEditMode && sectionCards.length === 0) {
        const placeholderEl = document.createElement("div");
        placeholderEl.className = "section-placeholder";
        placeholderEl.textContent = "Drop cards here";
        sectionEl.appendChild(placeholderEl);
      }
      
      root.appendChild(sectionEl);
    }
  }

  _getSectionCards(sectionName: string): CardConfigGroup[] {
    const sectionConfig = this._config.layout?.sections?.[sectionName];
    if (!sectionConfig) return [];
    
    const cards: CardConfigGroup[] = [];
    this.cards.forEach((card, index) => {
      const config = this._config.cards[index];
      // Check if card belongs to this section
      const gridArea = (config.view_layout as any)?.grid_area;
      if (gridArea === sectionName || 
          (sectionConfig.cards && sectionConfig.cards.includes(config))) {
        cards.push({
          card,
          config,
          index,
          show: this._shouldShow(card, config, index),
        });
      }
    });
    
    return cards.filter((c) => this.lovelace?.editMode || c.show);
  }

  render() {
    return html` <div id="root"></div>
      ${this._render_fab()}`;
  }
  static get styles() {
    return [
      this._fab_styles,
      css`
        :host {
          height: 100%;
          box-sizing: border-box;
        }
        #root {
          display: grid;
          justify-content: stretch;
          margin: var(--layout-margin);
          padding: var(--layout-padding);
          height: var(--layout-height);
          overflow-y: var(--layout-overflow);
        }
        #root > * {
          margin: var(--masonry-view-card-margin, 4px 4px 8px);
        }
        .grid-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .grid-section.edit-mode {
          padding: 8px;
          min-height: 100px;
          border: 2px dashed var(--divider-color, #e0e0e0);
          border-radius: 8px;
          background: var(--card-background-color, #fff);
          transition: all 0.3s ease;
        }
        .grid-section.edit-mode:hover {
          border-color: var(--primary-color, #03a9f4);
          background: var(--secondary-background-color, #f5f5f5);
        }
        .section-header {
          font-weight: 600;
          font-size: 14px;
          color: var(--primary-text-color, #212121);
          padding: 4px 8px;
          background: var(--primary-color, #03a9f4);
          color: white;
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .section-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 80px;
          border: 2px dashed var(--disabled-text-color, #9e9e9e);
          border-radius: 4px;
          color: var(--secondary-text-color, #727272);
          font-style: italic;
          background: var(--divider-color, #e0e0e0);
          opacity: 0.6;
        }
        .grid-section > *:not(.section-header):not(.section-placeholder) {
          margin: 0;
        }
        .grid-section:not(.edit-mode) > * {
          margin: var(--masonry-view-card-margin, 4px 4px 8px);
        }
      `,
    ];
  }
}

customElements.define("grid-layout-improved", GridLayout);
