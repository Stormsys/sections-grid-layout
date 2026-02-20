export interface LovelaceCard extends HTMLElement {
  hass: any;
  editMode?: boolean;
  setConfig(config: any): void;
}

export interface HuiCard extends HTMLElement {
  hass: any;
  editMode?: boolean;
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
    grid_area?: string;
    [key: string]: any;
  };
}

export interface CardConfigGroup {
  card: LovelaceCard | HuiCard;
  config: CardConfig;
  index: number;
  show?: boolean;
}

export interface OverlayConfig {
  entity: string;
  state?: string;
  content?: string;
  color?: string;
  background?: string;
  animation?: "pulse" | "fade" | "flash" | "slide-up" | "none" | string;
  duration?: string;
  backdrop_blur?: string;
  font_size?: string;
  text_shadow?: string;
  custom_css?: string;
  z_index?: number;
}

export interface SectionConfig {
  type: string;
  title?: string;
  cards?: Array<CardConfig>;
  grid_area?: string;
  scrollable?: boolean;
  background?: string;
  backdrop_blur?: string;
  zoom?: number | string;
  overflow?: string;
  padding?: string;
  tint?: string;
  mediaquery?: Record<string, Record<string, any>>;
  [key: string]: any;
}

export interface GridViewConfig {
  title?: string;
  type?: string;
  cards?: Array<CardConfig>;
  sections?: Array<SectionConfig>;
  layout?: {
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
    background_image?: string;
    background_blur?: string;
    background_opacity?: number;
    overlays?: OverlayConfig[];
    "grid-template-areas"?: string;
    [key: string]: any;
  };
  view_layout?: {};
}
