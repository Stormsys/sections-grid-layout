/**
 * Shared CSS class names, element IDs, data attributes, and selectors.
 * Used across grid.ts and manager classes for consistency.
 * Note: These are NOT used in grid-styles.ts (CSS tagged templates are static).
 */

// Element IDs
export const ROOT_ID = "root";
export const LAYOUT_STYLES_ID = "layout-styles";

// Section container classes
export const CLASS_SECTION_CONTAINER = "section-container";
export const CLASS_EDIT_MODE = "edit-mode";
export const CLASS_SCROLLABLE = "scrollable";
export const CLASS_SECTION_GRID_LABEL = "section-grid-label";
export const CLASS_SECTION_GRID_LABEL_TEXT = "section-grid-label-text";
export const CLASS_SECTION_GRID_EDIT_OVERLAY = "section-grid-edit-overlay";

// Loose cards
export const CLASS_LOOSE_CARDS_CONTAINER = "loose-cards-container";
export const CLASS_LOOSE_CARDS_HEADER = "loose-cards-header";
export const CLASS_LOOSE_CARDS_TITLE = "loose-cards-title";
export const CLASS_LOOSE_CARDS_SUBTITLE = "loose-cards-subtitle";
export const CLASS_LOOSE_CARDS_WRAPPER = "loose-cards-wrapper";

// Overlay
export const CLASS_OVERLAY = "sgl-overlay";
export const CLASS_OVERLAY_CONTENT = "sgl-overlay-content";
export const CLASS_OVERLAY_ACTIVE = "active";
export const CLASS_OVERLAY_TESTER = "sgl-overlay-tester";
export const CLASS_OVERLAY_TESTER_HEADER = "sgl-overlay-tester-header";
export const CLASS_OVERLAY_TESTER_TITLE = "sgl-overlay-tester-title";
export const CLASS_OVERLAY_TESTER_MINIMIZE = "sgl-overlay-tester-minimize";
export const CLASS_OVERLAY_TESTER_BODY = "sgl-overlay-tester-body";
export const CLASS_OVERLAY_TESTER_ROW = "sgl-overlay-tester-row";
export const CLASS_OVERLAY_TESTER_LABEL = "sgl-overlay-tester-label";
export const CLASS_OVERLAY_TESTER_BTN = "sgl-overlay-tester-btn";

// YAML editor
export const CLASS_YAML_EDITOR = "sgl-yaml-editor";
export const CLASS_YAML_DIALOG = "sgl-yaml-dialog";
export const CLASS_YAML_HEADER = "sgl-yaml-header";
export const CLASS_YAML_EDITOR_CONTAINER = "sgl-yaml-editor-container";
export const CLASS_YAML_TEXTAREA = "sgl-yaml-textarea";
export const CLASS_YAML_ACTIONS = "sgl-yaml-actions";
export const CLASS_YAML_BTN = "sgl-yaml-btn";
export const CLASS_YAML_BTN_CANCEL = "sgl-yaml-btn sgl-yaml-btn-cancel";
export const CLASS_YAML_BTN_SAVE = "sgl-yaml-btn sgl-yaml-btn-save";

// Data attributes
export const ATTR_OVERLAY_INDEX = "data-overlay-index";
export const ATTR_ANIMATION = "data-animation";
export const ATTR_GRID_AREA = "data-grid-area";

// Section class prefix (used in computeSectionClasses and mediaquery CSS)
export const SECTION_CLASS_PREFIX = "section-";

// Dialog selectors for overlay tester visibility
export const DIALOG_SELECTOR = "ha-dialog, ha-more-info-dialog, dialog[open]";
