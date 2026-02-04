export interface LovelaceCard extends HTMLElement {
  hass: any;
  editMode?: boolean;
  setConfig(config: any): void;
  getCardSize?(): Promise<number> | number;
}

export interface HuiCard extends HTMLElement {
  hass: any;
  editMode?: boolean;
  getCardSize?(): Promise<number> | number;
}

export interface CardConfig {
  type: string;
  view_layout?: {
    show?:
      | "always"
      | "never"
      | {
          mediaquery?: string;
          sidebar?: string;
        };
    column?: number;
    grid_area?: string;
    [key: string]: any; // Allow any grid-* properties
  };
}

export interface CardConfigGroup {
  card: LovelaceCard | HuiCard;
  config: CardConfig;
  index: number;
  show?: boolean;
}

export interface ViewConfig {
  title?: string;
  type?: string;
  cards?: Array<CardConfig>;
  layout?: {
    margin?: string;
    padding?: string;
    height?: string;
  };
  view_layout?: {};
}

export interface ColumnViewConfig extends ViewConfig {
  layout?: {
    margin?: string;
    padding?: string;
    height?: string;
    reflow?: boolean;
    width?: number;
    column_widths: string;
    max_width?: number;
    max_cols?: number;
    min_height?: number;
    rtl?: boolean;
    card_margin?: string;
  };
}

export interface SectionConfig {
  type: string;
  title?: string;
  cards?: Array<CardConfig>;
  column_span?: number;
  grid_area?: string; // NEW: assign section to grid area
  [key: string]: any;
}

export interface GridViewConfig extends ViewConfig {
  sections?: Array<SectionConfig>; // Native sections!
  layout?: {
    margin?: string;
    padding?: string;
    height?: string;
    mediaquery?: Array<Record<string, any>>;
    custom_css?: string;
    background_image?: string; // Supports Jinja templates
    background_blur?: string; // CSS blur value (e.g., "10px")
    background_opacity?: number; // 0-1
    "grid-template-areas"?: string;
    [key: string]: any; // Allow any grid-* properties
  };
}

export interface LayoutCardConfig {
  cards?: Array<CardConfig>;
  entities?: Array<CardConfig>;
  layout_type?: string;
  layout?: any;
  layout_options?: any; // legacy
}
