import { LAYOUT_CARD_SELECTOR_OPTIONS } from "../helpers";

customElements.whenDefined("hui-view-editor").then(() => {
  const HuiViewEditor = customElements.get("hui-view-editor");

  const firstUpdated = HuiViewEditor.prototype.firstUpdated;
  HuiViewEditor.prototype.firstUpdated = function () {
    firstUpdated?.bind(this)();

    this._oldSchema = this._schema;
    this._schema = (...arg) => {
      const retval = this._oldSchema(...arg);
      const typeSelector = retval.find((e) => e.name == "type");
      if (typeSelector.name === "layout") return retval;
      if (
        !typeSelector.selector.select.options.find(
          (option) => option.value === LAYOUT_CARD_SELECTOR_OPTIONS[0].value
        )
      ) {
        typeSelector.selector.select.options.push(
          ...LAYOUT_CARD_SELECTOR_OPTIONS
        );
      }

      if (retval.find((e) => e.name === "layout") === undefined)
        retval.push({
          name: "layout",
          selector: { object: {} },
        });
      return retval;
    };

    const helpLink = document.createElement("p");
    helpLink.innerHTML = `
      You have layout-card-improved installed which adds enhanced layout options with sections and custom CSS.<br/>
        <style>
          p {padding: 16px 0 0; margin-bottom: 0;}
          a {color: var(--primary-color);}
        </style>
    `;
    this.shadowRoot.appendChild(helpLink);
    this.requestUpdate();
  };
});
