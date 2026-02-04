export const loadHaYamlEditor = async () => {
  if (customElements.get("ha-yaml-editor")) return;

  // Load in ha-yaml-editor from developer-tools-service
  const ppResolver = document.createElement("partial-panel-resolver");
  const routes = (ppResolver as any).getRoutes([
    {
      component_name: "developer-tools",
      url_path: "a",
    },
  ]);
  await routes?.routes?.a?.load?.();
  const devToolsRouter = document.createElement("developer-tools-router");
  await (devToolsRouter as any)?.routerOptions?.routes?.service?.load?.();
};

export const loadHaForm = async () => {
  if (customElements.get("ha-form")) return;

  const helpers = await (window as any).loadCardHelpers?.();
  if (!helpers) return;
  const card = await helpers.createCardElement({ type: "entity" });
  if (!card) return;
  await card.getConfigElement();
};

export const LAYOUT_CARD_SELECTOR_OPTIONS = [
  {
    value: "custom:masonry-layout-improved",
    label: "Masonry (layout-card-improved)",
  },
  {
    value: "custom:horizontal-layout-improved",
    label: "Horizontal (layout-card-improved)",
  },
  {
    value: "custom:vertical-layout-improved",
    label: "Vertical (layout-card-improved)",
  },
  {
    value: "custom:grid-layout-improved",
    label: "Grid (layout-card-improved)",
  },
];
