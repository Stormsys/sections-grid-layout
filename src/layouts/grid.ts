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
  _lastBackgroundImage?: string;
  _lastEvaluatedCss?: string;
  _trackedEntities: Set<string> = new Set();
  _sectionsCache: Map<number, any> = new Map();
  _updateQueued: boolean = false;

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
    
    // Update edit-mode class on root whenever edit mode changes
    const root = this.shadowRoot?.querySelector("#root") as HTMLElement;
    if (root) {
      if (this.lovelace?.editMode) {
        root.classList.add("edit-mode");
      } else {
        root.classList.remove("edit-mode");
      }
    }
    
    // Propagate hass updates to native sections (CRITICAL for card updates!)
    if (changedProperties.has("hass")) {
      // Skip expensive operations during active editing
      if (!this.lovelace?.editMode) {
        this._queueSectionHassUpdate();
      }
      
      // Only re-evaluate templates if tracked entities changed
      if (this._hasTrackedEntitiesChanged(changedProperties)) {
        // Re-evaluate template for reactive backgrounds
        if (this._config.layout?.background_image) {
          const template = this._config.layout.background_image;
          if (template.includes("{{") || template.includes("{%")) {
            this._evaluateTemplate();
          }
        }
        
        // Re-evaluate CSS templates
        if (this._config.layout?.custom_css && 
            (this._config.layout.custom_css.includes("{{") || 
             this._config.layout.custom_css.includes("{%"))) {
          this._updateStyles();
        }
      }
    }
    
    // Propagate lovelace updates to native sections
    if (changedProperties.has("lovelace")) {
      this._updateSectionsLovelace();
    }
    
    // Don't re-render cards during edit mode unless explicitly needed
    if (changedProperties.has("cards")) {
      this._placeCards();
    } else if (changedProperties.has("_editMode")) {
      // Only re-render when toggling edit mode
      this._placeCards();
      // Clear section cache when entering/exiting edit mode
      this._sectionsCache.clear();
    }
  }

  _queueSectionHassUpdate() {
    // Debounce hass updates using requestAnimationFrame
    if (this._updateQueued) return;
    
    this._updateQueued = true;
    requestAnimationFrame(() => {
      this._updateSectionsHass();
      this._updateQueued = false;
    });
  }

  _updateSectionsHass() {
    // Update hass on all native section elements
    const sections = this.shadowRoot.querySelectorAll("hui-section");
    sections.forEach((section: any) => {
      if (section) {
        section.hass = this.hass;
      }
    });
  }

  _updateSectionsLovelace() {
    // Update lovelace on all native section elements  
    const sections = this.shadowRoot.querySelectorAll("hui-section");
    sections.forEach((section: any) => {
      if (section) {
        section.lovelace = this.lovelace;
      }
    });
  }

  async firstUpdated() {
    this._setGridStyles();
    
    // Extract entities from templates for tracking
    this._extractEntitiesFromTemplates();
    
    // Setup template subscription for reactive background updates
    this._setupTemplateSubscription();

    // Create style element
    const styleEl = document.createElement("style");
    styleEl.id = "layout-styles";
    this.shadowRoot.appendChild(styleEl);
    
    // Update styles with template evaluation
    this._updateStyles();
  }

  _updateStyles() {
    const styleEl = this.shadowRoot.querySelector("#layout-styles") as HTMLStyleElement;
    if (!styleEl) return;
    
    // Evaluate templates in custom_css
    const customCss = this._evaluateCssTemplates(this._config.layout?.custom_css || "");
    
    styleEl.innerHTML = `
      :host {
        --layout-margin: ${this._config.layout?.margin ?? "0px 4px 0px 4px"};
        --layout-padding: ${this._config.layout?.padding ?? "4px 0px 4px 0px"};
        --layout-height: ${this._config.layout?.height ?? "auto"};
        --layout-overflow: ${
          this._config.layout?.height !== undefined ? "auto" : "visible"
        };
      }
      ${customCss}`;
  }

  _hasTrackedEntitiesChanged(changedProperties): boolean {
    if (!changedProperties.has("hass")) return false;
    
    const oldHass = changedProperties.get("hass");
    if (!oldHass || !this.hass) return true;
    
    // Check if any tracked entity state changed
    for (const entityId of this._trackedEntities) {
      if (oldHass.states[entityId]?.state !== this.hass.states[entityId]?.state) {
        return true;
      }
    }
    
    return false;
  }

  _extractEntitiesFromTemplates() {
    // Extract entity IDs from templates to track
    this._trackedEntities.clear();
    
    const extractFromString = (str: string) => {
      if (!str) return;
      
      // Extract from is_state()
      let match;
      const isStateRegex = /is_state\(['"]([^'"]+)['"]/g;
      while ((match = isStateRegex.exec(str)) !== null) {
        this._trackedEntities.add(match[1]);
      }
      
      // Extract from states()
      const statesRegex = /states\(['"]([^'"]+)['"]/g;
      while ((match = statesRegex.exec(str)) !== null) {
        this._trackedEntities.add(match[1]);
      }
      
      // Extract from state_attr()
      const attrRegex = /state_attr\(['"]([^'"]+)['"]/g;
      while ((match = attrRegex.exec(str)) !== null) {
        this._trackedEntities.add(match[1]);
      }
    };
    
    extractFromString(this._config.layout?.custom_css);
    extractFromString(this._config.layout?.background_image);
  }

  _evaluateCssTemplates(css: string): string {
    if (!css || !this.hass) return css;
    
    // Don't evaluate if no templates
    if (!css.includes("{{") && !css.includes("{%")) return css;
    
    // Don't re-evaluate if nothing changed
    if (css === this._lastEvaluatedCss) return css;
    
    try {
      let modified = css;
      
      // Handle {% if is_state('entity', 'value') %} ... {% endif %} blocks
      modified = modified.replace(/\{%\s*if\s+is_state\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g,
        (match, entityId, expectedState, content) => {
          const actualState = this.hass.states[entityId]?.state;
          const matches = actualState === expectedState;
          if (actualState !== undefined) {
            this._trackedEntities.add(entityId);
          }
          return matches ? content : '';
        }
      );
      
      // Handle {% if not is_state('entity', 'value') %} ... {% endif %} blocks
      modified = modified.replace(/\{%\s*if\s+not\s+is_state\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g,
        (match, entityId, expectedState, content) => {
          const actualState = this.hass.states[entityId]?.state;
          const matches = actualState !== expectedState;
          if (actualState !== undefined) {
            this._trackedEntities.add(entityId);
          }
          return matches ? content : '';
        }
      );
      
      // Replace {{ states('entity_id') }} patterns
      modified = modified.replace(/\{\{\s*states\(['"]([^'"]+)['"]\)\s*\}\}/g, (match, entityId) => {
        const value = this.hass.states[entityId]?.state;
        if (value !== undefined) {
          this._trackedEntities.add(entityId);
        }
        return value || match;
      });
      
      // Replace {{ state_attr('entity_id', 'attr') }} patterns
      modified = modified.replace(/\{\{\s*state_attr\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)\s*\}\}/g, 
        (match, entityId, attr) => {
          const value = this.hass.states[entityId]?.attributes?.[attr];
          if (value !== undefined) {
            this._trackedEntities.add(entityId);
          }
          return value !== undefined ? value : match;
        }
      );
      
      this._lastEvaluatedCss = modified;
      return modified;
    } catch (e) {
      return css;
    }
  }


  _setupTemplateSubscription() {
    const template = this._config.layout?.background_image;
    if (!template) return;
    
    // If not a template, just use static value
    if (!template.includes("{{") && !template.includes("{%")) {
      this._updateBackgroundWithImage(template);
      return;
    }
    
    // For templates, evaluate from hass states
    this._evaluateTemplate();
  }

  _evaluateTemplate() {
    const template = this._config.layout?.background_image;
    if (!template || !this.hass) return;
    
    try {
      // Parse {{ states('entity_id') }} pattern
      const statesMatch = template.match(/states\(['"]([^'"]+)['"]\)/);
      
      if (statesMatch) {
        const entityId = statesMatch[1];
        const value = this.hass.states[entityId]?.state;
        
        if (value && value !== "unknown" && value !== "unavailable") {
          this._updateBackgroundWithImage(value);
        }
        return;
      }
      
      // Parse {{ state_attr('entity_id', 'attribute') }} pattern  
      const attrMatch = template.match(/state_attr\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)/);
      
      if (attrMatch) {
        const entityId = attrMatch[1];
        const attr = attrMatch[2];
        const value = this.hass.states[entityId]?.attributes?.[attr];
        
        if (value) {
          this._updateBackgroundWithImage(value);
        }
        return;
      }
      
      // Fallback: use the template string as-is
      this._updateBackgroundWithImage(template);
      
    } catch (e) {
      // Silent fail
      this._updateBackgroundWithImage(template);
    }
  }

  _updateBackgroundWithImage(bgImage: string) {
    if (!bgImage || bgImage === "null" || bgImage === "undefined") return;
    
    // Don't update if image hasn't changed
    if (bgImage === this._lastBackgroundImage) return;
    this._lastBackgroundImage = bgImage;
    
    const blur = this._config.layout?.background_blur || "0px";
    const opacity = this._config.layout?.background_opacity ?? 1;
    
    // Detect header height
    const headerHeight = this._getHeaderHeight();
    
    // Update existing background element or create new one
    let bgEl = this.shadowRoot.querySelector(".background") as HTMLElement;
    
    if (!bgEl) {
      // Create new background element
      bgEl = document.createElement("div");
      bgEl.className = "background";
      bgEl.style.position = "fixed";
      bgEl.style.left = "0";
      bgEl.style.right = "0";
      bgEl.style.bottom = "0";
      bgEl.style.backgroundPosition = "center";
      bgEl.style.backgroundRepeat = "no-repeat";
      bgEl.style.backgroundSize = "cover";
      bgEl.style.backgroundAttachment = "fixed";
      bgEl.style.zIndex = "-1";
      this.shadowRoot.insertBefore(bgEl, this.shadowRoot.firstChild);
    }
    
    // Update dynamic styles including header offset
    bgEl.style.top = `${headerHeight}px`;
    bgEl.style.backgroundImage = `url('${bgImage}')`;
    bgEl.style.filter = `blur(${blur})`;
    bgEl.style.opacity = opacity.toString();
  }

  _getHeaderHeight(): number {
    // Try to find the HA header element
    // Header can be: app-header, .header, hui-view header, etc.
    
    // Check if in panel mode (no header)
    const panelMode = this.closest("hui-panel-view");
    if (panelMode) return 0;
    
    // Try to find app-header
    let header = document.querySelector("app-header");
    if (header) {
      return header.getBoundingClientRect().height;
    }
    
    // Try to find .header class
    header = document.querySelector(".header");
    if (header) {
      return header.getBoundingClientRect().height;
    }
    
    // Try to find ha-app-layout header
    const appLayout = document.querySelector("ha-app-layout");
    if (appLayout) {
      const appHeader = appLayout.querySelector("[slot='header']");
      if (appHeader) {
        return appHeader.getBoundingClientRect().height;
      }
    }
    
    // Default: assume standard header height
    return 0; // Let CSS variables handle it
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

  async _placeCards() {
    const root = this.shadowRoot.querySelector("#root") as HTMLElement;
    while (root.firstChild) root.removeChild(root.firstChild);
    
    // If using native sections, render them in grid positions
    if (this._config.sections && this._config.sections.length > 0) {
      await this._placeNativeSections(root);
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

  async _placeNativeSections(root: Element) {
    const isEditMode = this.lovelace?.editMode;
    
    // Auto-detect all grid areas and ensure sections exist for each
    const allGridAreas = this._detectAllGridAreas();
    const sectionsToRender = this._ensureSectionsForAllAreas(allGridAreas);
    
    // Create native hui-section elements positioned in the grid
    for (let i = 0; i < sectionsToRender.length; i++) {
      const sectionConfig = sectionsToRender[i];
      
      // Skip empty sections in normal mode
      if (!isEditMode && (!sectionConfig.cards || sectionConfig.cards.length === 0)) {
        continue;
      }
      
      // Wrap section in container for visual indicators
      const container = document.createElement("div");
      const baseClasses = ["section-container"];
      if (isEditMode) baseClasses.push("edit-mode");
      if (sectionConfig.grid_area) {
        baseClasses.push(`section-${sectionConfig.grid_area}`);
      }
      container.className = baseClasses.join(" ");
      
      // Apply grid positioning to container
      if (sectionConfig.grid_area) {
        container.style.gridArea = sectionConfig.grid_area;
        container.setAttribute("data-grid-area", sectionConfig.grid_area);
      }
      
      // Add visual label in edit mode
      if (isEditMode && sectionConfig.grid_area) {
        const label = document.createElement("div");
        const isAutoCreated = !this._config.sections?.find(s => s.grid_area === sectionConfig.grid_area);
        
        label.className = isAutoCreated ? "section-grid-label auto-created" : "section-grid-label";
        label.textContent = sectionConfig.grid_area;
        
        // Add tooltip for auto-created sections
        if (isAutoCreated) {
          label.title = "Temporary section - add to YAML to persist";
        }
        
        container.appendChild(label);
      }
      
      // Create native section element
      const sectionEl = await this._createNativeSection(sectionConfig, i);
      container.appendChild(sectionEl);
      
      root.appendChild(container);
    }
    
    // Add loose cards container in edit mode (cards not in any section)
    if (isEditMode && this.cards && this.cards.length > 0) {
      const looseCardsContainer = this._createLooseCardsContainer();
      root.appendChild(looseCardsContainer);
    }
  }

  _detectAllGridAreas(): string[] {
    const gridTemplateAreas = this._config.layout?.["grid-template-areas"];
    if (!gridTemplateAreas) return [];
    
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
    
    return Array.from(areaNames);
  }

  _ensureSectionsForAllAreas(allGridAreas: string[]): any[] {
    if (!allGridAreas.length) {
      // No grid areas defined, just return configured sections
      return this._config.sections || [];
    }
    
    const sections = [...(this._config.sections || [])];
    const existingAreas = new Set(
      sections.map(s => s.grid_area).filter(Boolean)
    );
    
    // Create empty sections for grid areas without sections
    for (const area of allGridAreas) {
      if (!existingAreas.has(area)) {
        sections.push({
          type: "grid",
          title: this._formatAreaName(area),
          grid_area: area,
          cards: [],
        });
      }
    }
    
    return sections;
  }

  _formatAreaName(area: string): string {
    // Convert "sidebar" -> "Sidebar", "left-panel" -> "Left Panel"
    return area
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  _createLooseCardsContainer(): HTMLElement {
    const container = document.createElement("div");
    container.className = "loose-cards-container";
    
    // Header
    const header = document.createElement("div");
    header.className = "loose-cards-header";
    
    const title = document.createElement("span");
    title.className = "loose-cards-title";
    title.textContent = "Unassigned Cards";
    
    const subtitle = document.createElement("span");
    subtitle.className = "loose-cards-subtitle";
    subtitle.textContent = "Drag these cards into sections above";
    
    header.appendChild(title);
    header.appendChild(subtitle);
    container.appendChild(header);
    
    // Cards container
    const cardsWrapper = document.createElement("div");
    cardsWrapper.className = "loose-cards-wrapper";
    
    // Add all loose cards (cards at view level)
    this.cards.forEach((card, index) => {
      const cardConfig = this._config.cards?.[index];
      if (cardConfig) {
        const cardGroup: CardConfigGroup = {
          card,
          config: cardConfig,
          index,
          show: this._shouldShow(card, cardConfig, index),
        };
        const cardEl = this.getCardElement(cardGroup);
        cardsWrapper.appendChild(cardEl);
      }
    });
    
    container.appendChild(cardsWrapper);
    
    return container;
  }

  async _createNativeSection(config: any, index: number) {
    // Load section element creator if not loaded
    if (!customElements.get("hui-section")) {
      // Wait for it to be defined
      await customElements.whenDefined("hui-section");
    }
    
    // Create the native section element
    const section: any = document.createElement("hui-section");
    section.hass = this.hass;
    section.lovelace = this.lovelace;
    section.viewIndex = this.index;
    section.index = index;
    section.config = config;
    
    return section;
  }

  _autoDetectSections() {
    // Auto-detect grid areas from grid-template-areas
    // Always detect if grid-template-areas is defined, not just in edit mode
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
    
    // Create section configs for each detected area - no longer need manual config!
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
    addBtn.title = `Add card to ${sectionName}`;
    addBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await this._addCardToSection(sectionName);
    });
    
    headerEl.appendChild(titleEl);
    headerEl.appendChild(addBtn);
    
    return headerEl;
  }

  async _addCardToSection(sectionName: string) {
    // Show the card picker and automatically set grid_area when card is added
    const cardHelpers = await (window as any).loadCardHelpers?.();
    if (!cardHelpers) return;
    
    // Create a custom event that includes the target section
    const event = new CustomEvent("ll-create-card");
    this.dispatchEvent(event);
    
    // Listen for the next card addition and auto-assign grid_area
    const handleCardAdded = (e: any) => {
      if (e.detail?.config) {
        // Auto-assign the grid_area to the new card
        if (!e.detail.config.view_layout) {
          e.detail.config.view_layout = {};
        }
        e.detail.config.view_layout.grid_area = sectionName;
        console.log(`Auto-assigned card to section: ${sectionName}`);
      }
      this.removeEventListener("card-added", handleCardAdded);
    };
    
    // Note: This is a simplified approach. Full implementation would need
    // to intercept the card creation dialog and modify the config before save
    this.addEventListener("card-added", handleCardAdded);
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
        
        /* Native section containers */
        .section-container {
          position: relative;
          display: flex;
          flex-direction: column;
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
        
        /* Auto-created temporary sections */
        .section-grid-label.auto-created {
          background: var(--warning-color, #ff9800);
          opacity: 0.3;
          font-style: italic;
        }
        
        .section-grid-label.auto-created::after {
          content: ' (temp)';
          font-size: 9px;
        }
        
        /* Empty sections get a placeholder look */
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
        
        /* Loose cards container */
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
      `,
    ];
  }
}

customElements.define("grid-layout-improved", GridLayout);
