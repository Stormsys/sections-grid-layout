/**
 * Manages section config persistence and the YAML editor modal.
 * Handles create/update/delete of sections in the lovelace config,
 * auto-creation of missing sections for grid areas, and the
 * section property editor dialog.
 */

import { sectionConfigToYaml, parseYaml } from "../yaml";
import { detectAllGridAreas, formatAreaName } from "../grid-utils";
import {
  CLASS_YAML_EDITOR,
  CLASS_YAML_DIALOG,
  CLASS_YAML_HEADER,
  CLASS_YAML_EDITOR_CONTAINER,
  CLASS_YAML_TEXTAREA,
  CLASS_YAML_ACTIONS,
  CLASS_YAML_BTN_CANCEL,
  CLASS_YAML_BTN_SAVE,
} from "../constants";

export class SectionConfigManager {
  private _savingConfig: boolean = false;

  /**
   * True while a save operation is in-flight (prevents re-entry).
   */
  get isSaving(): boolean {
    return this._savingConfig;
  }

  /**
   * Handle a config-changed event from a hui-section element.
   */
  handleSectionConfigChanged(
    gridArea: string,
    newSectionConfig: any,
    lovelace: any,
    viewIndex: number
  ): void {
    if (!lovelace || this._savingConfig) return;
    const sections = [...(lovelace.config.views[viewIndex].sections as any[] || [])];
    const idx = sections.findIndex((s: any) => s.grid_area === gridArea);
    const updated = { ...newSectionConfig, grid_area: gridArea };
    if (idx >= 0) sections[idx] = updated;
    else sections.push(updated);
    this._saveViewSections(sections, lovelace, viewIndex);
  }

  /**
   * Handle a ll-delete-section event.
   */
  handleDeleteSection(
    gridArea: string,
    lovelace: any,
    viewIndex: number
  ): void {
    if (!lovelace || this._savingConfig) return;
    const sections = ((lovelace.config.views[viewIndex].sections as any[]) || [])
      .filter((s: any) => s.grid_area !== gridArea);
    this._saveViewSections(sections, lovelace, viewIndex);
  }

  /**
   * Ensure every grid area has a corresponding section config entry.
   * Auto-creates missing ones and saves. Calls onComplete when done
   * (whether or not a save was needed).
   */
  async ensureAllSectionsExistInConfig(
    gridTemplateAreas: string | undefined,
    lovelace: any,
    viewIndex: number,
    onComplete: () => void
  ): Promise<void> {
    if (!lovelace || this._savingConfig) {
      onComplete();
      return;
    }
    const allGridAreas = detectAllGridAreas(gridTemplateAreas);
    if (!allGridAreas.length) { onComplete(); return; }

    const existing: any[] = (lovelace.config.views[viewIndex].sections as any[]) || [];
    const existingAreas = new Set(existing.map((s: any) => s.grid_area).filter(Boolean));
    const toAdd = allGridAreas.filter(a => !existingAreas.has(a));
    if (!toAdd.length) { onComplete(); return; }

    await this._saveViewSections([
      ...existing,
      ...toAdd.map(area => ({
        type: "grid",
        title: formatAreaName(area),
        grid_area: area,
        cards: [],
      })),
    ], lovelace, viewIndex);
  }

  /**
   * Open a modal YAML editor for a section's non-card properties.
   */
  openSectionYamlEditor(
    gridArea: string,
    shadowRoot: ShadowRoot,
    lovelace: any,
    viewIndex: number,
    hass: any
  ): void {
    shadowRoot.querySelector(`.${CLASS_YAML_EDITOR}`)?.remove();

    const liveSections: any[] =
      (lovelace?.config?.views?.[viewIndex]?.sections as any[]) ?? [];
    const sectionConfig = liveSections.find((s: any) => s.grid_area === gridArea) || {};

    const editableConfig: Record<string, any> = {};
    for (const [key, value] of Object.entries(sectionConfig)) {
      if (key !== "cards") editableConfig[key] = value;
    }

    let currentParsed: Record<string, any> | null = editableConfig;
    let currentText: string = sectionConfigToYaml(editableConfig);

    const backdrop = document.createElement("div");
    backdrop.className = CLASS_YAML_EDITOR;

    const dialog = document.createElement("div");
    dialog.className = CLASS_YAML_DIALOG;

    const header = document.createElement("div");
    header.className = CLASS_YAML_HEADER;
    header.textContent = `Edit Section: ${gridArea}`;

    const editorContainer = document.createElement("div");
    editorContainer.className = CLASS_YAML_EDITOR_CONTAINER;

    const useYamlEditor = !!customElements.get("ha-yaml-editor");
    const useCodeEditor = !useYamlEditor && !!customElements.get("ha-code-editor");

    if (useYamlEditor) {
      const yamlEditor = document.createElement("ha-yaml-editor") as any;
      yamlEditor.defaultValue = editableConfig;
      if (hass) yamlEditor.hass = hass;
      yamlEditor.addEventListener("value-changed", (e: CustomEvent) => {
        currentParsed = e.detail.value ?? null;
        currentText = "";
      });
      editorContainer.appendChild(yamlEditor);
    } else if (useCodeEditor) {
      const codeEditor = document.createElement("ha-code-editor") as any;
      codeEditor.mode = "yaml";
      codeEditor.autofocus = true;
      codeEditor.autocompleteEntities = true;
      codeEditor.value = currentText;
      if (hass) codeEditor.hass = hass;
      codeEditor.addEventListener("value-changed", (e: CustomEvent) => {
        currentText = e.detail.value ?? "";
        currentParsed = null;
      });
      editorContainer.appendChild(codeEditor);
    } else {
      const textarea = document.createElement("textarea");
      textarea.className = CLASS_YAML_TEXTAREA;
      textarea.value = currentText;
      textarea.spellcheck = false;
      textarea.addEventListener("input", () => {
        currentText = textarea.value;
        currentParsed = null;
      });
      editorContainer.appendChild(textarea);
      requestAnimationFrame(() => textarea.focus());
    }

    const actions = document.createElement("div");
    actions.className = CLASS_YAML_ACTIONS;

    const cancelBtn = document.createElement("button");
    cancelBtn.className = CLASS_YAML_BTN_CANCEL;
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", () => backdrop.remove());

    const saveBtn = document.createElement("button");
    saveBtn.className = CLASS_YAML_BTN_SAVE;
    saveBtn.textContent = "Save";
    saveBtn.addEventListener("click", () => {
      let parsed = currentParsed;
      if (!parsed && currentText) {
        parsed = parseYaml(currentText);
      }
      if (!parsed || typeof parsed !== "object") {
        alert("Invalid YAML");
        return;
      }
      const merged: Record<string, any> = {
        ...parsed,
        cards: sectionConfig.cards || [],
      };
      if (!merged.grid_area) merged.grid_area = gridArea;
      if (!merged.type) merged.type = sectionConfig.type || "grid";
      this.handleSectionConfigChanged(gridArea, merged, lovelace, viewIndex);
      backdrop.remove();
    });

    actions.append(cancelBtn, saveBtn);
    dialog.append(header, editorContainer, actions);
    backdrop.appendChild(dialog);

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) backdrop.remove();
    });

    shadowRoot.appendChild(backdrop);
  }

  private async _saveViewSections(
    sections: any[],
    lovelace: any,
    viewIndex: number
  ): Promise<void> {
    if (!lovelace || this._savingConfig) return;
    this._savingConfig = true;
    try {
      const views = [...lovelace.config.views];
      views[viewIndex] = { ...views[viewIndex], sections };
      await lovelace.saveConfig({ ...lovelace.config, views });
    } catch (e) {
      console.error("sections-grid-layout: failed to save section config", e);
    } finally {
      this._savingConfig = false;
    }
  }
}
