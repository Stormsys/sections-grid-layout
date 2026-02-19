import { SECTIONS_GRID_SELECTOR_OPTIONS } from "../helpers";

customElements.whenDefined("hui-view-editor").then(() => {
  const HuiViewEditor = customElements.get("hui-view-editor");

  // Guard against double-patching (e.g. if both layout-card and we are loaded)
  if (HuiViewEditor.prototype._sectionsGridLayoutPatched) return;
  HuiViewEditor.prototype._sectionsGridLayoutPatched = true;

  const firstUpdated = HuiViewEditor.prototype.firstUpdated;
  HuiViewEditor.prototype.firstUpdated = function () {
    firstUpdated?.bind(this)();

    if (!this._oldSchema) {
      this._oldSchema = this._schema;
      this._schema = (...arg) => {
        const retval = this._oldSchema(...arg);
        const typeSelector = retval.find((e) => e.name === "type");

        if (!typeSelector || !typeSelector.selector?.select?.options) {
          return retval;
        }

        // Add our option only once and only if not already present
        if (
          !typeSelector.selector.select.options.find(
            (option) => option.value === SECTIONS_GRID_SELECTOR_OPTIONS[0].value
          )
        ) {
          typeSelector.selector.select.options.push(
            ...SECTIONS_GRID_SELECTOR_OPTIONS
          );
        }

        // Ensure the layout field exists for YAML-level config
        if (!retval.find((e) => e.name === "layout")) {
          retval.push({ name: "layout", selector: { object: {} } });
        }

        return retval;
      };
    }

    this.requestUpdate();
  };
});
