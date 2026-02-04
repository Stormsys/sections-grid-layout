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
    
    // Track which cards have been assigned to sections
    const assignedCardIndices = new Set<number>();
    
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
        const headerEl = this._createSectionHeader(sectionName);
        sectionEl.appendChild(headerEl);
      }
      
      // Add cards to this section
      const sectionCards = this._getSectionCards(sectionName);
      sectionCards.forEach(cardGroup => {
        assignedCardIndices.add(cardGroup.index);
        const el = this.getCardElement(cardGroup);
        sectionEl.appendChild(el);
      });
      
      // Show empty placeholder in edit mode
      if (isEditMode && sectionCards.length === 0) {
        const placeholderEl = document.createElement("div");
        placeholderEl.className = "section-placeholder";
        placeholderEl.textContent = "Click + to add cards, or edit cards to set view_layout.grid_area";
        sectionEl.appendChild(placeholderEl);
      }
      
      root.appendChild(sectionEl);
    }
    
    // Add unassigned cards section in edit mode
    if (isEditMode) {
      const unassignedCards = this._getUnassignedCards(assignedCardIndices);
      if (unassignedCards.length > 0) {
        const unassignedSection = this._createUnassignedSection(unassignedCards);
        root.appendChild(unassignedSection);
      }
    }
  }

  _createSectionHeader(sectionName: string): HTMLElement {
    const headerEl = document.createElement("div");
    headerEl.className = "section-header";
    
    const titleEl = document.createElement("span");
    titleEl.className = "section-title";
    titleEl.textContent = sectionName;
    
    const addBtn = document.createElement("button");
    addBtn.className = "section-add-btn";
    addBtn.innerHTML = "✕";
    addBtn.title = "Add card to this section";
    addBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this._addCardToSection(sectionName);
    });
    
    headerEl.appendChild(titleEl);
    headerEl.appendChild(addBtn);
    
    return headerEl;
  }

  _addCardToSection(sectionName: string) {
    // Dispatch event to trigger card picker with section context
    this.dispatchEvent(new CustomEvent("ll-create-card", {
      detail: { section: sectionName }
    }));
  }

  _getUnassignedCards(assignedIndices: Set<number>): CardConfigGroup[] {
    const cards: CardConfigGroup[] = [];
    this.cards.forEach((card, index) => {
      if (!assignedIndices.has(index)) {
        const config = this._config.cards[index];
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

  _createUnassignedSection(unassignedCards: CardConfigGroup[]): HTMLElement {
    const sectionEl = document.createElement("div");
    sectionEl.className = "grid-section unassigned-section edit-mode";
    sectionEl.setAttribute("data-section", "unassigned");
    
    // Header for unassigned section
    const headerEl = document.createElement("div");
    headerEl.className = "section-header unassigned-header";
    
    const titleEl = document.createElement("span");
    titleEl.className = "section-title";
    titleEl.textContent = "Unassigned Cards";
    
    const infoEl = document.createElement("span");
    infoEl.className = "section-info";
    infoEl.textContent = "(Drag into sections above)";
    
    headerEl.appendChild(titleEl);
    headerEl.appendChild(infoEl);
    sectionEl.appendChild(headerEl);
    
    // Add unassigned cards
    for (const cardGroup of unassignedCards) {
      const el = this.getCardElement(cardGroup);
      sectionEl.appendChild(el);
    }
    
    return sectionEl;
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
    return html`
      <div id="root"></div>
      ${this._render_fab()}`;
  }
  static get styles() {
    return [
      this._fab_styles,
      css`
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
        #root > *:not(.unassigned-section) {
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
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-weight: 600;
          font-size: 14px;
          color: white;
          padding: 8px 12px;
          background: var(--primary-color, #03a9f4);
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          gap: 8px;
        }
        .section-title {
          flex: 1;
        }
        .section-add-btn {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: bold;
          transition: all 0.2s ease;
          transform: rotate(45deg);
          padding: 0;
          line-height: 1;
        }
        .section-add-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: rotate(45deg) scale(1.1);
        }
        .section-add-btn:active {
          transform: rotate(45deg) scale(0.95);
        }
        .unassigned-section {
          grid-column: 1 / -1;
          margin-top: 16px;
          border-color: var(--warning-color, #ff9800);
          background: var(--secondary-background-color, #fafafa);
        }
        .unassigned-header {
          background: var(--warning-color, #ff9800);
          flex-wrap: wrap;
        }
        .section-info {
          font-size: 11px;
          opacity: 0.9;
          text-transform: none;
          font-weight: normal;
          letter-spacing: normal;
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
